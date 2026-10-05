'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { endpoints } from '@/lib/endpoints';
import { useI18n } from '@/i18n/provider';
import { useAsync } from '@/lib/use-async';
import { useToast } from '@/components/ui/toast';
import { formatMoney, formatDateTime, formatDistance } from '@/lib/format';
import { MERCHANT_CANCELLABLE } from '@/lib/constants';
import { PageHeader, Card, ErrorState, LoadingState } from '@/components/ui/primitives';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/filters';
import { Field, Textarea } from '@/components/ui/field';

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const { data: order, loading, error, reload } = useAsync(
    (s) => endpoints.order(id, s),
    [id],
  );

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!order) return null;

  const canCancel = MERCHANT_CANCELLABLE.includes(order.status);

  async function onCancel() {
    setCancelling(true);
    try {
      await endpoints.cancelOrder(id, reason || undefined);
      notify(t('orders.cancelSuccess'));
      setCancelOpen(false);
      reload();
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={`${t('orders.details')} — ${order.orderNumber}`}
        subtitle={<StatusBadge status={order.status} />}
        actions={canCancel ? (
          <Button variant="danger" onClick={() => setCancelOpen(true)}>{t('orders.cancel')}</Button>
        ) : undefined}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title={t('orders.details')}>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Row label={t('orders.pickup')} value={order.pickupAddress} />
              <Row label={t('orders.dropoff')} value={order.dropoffAddress} />
              <Row label={t('orders.customer')} value={order.customer?.fullName ?? '—'} />
              <Row label={t('orders.driver')} value={order.driver?.fullName ?? '—'} />
              <Row label={t('orders.branch')} value={order.merchantBranch?.name ?? '—'} />
              <Row label={t('orders.distance')} value={formatDistance(order.distanceKm, locale)} />
              <Row label={t('common.createdAt')} value={formatDateTime(order.createdAt, locale)} />
              <Row label={t('orders.deliveryType')} value={t(`deliveryType.${order.deliveryType}`)} />
            </dl>
          </Card>

          <Card title={t('orders.package')}>
            {order.items.length === 0 ? (
              <p className="text-xs text-slate-400">—</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {order.items.map((it) => (
                  <li key={it.id} className="flex justify-between py-2">
                    <span>{it.name} × {it.quantity}</span>
                    <span className="tabular-nums">{formatMoney(it.totalPrice, order.currency, locale)}</span>
                  </li>
                ))}
              </ul>
            )}
            {order.notes && <p className="mt-2 text-xs text-slate-500">{order.notes}</p>}
          </Card>

          <Card title={t('orders.timeline')}>
            <ol className="space-y-3">
              {order.statusHistory.map((h) => (
                <li key={h.id} className="flex gap-3 text-sm">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                  <div>
                    <p className="text-slate-800">{t(`status.${h.toStatus}`)}</p>
                    <p className="text-xs text-slate-400">{formatDateTime(h.createdAt, locale)}{h.reason ? ` — ${h.reason}` : ''}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title={t('orders.stepPayment')}>
            <dl className="space-y-2 text-sm">
              <Row label={t('orders.deliveryFee')} value={formatMoney(order.total, order.currency, locale)} />
              <Row label={t('orders.paymentMethod')} value={t(`paymentMethod.${order.paymentMethod}`)} />
              <Row label={t('orders.paymentStatus')} value={<StatusBadge status={order.paymentStatus} />} />
              <Row label={t('orders.codAmount')} value={formatMoney(order.codAmount, order.currency, locale)} />
              <Row label={t('orders.codStatus')} value={<StatusBadge status={order.codStatus} />} />
              {order.codCollectedAt && <Row label={t('cod.collectedAt')} value={formatDateTime(order.codCollectedAt, locale)} />}
              {order.codSettledAt && <Row label={t('cod.settledAt')} value={formatDateTime(order.codSettledAt, locale)} />}
            </dl>
          </Card>

          {order.deliveryProofs.length > 0 && (
            <Card title={t('orders.details')}>
              <ul className="space-y-2 text-xs">
                {order.deliveryProofs.map((p) => (
                  <li key={p.id} className="flex justify-between">
                    <span>{p.type}</span>
                    <span className="text-slate-400">{formatDateTime(p.createdAt, locale)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        title={t('orders.cancel')}
        message={t('orders.cancelConfirm')}
        confirmLabel={t('orders.cancel')}
        loading={cancelling}
        onConfirm={onCancel}
        onCancel={() => setCancelOpen(false)}
      />
      {cancelOpen && (
        <div className="mt-3 max-w-md">
          <Field label={t('orders.cancelReason')}>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-slate-800">{value}</dd>
    </div>
  );
}
