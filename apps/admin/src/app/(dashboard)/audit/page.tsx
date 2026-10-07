'use client';

import { useState } from 'react';
import { endpoints } from '@/lib/endpoints';
import { useResourceList } from '@/lib/use-resource-list';
import { useI18n } from '@/i18n/provider';
import { formatDateTime } from '@/lib/format';
import { PageHeader, Card } from '@/components/ui/primitives';
import { DataTable, Column } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';
import { FilterBar, Segmented, Drawer } from '@/components/ui/filters';
import { SearchInput, TextInput } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { RequirePermission } from '@/components/ui/permission-gate';
import type { ActivityLog, ApiLog, SecurityEvent } from '@/lib/types';

type Tab = 'activity' | 'api' | 'security';

export default function AuditPage() {
  const { t, locale } = useI18n();
  const [tab, setTab] = useState<Tab>('activity');
  const [detail, setDetail] = useState<ActivityLog | null>(null);

  const activity = useResourceList<ActivityLog>((q, s) => endpoints.auditActivity(q), { pageSize: 20 });
  const apiLogs = useResourceList<ApiLog>((q, s) => endpoints.auditApiLogs(q), { pageSize: 20 });
  const security = useResourceList<SecurityEvent>((q, s) => endpoints.auditSecurityEvents(q), { pageSize: 20 });

  const activityCols: Column<ActivityLog>[] = [
    { key: 'createdAt', header: t('common.createdAt'), render: (r) => formatDateTime(r.createdAt, locale) },
    { key: 'action', header: t('audit.action'), render: (r) => <span className="font-medium">{r.action}</span> },
    { key: 'entity', header: t('audit.entity'), render: (r) => r.entity },
    { key: 'entityId', header: t('audit.entityId'), render: (r) => (r.entityId ? <span dir="ltr" className="text-xs">{r.entityId.slice(0, 8)}</span> : '—') },
    { key: 'userId', header: t('audit.actor'), render: (r) => (r.userId ? <span dir="ltr" className="text-xs">{r.userId.slice(0, 8)}</span> : '—') },
    { key: 'ip', header: t('audit.ip'), render: (r) => (r.ip ? <span dir="ltr">{r.ip}</span> : '—') },
    {
      key: 'actions', header: t('common.actions'), align: 'end',
      render: (r) => <Button size="sm" variant="ghost" onClick={() => setDetail(r)}>{t('common.details')}</Button>,
    },
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
          {tab === 'security' && (
            <select
              value={security.filters.severity ?? ''}
              onChange={(e) => security.setFilter('severity', e.target.value || undefined)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm sm:w-40"
              aria-label={t('audit.severity')}
            >
              <option value="">{t('audit.severity')}: {t('common.all')}</option>
              {['info', 'low', 'medium', 'high', 'critical'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          <div className="w-full sm:w-44">
            <TextInput
              type="datetime-local"
              value={active.filters.from ?? ''}
              onChange={(e) => active.setFilter('from', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
              dir="ltr"
              aria-label={t('audit.dateFrom')}
            />
          </div>
          <div className="w-full sm:w-44">
            <TextInput
              type="datetime-local"
              value={active.filters.to ?? ''}
              onChange={(e) => active.setFilter('to', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
              dir="ltr"
              aria-label={t('audit.dateTo')}
            />
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

      <Drawer open={!!detail} onClose={() => setDetail(null)} title={t('common.details')}>
        {detail && (
          <div className="space-y-3 text-sm">
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">{t('audit.readOnly')}</p>
            <div className="grid grid-cols-[7rem_1fr] gap-2">
              <span className="text-slate-500">{t('common.createdAt')}</span>
              <span>{formatDateTime(detail.createdAt, locale)}</span>
              <span className="text-slate-500">{t('audit.action')}</span>
              <span className="font-medium">{detail.action}</span>
              <span className="text-slate-500">{t('audit.entity')}</span>
              <span>{detail.entity}</span>
              <span className="text-slate-500">{t('audit.entityId')}</span>
              <span dir="ltr" className="font-mono text-xs">{detail.entityId ?? '—'}</span>
              <span className="text-slate-500">{t('audit.actor')}</span>
              <span dir="ltr" className="font-mono text-xs">{detail.userId ?? '—'}</span>
              <span className="text-slate-500">{t('audit.ip')}</span>
              <span dir="ltr">{detail.ip ?? '—'}</span>
            </div>
            <div>
              <h3 className="mb-1 text-xs font-semibold text-slate-600">{t('audit.before')}</h3>
              <pre dir="ltr" className="max-h-48 overflow-auto rounded-lg bg-slate-900 p-3 text-[11px] text-slate-100">
                {detail.before ? JSON.stringify(detail.before, null, 2) : '—'}
              </pre>
            </div>
            <div>
              <h3 className="mb-1 text-xs font-semibold text-slate-600">{t('audit.after')}</h3>
              <pre dir="ltr" className="max-h-48 overflow-auto rounded-lg bg-slate-900 p-3 text-[11px] text-slate-100">
                {detail.after ? JSON.stringify(detail.after, null, 2) : '—'}
              </pre>
            </div>
          </div>
        )}
      </Drawer>
    </RequirePermission>
  );
}
