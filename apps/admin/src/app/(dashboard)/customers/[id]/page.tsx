'use client';

import { useParams, useRouter } from 'next/navigation';
import { endpoints } from '@/lib/endpoints';
import { useAsync } from '@/lib/use-async';
import { useI18n } from '@/i18n/provider';
import { formatDateTime } from '@/lib/format';
import { PageHeader, Card, ErrorState, LoadingState } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import type { CustomerDetail } from '@/lib/types';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t, locale } = useI18n();
  const customer = useAsync<CustomerDetail>((signal) => endpoints.customer(id), [id]);

  if (customer.loading) return <LoadingState />;
  if (customer.error) return <Card><ErrorState error={customer.error} onRetry={customer.reload} /></Card>;
  const c = customer.data;
  if (!c) return null;

  return (
    <>
      <PageHeader
        title={c.fullName}
        subtitle={<span dir="ltr">{c.phone}</span>}
        actions={<Button variant="ghost" size="sm" onClick={() => router.push('/customers')}>{t('common.close')}</Button>}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t('common.details')}>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">{t('common.status')}</dt><dd><StatusBadge status={c.status} /></dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">{t('customers.email')}</dt><dd>{c.email ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">{t('common.notes')}</dt><dd>{c.notes ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">{t('common.createdAt')}</dt><dd>{formatDateTime(c.createdAt, locale)}</dd></div>
          </dl>
        </Card>
        <Card title={t('customers.addresses')}>
          {c.addresses?.length ? (
            <ul className="divide-y divide-slate-100">
              {c.addresses.map((a) => (
                <li key={a.id} className="py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700">{a.label}</span>
                    {a.isDefault && <StatusBadge status="active" />}
                  </div>
                  <p className="text-xs text-slate-400">{a.address}</p>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-slate-400">{t('common.empty')}</p>}
        </Card>
      </div>
    </>
  );
}
