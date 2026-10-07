'use client';

import { FormEvent, useState } from 'react';
import { useI18n } from '@/i18n/provider';
import { endpoints } from '@/lib/endpoints';
import { useAsync } from '@/lib/use-async';
import { ApiError } from '@/lib/api';
import type { CustomerAddress } from '@/lib/types';
import { Card, EmptyState, ErrorState, LoadingState, PageHeader } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Field, Select, TextInput } from '@/components/ui/field';
import { useToast } from '@/components/ui/toast';

interface Form {
  label: string;
  address: string;
  latitude: string;
  longitude: string;
  details: string;
  isDefault: boolean;
}

const EMPTY: Form = { label: 'home', address: '', latitude: '', longitude: '', details: '', isDefault: false };

export default function AddressesPage() {
  const { t } = useI18n();
  const { notify } = useToast();
  const list = useAsync<CustomerAddress[]>((signal) => endpoints.addresses(signal), []);
  const [form, setForm] = useState<Form>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function startEdit(a: CustomerAddress) {
    setEditingId(a.id);
    setForm({
      label: a.label,
      address: a.address,
      latitude: a.latitude != null ? String(a.latitude) : '',
      longitude: a.longitude != null ? String(a.longitude) : '',
      details: a.details ?? '',
      isDefault: a.isDefault,
    });
  }

  function reset() {
    setEditingId(null);
    setForm(EMPTY);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.address.trim()) return;
    setSaving(true);
    const body = {
      label: form.label,
      address: form.address.trim(),
      latitude: form.latitude.trim() ? Number(form.latitude) : undefined,
      longitude: form.longitude.trim() ? Number(form.longitude) : undefined,
      details: form.details.trim() || undefined,
      isDefault: form.isDefault,
    };
    try {
      if (editingId) await endpoints.updateAddress(editingId, body);
      else await endpoints.addAddress(body);
      notify(t('common.save'), 'success');
      reset();
      list.reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm(t('cust.addr.deleteConfirm'))) return;
    try {
      await endpoints.deleteAddress(id);
      list.reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t('cust.addr.title')} />

      <Card title={editingId ? t('cust.addr.edit') : t('cust.addr.add')}>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('cust.addr.label')}>
              <Select value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })}>
                <option value="home">{t('cust.addr.home')}</option>
                <option value="work">{t('cust.addr.work')}</option>
                <option value="other">{t('cust.addr.other')}</option>
              </Select>
            </Field>
            <Field label={t('cust.addr.address')} required>
              <TextInput value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('cust.addr.lat')}>
              <TextInput
                value={form.latitude}
                onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                dir="ltr"
                inputMode="decimal"
              />
            </Field>
            <Field label={t('cust.addr.lng')}>
              <TextInput
                value={form.longitude}
                onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                dir="ltr"
                inputMode="decimal"
              />
            </Field>
          </div>
          <Field label={t('cust.addr.details')}>
            <TextInput value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              className="h-4 w-4"
            />
            {t('cust.addr.setDefault')}
          </label>
          <div className="flex gap-2">
            <Button type="submit" loading={saving}>
              {t('common.save')}
            </Button>
            {editingId && (
              <Button type="button" variant="ghost" onClick={reset}>
                {t('common.cancel')}
              </Button>
            )}
          </div>
        </form>
      </Card>

      <Card>
        {list.loading ? (
          <LoadingState />
        ) : list.error ? (
          <ErrorState error={list.error} onRetry={list.reload} />
        ) : !list.data?.length ? (
          <EmptyState title={t('cust.addr.empty')} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {list.data.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
                    {a.label}
                    {a.isDefault && (
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700">
                        {t('cust.addr.default')}
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-slate-500">{a.address}</p>
                  {a.details && <p className="text-[11px] text-slate-400">{a.details}</p>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="ghost" onClick={() => startEdit(a)}>
                    {t('common.edit')}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-600" onClick={() => onDelete(a.id)}>
                    {t('common.delete')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
