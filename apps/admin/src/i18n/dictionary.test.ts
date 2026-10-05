import { translate } from './dictionary';

describe('translate', () => {
  it('returns the localized string', () => {
    expect(translate('ar', 'orders.title')).toBe('الطلبات');
    expect(translate('en', 'orders.title')).toBe('Orders');
  });

  it('falls back to the key when unknown', () => {
    expect(translate('en', 'missing.key', {})).toBe('missing.key');
  });

  it('keeps the two locales key-complete for statuses', () => {
    const statuses = ['delivered', 'in_transit', 'partially_refunded'];
    for (const s of statuses) {
      expect(translate('ar', `status.${s}`)).not.toBe(`status.${s}`);
      expect(translate('en', `status.${s}`)).not.toBe(`status.${s}`);
    }
  });
});
