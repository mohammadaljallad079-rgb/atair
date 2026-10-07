'use client';

import { useState } from 'react';
import { endpoints } from '@/lib/endpoints';
import { useResourceList } from '@/lib/use-resource-list';
import { useAsync } from '@/lib/use-async';
import { useI18n } from '@/i18n/provider';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { formatMoney, formatDateTime } from '@/lib/format';
import { DELIVERY_TYPES } from '@/lib/constants';
import { PageHeader, Card } from '@/components/ui/primitives';
import { DataTable, Column } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';
import { FilterBar, Modal } from '@/components/ui/filters';
import { SearchInput, Select, Field, TextInput } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { PermissionGate, RequirePermission } from '@/components/ui/permission-gate';
import type { PriceQuote, PricingRule } from '@/lib/types';

const COMPONENT_TYPES = [
  'base_fare', 'distance_fare', 'time_fare', 'zone_fare', 'vehicle_fare',
  'weight_surcharge', 'size_surcharge', 'waiting_fee', 'night_surcharge',
  'peak_surcharge', 'scheduled_fee', 'cod_fee',
];

interface ComponentRow { type: string; amount: string }

export default function PricingPage() {
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const list = useResourceList<PricingRule>((query, signal) => endpoints.pricingRules(query), { pageSize: 20 });
  const zones = useAsync(() => endpoints.zones({ pageSize: 100 }), []);

  // quote preview
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [distanceKm, setDistanceKm] = useState('5');
  const [deliveryType, setDeliveryType] = useState('immediate');
  const [zoneId, setZoneId] = useState('');
  const [quote, setQuote] = useState<PriceQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // rule editor
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<PricingRule | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ruleZoneId, setRuleZoneId] = useState('');
  const [ruleDeliveryType, setRuleDeliveryType] = useState('');
  const [priority, setPriority] = useState('0');
  const [currency, setCurrency] = useState('SAR');
  const [isActive, setIsActive] = useState(true);
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const [components, setComponents] = useState<ComponentRow[]>([{ type: 'base_fare', amount: '' }]);
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditing(null);
    setName('');
    setDescription('');
    setRuleZoneId('');
    setRuleDeliveryType('');
    setPriority('0');
    setCurrency('SAR');
    setIsActive(true);
    setValidFrom('');
    setValidTo('');
    setComponents([{ type: 'base_fare', amount: '' }]);
    setEditError(null);
    setEditorOpen(true);
  }

  function openEdit(rule: PricingRule) {
    setEditing(rule);
    setName(rule.name);
    setDescription(rule.description ?? '');
    setRuleZoneId(rule.zoneId ?? '');
    setRuleDeliveryType(rule.deliveryType ?? '');
    setPriority(String(rule.priority));
    setCurrency(rule.currency);
    setIsActive(rule.isActive);
    setValidFrom(rule.validFrom ? rule.validFrom.slice(0, 16) : '');
    setValidTo(rule.validTo ? rule.validTo.slice(0, 16) : '');
    setComponents(rule.components?.length ? rule.components.map((c) => ({ type: c.type, amount: String(c.amount) })) : [{ type: 'base_fare', amount: '' }]);
    setEditError(null);
    setEditorOpen(true);
  }

  function setComponent(i: number, patch: Partial<ComponentRow>) {
    setComponents((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function saveRule() {
    setEditError(null);
    if (!name.trim()) {
      setEditError(t('common.required'));
      return;
    }
    const comps = components
      .filter((c) => c.amount !== '' && Number(c.amount) >= 0)
      .map((c) => ({ type: c.type, amount: Number(c.amount) }));
    if (!comps.length) {
      setEditError(t('pricing.addComponent'));
      return;
    }
    const body = {
      name: name.trim(),
      description: description.trim() || undefined,
      zoneId: ruleZoneId || undefined,
      deliveryType: ruleDeliveryType || undefined,
      priority: Number(priority) || 0,
      currency,
      isActive,
      validFrom: validFrom ? new Date(validFrom).toISOString() : undefined,
      validTo: validTo ? new Date(validTo).toISOString() : undefined,
      components: comps,
    };
    setSaving(true);
    try {
      if (editing) {
        await endpoints.updatePricingRule(editing.id, body);
        notify(t('pricing.updated'));
      } else {
        await endpoints.createPricingRule(body);
        notify(t('pricing.created'));
      }
      setEditorOpen(false);
      list.reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(rule: PricingRule) {
    try {
      await endpoints.updatePricingRule(rule.id, { isActive: !rule.isActive });
      notify(t('pricing.updated'));
      list.reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    }
  }

  async function runQuote() {
    setBusy(true);
    try {
      const res = await endpoints.quote({ distanceKm: Number(distanceKm), deliveryType, zoneId: zoneId || undefined });
      setQuote(res);
      setQuoteError(null);
    } catch (err) {
      setQuote(null);
      if (err instanceof ApiError && err.code === 'PRICING_UNAVAILABLE') {
        setQuoteError(t('pricing.noRule'));
      } else {
        setQuoteError(null);
        notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
      }
    } finally {
      setBusy(false);
    }
  }

  const columns: Column<PricingRule>[] = [
    { key: 'name', header: t('pricing.rule'), render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'zone', header: t('pricing.zone'), render: (r) => r.zone?.name ?? t('common.all') },
    { key: 'deliveryType', header: t('pricing.deliveryType'), render: (r) => (r.deliveryType ? t(`deliveryType.${r.deliveryType}`) : t('common.all')) },
    { key: 'priority', header: t('pricing.priority'), align: 'end', render: (r) => r.priority },
    { key: 'components', header: t('pricing.components'), align: 'end', render: (r) => r.components?.length ?? 0 },
    { key: 'valid', header: t('common.period'), render: (r) => `${r.validFrom ? formatDateTime(r.validFrom, locale) : t('pricing.unlimited')} → ${r.validTo ? formatDateTime(r.validTo, locale) : t('pricing.unlimited')}` },
    { key: 'isActive', header: t('pricing.active'), render: (r) => <StatusBadge status={r.isActive ? 'active' : 'inactive'} /> },
    {
      key: 'actions', header: t('common.actions'), align: 'end',
      render: (r) => (
        <PermissionGate permission="pricing.manage">
          <div className="flex justify-end gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>{t('pricing.edit')}</Button>
            <Button size="sm" variant="secondary" onClick={() => toggleActive(r)}>
              {r.isActive ? t('pricing.deactivate') : t('pricing.activate')}
            </Button>
          </div>
        </PermissionGate>
      ),
    },
  ];

  return (
    <RequirePermission permission="pricing.view">
      <PageHeader
        title={t('pricing.title')}
        subtitle={t('pricing.subtitle')}
        actions={
          <>
            <Button size="sm" variant="secondary" onClick={() => setQuoteOpen((v) => !v)}>
              {t('pricing.preview')}
            </Button>
            <PermissionGate permission="pricing.manage">
              <Button size="sm" onClick={openCreate}>{t('pricing.create')}</Button>
            </PermissionGate>
          </>
        }
      />

      {quoteOpen && (
        <Card className="mb-4" title={t('pricing.preview')}>
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-40">
              <Field label={t('orders.distance')}>
                <TextInput type="number" min="0" step="0.1" value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)} dir="ltr" />
              </Field>
            </div>
            <div className="w-48">
              <Field label={t('orders.deliveryType')}>
                <Select value={deliveryType} onChange={(e) => setDeliveryType(e.target.value)}>
                  {DELIVERY_TYPES.map((d) => <option key={d} value={d}>{t(`deliveryType.${d}`)}</option>)}
                </Select>
              </Field>
            </div>
            <div className="w-48">
              <Field label={t('zones.name')}>
                <Select value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
                  <option value="">{t('common.all')}</option>
                  {zones.data?.items?.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                </Select>
              </Field>
            </div>
            <Button loading={busy} onClick={runQuote}>{t('pricing.quote')}</Button>
          </div>
          {quote && (
            <div className="mt-4 space-y-1 text-sm">
              {quote.breakdown?.map((b, i) => (
                <div key={i} className="flex justify-between border-b border-slate-100 py-1">
                  <span className="text-slate-500">{b.label ?? b.type}</span>
                  <span className="tabular-nums">{formatMoney(b.amount, quote.currency, locale)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-2 font-bold">
                <span>{t('orders.total')}</span>
                <span className="text-brand-600">{formatMoney(quote.total, quote.currency, locale)}</span>
              </div>
            </div>
          )}
          {quoteError && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">{quoteError}</p>
          )}
        </Card>
      )}

      <p className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">{t('pricing.historicalNote')}</p>

      <Card>
        <FilterBar onClear={list.resetFilters}>
          <div className="w-full sm:w-64">
            <SearchInput value={list.search} onChange={list.setSearch} placeholder={t('common.searchPlaceholder')} />
          </div>
          <Select
            value={list.filters.isActive ?? ''}
            onChange={(e) => list.setFilter('isActive', e.target.value || undefined)}
            className="w-full sm:w-40"
            aria-label={t('pricing.active')}
          >
            <option value="">{t('pricing.active')}: {t('common.all')}</option>
            <option value="true">{t('common.activate')}</option>
            <option value="false">{t('common.deactivate')}</option>
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
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editing ? t('pricing.edit') : t('pricing.create')}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditorOpen(false)}>{t('common.cancel')}</Button>
            <Button loading={saving} onClick={saveRule}>{t('common.save')}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label={t('pricing.rule')} required error={editError ?? undefined}>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label={t('pricing.description')}>
            <TextInput value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('pricing.zone')}>
              <Select value={ruleZoneId} onChange={(e) => setRuleZoneId(e.target.value)}>
                <option value="">{t('common.all')}</option>
                {zones.data?.items?.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </Select>
            </Field>
            <Field label={t('pricing.deliveryType')}>
              <Select value={ruleDeliveryType} onChange={(e) => setRuleDeliveryType(e.target.value)}>
                <option value="">{t('common.all')}</option>
                {DELIVERY_TYPES.map((d) => <option key={d} value={d}>{t(`deliveryType.${d}`)}</option>)}
              </Select>
            </Field>
            <Field label={t('pricing.priority')}>
              <TextInput type="number" value={priority} onChange={(e) => setPriority(e.target.value)} dir="ltr" />
            </Field>
            <Field label={t('common.currency')}>
              <TextInput value={currency} onChange={(e) => setCurrency(e.target.value)} dir="ltr" />
            </Field>
            <Field label={t('pricing.validFrom')} hint={t('common.optionalHint')}>
              <TextInput type="datetime-local" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} dir="ltr" />
            </Field>
            <Field label={t('pricing.validTo')} hint={t('common.optionalHint')}>
              <TextInput type="datetime-local" value={validTo} onChange={(e) => setValidTo(e.target.value)} dir="ltr" />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            {t('pricing.active')}
          </label>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">{t('pricing.components')}</span>
              <Button size="sm" variant="ghost" onClick={() => setComponents((c) => [...c, { type: 'distance_fare', amount: '' }])}>
                {t('pricing.addComponent')}
              </Button>
            </div>
            <div className="space-y-2">
              {components.map((c, i) => (
                <div key={i} className="flex items-end gap-2">
                  <div className="w-48">
                    <Select value={c.type} onChange={(e) => setComponent(i, { type: e.target.value })}>
                      {COMPONENT_TYPES.map((ct) => <option key={ct} value={ct}>{ct}</option>)}
                    </Select>
                  </div>
                  <div className="flex-1">
                    <TextInput type="number" min="0" step="0.01" value={c.amount} onChange={(e) => setComponent(i, { amount: e.target.value })} dir="ltr" />
                  </div>
                  <Button
                    size="sm" variant="ghost"
                    onClick={() => setComponents((rows) => rows.filter((_, idx) => idx !== i))}
                    disabled={components.length === 1}
                  >
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
