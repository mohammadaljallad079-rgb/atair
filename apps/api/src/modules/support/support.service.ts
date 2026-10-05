import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Errors } from '../../common/errors/app-error';
import { AuditService } from '../audit/audit.service';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export interface CreateTicketDto {
  subject: string;
  description?: string;
  customerId?: string;
  orderId?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(tenantId: string, q: PaginationQueryDto & { status?: string }) {
    const where = {
      tenantId,
      ...(q.status ? { status: q.status as any } : {}),
      ...(q.search ? { subject: { contains: q.search, mode: 'insensitive' as const } } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.supportTicket.findMany({ where, orderBy: { createdAt: 'desc' }, skip: q.skip, take: q.take }),
      this.prisma.supportTicket.count({ where }),
    ]);
    return { items, total };
  }

  async get(tenantId: string, id: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, tenantId },
      include: { messages: { orderBy: { createdAt: 'asc' } }, complaints: true },
    });
    if (!ticket) throw Errors.notFound('ticket');
    return ticket;
  }

  async create(tenantId: string, dto: CreateTicketDto, actor: { userId: string; ip?: string }) {
    if (dto.customerId) {
      const c = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId }, select: { id: true } });
      if (!c) throw Errors.notFound('customer');
    }
    const ticket = await this.prisma.supportTicket.create({
      data: { tenantId, ...dto, priority: (dto.priority as any) ?? 'normal' },
    });
    await this.audit.log({ tenantId, userId: actor.userId, action: 'support.ticket_create', entity: 'support_ticket', entityId: ticket.id, after: ticket, ip: actor.ip });
    return ticket;
  }

  async addMessage(tenantId: string, id: string, body: string, actor: { userId: string; ip?: string }) {
    await this.get(tenantId, id);
    const message = await this.prisma.ticketMessage.create({
      data: { ticketId: id, senderType: 'staff', senderId: actor.userId, body },
    });
    await this.audit.log({ tenantId, userId: actor.userId, action: 'support.message_add', entity: 'support_ticket', entityId: id, ip: actor.ip });
    return message;
  }

  async setStatus(tenantId: string, id: string, status: string, actor: { userId: string; ip?: string }) {
    await this.get(tenantId, id);
    const ticket = await this.prisma.supportTicket.update({ where: { id }, data: { status: status as any } });
    await this.audit.log({ tenantId, userId: actor.userId, action: 'support.status_change', entity: 'support_ticket', entityId: id, after: { status }, ip: actor.ip });
    return ticket;
  }
}
