import { ReportsService } from './reports.service';

/**
 * CSV export safety: values containing commas, quotes or newlines must be
 * RFC-4180 quoted, and only the tenant's own orders may be exported.
 */
describe('ReportsService.exportOrdersCsv', () => {
  const tenantId = 'tenant-1';
  const range = { from: new Date('2026-01-01'), to: new Date('2026-12-31') };

  function buildService(orders: unknown[]) {
    const prisma: any = { order: { findMany: jest.fn().mockResolvedValue(orders) } };
    return { service: new ReportsService(prisma), prisma };
  }

  it('scopes the query to the tenant', async () => {
    const { service, prisma } = buildService([]);
    await service.exportOrdersCsv(tenantId, range);
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId }) }),
    );
  });

  it('quotes cells containing commas, quotes and newlines', async () => {
    const { service } = buildService([
      {
        orderNumber: 'ATA-1', status: 'delivered', paymentStatus: 'paid', paymentMethod: 'cash',
        total: '10.5', currency: 'SAR',
        pickupAddress: 'شارع الملك, الرياض', dropoffAddress: 'Line1\nLine2',
        createdAt: new Date('2026-02-01T10:00:00Z'), deliveredAt: null,
        customer: { fullName: 'Ali "The Boss"', phone: '+966500000000' },
        driver: null, merchant: null,
      },
    ]);
    const csv = await service.exportOrdersCsv(tenantId, range);
    const lines = csv.split('\n');
    expect(lines[0]).toContain('orderNumber');
    // The embedded newline is quoted, so the row stays on a logical line.
    expect(csv).toContain('"شارع الملك, الرياض"');
    expect(csv).toContain('"Line1\nLine2"');
    expect(csv).toContain('"Ali ""The Boss"""');
  });
});
