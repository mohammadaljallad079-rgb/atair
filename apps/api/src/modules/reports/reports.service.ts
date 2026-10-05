import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ACTIVE_STATUSES } from '../orders/order-state.machine';

export interface DashboardRange {
  from: Date;
  to: Date;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Resolves preset ranges (today, yesterday, week, month) or a custom range. */
  static resolveRange(preset?: string, from?: string, to?: string): DashboardRange {
    const now = new Date();
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    switch (preset) {
      case 'today':
        return { from: startOfDay(now), to: now };
      case 'yesterday': {
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        return { from: startOfDay(y), to: new Date(startOfDay(now).getTime() - 1) };
      }
      case 'week': {
        const w = new Date(now);
        w.setDate(w.getDate() - 7);
        return { from: w, to: now };
      }
      case 'month': {
        const m = new Date(now);
        m.setMonth(m.getMonth() - 1);
        return { from: m, to: now };
      }
      case 'custom':
        return {
          from: from ? new Date(from) : new Date(0),
          to: to ? new Date(to) : now,
        };
      default:
        return { from: new Date(0), to: now };
    }
  }

  async dashboard(tenantId: string, range: DashboardRange) {
    const createdInRange = { gte: range.from, lte: range.to };

    const [
      totalOrders,
      activeOrders,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      onlineDrivers,
      busyDrivers,
      revenueAgg,
      commissionAgg,
      pendingPaymentsAgg,
    ] = await this.prisma.$transaction([
      this.prisma.order.count({ where: { tenantId, createdAt: createdInRange } }),
      this.prisma.order.count({ where: { tenantId, status: { in: ACTIVE_STATUSES } } }),
      this.prisma.order.count({ where: { tenantId, status: 'pending' } }),
      this.prisma.order.count({ where: { tenantId, status: 'delivered', createdAt: createdInRange } }),
      this.prisma.order.count({ where: { tenantId, status: 'cancelled', createdAt: createdInRange } }),
      this.prisma.driver.count({ where: { tenantId, status: 'online' } }),
      this.prisma.driver.count({ where: { tenantId, status: 'busy' } }),
      this.prisma.order.aggregate({
        where: { tenantId, status: 'delivered', createdAt: createdInRange },
        _sum: { total: true },
      }),
      this.prisma.commission.aggregate({ where: { tenantId, createdAt: createdInRange }, _sum: { amount: true } }),
      this.prisma.payment.aggregate({ where: { tenantId, status: 'pending' }, _sum: { amount: true } }),
    ]);

    const driverEarnings = await this.prisma.driver.aggregate({
      where: { tenantId },
      _sum: { totalEarnings: true },
    });

    return {
      orders: {
        total: totalOrders,
        active: activeOrders,
        pending: pendingOrders,
        completed: completedOrders,
        cancelled: cancelledOrders,
      },
      drivers: { online: onlineDrivers, busy: busyDrivers },
      finance: {
        revenue: Number(revenueAgg._sum.total ?? 0),
        driverEarnings: Number(driverEarnings._sum.totalEarnings ?? 0),
        platformCommission: Number(commissionAgg._sum.amount ?? 0),
        pendingPayments: Number(pendingPaymentsAgg._sum.amount ?? 0),
      },
      range: { from: range.from.toISOString(), to: range.to.toISOString() },
    };
  }

  /** Orders grouped by status for chart rendering. */
  async ordersByStatus(tenantId: string, range: DashboardRange) {
    const grouped = await this.prisma.order.groupBy({
      by: ['status'],
      where: { tenantId, createdAt: { gte: range.from, lte: range.to } },
      _count: { _all: true },
    });
    return grouped.map((g) => ({ status: g.status, count: g._count._all }));
  }
}
