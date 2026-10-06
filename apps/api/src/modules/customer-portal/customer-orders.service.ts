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
import { CustomerContext } from './customer-context.service';
import {
  CancelCustomerOrderDto,
  CreateCustomerOrderDto,
  CustomerOrderQueryDto,
  CustomerQuoteDto,
} from './dto/customer-portal.dto';

/** Statuses a customer may cancel from (mirrors the state machine's exits). */
const CUSTOMER_CANCELLABLE: OrderStatus[] = [
  'pending',
  'confirmed',
  'searching_driver',
  'assigned',
  'driver_arriving',
];

/** Columns a customer is allowed to see. Never tenant/user/driver internals. */
const CUSTOMER_ORDER_SELECT = {
  id: true,
  orderNumber: true,
  status: true,
  deliveryType: true,
  pickupAddress: true,
  pickupLat: true,
  pickupLng: true,
  dropoffAddress: true,
  dropoffLat: true,
  dropoffLng: true,
  distanceKm: true,
  estimatedDurationMin: true,
  scheduledPickupAt: true,
  subtotal: true,
  discountAmount: true,
  taxAmount: true,
  surchargeAmount: true,
  total: true,
  currency: true,
  priceBreakdown: true,
  paymentMethod: true,
  paymentStatus: true,
  codAmount: true,
  codStatus: true,
  notes: true,
  cancellationReason: true,
  createdAt: true,
  updatedAt: true,
  confirmedAt: true,
  assignedAt: true,
  pickedUpAt: true,
  deliveredAt: true,
  cancelledAt: true,
  driver: { select: { fullName: true, rating: true, phone: true } },
} as const;

