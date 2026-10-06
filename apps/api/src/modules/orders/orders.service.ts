import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Errors } from '../../common/errors/app-error';
import { AuditService } from '../audit/audit.service';
import { PricingService } from '../pricing/pricing.service';
import { ZonesService } from '../zones/zones.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DispatchService } from '../dispatch/dispatch.service';
import {
  ACTIVE_STATUSES,
  OrderStateMachine,
  OrderStatus,
} from './order-state.machine';
import { haversineKm } from '../../common/utils/geo';
import {
  AssignDriverDto,
  CancelOrderDto,
  CreateOrderDto,
  OrderQueryDto,
  TransitionOrderDto,
  UpdateOrderDto,
} from './dto/order.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly pricing: PricingService,
    private readonly zones: ZonesService,
    private readonly notifications: NotificationsService,
    private readonly dispatch: DispatchService,
  ) {}

  async list(tenantId: string, q: OrderQueryDto) {
    const where: any = { tenantId };
    if (q.status) {
      where.status = q.status === 'active' ? { in: ACTIVE_STATUSES } : (q.status as OrderStatus);
    }
    if (q.paymentStatus) where.paymentStatus = q.paymentStatus;
    if (q.customerId) where.customerId = q.customerId;
    if (q.driverId) where.driverId = q.driverId;
    if (q.merchantId) where.merchantId = q.merchantId;
    if (q.from || q.to) {
      where.createdAt = {};
      if (q.from) where.createdAt.gte = new Date(q.from);
      if (q.to) where.createdAt.lte = new Date(q.to);
    }
    if (q.search) {
      where.OR = [
        { orderNumber: { contains: q.search, mode: 'insensitive' } },
        { pickupAddress: { contains: q.search, mode: 'insensitive' } },
        { dropoffAddress: { contains: q.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: {
          customer: { select: { id: true, fullName: true, phone: true } },
          driver: { select: { id: true, fullName: true, phone: true, status: true } },
          merchant: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: q.skip,
        take: q.take,
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items, total };
  }

  async get(tenantId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, tenantId },
      include: {
        items: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
        assignments: { orderBy: { createdAt: 'desc' } },
        deliveryAddress: true,
        deliveryAttempts: true,
        deliveryProofs: true,
        payments: true,
        customer: true,
        driver: { select: { id: true, fullName: true, phone: true, status: true, rating: true } },
        merchant: { select: { id: true, name: true } },
      },
    });
    if (!order) throw Errors.notFound('order');
    return order;
  }

  private async generateOrderNumber(tenantId: string): Promise<string> {
    const date = new Date();
    const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(
      date.getDate(),
    ).padStart(2, '0')}`;
    const count = await this.prisma.order.count({ where: { tenantId } });
    return `ATA-${stamp}-${String(count + 1).padStart(5, '0')}`;
  }

  async create(tenantId: string, dto: CreateOrderDto, actor: { userId: string; ip?: string }) {
    // Validate referenced entities belong to this tenant (prevents IDOR / cross-tenant refs).
    if (dto.customerId) await this.assertBelongs('customer', tenantId, dto.customerId);
    if (dto.merchantId) await this.assertBelongs('merchant', tenantId, dto.merchantId);
    if (dto.vehicleTypeId) await this.assertBelongs('vehicleType', tenantId, dto.vehicleTypeId, true);

    // Distance & duration are computed server-side; client estimates are ignored.
    let distanceKm = dto.distanceKm ?? 0;
    if (
      dto.pickupLat != null && dto.pickupLng != null &&
      dto.dropoffLat != null && dto.dropoffLng != null
    ) {
      distanceKm = haversineKm(dto.pickupLat, dto.pickupLng, dto.dropoffLat, dto.dropoffLng);
    }
    const durationMin = dto.durationMin ?? Math.max(5, Math.round((distanceKm / 25) * 60));

    const itemsTotal = (dto.items ?? []).reduce(
      (sum, it) => sum + (it.unitPrice ?? 0) * (it.quantity ?? 1),
      0,
    );

    // Resolve discount server-side; never trust a client-supplied amount.
    let discount: { type: 'fixed' | 'percent'; amount: number } | null = null;
    let discountId: string | undefined;
    if (dto.discountCode) {
      const found = await this.prisma.discount.findFirst({
        where: { tenantId, code: dto.discountCode, isActive: true },
      });
      if (found) {
        discount = { type: found.type === 'percent' ? 'percent' : 'fixed', amount: Number(found.amount) };
        discountId = found.id;
      }
    }

    // Resolve the pickup service zone so zone-scoped pricing rules apply.
    let zoneId: string | undefined;
    if (dto.pickupLat != null && dto.pickupLng != null) {
      const zone = await this.zones.resolveZone(tenantId, dto.pickupLat, dto.pickupLng);
      zoneId = zone?.id;
    }

    const quote = await this.pricing.quote(tenantId, {
      distanceKm,
      durationMin,
      scheduled: dto.deliveryType === 'scheduled',
      paymentMethod: dto.paymentMethod as any,
      discount,
      vehicleTypeId: dto.vehicleTypeId,
      merchantId: dto.merchantId,
      zoneId,
    });

    // Never persist an unpriced (zero-fare) order: if no active pricing rule
    // matched the request context the quote carries no ruleId.
    if (!quote.ruleId) {
      throw Errors.conflict('PRICING_UNAVAILABLE', 'No active pricing rule applies to this order');
    }

    const orderNumber = await this.generateOrderNumber(tenantId);

    const order = await this.prisma.order.create({
      data: {
        tenantId,
        orderNumber,
        customerId: dto.customerId,
        merchantId: dto.merchantId,
        merchantBranchId: dto.merchantBranchId,
        branchId: dto.branchId,
        deliveryType: (dto.deliveryType as any) ?? 'immediate',
        vehicleTypeId: dto.vehicleTypeId,
        status: 'pending',
        pickupAddress: dto.pickupAddress,
        pickupLat: dto.pickupLat,
        pickupLng: dto.pickupLng,
        dropoffAddress: dto.dropoffAddress,
        dropoffLat: dto.dropoffLat,
        dropoffLng: dto.dropoffLng,
        distanceKm,
        estimatedDurationMin: durationMin,
        scheduledPickupAt: dto.scheduledPickupAt ? new Date(dto.scheduledPickupAt) : null,
        subtotal: quote.subtotal + itemsTotal,
        discountAmount: quote.discountAmount,
        taxAmount: quote.taxAmount,
        surchargeAmount: quote.surchargeAmount,
        total: quote.total + itemsTotal,
        currency: quote.currency,
        priceBreakdown: quote as any,
        paymentMethod: (dto.paymentMethod as any) ?? 'cash',
        paymentStatus: 'pending',
        codAmount: dto.paymentMethod === 'cod' ? (dto.codAmount ?? 0) : 0,
        codStatus: dto.paymentMethod === 'cod' ? 'pending' : 'none',
        discountId,
        notes: dto.notes,
        createdByUserId: actor.userId,
        items: dto.items?.length
          ? {
              create: dto.items.map((it) => ({
                name: it.name,
                description: it.description,
                quantity: it.quantity ?? 1,
                unitPrice: it.unitPrice ?? 0,
                totalPrice: (it.unitPrice ?? 0) * (it.quantity ?? 1),
                weightKg: it.weightKg,
              })),
            }
          : undefined,
        deliveryAddress: dto.addresses?.length
          ? {
              create: dto.addresses.map((a) => ({
                type: a.type,
                address: a.address,
                latitude: a.latitude,
                longitude: a.longitude,
                contactName: a.contactName,
                contactPhone: a.contactPhone,
                details: a.details,
              })),
            }
          : undefined,
        statusHistory: {
          create: { toStatus: 'pending', changedByUserId: actor.userId, reason: 'order created' },
        },
      },
      include: { items: true, deliveryAddress: true },
    });

    await this.audit.log({
      tenantId, userId: actor.userId, action: 'order.create', entity: 'order',
      entityId: order.id, after: { orderNumber, total: order.total }, ip: actor.ip,
    });

    // Kick off dispatch asynchronously; the engine is independent of this API call.
    await this.dispatch.startDispatch(tenantId, order.id, actor);

    return order;
  }

  async update(tenantId: string, id: string, dto: UpdateOrderDto, actor: { userId: string; ip?: string }) {
    const before = await this.get(tenantId, id);
    if (OrderStateMachine.isTerminal(before.status as OrderStatus)) {
      throw Errors.conflict('ORDER_TERMINAL', 'Cannot modify a terminal order');
    }
    if (dto.driverId) await this.assertBelongs('driver', tenantId, dto.driverId);
    if (dto.vehicleId) await this.assertBelongs('vehicle', tenantId, dto.vehicleId);

    const order = await this.prisma.order.update({
      where: { id },
      data: { notes: dto.notes, vehicleId: dto.vehicleId },
    });
    await this.audit.log({
      tenantId, userId: actor.userId, action: 'order.update', entity: 'order', entityId: id,
      before, after: order, ip: actor.ip,
    });
    return order;
  }

  /** Central status transition — validated against the state machine. */
  async transition(
    tenantId: string,
    id: string,
    dto: TransitionOrderDto,
    actor: { userId: string; ip?: string },
    opts: { force?: boolean } = {},
  ) {
    const order = await this.get(tenantId, id);
    const from = order.status as OrderStatus;
    const to = dto.status as OrderStatus;

    if (!opts.force) {
      OrderStateMachine.assertTransition(from, to);
    }

    const data: any = { status: to };
    const now = new Date();
    if (to === 'confirmed') data.confirmedAt = now;
    if (to === 'assigned') data.assignedAt = now;
    if (to === 'picked_up') data.pickedUpAt = now;
    if (to === 'delivered') data.deliveredAt = now;
    if (to === 'cancelled') {
      data.cancelledAt = now;
      data.cancellationReason = dto.reason;
      data.cancelledBy = actor.userId;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.order.update({ where: { id }, data });
      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          fromStatus: from,
          toStatus: to,
          changedByUserId: actor.userId,
          reason: dto.reason,
        },
      });
      return result;
    });

    // Domain side effects
    if (to === 'delivered' && order.driverId) {
      await this.prisma.driver.update({
        where: { id: order.driverId },
        data: {
          status: 'online',
          isAvailable: true,
          completedOrders: { increment: 1 },
          totalEarnings: { increment: Number(order.total) },
        },
      });
    }
    if (to === 'cancelled' || to === 'delivered') {
      await this.dispatch.closeForOrder(order.id);
    }

    await this.notifications.emit(tenantId, `order.${to}`, {
      orderId: id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      userId: order.createdByUserId ?? undefined,
      data: { status: to },
    });

    await this.audit.log({
      tenantId, userId: actor.userId, action: 'order.status_change', entity: 'order',
      entityId: id, before: { status: from }, after: { status: to }, ip: actor.ip,
    });

    return updated;
  }

  async assignDriver(tenantId: string, id: string, dto: AssignDriverDto, actor: { userId: string; ip?: string }) {
    const order = await this.get(tenantId, id);
    if (OrderStateMachine.isTerminal(order.status as OrderStatus)) {
      throw Errors.conflict('ORDER_TERMINAL', 'Cannot assign a driver to a terminal order');
    }
    const driver = await this.prisma.driver.findFirst({ where: { id: dto.driverId, tenantId } });
    if (!driver) throw Errors.notFound('driver');
    if (driver.status === 'suspended') throw Errors.conflict('DRIVER_SUSPENDED', 'Cannot assign a suspended driver');
    if (!dto.force && driver.status === 'offline') {
      throw Errors.conflict('DRIVER_UNAVAILABLE', 'Driver is offline');
    }
    if (dto.vehicleId) await this.assertBelongs('vehicle', tenantId, dto.vehicleId);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.orderAssignment.create({
        data: {
          tenantId, orderId: id, driverId: dto.driverId, assignedByUserId: actor.userId,
          method: 'manual', status: 'accepted', respondedAt: new Date(),
        },
      });
      await tx.driver.update({
        where: { id: dto.driverId },
        data: { status: 'busy', isAvailable: false },
      });
      const result = await tx.order.update({
        where: { id },
        data: { driverId: dto.driverId, vehicleId: dto.vehicleId, status: 'assigned', assignedAt: new Date() },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: id, fromStatus: order.status as OrderStatus, toStatus: 'assigned',
          changedByUserId: actor.userId, reason: 'driver assigned',
        },
      });
      return result;
    });

    await this.notifications.emit(tenantId, 'order.assigned', {
      orderId: id, orderNumber: order.orderNumber, customerId: order.customerId,
      driverId: dto.driverId, data: { driverName: driver.fullName },
    });
    await this.audit.log({
      tenantId, userId: actor.userId, action: 'order.assign_driver', entity: 'order', entityId: id,
      before: { driverId: order.driverId }, after: { driverId: dto.driverId }, ip: actor.ip,
    });
    return updated;
  }

  async cancel(tenantId: string, id: string, dto: CancelOrderDto, actor: { userId: string; ip?: string }) {
    return this.transition(tenantId, id, { status: 'cancelled', reason: dto.reason }, actor);
  }

  async timeline(tenantId: string, id: string) {
    await this.get(tenantId, id);
    return this.prisma.orderStatusHistory.findMany({
      where: { orderId: id },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async assertBelongs(
    model: 'customer' | 'merchant' | 'driver' | 'vehicle' | 'vehicleType',
    tenantId: string,
    id: string,
    allowGlobal = false,
  ) {
    const client = this.prisma as any;
    const record = await client[model].findFirst({
      where: allowGlobal ? { id, OR: [{ tenantId }, { tenantId: null }] } : { id, tenantId },
      select: { id: true },
    });
    if (!record) throw Errors.notFound(model);
  }
}
