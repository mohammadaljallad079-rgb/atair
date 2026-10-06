'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-provider';
import { useI18n } from '@/i18n/provider';
import { endpoints } from '@/lib/endpoints';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { Locale } from '@/i18n/dictionary';
import { Card, PageHeader } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Field, Select, TextInput } from '@/components/ui/field';
import { useToast } from '@/components/ui/toast';

export default function ProfilePage() {
  const { profile, refreshMe, logout } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const { notify } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName);
      setEmail(profile.email ?? '');
    }
  }, [profile]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await endpoints.updateProfile({
        fullName: fullName.trim(),
        email: email.trim() || undefined,
        locale,
      });
      await refreshMe();
      notify(t('profile.updateSuccess'), 'success');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function onChangePassword(e: FormEvent) {
    e.preventDefault();
    setChanging(true);
    try {
      await endpoints.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      notify(t('cust.profile.passwordChanged'), 'success');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setChanging(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t('cust.profile.title')} subtitle={profile?.phone ?? undefined} />

      <Card title={t('cust.profile.title')}>
        <form onSubmit={onSave} className="space-y-3">
          <Field label={t('cust.profile.name')}>
            <TextInput value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Field>
          <Field label={t('cust.profile.email')}>
            <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
          </Field>
          <Field label={t('cust.profile.phone')}>
            <TextInput value={profile?.phone ?? ''} disabled dir="ltr" />
          </Field>
          <Field label={t('cust.profile.language')}>
            <Select value={locale} onChange={(e) => setLocale(e.target.value as Locale)}>
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </Select>
          </Field>
          {profile?.createdAt && (
            <p className="text-xs text-slate-400">
              {t('cust.profile.memberSince')} {formatDate(profile.createdAt, locale)}
            </p>
          )}
          <Button type="submit" loading={saving}>
            {t('cust.profile.save')}
          </Button>
        </form>
      </Card>

      <Card title={t('cust.profile.changePassword')}>
        <form onSubmit={onChangePassword} className="space-y-3">
          <Field label={t('cust.profile.currentPassword')} required>
            <TextInput
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              dir="ltr"
              required
            />
          </Field>
          <Field label={t('cust.profile.newPassword')} required>
            <TextInput
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              dir="ltr"
              required
            />
          </Field>
          <Button type="submit" variant="secondary" loading={changing}>
            {t('cust.profile.changePassword')}
          </Button>
        </form>
      </Card>

      <Button variant="danger" className="w-full" onClick={() => void logout()}>
        {t('cust.profile.logout')}
      </Button>
    </div>
  );
}
