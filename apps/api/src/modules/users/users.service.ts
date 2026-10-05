import { Injectable } from '@nestjs/common';
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

  async create(tenantId: string, dto: CreateUserDto, actor: { userId: string; ip?: string }) {
    const roles = await this.resolveRoles(tenantId, dto.roleSlugs);
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

  async update(tenantId: string, id: string, dto: UpdateUserDto, actor: { userId: string; ip?: string }) {
    const before = await this.get(tenantId, id);
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
