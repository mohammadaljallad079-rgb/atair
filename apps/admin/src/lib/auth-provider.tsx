'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearTokens, getRefreshToken, onUnauthorized, setAccessToken, setRefreshToken } from '@/lib/api';
import { endpoints } from '@/lib/endpoints';
import type { AuthUser } from '@/lib/types';

interface AuthContextValue {
  user: AuthUser | null;
  status: 'loading' | 'authenticated' | 'anonymous';
  login: (identifier: string, password: string, tenantSlug?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  can: (permission: string | string[]) => boolean;
  canAny: (permissions: string[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthContextValue['status']>('loading');
  const router = useRouter();

  const login = useCallback(
    async (identifier: string, password: string, tenantSlug?: string) => {
      const res = await endpoints.login(identifier, password, tenantSlug || undefined);
      setAccessToken(res.accessToken);
      setRefreshToken(res.refreshToken);
      setUser(res.user);
      setStatus('authenticated');
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await endpoints.logout();
    } catch {
      /* logout must succeed locally even if the API call fails */
    }
    clearTokens();
    setUser(null);
    setStatus('anonymous');
    router.replace('/login');
  }, [router]);

  const refreshMe = useCallback(async () => {
    const me = await endpoints.me();
    setUser(me);
  }, []);

  // Restore the session on load: use the stored refresh token to obtain a new
  // access token, then load the principal. Never trust a stale in-memory token.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!getRefreshToken()) {
        if (!cancelled) setStatus('anonymous');
        return;
      }
      try {
        await endpoints.me(); // triggers refresh-and-retry inside the API client
        const me = await endpoints.me();
        if (!cancelled) {
          setUser(me);
          setStatus('authenticated');
        }
      } catch {
        if (!cancelled) {
          clearTokens();
          setUser(null);
          setStatus('anonymous');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // React to refresh failures signalled by the API client.
  useEffect(
    () =>
      onUnauthorized(() => {
        setUser(null);
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

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, logout, refreshMe, can, canAny }),
    [user, status, login, logout, refreshMe, can, canAny],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
