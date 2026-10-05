'use client';

import { useRouter } from 'next/navigation';
import { endpoints } from '@/lib/endpoints';
import { useResourceList } from '@/lib/use-resource-list';
import { useI18n } from '@/i18n/provider';
import { formatNumber, formatDateTime } from '@/lib/format';
import { CUSTOMER_STATUSES } from '@/lib/constants';
import { PageHeader, Card } from '@/components/ui/primitives';
import { DataTable, Column } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';
import { FilterBar } from '@/components/ui/filters';
import { SearchInput, Select } from '@/components/ui/field';
import { StatusBadge } from '@/components/ui/status-badge';
import { RequirePermission } from '@/components/ui/permission-gate';
import type { Customer } from '@/lib/types';

export default function CustomersPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const list = useResourceList<Customer>((query, signal) => endpoints.customers(query), { pageSize: 20 });

  const columns: Column<Customer>[] = [
    { key: 'fullName', header: t('customers.name'), render: (r) => <span className="font-medium text-slate-800">{r.fullName}</span> },
    { key: 'phone', header: t('customers.phone'), render: (r) => <span dir="ltr">{r.phone}</span> },
    { key: 'email', header: t('customers.email'), render: (r) => r.email ?? '—' },
    { key: 'status', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
    { key: 'rating', header: t('drivers.rating'), align: 'end', render: (r) => (r.rating != null ? formatNumber(r.rating, locale) : '—') },
    { key: 'createdAt', header: t('common.createdAt'), render: (r) => formatDateTime(r.createdAt, locale) },
  ];

  return (
    <RequirePermission permission="customers.view">
      <PageHeader title={t('customers.title')} subtitle={t('customers.subtitle')} />
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
            {CUSTOMER_STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
          </Select>
        </FilterBar>
        <DataTable
          columns={columns}
          rows={list.data?.items ?? []}
          rowKey={(r) => r.id}
          loading={list.loading}
          error={list.error}
          onRetry={list.reload}
          onRowClick={(r) => router.push(`/customers/${r.id}`)}
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
