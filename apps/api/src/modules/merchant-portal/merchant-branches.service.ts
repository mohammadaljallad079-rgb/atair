import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Errors } from '../../common/errors/app-error';
import { AuditService } from '../audit/audit.service';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { MerchantContext } from './merchant-context.service';
import { CreateMerchantBranchDto } from './dto/merchant-portal.dto';

@Injectable()
export class MerchantBranchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(ctx: MerchantContext, q: PaginationQueryDto & { status?: string }) {
    const where: any = { merchantId: ctx.merchantId };
    if (q.status) where.status = q.status;
    if (q.search) where.name = { contains: q.search, mode: 'insensitive' };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.merchantBranch.findMany({
        where,
        include: { _count: { select: { orders: true } } },
        orderBy: { createdAt: 'desc' },
        skip: q.skip,
        take: q.take,
      }),
      this.prisma.merchantBranch.count({ where }),
    ]);
    return { items, total };
  }

  async get(ctx: MerchantContext, id: string) {
    const branch = await this.prisma.merchantBranch.findFirst({
      where: { id, merchantId: ctx.merchantId },
      include: { _count: { select: { orders: true } } },
    });
    if (!branch) throw Errors.notFound('branch');
    return branch;
  }

  async create(ctx: MerchantContext, dto: CreateMerchantBranchDto, actor: { userId: string; ip?: string }) {
    const tenant = await this.prisma.merchant.findUnique({
      where: { id: ctx.merchantId },
      select: { tenantId: true },
    });
    if (!tenant) throw Errors.notFound('merchant');
    const branch = await this.prisma.merchantBranch.create({
      data: {
        tenantId: tenant.tenantId,
        merchantId: ctx.merchantId,
        name: dto.name,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        phone: dto.phone,
        status: (dto.status as any) ?? 'active',
      },
    });
    await this.audit.log({
      tenantId: tenant.tenantId, userId: actor.userId, action: 'merchant.branch_create',
      entity: 'merchant_branch', entityId: branch.id, after: branch, ip: actor.ip,
    });
    return branch;
  }

  async update(ctx: MerchantContext, id: string, dto: Partial<CreateMerchantBranchDto>, actor: { userId: string; ip?: string }) {
    const before = await this.prisma.merchantBranch.findFirst({ where: { id, merchantId: ctx.merchantId } });
    if (!before) throw Errors.notFound('branch');
    const branch = await this.prisma.merchantBranch.update({
      where: { id },
      data: {
        name: dto.name,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        phone: dto.phone,
        status: dto.status as any,
      },
    });
    await this.audit.log({
      tenantId: before.tenantId, userId: actor.userId, action: 'merchant.branch_update',
      entity: 'merchant_branch', entityId: id, before, after: branch, ip: actor.ip,
    });
    return branch;
  }
}
