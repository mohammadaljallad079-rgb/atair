/**
 * Public website API client.
 *
 * The website is anonymous — it never authenticates and never holds a session.
 * This client only calls the unauthenticated `/api/v1/public/*` surface. All
 * requests are same-origin by default (Next rewrites `/api/*` to the API), so
 * no credentials or tokens ever leave the browser.
 */

// Empty default = same-origin (Next.js rewrite proxies /api/* to the API host).
const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');
const BASE = `${API_URL}/api/v1`;

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
  get isNotFound() { return this.status === 404; }
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

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

async function request<T>(
  path: string,
  opts: { method?: 'GET' | 'POST'; body?: unknown; query?: Record<string, unknown>; signal?: AbortSignal } = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

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
    const error = (parsed as unknown as { error?: { code?: string; message?: string } })?.error;
    throw new ApiError(res.status, error?.code ?? 'HTTP_ERROR', error?.message ?? `Request failed (${res.status})`);
  }
  return parsed?.data as T;
}

export const publicApi = {
  get: <T>(path: string, query?: Record<string, unknown>, signal?: AbortSignal) =>
    request<T>(path, { method: 'GET', query, signal }),
  post: <T>(path: string, body?: unknown, query?: Record<string, unknown>) =>
    request<T>(path, { method: 'POST', body, query }),
};

export const apiBaseUrl = API_URL;
