import { ExecutionContext } from '@nestjs/common';
import { CustomerBoundaryGuard } from './customer-boundary.guard';
import { AppError } from '../errors/app-error';

function ctxFor(url: string, user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ originalUrl: url, url, user }) }),
  } as unknown as ExecutionContext;
}

const customerOnly = {
  userId: 'u1',
  tenantId: 't1',
  roles: ['customer'],
  permissions: ['orders.view', 'tracking.view'],
  isPlatformAdmin: false,
  merchantIds: [],
};

const tenantStaff = {
  userId: 'u2',
  tenantId: 't1',
  roles: ['tenant_admin'],
  permissions: ['orders.view'],
  isPlatformAdmin: false,
  merchantIds: [],
};

const platformAdmin = { ...tenantStaff, isPlatformAdmin: true, roles: ['platform_admin'] };

describe('CustomerBoundaryGuard', () => {
  const guard = new CustomerBoundaryGuard();

  it('allows a customer-only principal on the customer surface', () => {
    expect(guard.canActivate(ctxFor('/api/v1/customer/orders', customerOnly))).toBe(true);
    expect(guard.canActivate(ctxFor('/api/v1/customer/me', customerOnly))).toBe(true);
    expect(guard.canActivate(ctxFor('/api/v1/auth/logout', customerOnly))).toBe(true);
    expect(guard.canActivate(ctxFor('/api/v1/health', customerOnly))).toBe(true);
  });

  it('blocks a customer-only principal from the tenant-wide Admin API', () => {
    // These endpoints are scoped by tenantId only and would leak other
    // customers' rows, so a customer-only principal must get a hard 403.
    for (const url of ['/api/v1/orders', '/api/v1/payments', '/api/v1/customers', '/api/v1/reports']) {
      expect(() => guard.canActivate(ctxFor(url, customerOnly))).toThrow(AppError);
      expect(() => guard.canActivate(ctxFor(url, customerOnly))).toThrow(/customer app/i);
    }
  });

  it('ignores the query string when matching allowed prefixes', () => {
    expect(guard.canActivate(ctxFor('/api/v1/customer/orders?bucket=active', customerOnly))).toBe(true);
  });

  it('does not confine staff or platform admins', () => {
    expect(guard.canActivate(ctxFor('/api/v1/orders', tenantStaff))).toBe(true);
    expect(guard.canActivate(ctxFor('/api/v1/orders', platformAdmin))).toBe(true);
  });

  it('passes through unauthenticated requests (JwtAuthGuard handles them)', () => {
    expect(guard.canActivate(ctxFor('/api/v1/orders', undefined))).toBe(true);
  });

  it('does not confine a multi-role user who also holds a staff role', () => {
    const mixed = { ...customerOnly, roles: ['customer', 'operations_manager'] };
    expect(guard.canActivate(ctxFor('/api/v1/orders', mixed))).toBe(true);
  });
});
