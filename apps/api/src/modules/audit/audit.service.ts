import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditEntry {
  tenantId?: string | null;
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string;
  userAgent?: string;
}

const REDACT_KEYS = new Set([
  'password',
  'passwordHash',
  'newPassword',
  'currentPassword',
  'refreshToken',
  'refreshTokenHash',
  'token',
  'tokenHash',
  'accessToken',
  'apiKey',
  'secret',
]);

function redact(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(redact);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = REDACT_KEYS.has(k) ? '[redacted]' : redact(v);
    }
    return out;
  }
  return value;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /** Persists a sensitive administrative action. Never stores secrets/tokens. */
  async log(entry: AuditEntry) {
    try {
      await this.prisma.activityLog.create({
        data: {
          tenantId: entry.tenantId ?? null,
          userId: entry.userId ?? null,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId ?? null,
          before: entry.before === undefined ? undefined : (redact(entry.before) as any),
          after: entry.after === undefined ? undefined : (redact(entry.after) as any),
          ip: entry.ip,
          userAgent: entry.userAgent,
        },
      });
    } catch {
      /* audit must never break the caller */
    }
  }
}
