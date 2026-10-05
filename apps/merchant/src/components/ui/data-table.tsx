'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { EmptyState, LoadingState, ErrorState } from './primitives';

export interface Column<T> {
  key: string;
  header: string;
  /** Renders the cell. Defaults to `row[key]` when omitted. */
  render?: (row: T) => ReactNode;
  className?: string;
  align?: 'start' | 'center' | 'end';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  emptyTitle?: string;
  onRowClick?: (row: T) => void;
  /** Sticky header for long operational tables. */
  stickyHeader?: boolean;
}

const alignClass = { start: 'text-start', center: 'text-center', end: 'text-end' } as const;

/**
 * Generic, RTL-safe data table. Numeric/monetary columns should pass align="end".
 * Horizontal scroll keeps dense operational tables usable on small screens.
 */
export function DataTable<T>({
  columns, rows, rowKey, loading, error, onRetry, emptyTitle, onRowClick, stickyHeader,
}: DataTableProps<T>) {
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (!rows.length) return <EmptyState title={emptyTitle} />;

  return (
    <div className="scroll-thin -mx-4 overflow-x-auto px-4">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead className={cn(stickyHeader && 'sticky top-0 z-10 bg-white')}>
          <tr className="border-b border-slate-200 text-xs text-slate-500">
            {columns.map((c) => (
              <th key={c.key} className={cn('whitespace-nowrap px-3 py-2 font-medium', alignClass[c.align ?? 'start'], c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                'border-b border-slate-100 transition-colors',
                onRowClick && 'cursor-pointer hover:bg-slate-50',
              )}
            >
              {columns.map((c) => (
                <td key={c.key} className={cn('whitespace-nowrap px-3 py-2.5 text-slate-700', alignClass[c.align ?? 'start'], c.className)}>
                  {c.render ? c.render(row) : ((row as Record<string, unknown>)[c.key] as ReactNode) ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
