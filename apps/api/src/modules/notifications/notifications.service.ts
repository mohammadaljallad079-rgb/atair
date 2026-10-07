import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Errors } from '../../common/errors/app-error';
import { AuditService } from '../audit/audit.service';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export type NotificationChannel = 'push' | 'sms' | 'email' | 'whatsapp' | 'in_app';

export interface EmitInput {
  orderId?: string;
  orderNumber?: string;
  customerId?: string | null;
  driverId?: string | null;
  userId?: string | null;
  data?: Record<string, any>;
}

export interface NotificationQueryDto extends PaginationQueryDto {
  status?: string;
  channel?: string;
}

/**
 * Outbound delivery is intentionally absent: no push/SMS/email provider is
 * wired in this deployment. A notification therefore stops at the `queued`
 * record + NotificationLog attempt. `status` reflects record state only —
 * never a provider acknowledgement — so the Admin UI must not claim that an
 * external message was delivered.
 */
export interface SendNotificationDto {
  templateCode: string;
  userId?: string | null;
  customerId?: string | null;
  driverId?: string | null;
  data?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger('NotificationsService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Emits a notification for a template code, queuing it for each channel. */
  async emit(tenantId: string, templateCode: string, input: EmitInput) {
    const templates = await this.prisma.notificationTemplate.findMany({
      where: { OR: [{ tenantId }, { tenantId: null }], code: templateCode, isActive: true },
    });
    if (templates.length === 0) return { queued: 0 };

    let queued = 0;
    for (const tpl of templates) {
      const body = this.render(tpl.body, input.data ?? {});
      const notification = await this.prisma.notification.create({
        data: {
          tenantId,
          userId: input.userId,
          customerId: input.customerId,
          driverId: input.driverId,
          templateCode,
          channel: tpl.channel,
          title: tpl.subject ? this.render(tpl.subject, input.data ?? {}) : null,
          body,
          data: { ...input.data, orderId: input.orderId, orderNumber: input.orderNumber },
          status: 'queued',
        },
      });
      await this.prisma.notificationLog.create({
        data: { tenantId, notificationId: notification.id, channel: tpl.channel, status: 'queued' },
      });
      queued++;
    }
    this.logger.debug(`Queued ${queued} notification(s) for ${templateCode}`);
    return { queued };
  }

  /** Lists templates available for manual sending (system + tenant). */
  async listTemplates(tenantId: string) {
    return this.prisma.notificationTemplate.findMany({
      where: { OR: [{ tenantId }, { tenantId: null }], isActive: true },
      orderBy: { code: 'asc' },
    });
  }

  async list(tenantId: string, q: NotificationQueryDto) {
    const where: any = { tenantId };
    if (q.status) where.status = q.status;
    if (q.channel) where.channel = q.channel;
    if (q.search) {
      where.OR = [
        { title: { contains: q.search, mode: 'insensitive' as const } },
        { body: { contains: q.search, mode: 'insensitive' as const } },
        { templateCode: { contains: q.search, mode: 'insensitive' as const } },
      ];
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        include: { logs: { orderBy: { createdAt: 'desc' } } },
        orderBy: { createdAt: 'desc' },
        skip: q.skip,
        take: q.take,
      }),
      this.prisma.notification.count({ where }),
    ]);
    return { items, total };
  }

  async get(tenantId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, tenantId },
      include: { logs: { orderBy: { createdAt: 'desc' } } },
    });
    if (!notification) throw Errors.notFound('notification');
    return notification;
  }

  /**
   * Manually creates a queued notification from an existing template and
   * records a delivery attempt. This is record creation + queueing only: it
   * does not (and cannot) guarantee external delivery.
   */
  async send(tenantId: string, dto: SendNotificationDto, actor: { userId: string; ip?: string }) {
    if (!dto.userId && !dto.customerId && !dto.driverId) {
      throw Errors.validation('A recipient (user, customer or driver) is required');
    }
    const template = await this.prisma.notificationTemplate.findFirst({
      where: { OR: [{ tenantId }, { tenantId: null }], code: dto.templateCode, isActive: true },
    });
    if (!template) throw Errors.notFound('notification_template');

    const body = this.render(template.body, dto.data ?? {});
    const notification = await this.prisma.notification.create({
      data: {
        tenantId,
        userId: dto.userId ?? undefined,
        customerId: dto.customerId ?? undefined,
        driverId: dto.driverId ?? undefined,
        templateCode: dto.templateCode,
        channel: template.channel,
        title: template.subject ? this.render(template.subject, dto.data ?? {}) : null,
        body,
        data: dto.data ?? {},
        status: 'queued',
      },
    });
    await this.prisma.notificationLog.create({
      data: { tenantId, notificationId: notification.id, channel: template.channel, status: 'queued' },
    });
    await this.audit.log({
      tenantId, userId: actor.userId, action: 'notification.send', entity: 'notification',
      entityId: notification.id, after: { templateCode: dto.templateCode, channel: template.channel }, ip: actor.ip,
    });
    return notification;
  }

  /**
   * Re-queues a failed/queued notification by appending a fresh delivery
   * attempt. `sent`/`read` records are terminal and cannot be retried.
   */
  async retry(tenantId: string, id: string, actor: { userId: string; ip?: string }) {
    const notification = await this.prisma.notification.findFirst({ where: { id, tenantId } });
    if (!notification) throw Errors.notFound('notification');
    if (notification.status === 'sent' || notification.status === 'read') {
      throw Errors.conflict('NOTIFICATION_TERMINAL', 'Delivered notifications cannot be retried');
    }
    const [updated] = await this.prisma.$transaction([
      this.prisma.notification.update({ where: { id }, data: { status: 'queued' } }),
      this.prisma.notificationLog.create({
        data: { tenantId, notificationId: id, channel: notification.channel, status: 'queued', provider: 'manual_retry' },
      }),
    ]);
    await this.audit.log({
      tenantId, userId: actor.userId, action: 'notification.retry', entity: 'notification', entityId: id,
      before: { status: notification.status }, after: { status: 'queued' }, ip: actor.ip,
    });
    return updated;
  }

  async markRead(tenantId: string, id: string) {
    await this.prisma.notification.updateMany({
      where: { id, tenantId },
      data: { status: 'read', readAt: new Date() },
    });
    return { read: true };
  }

  /** Simple {{var}} interpolation; keeps templates free of code. */
  private render(template: string, vars: Record<string, any>): string {
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key) =>
      vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : '',
    );
  }
}
