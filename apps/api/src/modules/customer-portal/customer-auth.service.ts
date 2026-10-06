import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { Errors } from '../../common/errors/app-error';
import { AuthService } from '../auth/auth.service';
import { AuditService } from '../audit/audit.service';
import { RegisterCustomerDto } from './dto/customer-portal.dto';

/**
 * Customer account lifecycle.
 *
 * Registration creates BOTH the login `User` (with the `customer` role) and the
 * linked `Customer` row in a single transaction, so the principal boundary and
 * the customer profile are always consistent. The acting tenant is resolved
 * server-side (never from the client): the requested slug, or the demo tenant
 * when the installation has exactly one active tenant.
 */
@Injectable()
export class CustomerAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  private async resolveTenant(slug?: string) {
    if (slug) {
      const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
      if (!tenant) throw Errors.notFound('tenant');
      if (tenant.status !== 'active') throw Errors.forbidden('Tenant is not active');
      return tenant;
    }
    const active = await this.prisma.tenant.findMany({ where: { status: 'active' } });
    if (active.length === 1) return active[0];
    // Ambiguous or empty: require an explicit slug rather than guessing.
    throw Errors.conflict(
      'TENANT_REQUIRED',
      'Multiple tenants are available; specify tenantSlug',
    );
  }

  async register(dto: RegisterCustomerDto, meta: { ip?: string; userAgent?: string }) {
    const tenant = await this.resolveTenant(dto.tenantSlug);
    const email = dto.email ? dto.email.toLowerCase() : undefined;

    // Duplicate detection (uniform, before creating anything).
    const existing = await this.prisma.user.findFirst({
      where: {
        tenantId: tenant.id,
        OR: [{ phone: dto.phone }, ...(email ? [{ email }] : [])],
      },
      select: { id: true },
    });
    if (existing) {
      throw Errors.conflict('ACCOUNT_EXISTS', 'An account with this phone or email already exists');
    }

    const role = await this.prisma.role.findFirst({
      where: { tenantId: tenant.id, slug: 'customer' },
      select: { id: true },
    });
    if (!role) throw Errors.internal('Customer role is not configured for this tenant');

    const rounds = this.config.get<number>('security.bcryptRounds') ?? 12;
    const passwordHash = await bcrypt.hash(dto.password, rounds);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email,
          phone: dto.phone,
          fullName: dto.fullName,
          passwordHash,
        },
      });
      await tx.userRole.create({ data: { userId: created.id, roleId: role.id } });
      await tx.customer.create({
        data: {
          tenantId: tenant.id,
          userId: created.id,
          fullName: dto.fullName,
          phone: dto.phone,
          email,
        },
      });
      return created;
    });

    await this.audit.log({
      tenantId: tenant.id,
      userId: user.id,
      action: 'customer.register',
      entity: 'user',
      entityId: user.id,
      after: { phone: dto.phone, email },
      ip: meta.ip,
    });

    // Issue tokens immediately so the client can go straight to the home screen.
    const auth = await this.auth.resolveAuthorization(user.id);
    const tokens = await this.auth.issueTokens(user.id, tenant.id, auth, {
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        roles: auth.roles,
        permissions: auth.permissions,
      },
      ...tokens,
    };
  }

  /** The authenticated customer's own principal (profile summary). */
  async me(userId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { userId },
      include: { tenant: { select: { slug: true } } },
    });
    if (!customer) throw Errors.forbidden('No customer profile is linked to this account');
    const auth = await this.auth.resolveAuthorization(userId);
    return {
      id: customer.id,
      userId,
      fullName: customer.fullName,
      phone: customer.phone,
      email: customer.email,
      status: customer.status,
      rating: customer.rating,
      tenantId: customer.tenantId,
      tenantSlug: customer.tenant.slug,
      roles: auth.roles,
      permissions: auth.permissions,
      createdAt: customer.createdAt,
    };
  }

  /** Whether the current deployment supports self-service registration. */
  async registrationInfo() {
    const active = await this.prisma.tenant.count({ where: { status: 'active' } });
    const single = active === 1 ? await this.prisma.tenant.findFirst({ where: { status: 'active' } }) : null;
    return {
      enabled: active >= 1,
      requiresTenantSlug: active !== 1,
      tenantSlug: single?.slug ?? null,
      defaultTenantName: single?.name ?? null,
      // Payment methods genuinely implemented for consumers (no card gateway).
      paymentMethods: [
        { code: 'cod', available: true },
        { code: 'cash', available: true },
        { code: 'card', available: false },
        { code: 'online', available: false },
        { code: 'wallet', available: false },
      ],
    };
  }
}
