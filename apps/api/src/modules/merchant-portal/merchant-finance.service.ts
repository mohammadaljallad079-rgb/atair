import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { MerchantContext } from './merchant-context.service';
import { MerchantReportsService } from './merchant-reports.service';

/**
 * Merchant finance surface. Every query is scoped through `order.merchantId`
 * (payments/COD) or `merchantId` (settlements) — never tenant-wide, so a
 * merchant can never observe another merchant's or the platform's finances.
 */
@Injectable()
export class MerchantFinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reports: MerchantReportsService,
  ) {}

  async payments(ctx: MerchantContext, q: PaginationQueryDto & { status?: string; method?: string }) {
    const where: any = { order: { merchantId: ctx.merchantId } };
    if (q.status) where.status = q.status;
    if (q.method) where.method = q.method;
    if (q.search) {
      where.OR = [
        { providerRef: { contains: q.search, mode: 'insensitive' } },
        { order: { orderNumber: { contains: q.search, mode: 'insensitive' } } },
      ];
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        include: {
          order: { select: { id: true, orderNumber: true, merchantId: true, codAmount: true } },
          customer: { select: { id: true, fullName: true, phone: true } },
          refunds: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: q.skip,
        take: q.take,
      }),
      this.prisma.payment.count({ where }),
    ]);
    return { items, total };
  }

  /** COD records for the merchant's orders only. */
  async cod(ctx: MerchantContext, q: PaginationQueryDto & { status?: string; from?: string; to?: string }) {
    const where: any = { merchantId: ctx.merchantId, paymentMethod: 'cod' };
    if (q.status) where.codStatus = q.status;
    if (q.from || q.to) {
      where.createdAt = {};
      if (q.from) where.createdAt.gte = new Date(q.from);
      if (q.to) where.createdAt.lte = new Date(q.to);
    }
    if (q.search) {
      where.OR = [
        { orderNumber: { contains: q.search, mode: 'insensitive' } },
        { dropoffAddress: { contains: q.search, mode: 'insensitive' } },
        { customer: { fullName: { contains: q.search, mode: 'insensitive' } } },
      ];
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          codAmount: true,
          codStatus: true,
          codCollectedAt: true,
          codSettledAt: true,
          currency: true,
          total: true,
          paymentStatus: true,
          createdAt: true,
          deliveredAt: true,
          customer: { select: { id: true, fullName: true, phone: true } },
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

  async codSummary(ctx: MerchantContext) {
    const [pendingAgg, collectedAgg, settledAgg] = await this.prisma.$transaction([
      this.prisma.order.aggregate({
        where: { merchantId: ctx.merchantId, codStatus: 'pending' },
        _sum: { codAmount: true },
        _count: { _all: true },
      }),
      this.prisma.order.aggregate({
        where: { merchantId: ctx.merchantId, codStatus: 'collected' },
        _sum: { codAmount: true },
        _count: { _all: true },
      }),
      this.prisma.order.aggregate({
        where: { merchantId: ctx.merchantId, codStatus: 'settled' },
        _sum: { codAmount: true },
        _count: { _all: true },
      }),
    ]);
    return {
      pending: { amount: Number(pendingAgg._sum.codAmount ?? 0), count: pendingAgg._count._all },
      collected: { amount: Number(collectedAgg._sum.codAmount ?? 0), count: collectedAgg._count._all },
      settled: { amount: Number(settledAgg._sum.codAmount ?? 0), count: settledAgg._count._all },
    };
  }

  async settlements(ctx: MerchantContext, q: PaginationQueryDto & { status?: string }) {
    const where: any = { merchantId: ctx.merchantId };
    if (q.status) where.status = q.status;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.merchantSettlement.findMany({
        where,
        orderBy: { periodEnd: 'desc' },
        skip: q.skip,
        take: q.take,
      }),
      this.prisma.merchantSettlement.count({ where }),
    ]);
    return { items, total };
  }

  settlement(ctx: MerchantContext, id: string) {
    return this.prisma.merchantSettlement.findFirst({
      where: { id, merchantId: ctx.merchantId },
    });
  }
}
