'use client';

import { useState } from 'react';
import Link from 'next/link';
import { endpoints } from '@/lib/endpoints';
import { useAuth } from '@/lib/auth-provider';
import { useI18n } from '@/i18n/provider';
import { useAsync } from '@/lib/use-async';
import { formatMoney, formatNumber } from '@/lib/format';
import { REPORT_PRESETS } from '@/lib/constants';
import { PageHeader, MetricCard, Card, ErrorState } from '@/components/ui/primitives';
import { Segmented } from '@/components/ui/filters';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/layout/icon';

type Preset = (typeof REPORT_PRESETS)[number];

export default function DashboardPage() {
  const { user, merchant } = useAuth();
  const { t, locale } = useI18n();
  const [preset, setPreset] = useState<Preset>('month');

  const { data, loading, error, reload } = useAsync(
    (signal) => endpoints.dashboard({ preset }, signal),
    [preset],
  );

  const currency = merchant?.currency ?? 'SAR';

  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div>
      <PageHeader
        title={t('dashboard.title')}
        subtitle={t('dashboard.subtitle')}
        actions={
          <>
            <Segmented
              value={preset}
              onChange={setPreset}
              options={REPORT_PRESETS.map((p) => ({ value: p, label: t(`common.${p}`) }))}
            />
            <Link href="/orders/new">
              <Button icon={<Icon name="route" className="h-4 w-4" />}>{t('orders.new')}</Button>
            </Link>
          </>
        }
      />

      <p className="mb-4 text-xs text-slate-400">
        {t('common.welcome')}, {user?.fullName} — {merchant?.merchantName}
      </p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label={t('dashboard.ordersToday')} value={loading ? '…' : formatNumber(data?.orders.total ?? 0, locale)} tone="brand" />
        <MetricCard label={t('dashboard.activeDeliveries')} value={loading ? '…' : formatNumber(data?.orders.active ?? 0, locale)} tone="info" />
        <MetricCard label={t('dashboard.delivered')} value={loading ? '…' : formatNumber(data?.orders.delivered ?? 0, locale)} tone="success" />
        <MetricCard label={t('dashboard.deliverySpend')} value={loading ? '…' : formatMoney(data?.finance.deliverySpend ?? 0, currency, locale)} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label={t('dashboard.pending')} value={loading ? '…' : formatNumber(data?.orders.pending ?? 0, locale)} tone="warning" />
        <MetricCard label={t('dashboard.searchingDriver')} value={loading ? '…' : formatNumber(data?.orders.searchingDriver ?? 0, locale)} tone="info" />
        <MetricCard label={t('dashboard.inTransit')} value={loading ? '…' : formatNumber(data?.orders.inTransit ?? 0, locale)} tone="info" />
        <MetricCard label={t('dashboard.codPending')} value={loading ? '…' : formatMoney(data?.cod.pending ?? 0, currency, locale)} tone="warning" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label={t('dashboard.cancelled')} value={loading ? '…' : formatNumber(data?.orders.cancelled ?? 0, locale)} tone="danger" />
        <MetricCard label={t('dashboard.failed')} value={loading ? '…' : formatNumber(data?.orders.failed ?? 0, locale)} tone="danger" />
        <MetricCard label={t('dashboard.activeBranches')} value={loading ? '…' : formatNumber(data?.branches.active ?? 0, locale)} />
        <MetricCard label={t('dashboard.totalCustomers')} value={loading ? '…' : formatNumber(data?.customers.total ?? 0, locale)} />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <Card title={t('nav.orders')}>
          <div className="flex flex-wrap gap-2">
            <Link href="/orders"><Button variant="secondary" size="sm">{t('orders.title')}</Button></Link>
            <Link href="/cod"><Button variant="secondary" size="sm">{t('cod.title')}</Button></Link>
            <Link href="/reports"><Button variant="secondary" size="sm">{t('reports.title')}</Button></Link>
            <Link href="/support"><Button variant="secondary" size="sm">{t('support.title')}</Button></Link>
          </div>
        </Card>
        <Card title={t('orders.timeline')}>
          <p className="text-xs text-slate-500">{t('dashboard.subtitle')}</p>
        </Card>
      </div>
    </div>
  );
}
