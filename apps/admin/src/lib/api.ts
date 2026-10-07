import type { Paginated } from './types';

/**
 * Single centralized API layer. No page issues raw fetch().
 *
 * Security notes:
 * - The access token is kept in memory only (never localStorage) to reduce XSS
 *   exposure. The opaque refresh token is persisted so a reload can restore the
 *   session; this is the documented trade-off given the backend uses bearer auth
 *   (no httpOnly cookie / CSRF-token flow is available).
 * - Tenant identity is never sent from the client: the backend derives it from
 *   the signed JWT.
 */

// Empty default = same-origin: the API is expected behind the same host/reverse
// proxy (routes under /api/v1). This avoids mixed-content blocking when the app
// is served over HTTPS. Override with NEXT_PUBLIC_API_URL for a split origin.
const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');
const BASE = `${API_URL}/api/v1`;
const REFRESH_KEY = 'atair.refreshToken';
const SESSION_FLAG = 'atair.session';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
  get isForbidden() { return this.status === 403; }
  get isUnauthorized() { return this.status === 401; }
  get isNotFound() { return this.status === 404; }
}

type Listener = () => void;
const unauthorizedListeners = new Set<Listener>();
export function onUnauthorized(fn: Listener) {
  unauthorizedListeners.add(fn);
  return () => {
    unauthorizedListeners.delete(fn);
  };
}
function emitUnauthorized() {
  unauthorizedListeners.forEach((fn) => fn());
}

// ---- Token management ----
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}
export function getAccessToken() {
  return accessToken;
}
export function setRefreshToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) {
    window.localStorage.setItem(REFRESH_KEY, token);
    // Non-sensitive presence flag so middleware can skip the login page for
    // returning users. It carries no credential and grants no access.
    document.cookie = `${SESSION_FLAG}=1; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
  } else {
    window.localStorage.removeItem(REFRESH_KEY);
    document.cookie = `${SESSION_FLAG}=; path=/; max-age=0; samesite=lax`;
  }
}
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(REFRESH_KEY);
}
export function clearTokens() {
  accessToken = null;
  setRefreshToken(null);
}

// ---- Query serialization ----
export function toQuery(params?: Record<string, unknown>): string {
  if (!params) return '';
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, unknown>;
  signal?: AbortSignal;
  /** Skip the automatic refresh-and-retry (used by the refresh call itself). */
  skipRefresh?: boolean;
}

interface Envelope<T> {
  success: boolean;
  data: T;
  meta?: Paginated<unknown>['meta'];
}

async function rawRequest<T>(path: string, opts: RequestOptions = {}): Promise<{ data: T; meta?: Envelope<T>['meta'] }> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}${toQuery(opts.query)}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
      cache: 'no-store',
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK_ERROR', 'تعذّر الاتصال بالخادم / Cannot reach the server');
  }

  const text = await res.text();
  let parsed: Envelope<T> | undefined;
  try {
    parsed = text ? (JSON.parse(text) as Envelope<T>) : undefined;
  } catch {
    parsed = undefined;
  }

  if (!res.ok) {
    const error = (parsed as unknown as { error?: { code?: string; message?: string; details?: unknown } })?.error;
    throw new ApiError(
      res.status,
      error?.code ?? 'HTTP_ERROR',
      error?.message ?? `Request failed (${res.status})`,
      error?.details,
    );
  }
  return { data: (parsed?.data ?? (undefined as unknown as T)), meta: parsed?.meta };
}

// Single-flight refresh so concurrent 401s trigger only one refresh.
let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const token = getRefreshToken();
        if (!token) return false;
        try {
          const { data } = await rawRequest<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
            method: 'POST',
            body: { refreshToken: token },
            skipRefresh: true,
          });
          accessToken = data.accessToken;
          setRefreshToken(data.refreshToken);
          return true;
        } catch {
          // A concurrent context (second tab, or a reload racing an in-flight
          // request) may have rotated the single-use token first. Retry once
          // with the newest stored token before treating the session as gone.
          const latest = getRefreshToken();
          if (!latest || latest === token) {
            clearTokens();
            return false;
          }
          const { data } = await rawRequest<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
            method: 'POST',
            body: { refreshToken: latest },
            skipRefresh: true,
          });
          accessToken = data.accessToken;
          setRefreshToken(data.refreshToken);
          return true;
        }
      } catch {
        clearTokens();
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<{ data: T; meta?: Envelope<T>['meta'] }> {
  try {
    return await rawRequest<T>(path, opts);
  } catch (err) {
    if (err instanceof ApiError && err.isUnauthorized && !opts.skipRefresh) {
      const ok = await refreshSession();
      if (ok) return rawRequest<T>(path, opts);
      clearTokens();
      emitUnauthorized();
    }
    throw err;
  }
}

export const api = {
  async get<T>(path: string, query?: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
    return (await request<T>(path, { method: 'GET', query, signal })).data;
  },
  async getList<T>(path: string, query?: Record<string, unknown>, signal?: AbortSignal): Promise<Paginated<T>> {
    const { data, meta } = await request<T[]>(path, { method: 'GET', query, signal });
    return {
      items: data ?? [],
      meta: meta ?? { page: 1, pageSize: 0, total: 0, totalPages: 0 },
    };
  },
  async post<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    return (await request<T>(path, { method: 'POST', body, signal })).data;
  },
  async patch<T>(path: string, body?: unknown): Promise<T> {
    return (await request<T>(path, { method: 'PATCH', body })).data;
  },
  async put<T>(path: string, body?: unknown): Promise<T> {
    return (await request<T>(path, { method: 'PUT', body })).data;
  },
  async delete<T>(path: string): Promise<T> {
    return (await request<T>(path, { method: 'DELETE' })).data;
  },
  /**
   * Fetches a binary/text response with authentication and returns it as a Blob.
   * Used for report exports, where a plain <a href> could not carry the bearer
   * token held in memory.
   */
  async download(path: string, query?: Record<string, unknown>): Promise<Blob> {
    const headers: Record<string, string> = {};
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    let res = await fetch(`${BASE}${path}${toQuery(query)}`, { headers, cache: 'no-store' });
    if (res.status === 401 && (await refreshSession())) {
      headers.Authorization = `Bearer ${accessToken}`;
      res = await fetch(`${BASE}${path}${toQuery(query)}`, { headers, cache: 'no-store' });
    }
    if (!res.ok) throw new ApiError(res.status, 'HTTP_ERROR', `Export failed (${res.status})`);
    return res.blob();
  },
};

export const apiBaseUrl = API_URL;
