'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { endpoints } from '@/lib/endpoints';
import { useAsync } from '@/lib/use-async';
import { useI18n } from '@/i18n/provider';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { TICKET_STATUSES } from '@/lib/constants';
import { PageHeader, Card, ErrorState, LoadingState } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Select, Textarea } from '@/components/ui/field';
import { StatusBadge } from '@/components/ui/status-badge';
import { PermissionGate } from '@/components/ui/permission-gate';
import type { SupportTicketDetail } from '@/lib/types';

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const ticket = useAsync<SupportTicketDetail>((signal) => endpoints.ticket(id), [id]);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!reply.trim()) return;
    setBusy(true);
    try {
      await endpoints.addTicketMessage(id, reply.trim());
      setReply('');
      notify(t('common.save'));
      ticket.reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(status: string) {
    try {
      await endpoints.setTicketStatus(id, status);
      notify(t('common.save'));
      ticket.reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    }
  }

  if (ticket.loading) return <LoadingState />;
  if (ticket.error) return <Card><ErrorState error={ticket.error} onRetry={ticket.reload} /></Card>;
  const tk = ticket.data;
  if (!tk) return null;

  return (
    <>
      <PageHeader
        title={tk.subject}
        subtitle={<StatusBadge status={tk.status} />}
        actions={<Button variant="ghost" size="sm" onClick={() => router.push('/support')}>{t('common.close')}</Button>}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" title={t('support.messages')}>
          <ul className="space-y-3">
            {tk.messages.map((m) => (
              <li key={m.id} className="rounded-lg bg-slate-50 p-3">
                <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                  <span>{m.senderType}</span>
                  <span>{formatDateTime(m.createdAt, locale)}</span>
                </div>
                <p className="text-sm text-slate-700">{m.body}</p>
              </li>
            ))}
            {!tk.messages.length && <p className="text-sm text-slate-400">{t('common.empty')}</p>}
          </ul>
          <div className="mt-4">
            <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder={t('support.replyPlaceholder')} />
            <div className="mt-2 flex justify-end">
              <PermissionGate permission="support.manage">
                <Button size="sm" loading={busy} disabled={!reply.trim()} onClick={send}>{t('support.reply')}</Button>
              </PermissionGate>
            </div>
          </div>
        </Card>

        <Card title={t('common.details')}>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">{t('support.priority')}</dt><dd><StatusBadge status={tk.priority} /></dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">{t('common.createdAt')}</dt><dd>{formatDateTime(tk.createdAt, locale)}</dd></div>
          </dl>
          <PermissionGate permission="support.manage">
            <div className="mt-4">
              <Select value={tk.status} onChange={(e) => setStatus(e.target.value)} aria-label={t('common.status')}>
                {TICKET_STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
              </Select>
            </div>
          </PermissionGate>
        </Card>
      </div>
    </>
  );
}
