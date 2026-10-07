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
import { PageHeader, Card } from '@/components/ui/primitives';
import { DataTable, Column } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';
import { FilterBar, ConfirmDialog, Modal } from '@/components/ui/filters';
import { SearchInput, Field, TextInput } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
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

  const [rolesTarget, setRolesTarget] = useState<StaffUser | null>(null);
  const [editRoleSlugs, setEditRoleSlugs] = useState<string[]>([]);
  const [rolesBusy, setRolesBusy] = useState(false);

  const [resetTarget, setResetTarget] = useState<StaffUser | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const [revokeTarget, setRevokeTarget] = useState<StaffUser | null>(null);

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

  function openRoles(u: StaffUser) {
    setRolesTarget(u);
    setEditRoleSlugs(u.roles);
  }

  async function saveRoles() {
    if (!rolesTarget) return;
    setRolesBusy(true);
    try {
      await endpoints.updateUser(rolesTarget.id, { roleSlugs: editRoleSlugs });
      notify(t('users.roleUpdated'));
      setRolesTarget(null);
      list.reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setRolesBusy(false);
    }
  }

  async function doResetPassword() {
    if (!resetTarget) return;
    setBusy(true);
    try {
      const res = await endpoints.resetUserPassword(resetTarget.id);
      setTempPassword(res.temporaryPassword);
      list.reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
      setResetTarget(null);
    } finally {
      setBusy(false);
    }
  }

  async function doRevokeSessions() {
    if (!revokeTarget) return;
    setBusy(true);
    try {
      const res = await endpoints.revokeUserSessions(revokeTarget.id);
      notify(`${t('users.sessionsRevoked')} (${res.revoked})`);
      setRevokeTarget(null);
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setBusy(false);
    }
  }

  const columns: Column<StaffUser>[] = [
    { key: 'fullName', header: t('users.name'), render: (r) => <span className="font-medium">{r.fullName}</span> },
    { key: 'email', header: t('users.email'), render: (r) => r.email ?? '—' },
    { key: 'roles', header: t('users.roles'), render: (r) => r.roles.map((s) => t(`role.${s}`)).join('، ') || '—' },
    { key: 'status', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
    { key: 'lastLoginAt', header: t('users.lastLogin'), render: (r) => (r.lastLoginAt ? formatDateTime(r.lastLoginAt, locale) : '—') },
    {
      key: 'actions', header: t('common.actions'), align: 'end',
      render: (r) => {
        const isSelf = r.id === currentUser?.id;
        return (
          <div className="flex justify-end gap-1.5">
            <PermissionGate permission="users.manage_roles">
              <Button size="sm" variant="secondary" onClick={() => openRoles(r)}>{t('users.editRoles')}</Button>
            </PermissionGate>
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
              <Button size="sm" variant="ghost" disabled={isSelf} onClick={() => setResetTarget(r)}>
                {t('users.resetPassword')}
              </Button>
              <Button size="sm" variant="ghost" disabled={isSelf} onClick={() => setRevokeTarget(r)}>
                {t('users.revokeSessions')}
              </Button>
            </PermissionGate>
          </div>
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

      <Modal
        open={!!rolesTarget}
        onClose={() => setRolesTarget(null)}
        title={t('users.editRoles')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRolesTarget(null)}>{t('common.cancel')}</Button>
            <Button loading={rolesBusy} onClick={saveRoles}>{t('common.save')}</Button>
          </>
        }
      >
        <p className="mb-2 text-xs text-slate-500">{rolesTarget?.fullName}</p>
        <div className="max-h-60 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
          {roles.data?.map((role) => (
            <label key={role.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editRoleSlugs.includes(role.slug)}
                onChange={(e) =>
                  setEditRoleSlugs((prev) => (e.target.checked ? [...prev, role.slug] : prev.filter((s) => s !== role.slug)))
                }
              />
              {role.name}
            </label>
          ))}
        </div>
      </Modal>

      <Modal
        open={!!resetTarget && !tempPassword}
        onClose={() => setResetTarget(null)}
        title={t('users.resetPassword')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetTarget(null)}>{t('common.cancel')}</Button>
            <Button variant="danger" loading={busy} onClick={doResetPassword}>{t('common.confirm')}</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">{resetTarget?.fullName}</p>
      </Modal>

      <Modal
        open={!!tempPassword}
        onClose={() => { setTempPassword(null); setResetTarget(null); }}
        title={t('users.tempPassword')}
        footer={<Button onClick={() => { setTempPassword(null); setResetTarget(null); }}>{t('common.close')}</Button>}
      >
        <p className="mb-2 text-xs text-slate-500">{t('users.tempPasswordHint')}</p>
        <code className="block rounded-lg bg-slate-100 p-3 font-mono text-sm" dir="ltr">{tempPassword}</code>
      </Modal>

      <ConfirmDialog
        open={!!revokeTarget}
        title={t('users.revokeSessions')}
        message={revokeTarget?.fullName ?? ''}
        confirmLabel={t('users.revokeSessions')}
        loading={busy}
        onConfirm={doRevokeSessions}
        onCancel={() => setRevokeTarget(null)}
      />
    </RequirePermission>
  );
}
