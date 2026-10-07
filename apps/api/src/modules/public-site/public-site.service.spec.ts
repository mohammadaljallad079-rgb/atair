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
    return new PublicSiteService(prisma, settings, audit);
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
