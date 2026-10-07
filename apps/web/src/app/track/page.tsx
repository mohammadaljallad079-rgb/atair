'use client';

import { FormEvent, Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useI18n } from '@/i18n/provider';
import { endpoints, TrackingSnapshot } from '@/lib/endpoints';
import { ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { Section, Card } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/field';

const MILESTONES = [
  'created',
  'confirmed',
  'searching',
  'assigned',
  'pickup',
  'picked_up',
  'in_transit',
  'arriving',
  'delivered',
];

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === 'delivered'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'cancelled' || status === 'failed_delivery' || status === 'returned'
        ? 'bg-red-50 text-red-700'
        : 'bg-ink-50 text-ink-700';
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{status}</span>;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-end text-sm text-slate-800">{value}</span>
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<Section><div className="mx-auto max-w-3xl text-sm text-slate-500">{'…'}</div></Section>}>
      <TrackInner />
    </Suspense>
  );
}

function TrackInner() {
  const { t, locale } = useI18n();
  const params = useSearchParams();
  const [code, setCode] = useState('');
  const [snapshot, setSnapshot] = useState<TrackingSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(
    async (value: string) => {
      const clean = value.trim();
      if (!clean) return;
      setLoading(true);
      setError(null);
      setSnapshot(null);
      try {
        setSnapshot(await endpoints.track(clean));
      } catch (err) {
        if (err instanceof ApiError && err.isNotFound) setError(t('track.notFound'));
        else setError(err instanceof ApiError ? err.message : t('common.error'));
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    const initial = params.get('code');
    if (initial) {
      setCode(initial);
      void lookup(initial);
    }
  }, [params, lookup]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void lookup(code);
  }

  const activeIndex = snapshot ? MILESTONES.indexOf(snapshot.milestone) : -1;

  return (
    <Section>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-extrabold text-slate-900">{t('track.title')}</h1>
        <p className="mt-2 text-sm text-slate-600">{t('track.subtitle')}</p>

        <Card className="mt-6">
          <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[240px] flex-1">
              <Field label={t('track.codeLabel')} required>
                <TextInput
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={t('track.codePlaceholder')}
                  dir="ltr"
                  autoComplete="off"
                  required
                />
              </Field>
            </div>
            <Button type="submit" loading={loading}>{t('track.submit')}</Button>
          </form>
          <p className="mt-3 text-xs text-slate-400">{t('track.privacy')}</p>
        </Card>

        {error && (
          <div role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {snapshot && (
          <Card className="mt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500">{t('track.orderNumber')}</p>
                <p className="text-lg font-bold text-ink-700" dir="ltr">{snapshot.orderNumber}</p>
              </div>
              <StatusBadge status={snapshot.status} />
            </div>

            {activeIndex >= 0 && (
              <ol className="mt-6 grid gap-2 sm:grid-cols-3" aria-label={t('track.milestone')}>
                {MILESTONES.map((m, i) => {
                  const done = i <= activeIndex;
                  return (
                    <li key={m} className="flex items-center gap-2 text-xs">
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                          done ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {done ? '✓' : i + 1}
                      </span>
                      <span className={done ? 'font-medium text-slate-800' : 'text-slate-400'}>{t(`milestone.${m}`)}</span>
                    </li>
                  );
                })}
              </ol>
            )}

            <div className="mt-6 grid gap-x-8 sm:grid-cols-2">
              <div>
                <InfoRow label={t('track.milestone')} value={t(`milestone.${snapshot.milestone}`)} />
                <InfoRow label={t('track.pickup')} value={snapshot.pickupAddress} />
                <InfoRow label={t('track.dropoff')} value={snapshot.dropoffAddress} />
              </div>
              <div>
                <InfoRow label={t('track.driver')} value={snapshot.driverName ?? t('track.driverNone')} />
                <InfoRow
                  label={t('track.driverLocation')}
                  value={
                    snapshot.driverLocation
                      ? `${snapshot.driverLocation.latitude.toFixed(4)}, ${snapshot.driverLocation.longitude.toFixed(4)}`
                      : t('track.locationNone')
                  }
                />
                <InfoRow label={t('track.lastUpdate')} value={formatDateTime(snapshot.updatedAt, locale)} />
                {snapshot.deliveredAt && <InfoRow label={t('track.deliveredAt')} value={formatDateTime(snapshot.deliveredAt, locale)} />}
                {snapshot.cancelledAt && <InfoRow label={t('track.cancelledAt')} value={formatDateTime(snapshot.cancelledAt, locale)} />}
              </div>
            </div>
          </Card>
        )}
      </div>
    </Section>
  );
}
