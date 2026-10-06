import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Errors } from '../../common/errors/app-error';
import { AuditService } from '../audit/audit.service';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { CustomerContext } from './customer-context.service';
import {
  CreateCustomerAddressBodyDto,
  UpdateCustomerAddressBodyDto,
  UpdateCustomerProfileDto,
} from './dto/customer-portal.dto';

/**
 * Customer profile, saved addresses and notifications.
 *
 * Every query is scoped by the resolved `CustomerContext.customerId`, so a
 * customer can never read or mutate another customer's data. Notifications are
 * scoped to the customer row and/or the authenticated user.
 */
@Injectable()
export class CustomerAccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async profile(ctx: CustomerContext, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, email: true, phone: true, locale: true, status: true, createdAt: true },
    });
    if (!user) throw Errors.notFound('user');
    return {
      ...user,
      customerId: ctx.customerId,
      customerStatus: ctx.status,
    };
  }

  async updateProfile(ctx: CustomerContext, userId: string, dto: UpdateCustomerProfileDto, actor: { ip?: string }) {
    // Keep the login `User` and the `Customer` display record in sync.
    const updated = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          fullName: dto.fullName,
          email: dto.email?.toLowerCase(),
          locale: dto.locale,
        },
        select: { id: true, fullName: true, email: true, phone: true, locale: true },
      });
      await tx.customer.update({
        where: { id: ctx.customerId },
        data: {
          fullName: dto.fullName,
          email: dto.email?.toLowerCase(),
        },
      });
      return user;
    });
    await this.audit.log({
      tenantId: ctx.tenantId, userId, action: 'customer.profile_update',
      entity: 'customer', entityId: ctx.customerId, after: { fullName: dto.fullName }, ip: actor.ip,
    });
    return { ...updated, customerId: ctx.customerId };
  }

  async addresses(ctx: CustomerContext) {
    return this.prisma.customerAddress.findMany({
      where: { customerId: ctx.customerId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async addAddress(ctx: CustomerContext, dto: CreateCustomerAddressBodyDto, actor: { userId: string; ip?: string }) {
    const address = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.customerAddress.updateMany({
          where: { customerId: ctx.customerId },
          data: { isDefault: false },
        });
      }
      const count = await tx.customerAddress.count({ where: { customerId: ctx.customerId } });
      return tx.customerAddress.create({
        data: {
          tenantId: ctx.tenantId,
          customerId: ctx.customerId,
          label: dto.label ?? 'home',
          address: dto.address,
          latitude: dto.latitude,
          longitude: dto.longitude,
          details: dto.details,
          isDefault: dto.isDefault ?? count === 0,
        },
      });
    });
    await this.audit.log({
      tenantId: ctx.tenantId, userId: actor.userId, action: 'customer.address_create',
      entity: 'customer_address', entityId: address.id, ip: actor.ip,
    });
    return address;
  }

  async updateAddress(ctx: CustomerContext, id: string, dto: UpdateCustomerAddressBodyDto, actor: { userId: string; ip?: string }) {
    const existing = await this.prisma.customerAddress.findFirst({
      where: { id, customerId: ctx.customerId },
    });
    if (!existing) throw Errors.notFound('address');
    const address = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.customerAddress.updateMany({
          where: { customerId: ctx.customerId, NOT: { id } },
          data: { isDefault: false },
        });
      }
      return tx.customerAddress.update({
        where: { id },
        data: {
          label: dto.label,
          address: dto.address,
          latitude: dto.latitude,
          longitude: dto.longitude,
          details: dto.details,
          isDefault: dto.isDefault,
        },
      });
    });
    await this.audit.log({
      tenantId: ctx.tenantId, userId: actor.userId, action: 'customer.address_update',
      entity: 'customer_address', entityId: id, before: existing, after: address, ip: actor.ip,
    });
    return address;
  }

  async deleteAddress(ctx: CustomerContext, id: string, actor: { userId: string; ip?: string }) {
    const existing = await this.prisma.customerAddress.findFirst({
      where: { id, customerId: ctx.customerId },
    });
    if (!existing) throw Errors.notFound('address');
    await this.prisma.customerAddress.delete({ where: { id } });
    await this.audit.log({
      tenantId: ctx.tenantId, userId: actor.userId, action: 'customer.address_delete',
      entity: 'customer_address', entityId: id, before: existing, ip: actor.ip,
    });
    return { deleted: true };
  }

  async notifications(ctx: CustomerContext, userId: string, q: PaginationQueryDto) {
    const where: any = {
      tenantId: ctx.tenantId,
      OR: [{ customerId: ctx.customerId }, { userId }],
    };
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

  async markNotificationRead(ctx: CustomerContext, userId: string, id: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        id,
        tenantId: ctx.tenantId,
        OR: [{ customerId: ctx.customerId }, { userId }],
      },
      data: { status: 'read', readAt: new Date() },
    });
    if (result.count === 0) throw Errors.notFound('notification');
    return { read: true };
  }
}
