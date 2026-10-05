'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { endpoints } from '@/lib/endpoints';
import { useI18n } from '@/i18n/provider';
import { useAsync } from '@/lib/use-async';
import { useToast } from '@/components/ui/toast';
import { formatDateTime } from '@/lib/format';
import { PageHeader, Card, ErrorState, LoadingState } from '@/components/ui/primitives';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/field';

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const { data: ticket, loading, error, reload } = useAsync((s) => endpoints.ticket(id, s), [id]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!ticket) return null;

  async function send() {
    if (!body.trim()) return;
    setSending(true);
    try {
      await endpoints.addTicketMessage(id, body.trim());
      setBody('');
      notify(t('support.messageSent'));
      reload();
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={ticket.subject}
        subtitle={<span className="flex items-center gap-2"><StatusBadge status={ticket.status} /><StatusBadge status={ticket.priority} /></span>}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={t('support.messages')} className="lg:col-span-2">
          {ticket.description && <p className="mb-3 text-sm text-slate-600">{ticket.description}</p>}
          <ul className="space-y-3">
            {ticket.messages.map((m) => (
              <li key={m.id} className={`rounded-lg p-3 text-sm ${m.senderType === 'merchant' ? 'bg-brand-50' : 'bg-slate-50'}`}>
                <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{m.senderType === 'merchant' ? t('merchant.portal') : t('support.title')}</span>
                  <span>{formatDateTime(m.createdAt, locale)}</span>
                </div>
                <p className="text-slate-700">{m.body}</p>
              </li>
            ))}
          </ul>

          <div className="mt-4 space-y-2">
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={t('support.reply')} />
            <div className="flex justify-end">
              <Button loading={sending} disabled={!body.trim()} onClick={send}>{t('support.reply')}</Button>
            </div>
          </div>
        </Card>

        <Card title={t('common.details')}>
          <dl className="space-y-2 text-sm">
            <Row label={t('common.status')} value={<StatusBadge status={ticket.status} />} />
            <Row label={t('support.priority')} value={<StatusBadge status={ticket.priority} />} />
            <Row label={t('support.relatedOrder')} value={ticket.orderId ?? '—'} />
            <Row label={t('common.createdAt')} value={formatDateTime(ticket.createdAt, locale)} />
            <Row label={t('common.updatedAt')} value={formatDateTime(ticket.updatedAt, locale)} />
          </dl>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-slate-800">{value}</dd>
    </div>
  );
}
