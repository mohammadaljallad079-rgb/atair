'use client';

import { useRouter } from 'next/navigation';
import { endpoints } from '@/lib/endpoints';
import { useResourceList } from '@/lib/use-resource-list';
import { useI18n } from '@/i18n/provider';
import { formatDateTime } from '@/lib/format';
import { MERCHANT_STATUSES } from '@/lib/constants';
import { PageHeader, Card } from '@/components/ui/primitives';
import { DataTable, Column } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';
import { FilterBar } from '@/components/ui/filters';
import { SearchInput, Select } from '@/components/ui/field';
import { StatusBadge } from '@/components/ui/status-badge';
import { RequirePermission } from '@/components/ui/permission-gate';
import type { Merchant } from '@/lib/types';

export default function MerchantsPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const list = useResourceList<Merchant>((query, signal) => endpoints.merchants(query), { pageSize: 20 });

  const columns: Column<Merchant>[] = [
    { key: 'name', header: t('merchants.name'), render: (r) => <span className="font-medium text-slate-800">{r.name}</span> },
    { key: 'slug', header: t('common.slug'), render: (r) => <span dir="ltr" className="text-xs text-slate-500">{r.slug}</span> },
    { key: 'category', header: t('merchants.category'), render: (r) => r.category ?? '—' },
    { key: 'phone', header: t('customers.phone'), render: (r) => (r.phone ? <span dir="ltr">{r.phone}</span> : '—') },
    { key: 'status', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
    { key: 'commissionRate', header: t('merchants.commission'), align: 'end', render: (r) => (r.commissionRate != null ? `${Number(r.commissionRate).toFixed(2)}%` : '—') },
    { key: 'createdAt', header: t('common.createdAt'), render: (r) => formatDateTime(r.createdAt, locale) },
  ];

  return (
    <RequirePermission permission="merchants.view">
      <PageHeader title={t('merchants.title')} subtitle={t('merchants.subtitle')} />
      <Card>
        <FilterBar onClear={list.resetFilters}>
          <div className="w-full sm:w-64">
            <SearchInput value={list.search} onChange={list.setSearch} placeholder={t('common.searchPlaceholder')} />
          </div>
          <Select
            value={list.filters.status ?? ''}
            onChange={(e) => list.setFilter('status', e.target.value || undefined)}
            className="w-full sm:w-44"
            aria-label={t('common.status')}
          >
            <option value="">{t('common.status')}: {t('common.all')}</option>
            {MERCHANT_STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
          </Select>
        </FilterBar>
        <DataTable
          columns={columns}
          rows={list.data?.items ?? []}
          rowKey={(r) => r.id}
          loading={list.loading}
          error={list.error}
          onRetry={list.reload}
          onRowClick={(r) => router.push(`/merchants/${r.id}`)}
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
