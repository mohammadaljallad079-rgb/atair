import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthUser } from '../decorators/current-user.decorator';
import { Errors } from '../errors/app-error';

/**
 * Driver-boundary guard.
 *
 * A "driver-only" principal is a user whose entire authorization comes from the
 * `driver` role — i.e. a courier using the Driver App, not platform/tenant
 * staff. Such a principal must never reach the tenant-wide Admin/API surface,
 * which is scoped only by `tenantId` and would expose every other driver's and
 * customer's data. Confining driver-only principals to `/api/v1/driver/*` (plus
 * auth and health) turns that leak into a hard 403 — the counterpart of
 * MerchantBoundaryGuard / CustomerBoundaryGuard.
 */
const DRIVER_ONLY_ROLES = new Set(['driver']);

const ALLOWED_PREFIXES = ['/api/v1/driver', '/api/v1/auth', '/api/v1/health'];

@Injectable()
export class DriverBoundaryGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user: AuthUser | undefined = req.user;
    if (!user || user.isPlatformAdmin) return true;

    const isDriverOnly = user.roles.length > 0 && user.roles.every((r) => DRIVER_ONLY_ROLES.has(r));
    if (!isDriverOnly) return true;

    const path: string = req.originalUrl || req.url || '';
    const clean = path.split('?')[0];
    if (ALLOWED_PREFIXES.some((p) => clean === p || clean.startsWith(`${p}/`))) {
      return true;
    }
    throw Errors.forbidden('Driver accounts may only access the driver app endpoints');
  }
}
