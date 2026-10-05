import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MerchantContext } from './merchant-context.service';

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(columns: string[], rows: Array<Record<string, unknown>>): string {
  const header = columns.map(csvCell).join(',');
  const body = rows.map((r) => columns.map((c) => csvCell(r[c])).join(',')).join('\n');
  return `${header}\n${body}`;
}

/**
 * CSV export of merchant-owned data. Every query is merchant-scoped, so a
 * merchant can never export another tenant's or merchant's rows.
 */
@Injectable()
export class MerchantExportService {
  constructor(private readonly prisma: PrismaService) {}

  async export(
    ctx: MerchantContext,
    resource: string,
    from?: string,
    to?: string,
  ): Promise<{ filename: string; content: string }> {
    const created =
      from || to
        ? { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined }
        : undefined;

    switch (resource) {
      case 'payments':
        return this.exportPayments(ctx, created);
      case 'cod':
        return this.exportCod(ctx, created);
      case 'settlements':
        return this.exportSettlements(ctx, created);
      case 'orders':
      default:
        return this.exportOrders(ctx, created);
    }
  }

  private async exportPayments(ctx: MerchantContext, created?: { gte?: Date; lte?: Date }) {
    const rows = await this.prisma.payment.findMany({
      where: { order: { merchantId: ctx.merchantId }, ...(created ? { createdAt: created } : {}) },
      include: { order: { select: { orderNumber: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });
    const columns = ['paymentId', 'orderNumber', 'amount', 'currency', 'method', 'status', 'refundedAmount', 'createdAt'];
    const data = rows.map((p) => ({
      paymentId: p.id,
      orderNumber: p.order?.orderNumber ?? '',
      amount: p.amount.toString(),
      currency: p.currency,
      method: p.method,
      status: p.status,
      refundedAmount: p.refundedAmount.toString(),
      createdAt: p.createdAt.toISOString(),
    }));
    return { filename: 'merchant-payments.csv', content: toCsv(columns, data) };
  }

  private async exportCod(ctx: MerchantContext, created?: { gte?: Date; lte?: Date }) {
    const rows = await this.prisma.order.findMany({
      where: { merchantId: ctx.merchantId, paymentMethod: 'cod', ...(created ? { createdAt: created } : {}) },
      include: { customer: { select: { fullName: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });
    const columns = ['orderNumber', 'recipient', 'recipientPhone', 'codAmount', 'codStatus', 'deliveryFee', 'collectedAt', 'settledAt', 'createdAt'];
    const data = rows.map((o) => ({
      orderNumber: o.orderNumber,
      recipient: o.customer?.fullName ?? '',
      recipientPhone: o.customer?.phone ?? '',
      codAmount: o.codAmount.toString(),
      codStatus: o.codStatus,
      deliveryFee: o.total.toString(),
      collectedAt: o.codCollectedAt?.toISOString() ?? '',
      settledAt: o.codSettledAt?.toISOString() ?? '',
      createdAt: o.createdAt.toISOString(),
    }));
    return { filename: 'merchant-cod.csv', content: toCsv(columns, data) };
  }

  private async exportSettlements(ctx: MerchantContext, created?: { gte?: Date; lte?: Date }) {
    const rows = await this.prisma.merchantSettlement.findMany({
      where: { merchantId: ctx.merchantId, ...(created ? { periodEnd: created } : {}) },
      orderBy: { periodEnd: 'desc' },
      take: 10000,
    });
    const columns = ['reference', 'periodStart', 'periodEnd', 'orders', 'codCollected', 'deliveryFees', 'commission', 'adjustments', 'netPayable', 'status', 'paidAt'];
    const data = rows.map((s) => ({
      reference: s.reference ?? s.id,
      periodStart: s.periodStart.toISOString(),
      periodEnd: s.periodEnd.toISOString(),
      orders: s.orderCount,
      codCollected: s.codCollected.toString(),
      deliveryFees: s.deliveryFees.toString(),
      commission: s.commissionAmount.toString(),
      adjustments: s.adjustments.toString(),
      netPayable: s.netPayable.toString(),
      status: s.status,
      paidAt: s.paidAt?.toISOString() ?? '',
    }));
    return { filename: 'merchant-settlements.csv', content: toCsv(columns, data) };
  }

  private async exportOrders(ctx: MerchantContext, created?: { gte?: Date; lte?: Date }) {
    const rows = await this.prisma.order.findMany({
      where: { merchantId: ctx.merchantId, ...(created ? { createdAt: created } : {}) },
      include: { customer: { select: { fullName: true, phone: true } }, driver: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });
    const columns = ['orderNumber', 'status', 'recipient', 'recipientPhone', 'pickupAddress', 'dropoffAddress', 'driver', 'deliveryFee', 'codAmount', 'paymentMethod', 'paymentStatus', 'createdAt'];
    const data = rows.map((o) => ({
      orderNumber: o.orderNumber,
      status: o.status,
      recipient: o.customer?.fullName ?? '',
      recipientPhone: o.customer?.phone ?? '',
      pickupAddress: o.pickupAddress,
      dropoffAddress: o.dropoffAddress,
      driver: o.driver?.fullName ?? '',
      deliveryFee: o.total.toString(),
      codAmount: o.codAmount.toString(),
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      createdAt: o.createdAt.toISOString(),
    }));
    return { filename: 'merchant-orders.csv', content: toCsv(columns, data) };
  }
}
