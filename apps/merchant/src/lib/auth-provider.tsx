'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearTokens, getRefreshToken, onUnauthorized, setAccessToken, setRefreshToken } from '@/lib/api';
import { endpoints } from '@/lib/endpoints';
import type { AuthUser, MerchantContext } from '@/lib/types';

interface AuthContextValue {
  user: AuthUser | null;
  merchant: MerchantContext | null;
  status: 'loading' | 'authenticated' | 'anonymous' | 'no-merchant';
  login: (identifier: string, password: string, tenantSlug?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  can: (permission: string | string[]) => boolean;
  canAny: (permissions: string[]) => boolean;
  isMerchantOnly: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const MERCHANT_ROLES = [
  'merchant_owner', 'merchant_manager', 'merchant_operator', 'merchant_finance',
  'merchant_viewer', 'merchant_admin',
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [merchant, setMerchant] = useState<MerchantContext | null>(null);
  const [status, setStatus] = useState<AuthContextValue['status']>('loading');
  const router = useRouter();

  const loadMerchant = useCallback(async () => {
    try {
      const ctx = await endpoints.context();
      setMerchant(ctx);
      return ctx;
    } catch {
      setMerchant(null);
      return null;
    }
  }, []);

  const login = useCallback(
    async (identifier: string, password: string, tenantSlug?: string) => {
      const res = await endpoints.login(identifier, password, tenantSlug || undefined);
      setAccessToken(res.accessToken);
      setRefreshToken(res.refreshToken);
      setUser(res.user);
      const ctx = await loadMerchant();
      if (!ctx) {
        setStatus('no-merchant');
        return;
      }
      setStatus('authenticated');
    },
    [loadMerchant],
  );

  const logout = useCallback(async () => {
    try {
      await endpoints.logout();
    } catch {
      /* logout must succeed locally even if the API call fails */
    }
    clearTokens();
    setUser(null);
    setMerchant(null);
    setStatus('anonymous');
    router.replace('/login');
  }, [router]);

  const refreshMe = useCallback(async () => {
    const me = await endpoints.me();
    setUser(me);
    await loadMerchant();
  }, [loadMerchant]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!getRefreshToken()) {
        if (!cancelled) setStatus('anonymous');
        return;
      }
      try {
        // A 401 here triggers refresh-and-retry inside the API client.
        const me = await endpoints.me();
        if (cancelled) return;
        setUser(me);
        const ctx = await loadMerchant();
        if (cancelled) return;
        setStatus(ctx ? 'authenticated' : 'no-merchant');
      } catch {
        if (!cancelled) {
          clearTokens();
          setUser(null);
          setMerchant(null);
          setStatus('anonymous');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadMerchant]);

  useEffect(
    () =>
      onUnauthorized(() => {
        setUser(null);
        setMerchant(null);
        setStatus('anonymous');
      }),
    [],
  );

  const can = useCallback(
    (permission: string | string[]) => {
      if (!user) return false;
      if (user.roles.includes('platform_admin')) return true;
      const needed = Array.isArray(permission) ? permission : [permission];
      return needed.every((p) => user.permissions.includes(p));
    },
    [user],
  );

  const canAny = useCallback(
    (permissions: string[]) => {
      if (!user) return false;
      if (user.roles.includes('platform_admin')) return true;
      return permissions.some((p) => user.permissions.includes(p));
    },
    [user],
  );

  const isMerchantOnly = useMemo(() => {
    if (!user || user.roles.includes('platform_admin')) return false;
    return (
      (user.merchantIds?.length ?? 0) > 0 &&
      user.roles.length > 0 &&
      user.roles.every((r) => MERCHANT_ROLES.includes(r))
    );
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, merchant, status, login, logout, refreshMe, can, canAny, isMerchantOnly }),
    [user, merchant, status, login, logout, refreshMe, can, canAny, isMerchantOnly],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
