'use client';

import { useParams, useRouter } from 'next/navigation';
import { endpoints } from '@/lib/endpoints';
import { useAsync } from '@/lib/use-async';
import { useI18n } from '@/i18n/provider';
import { formatDateTime, formatMoney } from '@/lib/format';
import { PageHeader, Card, ErrorState, LoadingState, EmptyState } from '@/components/ui/primitives';
import { DataTable, Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import type { CustomerDetail } from '@/lib/types';

type OrderRow = NonNullable<CustomerDetail['orders']>[number];

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t, locale } = useI18n();
  const customer = useAsync<CustomerDetail>((signal) => endpoints.customer(id), [id]);

  if (customer.loading) return <LoadingState />;
  if (customer.error) return <Card><ErrorState error={customer.error} onRetry={customer.reload} /></Card>;
  const c = customer.data;
  if (!c) return null;

  const orderColumns: Column<OrderRow>[] = [
    {
      key: 'orderNumber', header: t('orders.number'),
      render: (r) => (
        <button className="font-medium text-ink-700 hover:underline" onClick={() => router.push(`/orders/${r.id}`)}>
          {r.orderNumber}
        </button>
      ),
    },
    { key: 'status', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
    { key: 'paymentStatus', header: t('orders.paymentStatus'), render: (r) => <StatusBadge status={r.paymentStatus} /> },
    { key: 'total', header: t('orders.total'), align: 'end', render: (r) => formatMoney(r.total, r.currency, locale) },
    { key: 'createdAt', header: t('common.createdAt'), render: (r) => formatDateTime(r.createdAt, locale) },
  ];

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

      <Card className="mt-4" title={t('customers.orderHistory')}>
        {c.orders?.length ? (
          <DataTable columns={orderColumns} rows={c.orders} rowKey={(r) => r.id} />
        ) : <EmptyState />}
      </Card>
    </>
  );
}
