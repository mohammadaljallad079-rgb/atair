import { PublicSiteService } from './public-site.service';
import { AppError } from '../../common/errors/app-error';

/**
 * Security-focused tests for the anonymous public tracking surface: it must
 * never enumerate orders, never leak PII, and must return a uniform 404 for any
 * unknown/blank code.
 */
describe('PublicSiteService.track', () => {
  function buildService(order: unknown) {
    const prisma: any = {
      order: { findUnique: jest.fn().mockResolvedValue(order) },
      driverLocation: {
        findFirst: jest.fn().mockResolvedValue({ latitude: 24.7, longitude: 46.6, recordedAt: new Date() }),
      },
    };
    const settings: any = {};
    const audit: any = { log: jest.fn() };
    const drivers: any = {};
    const merchants: any = {};
    return new PublicSiteService(prisma, settings, audit, drivers, merchants);
  }

  it('returns a PII-free snapshot for a valid tracking code', async () => {
    const service = buildService({
      id: 'o1',
      orderNumber: 'ATA-1',
      status: 'in_transit',
      updatedAt: new Date(),
      deliveredAt: null,
      cancelledAt: null,
      driverId: 'd1',
      driver: { fullName: 'سالم' },
      pickupAddress: 'مستودع',
      dropoffAddress: 'حي العليا',
    });

    const snap = await service.track('abc123');
    expect(snap.milestone).toBe('in_transit');
    expect(snap.driverName).toBe('سالم');
    // Never expose internal ids or the customer/driver phone.
    expect(snap).not.toHaveProperty('id');
    expect(snap).not.toHaveProperty('driverId');
    expect(JSON.stringify(snap)).not.toContain('phone');
  });

  it('throws a uniform 404 for an unknown code', async () => {
    const service = buildService(null);
    await expect(service.track('unknowncode')).rejects.toBeInstanceOf(AppError);
    await expect(service.track('unknowncode')).rejects.toMatchObject({ code: 'ORDER_NOT_FOUND' });
  });

  it('rejects a blank/too-short code before touching the database', async () => {
    const service = buildService(null);
    await expect(service.track('  ')).rejects.toMatchObject({ code: 'ORDER_NOT_FOUND' });
  });

  it('omits driver location when no driver is assigned', async () => {
    const service = buildService({
      id: 'o2',
      orderNumber: 'ATA-2',
      status: 'searching_driver',
      updatedAt: new Date(),
      deliveredAt: null,
      cancelledAt: null,
      driverId: null,
      driver: null,
      pickupAddress: 'a',
      dropoffAddress: 'b',
    });
    const snap = await service.track('abc123');
    expect(snap.driverLocation).toBeNull();
    expect(snap.milestone).toBe('searching');
  });
});

/**
 * Public self-registration must always create *pending* accounts (never active)
 * and route them through the same service the admin console uses.
 */
describe('PublicSiteService registration', () => {
  function build(tenant: unknown) {
    const prisma: any = {
      tenant: { findFirst: jest.fn().mockResolvedValue(tenant), findMany: jest.fn().mockResolvedValue(tenant ? [tenant] : []) },
      order: { findUnique: jest.fn() },
      driverLocation: { findFirst: jest.fn() },
    };
    const settings: any = {};
    const audit: any = { log: jest.fn() };
    const drivers: any = { create: jest.fn().mockResolvedValue({ id: 'd1' }) };
    const merchants: any = { create: jest.fn().mockResolvedValue({ id: 'm1' }) };
    return { service: new PublicSiteService(prisma, settings, audit, drivers, merchants), drivers, merchants, audit };
  }

  it('creates a pending driver from a website registration', async () => {
    const { service, drivers, audit } = build({ id: 't1' });
    const res = await service.registerDriver(
      { fullName: 'سالم', phone: '+966500000020', password: 'password123', username: 'salem' } as any,
      { ip: '1.2.3.4' },
    );

    expect(res).toMatchObject({ received: true, status: 'pending_approval' });
    const [tenantId, dto, , opts] = drivers.create.mock.calls[0];
    expect(tenantId).toBe('t1');
    expect(dto.account).toMatchObject({ username: 'salem', password: 'password123' });
    // Never auto-approve a public registration.
    expect(opts).toMatchObject({ source: 'website', approvalStatus: 'pending' });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'website.driver_registration' }));
  });

  it('creates a pending merchant from a website registration', async () => {
    const { service, merchants, audit } = build({ id: 't1' });
    const res = await service.registerMerchant(
      { businessName: 'متجر', ownerName: 'مالك', phone: '+966500000030', password: 'password123' } as any,
      { ip: '1.2.3.4' },
    );

    expect(res).toMatchObject({ received: true, status: 'pending_approval' });
    const [tenantId, dto, , opts] = merchants.create.mock.calls[0];
    expect(tenantId).toBe('t1');
    expect(dto.name).toBe('متجر');
    expect(opts).toMatchObject({ source: 'website', approvalStatus: 'pending' });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'website.merchant_registration' }));
  });

  it('rejects registration when no tenant is configured', async () => {
    const { service } = build(null);
    await expect(
      service.registerDriver({ fullName: 'x', phone: '+966500000020', password: 'password123' } as any, {}),
    ).rejects.toMatchObject({ code: 'WEBSITE_NOT_CONFIGURED' });
  });
});
