'use client';

import { useMemo, useState } from 'react';
import { endpoints } from '@/lib/endpoints';
import { useAsync } from '@/lib/use-async';
import { useI18n } from '@/i18n/provider';
import { formatMoney, formatNumber } from '@/lib/format';
import { PageHeader, Card, MetricCard, ErrorState } from '@/components/ui/primitives';
import { Segmented } from '@/components/ui/filters';
import { LineChart, BarChart } from '@/components/charts/charts';
import { RequirePermission } from '@/components/ui/permission-gate';
import { formatDate } from '@/lib/format';

type Preset = 'today' | 'week' | 'month';

export default function DashboardPage() {
  const { t, locale } = useI18n();
  const [preset, setPreset] = useState<Preset>('week');

  const summary = useAsync((signal) => endpoints.dashboard({ preset }), [preset]);
  const series = useAsync((signal) => endpoints.timeseries({ preset, bucket: 'day' }), [preset]);
  const byStatus = useAsync((signal) => endpoints.ordersByStatus({ preset }), [preset]);

  const ordersSeries = useMemo(
    () => (series.data ?? []).map((p) => ({ label: formatDate(p.bucket, locale), value: p.orders })),
    [series.data, locale],
  );
  const revenueSeries = useMemo(
    () => (series.data ?? []).map((p) => ({ label: formatDate(p.bucket, locale), value: p.revenue })),
    [series.data, locale],
  );
  const statusSeries = useMemo(
    () => (byStatus.data ?? []).map((p) => ({ label: t(`status.${p.status}`), value: p.count })),
    [byStatus.data, t],
  );

  return (
    <RequirePermission permission="reports.view">
      <PageHeader
        title={t('dashboard.title')}
        subtitle={t('dashboard.subtitle')}
        actions={
          <Segmented
            value={preset}
            onChange={setPreset}
            options={[
              { value: 'today', label: t('dashboard.range.today') },
              { value: 'week', label: t('dashboard.range.week') },
              { value: 'month', label: t('dashboard.range.month') },
            ]}
          />
        }
      />

      {summary.error ? (
        <Card><ErrorState error={summary.error} onRetry={summary.reload} /></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <MetricCard label={t('dashboard.totalOrders')} value={formatNumber(summary.data?.orders.total, locale)} tone="brand" />
            <MetricCard label={t('dashboard.activeOrders')} value={formatNumber(summary.data?.orders.active, locale)} tone="info" />
            <MetricCard label={t('dashboard.completedOrders')} value={formatNumber(summary.data?.orders.completed, locale)} tone="success" />
            <MetricCard label={t('dashboard.pendingOrders')} value={formatNumber(summary.data?.orders.pending, locale)} tone="warning" />
            <MetricCard label={t('dashboard.cancelledOrders')} value={formatNumber(summary.data?.orders.cancelled, locale)} tone="danger" />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <MetricCard label={t('dashboard.onlineDrivers')} value={formatNumber(summary.data?.drivers.online, locale)} tone="success" />
            <MetricCard label={t('dashboard.busyDrivers')} value={formatNumber(summary.data?.drivers.busy, locale)} tone="warning" />
            <MetricCard label={t('dashboard.revenue')} value={formatMoney(summary.data?.finance.revenue, 'SAR', locale)} tone="brand" />
            <MetricCard label={t('dashboard.pendingPayments')} value={formatMoney(summary.data?.finance.pendingPayments, 'SAR', locale)} tone="danger" />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card title={t('dashboard.ordersTrend')}>
              <LineChart data={ordersSeries} color="#f97316" />
            </Card>
            <Card title={t('dashboard.revenueTrend')}>
              <LineChart
                data={revenueSeries}
                color="#2563eb"
                valueFormatter={(v) => formatMoney(v, 'SAR', locale)}
              />
            </Card>
            <Card title={t('dashboard.ordersByStatus')}>
              <BarChart data={statusSeries} color="#1e40af" />
            </Card>
            <Card title={t('dashboard.commission')}>
              <div className="grid grid-cols-2 gap-3">
                <MetricCard label={t('dashboard.commission')} value={formatMoney(summary.data?.finance.platformCommission, 'SAR', locale)} tone="info" />
                <MetricCard label={t('dashboard.driverEarnings')} value={formatMoney(summary.data?.finance.driverEarnings, 'SAR', locale)} tone="success" />
              </div>
            </Card>
          </div>
        </>
      )}
    </RequirePermission>
  );
}
