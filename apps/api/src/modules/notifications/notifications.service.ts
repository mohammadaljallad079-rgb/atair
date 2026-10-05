import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
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

/**
 * Notification Service — channel-agnostic foundation. Templates live in the
 * database; channel providers are pluggable and never embedded in domain
 * modules. Delivery providers (push/SMS/email/WhatsApp) are added later.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger('NotificationsService');

  constructor(private readonly prisma: PrismaService) {}

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

  async list(tenantId: string, q: PaginationQueryDto) {
    const where = { tenantId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip: q.skip, take: q.take }),
      this.prisma.notification.count({ where }),
    ]);
    return { items, total };
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
