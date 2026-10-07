'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { endpoints } from '@/lib/endpoints';
import { useResourceList } from '@/lib/use-resource-list';
import { useAsync } from '@/lib/use-async';
import { useI18n } from '@/i18n/provider';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { formatMoney, formatDateTime, formatDistance } from '@/lib/format';
import { ORDER_STATUSES, PAYMENT_STATUSES, DELIVERY_TYPES, PAYMENT_METHODS } from '@/lib/constants';
import { PageHeader, Card } from '@/components/ui/primitives';
import { DataTable, Column } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';
import { FilterBar, Segmented, Modal } from '@/components/ui/filters';
import { SearchInput, Select, Field, TextInput, Textarea } from '@/components/ui/field';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { PermissionGate, RequirePermission } from '@/components/ui/permission-gate';
import type { OrderListItem } from '@/lib/types';

interface ItemRow { name: string; quantity: string; unitPrice: string }

export default function OrdersPage() {
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const router = useRouter();

  const list = useResourceList<OrderListItem>(
    (query, signal) => endpoints.orders(query),
    { pageSize: 20 },
  );

  const [createOpen, setCreateOpen] = useState(false);
  const customers = useAsync(() => endpoints.customers({ pageSize: 100 }), []);
  const merchants = useAsync(() => endpoints.merchants({ pageSize: 100 }), []);

  const [customerId, setCustomerId] = useState('');
  const [merchantId, setMerchantId] = useState('');
  const [deliveryType, setDeliveryType] = useState('immediate');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ItemRow[]>([{ name: '', quantity: '1', unitPrice: '' }]);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setCustomerId('');
    setMerchantId('');
    setDeliveryType('immediate');
    setPaymentMethod('cash');
    setPickupAddress('');
    setDropoffAddress('');
    setNotes('');
    setItems([{ name: '', quantity: '1', unitPrice: '' }]);
    setFormError(null);
    setCreateOpen(true);
  }

  function setItem(i: number, patch: Partial<ItemRow>) {
    setItems((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function submitCreate() {
    setFormError(null);
    if (!customerId) {
      setFormError(t('orders.selectCustomer'));
      return;
    }
    if (!pickupAddress.trim() || !dropoffAddress.trim()) {
      setFormError(t('common.required'));
      return;
    }
    const cleanItems = items
      .filter((i) => i.name.trim())
      .map((i) => ({
        name: i.name.trim(),
        quantity: Number(i.quantity) || 1,
        unitPrice: i.unitPrice ? Number(i.unitPrice) : undefined,
      }));
    setSaving(true);
    try {
      const order = await endpoints.createOrder({
        customerId,
        merchantId: merchantId || undefined,
        deliveryType,
        paymentMethod,
        pickupAddress: pickupAddress.trim(),
        dropoffAddress: dropoffAddress.trim(),
        notes: notes.trim() || undefined,
        items: cleanItems.length ? cleanItems : undefined,
      });
      notify(t('orders.created'));
      setCreateOpen(false);
      if (order?.id) router.push(`/orders/${order.id}`);
      else list.reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<OrderListItem>[] = [
    { key: 'orderNumber', header: t('orders.number'), render: (r) => <span className="font-medium text-ink-700">{r.orderNumber}</span> },
    { key: 'customer', header: t('orders.customer'), render: (r) => r.customer?.fullName ?? '—' },
    { key: 'driver', header: t('orders.driver'), render: (r) => r.driver?.fullName ?? '—' },
    { key: 'status', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
    { key: 'paymentStatus', header: t('orders.paymentStatus'), render: (r) => <StatusBadge status={r.paymentStatus} /> },
    { key: 'total', header: t('orders.total'), align: 'end', render: (r) => formatMoney(r.total, r.currency, locale) },
    { key: 'distanceKm', header: t('orders.distance'), align: 'end', render: (r) => formatDistance(r.distanceKm, locale) },
    { key: 'createdAt', header: t('common.createdAt'), render: (r) => formatDateTime(r.createdAt, locale) },
  ];

  const activeTab = (list.filters.status as string | undefined) ?? 'all';

  return (
    <RequirePermission permission="orders.view">
      <PageHeader
        title={t('orders.title')}
        subtitle={t('orders.subtitle')}
        actions={
          <PermissionGate permission="orders.create">
            <Button size="sm" onClick={openCreate}>{t('orders.manualCreate')}</Button>
          </PermissionGate>
        }
      />

      <Card>
        <FilterBar onClear={list.resetFilters}>
          <div className="w-full sm:w-64">
            <SearchInput value={list.search} onChange={list.setSearch} placeholder={t('common.searchPlaceholder')} />
          </div>
          <Select
            value={list.filters.paymentStatus ?? ''}
            onChange={(e) => list.setFilter('paymentStatus', e.target.value || undefined)}
            className="w-full sm:w-44"
            aria-label={t('orders.paymentStatus')}
          >
            <option value="">{t('orders.paymentStatus')}: {t('common.all')}</option>
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>{t(`status.${s}`)}</option>
            ))}
          </Select>
        </FilterBar>

        <div className="mb-3">
          <Segmented
            value={activeTab}
            onChange={(v) => list.setFilter('status', v === 'all' ? undefined : v)}
            options={[
              { value: 'all', label: t('common.all') },
              { value: 'active', label: t('status.active') },
              { value: 'delivered', label: t('status.delivered') },
              { value: 'cancelled', label: t('status.cancelled') },
            ]}
          />
        </div>

        <DataTable
          columns={columns}
          rows={list.data?.items ?? []}
          rowKey={(r) => r.id}
          loading={list.loading}
          error={list.error}
          onRetry={list.reload}
          onRowClick={(r) => router.push(`/orders/${r.id}`)}
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
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t('orders.manualCreate')}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>{t('common.cancel')}</Button>
            <Button loading={saving} onClick={submitCreate}>{t('common.create')}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">{t('orders.manualCreateHint')}</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('orders.customer')} required error={formError ?? undefined}>
              <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">{t('orders.selectCustomer')}</option>
                {customers.data?.items?.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
              </Select>
            </Field>
            <Field label={t('orders.merchant')} hint={t('common.optionalHint')}>
              <Select value={merchantId} onChange={(e) => setMerchantId(e.target.value)}>
                <option value="">{t('orders.selectMerchant')}</option>
                {merchants.data?.items?.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </Select>
            </Field>
            <Field label={t('orders.deliveryType')}>
              <Select value={deliveryType} onChange={(e) => setDeliveryType(e.target.value)}>
                {DELIVERY_TYPES.map((d) => <option key={d} value={d}>{t(`deliveryType.${d}`)}</option>)}
              </Select>
            </Field>
            <Field label={t('orders.paymentMethod')}>
              <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{t(`paymentMethod.${m}`)}</option>)}
              </Select>
            </Field>
          </div>
          <Field label={t('orders.pickupAddress')} required>
            <TextInput value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} />
          </Field>
          <Field label={t('orders.dropoffAddress')} required>
            <TextInput value={dropoffAddress} onChange={(e) => setDropoffAddress(e.target.value)} />
          </Field>
          <Field label={t('common.notes')} hint={t('common.optionalHint')}>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">{t('orders.items')}</span>
              <Button size="sm" variant="ghost" onClick={() => setItems((r) => [...r, { name: '', quantity: '1', unitPrice: '' }])}>
                {t('orders.itemsAdd')}
              </Button>
            </div>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="flex items-end gap-2">
                  <div className="flex-1">
                    <TextInput value={it.name} onChange={(e) => setItem(i, { name: e.target.value })} placeholder={t('orders.itemName')} />
                  </div>
                  <div className="w-20">
                    <TextInput type="number" min="1" value={it.quantity} onChange={(e) => setItem(i, { quantity: e.target.value })} dir="ltr" placeholder={t('orders.itemQty')} />
                  </div>
                  <div className="w-28">
                    <TextInput type="number" min="0" step="0.01" value={it.unitPrice} onChange={(e) => setItem(i, { unitPrice: e.target.value })} dir="ltr" placeholder={t('orders.itemPrice')} />
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setItems((r) => r.filter((_, idx) => idx !== i))} disabled={items.length === 1}>
                    {t('common.remove')}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </RequirePermission>
  );
}
