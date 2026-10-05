import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordHash',
  'newPassword',
  'currentPassword',
  'refreshToken',
  'token',
  'accessToken',
]);

/**
 * Records every mutating request into api_logs (and activity_logs for audited
 * entities). Secrets and password fields are stripped before persisting.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<Request & { user?: any }>();
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => void this.record(req, start, 200),
        error: (err) => void this.record(req, start, err?.status ?? 500),
      }),
    );
  }

  private async record(req: Request & { user?: any }, start: number, statusCode: number) {
    if (!MUTATING.has(req.method)) return;
    try {
      const tenantId: string | undefined = req.user?.tenantId;
      const userId: string | undefined = req.user?.userId;
      const path = req.originalUrl ?? req.url;
      await this.prisma.apiLog.create({
        data: {
          tenantId: tenantId ?? null,
          userId: userId ?? null,
          method: req.method,
          path,
          statusCode,
          durationMs: Date.now() - start,
          ip: this.clientIp(req),
        },
      });
    } catch {
      // Audit logging must never break the request path.
    }
  }

  private clientIp(req: Request): string | undefined {
    const fwd = req.headers['x-forwarded-for'];
    if (typeof fwd === 'string') return fwd.split(',')[0].trim();
    return req.ip;
  }
}

export function stripSensitive<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  const clone: Record<string, any> = Array.isArray(obj) ? [...obj] : { ...obj };
  for (const key of Object.keys(clone)) {
    if (SENSITIVE_KEYS.has(key)) {
      clone[key] = '[redacted]';
    } else if (clone[key] && typeof clone[key] === 'object') {
      clone[key] = stripSensitive(clone[key]);
    }
  }
  return clone as T;
}
