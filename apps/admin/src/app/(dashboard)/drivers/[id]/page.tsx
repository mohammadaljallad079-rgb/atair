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
import { Modal } from '@/components/ui/filters';
import { Field, Textarea } from '@/components/ui/field';
import { PermissionGate } from '@/components/ui/permission-gate';
import type { DriverDetail } from '@/lib/types';

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t, locale } = useI18n();
  const { notify } = useToast();

  const driver = useAsync<DriverDetail>((signal) => endpoints.driver(id), [id]);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

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

  async function review(docId: string, status: 'approved' | 'rejected') {
    try {
      await endpoints.reviewDriverDocument(id, docId, status);
      notify(t('common.save'));
      driver.reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
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
            <PermissionGate permission="drivers.suspend">
              {d.status !== 'suspended' && (
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

        <Card title={t('vehicles.title')}>
          {d.vehicles.length ? (
            <ul className="divide-y divide-slate-100">
              {d.vehicles.map((v) => (
                <li key={v.vehicleId} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-slate-700">{v.vehicle?.plateNumber ?? v.vehicleId}</span>
                  <span className="text-xs text-slate-400">{v.vehicle?.make} {v.vehicle?.model}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-slate-400">{t('common.empty')}</p>}
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
    </>
  );
}
