import { ReportsService } from './reports.service';

describe('ReportsService.resolveRange', () => {
  it('returns a full-history range by default', () => {
    const { from } = ReportsService.resolveRange();
    expect(from.getTime()).toBe(0);
  });

  it('resolves the week preset to seven days back', () => {
    const { from, to } = ReportsService.resolveRange('week');
    const days = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThan(7.1);
  });

  it('resolves the today preset starting at midnight', () => {
    const { from } = ReportsService.resolveRange('today');
    expect(from.getHours()).toBe(0);
    expect(from.getMinutes()).toBe(0);
    expect(from.getSeconds()).toBe(0);
  });

  it('yesterday ends before today begins', () => {
    const yesterday = ReportsService.resolveRange('yesterday');
    const today = ReportsService.resolveRange('today');
    expect(yesterday.to.getTime()).toBeLessThan(today.from.getTime());
    expect(yesterday.from.getTime()).toBeLessThan(yesterday.to.getTime());
  });

  it('honours a custom range', () => {
    const from = '2026-01-01T00:00:00.000Z';
    const to = '2026-02-01T00:00:00.000Z';
    const range = ReportsService.resolveRange('custom', from, to);
    expect(range.from.toISOString()).toBe(from);
    expect(range.to.toISOString()).toBe(to);
  });
});
