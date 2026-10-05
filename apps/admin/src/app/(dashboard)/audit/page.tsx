'use client';

import { useState } from 'react';
import { endpoints } from '@/lib/endpoints';
import { useResourceList } from '@/lib/use-resource-list';
import { useI18n } from '@/i18n/provider';
import { formatDateTime } from '@/lib/format';
import { PageHeader, Card } from '@/components/ui/primitives';
import { DataTable, Column } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';
import { FilterBar, Segmented } from '@/components/ui/filters';
import { SearchInput } from '@/components/ui/field';
import { StatusBadge } from '@/components/ui/status-badge';
import { RequirePermission } from '@/components/ui/permission-gate';
import type { ActivityLog, ApiLog, SecurityEvent } from '@/lib/types';

type Tab = 'activity' | 'api' | 'security';

export default function AuditPage() {
  const { t, locale } = useI18n();
  const [tab, setTab] = useState<Tab>('activity');

  const activity = useResourceList<ActivityLog>((q, s) => endpoints.auditActivity(q), { pageSize: 20 });
  const apiLogs = useResourceList<ApiLog>((q, s) => endpoints.auditApiLogs(q), { pageSize: 20 });
  const security = useResourceList<SecurityEvent>((q, s) => endpoints.auditSecurityEvents(q), { pageSize: 20 });

  const activityCols: Column<ActivityLog>[] = [
    { key: 'createdAt', header: t('common.createdAt'), render: (r) => formatDateTime(r.createdAt, locale) },
    { key: 'action', header: t('audit.action'), render: (r) => <span className="font-medium">{r.action}</span> },
    { key: 'entity', header: t('audit.entity'), render: (r) => r.entity },
    { key: 'entityId', header: 'Entity ID', render: (r) => (r.entityId ? <span dir="ltr" className="text-xs">{r.entityId.slice(0, 8)}</span> : '—') },
    { key: 'ip', header: t('audit.ip'), render: (r) => (r.ip ? <span dir="ltr">{r.ip}</span> : '—') },
  ];

  const apiCols: Column<ApiLog>[] = [
    { key: 'createdAt', header: t('common.createdAt'), render: (r) => formatDateTime(r.createdAt, locale) },
    { key: 'method', header: t('audit.method'), render: (r) => <span className="font-mono text-xs">{r.method}</span> },
    { key: 'path', header: t('audit.path'), render: (r) => <span dir="ltr" className="font-mono text-xs">{r.path}</span> },
    { key: 'statusCode', header: t('audit.statusCode'), align: 'end', render: (r) => (
      <span className={r.statusCode >= 400 ? 'font-semibold text-red-600' : 'text-green-600'}>{r.statusCode}</span>
    ) },
    { key: 'durationMs', header: t('audit.duration'), align: 'end', render: (r) => r.durationMs },
    { key: 'ip', header: t('audit.ip'), render: (r) => (r.ip ? <span dir="ltr">{r.ip}</span> : '—') },
  ];

  const securityCols: Column<SecurityEvent>[] = [
    { key: 'createdAt', header: t('common.createdAt'), render: (r) => formatDateTime(r.createdAt, locale) },
    { key: 'type', header: t('audit.action'), render: (r) => <span className="font-medium">{r.type}</span> },
    { key: 'severity', header: t('audit.severity'), render: (r) => <StatusBadge status={r.severity} /> },
    { key: 'ip', header: t('audit.ip'), render: (r) => (r.ip ? <span dir="ltr">{r.ip}</span> : '—') },
  ];

  const active = tab === 'activity' ? activity : tab === 'api' ? apiLogs : security;

  return (
    <RequirePermission permission="audit.view">
      <PageHeader title={t('audit.title')} subtitle={t('audit.subtitle')} />
      <Card>
        <div className="mb-3">
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'activity', label: t('audit.activity') },
              { value: 'api', label: t('audit.apiLogs') },
              { value: 'security', label: t('audit.security') },
            ]}
          />
        </div>
        <FilterBar onClear={active.resetFilters}>
          <div className="w-full sm:w-64">
            <SearchInput value={active.search} onChange={active.setSearch} placeholder={t('common.searchPlaceholder')} />
          </div>
        </FilterBar>
        {tab === 'activity' && (
          <DataTable
            columns={activityCols}
            rows={activity.data?.items ?? []}
            rowKey={(r) => r.id}
            loading={activity.loading}
            error={activity.error}
            onRetry={activity.reload}
            stickyHeader
          />
        )}
        {tab === 'api' && (
          <DataTable
            columns={apiCols}
            rows={apiLogs.data?.items ?? []}
            rowKey={(r) => r.id}
            loading={apiLogs.loading}
            error={apiLogs.error}
            onRetry={apiLogs.reload}
            stickyHeader
          />
        )}
        {tab === 'security' && (
          <DataTable
            columns={securityCols}
            rows={security.data?.items ?? []}
            rowKey={(r) => r.id}
            loading={security.loading}
            error={security.error}
            onRetry={security.reload}
            stickyHeader
          />
        )}
        {active.data && (
          <Pagination
            page={active.data.meta.page}
            pageSize={active.data.meta.pageSize}
            total={active.data.meta.total}
            totalPages={active.data.meta.totalPages}
            onPageChange={active.setPage}
          />
        )}
      </Card>
    </RequirePermission>
  );
}
