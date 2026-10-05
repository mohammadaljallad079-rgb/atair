'use client';

import { useState } from 'react';
import { endpoints } from '@/lib/endpoints';
import { useI18n } from '@/i18n/provider';
import { useResourceList } from '@/lib/use-resource-list';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/ui/primitives';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/filters';
import { Field, TextInput, Select } from '@/components/ui/field';
import type { MerchantBranch } from '@/lib/types';

interface BranchForm {
  id?: string;
  name: string;
  address: string;
  phone: string;
  latitude: string;
  longitude: string;
  status: 'active' | 'inactive';
}

const EMPTY: BranchForm = { name: '', address: '', phone: '', latitude: '', longitude: '', status: 'active' };

export default function BranchesPage() {
  const { t } = useI18n();
  const { notify } = useToast();
  const list = useResourceList<MerchantBranch>((q, s) => endpoints.branches(q, s));

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<BranchForm>(EMPTY);

  function edit(b: MerchantBranch) {
    setForm({
      id: b.id, name: b.name, address: b.address, phone: b.phone ?? '',
      latitude: b.latitude?.toString() ?? '', longitude: b.longitude?.toString() ?? '', status: b.status,
    });
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    const body = {
      name: form.name.trim(),
      address: form.address.trim(),
      phone: form.phone.trim() || undefined,
      latitude: form.latitude ? Number(form.latitude) : undefined,
      longitude: form.longitude ? Number(form.longitude) : undefined,
      status: form.status,
    };
    try {
      if (form.id) {
        await endpoints.updateBranch(form.id, body);
        notify(t('branches.updateSuccess'));
      } else {
        await endpoints.createBranch(body);
        notify(t('branches.createSuccess'));
      }
      setOpen(false);
      setForm(EMPTY);
      list.reload();
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<MerchantBranch>[] = [
    { key: 'name', header: t('branches.name'), render: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
    { key: 'address', header: t('branches.address') },
    { key: 'phone', header: t('branches.phone'), render: (r) => <span dir="ltr">{r.phone ?? '—'}</span> },
    { key: 'orders', header: t('customers.orders'), align: 'center', render: (r) => r._count?.orders ?? 0 },
    { key: 'status', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: t('common.actions'), align: 'end',
      render: (r) => <Button size="sm" variant="secondary" onClick={() => edit(r)}>{t('common.edit')}</Button>,
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('branches.title')}
        subtitle={t('branches.subtitle')}
        actions={<Button onClick={() => { setForm(EMPTY); setOpen(true); }}>{t('branches.new')}</Button>}
      />

      <DataTable
        columns={columns}
        rows={list.data?.items ?? []}
        rowKey={(r) => r.id}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
      />
      {list.data && (
        <Pagination page={list.page} pageSize={list.pageSize} total={list.data.meta.total} totalPages={list.data.meta.totalPages} onPageChange={list.setPage} />
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={form.id ? t('common.edit') : t('branches.new')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button loading={saving} disabled={!form.name.trim() || !form.address.trim()} onClick={save}>{t('common.save')}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label={t('branches.name')} required>
            <TextInput value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label={t('branches.address')} required>
            <TextInput value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
          </Field>
          <Field label={t('branches.phone')}>
            <TextInput value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} dir="ltr" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('branches.latitude')}>
              <TextInput value={form.latitude} onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))} dir="ltr" />
            </Field>
            <Field label={t('branches.longitude')}>
              <TextInput value={form.longitude} onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))} dir="ltr" />
            </Field>
          </div>
          <Field label={t('common.status')}>
            <Select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as BranchForm['status'] }))}>
              <option value="active">{t('status.active')}</option>
              <option value="inactive">{t('status.inactive')}</option>
            </Select>
          </Field>
        </div>
      </Modal>
    </div>
  );
}
