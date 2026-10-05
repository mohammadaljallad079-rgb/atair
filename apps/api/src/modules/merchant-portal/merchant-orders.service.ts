import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Errors } from '../../common/errors/app-error';
import { AuditService } from '../audit/audit.service';
import { OrdersService } from '../orders/orders.service';
import { PricingService } from '../pricing/pricing.service';
import { TrackingService } from '../tracking/tracking.service';
import { ZonesService } from '../zones/zones.service';
import { haversineKm } from '../../common/utils/geo';
import { ACTIVE_STATUSES, OrderStatus } from '../orders/order-state.machine';
import { MerchantContext } from './merchant-context.service';
import {
  CreateMerchantOrderDto,
  MerchantOrderQueryDto,
  MerchantQuoteDto,
} from './dto/merchant-portal.dto';

/** Statuses a merchant is allowed to cancel via the portal. */
const MERCHANT_CANCELLABLE: OrderStatus[] = [
  'draft',
  'pending',
  'confirmed',
  'searching_driver',
  'assigned',
  'driver_arriving',
];

@Injectable()
export class MerchantOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly orders: OrdersService,
    private readonly pricing: PricingService,
    private readonly trackingService: TrackingService,
    private readonly zones: ZonesService,
  ) {}

  /** The tenant that owns a merchant (from the merchant row, never the client). */
  private async tenantOf(merchantId: string): Promise<string> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { tenantId: true },
    });
    if (!merchant) throw Errors.notFound('merchant');
    return merchant.tenantId;
  }

  /**
   * Hard boundary: an order is only ever fetched by `(id AND merchantId)`.
   * Requesting another merchant's order id yields a 404 — never the row.
   */
  private async getOwned(ctx: MerchantContext, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, merchantId: ctx.merchantId },
      include: {
        items: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
        assignments: { orderBy: { createdAt: 'desc' } },
        deliveryAddress: true,
        deliveryAttempts: true,
        deliveryProofs: true,
        payments: true,
        customer: { select: { id: true, fullName: true, phone: true, email: true } },
        driver: { select: { id: true, fullName: true, phone: true, status: true, rating: true } },
        vehicle: { select: { id: true, plateNumber: true, make: true, model: true } },
        merchantBranch: { select: { id: true, name: true, address: true } },
      },
    });
    if (!order) throw Errors.notFound('order');
    return order;
  }

  async list(ctx: MerchantContext, q: MerchantOrderQueryDto) {
    const where: any = { merchantId: ctx.merchantId };
    if (q.status) {
      where.status = q.status === 'active' ? { in: ACTIVE_STATUSES } : (q.status as OrderStatus);
    }
    if (q.paymentStatus) where.paymentStatus = q.paymentStatus;
    if (q.paymentMethod) where.paymentMethod = q.paymentMethod;
    if (q.merchantBranchId) where.merchantBranchId = q.merchantBranchId;
    if (q.from || q.to) {
      where.createdAt = {};
      if (q.from) where.createdAt.gte = new Date(q.from);
      if (q.to) where.createdAt.lte = new Date(q.to);
    }
    if (q.search) {
      where.OR = [
        { orderNumber: { contains: q.search, mode: 'insensitive' } },
        { dropoffAddress: { contains: q.search, mode: 'insensitive' } },
        { pickupAddress: { contains: q.search, mode: 'insensitive' } },
        { customer: { fullName: { contains: q.search, mode: 'insensitive' } } },
        { customer: { phone: { contains: q.search } } },
      ];
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: {
          customer: { select: { id: true, fullName: true, phone: true } },
          driver: { select: { id: true, fullName: true, phone: true, status: true } },
          merchantBranch: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: q.skip,
        take: q.take,
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items, total };
  }

  get(ctx: MerchantContext, id: string) {
    return this.getOwned(ctx, id);
  }

  async timeline(ctx: MerchantContext, id: string) {
    await this.getOwned(ctx, id);
    return this.prisma.orderStatusHistory.findMany({
      where: { orderId: id },
      orderBy: { createdAt: 'asc' },
    });
  }

  async tracking(ctx: MerchantContext, id: string) {
    await this.getOwned(ctx, id);
    const tenantId = await this.tenantOf(ctx.merchantId);
    return this.trackingService.track(tenantId, id);
  }

  /** Server-side quote using the real pricing engine, merchant-scoped rules. */
  async quote(ctx: MerchantContext, dto: MerchantQuoteDto) {
    const tenantId = await this.tenantOf(ctx.merchantId);

    // Distance is computed server-side from coordinates when supplied; the
    // client-supplied value is only a fallback (mirrors OrdersService.create).
    let distanceKm = dto.distanceKm ?? 0;
    if (
      dto.pickupLat != null && dto.pickupLng != null &&
      dto.dropoffLat != null && dto.dropoffLng != null
    ) {
      distanceKm = haversineKm(dto.pickupLat, dto.pickupLng, dto.dropoffLat, dto.dropoffLng);
    }
    const durationMin = dto.durationMin ?? Math.max(5, Math.round((distanceKm / 25) * 60));

    // Resolve the pickup service zone so zone-scoped rules apply, matching the
    // order-creation path. A branch location is used as the pickup reference
    // when explicit pickup coordinates are not provided.
    let pickupLat = dto.pickupLat;
    let pickupLng = dto.pickupLng;
    let zoneId: string | undefined;
    if (dto.merchantBranchId) {
      const branch = await this.prisma.merchantBranch.findFirst({
        where: { id: dto.merchantBranchId, merchantId: ctx.merchantId },
        select: { latitude: true, longitude: true },
      });
      if (!branch) throw Errors.notFound('branch');
      if (pickupLat == null && branch.latitude != null) pickupLat = branch.latitude;
      if (pickupLng == null && branch.longitude != null) pickupLng = branch.longitude;
    }
    if (pickupLat != null && pickupLng != null) {
      const zone = await this.zones.resolveZone(tenantId, pickupLat, pickupLng);
      zoneId = zone?.id;
    }

    return this.pricing.quote(tenantId, {
      distanceKm,
      durationMin,
      weightKg: dto.weightKg,
      scheduled: dto.scheduled,
      paymentMethod: dto.paymentMethod as any,
      vehicleTypeId: dto.vehicleTypeId,
      merchantId: ctx.merchantId,
      zoneId,
    });
  }

  async create(ctx: MerchantContext, dto: CreateMerchantOrderDto, actor: { userId: string; ip?: string }) {
    if (dto.merchantBranchId) {
      const branch = await this.prisma.merchantBranch.findFirst({
        where: { id: dto.merchantBranchId, merchantId: ctx.merchantId },
        select: { id: true },
      });
      if (!branch) throw Errors.notFound('branch');
    }
    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, merchantId: ctx.merchantId },
        select: { id: true },
      });
      if (!customer) throw Errors.notFound('customer');
    }

    const tenantId = await this.tenantOf(ctx.merchantId);
    const created = await this.orders.create(
      tenantId,
      {
        customerId: dto.customerId,
        merchantId: ctx.merchantId,
        merchantBranchId: dto.merchantBranchId,
        deliveryType: dto.deliveryType,
        vehicleTypeId: dto.vehicleTypeId,
        pickupAddress: dto.pickupAddress,
        pickupLat: dto.pickupLat,
        pickupLng: dto.pickupLng,
        dropoffAddress: dto.dropoffAddress,
        dropoffLat: dto.dropoffLat,
        dropoffLng: dto.dropoffLng,
        paymentMethod: dto.paymentMethod,
        codAmount: dto.codAmount,
        notes: dto.notes,
        scheduledPickupAt: dto.scheduledPickupAt,
        items: dto.items,
        addresses: [
          {
            type: 'pickup',
            address: dto.pickupAddress,
            latitude: dto.pickupLat,
            longitude: dto.pickupLng,
            contactName: dto.pickupContactName,
            contactPhone: dto.pickupContactPhone,
            details: dto.pickupNotes,
          },
          {
            type: 'dropoff',
            address: dto.dropoffAddress,
            latitude: dto.dropoffLat,
            longitude: dto.dropoffLng,
            contactName: dto.recipientName,
            contactPhone: dto.recipientPhone,
            details: dto.deliveryInstructions,
          },
        ],
      },
      actor,
    );

    // Shipment metadata has no dedicated columns; persist it as a labelled
    // status-history meta entry so it is visible in the order timeline.
    if (dto.packageDescription || dto.weightKg != null || dto.fragile || dto.dimensions) {
      await this.prisma.orderStatusHistory.create({
        data: {
          orderId: created.id,
          toStatus: 'pending',
          changedByUserId: actor.userId,
          reason: 'shipment',
          meta: {
            packageDescription: dto.packageDescription ?? null,
            weightKg: dto.weightKg ?? null,
            fragile: dto.fragile ?? false,
            dimensions: dto.dimensions ?? null,
          } as any,
        },
      });
    }

    await this.audit.log({
      tenantId,
      userId: actor.userId,
      action: 'merchant.order_create',
      entity: 'order',
      entityId: created.id,
      after: { orderNumber: created.orderNumber, merchantId: ctx.merchantId },
      ip: actor.ip,
    });

    return this.getOwned(ctx, created.id);
  }

  async cancel(ctx: MerchantContext, id: string, reason: string | undefined, actor: { userId: string; ip?: string }) {
    const order = await this.getOwned(ctx, id);
    if (!MERCHANT_CANCELLABLE.includes(order.status as OrderStatus)) {
      throw Errors.conflict(
        'ORDER_NOT_CANCELLABLE',
        `A merchant cannot cancel an order in status "${order.status}"`,
      );
    }
    const tenantId = await this.tenantOf(ctx.merchantId);
    return this.orders.cancel(tenantId, id, { reason }, actor);
  }

  static cancellable(): OrderStatus[] {
    return MERCHANT_CANCELLABLE;
  }
}
