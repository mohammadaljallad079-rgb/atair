import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Errors } from '../../common/errors/app-error';
import { AuditService } from '../audit/audit.service';
import { AccountsService } from '../accounts/accounts.service';
import {
  CreateMerchantDto,
  MerchantDocumentInputDto,
  MerchantQueryDto,
  RejectMerchantDto,
  ReviewDocumentDto,
  UpdateMerchantDto,
} from './dto/merchant.dto';

export interface MerchantActor {
  userId: string;
  ip?: string;
}

/** Turns a display name into a tenant-unique slug. */
function slugify(value: string): string {
  const base = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || `merchant-${Date.now().toString(36)}`;
}

@Injectable()
export class MerchantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly accounts: AccountsService,
  ) {}

  async list(tenantId: string, q: MerchantQueryDto) {
    const where = {
      tenantId,
      ...(q.status ? { status: q.status as any } : {}),
      ...(q.approvalStatus ? { approvalStatus: q.approvalStatus as any } : {}),
      ...(q.search
        ? {
            OR: [
              { name: { contains: q.search, mode: 'insensitive' as const } },
              { phone: { contains: q.search } },
              { email: { contains: q.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
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
        documents: true,
        users: {
          include: { user: { select: { id: true, fullName: true, email: true, phone: true, username: true, status: true } } },
        },
      },
    });
    if (!merchant) throw Errors.notFound('merchant');
    const orderCount = await this.prisma.order.count({ where: { tenantId, merchantId: id } });
    return { ...merchant, orderCount };
  }

  /**
   * Creates a merchant with optional owner login account and documents in a
   * single transaction. The slug is derived from the name and de-duplicated.
   */
  async create(
    tenantId: string,
    dto: CreateMerchantDto,
    actor: MerchantActor,
    opts: { source?: 'admin' | 'website' | 'app'; approvalStatus?: 'pending' | 'approved' } = {},
  ) {
    const slug = await this.uniqueSlug(tenantId, dto.slug ?? slugify(dto.name));
    if (dto.commercialReg) {
      const dup = await this.prisma.merchant.findFirst({ where: { tenantId, commercialReg: dto.commercialReg } });
      if (dup) throw Errors.conflict('MERCHANT_EXISTS', 'A merchant with this commercial registration already exists');
    }
    const approvalStatus = opts.approvalStatus ?? dto.approvalStatus ?? 'pending';
    const source = opts.source ?? 'admin';

    return this.prisma.$transaction(async (tx) => {
      const merchant = await tx.merchant.create({
        data: {
          tenantId,
          name: dto.name,
          slug,
          category: dto.category,
          phone: dto.phone,
          email: dto.email?.toLowerCase(),
          ownerName: dto.ownerName,
          commercialReg: dto.commercialReg,
          vatNumber: dto.vatNumber,
          address: dto.address,
          latitude: dto.latitude,
          longitude: dto.longitude,
          commissionRate: dto.commissionRate,
          approvalStatus,
          approvedAt: approvalStatus === 'approved' ? new Date() : null,
          status: approvalStatus === 'approved' ? 'active' : 'inactive',
          source,
        },
      });

      if (dto.documents?.length) {
        await tx.merchantDocument.createMany({
          data: dto.documents.map((doc) => this.toDocumentRow(tenantId, merchant.id, doc)),
        });
      }

      if (dto.account?.password) {
        const account = await this.accounts.provision({
          tenantId,
          fullName: dto.ownerName ?? dto.name,
          email: dto.account.email ?? dto.email,
          phone: dto.phone,
          username: dto.account.username,
          password: dto.account.password,
          roleSlug: 'merchant_owner',
          status: approvalStatus === 'approved' ? 'active' : 'invited',
          tx,
        });
        await tx.merchantUser.create({ data: { merchantId: merchant.id, userId: account.id, role: 'owner' } });
      }

      await this.audit.log({
        tenantId, userId: actor.userId, action: 'merchant.create', entity: 'merchant', entityId: merchant.id,
        after: { ...merchant, source }, ip: actor.ip,
      });
      return merchant;
    });
  }

  private toDocumentRow(tenantId: string, merchantId: string, doc: MerchantDocumentInputDto) {
    return {
      tenantId,
      merchantId,
      type: doc.type as any,
      fileUrl: doc.fileUrl,
      fileKey: doc.fileKey,
      number: doc.number,
      expiresAt: doc.expiresAt ? new Date(doc.expiresAt) : null,
    };
  }

  private async uniqueSlug(tenantId: string, base: string): Promise<string> {
    let candidate = base;
    let n = 1;
    // Bounded loop: collisions beyond a handful are not realistic for one tenant.
    while (n < 50) {
      const existing = await this.prisma.merchant.findFirst({ where: { tenantId, slug: candidate }, select: { id: true } });
      if (!existing) return candidate;
      candidate = `${base}-${n++}`;
    }
    return `${base}-${Date.now().toString(36)}`;
  }

  async update(tenantId: string, id: string, dto: UpdateMerchantDto, actor: MerchantActor) {
    const before = await this.get(tenantId, id);
    // Explicit field pick instead of spreading the request body into Prisma.
    const merchant = await this.prisma.merchant.update({
      where: { id },
      data: {
        name: dto.name,
        category: dto.category,
        phone: dto.phone,
        email: dto.email?.toLowerCase(),
        ownerName: dto.ownerName,
        commercialReg: dto.commercialReg,
        vatNumber: dto.vatNumber,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        commissionRate: dto.commissionRate,
        status: dto.status,
      },
    });
    await this.audit.log({ tenantId, userId: actor.userId, action: 'merchant.update', entity: 'merchant', entityId: id, before, after: merchant, ip: actor.ip });
    return merchant;
  }

  /** Approves a merchant and activates any linked owner logins. */
  async approve(tenantId: string, id: string, actor: MerchantActor) {
    const merchant = await this.prisma.merchant.findFirst({ where: { id, tenantId } });
    if (!merchant) throw Errors.notFound('merchant');
    if (merchant.approvalStatus === 'approved') {
      throw Errors.conflict('MERCHANT_ALREADY_APPROVED', 'Merchant is already approved');
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.merchant.update({
        where: { id },
        data: {
          approvalStatus: 'approved',
          status: 'active',
          approvedAt: new Date(),
          reviewedAt: new Date(),
          reviewedByUserId: actor.userId,
          rejectionReason: null,
        },
      });
      const links = await tx.merchantUser.findMany({ where: { merchantId: id }, select: { userId: true } });
      if (links.length) {
        await tx.user.updateMany({ where: { id: { in: links.map((l) => l.userId) } }, data: { status: 'active' } });
      }
      return result;
    });
    await this.audit.log({
      tenantId, userId: actor.userId, action: 'merchant.approve', entity: 'merchant', entityId: id,
      before: { approvalStatus: merchant.approvalStatus }, after: { approvalStatus: 'approved' }, ip: actor.ip,
    });
    return updated;
  }

  /** Rejects a merchant; linked logins are suspended and sessions revoked. */
  async reject(tenantId: string, id: string, dto: RejectMerchantDto, actor: MerchantActor) {
    const merchant = await this.prisma.merchant.findFirst({ where: { id, tenantId } });
    if (!merchant) throw Errors.notFound('merchant');
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.merchant.update({
        where: { id },
        data: {
          approvalStatus: 'rejected',
          status: 'inactive',
          reviewedAt: new Date(),
          reviewedByUserId: actor.userId,
          rejectionReason: dto.reason ?? null,
        },
      });
      const links = await tx.merchantUser.findMany({ where: { merchantId: id }, select: { userId: true } });
      if (links.length) {
        const ids = links.map((l) => l.userId);
        await tx.user.updateMany({ where: { id: { in: ids } }, data: { status: 'suspended' } });
        await tx.session.updateMany({ where: { userId: { in: ids }, revokedAt: null }, data: { revokedAt: new Date() } });
      }
      return result;
    });
    await this.audit.log({
      tenantId, userId: actor.userId, action: 'merchant.reject', entity: 'merchant', entityId: id,
      before: { approvalStatus: merchant.approvalStatus }, after: { approvalStatus: 'rejected', reason: dto.reason }, ip: actor.ip,
    });
    return updated;
  }

  /** Suspends a merchant (and its logins); reversible via reactivate. */
  async suspend(tenantId: string, id: string, reason: string | undefined, actor: MerchantActor) {
    const merchant = await this.prisma.merchant.findFirst({ where: { id, tenantId } });
    if (!merchant) throw Errors.notFound('merchant');
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.merchant.update({
        where: { id },
        data: {
          status: 'suspended',
          approvalStatus: 'suspended',
          rejectionReason: reason ?? merchant.rejectionReason,
          reviewedAt: new Date(),
          reviewedByUserId: actor.userId,
        },
      });
      const links = await tx.merchantUser.findMany({ where: { merchantId: id }, select: { userId: true } });
      if (links.length) {
        const ids = links.map((l) => l.userId);
        await tx.user.updateMany({ where: { id: { in: ids } }, data: { status: 'suspended' } });
        await tx.session.updateMany({ where: { userId: { in: ids }, revokedAt: null }, data: { revokedAt: new Date() } });
      }
      return result;
    });
    await this.audit.log({
      tenantId, userId: actor.userId, action: 'merchant.suspend', entity: 'merchant', entityId: id,
      before: { status: merchant.status }, after: { status: 'suspended', reason }, ip: actor.ip,
    });
    return updated;
  }

  /** Reactivates a suspended/rejected merchant back to approved+active. */
  async reactivate(tenantId: string, id: string, actor: MerchantActor) {
    const merchant = await this.prisma.merchant.findFirst({ where: { id, tenantId } });
    if (!merchant) throw Errors.notFound('merchant');
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.merchant.update({
        where: { id },
        data: { status: 'active', approvalStatus: 'approved', approvedAt: new Date(), reviewedAt: new Date(), reviewedByUserId: actor.userId },
      });
      const links = await tx.merchantUser.findMany({ where: { merchantId: id }, select: { userId: true } });
      if (links.length) {
        await tx.user.updateMany({ where: { id: { in: links.map((l) => l.userId) } }, data: { status: 'active' } });
      }
      return result;
    });
    await this.audit.log({
      tenantId, userId: actor.userId, action: 'merchant.reactivate', entity: 'merchant', entityId: id,
      before: { status: merchant.status }, after: { status: 'active' }, ip: actor.ip,
    });
    return updated;
  }

  async reviewDocument(
    tenantId: string,
    merchantId: string,
    documentId: string,
    dto: ReviewDocumentDto,
    actor: MerchantActor,
  ) {
    const doc = await this.prisma.merchantDocument.findFirst({ where: { id: documentId, merchantId, tenantId } });
    if (!doc) throw Errors.notFound('merchant_document');
    const updated = await this.prisma.merchantDocument.update({
      where: { id: documentId },
      data: { status: dto.status, rejectReason: dto.rejectReason, reviewedBy: actor.userId, reviewedAt: new Date() },
    });
    await this.audit.log({
      tenantId, userId: actor.userId, action: 'merchant.document_review', entity: 'merchant_document',
      entityId: documentId, before: { status: doc.status }, after: { status: dto.status }, ip: actor.ip,
    });
    return updated;
  }

  async addBranch(
    tenantId: string,
    merchantId: string,
    dto: { name: string; address: string; latitude?: number; longitude?: number; phone?: string },
    actor: MerchantActor,
  ) {
    await this.get(tenantId, merchantId);
    const branch = await this.prisma.merchantBranch.create({ data: { tenantId, merchantId, ...dto } });
    await this.audit.log({ tenantId, userId: actor.userId, action: 'merchant.branch_create', entity: 'merchant_branch', entityId: branch.id, after: branch, ip: actor.ip });
    return branch;
  }
}
