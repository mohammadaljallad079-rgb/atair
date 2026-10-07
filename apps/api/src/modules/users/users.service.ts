import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { Errors } from '../../common/errors/app-error';
import { AuditService } from '../audit/audit.service';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export interface CreateUserDto {
  fullName: string;
  email?: string;
  phone?: string;
  password: string;
  roleSlugs: string[];
  branchId?: string;
}

export interface UpdateUserDto {
  fullName?: string;
  email?: string;
  phone?: string;
  status?: 'active' | 'invited' | 'suspended' | 'locked';
  roleSlugs?: string[];
}

/** The acting principal, used to prevent privilege escalation. */
export interface ActorContext {
  userId: string;
  ip?: string;
  permissions: string[];
  isPlatformAdmin: boolean;
}

export interface UpsertRoleDto {
  name: string;
  slug?: string;
  description?: string;
  permissions: string[];
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  async list(tenantId: string, q: PaginationQueryDto) {
    const where = {
      tenantId,
      ...(q.search
        ? {
            OR: [
              { fullName: { contains: q.search, mode: 'insensitive' as const } },
              { email: { contains: q.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: {
          id: true, fullName: true, email: true, phone: true, status: true,
          lastLoginAt: true, createdAt: true,
          userRoles: { include: { role: { select: { slug: true, name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: q.skip,
        take: q.take,
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      items: items.map((u) => ({ ...u, roles: u.userRoles.map((ur) => ur.role.slug) })),
      total,
    };
  }

  async get(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      select: {
        id: true, fullName: true, email: true, phone: true, status: true,
        userRoles: { include: { role: { select: { slug: true, name: true } } } },
      },
    });
    if (!user) throw Errors.notFound('user');
    return user;
  }

  async create(tenantId: string, dto: CreateUserDto, actor: ActorContext) {
    const roles = await this.resolveRoles(tenantId, dto.roleSlugs);
    await this.assertCanGrant(tenantId, dto.roleSlugs, actor);
    const passwordHash = await bcrypt.hash(dto.password, this.config.get<number>('security.bcryptRounds')!);
    const user = await this.prisma.user.create({
      data: {
        tenantId,
        fullName: dto.fullName,
        email: dto.email?.toLowerCase(),
        phone: dto.phone,
        passwordHash,
        branchId: dto.branchId,
        userRoles: { create: roles.map((r) => ({ roleId: r.id })) },
      },
      select: { id: true, fullName: true, email: true, phone: true, status: true },
    });
    await this.audit.log({ tenantId, userId: actor.userId, action: 'user.create', entity: 'user', entityId: user.id, after: { ...user, roles: dto.roleSlugs }, ip: actor.ip });
    return user;
  }

  async update(tenantId: string, id: string, dto: UpdateUserDto, actor: ActorContext) {
    const before = await this.get(tenantId, id);
    if (dto.roleSlugs) await this.assertCanGrant(tenantId, dto.roleSlugs, actor);
    const roles = dto.roleSlugs ? await this.resolveRoles(tenantId, dto.roleSlugs) : null;

    const user = await this.prisma.$transaction(async (tx) => {
      if (roles) {
        await tx.userRole.deleteMany({ where: { userId: id } });
        await tx.userRole.createMany({ data: roles.map((r) => ({ userId: id, roleId: r.id })) });
      }
      if (dto.status === 'suspended' || dto.status === 'locked') {
        await tx.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
      }
      return tx.user.update({
        where: { id },
        data: {
          fullName: dto.fullName,
          email: dto.email?.toLowerCase(),
          phone: dto.phone,
          status: dto.status as any,
        },
        select: { id: true, fullName: true, email: true, phone: true, status: true },
      });
    });

    await this.audit.log({ tenantId, userId: actor.userId, action: 'user.update', entity: 'user', entityId: id, before, after: { ...user, roles: dto.roleSlugs }, ip: actor.ip });
    return user;
  }

  /**
   * Administrative password reset. Returns a generated temporary password once
   * (never persisted in clear) and revokes all of the user's active sessions so
   * the reset takes effect immediately.
   */
  async resetPassword(tenantId: string, id: string, actor: ActorContext) {
    const target = await this.prisma.user.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!target) throw Errors.notFound('user');
    const tempPassword = `Ata${randomBytes(6).toString('base64url')}`;
    const passwordHash = await bcrypt.hash(tempPassword, this.config.get<number>('security.bcryptRounds')!);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id }, data: { passwordHash } }),
      this.prisma.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    await this.audit.log({
      tenantId, userId: actor.userId, action: 'user.password_reset', entity: 'user', entityId: id,
      after: { sessionsRevoked: true }, ip: actor.ip,
    });
    return { temporaryPassword: tempPassword };
  }

  /** Revokes every active session for a user without changing the password. */
  async revokeSessions(tenantId: string, id: string, actor: ActorContext) {
    const target = await this.prisma.user.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!target) throw Errors.notFound('user');
    const result = await this.prisma.session.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit.log({
      tenantId, userId: actor.userId, action: 'user.sessions_revoke', entity: 'user', entityId: id,
      after: { revoked: result.count }, ip: actor.ip,
    });
    return { revoked: result.count };
  }

  /**
   * Rejects role grants that exceed the actor's own authority. A platform admin
   * may grant anything; everyone else may only grant roles whose permissions are
   * a subset of their own, so no one can escalate themselves or others.
   */
  private async assertCanGrant(tenantId: string, slugs: string[], actor: ActorContext) {
    if (actor.isPlatformAdmin) return;
    const roles = await this.prisma.role.findMany({
      where: { slug: { in: slugs }, OR: [{ tenantId }, { tenantId: null }] },
      include: { rolePermissions: { include: { permission: { select: { code: true } } } } },
    });
    const actorPermissions = new Set(actor.permissions);
    for (const role of roles) {
      for (const rp of role.rolePermissions) {
        if (!actorPermissions.has(rp.permission.code)) {
          throw Errors.forbidden(`You cannot grant the "${role.slug}" role: it exceeds your own permissions`);
        }
      }
    }
  }

  /** Rejects permission grants that exceed the actor's own authority. */
  private assertCanGrantPermissions(codes: string[], actor: ActorContext) {
    if (actor.isPlatformAdmin) return;
    const actorPermissions = new Set(actor.permissions);
    for (const code of codes) {
      if (!actorPermissions.has(code)) {
        throw Errors.forbidden(`You cannot grant the "${code}" permission: it exceeds your own permissions`);
      }
    }
  }

  async createRole(tenantId: string, dto: UpsertRoleDto, actor: ActorContext) {
    const slug = (dto.slug ?? dto.name).trim().toLowerCase().replace(/\s+/g, '_');
    this.assertCanGrantPermissions(dto.permissions, actor);
    const permissions = await this.resolvePermissions(dto.permissions);
    if (permissions.length !== new Set(dto.permissions).size) {
      throw Errors.validation('One or more permission codes are invalid');
    }
    const existing = await this.prisma.role.findFirst({ where: { tenantId, slug } });
    if (existing) throw Errors.conflict('ROLE_EXISTS', 'A role with this slug already exists');
    const role = await this.prisma.role.create({
      data: {
        tenantId,
        name: dto.name,
        slug,
        description: dto.description,
        rolePermissions: { create: permissions.map((p) => ({ permissionId: p.id })) },
      },
      include: { rolePermissions: { include: { permission: { select: { code: true } } } } },
    });
    await this.audit.log({ tenantId, userId: actor.userId, action: 'role.create', entity: 'role', entityId: role.id, after: { slug, permissions: dto.permissions }, ip: actor.ip });
    return role;
  }

  async updateRole(tenantId: string, id: string, dto: Partial<UpsertRoleDto>, actor: ActorContext) {
    // Tenant-scoped lookup: platform/system roles (tenantId null) are never editable here.
    const role = await this.prisma.role.findFirst({ where: { id, tenantId } });
    if (!role) throw Errors.notFound('role');
    if (role.isSystem) throw Errors.conflict('ROLE_SYSTEM', 'System roles cannot be modified');
    if (dto.permissions) {
      this.assertCanGrantPermissions(dto.permissions, actor);
      const permissions = await this.resolvePermissions(dto.permissions);
      if (permissions.length !== new Set(dto.permissions).size) {
        throw Errors.validation('One or more permission codes are invalid');
      }
      await this.prisma.$transaction([
        this.prisma.rolePermission.deleteMany({ where: { roleId: id } }),
        this.prisma.rolePermission.createMany({ data: permissions.map((p) => ({ roleId: id, permissionId: p.id })) }),
      ]);
    }
    const updated = await this.prisma.role.update({
      where: { id },
      data: { name: dto.name, description: dto.description },
      include: { rolePermissions: { include: { permission: { select: { code: true } } } } },
    });
    await this.audit.log({ tenantId, userId: actor.userId, action: 'role.update', entity: 'role', entityId: id, after: { permissions: dto.permissions }, ip: actor.ip });
    return updated;
  }

  async deleteRole(tenantId: string, id: string, actor: ActorContext) {
    const role = await this.prisma.role.findFirst({ where: { id, tenantId } });
    if (!role) throw Errors.notFound('role');
    if (role.isSystem) throw Errors.conflict('ROLE_SYSTEM', 'System roles cannot be deleted');
    const assigned = await this.prisma.userRole.count({ where: { roleId: id } });
    if (assigned > 0) {
      throw Errors.conflict('ROLE_IN_USE', 'Reassign the users holding this role before deleting it');
    }
    await this.prisma.role.delete({ where: { id } });
    await this.audit.log({ tenantId, userId: actor.userId, action: 'role.delete', entity: 'role', entityId: id, before: { slug: role.slug }, ip: actor.ip });
    return { deleted: true };
  }

  private async resolvePermissions(codes: string[]) {
    return this.prisma.permission.findMany({ where: { code: { in: codes } } });
  }

  async listRoles(tenantId: string) {
    return this.prisma.role.findMany({
      where: { OR: [{ tenantId }, { tenantId: null }] },
      include: { rolePermissions: { include: { permission: { select: { code: true } } } } },
      orderBy: { name: 'asc' },
    });
  }

  async listPermissions() {
    return this.prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { code: 'asc' }] });
  }

  private async resolveRoles(tenantId: string, slugs: string[]) {
    const roles = await this.prisma.role.findMany({
      where: { slug: { in: slugs }, OR: [{ tenantId }, { tenantId: null }] },
    });
    if (roles.length !== slugs.length) {
      throw Errors.validation('One or more role slugs are invalid');
    }
    return roles;
  }
}
