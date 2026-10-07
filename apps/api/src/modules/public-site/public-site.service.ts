import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Errors } from '../../common/errors/app-error';
import { SettingsService } from '../settings/settings.service';
import { AuditService } from '../audit/audit.service';
import { PublicContactDto } from './dto/public-site.dto';

/**
 * Public website API (/api/v1/public/*). Unauthenticated by design.
 *
 * It only ever reads/writes data that is safe to expose to anonymous visitors:
 * tenant branding + website content settings, active service zones, and a
 * secure, non-enumerable order tracking lookup. It never exposes tenant-wide
 * collections, customer/driver identities, or money internals.
 */

/** Whitelist of public-safe settings surfaced to the website. */
const PUBLIC_WEBSITE_KEYS = new Set([
  'website.heroTitle',
  'website.heroSubtitle',
  'website.aboutBody',
  'website.contactPhone',
  'website.contactEmail',
  'website.contactAddress',
  'website.contactHours',
  'website.socialLinks',
  'website.seoTitle',
  'website.seoDescription',
  'website.companyName',
  'website.vatNumber',
  'website.crn',
  'website.faq',
  'website.enabled',
  'website.maintenanceNotice',
]);

/** Coarse human-readable milestone per order status (no driver/customer PII). */
const STATUS_MILESTONE: Record<string, string> = {
  draft: 'created',
  pending: 'created',
  confirmed: 'confirmed',
  searching_driver: 'searching',
  assigned: 'assigned',
  driver_arriving: 'pickup',
  picked_up: 'picked_up',
  in_transit: 'in_transit',
  arriving: 'arriving',
  delivered: 'delivered',
  cancelled: 'cancelled',
  failed_delivery: 'failed',
  returned: 'returned',
};

@Injectable()
export class PublicSiteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Resolves the public tenant: an explicit `?tenant=` slug, else the single
   * active company tenant. Returns null (never throws) so the website can fall
   * back to static content when the platform has not been configured yet.
   */
  private async resolveTenant(slug?: string) {
    if (slug) {
      return this.prisma.tenant.findFirst({ where: { slug, status: 'active' } });
    }
    const companies = await this.prisma.tenant.findMany({
      where: { status: 'active', type: 'company' },
      orderBy: { createdAt: 'asc' },
    });
    if (companies.length === 1) return companies[0];
    return companies[0] ?? null;
  }

  /** Public website content + service areas for the marketing site. */
  async site(tenantSlug?: string) {
    const tenant = await this.resolveTenant(tenantSlug);
    if (!tenant) {
      return { tenant: null, settings: {}, serviceAreas: [] };
    }

    const rows = await this.prisma.systemSetting.findMany({
      where: { tenantId: tenant.id, key: { in: [...PUBLIC_WEBSITE_KEYS] } },
    });
    const settings: Record<string, unknown> = {};
    for (const row of rows) settings[row.key] = row.value;

    const zones = await this.prisma.serviceZone.findMany({
      where: { tenantId: tenant.id, isActive: true },
      select: { name: true, code: true, centerLat: true, centerLng: true },
      orderBy: { name: 'asc' },
    });

    return {
      tenant: { name: tenant.name, slug: tenant.slug },
      settings,
      serviceAreas: zones,
    };
  }

  /**
   * Secure public tracking by opaque code.
   *
   * The lookup key is a 128-bit non-sequential secret (`Order.trackingCode`),
   * so ids cannot be guessed or enumerated. The response is deliberately
   * minimal: coarse status + milestone, a driver display name (never a phone or
   * precise home address), and the real recorded driver position only. If a
   * code does not resolve, a uniform 404 is returned (no distinguishing of
   * "exists but other tenant" vs "unknown").
   */
  async track(code: string) {
    const clean = code.trim().toUpperCase();
    if (clean.length < 6 || clean.length > 64) {
      throw Errors.notFound('order', 'No order matches this tracking code');
    }

    const order = await this.prisma.order.findUnique({
      where: { trackingCode: clean },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        updatedAt: true,
        deliveredAt: true,
        cancelledAt: true,
        driverId: true,
        driver: { select: { fullName: true } },
        pickupAddress: true,
        dropoffAddress: true,
      },
    });
    if (!order) throw Errors.notFound('order', 'No order matches this tracking code');

    let driverLocation = null;
    if (order.driverId) {
      driverLocation = await this.prisma.driverLocation.findFirst({
        where: { driverId: order.driverId },
        orderBy: { recordedAt: 'desc' },
        select: { latitude: true, longitude: true, recordedAt: true },
      });
    }

    return {
      orderNumber: order.orderNumber,
      status: order.status,
      milestone: STATUS_MILESTONE[order.status] ?? 'processing',
      pickupAddress: order.pickupAddress,
      dropoffAddress: order.dropoffAddress,
      driverName: order.driver?.fullName ?? null,
      // Real recorded position only; never simulated.
      driverLocation,
      updatedAt: order.updatedAt,
      deliveredAt: order.deliveredAt,
      cancelledAt: order.cancelledAt,
    };
  }

  /**
   * Persists a website contact message as a real support ticket so it reaches
   * the Admin support queue — it never disappears into frontend-only state.
   * The ticket is created without a customer link (the sender may be anonymous)
   * and is recorded in the audit trail.
   */
  async contact(dto: PublicContactDto, meta: { ip?: string; userAgent?: string; tenantSlug?: string }) {
    const tenant = await this.resolveTenant(meta.tenantSlug);
    if (!tenant) {
      throw Errors.conflict('WEBSITE_NOT_CONFIGURED', 'No active tenant is configured for the website');
    }

    const ticket = await this.prisma.supportTicket.create({
      data: {
        tenantId: tenant.id,
        subject: `[Website] ${dto.subject}`,
        description: [
          `Name: ${dto.name}`,
          dto.email ? `Email: ${dto.email}` : null,
          dto.phone ? `Phone: ${dto.phone}` : null,
          '',
          dto.message,
        ]
          .filter((line) => line !== null)
          .join('\n'),
        status: 'open',
        priority: 'normal',
      },
    });

    await this.audit.log({
      tenantId: tenant.id,
      action: 'website.contact_submit',
      entity: 'support_ticket',
      entityId: ticket.id,
      after: { subject: dto.subject, hasEmail: Boolean(dto.email), hasPhone: Boolean(dto.phone) },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return { received: true, ticketId: ticket.id };
  }
}
