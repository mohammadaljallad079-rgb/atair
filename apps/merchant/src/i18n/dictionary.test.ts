import { translate } from './dictionary';

describe('translate', () => {
  it('returns the localized string', () => {
    expect(translate('ar', 'orders.title')).toBe('الطلبات');
    expect(translate('en', 'orders.title')).toBe('Orders');
  });

  it('translates the shared welcome key in both locales', () => {
    expect(translate('ar', 'common.welcome')).toBe('مرحبًا');
    expect(translate('en', 'common.welcome')).toBe('Welcome');
  });

  it('falls back to the key when unknown', () => {
    expect(translate('en', 'missing.key', {})).toBe('missing.key');
  });

  it('keeps the two locales key-complete for order statuses', () => {
    const statuses = ['delivered', 'in_transit', 'cancelled', 'failed_delivery'];
    for (const s of statuses) {
      expect(translate('ar', `status.${s}`)).not.toBe(`status.${s}`);
      expect(translate('en', `status.${s}`)).not.toBe(`status.${s}`);
    }
  });

  it('translates every COD status used by the COD page filter', () => {
    const codStatuses = ['none', 'pending', 'collected', 'settled', 'cancelled'];
    for (const s of codStatuses) {
      expect(translate('ar', `status.${s}`)).not.toBe(`status.${s}`);
      expect(translate('en', `status.${s}`)).not.toBe(`status.${s}`);
    }
  });
});
