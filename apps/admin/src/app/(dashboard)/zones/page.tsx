'use client';

import { useState } from 'react';
import { endpoints } from '@/lib/endpoints';
import { useResourceList } from '@/lib/use-resource-list';
import { useI18n } from '@/i18n/provider';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { PageHeader, Card } from '@/components/ui/primitives';
import { DataTable, Column } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';
import { FilterBar, Modal } from '@/components/ui/filters';
import { SearchInput, Field, TextInput } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { PermissionGate, RequirePermission } from '@/components/ui/permission-gate';
import type { ServiceZone } from '@/lib/types';

function parsePolygon(text: string): number[][] | undefined {
  if (!text.trim()) return undefined;
  const pairs = text.split('\n').map((line) => line.split(',').map((n) => Number(n.trim())));
  if (pairs.some((p) => p.length !== 2 || p.some((n) => Number.isNaN(n)))) return undefined;
  return pairs;
}

function polygonToText(polygon: number[][] | null): string {
  return polygon?.map((p) => p.join(', ')).join('\n') ?? '';
}

export default function ZonesPage() {
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const list = useResourceList<ServiceZone>((query, signal) => endpoints.zones(query), { pageSize: 20 });

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceZone | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [centerLat, setCenterLat] = useState('');
  const [centerLng, setCenterLng] = useState('');
  const [polygonText, setPolygonText] = useState('');
  const [busy, setBusy] = useState(false);

  function openCreate() {
    setEditing(null);
    setName(''); setCode(''); setCenterLat(''); setCenterLng(''); setPolygonText('');
    setEditorOpen(true);
  }

  function openEdit(z: ServiceZone) {
    setEditing(z);
    setName(z.name); setCode(z.code ?? '');
    setCenterLat(z.centerLat != null ? String(z.centerLat) : '');
    setCenterLng(z.centerLng != null ? String(z.centerLng) : '');
    setPolygonText(polygonToText(z.polygon));
    setEditorOpen(true);
  }

  async function save() {
    const polygon = parsePolygon(polygonText);
    if (polygonText.trim() && !polygon) {
      notify(t('zones.polygonHint'), 'error');
      return;
    }
    setBusy(true);
    try {
      const body = {
        name,
        code: code || undefined,
        centerLat: centerLat ? Number(centerLat) : undefined,
        centerLng: centerLng ? Number(centerLng) : undefined,
        polygon,
      };
      if (editing) await endpoints.updateZone(editing.id, body);
      else await endpoints.createZone(body);
      notify(t('common.save'));
      setEditorOpen(false);
      list.reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(z: ServiceZone) {
    try {
      await endpoints.updateZone(z.id, { isActive: !z.isActive });
      notify(t('common.save'));
      list.reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    }
  }

  const columns: Column<ServiceZone>[] = [
    { key: 'name', header: t('zones.name'), render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'code', header: t('zones.code'), render: (r) => r.code ?? '—' },
    {
      key: 'center', header: t('zones.center'),
      render: (r) => (r.centerLat != null && r.centerLng != null ? `${r.centerLat.toFixed(4)}, ${r.centerLng.toFixed(4)}` : '—'),
    },
    { key: 'polygon', header: t('zones.polygon'), render: (r) => (r.polygon ? `${r.polygon.length} pts` : '—') },
    { key: 'isActive', header: t('common.status'), render: (r) => <StatusBadge status={r.isActive ? 'active' : 'inactive'} /> },
    { key: 'createdAt', header: t('common.createdAt'), render: (r) => formatDateTime(r.createdAt, locale) },
    {
      key: 'actions', header: t('common.actions'), align: 'end',
      render: (r) => (
        <PermissionGate permission="zones.manage">
          <div className="flex justify-end gap-1.5">
            <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>{t('common.edit')}</Button>
            <Button size="sm" variant="ghost" onClick={() => toggleActive(r)}>{t('zones.toggleActive')}</Button>
          </div>
        </PermissionGate>
      ),
    },
  ];

  return (
    <RequirePermission permission="zones.view">
      <PageHeader
        title={t('zones.title')}
        subtitle={t('zones.subtitle')}
        actions={
          <PermissionGate permission="zones.manage">
            <Button size="sm" onClick={openCreate}>{t('zones.create')}</Button>
          </PermissionGate>
        }
      />
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

      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editing ? t('common.edit') : t('zones.create')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditorOpen(false)}>{t('common.cancel')}</Button>
            <Button loading={busy} disabled={!name} onClick={save}>{t('common.save')}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label={t('zones.name')} required>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label={t('zones.code')}>
            <TextInput value={code} onChange={(e) => setCode(e.target.value)} dir="ltr" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude">
              <TextInput value={centerLat} onChange={(e) => setCenterLat(e.target.value)} dir="ltr" />
            </Field>
            <Field label="Longitude">
              <TextInput value={centerLng} onChange={(e) => setCenterLng(e.target.value)} dir="ltr" />
            </Field>
          </div>
          <Field label={t('zones.polygon')} hint={t('zones.polygonHint')}>
            <textarea
              value={polygonText}
              onChange={(e) => setPolygonText(e.target.value)}
              dir="ltr"
              className="min-h-[100px] w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs focus:border-ink-500 focus:outline-none"
              placeholder={'46.7, 24.7\n46.8, 24.7\n46.8, 24.8'}
            />
          </Field>
        </div>
      </Modal>
    </RequirePermission>
  );
}
