'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useI18n } from '@/i18n/provider';
import { endpoints } from '@/lib/endpoints';
import { useAsync } from '@/lib/use-async';
import { ApiError } from '@/lib/api';
import { formatDateTime, formatDistance, formatMoney } from '@/lib/format';
import { Card, EmptyState, ErrorState, LoadingState, PageHeader } from '@/components/ui/primitives';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Field, Textarea } from '@/components/ui/field';
import { useToast } from '@/components/ui/toast';
import { Icon } from '@/components/layout/icon';

const CANCELLABLE = ['pending', 'confirmed', 'searching_driver', 'assigned', 'driver_arriving'];

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-end text-sm font-medium text-slate-800">{value}</span>
    </div>
  );
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const order = useAsync((signal) => endpoints.order(params.id, signal), [params.id]);
  const [reason, setReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  async function onCancel() {
    if (!window.confirm(t('cust.orders.cancelConfirm'))) return;
    setCancelling(true);
    try {
      await endpoints.cancelOrder(params.id, reason.trim() || undefined);
      notify(t('cust.orders.cancelSuccess'), 'success');
      order.reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setCancelling(false);
    }
  }

  if (order.loading) return <LoadingState />;
  if (order.error) return <ErrorState error={order.error} onRetry={order.reload} />;
  const o = order.data;
  if (!o) return <EmptyState />;

  const breakdown = (o.priceBreakdown as { breakdown?: Array<{ label: string; amount: number }> } | null)?.breakdown;
  const canCancel = CANCELLABLE.includes(o.status);

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('cust.orders.details')}
        subtitle={<span dir="ltr">{o.orderNumber}</span>}
        actions={
          <>
            <Link href={`/tracking/${o.id}`}>
              <Button variant="secondary" size="sm" icon={<Icon name="map" />}>
                {t('cust.orders.track')}
              </Button>
            </Link>
            <StatusBadge status={o.status} />
          </>
        }
      />

      <Card title={t('cust.orders.details')}>
        <Row label={t('cust.new.pickup')} value={o.pickupAddress} />
        <Row label={t('cust.new.dropoff')} value={o.dropoffAddress} />
        {o.distanceKm && <Row label={t('common.status')} value={formatDistance(o.distanceKm, locale)} />}
        {o.estimatedDurationMin != null && (
          <Row label={t('cust.track.eta')} value={t('cust.track.minutes', { n: o.estimatedDurationMin })} />
        )}
        {o.scheduledPickupAt && (
          <Row label={t('cust.new.scheduledAt')} value={formatDateTime(o.scheduledPickupAt, locale)} />
        )}
        {o.notes && <Row label={t('cust.new.notes')} value={o.notes} />}
        {o.cancellationReason && <Row label={t('cust.orders.cancelReason')} value={o.cancellationReason} />}
      </Card>

      {o.driver && (
        <Card title={t('cust.track.driver')}>
          <Row label={t('cust.track.driver')} value={o.driver.fullName} />
          {o.driver.phone && <Row label={t('cust.new.recipientPhone')} value={<span dir="ltr">{o.driver.phone}</span>} />}
          {o.vehicle && (
            <Row
              label={t('common.status')}
              value={<span dir="ltr">{[o.vehicle.make, o.vehicle.model, o.vehicle.plateNumber].filter(Boolean).join(' ')}</span>}
            />
          )}
        </Card>
      )}

      {o.items.length > 0 && (
        <Card title={t('cust.orders.items')}>
          <ul className="divide-y divide-slate-100">
            {o.items.map((it) => (
              <li key={it.id} className="flex items-center justify-between gap-3 py-2">
                <span className="text-sm text-slate-700">
                  {it.name} <span className="text-xs text-slate-400">×{it.quantity}</span>
                </span>
                <span className="text-sm font-medium text-slate-800">{formatMoney(it.totalPrice, o.currency, locale)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title={t('cust.orders.breakdown')}>
        {breakdown?.length ? (
          breakdown.map((b, i) => <Row key={i} label={b.label} value={formatMoney(b.amount, o.currency, locale)} />)
        ) : null}
        <Row label={t('common.total')} value={<span className="text-base font-bold">{formatMoney(o.total, o.currency, locale)}</span>} />
        <Row label={t('cust.new.paymentMethod')} value={t(`cust.pay.${o.paymentMethod}`) || o.paymentMethod} />
        {Number(o.codAmount) > 0 && (
          <Row label={t('cust.new.codAmount')} value={formatMoney(o.codAmount, o.currency, locale)} />
        )}
      </Card>

      <Card title={t('cust.orders.timeline')}>
        {o.statusHistory.length === 0 ? (
          <EmptyState />
        ) : (
          <ol className="relative space-y-4 ps-4">
            <span className="absolute inset-y-1 start-1 w-px bg-slate-200" aria-hidden />
            {o.statusHistory.map((h) => (
              <li key={h.id} className="relative">
                <span className="absolute -start-3 top-1.5 h-2.5 w-2.5 rounded-full bg-brand-500 ring-2 ring-white" aria-hidden />
                <p className="text-sm font-medium text-slate-800">{t(`status.${h.toStatus}`)}</p>
                <p className="text-[11px] text-slate-400">{formatDateTime(h.createdAt, locale)}</p>
              </li>
            ))}
          </ol>
        )}
      </Card>

      {canCancel && (
        <Card title={t('cust.orders.cancel')}>
          <Field label={t('cust.orders.cancelReason')}>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <div className="mt-3">
            <Button variant="danger" loading={cancelling} onClick={onCancel}>
              {t('cust.orders.cancel')}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
