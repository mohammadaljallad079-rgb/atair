'use client';

import { useState } from 'react';
import { endpoints } from '@/lib/endpoints';
import { useResourceList } from '@/lib/use-resource-list';
import { useI18n } from '@/i18n/provider';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { formatMoney, formatDateTime } from '@/lib/format';
import { PAYMENT_STATUSES, PAYMENT_METHODS } from '@/lib/constants';
import { PageHeader, Card } from '@/components/ui/primitives';
import { DataTable, Column } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';
import { FilterBar, Modal, ConfirmDialog } from '@/components/ui/filters';
import { SearchInput, Select, Field, TextInput } from '@/components/ui/field';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { PermissionGate, RequirePermission } from '@/components/ui/permission-gate';
import type { Payment } from '@/lib/types';

export default function PaymentsPage() {
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  const list = useResourceList<Payment>((query, signal) => endpoints.payments(query), { pageSize: 20 });

  const [detail, setDetail] = useState<Payment | null>(null);
  const [refundFor, setRefundFor] = useState<Payment | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundError, setRefundError] = useState<string | null>(null);
  const [markPaidFor, setMarkPaidFor] = useState<Payment | null>(null);

  function remainingOf(p: Payment) {
    return Math.max(0, Number(p.amount) - Number(p.refundedAmount));
  }

  function openRefund(p: Payment) {
    setRefundFor(p);
    setRefundAmount(remainingOf(p).toFixed(2));
    setRefundReason('');
    setRefundError(null);
  }

  async function doRefund() {
    if (!refundFor) return;
    setRefundError(null);
    const value = Number(refundAmount);
    if (!value || value <= 0) {
      setRefundError(t('common.required'));
      return;
    }
    if (value > remainingOf(refundFor)) {
      setRefundError(t('payments.overRefund'));
      return;
    }
    if (!refundReason.trim()) {
      setRefundError(t('payments.refundReasonRequired'));
      return;
    }
    setBusyId(refundFor.id);
    try {
      await endpoints.refundPayment(refundFor.id, value, refundReason.trim());
      notify(t('payments.refund'));
      setRefundFor(null);
      list.reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function doMarkPaid() {
    if (!markPaidFor) return;
    setBusyId(markPaidFor.id);
    try {
      await endpoints.markPaymentPaid(markPaidFor.id);
      notify(t('payments.markPaid'));
      setMarkPaidFor(null);
      list.reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setBusyId(null);
    }
  }

  const columns: Column<Payment>[] = [
    { key: 'order', header: t('payments.order'), render: (r) => r.order?.orderNumber ?? '—' },
    { key: 'customer', header: t('orders.customer'), render: (r) => r.customer?.fullName ?? '—' },
    { key: 'amount', header: t('payments.amount'), align: 'end', render: (r) => <span className="font-medium">{formatMoney(r.amount, r.currency, locale)}</span> },
    { key: 'method', header: t('payments.method'), render: (r) => t(`paymentMethod.${r.method}`) },
    { key: 'status', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
    { key: 'providerRef', header: t('payments.reference'), render: (r) => (r.providerRef ? <span dir="ltr" className="text-xs">{r.providerRef}</span> : '—') },
    { key: 'refundedAmount', header: t('payments.refunded'), align: 'end', render: (r) => formatMoney(r.refundedAmount, r.currency, locale) },
    { key: 'createdAt', header: t('common.createdAt'), render: (r) => formatDateTime(r.createdAt, locale) },
    {
      key: 'actions', header: t('common.actions'), align: 'end',
      render: (r) => (
        <div className="flex justify-end gap-1.5">
          <Button size="sm" variant="ghost" onClick={() => setDetail(r)}>{t('common.details')}</Button>
          <PermissionGate permission="payments.manage">
            {r.status === 'pending' && (
              <Button size="sm" variant="success" loading={busyId === r.id} onClick={() => setMarkPaidFor(r)}>
                {t('payments.markPaid')}
              </Button>
            )}
          </PermissionGate>
          <PermissionGate permission="payments.refund">
            {(r.status === 'paid' || r.status === 'partially_refunded') && remainingOf(r) > 0 && (
              <Button size="sm" variant="secondary" onClick={() => openRefund(r)}>
                {t('payments.refund')}
              </Button>
            )}
          </PermissionGate>
        </div>
      ),
    },
  ];

  return (
    <RequirePermission permission="payments.view">
      <PageHeader title={t('payments.title')} subtitle={t('payments.subtitle')} />
      <Card>
        <FilterBar onClear={list.resetFilters}>
          <div className="w-full sm:w-56">
            <SearchInput value={list.search} onChange={list.setSearch} placeholder={t('common.searchPlaceholder')} />
          </div>
          <Select
            value={list.filters.status ?? ''}
            onChange={(e) => list.setFilter('status', e.target.value || undefined)}
            className="w-full sm:w-40"
            aria-label={t('common.status')}
          >
            <option value="">{t('common.status')}: {t('common.all')}</option>
            {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
          </Select>
          <Select
            value={list.filters.method ?? ''}
            onChange={(e) => list.setFilter('method', e.target.value || undefined)}
            className="w-full sm:w-40"
            aria-label={t('payments.method')}
          >
            <option value="">{t('payments.method')}: {t('common.all')}</option>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{t(`paymentMethod.${m}`)}</option>)}
          </Select>
        </FilterBar>
        <DataTable
          columns={columns}
          rows={list.data?.items ?? []}
          rowKey={(r) => r.id}
          loading={list.loading}
          error={list.error}
          onRetry={list.reload}
          stickyHeader
        />
        {list.data && (
          <Pagination
            page={list.data.meta.page}
            pageSize={list.data.meta.pageSize}
            total={list.data.meta.total}
            totalPages={list.data.meta.totalPages}
            onPageChange={list.setPage}
          />
        )}
      </Card>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={t('payments.details')} wide>
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <span className="text-slate-500">{t('payments.order')}</span>
              <span>{detail.order?.orderNumber ?? '—'}</span>
              <span className="text-slate-500">{t('orders.customer')}</span>
              <span>{detail.customer?.fullName ?? '—'}</span>
              <span className="text-slate-500">{t('payments.amount')}</span>
              <span>{formatMoney(detail.amount, detail.currency, locale)}</span>
              <span className="text-slate-500">{t('payments.remaining')}</span>
              <span>{formatMoney(String(remainingOf(detail)), detail.currency, locale)}</span>
              <span className="text-slate-500">{t('payments.provider')}</span>
              <span dir="ltr">{detail.provider ?? '—'}</span>
              <span className="text-slate-500">{t('payments.reference')}</span>
              <span dir="ltr">{detail.providerRef ?? '—'}</span>
              <span className="text-slate-500">{t('common.status')}</span>
              <span><StatusBadge status={detail.status} /></span>
            </div>
            <div>
              <h3 className="mb-1 text-xs font-semibold text-slate-600">{t('payments.refundHistory')}</h3>
              {detail.refunds?.length ? (
                <ul className="space-y-1">
                  {detail.refunds.map((rf) => (
                    <li key={rf.id} className="flex items-center justify-between border-b border-slate-100 py-1 text-xs">
                      <span>{formatMoney(rf.amount, detail.currency, locale)}</span>
                      <span className="text-slate-500">{rf.reason ?? '—'}</span>
                      <StatusBadge status={rf.status} />
                      <span className="text-slate-400">{formatDateTime(rf.createdAt, locale)}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-xs text-slate-400">{t('payments.noRefunds')}</p>}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!refundFor}
        onClose={() => setRefundFor(null)}
        title={t('payments.refund')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRefundFor(null)}>{t('common.cancel')}</Button>
            <Button variant="danger" loading={busyId === refundFor?.id} onClick={doRefund}>{t('payments.refund')}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label={t('payments.amount')} required hint={`${t('payments.remaining')}: ${refundFor ? formatMoney(String(remainingOf(refundFor)), refundFor.currency, locale) : '—'}`}>
            <TextInput type="number" min="0" step="0.01" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} dir="ltr" />
          </Field>
          <Field label={t('payments.refundReason')} required error={refundError ?? undefined}>
            <TextInput value={refundReason} onChange={(e) => setRefundReason(e.target.value)} />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!markPaidFor}
        title={t('payments.markPaid')}
        message={t('payments.markPaidConfirm')}
        tone="primary"
        loading={busyId === markPaidFor?.id}
        onConfirm={doMarkPaid}
        onCancel={() => setMarkPaidFor(null)}
      />
    </RequirePermission>
  );
}
