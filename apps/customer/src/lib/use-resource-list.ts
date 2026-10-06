'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Paginated } from './types';

type Filters = Record<string, string | undefined>;

export interface ListQueryState<T> {
  data: Paginated<T> | null;
  loading: boolean;
  error: Error | null;
  page: number;
  pageSize: number;
  search: string;
  filters: Filters;
  setPage: (p: number) => void;
  setSearch: (s: string) => void;
  setFilter: (key: string, value: string | undefined) => void;
  resetFilters: () => void;
  reload: () => void;
}

/**
 * Shared list-page state: page, page size, debounced search and arbitrary
 * filters, feeding a paginated endpoint. Keeps every list page consistent and
 * avoids duplicating pagination logic ~15 times.
 */
export function useResourceList<T>(
  loader: (query: Record<string, unknown>, signal: AbortSignal) => Promise<Paginated<T>>,
  options: { pageSize?: number; initialFilters?: Filters; debounceMs?: number } = {},
): ListQueryState<T> {
  const { pageSize: initialPageSize = 20, initialFilters = {}, debounceMs = 350 } = options;
  const [data, setData] = useState<Paginated<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPageState] = useState(1);
  const [pageSize] = useState(initialPageSize);
  const [search, setSearchState] = useState('');
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [nonce, setNonce] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), debounceMs);
    return () => clearTimeout(id);
  }, [search, debounceMs]);

  const query = useMemo(
    () => ({ page, pageSize, search: debouncedSearch || undefined, ...filters }),
    [page, pageSize, debouncedSearch, filters],
  );

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError(null);
    loaderRef
      .current(query, controller.signal)
      .then((res) => active && setData(res))
      .catch((err) => {
        if (!active || (err as Error)?.name === 'AbortError') return;
        setError(err as Error);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
      controller.abort();
    };
  }, [query, nonce]);

  const setSearch = useCallback((s: string) => {
    setSearchState(s);
    setPageState(1);
  }, []);
  const setFilter = useCallback((key: string, value: string | undefined) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPageState(1);
  }, []);
  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
    setSearchState('');
    setPageState(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return {
    data, loading, error, page, pageSize, search, filters,
    setPage: setPageState, setSearch, setFilter, resetFilters, reload,
  };
}
