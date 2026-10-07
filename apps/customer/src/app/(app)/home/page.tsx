'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-provider';
import { useI18n } from '@/i18n/provider';
import { endpoints } from '@/lib/endpoints';
import { useAsync } from '@/lib/use-async';
import { formatDateTime, formatMoney } from '@/lib/format';
import { Card, EmptyState, ErrorState, LoadingState, MetricCard, PageHeader } from '@/components/ui/primitives';
import { StatusBadge } from '@/components/ui/status-badge';
import { Icon } from '@/components/layout/icon';
import { Button } from '@/components/ui/button';

const QUICK = [
  { href: '/orders/new', titleKey: 'cust.quick.new', descKey: 'cust.quick.newDesc', icon: 'route' },
  { href: '/orders?bucket=active', titleKey: 'cust.quick.track', descKey: 'cust.quick.trackDesc', icon: 'map' },
  { href: '/addresses', titleKey: 'cust.quick.addresses', descKey: 'cust.quick.addressesDesc', icon: 'store' },
];

export default function HomePage() {
  const { profile } = useAuth();
  const { t, locale } = useI18n();

  const recent = useAsync((signal) => endpoints.orders({ pageSize: 5 }, signal), []);
  const active = useAsync((signal) => endpoints.orders({ bucket: 'active', pageSize: 1 }, signal), []);
  const done = useAsync((signal) => endpoints.orders({ bucket: 'completed', pageSize: 1 }, signal), []);

  return (
    <div className="space-y-5">
      <PageHeader
        title={`${t('common.welcome')}، ${profile?.fullName ?? ''}`.trim()}
        subtitle={t('cust.hero.subtitle')}
        actions={
          <Link href="/orders/new">
            <Button icon={<Icon name="route" />}>{t('cust.hero.cta')}</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricCard label={t('cust.stats.active')} value={active.data?.meta.total ?? '—'} tone="brand" />
        <MetricCard label={t('cust.stats.delivered')} value={done.data?.meta.total ?? '—'} tone="success" />
        <MetricCard label={t('cust.stats.total')} value={recent.data?.meta.total ?? '—'} tone="info" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {QUICK.map((q) => (
          <Link key={q.href} href={q.href} className="block">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-50/40">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                <Icon name={q.icon} className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-slate-800">{t(q.titleKey)}</span>
                <span className="block text-xs text-slate-500">{t(q.descKey)}</span>
              </span>
            </div>
          </Link>
        ))}
      </div>

      <Card
        title={t('cust.recent')}
        actions={
          <Link href="/orders" className="text-xs font-medium text-ink-700 hover:underline">
            {t('cust.viewAll')}
          </Link>
        }
      >
        {recent.loading ? (
          <LoadingState />
        ) : recent.error ? (
          <ErrorState error={recent.error} onRetry={recent.reload} />
        ) : !recent.data?.items.length ? (
          <EmptyState title={t('cust.orders.empty')} hint={t('cust.orders.emptyDesc')} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent.data.items.map((o) => (
              <li key={o.id}>
                <Link href={`/orders/${o.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-slate-50">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-800" dir="ltr">
                      {o.orderNumber}
                    </span>
                    <span className="block truncate text-xs text-slate-500">{o.dropoffAddress}</span>
                    <span className="block text-[11px] text-slate-400">{formatDateTime(o.createdAt, locale)}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <StatusBadge status={o.status} />
                    <span className="text-xs font-semibold text-slate-700">
                      {formatMoney(o.total, o.currency, locale)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
