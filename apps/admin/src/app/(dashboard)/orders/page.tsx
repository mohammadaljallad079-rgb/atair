'use client';

import { useRouter } from 'next/navigation';
import { endpoints } from '@/lib/endpoints';
import { useResourceList } from '@/lib/use-resource-list';
import { useI18n } from '@/i18n/provider';
import { formatMoney, formatDateTime, formatDistance } from '@/lib/format';
import { ORDER_STATUSES, PAYMENT_STATUSES } from '@/lib/constants';
import { PageHeader, Card } from '@/components/ui/primitives';
import { DataTable, Column } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';
import { FilterBar, Segmented } from '@/components/ui/filters';
import { SearchInput, Select } from '@/components/ui/field';
import { StatusBadge } from '@/components/ui/status-badge';
import { RequirePermission } from '@/components/ui/permission-gate';
import type { OrderListItem } from '@/lib/types';

export default function OrdersPage() {
  const { t, locale } = useI18n();
  const router = useRouter();

  const list = useResourceList<OrderListItem>(
    (query, signal) => endpoints.orders(query),
    { pageSize: 20 },
  );

  const columns: Column<OrderListItem>[] = [
    { key: 'orderNumber', header: t('orders.number'), render: (r) => <span className="font-medium text-ink-700">{r.orderNumber}</span> },
    { key: 'customer', header: t('orders.customer'), render: (r) => r.customer?.fullName ?? '—' },
    { key: 'driver', header: t('orders.driver'), render: (r) => r.driver?.fullName ?? '—' },
    { key: 'status', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
    { key: 'paymentStatus', header: t('orders.paymentStatus'), render: (r) => <StatusBadge status={r.paymentStatus} /> },
    { key: 'total', header: t('orders.total'), align: 'end', render: (r) => formatMoney(r.total, r.currency, locale) },
    { key: 'distanceKm', header: t('orders.distance'), align: 'end', render: (r) => formatDistance(r.distanceKm, locale) },
    { key: 'createdAt', header: t('common.createdAt'), render: (r) => formatDateTime(r.createdAt, locale) },
  ];

  const activeTab = (list.filters.status as string | undefined) ?? 'all';

  return (
    <RequirePermission permission="orders.view">
      <PageHeader title={t('orders.title')} subtitle={t('orders.subtitle')} />

      <Card>
        <FilterBar onClear={list.resetFilters}>
          <div className="w-full sm:w-64">
            <SearchInput value={list.search} onChange={list.setSearch} placeholder={t('common.searchPlaceholder')} />
          </div>
          <Select
            value={list.filters.paymentStatus ?? ''}
            onChange={(e) => list.setFilter('paymentStatus', e.target.value || undefined)}
            className="w-full sm:w-44"
            aria-label={t('orders.paymentStatus')}
          >
            <option value="">{t('orders.paymentStatus')}: {t('common.all')}</option>
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>{t(`status.${s}`)}</option>
            ))}
          </Select>
        </FilterBar>

        <div className="mb-3">
          <Segmented
            value={activeTab}
            onChange={(v) => list.setFilter('status', v === 'all' ? undefined : v)}
            options={[
              { value: 'all', label: t('common.all') },
              { value: 'active', label: t('status.active') },
              { value: 'delivered', label: t('status.delivered') },
              { value: 'cancelled', label: t('status.cancelled') },
            ]}
          />
        </div>

        <DataTable
          columns={columns}
          rows={list.data?.items ?? []}
          rowKey={(r) => r.id}
          loading={list.loading}
          error={list.error}
          onRetry={list.reload}
          onRowClick={(r) => router.push(`/orders/${r.id}`)}
          stickyHeader
        />

        {list.data && (
          <Pagination
            page={list.data.meta.page}
            pageSize={list.data.meta.pageSize}
            total={list.data.meta.total}
            totalPages={list.data.meta.totalPages}
            onPageChange={list.setPage}
          />
        )}
      </Card>
    </RequirePermission>
  );
}
