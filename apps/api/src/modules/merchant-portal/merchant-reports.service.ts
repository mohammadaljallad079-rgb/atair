import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ACTIVE_STATUSES } from '../orders/order-state.machine';
import { MerchantContext } from './merchant-context.service';

export interface MerchantRange {
  from: Date;
  to: Date;
}

@Injectable()
export class MerchantReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Merchant dashboard ranges. `all` is an explicit opt-in for the full history. */
  static resolveRange(preset?: string, from?: string, to?: string): MerchantRange {
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
        return { from: from ? new Date(from) : new Date(0), to: to ? new Date(to) : now };
      default:
        return { from: new Date(0), to: now };
    }
  }

  private rangeWhere(ctx: MerchantContext, range: MerchantRange) {
    return { merchantId: ctx.merchantId, createdAt: { gte: range.from, lte: range.to } };
  }

  /** All KPIs are aggregated in the database, merchant-scoped. */
  async dashboard(ctx: MerchantContext, range: MerchantRange) {
    const createdInRange = { gte: range.from, lte: range.to };
    const base = { merchantId: ctx.merchantId };

    const [
      ordersToday,
      activeDeliveries,
      pendingOrders,
      searchingDriver,
      inTransit,
      delivered,
      cancelled,
      failed,
      codPendingAgg,
      spendAgg,
      branchCount,
      customerCount,
    ] = await this.prisma.$transaction([
      this.prisma.order.count({ where: { ...base, createdAt: createdInRange } }),
      this.prisma.order.count({ where: { ...base, status: { in: ACTIVE_STATUSES } } }),
      this.prisma.order.count({ where: { ...base, status: 'pending' } }),
      this.prisma.order.count({ where: { ...base, status: 'searching_driver' } }),
      this.prisma.order.count({ where: { ...base, status: { in: ['in_transit', 'arriving', 'picked_up'] } } }),
      this.prisma.order.count({ where: { ...base, status: 'delivered', createdAt: createdInRange } }),
      this.prisma.order.count({ where: { ...base, status: 'cancelled', createdAt: createdInRange } }),
      this.prisma.order.count({ where: { ...base, status: 'failed_delivery', createdAt: createdInRange } }),
      this.prisma.order.aggregate({
        where: { ...base, codStatus: { in: ['pending', 'collected'] } },
        _sum: { codAmount: true },
      }),
      this.prisma.order.aggregate({
        where: { ...base, status: 'delivered', createdAt: createdInRange },
        _sum: { total: true },
      }),
      this.prisma.merchantBranch.count({ where: { merchantId: ctx.merchantId, status: 'active' } }),
      this.prisma.customer.count({ where: { merchantId: ctx.merchantId } }),
    ]);

    return {
      orders: {
        total: ordersToday,
        active: activeDeliveries,
        pending: pendingOrders,
        searchingDriver,
        inTransit,
        delivered,
        cancelled,
        failed,
      },
      cod: { pending: Number(codPendingAgg._sum.codAmount ?? 0) },
      finance: { deliverySpend: Number(spendAgg._sum.total ?? 0) },
      branches: { active: branchCount },
      customers: { total: customerCount },
      range: { from: range.from.toISOString(), to: range.to.toISOString() },
    };
  }

  async ordersByStatus(ctx: MerchantContext, range: MerchantRange) {
    const grouped = await this.prisma.order.groupBy({
      by: ['status'],
      where: this.rangeWhere(ctx, range),
      _count: { _all: true },
    });
    return grouped.map((g) => ({ status: g.status, count: g._count._all }));
  }

  /**
   * Time-bucketed orders, delivered revenue and COD collected. Bucketing is done
   * in PostgreSQL via a validated `date_trunc` literal; the merchantId is a
   * bound parameter.
   */
  async timeseries(ctx: MerchantContext, range: MerchantRange, bucket: 'day' | 'hour') {
    const unit = bucket === 'hour' ? 'hour' : 'day';
    const rows = await this.prisma.$queryRaw<
      Array<{ bucket: Date; orders: bigint; revenue: unknown; cod: unknown }>
    >`
      SELECT date_trunc(${unit}::text, created_at) AS bucket,
             COUNT(*)::bigint AS orders,
             COALESCE(SUM(CASE WHEN status = 'delivered' THEN total ELSE 0 END), 0) AS revenue,
             COALESCE(SUM(CASE WHEN cod_status IN ('collected','settled') THEN cod_amount ELSE 0 END), 0) AS cod
      FROM orders
      WHERE merchant_id = ${ctx.merchantId}::uuid
        AND created_at >= ${range.from}
        AND created_at <= ${range.to}
      GROUP BY bucket
      ORDER BY bucket ASC
    `;
    return rows.map((r) => ({
      bucket: r.bucket.toISOString(),
      orders: Number(r.orders),
      revenue: Number(r.revenue),
      cod: Number(r.cod),
    }));
  }

  /** Branch performance: order volume and delivered spend per branch. */
  async branchPerformance(ctx: MerchantContext, range: MerchantRange) {
    const grouped = await this.prisma.order.groupBy({
      by: ['merchantBranchId'],
      where: { merchantId: ctx.merchantId, createdAt: { gte: range.from, lte: range.to } },
      _count: { _all: true },
      _sum: { total: true },
    });
    const branchIds = grouped.map((g) => g.merchantBranchId).filter((x): x is string => !!x);
    const branches = await this.prisma.merchantBranch.findMany({
      where: { id: { in: branchIds }, merchantId: ctx.merchantId },
      select: { id: true, name: true },
    });
    const nameById = new Map(branches.map((b) => [b.id, b.name]));
    return grouped
      .filter((g) => g.merchantBranchId)
      .map((g) => ({
        branchId: g.merchantBranchId as string,
        name: nameById.get(g.merchantBranchId as string) ?? '—',
        orders: g._count._all,
        revenue: Number(g._sum.total ?? 0),
      }))
      .sort((a, b) => b.orders - a.orders);
  }

  /** Consolidated merchant report used by the /reports page. */
  async summary(ctx: MerchantContext, range: MerchantRange) {
    const base = { merchantId: ctx.merchantId, createdAt: { gte: range.from, lte: range.to } };
    const [total, delivered, cancelled, failed, spendAgg, codCollectedAgg, codPendingAgg] =
      await this.prisma.$transaction([
        this.prisma.order.count({ where: base }),
        this.prisma.order.count({ where: { ...base, status: 'delivered' } }),
        this.prisma.order.count({ where: { ...base, status: 'cancelled' } }),
        this.prisma.order.count({ where: { ...base, status: 'failed_delivery' } }),
        this.prisma.order.aggregate({ where: { ...base, status: 'delivered' }, _sum: { total: true } }),
        this.prisma.order.aggregate({
          where: { ...base, codStatus: { in: ['collected', 'settled'] } },
          _sum: { codAmount: true },
        }),
        this.prisma.order.aggregate({
          where: { merchantId: ctx.merchantId, codStatus: 'pending' },
          _sum: { codAmount: true },
        }),
      ]);
    const spend = Number(spendAgg._sum.total ?? 0);
    return {
      orders: { total, delivered, cancelled, failed },
      finance: {
        deliverySpend: spend,
        averageDeliveryCost: delivered > 0 ? Number((spend / delivered).toFixed(2)) : 0,
        codCollected: Number(codCollectedAgg._sum.codAmount ?? 0),
        codPending: Number(codPendingAgg._sum.codAmount ?? 0),
      },
      range: { from: range.from.toISOString(), to: range.to.toISOString() },
    };
  }
}
