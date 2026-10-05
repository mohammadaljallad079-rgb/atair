import { MERCHANT_CANCELLABLE, ORDER_STATUSES, PAYMENT_METHODS, REPORT_PRESETS } from './constants';

describe('merchant constants', () => {
  it('only cancels statuses that exist in the order lifecycle', () => {
    const known = new Set(ORDER_STATUSES);
    for (const s of MERCHANT_CANCELLABLE) expect(known.has(s)).toBe(true);
  });

  it('mirrors the server-side cancellable allow-list', () => {
    expect(MERCHANT_CANCELLABLE).toEqual([
      'draft', 'pending', 'confirmed', 'searching_driver', 'assigned', 'driver_arriving',
    ]);
  });

  it('supports cash on delivery', () => {
    expect(PAYMENT_METHODS).toContain('cod');
  });

  it('exposes the report presets used by the API', () => {
    expect(REPORT_PRESETS).toEqual(expect.arrayContaining(['today', 'week', 'month']));
  });
});
