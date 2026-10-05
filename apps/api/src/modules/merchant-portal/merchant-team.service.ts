import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { Errors } from '../../common/errors/app-error';
import { AuditService } from '../audit/audit.service';
import { MerchantContext } from './merchant-context.service';
import { InviteTeamMemberDto, UpdateTeamMemberDto } from './dto/merchant-portal.dto';

/** Business role → RBAC role slug. Only these may ever be assigned here. */
const ROLE_SLUGS: Record<string, string> = {
  owner: 'merchant_owner',
  manager: 'merchant_manager',
  operator: 'merchant_operator',
  finance: 'merchant_finance',
  viewer: 'merchant_viewer',
};

/** Roles a non-owner manager may grant. Owners may grant anything in the map. */
const MANAGER_GRANTABLE = ['manager', 'operator', 'finance', 'viewer'];

/**
 * Merchant team management. Users are created inside the merchant's tenant and
 * linked via MerchantUser. Privilege escalation is blocked in two ways:
 *  1. only `merchant_*` roles from the allow-list can be assigned (never
 *     platform/tenant-admin roles), and
 *  2. only a merchant owner may grant the `owner` role.
 */
@Injectable()
export class MerchantTeamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  private async tenantOf(ctx: MerchantContext) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: ctx.merchantId },
      select: { tenantId: true },
    });
    if (!merchant) throw Errors.notFound('merchant');
    return merchant.tenantId;
  }

  private assertCanGrant(ctx: MerchantContext, businessRole: string) {
    if (ctx.merchantRole === 'owner') return;
    if (!MANAGER_GRANTABLE.includes(businessRole)) {
      throw Errors.forbidden('Only a merchant owner can grant the owner role');
    }
  }

  async list(ctx: MerchantContext) {
    const links = await this.prisma.merchantUser.findMany({
      where: { merchantId: ctx.merchantId },
      include: {
        user: {
          select: {
            id: true, fullName: true, email: true, phone: true, status: true,
            lastLoginAt: true, createdAt: true,
            userRoles: { include: { role: { select: { slug: true } } } },
          },
        },
        branch: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return links.map((l) => ({
      userId: l.userId,
      fullName: l.user.fullName,
      email: l.user.email,
      phone: l.user.phone,
      status: l.user.status,
      role: l.role,
      branchId: l.branchId,
      branchName: l.branch?.name ?? null,
      lastLoginAt: l.user.lastLoginAt,
      createdAt: l.user.createdAt,
      roles: l.user.userRoles.map((ur) => ur.role.slug),
    }));
  }

  async invite(ctx: MerchantContext, dto: InviteTeamMemberDto, actor: { userId: string; ip?: string }) {
    this.assertCanGrant(ctx, dto.roleSlug);
    if (!dto.email && !dto.phone) {
      throw Errors.validation('An email or phone is required');
    }
    const tenantId = await this.tenantOf(ctx);

    if (dto.branchId) {
      const branch = await this.prisma.merchantBranch.findFirst({
        where: { id: dto.branchId, merchantId: ctx.merchantId },
        select: { id: true },
      });
      if (!branch) throw Errors.notFound('branch');
    }

    const role = await this.prisma.role.findFirst({
      where: { slug: ROLE_SLUGS[dto.roleSlug], OR: [{ tenantId }, { tenantId: null }] },
      select: { id: true },
    });
    if (!role) throw Errors.validation('Role is not configured for this tenant');

    const passwordHash = await bcrypt.hash(dto.password, this.config.get<number>('security.bcryptRounds')!);

    const existing = dto.email
      ? await this.prisma.user.findFirst({ where: { tenantId, email: dto.email.toLowerCase() } })
      : null;

    const user = await this.prisma.$transaction(async (tx) => {
      const created =
        existing ??
        (await tx.user.create({
          data: {
            tenantId,
            fullName: dto.fullName,
            email: dto.email?.toLowerCase(),
            phone: dto.phone,
            passwordHash,
            status: 'active',
          },
          select: { id: true, fullName: true, email: true, phone: true, status: true },
        }));

      await tx.merchantUser.upsert({
        where: { merchantId_userId: { merchantId: ctx.merchantId, userId: created.id } },
        update: { role: dto.roleSlug, branchId: dto.branchId ?? null },
        create: { merchantId: ctx.merchantId, userId: created.id, role: dto.roleSlug, branchId: dto.branchId ?? null },
      });
      await tx.userRole.deleteMany({ where: { userId: created.id } });
      await tx.userRole.create({ data: { userId: created.id, roleId: role.id } });
      return created;
    });

    await this.audit.log({
      tenantId, userId: actor.userId, action: 'merchant.team_invite',
      entity: 'user', entityId: user.id, after: { role: dto.roleSlug, branchId: dto.branchId }, ip: actor.ip,
    });
    return user;
  }

  async update(ctx: MerchantContext, userId: string, dto: UpdateTeamMemberDto, actor: { userId: string; ip?: string }) {
    const link = await this.prisma.merchantUser.findUnique({
      where: { merchantId_userId: { merchantId: ctx.merchantId, userId } },
    });
    if (!link) throw Errors.notFound('team_member');

    const tenantId = await this.tenantOf(ctx);

    if (dto.roleSlug) {
      this.assertCanGrant(ctx, dto.roleSlug);
      // An owner cannot demote the last remaining owner.
      if (link.role === 'owner' && dto.roleSlug !== 'owner') {
        const owners = await this.prisma.merchantUser.count({ where: { merchantId: ctx.merchantId, role: 'owner' } });
        if (owners <= 1) throw Errors.conflict('LAST_OWNER', 'The last owner cannot be demoted');
      }
    }

    if (dto.branchId) {
      const branch = await this.prisma.merchantBranch.findFirst({
        where: { id: dto.branchId, merchantId: ctx.merchantId },
        select: { id: true },
      });
      if (!branch) throw Errors.notFound('branch');
    }

    const role = dto.roleSlug
      ? await this.prisma.role.findFirst({
          where: { slug: ROLE_SLUGS[dto.roleSlug], OR: [{ tenantId }, { tenantId: null }] },
          select: { id: true },
        })
      : null;

    await this.prisma.$transaction(async (tx) => {
      if (dto.roleSlug || dto.branchId !== undefined) {
        await tx.merchantUser.update({
          where: { merchantId_userId: { merchantId: ctx.merchantId, userId } },
          data: { role: dto.roleSlug ?? link.role, branchId: dto.branchId ?? link.branchId },
        });
      }
      if (role) {
        await tx.userRole.deleteMany({ where: { userId } });
        await tx.userRole.create({ data: { userId, roleId: role.id } });
      }
      if (dto.fullName || dto.status) {
        await tx.user.update({
          where: { id: userId },
          data: { fullName: dto.fullName, status: dto.status as any },
        });
      }
      if (dto.status === 'suspended') {
        await tx.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
      }
    });

    await this.audit.log({
      tenantId, userId: actor.userId, action: 'merchant.team_update',
      entity: 'user', entityId: userId, before: { role: link.role }, after: { role: dto.roleSlug, status: dto.status }, ip: actor.ip,
    });
    return { updated: true };
  }
}
