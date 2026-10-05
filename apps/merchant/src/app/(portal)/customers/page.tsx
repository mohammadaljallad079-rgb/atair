'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { endpoints } from '@/lib/endpoints';
import { useI18n } from '@/i18n/provider';
import { useResourceList } from '@/lib/use-resource-list';
import { useToast } from '@/components/ui/toast';
import { formatDate } from '@/lib/format';
import { PageHeader } from '@/components/ui/primitives';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { FilterBar } from '@/components/ui/filters';
import { SearchInput } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/filters';
import { Field, TextInput } from '@/components/ui/field';
import type { MerchantCustomer } from '@/lib/types';

export default function CustomersPage() {
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const router = useRouter();
  const list = useResourceList<MerchantCustomer>((q, s) => endpoints.customers(q, s));

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fullName: '', phone: '', email: '' });

  async function onCreate() {
    setSaving(true);
    try {
      await endpoints.createCustomer({
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
      });
      notify(t('customers.createSuccess'));
      setOpen(false);
      setForm({ fullName: '', phone: '', email: '' });
      list.reload();
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<MerchantCustomer>[] = [
    { key: 'fullName', header: t('customers.name'), render: (r) => <span className="font-medium text-slate-900">{r.fullName}</span> },
    { key: 'phone', header: t('customers.phone'), render: (r) => <span dir="ltr">{r.phone}</span> },
    { key: 'email', header: t('customers.email'), render: (r) => r.email ?? '—' },
    { key: 'orders', header: t('customers.orders'), align: 'center', render: (r) => r._count?.orders ?? 0 },
    { key: 'status', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
    { key: 'createdAt', header: t('common.createdAt'), render: (r) => formatDate(r.createdAt, locale) },
  ];

  return (
    <div>
      <PageHeader
        title={t('customers.title')}
        subtitle={t('customers.subtitle')}
        actions={<Button onClick={() => setOpen(true)}>{t('customers.new')}</Button>}
      />

      <FilterBar onClear={list.resetFilters}>
        <div className="w-64"><SearchInput value={list.search} onChange={list.setSearch} placeholder={t('common.searchPlaceholder')} /></div>
      </FilterBar>

      <DataTable
        columns={columns}
        rows={list.data?.items ?? []}
        rowKey={(r) => r.id}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        onRowClick={(r) => router.push(`/customers/${r.id}`)}
      />
      {list.data && (
        <Pagination page={list.page} pageSize={list.pageSize} total={list.data.meta.total} totalPages={list.data.meta.totalPages} onPageChange={list.setPage} />
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('customers.new')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button loading={saving} disabled={!form.fullName.trim() || !form.phone.trim()} onClick={onCreate}>{t('common.create')}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label={t('customers.name')} required>
            <TextInput value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
          </Field>
          <Field label={t('customers.phone')} required>
            <TextInput value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} dir="ltr" />
          </Field>
          <Field label={t('customers.email')}>
            <TextInput type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} dir="ltr" />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
