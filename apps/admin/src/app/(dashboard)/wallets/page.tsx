'use client';

import { useState } from 'react';
import { endpoints } from '@/lib/endpoints';
import { useResourceList } from '@/lib/use-resource-list';
import { useI18n } from '@/i18n/provider';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { formatMoney, formatDateTime } from '@/lib/format';
import { PageHeader, Card, ErrorState, LoadingState, EmptyState } from '@/components/ui/primitives';
import { DataTable, Column } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';
import { FilterBar, Modal } from '@/components/ui/filters';
import { SearchInput, Field, TextInput, Select } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { PermissionGate, RequirePermission } from '@/components/ui/permission-gate';
import type { DriverWallet, WalletTransaction } from '@/lib/types';

type AdjustType = 'credit' | 'debit' | 'payout' | 'adjustment';

export default function WalletsPage() {
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const list = useResourceList<DriverWallet>((query, signal) => endpoints.wallets(query), { pageSize: 20 });

  const [selected, setSelected] = useState<DriverWallet | null>(null);
  const [txs, setTxs] = useState<WalletTransaction[]>([]);
  const [loadingTxs, setLoadingTxs] = useState(false);

  const [adjustFor, setAdjustFor] = useState<DriverWallet | null>(null);
  const [type, setType] = useState<AdjustType>('credit');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function openDetail(w: DriverWallet) {
    setSelected(w);
    setLoadingTxs(true);
    try {
      const full = await endpoints.driverWallet(w.driverId, { pageSize: 100 });
      setTxs(full.transactions ?? []);
    } catch {
      setTxs([]);
    } finally {
      setLoadingTxs(false);
    }
  }

  function openAdjust(w: DriverWallet) {
    setAdjustFor(w);
    setType('credit');
    setAmount('');
    setReason('');
    setAdjustError(null);
  }

  async function doAdjust() {
    if (!adjustFor) return;
    setAdjustError(null);
    const value = Number(amount);
    if (!value || value <= 0) {
      setAdjustError(t('common.required'));
      return;
    }
    if (!reason.trim()) {
      setAdjustError(t('wallets.reasonRequired'));
      return;
    }
    setBusy(true);
    try {
      await endpoints.adjustWallet(adjustFor.driverId, { type, amount: value, reason: reason.trim() });
      notify(t('common.save'));
      setAdjustFor(null);
      list.reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setBusy(false);
    }
  }

  const columns: Column<DriverWallet>[] = [
    { key: 'driver', header: t('wallets.driver'), render: (r) => <span className="font-medium">{r.driver?.fullName ?? r.driverId.slice(0, 8)}</span> },
    { key: 'balance', header: t('wallets.balance'), align: 'end', render: (r) => <span className="font-semibold text-brand-600">{formatMoney(r.balance, r.currency, locale)}</span> },
    { key: 'pending', header: t('wallets.pending'), align: 'end', render: (r) => formatMoney(r.pending, r.currency, locale) },
    { key: 'updatedAt', header: t('common.updatedAt'), render: (r) => formatDateTime(r.updatedAt, locale) },
    {
      key: 'actions', header: t('common.actions'), align: 'end',
      render: (r) => (
        <div className="flex justify-end gap-1.5">
          <Button size="sm" variant="secondary" onClick={() => openDetail(r)}>{t('common.details')}</Button>
          <PermissionGate permission="wallets.manage">
            <Button size="sm" onClick={() => openAdjust(r)}>{t('wallets.adjust')}</Button>
          </PermissionGate>
        </div>
      ),
    },
  ];

  const txColumns: Column<WalletTransaction>[] = [
    { key: 'createdAt', header: t('common.createdAt'), render: (r) => formatDateTime(r.createdAt, locale) },
    { key: 'type', header: t('wallets.txType'), render: (r) => t(`wallets.type.${r.type}`) },
    { key: 'amount', header: t('payments.amount'), align: 'end', render: (r) => formatMoney(r.amount, 'SAR', locale) },
    { key: 'balanceAfter', header: t('wallets.balanceAfter'), align: 'end', render: (r) => formatMoney(r.balanceAfter, 'SAR', locale) },
    { key: 'reference', header: t('wallets.reference'), render: (r) => r.reference ?? '—' },
    { key: 'description', header: t('common.notes'), render: (r) => r.description ?? '—' },
  ];

  return (
    <RequirePermission permission="wallets.view">
      <PageHeader title={t('wallets.title')} subtitle={t('wallets.subtitle')} />
      <Card>
        <FilterBar onClear={list.resetFilters}>
          <div className="w-full sm:w-64">
            <SearchInput value={list.search} onChange={list.setSearch} placeholder={t('common.searchPlaceholder')} />
          </div>
        </FilterBar>
        {list.error ? <ErrorState error={list.error} onRetry={list.reload} /> : (
          <DataTable
            columns={columns}
            rows={list.data?.items ?? []}
            rowKey={(r) => r.id}
            loading={list.loading}
            stickyHeader
          />
        )}
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

      <Modal open={!!selected} onClose={() => setSelected(null)} title={t('wallets.ledger')} wide>
        {loadingTxs ? <LoadingState /> : txs.length ? (
          <DataTable columns={txColumns} rows={txs} rowKey={(r) => r.id} />
        ) : <EmptyState />}
      </Modal>

      <Modal
        open={!!adjustFor}
        onClose={() => setAdjustFor(null)}
        title={t('wallets.adjust')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdjustFor(null)}>{t('common.cancel')}</Button>
            <Button loading={busy} disabled={!amount || !reason.trim()} onClick={doAdjust}>{t('common.save')}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">{t('wallets.adjustHint')}</p>
          <Field label={t('wallets.driver')}>
            <TextInput value={adjustFor?.driver?.fullName ?? ''} disabled />
          </Field>
          <Field label={t('wallets.txType')} required>
            <Select value={type} onChange={(e) => setType(e.target.value as AdjustType)}>
              <option value="credit">{t('wallets.type.credit')}</option>
              <option value="debit">{t('wallets.type.debit')}</option>
              <option value="payout">{t('wallets.type.payout')}</option>
              <option value="adjustment">{t('wallets.type.adjustment')}</option>
            </Select>
          </Field>
          <Field label={t('payments.amount')} required>
            <TextInput type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} dir="ltr" />
          </Field>
          <Field label={t('wallets.reason')} required error={adjustError ?? undefined}>
            <TextInput value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        </div>
      </Modal>
    </RequirePermission>
  );
}
