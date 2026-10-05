'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { endpoints } from '@/lib/endpoints';
import { useAuth } from '@/lib/auth-provider';
import { useI18n } from '@/i18n/provider';
import { useAsync } from '@/lib/use-async';
import { useToast } from '@/components/ui/toast';
import { formatMoney } from '@/lib/format';
import { PAYMENT_METHODS } from '@/lib/constants';
import { PageHeader, Card, ErrorState } from '@/components/ui/primitives';
import { Field, TextInput, Select, Textarea } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import type { PriceQuote } from '@/lib/types';

interface FormState {
  customerId: string;
  merchantBranchId: string;
  pickupAddress: string;
  dropoffAddress: string;
  recipientName: string;
  recipientPhone: string;
  packageDescription: string;
  weightKg: string;
  deliveryType: 'immediate' | 'scheduled';
  scheduledPickupAt: string;
  paymentMethod: string;
  codAmount: string;
  notes: string;
}

const STEPS = ['orders.stepAddresses', 'orders.stepPackage', 'orders.stepPayment', 'orders.stepReview'] as const;

export default function NewOrderPage() {
  const { t, locale } = useI18n();
  const { merchant } = useAuth();
  const { notify } = useToast();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>({
    customerId: '', merchantBranchId: '', pickupAddress: '', dropoffAddress: '',
    recipientName: '', recipientPhone: '', packageDescription: '', weightKg: '',
    deliveryType: 'immediate', scheduledPickupAt: '', paymentMethod: 'cod', codAmount: '', notes: '',
  });
  const [quote, setQuote] = useState<PriceQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: customers } = useAsync((s) => endpoints.customers({ pageSize: 100 }, s), []);
  const { data: branches, error: branchError, reload } = useAsync((s) => endpoints.branches({ pageSize: 100 }, s), []);

  const currency = merchant?.currency ?? 'SAR';
  const pickupBranch = branches?.items.find((b) => b.id === form.merchantBranchId) ?? null;
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const canProceed = useMemo(() => {
    if (step === 0) return form.pickupAddress.trim() && form.dropoffAddress.trim();
    if (step === 2) return form.paymentMethod !== 'cod' || Number(form.codAmount || 0) >= 0;
    return true;
  }, [step, form]);

  async function onQuote() {
    setQuoting(true);
    try {
      const q = await endpoints.quote({
        merchantBranchId: form.merchantBranchId || undefined,
        pickupLat: pickupBranch?.latitude ?? undefined,
        pickupLng: pickupBranch?.longitude ?? undefined,
        weightKg: form.weightKg ? Number(form.weightKg) : undefined,
        scheduled: form.deliveryType === 'scheduled',
        paymentMethod: form.paymentMethod,
      });
      setQuote(q);
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setQuoting(false);
    }
  }

  async function onSubmit() {
    setSaving(true);
    try {
      await endpoints.createOrder({
        customerId: form.customerId || undefined,
        merchantBranchId: form.merchantBranchId || undefined,
        pickupAddress: form.pickupAddress.trim(),
        dropoffAddress: form.dropoffAddress.trim(),
        recipientName: form.recipientName || undefined,
        recipientPhone: form.recipientPhone || undefined,
        packageDescription: form.packageDescription || undefined,
        weightKg: form.weightKg ? Number(form.weightKg) : undefined,
        deliveryType: form.deliveryType,
        scheduledPickupAt: form.deliveryType === 'scheduled' ? form.scheduledPickupAt || undefined : undefined,
        paymentMethod: form.paymentMethod,
        codAmount: form.paymentMethod === 'cod' ? Number(form.codAmount || 0) : 0,
        notes: form.notes || undefined,
      });
      notify(t('orders.createSuccess'));
      router.push('/orders');
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (branchError) return <ErrorState error={branchError} onRetry={reload} />;

  return (
    <div>
      <PageHeader title={t('orders.new')} subtitle={t('orders.subtitle')} />

      <ol className="mb-4 flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <button
              onClick={() => setStep(i)}
              className={cn(
                'flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium',
                i === step ? 'bg-brand-600 text-white' : i < step ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-500',
              )}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[11px]">{i + 1}</span>
              {t(s)}
            </button>
            {i < STEPS.length - 1 && <span className="text-slate-300">—</span>}
          </li>
        ))}
      </ol>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            {step === 0 && (
              <div className="space-y-3">
                <Field label={t('orders.branch')}>
                  <Select value={form.merchantBranchId} onChange={(e) => set('merchantBranchId', e.target.value)}>
                    <option value="">—</option>
                    {branches?.items.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </Select>
                </Field>
                <Field label={t('orders.pickup')} required>
                  <TextInput value={form.pickupAddress} onChange={(e) => set('pickupAddress', e.target.value)} />
                </Field>
                <Field label={t('orders.dropoff')} required>
                  <TextInput value={form.dropoffAddress} onChange={(e) => set('dropoffAddress', e.target.value)} />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={t('orders.recipient')}>
                    <TextInput value={form.recipientName} onChange={(e) => set('recipientName', e.target.value)} />
                  </Field>
                  <Field label={t('orders.recipientPhone')}>
                    <TextInput value={form.recipientPhone} onChange={(e) => set('recipientPhone', e.target.value)} dir="ltr" />
                  </Field>
                </div>
                <Field label={t('orders.customer')}>
                  <Select value={form.customerId} onChange={(e) => set('customerId', e.target.value)}>
                    <option value="">{t('orders.walkIn')}</option>
                    {customers?.items.map((c) => (
                      <option key={c.id} value={c.id}>{c.fullName} — {c.phone}</option>
                    ))}
                  </Select>
                </Field>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-3">
                <Field label={t('orders.packageDescription')}>
                  <Textarea value={form.packageDescription} onChange={(e) => set('packageDescription', e.target.value)} />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={t('orders.weight')}>
                    <TextInput type="number" min={0} step="0.1" value={form.weightKg} onChange={(e) => set('weightKg', e.target.value)} />
                  </Field>
                  <Field label={t('orders.scheduled')}>
                    <Select value={form.deliveryType} onChange={(e) => set('deliveryType', e.target.value as FormState['deliveryType'])}>
                      <option value="immediate">{t('deliveryType.immediate')}</option>
                      <option value="scheduled">{t('deliveryType.scheduled')}</option>
                    </Select>
                  </Field>
                </div>
                {form.deliveryType === 'scheduled' && (
                  <Field label={t('orders.scheduledAt')}>
                    <TextInput type="datetime-local" value={form.scheduledPickupAt} onChange={(e) => set('scheduledPickupAt', e.target.value)} />
                  </Field>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <Field label={t('orders.paymentMethod')}>
                  <Select value={form.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value)}>
                    {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{t(`paymentMethod.${m}`)}</option>)}
                  </Select>
                </Field>
                {form.paymentMethod === 'cod' && (
                  <Field label={t('orders.codAmount')} hint={t('orders.codAmountHint')}>
                    <TextInput type="number" min={0} step="0.01" value={form.codAmount} onChange={(e) => set('codAmount', e.target.value)} />
                  </Field>
                )}
                <Field label={t('common.notes')}>
                  <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} />
                </Field>
              </div>
            )}

            {step === 3 && (
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Review label={t('orders.pickup')} value={form.pickupAddress} />
                <Review label={t('orders.dropoff')} value={form.dropoffAddress} />
                <Review label={t('orders.recipient')} value={form.recipientName || '—'} />
                <Review label={t('orders.recipientPhone')} value={form.recipientPhone || '—'} />
                <Review label={t('orders.paymentMethod')} value={t(`paymentMethod.${form.paymentMethod}`)} />
                <Review label={t('orders.codAmount')} value={form.paymentMethod === 'cod' ? formatMoney(form.codAmount || 0, currency, locale) : '—'} />
                <Review label={t('orders.deliveryFee')} value={quote ? formatMoney(quote.total, quote.currency, locale) : '—'} />
                <Review label={t('orders.packageDescription')} value={form.packageDescription || '—'} />
              </dl>
            )}

            <div className="mt-4 flex items-center justify-between">
              <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
                {t('common.previous')}
              </Button>
              {step < STEPS.length - 1 ? (
                <Button disabled={!canProceed} onClick={() => setStep((s) => s + 1)}>{t('common.next')}</Button>
              ) : (
                <Button loading={saving} onClick={onSubmit}>{t('common.create')}</Button>
              )}
            </div>
          </Card>
        </div>

        <div>
          <Card title={t('orders.quote')}>
            <Button variant="secondary" className="w-full" loading={quoting} onClick={onQuote}>
              {t('orders.quote')}
            </Button>
            {quote ? (
              <div className="mt-3 space-y-2 text-sm">
                {quote.breakdown.map((b) => (
                  <div key={b.type} className="flex justify-between text-slate-600">
                    <span>{b.label}</span>
                    <span className="tabular-nums">{formatMoney(b.amount, quote.currency, locale)}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-slate-100 pt-2 font-semibold text-slate-900">
                  <span>{t('orders.deliveryFee')}</span>
                  <span className="tabular-nums">{formatMoney(quote.total, quote.currency, locale)}</span>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-xs text-slate-400">{t('orders.noQuote')}</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Review({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-slate-800">{value}</dd>
    </div>
  );
}
