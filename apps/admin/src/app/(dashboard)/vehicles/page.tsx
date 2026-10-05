'use client';

import { endpoints } from '@/lib/endpoints';
import { useResourceList } from '@/lib/use-resource-list';
import { useAsync } from '@/lib/use-async';
import { useI18n } from '@/i18n/provider';
import { VEHICLE_STATUSES } from '@/lib/constants';
import { PageHeader, Card } from '@/components/ui/primitives';
import { DataTable, Column } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';
import { FilterBar } from '@/components/ui/filters';
import { SearchInput, Select } from '@/components/ui/field';
import { StatusBadge } from '@/components/ui/status-badge';
import { RequirePermission } from '@/components/ui/permission-gate';
import type { Vehicle } from '@/lib/types';

export default function VehiclesPage() {
  const { t } = useI18n();
  const list = useResourceList<Vehicle>((query, signal) => endpoints.vehicles(query), { pageSize: 20 });
  const types = useAsync(() => endpoints.vehicleTypes(), []);

  const typeName = (id: string | null | undefined) =>
    types.data?.find((vt) => vt.id === id)?.name ?? '—';

  const columns: Column<Vehicle>[] = [
    { key: 'plateNumber', header: t('vehicles.plate'), render: (r) => <span dir="ltr" className="font-medium">{r.plateNumber}</span> },
    { key: 'vehicleTypeId', header: t('vehicles.type'), render: (r) => typeName(r.vehicleTypeId) },
    { key: 'make', header: t('vehicles.make'), render: (r) => r.make ?? '—' },
    { key: 'model', header: t('vehicles.model'), render: (r) => r.model ?? '—' },
    { key: 'year', header: t('vehicles.year'), align: 'end', render: (r) => r.year ?? '—' },
    { key: 'status', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <RequirePermission permission="vehicles.view">
      <PageHeader title={t('vehicles.title')} subtitle={t('vehicles.subtitle')} />
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
            {VEHICLE_STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
          </Select>
        </FilterBar>
        <DataTable
          columns={columns}
          rows={list.data?.items ?? []}
          rowKey={(r) => r.id}
          loading={list.loading}
          error={list.error}
          onRetry={list.reload}
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
