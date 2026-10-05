'use client';

import { endpoints } from '@/lib/endpoints';
import { useI18n } from '@/i18n/provider';
import { useAsync } from '@/lib/use-async';
import { useResourceList } from '@/lib/use-resource-list';
import { formatMoney, formatDateTime } from '@/lib/format';
import { COD_STATUSES } from '@/lib/constants';
import { PageHeader, MetricCard } from '@/components/ui/primitives';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { FilterBar } from '@/components/ui/filters';
import { SearchInput, Select } from '@/components/ui/field';
import type { CodRecord } from '@/lib/types';

export default function CodPage() {
  const { t, locale } = useI18n();
  const list = useResourceList<CodRecord>((q, s) => endpoints.cod(q, s));
  const { data: summary } = useAsync((s) => endpoints.codSummary(undefined, s), []);

  const columns: Column<CodRecord>[] = [
    { key: 'orderNumber', header: t('orders.number'), render: (r) => <span className="font-medium text-slate-900">{r.orderNumber}</span> },
    { key: 'customer', header: t('orders.customer'), render: (r) => r.customer?.fullName ?? '—' },
    { key: 'codAmount', header: t('orders.codAmount'), align: 'end', render: (r) => formatMoney(r.codAmount, r.currency, locale) },
    { key: 'codStatus', header: t('orders.codStatus'), render: (r) => <StatusBadge status={r.codStatus} /> },
    { key: 'status', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
    { key: 'branch', header: t('orders.branch'), render: (r) => r.merchantBranch?.name ?? '—' },
    { key: 'codCollectedAt', header: t('cod.collectedAt'), render: (r) => formatDateTime(r.codCollectedAt, locale) },
    { key: 'codSettledAt', header: t('cod.settledAt'), render: (r) => formatDateTime(r.codSettledAt, locale) },
  ];

  const currency = 'SAR';

  return (
    <div>
      <PageHeader title={t('cod.title')} subtitle={t('cod.subtitle')} />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <MetricCard label={t('cod.pending')} value={formatMoney(summary?.pending.amount ?? 0, currency, locale)} tone="warning" hint={`${summary?.pending.count ?? 0}`} />
        <MetricCard label={t('cod.collected')} value={formatMoney(summary?.collected.amount ?? 0, currency, locale)} tone="info" hint={`${summary?.collected.count ?? 0}`} />
        <MetricCard label={t('cod.settled')} value={formatMoney(summary?.settled.amount ?? 0, currency, locale)} tone="success" hint={`${summary?.settled.count ?? 0}`} />
      </div>

      <FilterBar onClear={list.resetFilters}>
        <div className="w-56"><SearchInput value={list.search} onChange={list.setSearch} placeholder={t('common.searchPlaceholder')} /></div>
        <div className="w-40">
          <Select value={list.filters.status ?? ''} onChange={(e) => list.setFilter('status', e.target.value || undefined)}>
            <option value="">{t('common.all')}</option>
            {COD_STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
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
