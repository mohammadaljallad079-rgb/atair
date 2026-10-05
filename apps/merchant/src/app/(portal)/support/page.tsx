'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { endpoints } from '@/lib/endpoints';
import { useI18n } from '@/i18n/provider';
import { useResourceList } from '@/lib/use-resource-list';
import { useToast } from '@/components/ui/toast';
import { formatDateTime } from '@/lib/format';
import { PageHeader } from '@/components/ui/primitives';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { FilterBar } from '@/components/ui/filters';
import { SearchInput, Select } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/filters';
import { Field, TextInput, Textarea } from '@/components/ui/field';
import type { MerchantTicket } from '@/lib/types';

const TICKET_STATUSES = ['open', 'pending', 'resolved', 'closed'] as const;
const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

export default function SupportPage() {
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const router = useRouter();
  const list = useResourceList<MerchantTicket>((q, s) => endpoints.tickets(q, s));

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ subject: '', description: '', priority: 'normal', orderId: '' });

  async function create() {
    setSaving(true);
    try {
      await endpoints.createTicket({
        subject: form.subject.trim(),
        description: form.description.trim() || undefined,
        priority: form.priority,
        orderId: form.orderId.trim() || undefined,
      });
      notify(t('support.createSuccess'));
      setOpen(false);
      setForm({ subject: '', description: '', priority: 'normal', orderId: '' });
      list.reload();
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<MerchantTicket>[] = [
    { key: 'subject', header: t('support.subject'), render: (r) => <span className="font-medium text-slate-900">{r.subject}</span> },
    { key: 'priority', header: t('support.priority'), render: (r) => <StatusBadge status={r.priority} /> },
    { key: 'status', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
    { key: 'messages', header: t('support.messages'), align: 'center', render: (r) => r._count?.messages ?? 0 },
    { key: 'updatedAt', header: t('common.updatedAt'), render: (r) => formatDateTime(r.updatedAt, locale) },
  ];

  return (
    <div>
      <PageHeader
        title={t('support.title')}
        subtitle={t('support.subtitle')}
        actions={<Button onClick={() => setOpen(true)}>{t('support.new')}</Button>}
      />

      <FilterBar onClear={list.resetFilters}>
        <div className="w-56"><SearchInput value={list.search} onChange={list.setSearch} placeholder={t('common.searchPlaceholder')} /></div>
        <div className="w-40">
          <Select value={list.filters.status ?? ''} onChange={(e) => list.setFilter('status', e.target.value || undefined)}>
            <option value="">{t('common.all')}</option>
            {TICKET_STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
          </Select>
        </div>
      </FilterBar>

      <DataTable
        columns={columns}
        rows={list.data?.items ?? []}
        rowKey={(r) => r.id}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        onRowClick={(r) => router.push(`/support/${r.id}`)}
      />
      {list.data && (
        <Pagination page={list.page} pageSize={list.pageSize} total={list.data.meta.total} totalPages={list.data.meta.totalPages} onPageChange={list.setPage} />
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('support.new')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button loading={saving} disabled={!form.subject.trim()} onClick={create}>{t('common.create')}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label={t('support.subject')} required>
            <TextInput value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
          </Field>
          <Field label={t('support.description')}>
            <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </Field>
          <Field label={t('support.priority')}>
            <Select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{t(`status.${p}`)}</option>)}
            </Select>
          </Field>
          <Field label={t('support.relatedOrder')} hint={t('support.orderIdHint')}>
            <TextInput value={form.orderId} onChange={(e) => setForm((f) => ({ ...f, orderId: e.target.value }))} dir="ltr" />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
