'use client';

import { useEffect, useState } from 'react';
import { endpoints } from '@/lib/endpoints';
import { useAsync } from '@/lib/use-async';
import { useI18n } from '@/i18n/provider';
import { formatNumber, formatDateTime } from '@/lib/format';
import { PageHeader, Card, MetricCard, LoadingState, ErrorState, EmptyState } from '@/components/ui/primitives';
import { DataTable, Column } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { RequirePermission } from '@/components/ui/permission-gate';
import { Button } from '@/components/ui/button';
import type { LiveOps } from '@/lib/types';

export default function OperationsPage() {
  const { t, locale } = useI18n();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const ops = useAsync((signal) => endpoints.operations(), []);
  const live = useAsync((signal) => endpoints.liveOps(), []);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      ops.reload();
      live.reload();
      setLastUpdated(new Date());
    }, 15000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh]);

  useEffect(() => {
    if (ops.data || live.data) setLastUpdated(new Date());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ops.data, live.data]);

  const orderCols: Column<LiveOps['activeOrders'][number]>[] = [
    { key: 'orderNumber', header: t('orders.number'), render: (r) => <span className="font-medium text-ink-700">{r.orderNumber}</span> },
    { key: 'status', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
    { key: 'driverId', header: t('orders.driver'), render: (r) => (r.driverId ? r.driverId.slice(0, 8) : t('operations.unassigned')) },
    { key: 'updatedAt', header: t('common.updatedAt'), render: (r) => formatDateTime(r.updatedAt, locale) },
  ];

  const driverCols: Column<LiveOps['drivers'][number]>[] = [
    { key: 'fullName', header: t('drivers.name') },
    { key: 'status', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'location', header: t('zones.center'),
      render: (r) => (r.location ? `${r.location.latitude.toFixed(4)}, ${r.location.longitude.toFixed(4)}` : '—'),
    },
  ];

  return (
    <RequirePermission permission="tracking.view">
      <PageHeader
        title={t('operations.title')}
        subtitle={t('operations.subtitle')}
        actions={
          <>
            {lastUpdated && (
              <span className="text-xs text-slate-400">
                {t('operations.lastUpdated')}: {formatDateTime(lastUpdated, locale)}
              </span>
            )}
            <Button
              size="sm"
              variant={autoRefresh ? 'primary' : 'secondary'}
              onClick={() => setAutoRefresh((v) => !v)}
            >
              {t('operations.autoRefresh')}: {autoRefresh ? t('common.yes') : t('common.no')}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => { ops.reload(); live.reload(); }}>
              {t('common.refresh')}
            </Button>
          </>
        }
      />

      {ops.error ? (
        <Card><ErrorState error={ops.error} onRetry={ops.reload} /></Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <MetricCard label={t('operations.unassigned')} value={formatNumber(ops.data?.unassignedOrders, locale)} tone="danger" />
          <MetricCard label={t('operations.activeOrders')} value={formatNumber(ops.data?.activeOrders, locale)} tone="brand" />
          <MetricCard label={t('operations.available')} value={formatNumber(ops.data?.availableDrivers, locale)} tone="success" />
          <MetricCard label={t('dashboard.onlineDrivers')} value={formatNumber(ops.data?.onlineDrivers, locale)} tone="info" />
          <MetricCard label={t('dashboard.busyDrivers')} value={formatNumber(ops.data?.busyDrivers, locale)} tone="warning" />
          <MetricCard label={t('operations.paused')} value={formatNumber(ops.data?.pausedDrivers, locale)} tone="warning" />
          <MetricCard label={t('operations.suspended')} value={formatNumber(ops.data?.suspendedDrivers, locale)} tone="danger" />
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title={t('operations.activeOrders')}>
          {live.loading ? <LoadingState /> : live.error ? <ErrorState error={live.error} onRetry={live.reload} /> : (
            <DataTable
              columns={orderCols}
              rows={live.data?.activeOrders ?? []}
              rowKey={(r) => r.id}
              emptyTitle={t('common.empty')}
            />
          )}
        </Card>
        <Card title={t('operations.liveDrivers')}>
          {live.loading ? <LoadingState /> : live.error ? <ErrorState error={live.error} onRetry={live.reload} /> : (
            <DataTable
              columns={driverCols}
              rows={live.data?.drivers ?? []}
              rowKey={(r) => r.id}
              emptyTitle={t('common.empty')}
            />
          )}
        </Card>
      </div>

      <Card className="mt-4" title={t('operations.title')}>
        <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 py-10 text-xs text-slate-400">
          {t('operations.mapPlaceholder')}
        </div>
      </Card>
    </RequirePermission>
  );
}
