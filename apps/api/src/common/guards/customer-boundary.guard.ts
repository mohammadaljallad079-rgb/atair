import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthUser } from '../decorators/current-user.decorator';
import { Errors } from '../errors/app-error';

/**
 * Customer-boundary guard.
 *
 * A "customer-only" principal is a user whose entire authorization comes from
 * the `customer` role — i.e. a consumer using the Customer App, not platform
 * or tenant staff.
 *
 * Such a principal must never reach the tenant-wide Admin/API surface, because
 * those endpoints are scoped only by `tenantId` (e.g. GET /orders) and would
 * expose every other customer's orders within the same tenant. Confining
 * customer-only principals to `/api/v1/customer/*` (plus auth and health) turns
 * that accidental cross-customer leak into a hard 403 — the exact counterpart
 * of MerchantBoundaryGuard for merchant principals.
 *
 * Staff (tenant_admin, operations_manager, …) and platform admins are
 * unaffected.
 */
const CUSTOMER_ONLY_ROLES = new Set(['customer']);

const ALLOWED_PREFIXES = ['/api/v1/customer', '/api/v1/auth', '/api/v1/health'];

@Injectable()
export class CustomerBoundaryGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user: AuthUser | undefined = req.user;
    if (!user || user.isPlatformAdmin) return true;

    const isCustomerOnly = user.roles.length > 0 && user.roles.every((r) => CUSTOMER_ONLY_ROLES.has(r));
    if (!isCustomerOnly) return true;

    const path: string = req.originalUrl || req.url || '';
    const clean = path.split('?')[0];
    if (ALLOWED_PREFIXES.some((p) => clean === p || clean.startsWith(`${p}/`))) {
      return true;
    }
    throw Errors.forbidden('Customer accounts may only access the customer app endpoints');
  }
}
