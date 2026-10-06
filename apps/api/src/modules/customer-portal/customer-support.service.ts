import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Errors } from '../../common/errors/app-error';
import { AuditService } from '../audit/audit.service';
import { CustomerContext } from './customer-context.service';
import {
  CreateCustomerTicketDto,
  CustomerTicketMessageDto,
  CustomerTicketQueryDto,
} from './dto/customer-portal.dto';

/**
 * Customer support tickets. A customer only ever sees its own tickets: reads
 * and writes are filtered by `customerId`, and an attempt to open another
 * customer's ticket yields a 404.
 */
@Injectable()
export class CustomerSupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async getOwned(ctx: CustomerContext, id: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, customerId: ctx.customerId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!ticket) throw Errors.notFound('ticket');
    return ticket;
  }

  async list(ctx: CustomerContext, q: CustomerTicketQueryDto) {
    const where: any = { customerId: ctx.customerId };
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

  get(ctx: CustomerContext, id: string) {
    return this.getOwned(ctx, id);
  }

  async create(ctx: CustomerContext, dto: CreateCustomerTicketDto, actor: { userId: string; ip?: string }) {
    if (dto.orderId) {
      const order = await this.prisma.order.findFirst({
        where: { id: dto.orderId, customerId: ctx.customerId },
        select: { id: true },
      });
      if (!order) throw Errors.notFound('order');
    }
    const ticket = await this.prisma.supportTicket.create({
      data: {
        tenantId: ctx.tenantId,
        customerId: ctx.customerId,
        subject: dto.subject,
        description: dto.description,
        orderId: dto.orderId,
        priority: (dto.priority as any) ?? 'normal',
        messages: dto.description
          ? { create: { senderType: 'customer', senderId: actor.userId, body: dto.description } }
          : undefined,
      },
    });
    await this.audit.log({
      tenantId: ctx.tenantId, userId: actor.userId, action: 'customer.support_create',
      entity: 'support_ticket', entityId: ticket.id, after: { subject: dto.subject }, ip: actor.ip,
    });
    return ticket;
  }

  async addMessage(ctx: CustomerContext, id: string, dto: CustomerTicketMessageDto, actor: { userId: string; ip?: string }) {
    await this.getOwned(ctx, id);
    const message = await this.prisma.ticketMessage.create({
      data: { ticketId: id, senderType: 'customer', senderId: actor.userId, body: dto.body },
    });
    await this.audit.log({
      tenantId: ctx.tenantId, userId: actor.userId, action: 'customer.support_message',
      entity: 'support_ticket', entityId: id, ip: actor.ip,
    });
    return message;
  }
}
