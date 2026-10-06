import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { Errors } from '../../common/errors/app-error';
import { JwtPayload } from './strategies/jwt.strategy';

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** Resolves roles + permissions for a user from the database (source of truth). */
  async resolveAuthorization(userId: string) {
    const [userRoles, merchantLinks] = await Promise.all([
      this.prisma.userRole.findMany({
        where: { userId },
        include: {
          role: {
            include: { rolePermissions: { include: { permission: true } } },
          },
        },
      }),
      this.prisma.merchantUser.findMany({
        where: { userId, merchant: { status: { not: 'suspended' } } },
        select: { merchantId: true, role: true, branchId: true },
      }),
    ]);

    const roles = userRoles.map((ur) => ur.role.slug);
    const permissions = Array.from(
      new Set(
        userRoles.flatMap((ur) => ur.role.rolePermissions.map((rp) => rp.permission.code)),
      ),
    );
    const isPlatformAdmin = roles.includes('platform_admin');
    const merchantIds = merchantLinks.map((m) => m.merchantId);
    return { roles, permissions, isPlatformAdmin, merchantIds };
  }

  /**
   * Full principal for the client. The access token only carries identifiers and
   * authorization, so the display fields are loaded fresh from the database
   * (same shape as the login response).
   */
  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });
    if (!user) throw Errors.unauthorized('User no longer exists');
    const auth = await this.resolveAuthorization(user.id);
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      tenantId: user.tenantId,
      tenantSlug: user.tenant.slug,
      roles: auth.roles,
      permissions: auth.permissions,
      merchantIds: auth.merchantIds,
    };
  }

  async login(identifier: string, password: string, meta: RequestMeta, tenantSlug?: string) {
    const isEmail = identifier.includes('@');

    const candidates = await this.prisma.user.findMany({
      where: {
        OR: [{ email: isEmail ? identifier.toLowerCase() : undefined }, { phone: isEmail ? undefined : identifier }],
        ...(tenantSlug ? { tenant: { slug: tenantSlug } } : {}),
      },
      include: { tenant: true },
    });

    // Uniform failure to avoid user enumeration.
    if (candidates.length === 0) {
      await this.safeAudit(null, 'auth.login_failed', 'unknown identifier', meta);
      await this.safeSecurityEvent(null, 'auth.login_failed', 'warning', { reason: 'unknown_identifier', identifier }, meta);
      throw Errors.invalidCredentials();
    }
    if (candidates.length > 1 && !tenantSlug) {
      throw Errors.conflict('TENANT_REQUIRED', 'Multiple accounts match; specify tenantSlug');
    }

    const user = candidates[0];

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.safeSecurityEvent(user.tenantId, 'auth.login_locked', 'warning', { reason: 'account_locked', lockedUntil: user.lockedUntil }, meta, user.id);
      throw Errors.accountLocked();
    }
    if (user.status === 'suspended' || user.status === 'locked') {
      throw Errors.accountSuspended();
    }
    if (user.tenant.status === 'suspended' || user.tenant.status === 'cancelled') {
      throw Errors.accountSuspended();
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      const max = this.config.get<number>('security.maxFailedLogins')!;
      const attempts = user.failedLoginAttempts + 1;
      const lockUntil =
        attempts >= max
          ? new Date(Date.now() + this.config.get<number>('security.lockoutMinutes')! * 60_000)
          : null;
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: attempts, lockedUntil: lockUntil },
      });
      await this.safeAudit(user.tenantId, 'auth.login_failed', `user:${user.id}`, meta, user.id);
      await this.safeSecurityEvent(
        user.tenantId,
        lockUntil ? 'auth.login_lockout' : 'auth.login_failed',
        lockUntil ? 'high' : 'warning',
        { reason: lockUntil ? 'lockout_threshold_reached' : 'bad_password', attempts },
        meta,
        user.id,
      );
      if (lockUntil) throw Errors.accountLocked();
      throw Errors.invalidCredentials();
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    const auth = await this.resolveAuthorization(user.id);
    const tokens = await this.issueTokens(user.id, user.tenantId, auth, meta);

    await this.safeAudit(user.tenantId, 'auth.login', `user:${user.id}`, meta, user.id);
    await this.safeSecurityEvent(user.tenantId, 'auth.login_success', 'info', { method: 'password' }, meta, user.id);

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        tenantId: user.tenantId,
        tenantSlug: user.tenant.slug,
        roles: auth.roles,
        permissions: auth.permissions,
        merchantIds: auth.merchantIds,
      },
      ...tokens,
    };
  }

  async issueTokens(
    userId: string,
    tenantId: string,
    auth: { roles: string[]; permissions: string[]; isPlatformAdmin: boolean; merchantIds?: string[] },
    meta: RequestMeta,
  ): Promise<IssuedTokens> {
    const refreshTtlSeconds = this.ttlSeconds(this.config.get<string>('jwt.refreshTtl')!);
    const refreshToken = randomBytes(48).toString('hex');
    const refreshTokenHash = this.hashToken(refreshToken);

    const session = await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash,
        ip: meta.ip,
        userAgent: meta.userAgent,
        expiresAt: new Date(Date.now() + refreshTtlSeconds * 1000),
      },
    });

    const payload: JwtPayload = {
      sub: userId,
      tenantId,
      sid: session.id,
      roles: auth.roles,
      permissions: auth.permissions,
      isPlatformAdmin: auth.isPlatformAdmin,
      merchantIds: auth.merchantIds ?? [],
    };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('jwt.accessSecret')!,
      expiresIn: this.config.get<string>('jwt.accessTtl')!,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.ttlSeconds(this.config.get<string>('jwt.accessTtl')!),
    };
  }

  async refresh(refreshToken: string, meta: RequestMeta) {
    const hash = this.hashToken(refreshToken);
    const session = await this.prisma.session.findFirst({
      where: { refreshTokenHash: hash },
      include: { user: { include: { tenant: true } } },
    });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw Errors.unauthorized('Invalid or expired refresh token');
    }
    if (session.user.status === 'suspended' || session.user.status === 'locked') {
      throw Errors.accountSuspended();
    }

    // Rotate: revoke the presented refresh token, issue a fresh session.
    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    const auth = await this.resolveAuthorization(session.userId);
    const tokens = await this.issueTokens(session.userId, session.user.tenantId, auth, meta);
    return { ...tokens, userId: session.userId };
  }

  async logout(sessionId: string, userId: string, tenantId: string) {
    await this.prisma.session.updateMany({
      where: { id: sessionId, userId },
      data: { revokedAt: new Date() },
    });
    await this.safeAudit(tenantId, 'auth.logout', `user:${userId}`, {}, userId);
    return { loggedOut: true };
  }

  async revokeAllSessions(userId: string, tenantId: string) {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.safeAudit(tenantId, 'auth.sessions_revoked', `user:${userId}`, {}, userId);
    return { revoked: true };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw Errors.invalidCredentials();
    const passwordHash = await bcrypt.hash(newPassword, this.config.get<number>('security.bcryptRounds')!);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await this.revokeAllSessions(userId, user.tenantId);
    return { changed: true };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findFirst({ where: { email: email.toLowerCase() } });
    // Always return success to prevent account enumeration.
    if (!user) return { sent: true };

    const token = randomBytes(32).toString('hex');
    await this.prisma.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(token),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    // In production this token is delivered by the Notification service only.
    if (this.config.get<string>('nodeEnv') !== 'production') {
      this.logger.debug(`Password reset token for ${email}: ${token}`);
    }
    await this.safeAudit(user.tenantId, 'auth.password_reset_requested', `user:${user.id}`, {});
    return { sent: true };
  }

  async resetPassword(token: string, newPassword: string) {
    const hash = this.hashToken(token);
    const record = await this.prisma.passwordReset.findUnique({ where: { tokenHash: hash } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw Errors.validation('Invalid or expired reset token');
    }
    const passwordHash = await bcrypt.hash(newPassword, this.config.get<number>('security.bcryptRounds')!);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      this.prisma.passwordReset.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      this.prisma.session.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    return { reset: true };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private ttlSeconds(ttl: string): number {
    const m = /^(\d+)([smhd])$/.exec(ttl);
    if (!m) return parseInt(ttl, 10) || 900;
    const n = parseInt(m[1], 10);
    const unit = { s: 1, m: 60, h: 3600, d: 86400 }[m[2] as 's' | 'm' | 'h' | 'd'];
    return n * unit;
  }

  private async safeAudit(
    tenantId: string | null,
    action: string,
    entity: string,
    meta: RequestMeta,
    userId?: string,
  ) {
    try {
      await this.prisma.activityLog.create({
        data: {
          tenantId,
          userId: userId ?? null,
          action,
          entity,
          ip: meta.ip,
          userAgent: meta.userAgent,
        },
      });
    } catch {
      /* audit must never break auth */
    }
  }

  private async safeSecurityEvent(
    tenantId: string | null,
    type: string,
    severity: 'info' | 'warning' | 'high' | 'critical',
    details: Record<string, unknown>,
    meta: RequestMeta,
    userId?: string,
  ) {
    try {
      await this.prisma.securityEvent.create({
        data: {
          tenantId,
          userId: userId ?? null,
          type,
          severity,
          details: details as any,
          ip: meta.ip,
          userAgent: meta.userAgent,
        },
      });
    } catch {
      /* security logging must never break auth */
    }
  }
}
