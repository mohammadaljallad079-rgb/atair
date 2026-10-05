import { nextOrderStatuses, ORDER_TRANSITIONS, TERMINAL_ORDER_STATUSES } from './constants';
import type { OrderStatus } from './types';

describe('order transition mirror', () => {
  it('offers the same forward path the API allows', () => {
    expect(nextOrderStatuses('pending')).toContain('confirmed');
    expect(nextOrderStatuses('assigned')).toContain('picked_up');
  });

  it('does not offer an invalid shortcut', () => {
    expect(nextOrderStatuses('pending')).not.toContain('delivered');
  });

  it('marks cancelled and returned as terminal', () => {
    expect(TERMINAL_ORDER_STATUSES).toEqual(expect.arrayContaining(['cancelled', 'returned', 'delivered']));
    expect(nextOrderStatuses('cancelled')).toEqual([]);
    expect(nextOrderStatuses('returned')).toEqual([]);
  });

  it('only references known statuses', () => {
    const known = new Set(Object.keys(ORDER_TRANSITIONS) as OrderStatus[]);
    for (const targets of Object.values(ORDER_TRANSITIONS)) {
      for (const target of targets) expect(known.has(target)).toBe(true);
    }
  });
});
