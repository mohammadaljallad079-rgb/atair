import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Errors } from '../../common/errors/app-error';
import { AuditService } from '../audit/audit.service';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export interface CreateMerchantDto {
  name: string;
  slug: string;
  category?: string;
  phone?: string;
  email?: string;
  commissionRate?: number;
}

@Injectable()
export class MerchantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(tenantId: string, q: PaginationQueryDto) {
    const where = {
      tenantId,
      ...(q.search ? { name: { contains: q.search, mode: 'insensitive' as const } } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.merchant.findMany({ where, orderBy: { createdAt: 'desc' }, skip: q.skip, take: q.take }),
      this.prisma.merchant.count({ where }),
    ]);
    return { items, total };
  }

  async get(tenantId: string, id: string) {
    const merchant = await this.prisma.merchant.findFirst({
      where: { id, tenantId },
      include: {
        branches: true,
        users: {
          include: { user: { select: { id: true, fullName: true, email: true, phone: true, status: true } } },
        },
      },
    });
    if (!merchant) throw Errors.notFound('merchant');
    const orderCount = await this.prisma.order.count({ where: { tenantId, merchantId: id } });
    return { ...merchant, orderCount };
  }

  async create(tenantId: string, dto: CreateMerchantDto, actor: { userId: string; ip?: string }) {
    const existing = await this.prisma.merchant.findFirst({ where: { tenantId, slug: dto.slug } });
    if (existing) throw Errors.conflict('MERCHANT_EXISTS', 'A merchant with this slug already exists');
    const merchant = await this.prisma.merchant.create({
      data: {
        tenantId,
        name: dto.name,
        slug: dto.slug,
        category: dto.category,
        phone: dto.phone,
        email: dto.email?.toLowerCase(),
        commissionRate: dto.commissionRate,
      },
    });
    await this.audit.log({ tenantId, userId: actor.userId, action: 'merchant.create', entity: 'merchant', entityId: merchant.id, after: merchant, ip: actor.ip });
    return merchant;
  }

  async update(
    tenantId: string,
    id: string,
    dto: Partial<CreateMerchantDto> & { status?: 'active' | 'inactive' | 'suspended' },
    actor: { userId: string; ip?: string },
  ) {
    const before = await this.get(tenantId, id);
    // Explicit field pick instead of spreading the request body into Prisma.
    const merchant = await this.prisma.merchant.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug,
        category: dto.category,
        phone: dto.phone,
        email: dto.email?.toLowerCase(),
        commissionRate: dto.commissionRate,
        status: dto.status,
      },
    });
    await this.audit.log({ tenantId, userId: actor.userId, action: 'merchant.update', entity: 'merchant', entityId: id, before, after: merchant, ip: actor.ip });
    return merchant;
  }

  async addBranch(
    tenantId: string,
    merchantId: string,
    dto: { name: string; address: string; latitude?: number; longitude?: number; phone?: string },
    actor: { userId: string; ip?: string },
  ) {
    await this.get(tenantId, merchantId);
    const branch = await this.prisma.merchantBranch.create({ data: { tenantId, merchantId, ...dto } });
    await this.audit.log({ tenantId, userId: actor.userId, action: 'merchant.branch_create', entity: 'merchant_branch', entityId: branch.id, after: branch, ip: actor.ip });
    return branch;
  }
}
