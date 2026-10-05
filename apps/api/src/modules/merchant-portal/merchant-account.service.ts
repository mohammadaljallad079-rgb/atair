import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Errors } from '../../common/errors/app-error';
import { AuditService } from '../audit/audit.service';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { MerchantContext } from './merchant-context.service';
import { UpdateBusinessSettingsDto, UpdateMerchantProfileDto } from './dto/merchant-portal.dto';

/**
 * Merchant notifications, profile and business settings.
 *
 * Notifications are scoped to the merchant's own users plus events emitted for
 * the merchant's orders (the notification `data.orderId` belongs to the
 * merchant). This prevents the tenant-wide notification list from leaking other
 * merchants' activity.
 */
@Injectable()
export class MerchantAccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async notifications(ctx: MerchantContext, userId: string, q: PaginationQueryDto) {
    // Scope to the merchant's own users. Order-lifecycle notifications are
    // emitted to `order.createdByUserId` (a merchant user), so this covers
    // order confirmed/assigned/picked-up/delivered/failed/cancelled events
    // without ever exposing another merchant's notifications.
    const merchantUserIds = await this.prisma.merchantUser.findMany({
      where: { merchantId: ctx.merchantId },
      select: { userId: true },
    });
    const userIds = merchantUserIds.map((m) => m.userId);
    if (!userIds.includes(userId)) userIds.push(userId);

    const where: any = { userId: { in: userIds } };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: q.skip,
        take: q.take,
      }),
      this.prisma.notification.count({ where }),
    ]);
    return { items, total };
  }

  async markNotificationRead(ctx: MerchantContext, id: string) {
    const merchantUserIds = await this.prisma.merchantUser.findMany({
      where: { merchantId: ctx.merchantId },
      select: { userId: true },
    });
    const userIds = merchantUserIds.map((m) => m.userId);
    const result = await this.prisma.notification.updateMany({
      where: { id, userId: { in: userIds } },
      data: { status: 'read', readAt: new Date() },
    });
    if (result.count === 0) throw Errors.notFound('notification');
    return { read: true };
  }

  async profile(ctx: MerchantContext, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, email: true, phone: true, locale: true, status: true },
    });
    if (!user) throw Errors.notFound('user');
    return {
      ...user,
      merchantId: ctx.merchantId,
      merchantName: ctx.merchantName,
      merchantRole: ctx.merchantRole,
    };
  }

  async updateProfile(ctx: MerchantContext, userId: string, dto: UpdateMerchantProfileDto, actor: { userId: string; ip?: string }) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { fullName: dto.fullName, phone: dto.phone, locale: dto.locale },
      select: { id: true, fullName: true, email: true, phone: true, locale: true },
    });
    await this.audit.log({
      tenantId: ctx.merchantId, userId: actor.userId, action: 'merchant.profile_update',
      entity: 'user', entityId: userId, after: user, ip: actor.ip,
    });
    return user;
  }

  async businessSettings(ctx: MerchantContext) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: ctx.merchantId },
      select: { id: true, name: true, slug: true, category: true, phone: true, email: true, settings: true },
    });
    if (!merchant) throw Errors.notFound('merchant');
    return {
      id: merchant.id,
      name: merchant.name,
      slug: merchant.slug,
      category: merchant.category,
      phone: merchant.phone,
      email: merchant.email,
      settings: (merchant.settings as Record<string, unknown> | null) ?? {},
    };
  }

  async updateBusinessSettings(ctx: MerchantContext, dto: UpdateBusinessSettingsDto, actor: { userId: string; ip?: string }) {
    const before = await this.prisma.merchant.findUnique({
      where: { id: ctx.merchantId },
      select: { settings: true, name: true, phone: true, email: true },
    });
    if (!before) throw Errors.notFound('merchant');

    const current = (before.settings as Record<string, unknown> | null) ?? {};
    // Only merchant-owned settings keys are writable here; platform keys are
    // never accepted from this endpoint.
    const merged: Record<string, unknown> = {
      ...current,
      ...(dto.contactName !== undefined ? { contactName: dto.contactName } : {}),
      ...(dto.contactPhone !== undefined ? { contactPhone: dto.contactPhone } : {}),
      ...(dto.contactEmail !== undefined ? { contactEmail: dto.contactEmail } : {}),
      ...(dto.defaultPickupAddress !== undefined ? { defaultPickupAddress: dto.defaultPickupAddress } : {}),
      ...(dto.defaultBranchId !== undefined ? { defaultBranchId: dto.defaultBranchId } : {}),
      ...(dto.invoiceVatNumber !== undefined ? { invoiceVatNumber: dto.invoiceVatNumber } : {}),
      ...(dto.invoiceAddress !== undefined ? { invoiceAddress: dto.invoiceAddress } : {}),
      ...(dto.language !== undefined ? { language: dto.language } : {}),
      ...(dto.notifyOnStatus !== undefined ? { notifyOnStatus: dto.notifyOnStatus } : {}),
    };

    if (dto.defaultBranchId) {
      const branch = await this.prisma.merchantBranch.findFirst({
        where: { id: dto.defaultBranchId, merchantId: ctx.merchantId },
        select: { id: true },
      });
      if (!branch) throw Errors.notFound('branch');
    }

    const merchant = await this.prisma.merchant.update({
      where: { id: ctx.merchantId },
      data: {
        name: dto.businessName ?? undefined,
        phone: dto.contactPhone ?? undefined,
        email: dto.contactEmail?.toLowerCase() ?? undefined,
        settings: merged as any,
      },
      select: { id: true, name: true, slug: true, phone: true, email: true, settings: true },
    });

    await this.audit.log({
      tenantId: ctx.merchantId, userId: actor.userId, action: 'merchant.settings_update',
      entity: 'merchant', entityId: ctx.merchantId, before: before.settings, after: merged, ip: actor.ip,
    });
    return merchant;
  }
}
