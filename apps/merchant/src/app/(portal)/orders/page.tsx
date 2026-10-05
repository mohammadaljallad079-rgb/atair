'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { endpoints } from '@/lib/endpoints';
import { useI18n } from '@/i18n/provider';
import { useResourceList } from '@/lib/use-resource-list';
import { formatMoney, formatDate } from '@/lib/format';
import { ORDER_STATUSES } from '@/lib/constants';
import { PageHeader } from '@/components/ui/primitives';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { FilterBar, Segmented } from '@/components/ui/filters';
import { SearchInput, Select } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/layout/icon';
import type { MerchantOrderListItem } from '@/lib/types';

export default function OrdersPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const list = useResourceList<MerchantOrderListItem>(
    (query, signal) => endpoints.orders(query, signal),
    { initialFilters: { status: '' } },
  );

  const columns: Column<MerchantOrderListItem>[] = [
    { key: 'orderNumber', header: t('orders.number'), render: (r) => <span className="font-medium text-slate-900">{r.orderNumber}</span> },
    { key: 'customer', header: t('orders.customer'), render: (r) => r.customer?.fullName ?? '—' },
    { key: 'status', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
    { key: 'paymentStatus', header: t('orders.paymentStatus'), render: (r) => <StatusBadge status={r.paymentStatus} /> },
    { key: 'paymentMethod', header: t('orders.paymentMethod'), render: (r) => t(`paymentMethod.${r.paymentMethod}`) },
    {
      key: 'codAmount', header: t('orders.codAmount'), align: 'end',
      render: (r) => (Number(r.codAmount) > 0 ? formatMoney(r.codAmount, r.currency, locale) : '—'),
    },
    { key: 'total', header: t('orders.deliveryFee'), align: 'end', render: (r) => formatMoney(r.total, r.currency, locale) },
    { key: 'branch', header: t('orders.branch'), render: (r) => r.merchantBranch?.name ?? '—' },
    { key: 'createdAt', header: t('common.createdAt'), render: (r) => formatDate(r.createdAt, locale) },
  ];

  return (
    <div>
      <PageHeader
        title={t('orders.title')}
        subtitle={t('orders.subtitle')}
        actions={
          <>
            <Link href="/import"><Button variant="secondary" icon={<Icon name="truck" className="h-4 w-4" />}>{t('import.title')}</Button></Link>
            <Link href="/orders/new"><Button icon={<Icon name="route" className="h-4 w-4" />}>{t('orders.new')}</Button></Link>
          </>
        }
      />

      <FilterBar onClear={list.resetFilters}>
        <div className="w-56"><SearchInput value={list.search} onChange={list.setSearch} placeholder={t('common.searchPlaceholder')} /></div>
        <div className="w-44">
          <Select value={list.filters.status ?? ''} onChange={(e) => list.setFilter('status', e.target.value || undefined)}>
            <option value="">{t('common.all')}</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>{t(`status.${s}`)}</option>
            ))}
          </Select>
        </div>
      </FilterBar>

      <DataTable
        columns={columns}
        rows={list.data?.items ?? []}
        rowKey={(r) => r.id}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        emptyTitle={t('common.empty')}
        onRowClick={(r) => router.push(`/orders/${r.id}`)}
      />
      {list.data && (
        <Pagination
          page={list.page}
          pageSize={list.pageSize}
          total={list.data.meta.total}
          totalPages={list.data.meta.totalPages}
          onPageChange={list.setPage}
        />
      )}
    </div>
  );
}
