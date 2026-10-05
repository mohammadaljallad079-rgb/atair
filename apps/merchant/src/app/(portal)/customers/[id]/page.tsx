'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { endpoints } from '@/lib/endpoints';
import { useI18n } from '@/i18n/provider';
import { useAsync } from '@/lib/use-async';
import { useToast } from '@/components/ui/toast';
import { formatDate, formatMoney } from '@/lib/format';
import { PageHeader, Card, ErrorState, LoadingState } from '@/components/ui/primitives';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/filters';
import { Field, TextInput, Select } from '@/components/ui/field';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useI18n();
  const { notify } = useToast();

  const { data: customer, loading, error, reload } = useAsync((s) => endpoints.customer(id, s), [id]);

  const [addrOpen, setAddrOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addr, setAddr] = useState({ label: 'home', address: '', latitude: '', longitude: '', isDefault: false });

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!customer) return null;

  async function addAddress() {
    setSaving(true);
    try {
      await endpoints.addCustomerAddress(id, {
        label: addr.label,
        address: addr.address.trim(),
        latitude: addr.latitude ? Number(addr.latitude) : undefined,
        longitude: addr.longitude ? Number(addr.longitude) : undefined,
        isDefault: addr.isDefault,
      });
      notify(t('customers.updateSuccess'));
      setAddrOpen(false);
      setAddr({ label: 'home', address: '', latitude: '', longitude: '', isDefault: false });
      reload();
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={customer.fullName}
        subtitle={<span dir="ltr">{customer.phone}</span>}
        actions={<Button variant="secondary" onClick={() => setAddrOpen(true)}>{t('customers.addAddress')}</Button>}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={t('common.details')}>
          <dl className="space-y-2 text-sm">
            <Row label={t('customers.email')} value={customer.email ?? '—'} />
            <Row label={t('common.status')} value={<StatusBadge status={customer.status} />} />
            <Row label={t('customers.orders')} value={customer._count?.orders ?? customer.orders.length} />
            <Row label={t('common.createdAt')} value={formatDate(customer.createdAt, locale)} />
          </dl>
        </Card>

        <Card title={t('customers.addresses')}>
          {customer.addresses.length === 0 ? (
            <p className="text-xs text-slate-400">—</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {customer.addresses.map((a) => (
                <li key={a.id} className="rounded-lg border border-slate-100 p-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-700">{t(`address.label.${a.label}`)}</span>
                    {a.isDefault && <span className="text-[11px] text-brand-600">{t('address.default')}</span>}
                  </div>
                  <p className="text-xs text-slate-500">{a.address}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={t('customers.orders')}>
          {customer.orders.length === 0 ? (
            <p className="text-xs text-slate-400">—</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {customer.orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between">
                  <Link href={`/orders/${o.id}`} className="text-ink-700 hover:underline">{o.orderNumber}</Link>
                  <span className="flex items-center gap-2">
                    <StatusBadge status={o.status} />
                    <span className="tabular-nums text-slate-600">{formatMoney(o.total, 'SAR', locale)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Modal
        open={addrOpen}
        onClose={() => setAddrOpen(false)}
        title={t('customers.addAddress')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddrOpen(false)}>{t('common.cancel')}</Button>
            <Button loading={saving} disabled={!addr.address.trim()} onClick={addAddress}>{t('common.save')}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label={t('address.label')}>
            <Select value={addr.label} onChange={(e) => setAddr((a) => ({ ...a, label: e.target.value }))}>
              <option value="home">{t('address.label.home')}</option>
              <option value="work">{t('address.label.work')}</option>
              <option value="other">{t('address.label.other')}</option>
            </Select>
          </Field>
          <Field label={t('customers.address')} required>
            <TextInput value={addr.address} onChange={(e) => setAddr((a) => ({ ...a, address: e.target.value }))} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('branches.latitude')}>
              <TextInput value={addr.latitude} onChange={(e) => setAddr((a) => ({ ...a, latitude: e.target.value }))} dir="ltr" />
            </Field>
            <Field label={t('branches.longitude')}>
              <TextInput value={addr.longitude} onChange={(e) => setAddr((a) => ({ ...a, longitude: e.target.value }))} dir="ltr" />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={addr.isDefault} onChange={(e) => setAddr((a) => ({ ...a, isDefault: e.target.checked }))} />
            {t('address.default')}
          </label>
        </div>
      </Modal>
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
