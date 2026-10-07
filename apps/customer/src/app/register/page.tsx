'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-provider';
import { useI18n } from '@/i18n/provider';
import { ApiError } from '@/lib/api';
import { endpoints } from '@/lib/endpoints';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/field';
import { BrandLogo } from '@/components/brand/brand-logo';

const PHONE_RE = /^\+?[0-9\s-]{7,15}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const { register, status } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [requiresTenant, setRequiresTenant] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') router.replace('/home');
  }, [status, router]);

  useEffect(() => {
    const ctrl = new AbortController();
    endpoints
      .authConfig(ctrl.signal)
      .then((cfg) => {
        setRequiresTenant(cfg.requiresTenantSlug);
        if (!cfg.requiresTenantSlug && cfg.tenantSlug) setTenantSlug(cfg.tenantSlug);
      })
      .catch(() => undefined);
    return () => ctrl.abort();
  }, []);

  function validate(): string | null {
    if (!fullName.trim()) return t('cust.err.required');
    if (!PHONE_RE.test(phone.trim())) return t('cust.err.invalidPhone');
    if (email.trim() && !EMAIL_RE.test(email.trim())) return t('cust.err.invalidEmail');
    if (password.length < 8) return t('cust.err.weakPassword');
    if (requiresTenant && !tenantSlug.trim()) return t('cust.err.required');
    return null;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await register({
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        password,
        tenantSlug: tenantSlug.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-ink-50 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-5 flex items-center justify-between">
          <BrandLogo variant="login" />
          <div className="inline-flex overflow-hidden rounded-lg border border-slate-200">
            {(['ar', 'en'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLocale(l)}
                className={`px-2.5 py-1 text-xs font-medium ${
                  locale === l ? 'bg-ink-700 text-white' : 'bg-white text-slate-600'
                }`}
              >
                {l === 'ar' ? 'ع' : 'EN'}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-bold text-slate-900">{t('cust.auth.register')}</h1>
          <p className="mb-5 mt-0.5 text-sm text-slate-500">{t('cust.tagline')}</p>

          <form onSubmit={onSubmit} className="space-y-3" noValidate>
            <Field label={t('cust.auth.fullName')} required>
              <TextInput value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </Field>
            <Field label={t('cust.auth.phone')} required>
              <TextInput
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                inputMode="tel"
                dir="ltr"
                required
              />
            </Field>
            <Field label={t('cust.auth.email')}>
              <TextInput
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                dir="ltr"
              />
            </Field>
            <Field label={t('cust.auth.password')} required>
              <TextInput
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                dir="ltr"
                required
              />
            </Field>
            {requiresTenant && (
              <Field label={t('cust.auth.tenantSlug')} hint={t('cust.auth.tenantHint')}>
                <TextInput value={tenantSlug} onChange={(e) => setTenantSlug(e.target.value)} dir="ltr" />
              </Field>
            )}

            {error && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" loading={loading}>
              {t('cust.auth.register')}
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-slate-500">
            {t('cust.auth.haveAccount')}{' '}
            <Link href="/login" className="font-medium text-ink-700 hover:underline">
              {t('cust.auth.login')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
