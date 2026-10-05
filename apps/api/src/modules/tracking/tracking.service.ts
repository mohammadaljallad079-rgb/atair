import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Errors } from '../../common/errors/app-error';
import { ACTIVE_STATUSES } from '../orders/order-state.machine';

@Injectable()
export class TrackingService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public-facing tracking snapshot for an order (tenant-scoped). */
  async track(tenantId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      select: {
        id: true, orderNumber: true, status: true,
        pickupLat: true, pickupLng: true, dropoffLat: true, dropoffLng: true,
        driverId: true, deliveredAt: true, updatedAt: true,
      },
    });
    if (!order) throw Errors.notFound('order');

    let driverLocation = null;
    if (order.driverId) {
      driverLocation = await this.prisma.driverLocation.findFirst({
        where: { tenantId, driverId: order.driverId },
        orderBy: { recordedAt: 'desc' },
      });
    }
    return { order, driverLocation };
  }

  /** Live operations snapshot: active orders + online driver positions. */
  async liveOps(tenantId: string) {
    const [activeOrders, drivers] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where: { tenantId, status: { in: ACTIVE_STATUSES } },
        select: {
          id: true, orderNumber: true, status: true, driverId: true,
          pickupLat: true, pickupLng: true, dropoffLat: true, dropoffLng: true,
          createdAt: true, updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      this.prisma.driver.findMany({
        where: { tenantId, status: { in: ['online', 'busy'] } },
        select: {
          id: true, fullName: true, status: true,
          locations: { orderBy: { recordedAt: 'desc' }, take: 1 },
        },
      }),
    ]);

    return {
      activeOrders,
      drivers: drivers.map((d) => ({
        id: d.id,
        fullName: d.fullName,
        status: d.status,
        location: d.locations[0] ?? null,
      })),
    };
  }
}
