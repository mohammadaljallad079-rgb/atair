'use client';

import { useState } from 'react';
import { endpoints } from '@/lib/endpoints';
import { useResourceList } from '@/lib/use-resource-list';
import { useAsync } from '@/lib/use-async';
import { useI18n } from '@/i18n/provider';
import { useAuth } from '@/lib/auth-provider';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { USER_STATUSES } from '@/lib/constants';
import { PageHeader, Card } from '@/components/ui/primitives';
import { DataTable, Column } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';
import { FilterBar } from '@/components/ui/filters';
import { SearchInput, Select, Field, TextInput } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Modal } from '@/components/ui/filters';
import { PermissionGate, RequirePermission } from '@/components/ui/permission-gate';
import type { StaffUser } from '@/lib/types';

export default function UsersPage() {
  const { t, locale } = useI18n();
  const { user: currentUser } = useAuth();
  const { notify } = useToast();
  const list = useResourceList<StaffUser>((query, signal) => endpoints.users(query), { pageSize: 20 });
  const roles = useAsync(() => endpoints.roles(), []);

  const [createOpen, setCreateOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleSlugs, setRoleSlugs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function doCreate() {
    setBusy(true);
    try {
      await endpoints.createUser({ fullName, email: email || undefined, password, roleSlugs });
      notify(t('common.save'));
      setCreateOpen(false);
      setFullName(''); setEmail(''); setPassword(''); setRoleSlugs([]);
      list.reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(u: StaffUser) {
    const next = u.status === 'active' ? 'suspended' : 'active';
    try {
      await endpoints.updateUser(u.id, { status: next });
      notify(t('common.save'));
      list.reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    }
  }

  const columns: Column<StaffUser>[] = [
    { key: 'fullName', header: t('users.name'), render: (r) => <span className="font-medium">{r.fullName}</span> },
    { key: 'email', header: t('users.email'), render: (r) => r.email ?? '—' },
    { key: 'roles', header: t('users.roles'), render: (r) => r.roles.map((s) => t(`role.${s}`)).join('، ') },
    { key: 'status', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
    { key: 'lastLoginAt', header: t('users.lastLogin'), render: (r) => (r.lastLoginAt ? formatDateTime(r.lastLoginAt, locale) : '—') },
    {
      key: 'actions', header: t('common.actions'), align: 'end',
      render: (r) => {
        const isSelf = r.id === currentUser?.id;
        return (
          <PermissionGate permission="users.update">
            <Button
              size="sm"
              variant="secondary"
              disabled={isSelf}
              title={isSelf ? t('users.cannotModifySelf') : undefined}
              onClick={() => toggleStatus(r)}
            >
              {r.status === 'active' ? t('users.suspend') : t('users.activate')}
            </Button>
          </PermissionGate>
        );
      },
    },
  ];

  return (
    <RequirePermission permission="users.view">
      <PageHeader
        title={t('users.title')}
        subtitle={t('users.subtitle')}
        actions={
          <PermissionGate permission="users.create">
            <Button size="sm" onClick={() => setCreateOpen(true)}>{t('users.create')}</Button>
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
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t('users.create')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>{t('common.cancel')}</Button>
            <Button loading={busy} disabled={!fullName || !password || !roleSlugs.length} onClick={doCreate}>{t('common.save')}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label={t('users.name')} required>
            <TextInput value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Field>
          <Field label={t('users.email')}>
            <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
          </Field>
          <Field label={t('users.password')} required>
            <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" />
          </Field>
          <Field label={t('users.selectRoles')} required>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
              {roles.data?.map((role) => (
                <label key={role.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={roleSlugs.includes(role.slug)}
                    onChange={(e) =>
                      setRoleSlugs((prev) => (e.target.checked ? [...prev, role.slug] : prev.filter((s) => s !== role.slug)))
                    }
                  />
                  {role.name}
                </label>
              ))}
            </div>
          </Field>
        </div>
      </Modal>
    </RequirePermission>
  );
}
