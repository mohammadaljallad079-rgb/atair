'use client';

import { useState } from 'react';
import { endpoints } from '@/lib/endpoints';
import { useAuth } from '@/lib/auth-provider';
import { useI18n } from '@/i18n/provider';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { PageHeader, Card } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/field';

export default function ProfilePage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { notify } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  async function changePassword() {
    if (newPassword !== confirm) {
      notify(t('profile.passwordMismatch'), 'error');
      return;
    }
    setBusy(true);
    try {
      await endpoints.changePassword(currentPassword, newPassword);
      notify(t('profile.passwordChanged'));
      setCurrentPassword(''); setNewPassword(''); setConfirm('');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;

  return (
    <>
      <PageHeader title={t('auth.profile')} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t('common.details')}>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">{t('users.name')}</dt><dd>{user.fullName}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">{t('users.email')}</dt><dd dir="ltr">{user.email ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">{t('customers.phone')}</dt><dd dir="ltr">{user.phone ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">{t('users.roles')}</dt><dd>{user.roles.join(', ')}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">{t('auth.tenantSlug')}</dt><dd>{user.tenantSlug}</dd></div>
          </dl>
        </Card>

        <Card title={t('profile.changePassword')}>
          <div className="space-y-3">
            <Field label={t('profile.currentPassword')} required>
              <TextInput type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} dir="ltr" />
            </Field>
            <Field label={t('profile.newPassword')} required>
              <TextInput type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} dir="ltr" />
            </Field>
            <Field label={t('profile.confirmPassword')} required>
              <TextInput type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} dir="ltr" />
            </Field>
            <div className="flex justify-end">
              <Button loading={busy} disabled={!currentPassword || !newPassword} onClick={changePassword}>
                {t('common.save')}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
