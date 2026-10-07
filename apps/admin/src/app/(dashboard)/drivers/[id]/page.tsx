'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { endpoints } from '@/lib/endpoints';
import { useAsync } from '@/lib/use-async';
import { useI18n } from '@/i18n/provider';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { formatMoney, formatNumber, formatDateTime } from '@/lib/format';
import { PageHeader, Card, ErrorState, LoadingState, MetricCard } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Modal, ConfirmDialog } from '@/components/ui/filters';
import { Field, Textarea, Select } from '@/components/ui/field';
import { PermissionGate } from '@/components/ui/permission-gate';
import type { DriverDetail, Vehicle } from '@/lib/types';

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t, locale } = useI18n();
  const { notify } = useToast();

  const driver = useAsync<DriverDetail>((signal) => endpoints.driver(id), [id]);
  const vehicles = useAsync(() => endpoints.vehicles({ pageSize: 100 }), []);

  const [suspendOpen, setSuspendOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [vehicleId, setVehicleId] = useState('');
  const [unassignTarget, setUnassignTarget] = useState<{ vehicleId: string; plate: string } | null>(null);

  async function doSuspend() {
    setBusy(true);
    try {
      await endpoints.suspendDriver(id, reason || undefined);
      notify(t('common.save'));
      setSuspendOpen(false);
      setReason('');
      driver.reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function unsuspend() {
    try {
      await endpoints.unsuspendDriver(id);
      notify(t('common.save'));
      driver.reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    }
  }

  async function toggleAvailability(next: boolean) {
    try {
      await endpoints.setDriverAvailability(id, next);
      notify(t('common.save'));
      driver.reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    }
  }

  async function review(docId: string, status: 'approved' | 'rejected') {
    try {
      await endpoints.reviewDriverDocument(id, docId, status);
      notify(t('common.save'));
      driver.reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    }
  }

  async function assignVehicle() {
    if (!vehicleId) return;
    setBusy(true);
    try {
      await endpoints.assignDriverVehicle(id, vehicleId);
      notify(t('drivers.vehicleAssigned'));
      setVehicleOpen(false);
      setVehicleId('');
      driver.reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function unassignVehicle() {
    if (!unassignTarget) return;
    setBusy(true);
    try {
      await endpoints.unassignDriverVehicle(id, unassignTarget.vehicleId);
      notify(t('drivers.vehicleUnassigned'));
      setUnassignTarget(null);
      driver.reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setBusy(false);
    }
  }

  if (driver.loading) return <LoadingState />;
  if (driver.error) return <Card><ErrorState error={driver.error} onRetry={driver.reload} /></Card>;
  const d = driver.data;
  if (!d) return null;

  return (
    <>
      <PageHeader
        title={d.fullName}
        subtitle={<span dir="ltr">{d.phone}</span>}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => router.push('/drivers')}>{t('common.close')}</Button>
            <PermissionGate permission="drivers.update">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => toggleAvailability(!d.isAvailable)}
                disabled={d.status === 'suspended'}
              >
                {d.isAvailable ? t('drivers.makeUnavailable') : t('drivers.makeAvailable')}
              </Button>
            </PermissionGate>
            <PermissionGate permission="drivers.suspend">
              {d.status === 'suspended' ? (
                <Button variant="success" size="sm" onClick={unsuspend}>{t('drivers.unsuspend')}</Button>
              ) : (
                <Button variant="danger" size="sm" onClick={() => setSuspendOpen(true)}>{t('drivers.suspend')}</Button>
              )}
            </PermissionGate>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label={t('common.status')} value={<StatusBadge status={d.status} />} />
        <MetricCard label={t('drivers.verification')} value={<StatusBadge status={d.verificationStatus} />} />
        <MetricCard label={t('drivers.completed')} value={formatNumber(d.completedOrders, locale)} tone="success" />
        <MetricCard label={t('drivers.earnings')} value={formatMoney(d.totalEarnings, 'SAR', locale)} tone="brand" />
      </div>

      {d.activeAssignment && (
        <Card className="mt-4" title={t('drivers.activeOrder')}>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <button className="font-medium text-ink-700 hover:underline" onClick={() => router.push(`/orders/${d.activeAssignment!.id}`)}>
              {d.activeAssignment.orderNumber}
            </button>
            <StatusBadge status={d.activeAssignment.status} />
            <span>{formatMoney(d.activeAssignment.total, d.activeAssignment.currency, locale)}</span>
            <span className="text-xs text-slate-400">{formatDateTime(d.activeAssignment.createdAt, locale)}</span>
          </div>
        </Card>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title={t('drivers.documents')}>
          {d.documents.length ? (
            <ul className="divide-y divide-slate-100">
              {d.documents.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between gap-2 py-2">
                  <div>
                    <p className="text-sm text-slate-700">{doc.type}</p>
                    <p className="text-xs text-slate-400">
                      {doc.expiresAt ? formatDateTime(doc.expiresAt, locale) : t('common.notAvailable')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={doc.status} />
                    <PermissionGate permission="drivers.verify">
                      {doc.status === 'pending' && (
                        <>
                          <Button size="sm" variant="success" onClick={() => review(doc.id, 'approved')}>{t('drivers.approve')}</Button>
                          <Button size="sm" variant="danger" onClick={() => review(doc.id, 'rejected')}>{t('drivers.reject')}</Button>
                        </>
                      )}
                    </PermissionGate>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-slate-400">{t('common.empty')}</p>}
        </Card>

        <Card
          title={t('vehicles.title')}
          actions={
            <PermissionGate permission="drivers.update">
              <Button size="sm" variant="secondary" onClick={() => setVehicleOpen(true)}>{t('drivers.assignVehicle')}</Button>
            </PermissionGate>
          }
        >
          {d.vehicles.filter((v) => v.isActive).length ? (
            <ul className="divide-y divide-slate-100">
              {d.vehicles.filter((v) => v.isActive).map((v) => (
                <li key={v.vehicleId} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-slate-700">{v.vehicle?.plateNumber ?? v.vehicleId}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{v.vehicle?.make} {v.vehicle?.model}</span>
                    <PermissionGate permission="drivers.update">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setUnassignTarget({ vehicleId: v.vehicleId, plate: v.vehicle?.plateNumber ?? v.vehicleId })}
                      >
                        {t('drivers.unassignVehicle')}
                      </Button>
                    </PermissionGate>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-slate-400">{t('vehicles.noDriver')}</p>}
        </Card>
      </div>

      <Card className="mt-4" title={t('wallets.title')}>
        {d.wallet ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MetricCard label={t('wallets.balance')} value={formatMoney(d.wallet.balance, d.wallet.currency, locale)} tone="brand" />
            <MetricCard label={t('wallets.pending')} value={formatMoney(d.wallet.pending, d.wallet.currency, locale)} tone="warning" />
          </div>
        ) : <p className="text-sm text-slate-400">{t('common.empty')}</p>}
      </Card>

      <Modal
        open={suspendOpen}
        onClose={() => setSuspendOpen(false)}
        title={t('drivers.suspend')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSuspendOpen(false)}>{t('common.cancel')}</Button>
            <Button variant="danger" loading={busy} onClick={doSuspend}>{t('drivers.suspend')}</Button>
          </>
        }
      >
        <Field label={t('drivers.suspendReason')}>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </Modal>

      <Modal
        open={vehicleOpen}
        onClose={() => setVehicleOpen(false)}
        title={t('drivers.assignVehicle')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setVehicleOpen(false)}>{t('common.cancel')}</Button>
            <Button loading={busy} disabled={!vehicleId} onClick={assignVehicle}>{t('common.save')}</Button>
          </>
        }
      >
        <Field label={t('vehicles.title')} hint={t('vehicles.driverHint')}>
          <Select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
            <option value="">{t('common.selectPlaceholder')}</option>
            {vehicles.data?.items.map((v: Vehicle) => (
              <option key={v.id} value={v.id}>{v.plateNumber} — {v.make ?? ''} {v.model ?? ''}</option>
            ))}
          </Select>
        </Field>
      </Modal>

      <ConfirmDialog
        open={!!unassignTarget}
        title={t('drivers.unassignVehicle')}
        message={unassignTarget?.plate ?? ''}
        confirmLabel={t('drivers.unassignVehicle')}
        loading={busy}
        onConfirm={unassignVehicle}
        onCancel={() => setUnassignTarget(null)}
      />
    </>
  );
}
