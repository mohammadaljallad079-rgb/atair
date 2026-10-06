'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/i18n/provider';
import { endpoints } from '@/lib/endpoints';
import { useResourceList } from '@/lib/use-resource-list';
import { ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import type { CustomerTicket } from '@/lib/types';
import { Card, EmptyState, ErrorState, LoadingState, PageHeader } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Field, TextInput, Textarea } from '@/components/ui/field';
import { StatusBadge } from '@/components/ui/status-badge';
import { useToast } from '@/components/ui/toast';

export default function SupportPage() {
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const list = useResourceList<CustomerTicket>((query, signal) => endpoints.tickets(query, signal));
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!subject.trim()) return;
    setSaving(true);
    try {
      await endpoints.createTicket({ subject: subject.trim(), description: description.trim() || undefined });
      notify(t('cust.support.new'), 'success');
      setSubject('');
      setDescription('');
      list.reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t('cust.support.title')} />

      <Card title={t('cust.support.new')}>
        <form onSubmit={onSubmit} className="space-y-3">
          <Field label={t('cust.support.subject')} required>
            <TextInput value={subject} onChange={(e) => setSubject(e.target.value)} required />
          </Field>
          <Field label={t('cust.support.message')}>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <Button type="submit" loading={saving}>
            {t('cust.support.new')}
          </Button>
        </form>
      </Card>

      <Card>
        {list.loading ? (
          <LoadingState />
        ) : list.error ? (
          <ErrorState error={list.error} onRetry={list.reload} />
        ) : !list.data?.items.length ? (
          <EmptyState title={t('cust.support.empty')} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {list.data.items.map((tk) => (
              <li key={tk.id}>
                <Link href={`/support/${tk.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-slate-50">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-800">{tk.subject}</span>
                    <span className="block text-[11px] text-slate-400">{formatDateTime(tk.createdAt, locale)}</span>
                  </span>
                  <StatusBadge status={tk.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
