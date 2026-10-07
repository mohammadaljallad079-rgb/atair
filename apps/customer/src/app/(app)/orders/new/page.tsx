'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/i18n/provider';
import { endpoints } from '@/lib/endpoints';
import { useAsync } from '@/lib/use-async';
import { ApiError } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import type { CustomerAddress, PriceQuote, ServiceArea } from '@/lib/types';
import { Card, ErrorState, LoadingState, PageHeader } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Field, Select, TextInput, Textarea } from '@/components/ui/field';
import { useToast } from '@/components/ui/toast';

interface FormState {
  serviceAreaId: string;
  pickupAddress: string;
  pickupLat: string;
  pickupLng: string;
  dropoffAddress: string;
  dropoffLat: string;
  dropoffLng: string;
  recipientName: string;
  recipientPhone: string;
  deliveryInstructions: string;
  packageDescription: string;
  weightKg: string;
  fragile: boolean;
  scheduled: boolean;
  scheduledPickupAt: string;
  paymentMethod: 'cod' | 'cash';
  codAmount: string;
  notes: string;
}

const EMPTY: FormState = {
  serviceAreaId: '',
  pickupAddress: '',
  pickupLat: '',
  pickupLng: '',
  dropoffAddress: '',
  dropoffLat: '',
  dropoffLng: '',
  recipientName: '',
  recipientPhone: '',
  deliveryInstructions: '',
  packageDescription: '',
  weightKg: '',
  fragile: false,
  scheduled: false,
  scheduledPickupAt: '',
  paymentMethod: 'cod',
  codAmount: '',
  notes: '',
};

