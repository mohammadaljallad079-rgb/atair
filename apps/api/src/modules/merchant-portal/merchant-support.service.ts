import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Errors } from '../../common/errors/app-error';
import { AuditService } from '../audit/audit.service';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { MerchantContext } from './merchant-context.service';
import { CreateMerchantTicketDto, MerchantTicketMessageDto } from './dto/merchant-portal.dto';

/**
 * Merchant support uses the existing SupportTicket model, now with a
 * `merchantId` owner column. A merchant only ever sees its own tickets.
 */
@Injectable()
export class MerchantSupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(ctx: MerchantContext, q: PaginationQueryDto & { status?: string }) {
    const where: any = { merchantId: ctx.merchantId };
    if (q.status) where.status = q.status;
    if (q.search) where.subject = { contains: q.search, mode: 'insensitive' };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.supportTicket.findMany({
        where,
        include: { _count: { select: { messages: true } } },
        orderBy: { createdAt: 'desc' },
        skip: q.skip,
        take: q.take,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);
    return { items, total };
  }

  async get(ctx: MerchantContext, id: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, merchantId: ctx.merchantId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!ticket) throw Errors.notFound('ticket');
    return ticket;
  }

  async create(ctx: MerchantContext, dto: CreateMerchantTicketDto, actor: { userId: string; ip?: string }) {
    const tenant = await this.prisma.merchant.findUnique({
      where: { id: ctx.merchantId },
      select: { tenantId: true },
    });
    if (!tenant) throw Errors.notFound('merchant');

    if (dto.orderId) {
      const order = await this.prisma.order.findFirst({
        where: { id: dto.orderId, merchantId: ctx.merchantId },
        select: { id: true },
      });
      if (!order) throw Errors.notFound('order');
    }

    const ticket = await this.prisma.supportTicket.create({
      data: {
        tenantId: tenant.tenantId,
        merchantId: ctx.merchantId,
        subject: dto.subject,
        description: dto.description,
        orderId: dto.orderId,
        priority: (dto.priority as any) ?? 'normal',
        messages: dto.description
          ? { create: { senderType: 'merchant', senderId: actor.userId, body: dto.description } }
          : undefined,
      },
    });
    await this.audit.log({
      tenantId: tenant.tenantId, userId: actor.userId, action: 'merchant.support_create',
      entity: 'support_ticket', entityId: ticket.id, after: { subject: dto.subject }, ip: actor.ip,
    });
    return ticket;
  }

  async addMessage(ctx: MerchantContext, id: string, dto: MerchantTicketMessageDto, actor: { userId: string; ip?: string }) {
    const ticket = await this.get(ctx, id);
    const message = await this.prisma.ticketMessage.create({
      data: { ticketId: id, senderType: 'merchant', senderId: actor.userId, body: dto.body },
    });
    await this.audit.log({
      tenantId: ticket.tenantId, userId: actor.userId, action: 'merchant.support_message',
      entity: 'support_ticket', entityId: id, ip: actor.ip,
    });
    return message;
  }
}
