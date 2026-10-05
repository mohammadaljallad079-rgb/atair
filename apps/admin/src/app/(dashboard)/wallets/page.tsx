'use client';

import { useState } from 'react';
import { endpoints } from '@/lib/endpoints';
import { useAsync } from '@/lib/use-async';
import { useI18n } from '@/i18n/provider';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { formatMoney, formatDateTime } from '@/lib/format';
import { PageHeader, Card, ErrorState, LoadingState, EmptyState } from '@/components/ui/primitives';
import { DataTable, Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/filters';
import { Field, TextInput, Select } from '@/components/ui/field';
import { RequirePermission } from '@/components/ui/permission-gate';
import type { DriverWallet, WalletTransaction } from '@/lib/types';

export default function WalletsPage() {
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const wallets = useAsync(() => endpoints.wallets(), []);

  const [selected, setSelected] = useState<DriverWallet | null>(null);
  const [txs, setTxs] = useState<WalletTransaction[]>([]);
  const [loadingTxs, setLoadingTxs] = useState(false);

  const [adjustFor, setAdjustFor] = useState<DriverWallet | null>(null);
  const [type, setType] = useState<'credit' | 'debit' | 'adjustment'>('credit');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  async function openDetail(w: DriverWallet) {
    setSelected(w);
    setLoadingTxs(true);
    try {
      const full = await endpoints.driverWallet(w.driverId);
      setTxs(full.transactions ?? []);
    } catch {
      setTxs([]);
    } finally {
      setLoadingTxs(false);
    }
  }

  async function doAdjust() {
    if (!adjustFor || !amount) return;
    setBusy(true);
    try {
      await endpoints.adjustWallet(adjustFor.driverId, {
        type,
        amount: Number(amount),
        description: description || undefined,
      });
      notify(t('common.save'));
      setAdjustFor(null);
      setAmount('');
      setDescription('');
      wallets.reload();
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
          <RequirePermission permission="wallets.manage">
            <Button size="sm" onClick={() => setAdjustFor(r)}>{t('wallets.adjust')}</Button>
          </RequirePermission>
        </div>
      ),
    },
  ];

  const txColumns: Column<WalletTransaction>[] = [
    { key: 'createdAt', header: t('common.createdAt'), render: (r) => formatDateTime(r.createdAt, locale) },
    { key: 'type', header: t('wallets.txType'), render: (r) => <span>{r.type}</span> },
    { key: 'amount', header: t('payments.amount'), align: 'end', render: (r) => formatMoney(r.amount, 'SAR', locale) },
    { key: 'balanceAfter', header: t('wallets.balanceAfter'), align: 'end', render: (r) => formatMoney(r.balanceAfter, 'SAR', locale) },
    { key: 'reference', header: t('wallets.reference'), render: (r) => r.reference ?? '—' },
    { key: 'description', header: t('common.notes'), render: (r) => r.description ?? '—' },
  ];

  return (
    <RequirePermission permission="wallets.view">
      <PageHeader title={t('wallets.title')} subtitle={t('wallets.subtitle')} />
      <Card>
        {wallets.error ? <ErrorState error={wallets.error} onRetry={wallets.reload} /> : (
          <DataTable
            columns={columns}
            rows={wallets.data ?? []}
            rowKey={(r) => r.id}
            loading={wallets.loading}
            stickyHeader
          />
        )}
      </Card>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={t('wallets.transactions')} wide>
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
            <Button loading={busy} disabled={!amount} onClick={doAdjust}>{t('common.save')}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label={t('wallets.driver')}>
            <TextInput value={adjustFor?.driver?.fullName ?? ''} disabled />
          </Field>
          <Field label={t('wallets.txType')} required>
            <Select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
              <option value="credit">credit</option>
              <option value="debit">debit</option>
              <option value="adjustment">adjustment</option>
            </Select>
          </Field>
          <Field label={t('payments.amount')} required>
            <TextInput type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} dir="ltr" />
          </Field>
          <Field label={t('common.notes')}>
            <TextInput value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </div>
      </Modal>
    </RequirePermission>
  );
}
