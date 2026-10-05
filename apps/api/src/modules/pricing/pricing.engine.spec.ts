import { PricingEngine, PricingRuleInput } from './pricing.engine';

const rule = (overrides: Partial<PricingRuleInput> = {}): PricingRuleInput => ({
  id: 'r1',
  name: 'test',
  currency: 'SAR',
  priority: 1,
  components: [
    { type: 'base_fare', amount: 8 },
    { type: 'distance_fare', amount: 2, minValue: 0 },
    { type: 'time_fare', amount: 0.5 },
  ],
  ...overrides,
});

describe('PricingEngine', () => {
  it('selects the highest-priority rule', () => {
    const low = rule({ id: 'low', priority: 1 });
    const high = rule({ id: 'high', priority: 10 });
    expect(PricingEngine.selectRule([low, high])?.id).toBe('high');
    expect(PricingEngine.selectRule([])).toBeNull();
  });

  it('computes base + distance + time fares', () => {
    const quote = PricingEngine.quote(rule(), { distanceKm: 10, durationMin: 20 });
    // 8 + (10 * 2) + (20 * 0.5) = 8 + 20 + 10
    expect(quote.subtotal).toBe(38);
    expect(quote.total).toBe(38);
    expect(quote.breakdown).toHaveLength(3);
  });

  it('adds the COD fee only for cash/cod payment', () => {
    const cod = rule({ components: [{ type: 'cod_fee', amount: 3 }] });
    expect(PricingEngine.quote(cod, { distanceKm: 0, durationMin: 0, paymentMethod: 'cod' }).total).toBe(3);
    expect(PricingEngine.quote(cod, { distanceKm: 0, durationMin: 0, paymentMethod: 'card' }).total).toBe(0);
  });

  it('applies a percentage discount before tax', () => {
    const quote = PricingEngine.quote(rule(), {
      distanceKm: 0,
      durationMin: 0,
      discount: { type: 'percent', amount: 10 },
      taxRatePercent: 15,
    });
    // base 8, -10% = 7.2, +15% tax = 8.28
    expect(quote.discountAmount).toBeCloseTo(0.8, 5);
    expect(quote.taxAmount).toBeCloseTo(1.08, 5);
    expect(quote.total).toBeCloseTo(8.28, 5);
  });

  it('never lets a discount exceed the pre-discount total', () => {
    const quote = PricingEngine.quote(rule(), {
      distanceKm: 0,
      durationMin: 0,
      discount: { type: 'fixed', amount: 1000 },
    });
    expect(quote.total).toBe(0);
  });

  it('caps distance billing at maxValue', () => {
    const capped = rule({ components: [{ type: 'distance_fare', amount: 2, minValue: 0, maxValue: 5 }] });
    const quote = PricingEngine.quote(capped, { distanceKm: 10, durationMin: 0 });
    expect(quote.total).toBe(10);
  });
});
