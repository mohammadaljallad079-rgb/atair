'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearTokens, getRefreshToken, onUnauthorized, setAccessToken, setRefreshToken } from '@/lib/api';
import { endpoints } from '@/lib/endpoints';
import type { AuthUser, CustomerMe } from '@/lib/types';

interface AuthContextValue {
  user: AuthUser | null;
  profile: CustomerMe | null;
  status: 'loading' | 'authenticated' | 'anonymous';
  login: (identifier: string, password: string, tenantSlug?: string) => Promise<void>;
  register: (input: { fullName: string; phone: string; email?: string; password: string; tenantSlug?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  can: (permission: string | string[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<CustomerMe | null>(null);
  const [status, setStatus] = useState<AuthContextValue['status']>('loading');
  const router = useRouter();

  const loadProfile = useCallback(async () => {
    try {
      const me = await endpoints.me();
      setProfile(me);
      return me;
    } catch {
      setProfile(null);
      return null;
    }
  }, []);

  const login = useCallback(
    async (identifier: string, password: string, tenantSlug?: string) => {
      const res = await endpoints.login(identifier, password, tenantSlug || undefined);
      setAccessToken(res.accessToken);
      setRefreshToken(res.refreshToken);
      setUser(res.user);
      await loadProfile();
      setStatus('authenticated');
    },
    [loadProfile],
  );

  const register = useCallback(
    async (input: { fullName: string; phone: string; email?: string; password: string; tenantSlug?: string }) => {
      const res = await endpoints.register(input);
      setAccessToken(res.accessToken);
      setRefreshToken(res.refreshToken);
      setUser(res.user);
      await loadProfile();
      setStatus('authenticated');
    },
    [loadProfile],
  );

  const logout = useCallback(async () => {
    try {
      await endpoints.logout();
    } catch {
      /* logout must succeed locally even if the API call fails */
    }
    clearTokens();
    setUser(null);
    setProfile(null);
    setStatus('anonymous');
    router.replace('/login');
  }, [router]);

  const refreshMe = useCallback(async () => {
    const me = await endpoints.me();
    setProfile(me);
  }, []);

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
        setProfile(me);
        setUser({
          id: me.userId,
          fullName: me.fullName,
          email: me.email,
          phone: me.phone,
          tenantId: me.tenantId,
          tenantSlug: me.tenantSlug,
          roles: me.roles,
          permissions: me.permissions,
        });
        setStatus('authenticated');
      } catch {
        if (!cancelled) {
          clearTokens();
          setUser(null);
          setProfile(null);
          setStatus('anonymous');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(
    () =>
      onUnauthorized(() => {
        setUser(null);
        setProfile(null);
        setStatus('anonymous');
      }),
    [],
  );

  const can = useCallback(
    (permission: string | string[]) => {
      if (!user) return false;
      const needed = Array.isArray(permission) ? permission : [permission];
      return needed.every((p) => user.permissions.includes(p));
    },
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user, profile, status, login, register, logout, refreshMe, can }),
    [user, profile, status, login, register, logout, refreshMe, can],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
