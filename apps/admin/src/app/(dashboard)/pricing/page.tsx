'use client';

import { useState } from 'react';
import { endpoints } from '@/lib/endpoints';
import { useResourceList } from '@/lib/use-resource-list';
import { useI18n } from '@/i18n/provider';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { DELIVERY_TYPES } from '@/lib/constants';
import { PageHeader, Card, EmptyState } from '@/components/ui/primitives';
import { DataTable, Column } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';
import { FilterBar } from '@/components/ui/filters';
import { SearchInput, Select, Field, TextInput } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { RequirePermission } from '@/components/ui/permission-gate';
import type { PriceQuote, PricingRule } from '@/lib/types';

export default function PricingPage() {
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const list = useResourceList<PricingRule>((query, signal) => endpoints.pricingRules(query), { pageSize: 20 });

  const [quoteOpen, setQuoteOpen] = useState(false);
  const [distanceKm, setDistanceKm] = useState('5');
  const [deliveryType, setDeliveryType] = useState('immediate');
  const [quote, setQuote] = useState<PriceQuote | null>(null);
  const [busy, setBusy] = useState(false);

  async function runQuote() {
    setBusy(true);
    try {
      const res = await endpoints.quote({ distanceKm: Number(distanceKm), deliveryType });
      setQuote(res);
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setBusy(false);
    }
  }

  const columns: Column<PricingRule>[] = [
    { key: 'name', header: t('pricing.rule'), render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'zone', header: t('zones.name'), render: (r) => r.zone?.name ?? t('common.all') },
    { key: 'deliveryType', header: t('orders.deliveryType'), render: (r) => (r.deliveryType ? t(`deliveryType.${r.deliveryType}`) : t('common.all')) },
    { key: 'priority', header: t('pricing.priority'), align: 'end', render: (r) => r.priority },
    { key: 'components', header: t('pricing.components'), align: 'end', render: (r) => r.components?.length ?? 0 },
    { key: 'currency', header: 'Currency', render: (r) => r.currency },
    { key: 'isActive', header: t('pricing.active'), render: (r) => <StatusBadge status={r.isActive ? 'active' : 'inactive'} /> },
  ];

  return (
    <RequirePermission permission="pricing.view">
      <PageHeader
        title={t('pricing.title')}
        subtitle={t('pricing.subtitle')}
        actions={
          <Button size="sm" variant="secondary" onClick={() => setQuoteOpen((v) => !v)}>
            {t('pricing.preview')}
          </Button>
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
        </Card>
      )}

      <Card>
        <FilterBar onClear={list.resetFilters}>
          <div className="w-full sm:w-64">
            <SearchInput value={list.search} onChange={list.setSearch} placeholder={t('common.searchPlaceholder')} />
          </div>
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
    </RequirePermission>
  );
}
