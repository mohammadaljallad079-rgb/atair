'use client';

import { endpoints } from '@/lib/endpoints';
import { useI18n } from '@/i18n/provider';
import { useResourceList } from '@/lib/use-resource-list';
import { formatMoney, formatDateTime } from '@/lib/format';
import { PAYMENT_STATUSES, PAYMENT_METHODS } from '@/lib/constants';
import { PageHeader } from '@/components/ui/primitives';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { FilterBar } from '@/components/ui/filters';
import { SearchInput, Select } from '@/components/ui/field';
import type { MerchantPayment } from '@/lib/types';

export default function PaymentsPage() {
  const { t, locale } = useI18n();
  const list = useResourceList<MerchantPayment>((q, s) => endpoints.payments(q, s));

  const columns: Column<MerchantPayment>[] = [
    { key: 'order', header: t('orders.number'), render: (r) => r.order?.orderNumber ?? '—' },
    { key: 'customer', header: t('orders.customer'), render: (r) => r.customer?.fullName ?? '—' },
    { key: 'amount', header: t('payments.amount'), align: 'end', render: (r) => formatMoney(r.amount, r.currency, locale) },
    { key: 'method', header: t('payments.method'), render: (r) => t(`paymentMethod.${r.method}`) },
    { key: 'provider', header: t('payments.provider'), render: (r) => r.provider ?? '—' },
    { key: 'status', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
    { key: 'createdAt', header: t('common.createdAt'), render: (r) => formatDateTime(r.createdAt, locale) },
  ];

  return (
    <div>
      <PageHeader title={t('payments.title')} subtitle={t('payments.subtitle')} />

      <FilterBar onClear={list.resetFilters}>
        <div className="w-56"><SearchInput value={list.search} onChange={list.setSearch} placeholder={t('common.searchPlaceholder')} /></div>
        <div className="w-40">
          <Select value={list.filters.status ?? ''} onChange={(e) => list.setFilter('status', e.target.value || undefined)}>
            <option value="">{t('common.all')}</option>
            {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
          </Select>
        </div>
        <div className="w-40">
          <Select value={list.filters.method ?? ''} onChange={(e) => list.setFilter('method', e.target.value || undefined)}>
            <option value="">{t('common.all')}</option>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{t(`paymentMethod.${m}`)}</option>)}
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
      />
      {list.data && (
        <Pagination page={list.page} pageSize={list.pageSize} total={list.data.meta.total} totalPages={list.data.meta.totalPages} onPageChange={list.setPage} />
      )}
    </div>
  );
}
