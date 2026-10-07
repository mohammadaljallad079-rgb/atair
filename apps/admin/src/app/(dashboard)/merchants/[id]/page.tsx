'use client';

import { useParams, useRouter } from 'next/navigation';
import { endpoints } from '@/lib/endpoints';
import { useAsync } from '@/lib/use-async';
import { useI18n } from '@/i18n/provider';
import { PageHeader, Card, ErrorState, LoadingState, MetricCard } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatNumber } from '@/lib/format';
import type { MerchantDetail } from '@/lib/types';

export default function MerchantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t, locale } = useI18n();
  const merchant = useAsync<MerchantDetail>((signal) => endpoints.merchant(id), [id]);

  if (merchant.loading) return <LoadingState />;
  if (merchant.error) return <Card><ErrorState error={merchant.error} onRetry={merchant.reload} /></Card>;
  const m = merchant.data;
  if (!m) return null;

  return (
    <>
      <PageHeader
        title={m.name}
        subtitle={m.category ?? m.slug}
        actions={<Button variant="ghost" size="sm" onClick={() => router.push('/merchants')}>{t('common.close')}</Button>}
      />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <MetricCard label={t('merchants.ordersCount')} value={formatNumber(m.orderCount ?? 0, locale)} />
        <MetricCard label={t('merchants.branches')} value={formatNumber(m.branches?.length ?? 0, locale)} />
        <MetricCard label={t('merchants.commission')} value={m.commissionRate != null ? `${Number(m.commissionRate).toFixed(2)}%` : '—'} tone="brand" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t('common.details')}>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">{t('common.status')}</dt><dd><StatusBadge status={m.status} /></dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">{t('customers.phone')}</dt><dd dir="ltr">{m.phone ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">{t('customers.email')}</dt><dd>{m.email ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">{t('merchants.commission')}</dt><dd>{m.commissionRate != null ? `${Number(m.commissionRate).toFixed(2)}%` : '—'}</dd></div>
          </dl>
        </Card>
        <Card title={t('merchants.branches')}>
          {m.branches?.length ? (
            <ul className="divide-y divide-slate-100">
              {m.branches.map((b) => (
                <li key={b.id} className="py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700">{b.name}</span>
                    <StatusBadge status={b.status} />
                  </div>
                  <p className="text-xs text-slate-400">{b.address}</p>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-slate-400">{t('common.empty')}</p>}
        </Card>
        <Card className="lg:col-span-2" title={t('merchants.team')}>
          {m.users?.length ? (
            <ul className="divide-y divide-slate-100">
              {m.users.map((u) => (
                <li key={u.user.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="text-slate-700">{u.user.fullName}</p>
                    <p className="text-xs text-slate-400" dir="ltr">{u.user.email ?? u.user.phone ?? '—'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{u.role}</span>
                    <StatusBadge status={u.user.status} />
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-slate-400">{t('common.empty')}</p>}
        </Card>
      </div>
    </>
  );
}
