'use client';

import { endpoints } from '@/lib/endpoints';
import { useResourceList } from '@/lib/use-resource-list';
import { useI18n } from '@/i18n/provider';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { PageHeader, Card } from '@/components/ui/primitives';
import { DataTable, Column } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';
import { FilterBar } from '@/components/ui/filters';
import { SearchInput } from '@/components/ui/field';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { PermissionGate, RequirePermission } from '@/components/ui/permission-gate';
import type { Notification } from '@/lib/types';

export default function NotificationsPage() {
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const list = useResourceList<Notification>((query, signal) => endpoints.notifications(query), { pageSize: 20 });

  async function markRead(n: Notification) {
    try {
      await endpoints.markNotificationRead(n.id);
      notify(t('notifications.markRead'));
      list.reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    }
  }

  const columns: Column<Notification>[] = [
    { key: 'title', header: t('notifications.title'), render: (r) => <span className="font-medium">{r.title ?? r.templateCode ?? '—'}</span> },
    { key: 'body', header: t('notifications.body'), render: (r) => <span className="line-clamp-1 max-w-xs">{r.body}</span> },
    { key: 'channel', header: t('notifications.channel'), render: (r) => r.channel },
    { key: 'status', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
    { key: 'createdAt', header: t('common.createdAt'), render: (r) => formatDateTime(r.createdAt, locale) },
    {
      key: 'actions', header: t('common.actions'), align: 'end',
      render: (r) => (
        <PermissionGate permission="notifications.view">
          {!r.readAt && (
            <Button size="sm" variant="secondary" onClick={() => markRead(r)}>{t('notifications.markRead')}</Button>
          )}
        </PermissionGate>
      ),
    },
  ];

  return (
    <RequirePermission permission="notifications.view">
      <PageHeader title={t('notifications.title')} subtitle={t('notifications.subtitle')} />
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
