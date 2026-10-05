'use client';

import { useEffect, useState } from 'react';
import { endpoints } from '@/lib/endpoints';
import { useAuth } from '@/lib/auth-provider';
import { useI18n } from '@/i18n/provider';
import { useAsync } from '@/lib/use-async';
import { useToast } from '@/components/ui/toast';
import { PageHeader, Card, ErrorState } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/field';

export default function ProfilePage() {
  const { t } = useI18n();
  const { merchant } = useAuth();
  const { notify } = useToast();
  const { data: profile, error, reload } = useAsync((s) => endpoints.profile(s), []);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName);
      setEmail(profile.email ?? '');
      setPhone(profile.phone ?? '');
    }
  }, [profile]);

  if (error) return <ErrorState error={error} onRetry={reload} />;

  async function saveProfile() {
    setSaving(true);
    try {
      await endpoints.updateProfile({ fullName: fullName.trim(), email: email.trim() || undefined, phone: phone.trim() || undefined });
      notify(t('profile.updateSuccess'));
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    if (pwd.next !== pwd.confirm) {
      notify(t('profile.passwordMismatch'), 'error');
      return;
    }
    setChanging(true);
    try {
      await endpoints.changePassword(pwd.current, pwd.next);
      notify(t('profile.passwordChanged'));
      setPwd({ current: '', next: '', confirm: '' });
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setChanging(false);
    }
  }

  return (
    <div>
      <PageHeader title={t('profile.title')} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={t('profile.title')} className="lg:col-span-2">
          <div className="space-y-3">
            <Field label={t('team.member')}>
              <TextInput value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('customers.email')}>
                <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
              </Field>
              <Field label={t('customers.phone')}>
                <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" />
              </Field>
            </div>
            <div className="flex justify-end">
              <Button loading={saving} disabled={!fullName.trim()} onClick={saveProfile}>{t('common.save')}</Button>
            </div>
          </div>
        </Card>

        <Card title={t('profile.merchant')}>
          <dl className="space-y-2 text-sm">
            <Row label={t('profile.merchant')} value={merchant?.merchantName ?? '—'} />
            <Row label={t('profile.role')} value={merchant?.merchantRole ? t(`role.${merchant.merchantRole}`) : '—'} />
            <Row label={t('common.status')} value={merchant?.merchantStatus ?? '—'} />
          </dl>
        </Card>

        <Card title={t('profile.changePassword')} className="lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={t('profile.currentPassword')} required>
              <TextInput type="password" value={pwd.current} onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))} dir="ltr" />
            </Field>
            <Field label={t('profile.newPassword')} required>
              <TextInput type="password" value={pwd.next} onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))} dir="ltr" />
            </Field>
            <Field label={t('profile.confirmPassword')} required>
              <TextInput type="password" value={pwd.confirm} onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))} dir="ltr" />
            </Field>
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              loading={changing}
              disabled={!pwd.current || pwd.next.length < 8 || !pwd.confirm}
              onClick={changePassword}
            >
              {t('profile.changePassword')}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-slate-800">{value}</dd>
    </div>
  );
}
