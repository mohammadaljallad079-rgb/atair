import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Errors } from '../../common/errors/app-error';
import { AuditService } from '../audit/audit.service';
import { DriverContext } from './driver-context.service';

/**
 * Driver self-service: profile, availability, live location, earnings, wallet
 * and notifications. Every query is scoped by the resolved driver id — a driver
 * can only ever read or mutate their own records.
 */
@Injectable()
export class DriverProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async me(ctx: DriverContext) {
    const driver = await this.prisma.driver.findFirst({
      where: { id: ctx.driverId, tenantId: ctx.tenantId },
      include: {
        user: { select: { email: true, username: true, status: true } },
        vehicles: { where: { isActive: true }, include: { vehicle: { include: { vehicleType: true } } } },
        documents: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!driver) throw Errors.notFound('driver');
    return driver;
  }

  async updateProfile(ctx: DriverContext, dto: { email?: string; address?: string; nationality?: string }) {
    const updated = await this.prisma.driver.update({
      where: { id: ctx.driverId },
      data: {
        email: dto.email?.toLowerCase(),
        address: dto.address,
        nationality: dto.nationality,
      },
    });
    await this.audit.log({
      tenantId: ctx.tenantId,
      action: 'driver.profile_update',
      entity: 'driver',
      entityId: ctx.driverId,
      after: { ...dto },
      userId: null,
    });
    return updated;
  }

  /** Toggle availability. Only an approved driver reaches this method. */
  async setAvailability(ctx: DriverContext, isAvailable: boolean) {
    const status = isAvailable ? 'online' : 'offline';
    const updated = await this.prisma.driver.update({
      where: { id: ctx.driverId },
      data: { isAvailable, status },
    });
    await this.audit.log({
      tenantId: ctx.tenantId,
      action: 'driver.availability',
      entity: 'driver',
      entityId: ctx.driverId,
      after: { isAvailable, status },
      userId: null,
    });
    return { isAvailable: updated.isAvailable, status: updated.status };
  }

  async updateLocation(ctx: DriverContext, latitude: number, longitude: number, heading?: number, speed?: number) {
    const recorded = await this.prisma.driverLocation.create({
      data: { tenantId: ctx.tenantId, driverId: ctx.driverId, latitude, longitude, heading, speed },
    });
    await this.prisma.driver.update({
      where: { id: ctx.driverId },
      data: { lastLocationAt: new Date() },
    });
    return { recordedAt: recorded.recordedAt };
  }

  /** Earnings summary derived from real delivered orders. */
  async earnings(ctx: DriverContext) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [driver, todayAgg, weekAgg] = await this.prisma.$transaction([
      this.prisma.driver.findFirst({
        where: { id: ctx.driverId },
        select: { totalEarnings: true, completedOrders: true, cancelledOrders: true, rating: true },
      }),
      this.prisma.order.aggregate({
        where: { tenantId: ctx.tenantId, driverId: ctx.driverId, status: 'delivered', deliveredAt: { gte: startOfDay } },
        _sum: { total: true },
        _count: { _all: true },
      }),
      this.prisma.order.aggregate({
        where: {
          tenantId: ctx.tenantId,
          driverId: ctx.driverId,
          status: 'delivered',
          deliveredAt: { gte: new Date(Date.now() - 7 * 86_400_000) },
        },
        _sum: { total: true },
        _count: { _all: true },
      }),
    ]);

    const wallet = await this.prisma.driverWallet.findUnique({ where: { driverId: ctx.driverId } });

    return {
      totalEarnings: driver?.totalEarnings ?? 0,
      completedOrders: driver?.completedOrders ?? 0,
      cancelledOrders: driver?.cancelledOrders ?? 0,
      rating: driver?.rating ?? null,
      today: { amount: todayAgg._sum.total ?? 0, orders: todayAgg._count._all },
      week: { amount: weekAgg._sum.total ?? 0, orders: weekAgg._count._all },
      wallet: wallet ? { balance: wallet.balance, pending: wallet.pending, currency: wallet.currency } : null,
    };
  }

  async wallet(ctx: DriverContext, take = 50, skip = 0) {
    const wallet = await this.prisma.driverWallet.findUnique({ where: { driverId: ctx.driverId } });
    if (!wallet) {
      return { balance: 0, pending: 0, currency: 'SAR', transactions: [], total: 0 };
    }
    const [transactions, total] = await this.prisma.$transaction([
      this.prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.walletTransaction.count({ where: { walletId: wallet.id } }),
    ]);
    return { balance: wallet.balance, pending: wallet.pending, currency: wallet.currency, transactions, total };
  }

  async notifications(ctx: DriverContext, take = 50, skip = 0) {
    const where = { tenantId: ctx.tenantId, driverId: ctx.driverId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take, skip }),
      this.prisma.notification.count({ where }),
    ]);
    return { items, total };
  }

  async markNotificationRead(ctx: DriverContext, id: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id, tenantId: ctx.tenantId, driverId: ctx.driverId },
      data: { status: 'read', readAt: new Date() },
    });
    if (result.count === 0) throw Errors.notFound('notification');
    return { read: true };
  }
}
