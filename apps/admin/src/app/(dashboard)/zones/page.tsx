'use client';

import { endpoints } from '@/lib/endpoints';
import { useResourceList } from '@/lib/use-resource-list';
import { useI18n } from '@/i18n/provider';
import { formatDateTime } from '@/lib/format';
import { PageHeader, Card } from '@/components/ui/primitives';
import { DataTable, Column } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';
import { FilterBar } from '@/components/ui/filters';
import { SearchInput } from '@/components/ui/field';
import { StatusBadge } from '@/components/ui/status-badge';
import { RequirePermission } from '@/components/ui/permission-gate';
import type { ServiceZone } from '@/lib/types';

export default function ZonesPage() {
  const { t, locale } = useI18n();
  const list = useResourceList<ServiceZone>((query, signal) => endpoints.zones(query), { pageSize: 20 });

  const columns: Column<ServiceZone>[] = [
    { key: 'name', header: t('zones.name'), render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'code', header: t('zones.code'), render: (r) => r.code ?? '—' },
    {
      key: 'center', header: t('zones.center'),
      render: (r) => (r.centerLat != null && r.centerLng != null ? `${r.centerLat.toFixed(4)}, ${r.centerLng.toFixed(4)}` : '—'),
    },
    { key: 'polygon', header: t('zones.polygon'), render: (r) => (r.polygon ? `${r.polygon.length} pts` : '—') },
    { key: 'isActive', header: t('common.status'), render: (r) => <StatusBadge status={r.isActive ? 'active' : 'inactive'} /> },
    { key: 'createdAt', header: t('common.createdAt'), render: (r) => formatDateTime(r.createdAt, locale) },
  ];

  return (
    <RequirePermission permission="zones.view">
      <PageHeader title={t('zones.title')} subtitle={t('zones.subtitle')} />
      <Card>
        <FilterBar onClear={list.resetFilters}>
          <div className="w-full sm:w-64">
            <SearchInput value={list.search} onChange={list.setSearch} placeholder={t('common.searchPlaceholder')} />
          </div>
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
