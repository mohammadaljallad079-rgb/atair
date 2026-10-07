'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { endpoints, SiteResponse, SiteSettings } from '@/lib/endpoints';

interface SiteContextValue {
  site: SiteResponse | null;
  settings: SiteSettings;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

const SiteContext = createContext<SiteContextValue | null>(null);

/**
 * Loads public site content once for the whole app and exposes it to every
 * page. Content is authored in the Admin Control Center and served by the real
 * backend; when the backend has no configuration the pages fall back to their
 * built-in defaults rather than failing.
 */
export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [site, setSite] = useState<SiteResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    endpoints
      .site(undefined, ctrl.signal)
      .then((res) => {
        setSite(res);
        setError(null);
      })
      .catch((err) => {
        if ((err as Error).name !== 'AbortError') setError((err as Error).message);
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [nonce]);

  const value = useMemo<SiteContextValue>(
    () => ({
      site,
      settings: site?.settings ?? {},
      loading,
      error,
      reload: () => setNonce((n) => n + 1),
    }),
    [site, loading, error],
  );

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite(): SiteContextValue {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be used within SiteProvider');
  return ctx;
}

/** Convenience accessor for a single content setting with a default. */
export function useSetting<K extends keyof SiteSettings>(key: K, fallback: NonNullable<SiteSettings[K]>): NonNullable<SiteSettings[K]> {
  const { settings } = useSite();
  const value = settings[key];
  return (value === undefined || value === null || value === '' ? fallback : value) as NonNullable<SiteSettings[K]>;
}
