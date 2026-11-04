'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { endpoints } from '@/lib/endpoints';
import { useAsync } from '@/lib/use-async';
import { useI18n } from '@/i18n/provider';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { PageHeader, Card, ErrorState, LoadingState, MetricCard } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Modal } from '@/components/ui/filters';
import { Field, Textarea } from '@/components/ui/field';
import { PermissionGate } from '@/components/ui/permission-gate';
import { formatNumber } from '@/lib/format';
import type { MerchantDetail } from '@/lib/types';

export default function MerchantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const merchant = useAsync<MerchantDetail>((signal) => endpoints.merchant(id), [id]);

  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
      notify(t('common.save'));
      merchant.reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setBusy(false);
    }
  }

  if (merchant.loading) return <LoadingState />;
  if (merchant.error) return <Card><ErrorState error={merchant.error} onRetry={merchant.reload} /></Card>;
  const m = merchant.data;
  if (!m) return null;

  const canApprove = m.approvalStatus === 'pending' || m.approvalStatus === 'rejected';
  const canSuspend = m.status === 'active' && m.approvalStatus === 'approved';

  return (
    <>
      <PageHeader
        title={m.name}
        subtitle={m.category ?? m.slug}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => router.push('/merchants')}>{t('common.close')}</Button>
            <PermissionGate permission="merchants.update">
              {canApprove && (
                <>
                  <Button variant="success" size="sm" loading={busy} onClick={() => run(() => endpoints.approveMerchant(id))}>
                    {t('merchants.approve')}
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setRejectOpen(true)}>{t('merchants.reject')}</Button>
                </>
              )}
              {canSuspend && (
                <Button variant="danger" size="sm" onClick={() => setSuspendOpen(true)}>{t('merchants.suspend')}</Button>
              )}
              {m.status === 'suspended' && (
                <Button variant="success" size="sm" loading={busy} onClick={() => run(() => endpoints.reactivateMerchant(id))}>
                  {t('merchants.reactivate')}
                </Button>
              )}
            </PermissionGate>
          </>
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label={t('merchants.approvalStatus')} value={<StatusBadge status={m.approvalStatus} />} />
        <MetricCard label={t('merchants.ordersCount')} value={formatNumber(m.orderCount ?? 0, locale)} />
        <MetricCard label={t('merchants.branches')} value={formatNumber(m.branches?.length ?? 0, locale)} />
        <MetricCard label={t('merchants.commission')} value={m.commissionRate != null ? `${Number(m.commissionRate).toFixed(2)}%` : '—'} tone="brand" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t('common.details')}>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">{t('common.status')}</dt><dd><StatusBadge status={m.status} /></dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">{t('merchants.ownerName')}</dt><dd>{m.ownerName ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">{t('customers.phone')}</dt><dd dir="ltr">{m.phone ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">{t('customers.email')}</dt><dd>{m.email ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">{t('merchants.commercialReg')}</dt><dd dir="ltr">{m.commercialReg ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">{t('merchants.vatNumber')}</dt><dd dir="ltr">{m.vatNumber ?? '—'}</dd></div>
            {m.source && <div className="flex justify-between"><dt className="text-slate-500">{t('merchants.source')}</dt><dd>{t(`source.${m.source}`)}</dd></div>}
            {m.rejectionReason && (
              <div className="flex justify-between"><dt className="text-slate-500">{t('merchants.rejectReason')}</dt><dd className="text-rose-600">{m.rejectionReason}</dd></div>
            )}
          </dl>
        </Card>

        <Card title={t('merchants.documents')}>
          {m.documents?.length ? (
            <ul className="divide-y divide-slate-100">
              {m.documents.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between gap-2 py-2">
                  <div>
                    <p className="text-sm text-slate-700">{doc.type}</p>
                    <p className="text-xs text-slate-400">{doc.number ?? '—'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={doc.status} />
                    <PermissionGate permission="merchants.update">
                      {doc.status === 'pending' && (
                        <>
                          <Button size="sm" variant="success" onClick={() => run(() => endpoints.reviewMerchantDocument(id, doc.id, 'approved'))}>
                            {t('merchants.approve')}
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => run(() => endpoints.reviewMerchantDocument(id, doc.id, 'rejected'))}>
                            {t('merchants.reject')}
                          </Button>
                        </>
                      )}
                    </PermissionGate>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-slate-400">{t('common.empty')}</p>}
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

        <Card title={t('merchants.team')}>
          {m.users?.length ? (
            <ul className="divide-y divide-slate-100">
              {m.users.map((u) => (
                <li key={u.user.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="text-slate-700">{u.user.fullName}</p>
                    <p className="text-xs text-slate-400" dir="ltr">{u.user.username ?? u.user.email ?? u.user.phone ?? '—'}</p>
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

      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title={t('merchants.reject')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectOpen(false)}>{t('common.cancel')}</Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={() => run(async () => {
                await endpoints.rejectMerchant(id, rejectReason || undefined);
                setRejectOpen(false);
              })}
            >
              {t('merchants.reject')}
            </Button>
          </>
        }
      >
        <Field label={t('merchants.rejectReason')}>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
        </Field>
      </Modal>

      <Modal
        open={suspendOpen}
        onClose={() => setSuspendOpen(false)}
        title={t('merchants.suspend')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSuspendOpen(false)}>{t('common.cancel')}</Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={() => run(async () => {
                await endpoints.suspendMerchant(id, suspendReason || undefined);
                setSuspendOpen(false);
              })}
            >
              {t('merchants.suspend')}
            </Button>
          </>
        }
      >
        <Field label={t('common.reason')}>
          <Textarea value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} />
        </Field>
      </Modal>
    </>
  );
}