@Injectable()
export class CustomerOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly orders: OrdersService,
    private readonly pricing: PricingService,
    private readonly trackingService: TrackingService,
    private readonly zones: ZonesService,
  ) {}

  /**
   * Hard boundary: an order is only ever fetched by `(id AND customerId)`.
   * Requesting another customer's order id yields a 404 — never the row.
   */
  private async getOwned(ctx: CustomerContext, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, customerId: ctx.customerId },
      select: {
        ...CUSTOMER_ORDER_SELECT,
        items: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
        deliveryAddress: true,
        deliveryProofs: true,
        vehicle: { select: { plateNumber: true, make: true, model: true, color: true } },
      },
    });
    if (!order) throw Errors.notFound('order');
    return order;
  }

  async list(ctx: CustomerContext, q: CustomerOrderQueryDto) {
    const where: any = { customerId: ctx.customerId };
    if (q.status) {
      where.status = q.status === 'active' ? { in: ACTIVE_STATUSES } : (q.status as OrderStatus);
    } else if (q.bucket === 'active') {
      where.status = { in: ACTIVE_STATUSES };
    } else if (q.bucket === 'completed') {
      where.status = 'delivered';
    } else if (q.bucket === 'cancelled') {
      where.status = { in: ['cancelled', 'failed_delivery', 'returned'] };
    }
    if (q.search) {
      where.OR = [
        { orderNumber: { contains: q.search, mode: 'insensitive' } },
        { dropoffAddress: { contains: q.search, mode: 'insensitive' } },
        { pickupAddress: { contains: q.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        select: CUSTOMER_ORDER_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: q.skip,
        take: q.take,
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items, total };
  }

  async get(ctx: CustomerContext, id: string) {
    return this.getOwned(ctx, id);
  }

  async timeline(ctx: CustomerContext, id: string) {
    await this.getOwned(ctx, id);
    return this.prisma.orderStatusHistory.findMany({
      where: { orderId: id },
      orderBy: { createdAt: 'asc' },
    });
  }

  async tracking(ctx: CustomerContext, id: string) {
    await this.getOwned(ctx, id);
    const snapshot = await this.trackingService.track(ctx.tenantId, id);
    // Only expose a real recorded driver location; never simulate movement.
    return snapshot;
  }

  /** Active service areas (real configured zones) the customer can price against. */
  async serviceAreas(ctx: CustomerContext) {
    const zones = await this.prisma.serviceZone.findMany({
      where: { tenantId: ctx.tenantId, isActive: true },
      select: { id: true, name: true, code: true, centerLat: true, centerLng: true },
      orderBy: { name: 'asc' },
    });
    return zones;
  }

  /**
   * Resolves the pickup reference used for zone + distance resolution.
   *
   * The platform has no geocoder, so a text address is never turned into
   * coordinates. When the customer picks a configured service area we use that
   * area's real center as the pickup point, which makes OrdersService.create
   * resolve the exact same zone and distance as this quote — guaranteeing
   * quote/create parity.
   */
  private async resolvePickup(
    tenantId: string,
    dto: { pickupLat?: number; pickupLng?: number; serviceAreaId?: string },
  ): Promise<{ pickupLat?: number; pickupLng?: number; zoneId?: string }> {
    if (dto.pickupLat != null && dto.pickupLng != null) {
      const zone = await this.zones.resolveZone(tenantId, dto.pickupLat, dto.pickupLng);
      return { pickupLat: dto.pickupLat, pickupLng: dto.pickupLng, zoneId: zone?.id };
    }
    if (dto.serviceAreaId) {
      const zone = await this.prisma.serviceZone.findFirst({
        where: { id: dto.serviceAreaId, tenantId, isActive: true },
        select: { id: true, centerLat: true, centerLng: true },
      });
      if (!zone) throw Errors.notFound('service_area');
      if (zone.centerLat == null || zone.centerLng == null) {
        throw Errors.validation(
          'The selected service area has no coordinates; provide a map location instead',
        );
      }
      return { pickupLat: zone.centerLat, pickupLng: zone.centerLng, zoneId: zone.id };
    }
    return {};
  }

  /** Server-side quote using the real pricing engine. No client-supplied money. */
  async quote(ctx: CustomerContext, dto: CustomerQuoteDto) {
    const pickup = await this.resolvePickup(ctx.tenantId, dto);
    let distanceKm = 0;
    if (
      pickup.pickupLat != null && pickup.pickupLng != null &&
      dto.dropoffLat != null && dto.dropoffLng != null
    ) {
      distanceKm = haversineKm(pickup.pickupLat, pickup.pickupLng, dto.dropoffLat, dto.dropoffLng);
    }
    const durationMin = Math.max(5, Math.round((distanceKm / 25) * 60));

    const result = await this.pricing.quote(ctx.tenantId, {
      distanceKm,
      durationMin,
      weightKg: dto.weightKg,
      scheduled: dto.scheduled,
      paymentMethod: dto.paymentMethod as any,
      zoneId: pickup.zoneId,
    });
    if (!result.ruleId) {
      throw Errors.conflict('PRICING_UNAVAILABLE', 'No active pricing rule applies to this delivery');
    }
    return result;
  }

  async create(ctx: CustomerContext, dto: CreateCustomerOrderDto, actor: { userId: string; ip?: string }) {
    const pickup = await this.resolvePickup(ctx.tenantId, dto);

    // Reject a scheduled time in the past before persisting anything.
    if (dto.scheduledPickupAt) {
      const when = new Date(dto.scheduledPickupAt);
      if (Number.isNaN(when.getTime()) || when.getTime() < Date.now() - 60_000) {
        throw Errors.validation('scheduledPickupAt must be a valid future date');
      }
    }

    const created = await this.orders.create(
      ctx.tenantId,
      {
        // Ownership is server-resolved; the customer cannot impersonate anyone.
        customerId: ctx.customerId,
        deliveryType: dto.scheduledPickupAt ? 'scheduled' : 'immediate',
        pickupAddress: dto.pickupAddress,
        pickupLat: pickup.pickupLat,
        pickupLng: pickup.pickupLng,
        dropoffAddress: dto.dropoffAddress,
        dropoffLat: dto.dropoffLat,
        dropoffLng: dto.dropoffLng,
        paymentMethod: dto.paymentMethod ?? 'cod',
        codAmount: dto.paymentMethod === 'cod' ? (dto.codAmount ?? 0) : 0,
        notes: dto.notes,
        scheduledPickupAt: dto.scheduledPickupAt,
        addresses: [
          {
            type: 'pickup',
            address: dto.pickupAddress,
            latitude: pickup.pickupLat,
            longitude: pickup.pickupLng,
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
    // status-history meta entry so it appears in the customer timeline.
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
      tenantId: ctx.tenantId,
      userId: actor.userId,
      action: 'customer.order_create',
      entity: 'order',
      entityId: created.id,
      after: { orderNumber: created.orderNumber, customerId: ctx.customerId },
      ip: actor.ip,
    });

    return this.getOwned(ctx, created.id);
  }

  async cancel(ctx: CustomerContext, id: string, dto: CancelCustomerOrderDto, actor: { userId: string; ip?: string }) {
    const order = await this.getOwned(ctx, id);
    if (!CUSTOMER_CANCELLABLE.includes(order.status as OrderStatus)) {
      throw Errors.conflict(
        'ORDER_NOT_CANCELLABLE',
        `This order can no longer be cancelled (status "${order.status}")`,
      );
    }
    return this.orders.cancel(ctx.tenantId, id, { reason: dto.reason }, actor);
  }

  static cancellable(): OrderStatus[] {
    return CUSTOMER_CANCELLABLE;
  }
}
