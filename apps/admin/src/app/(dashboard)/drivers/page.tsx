'use client';

import { useRouter } from 'next/navigation';
import { endpoints } from '@/lib/endpoints';
import { useResourceList } from '@/lib/use-resource-list';
import { useI18n } from '@/i18n/provider';
import { formatMoney, formatNumber } from '@/lib/format';
import { DRIVER_STATUSES, VERIFICATION_STATUSES } from '@/lib/constants';
import { PageHeader, Card } from '@/components/ui/primitives';
import { DataTable, Column } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';
import { FilterBar } from '@/components/ui/filters';
import { SearchInput, Select } from '@/components/ui/field';
import { StatusBadge } from '@/components/ui/status-badge';
import { RequirePermission } from '@/components/ui/permission-gate';
import type { Driver } from '@/lib/types';

export default function DriversPage() {
  const { t, locale } = useI18n();
  const router = useRouter();

  const list = useResourceList<Driver>((query, signal) => endpoints.drivers(query), { pageSize: 20 });

  const columns: Column<Driver>[] = [
    { key: 'fullName', header: t('drivers.name'), render: (r) => <span className="font-medium text-slate-800">{r.fullName}</span> },
    { key: 'phone', header: t('drivers.phone'), render: (r) => <span dir="ltr">{r.phone}</span> },
    { key: 'status', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
    { key: 'verificationStatus', header: t('drivers.verification'), render: (r) => <StatusBadge status={r.verificationStatus} /> },
    { key: 'isAvailable', header: t('drivers.availability'), render: (r) => (r.isAvailable ? t('common.yes') : t('common.no')) },
    { key: 'rating', header: t('drivers.rating'), align: 'end', render: (r) => (r.rating != null ? formatNumber(r.rating, locale) : '—') },
    { key: 'completedOrders', header: t('drivers.completed'), align: 'end', render: (r) => formatNumber(r.completedOrders, locale) },
    { key: 'totalEarnings', header: t('drivers.earnings'), align: 'end', render: (r) => formatMoney(r.totalEarnings, 'SAR', locale) },
  ];

  return (
    <RequirePermission permission="drivers.view">
      <PageHeader title={t('drivers.title')} subtitle={t('drivers.subtitle')} />

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
            {DRIVER_STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
          </Select>
          <Select
            value={list.filters.verificationStatus ?? ''}
            onChange={(e) => list.setFilter('verificationStatus', e.target.value || undefined)}
            className="w-full sm:w-44"
            aria-label={t('drivers.verification')}
          >
            <option value="">{t('drivers.verification')}: {t('common.all')}</option>
            {VERIFICATION_STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
          </Select>
        </FilterBar>

        <DataTable
          columns={columns}
          rows={list.data?.items ?? []}
          rowKey={(r) => r.id}
          loading={list.loading}
          error={list.error}
          onRetry={list.reload}
          onRowClick={(r) => router.push(`/drivers/${r.id}`)}
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
