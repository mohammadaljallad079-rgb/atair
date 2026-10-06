import { ApiError, toQuery } from './api';

describe('toQuery', () => {
  it('returns an empty string with no params', () => {
    expect(toQuery()).toBe('');
    expect(toQuery({})).toBe('');
  });

  it('drops empty, null and undefined values', () => {
    expect(toQuery({ page: 1, search: '', status: undefined, x: null })).toBe('?page=1');
  });

  it('serializes multiple values', () => {
    const qs = toQuery({ page: 2, pageSize: 20, status: 'pending' });
    expect(qs).toContain('page=2');
    expect(qs).toContain('pageSize=20');
    expect(qs).toContain('status=pending');
  });
});

describe('ApiError', () => {
  it('exposes semantic status helpers', () => {
    expect(new ApiError(401, 'UNAUTHORIZED', 'x').isUnauthorized).toBe(true);
    expect(new ApiError(403, 'FORBIDDEN', 'x').isForbidden).toBe(true);
    expect(new ApiError(404, 'NOT_FOUND', 'x').isNotFound).toBe(true);
    expect(new ApiError(500, 'HTTP_ERROR', 'x').isUnauthorized).toBe(false);
  });
});

describe('apiBaseUrl', () => {
  it('defaults to same-origin (empty) when NEXT_PUBLIC_API_URL is unset', () => {
    const prev = process.env.NEXT_PUBLIC_API_URL;
    delete process.env.NEXT_PUBLIC_API_URL;
    jest.isolateModules(() => {
      const mod = require('./api') as typeof import('./api');
      expect(mod.apiBaseUrl).toBe('');
    });
    if (prev !== undefined) process.env.NEXT_PUBLIC_API_URL = prev;
  });
});
