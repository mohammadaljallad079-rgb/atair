import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Errors } from '../../common/errors/app-error';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DriverContext } from './driver-context.service';
import { OrderStatus } from '../orders/order-state.machine';

/** Order statuses a driver is allowed to move an assigned delivery through. */
const DRIVER_OWNED_ACTIVE: OrderStatus[] = [
  'assigned',
  'driver_arriving',
  'picked_up',
  'in_transit',
  'arriving',
];

/** Whitelisted driver-driven transitions (never an arbitrary target status). */
const DRIVER_TRANSITIONS: Record<string, string[]> = {
  assigned: ['driver_arriving', 'picked_up'],
  driver_arriving: ['picked_up'],
  picked_up: ['in_transit', 'arriving', 'delivered'],
  in_transit: ['arriving', 'delivered'],
  arriving: ['delivered'],
};

const DELIVERY_SELECT = {
  id: true,
  orderNumber: true,
  status: true,
  customerId: true,
  deliveryType: true,
  pickupAddress: true,
  pickupLat: true,
  pickupLng: true,
  dropoffAddress: true,
  dropoffLat: true,
  dropoffLng: true,
  distanceKm: true,
  estimatedDurationMin: true,
  total: true,
  currency: true,
  paymentMethod: true,
  paymentStatus: true,
  codAmount: true,
  codStatus: true,
  notes: true,
  createdAt: true,
  assignedAt: true,
  pickedUpAt: true,
  deliveredAt: true,
} as const;

/**
 * Driver delivery lifecycle: the signed-in driver lists their own deliveries
 * and advances them through the status machine. The order is always fetched by
 * `(id AND driverId)`, so a driver can never touch another driver's delivery.
 */
@Injectable()
export class DriverDeliveriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  private async getOwned(ctx: DriverContext, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, tenantId: ctx.tenantId, driverId: ctx.driverId },
      select: {
        ...DELIVERY_SELECT,
        items: true,
        deliveryAddress: true,
        customer: { select: { fullName: true, phone: true } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!order) throw Errors.notFound('delivery');
    return order;
  }

  /** Active deliveries assigned to this driver. */
  async active(ctx: DriverContext) {
    const items = await this.prisma.order.findMany({
      where: { tenantId: ctx.tenantId, driverId: ctx.driverId, status: { in: [...DRIVER_OWNED_ACTIVE] } },
      select: {
        ...DELIVERY_SELECT,
        deliveryAddress: true,
        customer: { select: { fullName: true, phone: true } },
      },
      orderBy: { assignedAt: 'desc' },
    });
    return items;
  }

  /** Completed/cancelled delivery history for this driver. */
  async history(ctx: DriverContext, take = 50, skip = 0) {
    const where = {
      tenantId: ctx.tenantId,
      driverId: ctx.driverId,
      status: { in: ['delivered', 'failed_delivery', 'returned', 'cancelled'] as OrderStatus[] },
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        select: DELIVERY_SELECT,
        orderBy: { deliveredAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items, total };
  }

  async get(ctx: DriverContext, id: string) {
    return this.getOwned(ctx, id);
  }

  /**
   * Advance a delivery's status. Only whitelisted driver transitions are
   * allowed; on `delivered` the driver's counters/earnings and the customer
   * notification are updated in the same transaction.
   */
  async updateStatus(ctx: DriverContext, id: string, to: string, note?: string) {
    const order = await this.getOwned(ctx, id);
    const from = order.status as string;
    const allowed = DRIVER_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw Errors.conflict(
        'INVALID_DRIVER_TRANSITION',
        `Cannot move a delivery from "${from}" to "${to}"`,
      );
    }

    const data: Record<string, any> = { status: to };
    const now = new Date();
    if (to === 'picked_up') data.pickedUpAt = now;
    if (to === 'delivered') data.deliveredAt = now;

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.order.update({ where: { id }, data });
      await tx.orderStatusHistory.create({
        data: { orderId: id, fromStatus: from as any, toStatus: to as any, reason: note ?? `driver:${to}` },
      });
      if (to === 'delivered') {
        await tx.driver.update({
          where: { id: ctx.driverId },
          data: {
            status: 'online',
            isAvailable: true,
            completedOrders: { increment: 1 },
            totalEarnings: { increment: Number(order.total) },
          },
        });
      }
      return result;
    });

    if (to === 'delivered' && order.customerId) {
      await this.notifications.emit(ctx.tenantId, 'order.delivered', {
        orderId: id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        driverId: ctx.driverId,
      });
    }
    await this.audit.log({
      tenantId: ctx.tenantId,
      action: 'driver.delivery_status',
      entity: 'order',
      entityId: id,
      before: { status: from },
      after: { status: to },
      userId: null,
    });
    return updated;
  }
}
