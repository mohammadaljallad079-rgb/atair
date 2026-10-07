'use client';

import { useMemo, useState } from 'react';
import { endpoints } from '@/lib/endpoints';
import { useAsync } from '@/lib/use-async';
import { useI18n } from '@/i18n/provider';
import { useAuth } from '@/lib/auth-provider';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { PageHeader, Card, ErrorState, LoadingState, EmptyState } from '@/components/ui/primitives';
import { SearchInput, Field, TextInput, Textarea } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Modal, ConfirmDialog } from '@/components/ui/filters';
import { PermissionGate, RequirePermission } from '@/components/ui/permission-gate';
import { permissionModule } from '@/lib/permissions';
import type { Role, Permission } from '@/lib/types';

export default function RolesPage() {
  const { t } = useI18n();
  const { can } = useAuth();
  const { notify } = useToast();
  const roles = useAsync(() => endpoints.roles(), []);
  const perms = useAsync(() => endpoints.permissions(), []);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [codes, setCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);

  const canManage = can('users.manage_roles');

  const selected = useMemo(
    () => roles.data?.find((r) => r.id === selectedId) ?? roles.data?.[0] ?? null,
    [roles.data, selectedId],
  );

  const grouped = useMemo(() => {
    if (!selected) return [] as Array<[string, string[]]>;
    const map = new Map<string, string[]>();
    for (const code of selected.permissions) {
      if (filter && !code.toLowerCase().includes(filter.toLowerCase())) continue;
      const mod = permissionModule(code);
      map.set(mod, [...(map.get(mod) ?? []), code]);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [selected, filter]);

  function openCreate() {
    setEditing(null);
    setName(''); setSlug(''); setDescription(''); setCodes([]);
    setEditorOpen(true);
  }

  function openEdit(role: Role) {
    setEditing(role);
    setName(role.name); setSlug(role.slug); setDescription(role.description ?? '');
    setCodes(role.permissions);
    setEditorOpen(true);
  }

  function toggleCode(code: string) {
    setCodes((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  }

  async function save() {
    setBusy(true);
    try {
      if (editing) {
        await endpoints.updateRole(editing.id, { name, description, permissions: codes });
      } else {
        await endpoints.createRole({ name, slug: slug || undefined, description, permissions: codes });
      }
      notify(t('common.save'));
      setEditorOpen(false);
      roles.reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function doDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await endpoints.deleteRole(deleteTarget.id);
      notify(t('common.save'));
      setDeleteTarget(null);
      setSelectedId(null);
      roles.reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setBusy(false);
    }
  }

  if (roles.loading) return <LoadingState />;
  if (roles.error) return <Card><ErrorState error={roles.error} onRetry={roles.reload} /></Card>;

  const permissionsByModule = new Map<string, Permission[]>();
  for (const p of perms.data ?? []) {
    permissionsByModule.set(p.module, [...(permissionsByModule.get(p.module) ?? []), p]);
  }

  return (
    <RequirePermission permission="users.view">
      <PageHeader
        title={t('roles.title')}
        subtitle={t('roles.subtitle')}
        actions={
          <PermissionGate permission="users.manage_roles">
            <Button size="sm" onClick={openCreate}>{t('roles.create')}</Button>
          </PermissionGate>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={t('roles.title')}>
          {roles.data?.length ? (
            <ul className="space-y-1">
              {roles.data.map((r: Role) => (
                <li key={r.id}>
                  <button
                    onClick={() => setSelectedId(r.id)}
                    className={`w-full rounded-lg px-3 py-2 text-start text-sm transition-colors ${
                      selected?.id === r.id ? 'bg-ink-50 font-medium text-ink-800' : 'hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span>{t(`role.${r.slug}`)}</span>
                      {r.isSystem && <StatusBadge status="active" />}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-slate-400">{r.slug}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : <EmptyState />}
        </Card>

        <Card
          className="lg:col-span-2"
          title={selected ? t(`role.${selected.slug}`) : t('roles.permissions')}
          actions={
            selected && canManage && !selected.isSystem ? (
              <div className="flex gap-1.5">
                <Button size="sm" variant="secondary" onClick={() => openEdit(selected)}>{t('common.edit')}</Button>
                <Button size="sm" variant="danger" onClick={() => setDeleteTarget(selected)}>{t('roles.delete')}</Button>
              </div>
            ) : undefined
          }
        >
          {selected ? (
            <>
              <p className="mb-3 text-xs text-slate-500">{selected.description}</p>
              <div className="mb-3">
                <SearchInput value={filter} onChange={setFilter} placeholder={t('roles.filterPermissions')} />
              </div>
              <div className="space-y-3">
                {grouped.map(([mod, roleCodes]) => (
                  <div key={mod}>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{mod}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {roleCodes.map((c) => (
                        <span key={c} className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {!grouped.length && <EmptyState />}
              </div>
            </>
          ) : <EmptyState />}
        </Card>
      </div>

      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editing ? t('common.edit') : t('roles.create')}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditorOpen(false)}>{t('common.cancel')}</Button>
            <Button loading={busy} disabled={!name} onClick={save}>{t('common.save')}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label={t('roles.name')} required>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          {!editing && (
            <Field label={t('roles.slug')} hint="users.view">
              <TextInput value={slug} onChange={(e) => setSlug(e.target.value)} dir="ltr" />
            </Field>
          )}
          <Field label={t('common.description')}>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <Field label={t('roles.permissions')}>
            <div className="max-h-72 space-y-3 overflow-y-auto rounded-lg border border-slate-200 p-3">
              {[...permissionsByModule.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([mod, list]) => (
                <div key={mod}>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{mod}</p>
                  <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {list.map((p) => (
                      <label key={p.code} className="flex items-center gap-2 text-xs">
                        <input type="checkbox" checked={codes.includes(p.code)} onChange={() => toggleCode(p.code)} />
                        <span className="font-mono text-slate-600">{p.code}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('roles.delete')}
        message={deleteTarget?.name ?? ''}
        confirmLabel={t('roles.delete')}
        loading={busy}
        onConfirm={doDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </RequirePermission>
  );
}