export default function NewOrderPage() {
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const router = useRouter();
  const areas = useAsync<ServiceArea[]>((signal) => endpoints.serviceAreas(signal), []);
  const saved = useAsync<CustomerAddress[]>((signal) => endpoints.addresses(signal), []);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [quote, setQuote] = useState<PriceQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    // Any change to pricing-relevant inputs invalidates the previous quote.
    if (['serviceAreaId', 'pickupLat', 'pickupLng', 'dropoffLat', 'dropoffLng', 'weightKg', 'scheduled', 'paymentMethod'].includes(key)) {
      setQuote(null);
    }
  }

  function applyAddress(target: 'pickup' | 'dropoff', id: string) {
    const a = saved.data?.find((x) => x.id === id);
    if (!a) return;
    setForm((f) => ({
      ...f,
      [`${target}Address`]: a.address,
      [`${target}Lat`]: a.latitude != null ? String(a.latitude) : '',
      [`${target}Lng`]: a.longitude != null ? String(a.longitude) : '',
    }));
    setQuote(null);
  }

  const num = (s: string) => (s.trim() === '' ? undefined : Number(s));

  const quoteBody = useMemo(
    () => ({
      serviceAreaId: form.serviceAreaId || undefined,
      pickupLat: num(form.pickupLat),
      pickupLng: num(form.pickupLng),
      dropoffLat: num(form.dropoffLat),
      dropoffLng: num(form.dropoffLng),
      weightKg: num(form.weightKg),
      scheduled: form.scheduled,
      paymentMethod: form.paymentMethod,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form],
  );

  async function onQuote() {
    if (!form.pickupAddress.trim() || !form.dropoffAddress.trim()) {
      setError(t('cust.new.needLocations'));
      return;
    }
    setError(null);
    setQuoting(true);
    try {
      setQuote(await endpoints.quote(quoteBody));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setQuoting(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.pickupAddress.trim() || !form.dropoffAddress.trim()) {
      setError(t('cust.new.needLocations'));
      return;
    }
    if (!quote) {
      setError(t('cust.new.needQuote'));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const created = await endpoints.createOrder({
        pickupAddress: form.pickupAddress.trim(),
        pickupLat: num(form.pickupLat),
        pickupLng: num(form.pickupLng),
        dropoffAddress: form.dropoffAddress.trim(),
        dropoffLat: num(form.dropoffLat),
        dropoffLng: num(form.dropoffLng),
        serviceAreaId: form.serviceAreaId || undefined,
        recipientName: form.recipientName.trim() || undefined,
        recipientPhone: form.recipientPhone.trim() || undefined,
        deliveryInstructions: form.deliveryInstructions.trim() || undefined,
        packageDescription: form.packageDescription.trim() || undefined,
        weightKg: num(form.weightKg),
        fragile: form.fragile,
        scheduledPickupAt: form.scheduled && form.scheduledPickupAt
          ? new Date(form.scheduledPickupAt).toISOString()
          : undefined,
        paymentMethod: form.paymentMethod,
        codAmount: form.paymentMethod === 'cod' ? num(form.codAmount) : undefined,
        notes: form.notes.trim() || undefined,
      });
      notify(t('cust.new.success'), 'success');
      router.push(`/orders/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.error'));
      setSubmitting(false);
    }
  }

  if (areas.loading) return <LoadingState />;
  if (areas.error) return <ErrorState error={areas.error} onRetry={areas.reload} />;

  const addresses = saved.data ?? [];

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <PageHeader title={t('cust.new.title')} />

      <Card title={t('cust.new.serviceArea')}>
        <Field label={t('cust.new.serviceArea')} hint={t('cust.auth.tenantHint')}>
          <Select value={form.serviceAreaId} onChange={(e) => set('serviceAreaId', e.target.value)}>
            <option value="">{t('cust.new.chooseArea')}</option>
            {(areas.data ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
      </Card>

      <Card title={t('cust.new.pickup')}>
        {addresses.length > 0 && (
          <Field label={t('cust.new.useSaved')}>
            <Select defaultValue="" onChange={(e) => applyAddress('pickup', e.target.value)}>
              <option value="">—</option>
              {addresses.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label} — {a.address}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label={t('cust.new.pickup')} required>
          <TextInput value={form.pickupAddress} onChange={(e) => set('pickupAddress', e.target.value)} required />
        </Field>
      </Card>

      <Card title={t('cust.new.dropoff')}>
        {addresses.length > 0 && (
          <Field label={t('cust.new.useSaved')}>
            <Select defaultValue="" onChange={(e) => applyAddress('dropoff', e.target.value)}>
              <option value="">—</option>
              {addresses.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label} — {a.address}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label={t('cust.new.dropoff')} required>
          <TextInput value={form.dropoffAddress} onChange={(e) => set('dropoffAddress', e.target.value)} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('cust.new.recipient')}>
            <TextInput value={form.recipientName} onChange={(e) => set('recipientName', e.target.value)} />
          </Field>
          <Field label={t('cust.new.recipientPhone')}>
            <TextInput value={form.recipientPhone} onChange={(e) => set('recipientPhone', e.target.value)} dir="ltr" inputMode="tel" />
          </Field>
        </div>
        <Field label={t('cust.new.instructions')}>
          <Textarea value={form.deliveryInstructions} onChange={(e) => set('deliveryInstructions', e.target.value)} />
        </Field>
      </Card>

      <Card title={t('cust.new.packageDesc')}>
        <Field label={t('cust.new.packageDesc')}>
          <TextInput value={form.packageDescription} onChange={(e) => set('packageDescription', e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 items-end gap-3">
          <Field label={t('cust.new.weight')}>
            <TextInput type="number" min={0} step="0.1" value={form.weightKg} onChange={(e) => set('weightKg', e.target.value)} dir="ltr" />
          </Field>
          <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.fragile} onChange={(e) => set('fragile', e.target.checked)} className="h-4 w-4" />
            {t('cust.new.fragile')}
          </label>
        </div>
        <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={form.scheduled} onChange={(e) => set('scheduled', e.target.checked)} className="h-4 w-4" />
          {t('cust.new.scheduled')}
        </label>
        {form.scheduled && (
          <div className="mt-2">
            <Field label={t('cust.new.scheduledAt')}>
              <TextInput
                type="datetime-local"
                value={form.scheduledPickupAt}
                onChange={(e) => set('scheduledPickupAt', e.target.value)}
              />
            </Field>
          </div>
        )}
      </Card>

      <Card title={t('cust.new.paymentMethod')}>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('cust.new.paymentMethod')}>
            <Select value={form.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value as FormState['paymentMethod'])}>
              <option value="cod">{t('cust.pay.cod')}</option>
              <option value="cash">{t('cust.pay.cash')}</option>
            </Select>
          </Field>
          {form.paymentMethod === 'cod' && (
            <Field label={t('cust.new.codAmount')}>
              <TextInput
                type="number"
                min={0}
                step="0.01"
                value={form.codAmount}
                onChange={(e) => set('codAmount', e.target.value)}
                dir="ltr"
              />
            </Field>
          )}
        </div>
        <Field label={t('cust.new.notes')}>
          <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </Field>
      </Card>

      {quote && (
        <Card title={t('cust.new.quoteTitle')}>
          {quote.breakdown.map((b, i) => (
            <div key={i} className="flex items-center justify-between py-1 text-sm">
              <span className="text-slate-500">{b.label}</span>
              <span className="font-medium text-slate-700">{formatMoney(b.amount, quote.currency, locale)}</span>
            </div>
          ))}
          <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
            <span className="text-sm font-medium text-slate-700">{t('common.total')}</span>
            <span className="text-lg font-bold text-brand-700">{formatMoney(quote.total, quote.currency, locale)}</span>
          </div>
        </Card>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" loading={quoting} onClick={onQuote}>
          {t('cust.new.quote')}
        </Button>
        <Button type="submit" loading={submitting} disabled={!quote}>
          {t('cust.new.submit')}
        </Button>
      </div>
    </form>
  );
}
