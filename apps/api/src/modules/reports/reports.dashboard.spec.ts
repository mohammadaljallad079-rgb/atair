import { ReportsService } from './reports.service';

/**
 * Regression: the dashboard `driverEarnings` KPI must be scoped to the selected
 * range (delivered orders with an assigned driver), consistent with `revenue`,
 * and must not fall back to the all-time `Driver.totalEarnings` column.
 */
describe('ReportsService.dashboard driverEarnings', () => {
  function buildService() {
    const driverAggregate = jest.fn(() => {
      throw new Error('driver.aggregate must not be used for dashboard earnings');
    });
    const orderAggregate = jest.fn((args: any) => {
      // Only the earnings aggregate filters on a non-null driverId.
      const sum = args.where.driverId ? 42.5 : 100;
      return Promise.resolve({ _sum: { total: sum } });
    });
    const prisma: any = {
      order: {
        count: jest.fn().mockResolvedValue(0),
        aggregate: orderAggregate,
      },
      driver: { count: jest.fn().mockResolvedValue(0), aggregate: driverAggregate },
      commission: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 7 } }) },
      payment: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 3 } }) },
      $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
    };
    return { service: new ReportsService(prisma), driverAggregate };
  }

  it('reports range-scoped delivered-order earnings for the assigned driver', async () => {
    const { service, driverAggregate } = buildService();
    const range = ReportsService.resolveRange('today');
    const result = await service.dashboard('tenant-1', range);

    expect(result.finance.driverEarnings).toBe(42.5);
    expect(result.finance.revenue).toBe(100);
    expect(driverAggregate).not.toHaveBeenCalled();
  });
});
