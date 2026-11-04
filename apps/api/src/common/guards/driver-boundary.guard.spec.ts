import { ExecutionContext } from '@nestjs/common';
import { DriverBoundaryGuard } from './driver-boundary.guard';
import { AppError } from '../errors/app-error';

function ctxFor(url: string, user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ originalUrl: url, url, user }) }),
  } as unknown as ExecutionContext;
}

const driverOnly = {
  userId: 'u1',
  tenantId: 't1',
  roles: ['driver'],
  permissions: ['orders.view', 'tracking.view', 'wallets.view'],
  isPlatformAdmin: false,
  merchantIds: [],
};

const tenantStaff = {
  userId: 'u2',
  tenantId: 't1',
  roles: ['operations_manager'],
  permissions: ['orders.view'],
  isPlatformAdmin: false,
  merchantIds: [],
};

const platformAdmin = { ...tenantStaff, isPlatformAdmin: true, roles: ['platform_admin'] };

describe('DriverBoundaryGuard', () => {
  const guard = new DriverBoundaryGuard();

  it('allows a driver-only principal on the driver surface', () => {
    expect(guard.canActivate(ctxFor('/api/v1/driver/assignments', driverOnly))).toBe(true);
    expect(guard.canActivate(ctxFor('/api/v1/driver/me', driverOnly))).toBe(true);
    expect(guard.canActivate(ctxFor('/api/v1/auth/refresh', driverOnly))).toBe(true);
    expect(guard.canActivate(ctxFor('/api/v1/health', driverOnly))).toBe(true);
  });

  it('blocks a driver-only principal from the tenant-wide Admin API', () => {
    for (const url of ['/api/v1/orders', '/api/v1/drivers', '/api/v1/customers', '/api/v1/reports']) {
      expect(() => guard.canActivate(ctxFor(url, driverOnly))).toThrow(AppError);
      expect(() => guard.canActivate(ctxFor(url, driverOnly))).toThrow(/driver app/i);
    }
  });

  it('ignores the query string when matching allowed prefixes', () => {
    expect(guard.canActivate(ctxFor('/api/v1/driver/assignments?status=offered', driverOnly))).toBe(true);
  });

  it('does not confine staff or platform admins', () => {
    expect(guard.canActivate(ctxFor('/api/v1/orders', tenantStaff))).toBe(true);
    expect(guard.canActivate(ctxFor('/api/v1/orders', platformAdmin))).toBe(true);
  });

  it('passes through unauthenticated requests (JwtAuthGuard handles them)', () => {
    expect(guard.canActivate(ctxFor('/api/v1/orders', undefined))).toBe(true);
  });

  it('does not confine a multi-role user who also holds a staff role', () => {
    const mixed = { ...driverOnly, roles: ['driver', 'dispatcher'] };
    expect(guard.canActivate(ctxFor('/api/v1/orders', mixed))).toBe(true);
  });
});
