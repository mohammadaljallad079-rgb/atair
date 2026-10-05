'use client';

import { useState } from 'react';
import { endpoints } from '@/lib/endpoints';
import { useI18n } from '@/i18n/provider';
import { useAsync } from '@/lib/use-async';
import { useToast } from '@/components/ui/toast';
import { formatDateTime } from '@/lib/format';
import { BUSINESS_ROLES } from '@/lib/constants';
import { PageHeader, Card, ErrorState } from '@/components/ui/primitives';
import { DataTable, type Column } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/filters';
import { Field, TextInput, Select } from '@/components/ui/field';
import type { MerchantTeamMember } from '@/lib/types';

interface InviteForm { fullName: string; email: string; phone: string; password: string; role: string; branchId: string }
const EMPTY_INVITE: InviteForm = { fullName: '', email: '', phone: '', password: '', role: 'operator', branchId: '' };

export default function TeamPage() {
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const { data: team, loading, error, reload } = useAsync((s) => endpoints.team(undefined, s), []);
  const { data: branches } = useAsync((s) => endpoints.branches({ pageSize: 100 }, s), []);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<InviteForm>(EMPTY_INVITE);
  const [editMember, setEditMember] = useState<MerchantTeamMember | null>(null);
  const [editRole, setEditRole] = useState('operator');
  const [editBranch, setEditBranch] = useState('');

  async function invite() {
    setSaving(true);
    try {
      await endpoints.inviteTeamMember({
        fullName: form.fullName.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        password: form.password,
        role: form.role,
        branchId: form.branchId || undefined,
      });
      notify(t('team.inviteSuccess'));
      setOpen(false);
      setForm(EMPTY_INVITE);
      reload();
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit() {
    if (!editMember) return;
    setSaving(true);
    try {
      await endpoints.updateTeamMember(editMember.userId, {
        role: editRole,
        branchId: editBranch || null,
      });
      notify(t('team.updateSuccess'));
      setEditMember(null);
      reload();
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<MerchantTeamMember>[] = [
    { key: 'fullName', header: t('team.member'), render: (r) => <span className="font-medium text-slate-900">{r.fullName}</span> },
    { key: 'email', header: t('customers.email'), render: (r) => r.email ?? '—' },
    { key: 'role', header: t('team.role'), render: (r) => t(`role.${r.role}`) },
    { key: 'branch', header: t('team.branch'), render: (r) => r.branchName ?? '—' },
    { key: 'status', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
    { key: 'lastLoginAt', header: t('team.lastLogin'), render: (r) => formatDateTime(r.lastLoginAt, locale) },
    {
      key: 'actions', header: t('common.actions'), align: 'end',
      render: (r) => (
        <Button
          size="sm" variant="secondary"
          onClick={() => { setEditMember(r); setEditRole(r.role); setEditBranch(r.branchId ?? ''); }}
        >
          {t('common.edit')}
        </Button>
      ),
    },
  ];

  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div>
      <PageHeader
        title={t('team.title')}
        subtitle={t('team.subtitle')}
        actions={<Button onClick={() => { setForm(EMPTY_INVITE); setOpen(true); }}>{t('team.invite')}</Button>}
      />

      <Card>
        <DataTable columns={columns} rows={team ?? []} rowKey={(r) => r.userId} loading={loading} />
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('team.invite')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button
              loading={saving}
              disabled={!form.fullName.trim() || (!form.email.trim() && !form.phone.trim()) || form.password.length < 8}
              onClick={invite}
            >
              {t('common.create')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label={t('team.member')} required>
            <TextInput value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
          </Field>
          <Field label={t('customers.email')}>
            <TextInput type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} dir="ltr" />
          </Field>
          <Field label={t('customers.phone')}>
            <TextInput value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} dir="ltr" />
          </Field>
          <Field label={t('team.password')} required hint={t('team.passwordHint')}>
            <TextInput type="text" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} dir="ltr" />
          </Field>
          <Field label={t('team.role')}>
            <Select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
              {BUSINESS_ROLES.filter((r) => r !== 'owner').map((r) => <option key={r} value={r}>{t(`role.${r}`)}</option>)}
            </Select>
          </Field>
          <Field label={t('team.branch')}>
            <Select value={form.branchId} onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}>
              <option value="">—</option>
              {branches?.items.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </Field>
        </div>
      </Modal>

      <Modal
        open={!!editMember}
        onClose={() => setEditMember(null)}
        title={editMember?.fullName ?? ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditMember(null)}>{t('common.cancel')}</Button>
            <Button loading={saving} onClick={saveEdit}>{t('common.save')}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label={t('team.role')}>
            <Select value={editRole} onChange={(e) => setEditRole(e.target.value)} disabled={editMember?.role === 'owner'}>
              {BUSINESS_ROLES.map((r) => <option key={r} value={r}>{t(`role.${r}`)}</option>)}
            </Select>
          </Field>
          {editMember?.role === 'owner' && <p className="text-xs text-amber-600">{t('team.lastOwner')}</p>}
          <Field label={t('team.branch')}>
            <Select value={editBranch} onChange={(e) => setEditBranch(e.target.value)}>
              <option value="">—</option>
              {branches?.items.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </Field>
        </div>
      </Modal>
    </div>
  );
}
