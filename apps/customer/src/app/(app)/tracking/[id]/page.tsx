'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useI18n } from '@/i18n/provider';
import { endpoints } from '@/lib/endpoints';
import { useAsync } from '@/lib/use-async';
import { formatDateTime } from '@/lib/format';
import { Card, ErrorState, LoadingState, PageHeader } from '@/components/ui/primitives';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/layout/icon';

export default function TrackingPage() {
  const params = useParams<{ id: string }>();
  const { t, locale } = useI18n();
  const tracking = useAsync((signal) => endpoints.orderTracking(params.id, signal), [params.id]);
  const [live, setLive] = useState(false);

  // Poll only while the tab is visible; there is no push channel in this app.
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') tracking.reload();
    }, 15_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);

  if (tracking.loading) return <LoadingState />;
  if (tracking.error) return <ErrorState error={tracking.error} onRetry={tracking.reload} />;
  const snap = tracking.data;
  if (!snap) return <LoadingState />;

  const loc = snap.driverLocation as
    | { latitude: number; longitude: number; recordedAt: string }
    | null;
  const order = snap.order as unknown as { orderNumber: string; status: string; estimatedDurationMin?: number | null };

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('cust.track.title')}
        subtitle={<span dir="ltr">{order.orderNumber}</span>}
        actions={
          <>
            <StatusBadge status={order.status} />
            <Button size="sm" variant={live ? 'success' : 'secondary'} onClick={() => setLive((v) => !v)}>
              {t('common.refresh')}
            </Button>
          </>
        }
      />

      <Card title={t('cust.track.driver')}>
        {!loc ? (
          <p className="py-6 text-center text-sm text-slate-500">{t('cust.track.noLocation')}</p>
        ) : (
          <>
            <div className="flex h-48 items-center justify-center rounded-xl bg-gradient-to-br from-ink-50 to-brand-50">
              <div className="text-center">
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg">
                  <Icon name="map" className="h-5 w-5" />
                </span>
                <p className="mt-2 text-xs text-slate-500">
                  {t('cust.track.lastUpdate')}: {formatDateTime(loc.recordedAt, locale)}
                </p>
                <p className="text-[11px] text-slate-400" dir="ltr">
                  {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                </p>
              </div>
            </div>
            {order.estimatedDurationMin != null && (
              <p className="mt-3 text-center text-sm text-slate-600">
                {t('cust.track.eta')}: {t('cust.track.minutes', { n: order.estimatedDurationMin })}
              </p>
            )}
          </>
        )}
      </Card>

      <Link href={`/orders/${params.id}`}>
        <Button variant="secondary" className="w-full">
          {t('cust.orders.details')}
        </Button>
      </Link>
    </div>
  );
}
