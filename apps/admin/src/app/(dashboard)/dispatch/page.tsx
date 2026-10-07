'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { endpoints } from '@/lib/endpoints';
import { useAsync } from '@/lib/use-async';
import { useI18n } from '@/i18n/provider';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { formatDateTime, formatMoney, formatNumber } from '@/lib/format';
import { PageHeader, Card, ErrorState, LoadingState, EmptyState, MetricCard } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Field, Select, TextInput } from '@/components/ui/field';
import { Modal } from '@/components/ui/filters';
import { StatusBadge } from '@/components/ui/status-badge';
import { PermissionGate, RequirePermission } from '@/components/ui/permission-gate';
import type { DispatchBoard, Driver } from '@/lib/types';

export default function DispatchPage() {
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const router = useRouter();
  const board = useAsync<DispatchBoard>(() => endpoints.dispatchBoard(), []);
  const drivers = useAsync(() => endpoints.drivers({ pageSize: 100 }), []);

  const [assignTarget, setAssignTarget] = useState<DispatchBoard['unassigned'][number] | null>(null);
  const [driverId, setDriverId] = useState('');
  const [busy, setBusy] = useState(false);

  const [offersOrderId, setOffersOrderId] = useState('');
  const [offers, setOffers] = useState<Array<{ id: string; driverId: string; status: string; method: string }> | null>(null);

  async function doAssign() {
    if (!assignTarget || !driverId) return;
    setBusy(true);
    try {
      await endpoints.assignOrder(assignTarget.id, driverId);
      notify(t('dispatch.assignDriver'));
      setAssignTarget(null);
      setDriverId('');
      board.reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function loadOffers() {
    if (!offersOrderId) return;
    setBusy(true);
    try {
      setOffers(await endpoints.dispatchOffers(offersOrderId));
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
      setOffers([]);
    } finally {
      setBusy(false);
    }
  }

  if (board.loading) return <LoadingState />;
  if (board.error) return <Card><ErrorState error={board.error} onRetry={board.reload} /></Card>;
  const b = board.data;
  if (!b) return null;

  return (
    <RequirePermission permission="dispatch.view">
      <PageHeader
        title={t('dispatch.title')}
        subtitle={t('dispatch.subtitle')}
        actions={<Button size="sm" variant="secondary" onClick={board.reload}>{t('common.refresh')}</Button>}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label={t('dispatch.unassigned')} value={formatNumber(b.unassigned.length, locale)} tone="warning" />
        <MetricCard label={t('dispatch.active')} value={formatNumber(b.active.length, locale)} tone="info" />
        <MetricCard label={t('dispatch.availableDrivers')} value={formatNumber(b.availableDrivers.length, locale)} tone="success" />
        <MetricCard label={t('dispatch.busyDrivers')} value={formatNumber(b.busyDrivers.length, locale)} tone="neutral" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t('dispatch.unassigned')}>
          {b.unassigned.length ? (
            <ul className="divide-y divide-slate-100">
              {b.unassigned.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <button className="font-medium text-ink-700 hover:underline" onClick={() => router.push(`/orders/${o.id}`)}>
                    {o.orderNumber}
                  </button>
                  <StatusBadge status={o.status} />
                  <span className="text-xs text-slate-400">{o.pickupAddress} → {o.dropoffAddress}</span>
                  <span className="text-xs text-slate-500">{formatMoney(o.total, o.currency, locale)}</span>
                  <PermissionGate permission="orders.assign">
                    <Button size="sm" onClick={() => setAssignTarget(o)}>{t('dispatch.assignDriver')}</Button>
                  </PermissionGate>
                </li>
              ))}
            </ul>
          ) : <EmptyState title={t('dispatch.noUnassigned')} />}
        </Card>

        <Card title={t('dispatch.active')}>
          {b.active.length ? (
            <ul className="divide-y divide-slate-100">
              {b.active.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <button className="font-medium text-ink-700 hover:underline" onClick={() => router.push(`/orders/${o.id}`)}>
                    {o.orderNumber}
                  </button>
                  <StatusBadge status={o.status} />
                  <span className="text-xs text-slate-500">{o.driver?.fullName ?? '—'}</span>
                  <span className="text-xs text-slate-400">{formatDateTime(o.createdAt, locale)}</span>
                </li>
              ))}
            </ul>
          ) : <EmptyState />}
        </Card>

        <Card title={t('dispatch.availableDrivers')}>
          {b.availableDrivers.length ? (
            <ul className="divide-y divide-slate-100">
              {b.availableDrivers.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-2 text-sm">
                  <button className="text-slate-700 hover:underline" onClick={() => router.push(`/drivers/${d.id}`)}>{d.fullName}</button>
                  <span className="text-xs text-slate-400">{formatNumber(d.completedOrders, locale)} {t('drivers.completed')}</span>
                </li>
              ))}
            </ul>
          ) : <EmptyState />}
        </Card>

        <Card title={t('dispatch.busyDrivers')}>
          {b.busyDrivers.length ? (
            <ul className="divide-y divide-slate-100">
              {b.busyDrivers.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-2 text-sm">
                  <button className="text-slate-700 hover:underline" onClick={() => router.push(`/drivers/${d.id}`)}>{d.fullName}</button>
                  <StatusBadge status={d.status} />
                </li>
              ))}
            </ul>
          ) : <EmptyState />}
        </Card>
      </div>

      <Card className="mt-4" title={t('dispatch.offers')}>
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-full sm:w-80">
            <Field label={t('orders.number')}>
              <TextInput value={offersOrderId} onChange={(e) => setOffersOrderId(e.target.value)} placeholder="UUID" dir="ltr" />
            </Field>
          </div>
          <Button variant="secondary" loading={busy} disabled={!offersOrderId} onClick={loadOffers}>{t('common.search')}</Button>
          <RequirePermission permission="dispatch.manage">
            <Button
              variant="ghost"
              disabled={!offersOrderId}
              onClick={async () => {
                try {
                  await endpoints.redispatch(offersOrderId);
                  notify(t('dispatch.redispatch'));
                  loadOffers();
                } catch (err) {
                  notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
                }
              }}
            >
              {t('dispatch.redispatch')}
            </Button>
          </RequirePermission>
        </div>
        {offers && (
          <ul className="mt-3 divide-y divide-slate-100">
            {offers.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="text-slate-700">{o.driverId.slice(0, 8)}</span>
                <span className="text-xs text-slate-500">{t('dispatch.method')}: {o.method}</span>
                <StatusBadge status={o.status} />
              </li>
            ))}
            {!offers.length && <li className="py-2 text-sm text-slate-400">{t('common.empty')}</li>}
          </ul>
        )}
      </Card>

      <Modal
        open={!!assignTarget}
        onClose={() => setAssignTarget(null)}
        title={t('dispatch.assignDriver')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAssignTarget(null)}>{t('common.cancel')}</Button>
            <Button loading={busy} disabled={!driverId} onClick={doAssign}>{t('common.save')}</Button>
          </>
        }
      >
        <p className="mb-2 text-xs text-slate-500">{assignTarget?.orderNumber}</p>
        <Field label={t('drivers.title')}>
          <Select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
            <option value="">{t('common.selectPlaceholder')}</option>
            {drivers.data?.items.map((d: Driver) => (
              <option key={d.id} value={d.id}>{d.fullName} — {d.phone}</option>
            ))}
          </Select>
        </Field>
      </Modal>
    </RequirePermission>
  );
}
