'use client';

import { useState } from 'react';
import { endpoints } from '@/lib/endpoints';
import { useAsync } from '@/lib/use-async';
import { useI18n } from '@/i18n/provider';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { formatDateTime, formatDistance } from '@/lib/format';
import { PageHeader, Card, ErrorState, EmptyState } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/field';
import { StatusBadge } from '@/components/ui/status-badge';
import { RequirePermission } from '@/components/ui/permission-gate';
import type { DispatchOffer } from '@/lib/types';

export default function DispatchPage() {
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const [orderId, setOrderId] = useState('');
  const [offers, setOffers] = useState<DispatchOffer[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!orderId) return;
    setLoading(true);
    try {
      setOffers(await endpoints.dispatchOffers(orderId));
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }

  async function redispatch() {
    if (!orderId) return;
    setBusy(true);
    try {
      await endpoints.redispatch(orderId);
      notify(t('dispatch.redispatch'));
      load();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <RequirePermission permission="dispatch.view">
      <PageHeader title={t('dispatch.title')} subtitle={t('dispatch.subtitle')} />
      <Card title={t('orders.number')}>
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-full sm:w-80">
            <Field label={t('orders.number')}>
              <TextInput value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="UUID" dir="ltr" />
            </Field>
          </div>
          <Button loading={loading} onClick={load}>{t('common.search')}</Button>
          <RequirePermission permission="dispatch.manage">
            <Button variant="secondary" loading={busy} disabled={!orderId} onClick={redispatch}>
              {t('dispatch.redispatch')}
            </Button>
          </RequirePermission>
        </div>
      </Card>

      <Card className="mt-4" title={t('dispatch.offers')}>
        {offers === null ? (
          <EmptyState hint={t('common.searchPlaceholder')} />
        ) : offers.length ? (
          <ul className="divide-y divide-slate-100">
            {offers.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="text-slate-700">{o.driverId.slice(0, 8)}</span>
                <span className="text-xs text-slate-500">{t('dispatch.method')}: {o.method}</span>
                <span className="text-xs text-slate-500">{formatDistance(o.distanceKm, locale)}</span>
                <StatusBadge status={o.status} />
                <span className="text-xs text-slate-400">{o.respondedAt ? formatDateTime(o.respondedAt, locale) : '—'}</span>
              </li>
            ))}
          </ul>
        ) : <EmptyState />}
      </Card>
    </RequirePermission>
  );
}
