import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { Errors } from '../../common/errors/app-error';

export interface ProvisionAccountInput {
  tenantId: string;
  fullName: string;
  /** At least one of email / phone / username is required. */
  email?: string | null;
  phone?: string | null;
  username?: string | null;
  password: string;
  roleSlug: string;
  /** A pending self-registration keeps the login `invited` until approval. */
  status?: 'active' | 'invited';
  tx?: PrismaAccountClient;
}

/** Minimal Prisma surface shared by PrismaService and a transaction client. */
export type PrismaAccountClient = {
  user: any;
  role: any;
  userRole: any;
};

/**
 * Creates the login `User` (and its role link) for drivers and merchants.
 *
 * Centralised so the admin "Add driver/merchant" flows and the public
 * self-registration flows hash passwords and enforce uniqueness identically.
 * Passwords are always bcrypt-hashed here; the plaintext never leaves this
 * method.
 */
@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async provision(input: ProvisionAccountInput) {
    const db: PrismaAccountClient = input.tx ?? this.prisma;
    const email = input.email?.toLowerCase() ?? null;
    const username = input.username ?? null;

    const conflict = await db.user.findFirst({
      where: {
        tenantId: input.tenantId,
        OR: [
          email ? { email } : undefined,
          input.phone ? { phone: input.phone } : undefined,
          username ? { username } : undefined,
        ].filter(Boolean),
      },
      select: { id: true },
    });
    if (conflict) {
      throw Errors.conflict('ACCOUNT_EXISTS', 'An account with this email, phone or username already exists');
    }

    const role = await db.role.findFirst({
      where: { slug: input.roleSlug, OR: [{ tenantId: input.tenantId }, { tenantId: null }] },
      select: { id: true },
    });
    if (!role) throw Errors.conflict('ROLE_MISSING', `Role "${input.roleSlug}" is not configured`);

    const passwordHash = await bcrypt.hash(input.password, this.config.get<number>('security.bcryptRounds')!);
    const user = await db.user.create({
      data: {
        tenantId: input.tenantId,
        fullName: input.fullName,
        email,
        phone: input.phone ?? null,
        username,
        passwordHash,
        status: input.status ?? 'active',
      },
      select: { id: true, fullName: true, email: true, phone: true, username: true, status: true },
    });
    await db.userRole.create({ data: { userId: user.id, roleId: role.id } });
    return user;
  }
}
