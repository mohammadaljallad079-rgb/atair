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
import { FilterBar } from '@/components/ui/filters';
import { SearchInput, Select } from '@/components/ui/field';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { PermissionGate, RequirePermission } from '@/components/ui/permission-gate';
import type { Payment } from '@/lib/types';

export default function PaymentsPage() {
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  const list = useResourceList<Payment>((query, signal) => endpoints.payments(query), { pageSize: 20 });

  async function markPaid(p: Payment) {
    setBusyId(p.id);
    try {
      await endpoints.markPaymentPaid(p.id);
      notify(t('payments.markPaid'));
      list.reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function refund(p: Payment) {
    setBusyId(p.id);
    try {
      await endpoints.refundPayment(p.id, Number(p.amount));
      notify(t('payments.refund'));
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
          <PermissionGate permission="payments.manage">
            {r.status === 'pending' && (
              <Button size="sm" variant="success" loading={busyId === r.id} onClick={() => markPaid(r)}>
                {t('payments.markPaid')}
              </Button>
            )}
          </PermissionGate>
          <PermissionGate permission="payments.refund">
            {(r.status === 'paid' || r.status === 'partially_refunded') && (
              <Button size="sm" variant="secondary" loading={busyId === r.id} onClick={() => refund(r)}>
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
    </RequirePermission>
  );
}
