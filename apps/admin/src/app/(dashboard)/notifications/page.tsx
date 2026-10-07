'use client';

import { useState } from 'react';
import { endpoints } from '@/lib/endpoints';
import { useResourceList } from '@/lib/use-resource-list';
import { useAsync } from '@/lib/use-async';
import { useI18n } from '@/i18n/provider';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { PageHeader, Card, EmptyState, LoadingState } from '@/components/ui/primitives';
import { DataTable, Column } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';
import { FilterBar, Modal } from '@/components/ui/filters';
import { SearchInput, Select, Field, TextInput, Textarea } from '@/components/ui/field';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { PermissionGate, RequirePermission } from '@/components/ui/permission-gate';
import type { Notification, NotificationDetail, NotificationTemplate } from '@/lib/types';

const NOTIFICATION_STATUSES = ['queued', 'sent', 'failed', 'read'] as const;
const NOTIFICATION_CHANNELS = ['push', 'sms', 'email', 'whatsapp', 'in_app'] as const;

export default function NotificationsPage() {
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const list = useResourceList<Notification>((query, signal) => endpoints.notifications(query), { pageSize: 20 });
  const templates = useAsync<NotificationTemplate[]>((signal) => endpoints.notificationTemplates(), []);

  const [sendOpen, setSendOpen] = useState(false);
  const [detail, setDetail] = useState<NotificationDetail | null>(null);
  const [busy, setBusy] = useState(false);

  // send form
  const [templateCode, setTemplateCode] = useState('');
  const [recipientType, setRecipientType] = useState<'user' | 'customer' | 'driver'>('customer');
  const [recipientId, setRecipientId] = useState('');
  const [dataJson, setDataJson] = useState('{}');
  const [sendError, setSendError] = useState<string | null>(null);

  function openSend() {
    setTemplateCode('');
    setRecipientId('');
    setDataJson('{}');
    setSendError(null);
    setSendOpen(true);
  }

  async function doSend() {
    setSendError(null);
    if (!templateCode) return;
    if (!recipientId.trim()) {
      setSendError(t('notifications.recipientRequired'));
      return;
    }
    let parsed: Record<string, unknown> = {};
    try {
      parsed = dataJson.trim() ? JSON.parse(dataJson) : {};
    } catch {
      setSendError('Invalid JSON');
      return;
    }
    setBusy(true);
    try {
      await endpoints.sendNotification({
        templateCode,
        [`${recipientType}Id`]: recipientId.trim(),
        data: parsed,
      });
      notify(t('notifications.created'));
      setSendOpen(false);
      list.reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function openDetail(n: Notification) {
    try {
      setDetail(await endpoints.notification(n.id));
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    }
  }

  async function retry(n: Notification) {
    try {
      await endpoints.retryNotification(n.id);
      notify(t('notifications.retried'));
      list.reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    }
  }

  const columns: Column<Notification>[] = [
    { key: 'title', header: t('notifications.title'), render: (r) => <span className="font-medium">{r.title ?? r.templateCode ?? '—'}</span> },
    { key: 'body', header: t('notifications.body'), render: (r) => <span className="line-clamp-1 max-w-xs">{r.body}</span> },
    { key: 'channel', header: t('notifications.channel'), render: (r) => r.channel },
    { key: 'status', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
    { key: 'recipient', header: t('notifications.recipient'), render: (r) => (r.customerId ? 'customer' : r.driverId ? 'driver' : r.userId ? 'user' : '—') },
    { key: 'createdAt', header: t('common.createdAt'), render: (r) => formatDateTime(r.createdAt, locale) },
    {
      key: 'actions', header: t('common.actions'), align: 'end',
      render: (r) => (
        <div className="flex justify-end gap-1.5">
          <Button size="sm" variant="ghost" onClick={() => openDetail(r)}>{t('common.details')}</Button>
          <PermissionGate permission="notifications.manage">
            {(r.status === 'failed' || r.status === 'queued') && (
              <Button size="sm" variant="secondary" onClick={() => retry(r)}>{t('notifications.retry')}</Button>
            )}
          </PermissionGate>
        </div>
      ),
    },
  ];

  return (
    <RequirePermission permission="notifications.view">
      <PageHeader
        title={t('notifications.title')}
        subtitle={t('notifications.subtitle')}
        actions={
          <PermissionGate permission="notifications.manage">
            <Button size="sm" onClick={openSend}>{t('notifications.send')}</Button>
          </PermissionGate>
        }
      />

      <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">{t('notifications.deliveryNote')}</p>

      <Card>
        <FilterBar onClear={list.resetFilters}>
          <div className="w-full sm:w-64">
            <SearchInput value={list.search} onChange={list.setSearch} placeholder={t('common.searchPlaceholder')} />
          </div>
          <Select
            value={list.filters.status ?? ''}
            onChange={(e) => list.setFilter('status', e.target.value || undefined)}
            className="w-full sm:w-40"
            aria-label={t('common.status')}
          >
            <option value="">{t('common.status')}: {t('common.all')}</option>
            {NOTIFICATION_STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`) || s}</option>)}
          </Select>
          <Select
            value={list.filters.channel ?? ''}
            onChange={(e) => list.setFilter('channel', e.target.value || undefined)}
            className="w-full sm:w-40"
            aria-label={t('notifications.channel')}
          >
            <option value="">{t('notifications.channel')}: {t('common.all')}</option>
            {NOTIFICATION_CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
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

      <Modal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        title={t('notifications.send')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSendOpen(false)}>{t('common.cancel')}</Button>
            <Button loading={busy} disabled={!templateCode} onClick={doSend}>{t('notifications.send')}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label={t('notifications.template')} required>
            <Select value={templateCode} onChange={(e) => setTemplateCode(e.target.value)}>
              <option value="">—</option>
              {(templates.data ?? []).map((tpl) => (
                <option key={tpl.id} value={tpl.code}>{tpl.code} · {tpl.channel} · {tpl.locale}</option>
              ))}
            </Select>
            {!templates.loading && !templates.data?.length && (
              <span className="mt-1 block text-xs text-amber-600">{t('notifications.noTemplates')}</span>
            )}
          </Field>
          <Field label={t('notifications.recipientType')} required>
            <Select value={recipientType} onChange={(e) => setRecipientType(e.target.value as typeof recipientType)}>
              <option value="customer">{t('orders.customer')}</option>
              <option value="driver">{t('notifications.driver')}</option>
              <option value="user">{t('notifications.user')}</option>
            </Select>
          </Field>
          <Field label={`${t('notifications.recipient')} (UUID)`} required error={sendError ?? undefined}>
            <TextInput value={recipientId} onChange={(e) => setRecipientId(e.target.value)} dir="ltr" placeholder="00000000-0000-0000-0000-000000000000" />
          </Field>
          <Field label={t('notifications.data')} hint='e.g. {"orderNumber":"ATA-1"}'>
            <Textarea value={dataJson} onChange={(e) => setDataJson(e.target.value)} className="font-mono text-xs" dir="ltr" />
          </Field>
        </div>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={t('notifications.details')} wide>
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <StatusBadge status={detail.status} />
              <span className="text-xs text-slate-500">{detail.channel} · {detail.templateCode ?? '—'}</span>
            </div>
            <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-slate-700">{detail.body}</p>
            <div>
              <h3 className="mb-1 text-xs font-semibold text-slate-600">{t('notifications.attempts')}</h3>
              {detail.logs?.length ? (
                <ul className="space-y-1">
                  {detail.logs.map((l) => (
                    <li key={l.id} className="flex items-center justify-between border-b border-slate-100 py-1 text-xs">
                      <span>{l.channel} · {l.provider ?? '—'}</span>
                      <StatusBadge status={l.status} />
                      <span className="text-slate-400">{formatDateTime(l.createdAt, locale)}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-xs text-slate-400">{t('common.empty')}</p>}
            </div>
          </div>
        )}
      </Modal>
    </RequirePermission>
  );
}
