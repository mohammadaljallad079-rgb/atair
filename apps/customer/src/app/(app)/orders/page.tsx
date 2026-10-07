'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useI18n } from '@/i18n/provider';
import { endpoints } from '@/lib/endpoints';
import { useResourceList } from '@/lib/use-resource-list';
import { formatDateTime, formatMoney } from '@/lib/format';
import type { CustomerOrderListItem } from '@/lib/types';
import { Card, EmptyState, ErrorState, LoadingState, PageHeader } from '@/components/ui/primitives';
import { StatusBadge } from '@/components/ui/status-badge';
import { SearchInput } from '@/components/ui/field';
import { Pagination } from '@/components/ui/pagination';
import { cn } from '@/lib/cn';

const BUCKETS = ['all', 'active', 'completed', 'cancelled'] as const;
type Bucket = (typeof BUCKETS)[number];

export default function OrdersPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <OrdersContent />
    </Suspense>
  );
}

function OrdersContent() {
  const { t, locale } = useI18n();
  const params = useSearchParams();
  const initial = (params.get('bucket') as Bucket) || 'all';
  const list = useResourceList<CustomerOrderListItem>(
    (query, signal) => endpoints.orders(query, signal),
    { initialFilters: initial === 'all' ? {} : { bucket: initial } },
  );
  const bucket = (list.filters.bucket as Bucket) ?? 'all';

  return (
    <div className="space-y-4">
      <PageHeader title={t('cust.orders.title')} />

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex overflow-hidden rounded-lg border border-slate-200">
          {BUCKETS.map((b) => (
            <button
              key={b}
              onClick={() => list.setFilter('bucket', b === 'all' ? undefined : b)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-colors',
                bucket === b ? 'bg-ink-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-100',
              )}
            >
              {t(`cust.orders.${b}`)}
            </button>
          ))}
        </div>
        <div className="ms-auto w-full sm:w-64">
          <SearchInput value={list.search} onChange={list.setSearch} placeholder={t('common.searchPlaceholder')} />
        </div>
      </div>

      <Card>
        {list.loading ? (
          <LoadingState />
        ) : list.error ? (
          <ErrorState error={list.error} onRetry={list.reload} />
        ) : !list.data?.items.length ? (
          <EmptyState title={t('cust.orders.empty')} hint={t('cust.orders.emptyDesc')} />
        ) : (
          <>
            <ul className="divide-y divide-slate-100">
              {list.data.items.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/orders/${o.id}`}
                    className="flex items-center justify-between gap-3 py-3 hover:bg-slate-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-800" dir="ltr">
                        {o.orderNumber}
                      </span>
                      <span className="block truncate text-xs text-slate-500">{o.dropoffAddress}</span>
                      <span className="block text-[11px] text-slate-400">{formatDateTime(o.createdAt, locale)}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <StatusBadge status={o.status} />
                      <span className="text-xs font-semibold text-slate-700">
                        {formatMoney(o.total, o.currency, locale)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {list.data.meta.total > list.pageSize && (
              <Pagination
                page={list.page}
                pageSize={list.pageSize}
                total={list.data.meta.total}
                totalPages={list.data.meta.totalPages}
                onPageChange={list.setPage}
              />
            )}
          </>
        )}
      </Card>
    </div>
  );
}
