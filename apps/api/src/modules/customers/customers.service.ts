import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Errors } from '../../common/errors/app-error';
import { AuditService } from '../audit/audit.service';
import {
  CreateCustomerAddressDto,
  CreateCustomerDto,
  CustomerQueryDto,
  UpdateCustomerDto,
} from './dto/customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(tenantId: string, q: CustomerQueryDto) {
    const where = {
      tenantId,
      ...(q.status ? { status: q.status as any } : {}),
      ...(q.search
        ? {
            OR: [
              { fullName: { contains: q.search, mode: 'insensitive' as const } },
              { phone: { contains: q.search } },
              { email: { contains: q.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: q.skip,
        take: q.take,
      }),
      this.prisma.customer.count({ where }),
    ]);
    return { items, total };
  }

  async get(tenantId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
      include: { addresses: true, preferences: true },
    });
    if (!customer) throw Errors.notFound('customer');
    const orders = await this.prisma.order.findMany({
      where: { tenantId, customerId: id },
      select: {
        id: true, orderNumber: true, status: true, total: true, currency: true,
        paymentStatus: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { ...customer, orders };
  }

  async create(tenantId: string, dto: CreateCustomerDto, actor: { userId: string; ip?: string }) {
    const existing = await this.prisma.customer.findFirst({
      where: { tenantId, phone: dto.phone },
    });
    if (existing) throw Errors.conflict('CUSTOMER_EXISTS', 'A customer with this phone already exists');

    const customer = await this.prisma.customer.create({
      data: {
        tenantId,
        fullName: dto.fullName,
        phone: dto.phone,
        email: dto.email?.toLowerCase(),
        notes: dto.notes,
      },
    });
    await this.audit.log({
      tenantId,
      userId: actor.userId,
      action: 'customer.create',
      entity: 'customer',
      entityId: customer.id,
      after: customer,
      ip: actor.ip,
    });
    return customer;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateCustomerDto,
    actor: { userId: string; ip?: string },
  ) {
    const before = await this.get(tenantId, id);
    const customer = await this.prisma.customer.update({
      where: { id: before.id },
      data: { ...dto, email: dto.email?.toLowerCase() },
    });
    await this.audit.log({
      tenantId,
      userId: actor.userId,
      action: 'customer.update',
      entity: 'customer',
      entityId: id,
      before,
      after: customer,
      ip: actor.ip,
    });
    return customer;
  }

  async addAddress(tenantId: string, customerId: string, dto: CreateCustomerAddressDto) {
    await this.get(tenantId, customerId);
    return this.prisma.customerAddress.create({
      data: { tenantId, customerId, ...dto },
    });
  }

  async listAddresses(tenantId: string, customerId: string) {
    await this.get(tenantId, customerId);
    return this.prisma.customerAddress.findMany({ where: { tenantId, customerId } });
  }
}
