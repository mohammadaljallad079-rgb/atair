import { PricingService } from './pricing.service';
import { AppError } from '../../common/errors/app-error';

/**
 * Regression: when no pricing rule matches a request the quote must fail with a
 * stable PRICING_UNAVAILABLE conflict instead of returning a silent zero-fare
 * quote (the "zero-fare hole"). This mirrors the guard on the order-create path.
 */
describe('PricingService.quote no-applicable-rule guard', () => {
  function buildService(rules: unknown[]) {
    const prisma: any = {
      pricingRule: { findMany: jest.fn().mockResolvedValue(rules) },
    };
    const audit: any = { log: jest.fn() };
    return new PricingService(prisma, audit);
  }

  const input = { distanceKm: 8, durationMin: 20, paymentMethod: 'cash' as const };

  it('throws PRICING_UNAVAILABLE (409) when no rule matches', async () => {
    const service = buildService([]);
    await expect(service.quote('tenant-1', input)).rejects.toMatchObject({
      code: 'PRICING_UNAVAILABLE',
    });
    await expect(service.quote('tenant-1', input)).rejects.toBeInstanceOf(AppError);
  });

  it('returns a priced quote when a rule matches', async () => {
    const service = buildService([
      {
        id: 'r1',
        name: 'Default',
        currency: 'SAR',
        priority: 1,
        components: [{ type: 'base_fare', amount: 10, minValue: null, maxValue: null, meta: null }],
      },
    ]);
    const quote = await service.quote('tenant-1', input);
    expect(quote.ruleId).toBe('r1');
    expect(quote.total).toBeGreaterThan(0);
  });
});
