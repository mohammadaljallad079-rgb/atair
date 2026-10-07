import { DispatchService } from './dispatch.service';

/**
 * Dispatch board aggregation is tenant-scoped and must never mix tenants'
 * orders or drivers.
 */
describe('DispatchService.board', () => {
  const tenantId = 'tenant-1';

  function buildService() {
    const prisma: any = {
      order: { findMany: jest.fn().mockResolvedValue([]) },
      driver: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn().mockImplementation((ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
    };
    return { service: new DispatchService(prisma), prisma };
  }

  it('scopes every query to the tenant', async () => {
    const { service, prisma } = buildService();
    const board = await service.board(tenantId);
    expect(board).toEqual({ unassigned: [], active: [], availableDrivers: [], busyDrivers: [] });
    for (const call of prisma.order.findMany.mock.calls) {
      expect(call[0].where).toMatchObject({ tenantId });
    }
    for (const call of prisma.driver.findMany.mock.calls) {
      expect(call[0].where).toMatchObject({ tenantId });
    }
  });
});
