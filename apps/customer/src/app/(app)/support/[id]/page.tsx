'use client';

import { FormEvent, useState } from 'react';
import { useParams } from 'next/navigation';
import { useI18n } from '@/i18n/provider';
import { endpoints } from '@/lib/endpoints';
import { useAsync } from '@/lib/use-async';
import { ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { Card, EmptyState, ErrorState, LoadingState, PageHeader } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/ui/field';
import { StatusBadge } from '@/components/ui/status-badge';
import { useToast } from '@/components/ui/toast';

export default function TicketPage() {
  const params = useParams<{ id: string }>();
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const ticket = useAsync((signal) => endpoints.ticket(params.id, signal), [params.id]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    try {
      await endpoints.addTicketMessage(params.id, body.trim());
      setBody('');
      ticket.reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setSending(false);
    }
  }

  if (ticket.loading) return <LoadingState />;
  if (ticket.error) return <ErrorState error={ticket.error} onRetry={ticket.reload} />;
  const tk = ticket.data;
  if (!tk) return <EmptyState />;

  return (
    <div className="space-y-4">
      <PageHeader title={tk.subject} subtitle={<StatusBadge status={tk.status} />} />

      <Card title={t('cust.support.message')}>
        {tk.messages.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="space-y-3">
            {tk.messages.map((m) => (
              <li
                key={m.id}
                className={`rounded-xl px-3 py-2 ${
                  m.senderType === 'customer' ? 'bg-brand-50' : 'bg-slate-100'
                }`}
              >
                <p className="text-sm text-slate-800">{m.body}</p>
                <p className="mt-1 text-[11px] text-slate-400">{formatDateTime(m.createdAt, locale)}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <form onSubmit={onSend} className="flex gap-2">
        <TextInput value={body} onChange={(e) => setBody(e.target.value)} placeholder={t('cust.support.message')} />
        <Button type="submit" loading={sending}>
          {t('cust.support.send')}
        </Button>
      </form>
    </div>
  );
}
