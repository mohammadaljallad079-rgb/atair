import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Errors } from '../../common/errors/app-error';
import { AuditService } from '../audit/audit.service';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { MerchantContext } from './merchant-context.service';
import {
  CreateMerchantAddressDto,
  CreateMerchantCustomerDto,
  UpdateMerchantCustomerDto,
} from './dto/merchant-portal.dto';

/**
 * Merchant-scoped customer directory. Customers carry a `merchantId`; every
 * read/write filters on it, so one merchant's directory can never leak into
 * another's.
 */
@Injectable()
export class MerchantCustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(ctx: MerchantContext, q: PaginationQueryDto & { status?: string }) {
    const where: any = { merchantId: ctx.merchantId };
    if (q.status) where.status = q.status;
    if (q.search) {
      where.OR = [
        { fullName: { contains: q.search, mode: 'insensitive' } },
        { phone: { contains: q.search } },
        { email: { contains: q.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        include: { _count: { select: { orders: true } } },
        orderBy: { createdAt: 'desc' },
        skip: q.skip,
        take: q.take,
      }),
      this.prisma.customer.count({ where }),
    ]);
    return { items, total };
  }

  async get(ctx: MerchantContext, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, merchantId: ctx.merchantId },
      include: {
        addresses: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] },
        orders: {
          where: { merchantId: ctx.merchantId },
          select: { id: true, orderNumber: true, status: true, total: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
    if (!customer) throw Errors.notFound('customer');
    return customer;
  }

  async create(ctx: MerchantContext, dto: CreateMerchantCustomerDto, actor: { userId: string; ip?: string }) {
    const tenant = await this.prisma.merchant.findUnique({
      where: { id: ctx.merchantId },
      select: { tenantId: true },
    });
    if (!tenant) throw Errors.notFound('merchant');
    // Phone is unique per (tenant, merchant) in practice; reject duplicates
    // within the same merchant directory.
    const existing = await this.prisma.customer.findFirst({
      where: { merchantId: ctx.merchantId, phone: dto.phone },
    });
    if (existing) throw Errors.conflict('CUSTOMER_EXISTS', 'A customer with this phone already exists');
    const customer = await this.prisma.customer.create({
      data: {
        tenantId: tenant.tenantId,
        merchantId: ctx.merchantId,
        fullName: dto.fullName,
        phone: dto.phone,
        email: dto.email?.toLowerCase(),
        notes: dto.notes,
      },
    });
    await this.audit.log({
      tenantId: tenant.tenantId, userId: actor.userId, action: 'merchant.customer_create',
      entity: 'customer', entityId: customer.id, after: customer, ip: actor.ip,
    });
    return customer;
  }

  async update(ctx: MerchantContext, id: string, dto: UpdateMerchantCustomerDto, actor: { userId: string; ip?: string }) {
    const before = await this.prisma.customer.findFirst({ where: { id, merchantId: ctx.merchantId } });
    if (!before) throw Errors.notFound('customer');
    const customer = await this.prisma.customer.update({
      where: { id },
      data: { fullName: dto.fullName, email: dto.email?.toLowerCase(), notes: dto.notes },
    });
    await this.audit.log({
      tenantId: before.tenantId, userId: actor.userId, action: 'merchant.customer_update',
      entity: 'customer', entityId: id, before, after: customer, ip: actor.ip,
    });
    return customer;
  }

  async addresses(ctx: MerchantContext, customerId: string) {
    await this.get(ctx, customerId);
    return this.prisma.customerAddress.findMany({
      where: { customerId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async addAddress(ctx: MerchantContext, customerId: string, dto: CreateMerchantAddressDto) {
    const customer = await this.get(ctx, customerId);
    return this.prisma.customerAddress.create({
      data: {
        tenantId: customer.tenantId,
        customerId,
        label: dto.label ?? 'home',
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        details: dto.details,
        isDefault: dto.isDefault ?? false,
      },
    });
  }
}
