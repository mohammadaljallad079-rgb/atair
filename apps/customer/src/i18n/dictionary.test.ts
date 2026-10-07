import { dictionaries, translate } from './dictionary';

describe('customer dictionary', () => {
  it('translates the customer surface in both locales', () => {
    expect(translate('ar', 'cust.nav.home')).toBe('الرئيسية');
    expect(translate('en', 'cust.nav.home')).toBe('Home');
    expect(translate('ar', 'cust.auth.register')).toBe('إنشاء حساب');
    expect(translate('en', 'cust.auth.register')).toBe('Create account');
  });

  it('keeps ar and en key-complete for the customer namespace', () => {
    const arKeys = Object.keys(dictionaries.ar).filter((k) => k.startsWith('cust.'));
    const enKeys = Object.keys(dictionaries.en).filter((k) => k.startsWith('cust.'));
    expect(arKeys.length).toBeGreaterThan(0);
    expect(new Set(arKeys)).toEqual(new Set(enKeys));
  });

  it('has no empty customer translation', () => {
    for (const key of Object.keys(dictionaries.ar).filter((k) => k.startsWith('cust.'))) {
      expect(translate('ar', key).trim()).not.toBe('');
      expect(translate('en', key).trim()).not.toBe('');
    }
  });

  it('interpolates the ETA minutes placeholder', () => {
    expect(translate('en', 'cust.track.minutes', { n: 12 })).toContain('12');
    expect(translate('ar', 'cust.track.minutes', { n: 12 })).toContain('12');
  });
});
