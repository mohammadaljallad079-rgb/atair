'use client';

import { useState } from 'react';
import { endpoints } from '@/lib/endpoints';
import { useAsync } from '@/lib/use-async';
import { useI18n } from '@/i18n/provider';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { formatMoney, formatNumber } from '@/lib/format';
import { PageHeader, Card, ErrorState, LoadingState, EmptyState } from '@/components/ui/primitives';
import { DataTable, Column } from '@/components/ui/data-table';
import { Segmented } from '@/components/ui/filters';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { PermissionGate, RequirePermission } from '@/components/ui/permission-gate';
import type { DriverReportRow, MerchantReportRow } from '@/lib/types';

type Preset = 'today' | 'week' | 'month';
type Tab = 'drivers' | 'merchants';

export default function ReportsPage() {
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const [preset, setPreset] = useState<Preset>('month');
  const [tab, setTab] = useState<Tab>('drivers');
  const [exporting, setExporting] = useState(false);

  const drivers = useAsync<DriverReportRow[]>((signal) => endpoints.driverReport({ preset }), [preset]);
  const merchants = useAsync<MerchantReportRow[]>((signal) => endpoints.merchantReport({ preset }), [preset]);

  async function exportCsv() {
    setExporting(true);
    try {
      const blob = await endpoints.exportOrders({ preset });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders-${preset}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setExporting(false);
    }
  }

  const driverColumns: Column<DriverReportRow>[] = [
    { key: 'fullName', header: t('drivers.name'), render: (r) => <span className="font-medium">{r.fullName}</span> },
    { key: 'status', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
    { key: 'completedInRange', header: t('reports.completedInRange'), align: 'end', render: (r) => formatNumber(r.completedInRange, locale) },
    { key: 'revenueInRange', header: t('reports.revenueInRange'), align: 'end', render: (r) => formatMoney(r.revenueInRange, 'SAR', locale) },
    { key: 'completedOrders', header: t('drivers.completed'), align: 'end', render: (r) => formatNumber(r.completedOrders, locale) },
    { key: 'cancelledOrders', header: t('reports.cancelled'), align: 'end', render: (r) => formatNumber(r.cancelledOrders, locale) },
    { key: 'totalEarnings', header: t('drivers.earnings'), align: 'end', render: (r) => formatMoney(r.totalEarnings, 'SAR', locale) },
  ];

  const merchantColumns: Column<MerchantReportRow>[] = [
    { key: 'name', header: t('merchants.name'), render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'status', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
    { key: 'orders', header: t('reports.orders'), align: 'end', render: (r) => formatNumber(r.orders, locale) },
    { key: 'delivered', header: t('reports.delivered'), align: 'end', render: (r) => formatNumber(r.delivered, locale) },
    { key: 'revenue', header: t('reports.revenue'), align: 'end', render: (r) => formatMoney(r.revenue, 'SAR', locale) },
  ];

  return (
    <RequirePermission permission="reports.view">
      <PageHeader
        title={t('reports.title')}
        subtitle={t('reports.subtitle')}
        actions={
          <PermissionGate permission="reports.export">
            <Button size="sm" variant="secondary" loading={exporting} onClick={exportCsv}>{t('common.exportCsv')}</Button>
          </PermissionGate>
        }
      />

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <Segmented
            value={preset}
            onChange={setPreset}
            options={[
              { value: 'today', label: t('common.today') },
              { value: 'week', label: t('common.week') },
              { value: 'month', label: t('common.month') },
            ]}
          />
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'drivers', label: t('reports.drivers') },
              { value: 'merchants', label: t('reports.merchants') },
            ]}
          />
        </div>

        {tab === 'drivers' ? (
          drivers.loading ? <LoadingState /> : drivers.error ? (
            <ErrorState error={drivers.error} onRetry={drivers.reload} />
          ) : drivers.data?.length ? (
            <DataTable columns={driverColumns} rows={drivers.data} rowKey={(r) => r.id} stickyHeader />
          ) : <EmptyState />
        ) : merchants.loading ? <LoadingState /> : merchants.error ? (
          <ErrorState error={merchants.error} onRetry={merchants.reload} />
        ) : merchants.data?.length ? (
          <DataTable columns={merchantColumns} rows={merchants.data} rowKey={(r) => r.id} stickyHeader />
        ) : <EmptyState />}
      </Card>
    </RequirePermission>
  );
}
