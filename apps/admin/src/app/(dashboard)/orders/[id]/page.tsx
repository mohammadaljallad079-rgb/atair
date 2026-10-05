'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { endpoints } from '@/lib/endpoints';
import { useAsync } from '@/lib/use-async';
import { useI18n } from '@/i18n/provider';
import { useAuth } from '@/lib/auth-provider';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { formatMoney, formatDateTime, formatDistance } from '@/lib/format';
import { nextOrderStatuses } from '@/lib/constants';
import { PageHeader, Card, ErrorState, LoadingState, MetricCard } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Modal } from '@/components/ui/filters';
import { Field, Select, Textarea } from '@/components/ui/field';
import { PermissionGate } from '@/components/ui/permission-gate';
import type { Driver, OrderDetail } from '@/lib/types';

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-end text-sm text-slate-800">{value}</span>
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const { notify } = useToast();

  const order = useAsync<OrderDetail>((signal) => endpoints.order(id), [id]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [transitionOpen, setTransitionOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [driverId, setDriverId] = useState('');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [nextStatus, setNextStatus] = useState('');
  const [reason, setReason] = useState('');

  const detail = order.data;
  const nextStatuses = useMemo(() => (detail ? nextOrderStatuses(detail.status) : []), [detail]);

  async function openAssign() {
    setAssignOpen(true);
    try {
      const res = await endpoints.drivers({ pageSize: 100, status: 'online' });
      setDrivers(res.items);
    } catch {
      setDrivers([]);
    }
  }

  async function doAssign() {
    if (!driverId) return;
    setBusy(true);
    try {
      await endpoints.assignOrder(id, driverId);
      notify(t('common.save'));
      setAssignOpen(false);
      setDriverId('');
      order.reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function doTransition() {
    if (!nextStatus) return;
    setBusy(true);
    try {
      await endpoints.transitionOrder(id, nextStatus, reason || undefined);
      notify(t('common.save'));
      setTransitionOpen(false);
      setNextStatus('');
      setReason('');
      order.reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function doCancel() {
    setBusy(true);
    try {
      await endpoints.cancelOrder(id, reason || undefined);
      notify(t('common.save'));
      setCancelOpen(false);
      setReason('');
      order.reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function doRedispatch() {
    setBusy(true);
    try {
      await endpoints.redispatch(id);
      notify(t('common.save'));
      order.reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setBusy(false);
    }
  }

  if (order.loading) return <LoadingState />;
  if (order.error) return <Card><ErrorState error={order.error} onRetry={order.reload} /></Card>;
  if (!detail) return null;

  return (
    <>
      <PageHeader
        title={`${t('orders.number')} ${detail.orderNumber}`}
        subtitle={formatDateTime(detail.createdAt, locale)}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => router.push('/orders')}>{t('common.close')}</Button>
            <PermissionGate permission="orders.update">
              {nextStatuses.length > 0 && (
                <Button size="sm" onClick={() => setTransitionOpen(true)}>{t('orders.transition')}</Button>
              )}
            </PermissionGate>
            <PermissionGate permission="orders.assign">
              <Button size="sm" variant="secondary" onClick={openAssign}>{t('orders.assign')}</Button>
            </PermissionGate>
            <PermissionGate permission="dispatch.manage">
              <Button size="sm" variant="secondary" loading={busy} onClick={doRedispatch}>{t('orders.reassign')}</Button>
            </PermissionGate>
            <PermissionGate permission="orders.cancel">
              {detail.status !== 'cancelled' && detail.status !== 'delivered' && (
                <Button size="sm" variant="danger" onClick={() => setCancelOpen(true)}>{t('orders.cancel')}</Button>
              )}
            </PermissionGate>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label={t('orders.total')} value={formatMoney(detail.total, detail.currency, locale)} tone="brand" />
        <MetricCard label={t('orders.distance')} value={formatDistance(detail.distanceKm, locale)} tone="info" />
        <MetricCard label={t('orders.paymentStatus')} value={<StatusBadge status={detail.paymentStatus} />} />
        <MetricCard label={t('common.status')} value={<StatusBadge status={detail.status} />} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title={t('common.details')} className="lg:col-span-2">
          <div className="grid gap-x-6 sm:grid-cols-2">
            <div>
              <InfoRow label={t('orders.customer')} value={detail.customer?.fullName ?? '—'} />
              <InfoRow label={t('customers.phone')} value={detail.customer?.phone ?? '—'} />
              <InfoRow label={t('orders.driver')} value={detail.driver?.fullName ?? '—'} />
              <InfoRow label={t('orders.merchant')} value={detail.merchant?.name ?? '—'} />
              <InfoRow label={t('orders.deliveryType')} value={t(`deliveryType.${detail.deliveryType}`)} />
              <InfoRow label={t('orders.paymentMethod')} value={t(`paymentMethod.${detail.paymentMethod}`)} />
            </div>
            <div>
              <InfoRow label={t('orders.pickup')} value={detail.pickupAddress} />
              <InfoRow label={t('orders.dropoff')} value={detail.dropoffAddress} />
              <InfoRow label={t('orders.scheduled')} value={detail.scheduledPickupAt ? formatDateTime(detail.scheduledPickupAt, locale) : '—'} />
              <InfoRow label={t('common.notes')} value={detail.notes ?? '—'} />
              {detail.cancellationReason && <InfoRow label={t('orders.cancelReason')} value={detail.cancellationReason} />}
            </div>
          </div>
        </Card>

        <Card title={t('orders.financials')}>
          <InfoRow label={t('orders.subtotal')} value={formatMoney(detail.subtotal, detail.currency, locale)} />
          <InfoRow label={t('orders.discount')} value={formatMoney(detail.discountAmount, detail.currency, locale)} />
          <InfoRow label={t('orders.surcharge')} value={formatMoney(detail.surchargeAmount, detail.currency, locale)} />
          <InfoRow label={t('orders.tax')} value={formatMoney(detail.taxAmount, detail.currency, locale)} />
          <InfoRow
            label={t('orders.total')}
            value={<span className="font-bold text-brand-600">{formatMoney(detail.total, detail.currency, locale)}</span>}
          />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title={t('orders.timeline')}>
          <ol className="space-y-3">
            {detail.statusHistory.map((h) => (
              <li key={h.id} className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-ink-500" />
                <div className="text-sm">
                  <div className="flex items-center gap-2">
                    {h.fromStatus && <StatusBadge status={h.fromStatus} />}
                    <span className="text-slate-400">→</span>
                    <StatusBadge status={h.toStatus} />
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">{formatDateTime(h.createdAt, locale)}{h.reason ? ` — ${h.reason}` : ''}</p>
                </div>
              </li>
            ))}
            {!detail.statusHistory.length && <p className="text-sm text-slate-400">{t('common.empty')}</p>}
          </ol>
        </Card>

        <Card title={t('orders.items')}>
          {detail.items.length ? (
            <ul className="divide-y divide-slate-100">
              {detail.items.map((it) => (
                <li key={it.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-slate-700">{it.name} × {it.quantity}</span>
                  <span className="tabular-nums text-slate-600">{formatMoney(it.totalPrice, detail.currency, locale)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">{t('common.empty')}</p>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title={t('orders.assignments')}>
          {detail.assignments.length ? (
            <ul className="space-y-2 text-sm">
              {detail.assignments.map((a) => (
                <li key={a.id} className="flex items-center justify-between">
                  <span className="text-slate-600">{t('dispatch.method')}: {a.method}</span>
                  <StatusBadge status={a.status} />
                  <span className="text-xs text-slate-400">{formatDateTime(a.createdAt, locale)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-slate-400">{t('common.empty')}</p>}
        </Card>
        <Card title={t('orders.proofs')}>
          {detail.deliveryProofs.length ? (
            <ul className="space-y-2 text-sm">
              {detail.deliveryProofs.map((p) => (
                <li key={p.id} className="flex items-center justify-between">
                  <span className="text-slate-600">{p.type}</span>
                  <span className="text-xs text-slate-400">{formatDateTime(p.createdAt, locale)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-slate-400">{t('common.empty')}</p>}
        </Card>
      </div>

      <Modal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title={t('orders.assignDriver')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAssignOpen(false)}>{t('common.cancel')}</Button>
            <Button loading={busy} disabled={!driverId} onClick={doAssign}>{t('common.save')}</Button>
          </>
        }
      >
        <Field label={t('orders.driver')} required>
          <Select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
            <option value="">—</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>{d.fullName} · {d.phone}</option>
            ))}
          </Select>
        </Field>
      </Modal>

      <Modal
        open={transitionOpen}
        onClose={() => setTransitionOpen(false)}
        title={t('orders.transition')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setTransitionOpen(false)}>{t('common.cancel')}</Button>
            <Button loading={busy} disabled={!nextStatus} onClick={doTransition}>{t('common.save')}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label={t('orders.nextStatus')} required>
            <Select value={nextStatus} onChange={(e) => setNextStatus(e.target.value)}>
              <option value="">—</option>
              {nextStatuses.map((s) => (
                <option key={s} value={s}>{t(`status.${s}`)}</option>
              ))}
            </Select>
          </Field>
          <Field label={t('common.reason')}>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        </div>
      </Modal>

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title={t('orders.cancel')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelOpen(false)}>{t('common.cancel')}</Button>
            <Button variant="danger" loading={busy} onClick={doCancel}>{t('orders.cancel')}</Button>
          </>
        }
      >
        <Field label={t('orders.cancelReason')}>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </Modal>
    </>
  );
}
