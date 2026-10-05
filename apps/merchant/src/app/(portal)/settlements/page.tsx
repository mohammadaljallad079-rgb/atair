'use client';

import { endpoints } from '@/lib/endpoints';
import { useI18n } from '@/i18n/provider';
import { useResourceList } from '@/lib/use-resource-list';
import { formatMoney, formatDate } from '@/lib/format';
import { SETTLEMENT_STATUSES } from '@/lib/constants';
import { PageHeader } from '@/components/ui/primitives';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { FilterBar } from '@/components/ui/filters';
import { Select } from '@/components/ui/field';
import type { MerchantSettlement } from '@/lib/types';

export default function SettlementsPage() {
  const { t, locale } = useI18n();
  const list = useResourceList<MerchantSettlement>((q, s) => endpoints.settlements(q, s));

  const columns: Column<MerchantSettlement>[] = [
    { key: 'reference', header: t('settlements.reference'), render: (r) => <span className="font-medium text-slate-900">{r.reference ?? '—'}</span> },
    {
      key: 'period', header: t('settlements.period'),
      render: (r) => `${formatDate(r.periodStart, locale)} → ${formatDate(r.periodEnd, locale)}`,
    },
    { key: 'orderCount', header: t('settlements.orders'), align: 'center', render: (r) => r.orderCount },
    { key: 'codCollected', header: t('settlements.codCollected'), align: 'end', render: (r) => formatMoney(r.codCollected, r.currency, locale) },
    { key: 'deliveryFees', header: t('settlements.deliveryFees'), align: 'end', render: (r) => formatMoney(r.deliveryFees, r.currency, locale) },
    { key: 'commissionAmount', header: t('settlements.commission'), align: 'end', render: (r) => formatMoney(r.commissionAmount, r.currency, locale) },
    { key: 'netPayable', header: t('settlements.netPayable'), align: 'end', render: (r) => <span className="font-semibold">{formatMoney(r.netPayable, r.currency, locale)}</span> },
    { key: 'status', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
    { key: 'paidAt', header: t('settlements.paidAt'), render: (r) => formatDate(r.paidAt, locale) },
  ];

  return (
    <div>
      <PageHeader title={t('settlements.title')} subtitle={t('settlements.subtitle')} />

      <FilterBar onClear={list.resetFilters}>
        <div className="w-44">
          <Select value={list.filters.status ?? ''} onChange={(e) => list.setFilter('status', e.target.value || undefined)}>
            <option value="">{t('common.all')}</option>
            {SETTLEMENT_STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
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
