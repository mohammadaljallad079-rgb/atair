import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Errors } from '../../common/errors/app-error';
import { AuditService } from '../audit/audit.service';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { WalletsService } from '../wallets/wallets.service';
import { CashPaymentProvider, PaymentProvider } from './payment-provider';

export interface CreatePaymentDto {
  orderId: string;
  method: 'cash' | 'card' | 'wallet' | 'online' | 'bank_transfer' | 'cod';
  amount?: number;
}

export interface RefundDto {
  amount?: number;
  reason?: string;
}

@Injectable()
export class PaymentsService {
  private readonly providers: PaymentProvider[] = [new CashPaymentProvider()];

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly wallets: WalletsService,
  ) {}

  /**
   * Settles a driver's earnings for an order: credits the wallet and records a
   * commission row. Idempotent per order via the wallet reference.
   */
  private async settleDriverEarnings(tenantId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, tenantId } });
    if (!order?.driverId) return;

    const amount = Number(order.total);
    await this.wallets.creditForOrder(
      tenantId,
      order.driverId,
      amount,
      `order:${orderId}`,
      `أرباح الطلب ${order.orderNumber}`,
    );

    const already = await this.prisma.commission.findFirst({ where: { tenantId, orderId } });
    if (!already) {
      await this.prisma.commission.create({
        data: { tenantId, orderId, driverId: order.driverId, amount: 0 },
      });
    }
  }

  private providerFor(method: string): PaymentProvider {
    const provider = this.providers.find((p) => p.supports(method));
    if (!provider) throw Errors.conflict('PAYMENT_METHOD_UNSUPPORTED', `No provider for method ${method}`);
    return provider;
  }

  async list(tenantId: string, q: PaginationQueryDto) {
    const where = { tenantId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({ where, orderBy: { createdAt: 'desc' }, skip: q.skip, take: q.take }),
      this.prisma.payment.count({ where }),
    ]);
    return { items, total };
  }

  /**
   * Creates a payment for an order. The amount always comes from the stored
   * order total, never from the client, and idempotency prevents duplicates.
   */
  async create(tenantId: string, dto: CreatePaymentDto, actor: { userId: string; ip?: string }) {
    const order = await this.prisma.order.findFirst({ where: { id: dto.orderId, tenantId } });
    if (!order) throw Errors.notFound('order');

    const existing = await this.prisma.payment.findFirst({
      where: { tenantId, orderId: order.id, status: { in: ['pending', 'authorized', 'paid'] } },
    });
    if (existing) throw Errors.conflict('PAYMENT_EXISTS', 'An active payment already exists for this order');

    const amount = Number(order.total);
    const provider = this.providerFor(dto.method);
    const idempotencyKey = `${order.id}:${dto.method}`;

    const charge = await provider.charge({
      amount,
      currency: order.currency,
      reference: order.orderNumber,
      idempotencyKey,
    });

    const payment = await this.prisma.payment.create({
      data: {
        tenantId,
        orderId: order.id,
        customerId: order.customerId,
        amount,
        currency: order.currency,
        method: dto.method as any,
        status: charge.status === 'paid' ? 'paid' : 'pending',
        provider: provider.name,
        providerRef: charge.providerRef,
        idempotencyKey,
        transactions: {
          create: { tenantId, type: 'charge', amount, status: 'pending', provider: provider.name, providerRef: charge.providerRef },
        },
      },
    });

    await this.prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: payment.status, paymentMethod: dto.method as any },
    });

    await this.audit.log({
      tenantId, userId: actor.userId, action: 'payment.create', entity: 'payment', entityId: payment.id,
      after: { amount, method: dto.method }, ip: actor.ip,
    });
    return payment;
  }

  /** Marks a COD/cash payment as paid (e.g. collected on delivery). */
  async markPaid(tenantId: string, id: string, actor: { userId: string; ip?: string }) {
    const payment = await this.prisma.payment.findFirst({ where: { id, tenantId } });
    if (!payment) throw Errors.notFound('payment');
    if (payment.status === 'refunded') throw Errors.conflict('PAYMENT_REFUNDED', 'Refunded payments cannot be marked paid');

    const updated = await this.prisma.payment.update({
      where: { id },
      data: { status: 'paid', transactions: { create: { tenantId, type: 'charge', amount: payment.amount, status: 'paid', provider: payment.provider } } },
    });
    if (payment.orderId) {
      await this.prisma.order.update({ where: { id: payment.orderId }, data: { paymentStatus: 'paid' } });
      await this.settleDriverEarnings(tenantId, payment.orderId);
    }
    await this.audit.log({ tenantId, userId: actor.userId, action: 'payment.mark_paid', entity: 'payment', entityId: id, after: { status: 'paid' }, ip: actor.ip });
    return updated;
  }

  async refund(tenantId: string, id: string, dto: RefundDto, actor: { userId: string; ip?: string }) {
    const payment = await this.prisma.payment.findFirst({ where: { id, tenantId } });
    if (!payment) throw Errors.notFound('payment');
    if (payment.status !== 'paid' && payment.status !== 'partially_refunded') {
      throw Errors.conflict('PAYMENT_NOT_REFUNDABLE', 'Only paid payments can be refunded');
    }
    const already = Number(payment.refundedAmount);
    const requested = dto.amount ?? Number(payment.amount) - already;
    if (requested <= 0) throw Errors.validation('Refund amount must be positive');
    if (already + requested > Number(payment.amount)) {
      throw Errors.validation('Refund exceeds remaining payment amount');
    }

    const provider = this.providerFor(payment.method);
    const result = await provider.refund({
      providerRef: payment.providerRef ?? '',
      amount: requested,
      currency: payment.currency,
      reason: dto.reason,
    });

    const newRefunded = already + requested;
    const fully = newRefunded >= Number(payment.amount);

    const updated = await this.prisma.payment.update({
      where: { id },
      data: {
        refundedAmount: newRefunded,
        status: fully ? 'refunded' : 'partially_refunded',
        refunds: { create: { tenantId, amount: requested, reason: dto.reason, status: 'refunded', createdByUserId: actor.userId } },
        transactions: { create: { tenantId, type: 'refund', amount: requested, status: 'refunded', provider: provider.name, providerRef: result.providerRef } },
      },
    });
    if (payment.orderId) {
      await this.prisma.order.update({
        where: { id: payment.orderId },
        data: { paymentStatus: fully ? 'refunded' : 'partially_refunded' },
      });
    }
    await this.audit.log({
      tenantId, userId: actor.userId, action: 'payment.refund', entity: 'payment', entityId: id,
      after: { refunded: requested, totalRefunded: newRefunded }, ip: actor.ip,
    });
    return updated;
  }
}
