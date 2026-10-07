import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ACTIVE_STATUSES, OrderStatus } from '../orders/order-state.machine';

export interface DashboardRange {
  from: Date;
  to: Date;
}

// Orders still moving toward delivery (not yet handed to a driver).
const AWAITING_ASSIGNMENT: OrderStatus[] = ['pending', 'confirmed', 'searching_driver'];
// Driver has the order in hand / en route.
const PICKED_UP_STATUSES: OrderStatus[] = ['picked_up'];
const IN_TRANSIT_STATUSES: OrderStatus[] = ['in_transit', 'arriving'];
// Delivered but not marked paid (COD / cash still outstanding).
const PROBLEM_PAYMENT_STATUSES = ['pending', 'failed'];

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
      driverEarningsAgg,
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
      // Driver earnings realised in the selected range (delivered orders). Uses
      // the same basis as revenue so the two KPIs stay mutually consistent.
      this.prisma.order.aggregate({
        where: { tenantId, status: 'delivered', driverId: { not: null }, createdAt: createdInRange },
        _sum: { total: true },
      }),
      this.prisma.commission.aggregate({ where: { tenantId, createdAt: createdInRange }, _sum: { amount: true } }),
      this.prisma.payment.aggregate({ where: { tenantId, status: 'pending' }, _sum: { amount: true } }),
    ]);

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
        driverEarnings: Number(driverEarningsAgg._sum.total ?? 0),
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

  /**
   * Time-bucketed order counts and delivered revenue for charts. Bucketing is
   * done in the database (date_trunc) so the browser never receives raw rows.
   * `bucket` is restricted to a fixed allow-list — it is interpolated into the
   * SQL only through Prisma.sql with a validated literal.
   */
  async timeseries(tenantId: string, range: DashboardRange, bucket: 'day' | 'hour') {
    const unit = bucket === 'hour' ? 'hour' : 'day';
    const rows = await this.prisma.$queryRaw<
      Array<{ bucket: Date; orders: bigint; revenue: unknown }>
    >`
      SELECT date_trunc(${unit}::text, created_at) AS bucket,
             COUNT(*)::bigint AS orders,
             COALESCE(SUM(CASE WHEN status = 'delivered' THEN total ELSE 0 END), 0) AS revenue
      FROM orders
      WHERE tenant_id = ${tenantId}::uuid
        AND created_at >= ${range.from}
        AND created_at <= ${range.to}
      GROUP BY bucket
      ORDER BY bucket ASC
    `;
    return rows.map((r) => ({
      bucket: r.bucket.toISOString(),
      orders: Number(r.orders),
      revenue: Number(r.revenue),
    }));
  }

  /** Operational counters for the live operations page. */
  async operations(tenantId: string) {
    const [
      unassignedOrders,
      activeOrders,
      onlineDrivers,
      busyDrivers,
      availableDrivers,
      pausedDrivers,
      suspendedDrivers,
    ] = await this.prisma.$transaction([
      this.prisma.order.count({ where: { tenantId, driverId: null, status: { in: ACTIVE_STATUSES } } }),
      this.prisma.order.count({ where: { tenantId, status: { in: ACTIVE_STATUSES } } }),
      this.prisma.driver.count({ where: { tenantId, status: 'online' } }),
      this.prisma.driver.count({ where: { tenantId, status: 'busy' } }),
      this.prisma.driver.count({ where: { tenantId, status: 'online', isAvailable: true } }),
      this.prisma.driver.count({ where: { tenantId, status: 'paused' } }),
      this.prisma.driver.count({ where: { tenantId, status: 'suspended' } }),
    ]);
    return {
      unassignedOrders,
      activeOrders,
      onlineDrivers,
      busyDrivers,
      availableDrivers,
      pausedDrivers,
      suspendedDrivers,
    };
  }

  /**
   * Live-operations overview: current workload buckets, driver availability and
   * operational alerts (problem deliveries + stale orders). Snapshot semantics —
   * the client polls this endpoint, so every field reflects the moment of the
   * request. There is no WebSocket/SSE channel in this deployment.
   */
  async liveOverview(tenantId: string) {
    const now = new Date();
    const staleCutoff = new Date(now.getTime() - 45 * 60 * 1000);
    const recentCutoff = new Date(now.getTime() - 60 * 60 * 1000);
    const active = { in: ACTIVE_STATUSES };

    const [
      awaitingAssignment,
      assigned,
      pickedUp,
      inTransit,
      delayed,
      failedDelivery,
      recentlyDelivered,
      availableDrivers,
      busyDrivers,
      offlineDrivers,
      suspendedDrivers,
      problemOrders,
      staleOrders,
    ] = await this.prisma.$transaction([
      this.prisma.order.count({ where: { tenantId, status: { in: AWAITING_ASSIGNMENT } } }),
      this.prisma.order.count({ where: { tenantId, status: 'assigned' as any } }),
      this.prisma.order.count({ where: { tenantId, status: { in: PICKED_UP_STATUSES } } }),
      this.prisma.order.count({ where: { tenantId, status: { in: IN_TRANSIT_STATUSES } } }),
      this.prisma.order.count({
        where: { tenantId, status: active, updatedAt: { lt: staleCutoff } },
      }),
      this.prisma.order.count({ where: { tenantId, status: 'failed_delivery' as any } }),
      this.prisma.order.count({
        where: { tenantId, status: 'delivered' as any, deliveredAt: { gte: recentCutoff } },
      }),
      this.prisma.driver.count({ where: { tenantId, status: 'online', isAvailable: true } }),
      this.prisma.driver.count({ where: { tenantId, status: 'busy' } }),
      this.prisma.driver.count({ where: { tenantId, status: 'offline' } }),
      this.prisma.driver.count({ where: { tenantId, status: 'suspended' } }),
      this.prisma.order.findMany({
        where: {
          tenantId,
          OR: [
            { status: 'failed_delivery' as any },
            { status: active, updatedAt: { lt: staleCutoff } },
            { status: 'delivered' as any, paymentStatus: { in: PROBLEM_PAYMENT_STATUSES as any } },
          ],
        },
        select: { id: true, orderNumber: true, status: true, paymentStatus: true, updatedAt: true, driverId: true },
        orderBy: { updatedAt: 'asc' },
        take: 50,
      }),
      this.prisma.order.count({ where: { tenantId, status: active, updatedAt: { lt: staleCutoff } } }),
    ]);

    return {
      generatedAt: now.toISOString(),
      buckets: {
        awaitingAssignment,
        assigned,
        pickedUp,
        inTransit,
        delayed,
        failedDelivery,
        recentlyDelivered,
      },
      drivers: { available: availableDrivers, busy: busyDrivers, offline: offlineDrivers, suspended: suspendedDrivers },
      problemOrders,
      staleOrderCount: staleOrders,
    };
  }

  /** Per-driver operational report over the selected range. */
  async driversReport(tenantId: string, range: DashboardRange) {
    const drivers = await this.prisma.driver.findMany({
      where: { tenantId },
      select: {
        id: true, fullName: true, status: true, verificationStatus: true, isAvailable: true,
        rating: true, completedOrders: true, cancelledOrders: true, totalEarnings: true,
      },
      orderBy: { completedOrders: 'desc' },
    });
    const delivered = await this.prisma.order.groupBy({
      by: ['driverId'],
      where: { tenantId, status: 'delivered', driverId: { not: null }, createdAt: { gte: range.from, lte: range.to } },
      _count: { _all: true },
      _sum: { total: true },
    });
    const byDriver = new Map(delivered.map((d) => [d.driverId, d]));
    return drivers.map((d) => {
      const agg = byDriver.get(d.id);
      return {
        ...d,
        completedInRange: agg?._count._all ?? 0,
        revenueInRange: Number(agg?._sum.total ?? 0),
      };
    });
  }

  /** Per-merchant report over the selected range. */
  async merchantsReport(tenantId: string, range: DashboardRange) {
    const merchants = await this.prisma.merchant.findMany({
      where: { tenantId },
      select: { id: true, name: true, slug: true, status: true, commissionRate: true },
      orderBy: { name: 'asc' },
    });
    const grouped = await this.prisma.order.groupBy({
      by: ['merchantId', 'status'],
      where: { tenantId, merchantId: { not: null }, createdAt: { gte: range.from, lte: range.to } },
      _count: { _all: true },
      _sum: { total: true },
    });
    const byMerchant = new Map<string, { orders: number; delivered: number; revenue: number }>();
    for (const g of grouped) {
      if (!g.merchantId) continue;
      const entry = byMerchant.get(g.merchantId) ?? { orders: 0, delivered: 0, revenue: 0 };
      entry.orders += g._count._all;
      if (g.status === 'delivered') {
        entry.delivered += g._count._all;
        entry.revenue += Number(g._sum.total ?? 0);
      }
      byMerchant.set(g.merchantId, entry);
    }
    return merchants.map((m) => ({
      ...m,
      ...(byMerchant.get(m.id) ?? { orders: 0, delivered: 0, revenue: 0 }),
    }));
  }

  /** Escapes a value for safe CSV embedding (RFC 4180 quoting). */
  private csvCell(value: unknown): string {
    const s = value == null ? '' : String(value);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  /**
   * Exports orders within a range as CSV. Only the tenant's own orders are
   * included; columns are a fixed allow-list so no internal fields leak.
   */
  async exportOrdersCsv(tenantId: string, range: DashboardRange, status?: string) {
    const where: any = { tenantId, createdAt: { gte: range.from, lte: range.to } };
    if (status) where.status = status;
    const orders = await this.prisma.order.findMany({
      where,
      select: {
        orderNumber: true, status: true, paymentStatus: true, paymentMethod: true,
        total: true, currency: true, pickupAddress: true, dropoffAddress: true,
        createdAt: true, deliveredAt: true,
        customer: { select: { fullName: true, phone: true } },
        driver: { select: { fullName: true } },
        merchant: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });
    const header = [
      'orderNumber', 'status', 'paymentStatus', 'paymentMethod', 'total', 'currency',
      'customer', 'customerPhone', 'driver', 'merchant', 'pickupAddress', 'dropoffAddress',
      'createdAt', 'deliveredAt',
    ];
    const lines = [header.join(',')];
    for (const o of orders) {
      lines.push([
        o.orderNumber, o.status, o.paymentStatus, o.paymentMethod, Number(o.total), o.currency,
        o.customer?.fullName, o.customer?.phone, o.driver?.fullName, o.merchant?.name,
        o.pickupAddress, o.dropoffAddress, o.createdAt.toISOString(), o.deliveredAt?.toISOString(),
      ].map((v) => this.csvCell(v)).join(','));
    }
    return lines.join('\n');
  }
}
