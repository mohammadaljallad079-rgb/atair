'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Locale, translate } from './dictionary';

interface I18nContextValue {
  locale: Locale;
  dir: 'rtl' | 'ltr';
  isRTL: boolean;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);
const STORAGE_KEY = 'atair.customer.locale';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ar');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored === 'ar' || stored === 'en') setLocaleState(stored);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    window.localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      dir,
      isRTL: dir === 'rtl',
      setLocale,
      t: (key, vars) => translate(locale, key, vars),
    }),
    [locale, dir, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
