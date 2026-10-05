'use client';

import { useState } from 'react';
import { endpoints } from '@/lib/endpoints';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/provider';
import { useAsync } from '@/lib/use-async';
import { useToast } from '@/components/ui/toast';
import { formatMoney, formatNumber, formatDate } from '@/lib/format';
import { REPORT_PRESETS } from '@/lib/constants';
import { PageHeader, Card, MetricCard, ErrorState } from '@/components/ui/primitives';
import { Segmented } from '@/components/ui/filters';
import { Button } from '@/components/ui/button';
import { LineChart, BarChart } from '@/components/charts/charts';

type PresetType = (typeof REPORT_PRESETS)[number];

export default function ReportsPage() {
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const [preset, setPreset] = useState<PresetType>('month');
  const [exporting, setExporting] = useState<string | null>(null);

  const summary = useAsync((s) => endpoints.reportSummary({ preset }, s), [preset]);
  const byStatus = useAsync((s) => endpoints.reportOrdersByStatus({ preset }, s), [preset]);
  const timeseries = useAsync((s) => endpoints.reportTimeseries({ preset, bucket: 'day' }, s), [preset]);
  const byBranch = useAsync((s) => endpoints.reportBranches({ preset }, s), [preset]);

  if (summary.error) return <ErrorState error={summary.error} onRetry={summary.reload} />;

  async function doExport(resource: string) {
    setExporting(resource);
    try {
      await api.downloadCsv('/merchant/export', { resource, preset }, `${resource}-${preset}.csv`);
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setExporting(null);
    }
  }

  return (
    <div>
      <PageHeader
        title={t('reports.title')}
        subtitle={t('reports.subtitle')}
        actions={<Segmented value={preset} onChange={setPreset} options={REPORT_PRESETS.map((p) => ({ value: p, label: t(`common.${p}`) }))} />}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label={t('orders.title')} value={formatNumber(summary.data?.orders.total ?? 0, locale)} tone="brand" />
        <MetricCard label={t('dashboard.delivered')} value={formatNumber(summary.data?.orders.delivered ?? 0, locale)} tone="success" />
        <MetricCard label={t('reports.avgCost')} value={formatMoney(summary.data?.finance.averageDeliveryCost ?? 0, 'SAR', locale)} />
        <MetricCard label={t('reports.codCollected')} value={formatMoney(summary.data?.finance.codCollected ?? 0, 'SAR', locale)} tone="info" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title={t('reports.timeseries')}>
          <LineChart
            data={(timeseries.data ?? []).map((p) => ({ label: formatDate(p.bucket, locale), value: p.orders }))}
          />
        </Card>
        <Card title={t('reports.ordersByStatus')}>
          <BarChart
            data={(byStatus.data ?? []).map((p) => ({ label: t(`status.${p.status}`), value: p.count }))}
          />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title={t('reports.branches')}>
          <BarChart
            data={(byBranch.data ?? []).map((p) => ({ label: p.name, value: p.orders }))}
          />
        </Card>
        <Card title={t('reports.export')}>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" loading={exporting === 'orders'} onClick={() => doExport('orders')}>{t('reports.exportOrders')}</Button>
            <Button variant="secondary" size="sm" loading={exporting === 'payments'} onClick={() => doExport('payments')}>{t('reports.exportPayments')}</Button>
            <Button variant="secondary" size="sm" loading={exporting === 'cod'} onClick={() => doExport('cod')}>{t('reports.exportCod')}</Button>
            <Button variant="secondary" size="sm" loading={exporting === 'settlements'} onClick={() => doExport('settlements')}>{t('reports.exportSettlements')}</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
