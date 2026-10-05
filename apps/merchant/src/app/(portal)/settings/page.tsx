'use client';

import { useEffect, useState } from 'react';
import { endpoints } from '@/lib/endpoints';
import { useI18n } from '@/i18n/provider';
import { useAsync } from '@/lib/use-async';
import { useToast } from '@/components/ui/toast';
import { PageHeader, Card, ErrorState, LoadingState } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/field';

interface SettingsForm {
  businessName: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  defaultPickupAddress: string;
  invoiceVatNumber: string;
  invoiceAddress: string;
  notifyOnStatus: boolean;
}

export default function SettingsPage() {
  const { t } = useI18n();
  const { notify } = useToast();
  const { data, loading, error, reload } = useAsync((s) => endpoints.settings(undefined, s), []);
  const { data: branches } = useAsync((s) => endpoints.branches({ pageSize: 100 }, s), []);

  const [form, setForm] = useState<SettingsForm | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    const s = data.settings as Record<string, unknown>;
    setForm({
      businessName: data.name,
      contactName: (s.contactName as string) ?? '',
      contactPhone: (s.contactPhone as string) ?? data.phone ?? '',
      contactEmail: (s.contactEmail as string) ?? data.email ?? '',
      defaultPickupAddress: (s.defaultPickupAddress as string) ?? '',
      invoiceVatNumber: (s.invoiceVatNumber as string) ?? '',
      invoiceAddress: (s.invoiceAddress as string) ?? '',
      notifyOnStatus: (s.notifyOnStatus as boolean) ?? true,
    });
  }, [data]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!form) return null;

  const set = <K extends keyof SettingsForm>(k: K, v: SettingsForm[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  async function save() {
    if (!form) return;
    setSaving(true);
    try {
      await endpoints.updateSettings({
        name: form.businessName.trim(),
        contactName: form.contactName.trim() || undefined,
        contactPhone: form.contactPhone.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        defaultPickupAddress: form.defaultPickupAddress.trim() || undefined,
        invoiceVatNumber: form.invoiceVatNumber.trim() || undefined,
        invoiceAddress: form.invoiceAddress.trim() || undefined,
        notifyOnStatus: form.notifyOnStatus,
      });
      notify(t('settings.saveSuccess'));
      reload();
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={t('settings.title')} className="lg:col-span-2">
          <div className="space-y-3">
            <Field label={t('settings.businessName')} required>
              <TextInput value={form.businessName} onChange={(e) => set('businessName', e.target.value)} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('settings.contactName')}>
                <TextInput value={form.contactName} onChange={(e) => set('contactName', e.target.value)} />
              </Field>
              <Field label={t('settings.contactPhone')}>
                <TextInput value={form.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} dir="ltr" />
              </Field>
            </div>
            <Field label={t('settings.contactEmail')}>
              <TextInput type="email" value={form.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} dir="ltr" />
            </Field>
            <Field label={t('settings.defaultPickup')}>
              <TextInput value={form.defaultPickupAddress} onChange={(e) => set('defaultPickupAddress', e.target.value)} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('settings.vatNumber')}>
                <TextInput value={form.invoiceVatNumber} onChange={(e) => set('invoiceVatNumber', e.target.value)} dir="ltr" />
              </Field>
              <Field label={t('settings.invoiceAddress')}>
                <TextInput value={form.invoiceAddress} onChange={(e) => set('invoiceAddress', e.target.value)} />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={form.notifyOnStatus} onChange={(e) => set('notifyOnStatus', e.target.checked)} />
              {t('settings.notifyOnStatus')}
            </label>
            <div className="flex justify-end">
              <Button loading={saving} disabled={!form.businessName.trim()} onClick={save}>{t('common.save')}</Button>
            </div>
          </div>
        </Card>

        <Card title={t('branches.title')}>
          <ul className="space-y-2 text-sm">
            {(branches?.items ?? []).map((b) => (
              <li key={b.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-2">
                <span className="text-slate-700">{b.name}</span>
                <span className="text-xs text-slate-400">{b.status === 'active' ? t('status.active') : t('status.inactive')}</span>
              </li>
            ))}
            {(branches?.items ?? []).length === 0 && <li className="text-xs text-slate-400">—</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
