'use client';

import { useMemo, useState } from 'react';
import { endpoints } from '@/lib/endpoints';
import { useAsync } from '@/lib/use-async';
import { useI18n } from '@/i18n/provider';
import { PageHeader, Card, ErrorState, LoadingState, EmptyState } from '@/components/ui/primitives';
import { SearchInput } from '@/components/ui/field';
import { StatusBadge } from '@/components/ui/status-badge';
import { RequirePermission } from '@/components/ui/permission-gate';
import { permissionModule } from '@/lib/permissions';
import type { Role } from '@/lib/types';

export default function RolesPage() {
  const { t } = useI18n();
  const roles = useAsync(() => endpoints.roles(), []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

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

  if (roles.loading) return <LoadingState />;
  if (roles.error) return <Card><ErrorState error={roles.error} onRetry={roles.reload} /></Card>;

  return (
    <RequirePermission permission="users.view">
      <PageHeader title={t('roles.title')} subtitle={t('roles.subtitle')} />
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
                      <span>{r.name}</span>
                      {r.isSystem && <StatusBadge status="active" />}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-slate-400">{r.slug}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : <EmptyState />}
        </Card>

        <Card className="lg:col-span-2" title={selected ? selected.name : t('roles.permissions')}>
          {selected ? (
            <>
              <p className="mb-3 text-xs text-slate-500">{selected.description}</p>
              <div className="mb-3">
                <SearchInput value={filter} onChange={setFilter} placeholder={t('roles.filterPermissions')} />
              </div>
              <div className="space-y-3">
                {grouped.map(([mod, codes]) => (
                  <div key={mod}>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{mod}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {codes.map((c) => (
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
    </RequirePermission>
  );
}
