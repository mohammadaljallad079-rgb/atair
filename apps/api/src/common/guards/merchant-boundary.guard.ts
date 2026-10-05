import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthUser } from '../decorators/current-user.decorator';
import { Errors } from '../errors/app-error';

/**
 * Merchant-boundary guard.
 *
 * A "merchant-only" principal is a user whose entire authorization comes from
 * merchant membership (MerchantUser links) and the merchant_* roles — i.e. a
 * business employee using the Merchant Portal, not platform/tenant staff.
 *
 * Such a principal must never reach the tenant-wide Admin/API surface, because
 * those endpoints are scoped only by `tenantId` and would expose every other
 * merchant's orders, customers, payments and reports within the same tenant.
 * Restricting merchant-only principals to `/api/v1/merchant/*` (plus auth and
 * health) turns that accidental cross-merchant leak into a hard 403.
 *
 * Staff (tenant_admin, operations_manager, …) and platform admins are
 * unaffected: they may use both the Admin API and the merchant portal.
 */
const MERCHANT_ONLY_ROLES = new Set([
  'merchant_owner',
  'merchant_manager',
  'merchant_operator',
  'merchant_finance',
  'merchant_viewer',
  'merchant_admin',
]);

const ALLOWED_PREFIXES = ['/api/v1/merchant', '/api/v1/auth', '/api/v1/health'];

@Injectable()
export class MerchantBoundaryGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user: AuthUser | undefined = req.user;
    if (!user || user.isPlatformAdmin) return true;

    const isMerchantOnly =
      user.merchantIds.length > 0 &&
      user.roles.length > 0 &&
      user.roles.every((r) => MERCHANT_ONLY_ROLES.has(r));
    if (!isMerchantOnly) return true;

    const path: string = req.originalUrl || req.url || '';
    const clean = path.split('?')[0];
    if (ALLOWED_PREFIXES.some((p) => clean === p || clean.startsWith(`${p}/`))) {
      return true;
    }
    throw Errors.forbidden(
      'Merchant accounts may only access the merchant portal endpoints',
    );
  }
}
