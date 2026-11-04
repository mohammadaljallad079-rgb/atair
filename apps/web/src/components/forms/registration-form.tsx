'use client';

import { useState } from 'react';
import { useI18n } from '@/i18n/provider';
import { endpoints, RegistrationDocument } from '@/lib/endpoints';
import { ApiError } from '@/lib/api';
import { Card } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/field';

type Kind = 'driver' | 'merchant';

/**
 * Public self-registration form (driver / merchant).
 *
 * Submissions are anonymous and land in the admin approval queue as *pending*
 * accounts — the applicant cannot sign in until an administrator approves them.
 * The response is intentionally generic so the form cannot be used to probe
 * which phone numbers or emails already exist.
 */
export function RegistrationForm({ kind }: { kind: Kind }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [category, setCategory] = useState('');
  const [commercialReg, setCommercialReg] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [address, setAddress] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nationalIdUrl, setNationalIdUrl] = useState('');
  const [licenseUrl, setLicenseUrl] = useState('');
  const [commercialRegUrl, setCommercialRegUrl] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const documents: RegistrationDocument[] = [];
      if (nationalIdUrl.trim()) documents.push({ type: 'national_id', fileUrl: nationalIdUrl.trim(), number: nationalId || undefined });
      if (licenseUrl.trim()) documents.push({ type: 'license', fileUrl: licenseUrl.trim(), number: licenseNumber || undefined });
      if (commercialRegUrl.trim()) documents.push({ type: 'other', fileUrl: commercialRegUrl.trim(), number: commercialReg || undefined });

      if (kind === 'driver') {
        await endpoints.registerDriver({
          fullName,
          phone,
          email: email || undefined,
          nationalId: nationalId || undefined,
          licenseNumber: licenseNumber || undefined,
          vehiclePlate: vehiclePlate || undefined,
          username: username || undefined,
          password,
          documents: documents.length ? documents : undefined,
        });
      } else {
        await endpoints.registerMerchant({
          businessName,
          ownerName,
          phone,
          email: email || undefined,
          category: category || undefined,
          commercialReg: commercialReg || undefined,
          vatNumber: vatNumber || undefined,
          address: address || undefined,
          username: username || undefined,
          password,
          documents: documents.length ? documents : undefined,
        });
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Card className="mx-auto max-w-xl text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-2xl text-emerald-600">✓</div>
        <h3 className="text-lg font-bold text-slate-900">{t('register.successTitle')}</h3>
        <p className="mt-2 text-sm text-slate-500">{t('register.successBody')}</p>
      </Card>
    );
  }

  const isDriver = kind === 'driver';

  return (
    <Card className="mx-auto max-w-xl">
      <form className="space-y-3" onSubmit={submit}>
        {isDriver ? (
          <Field label={t('register.fullName')} required>
            <TextInput value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </Field>
        ) : (
          <>
            <Field label={t('register.businessName')} required>
              <TextInput value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
            </Field>
            <Field label={t('register.ownerName')} required>
              <TextInput value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required />
            </Field>
          </>
        )}

        <Field label={t('register.phone')} required>
          <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" placeholder="+9665xxxxxxxx" required />
        </Field>
        <Field label={t('register.email')}>
          <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
        </Field>

        {isDriver ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('register.nationalId')}>
                <TextInput value={nationalId} onChange={(e) => setNationalId(e.target.value)} dir="ltr" />
              </Field>
              <Field label={t('register.licenseNumber')}>
                <TextInput value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} dir="ltr" />
              </Field>
            </div>
            <Field label={t('register.vehiclePlate')}>
              <TextInput value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value)} dir="ltr" />
            </Field>
            <Field label={t('register.nationalIdDoc')} hint={t('register.docHint')}>
              <TextInput value={nationalIdUrl} onChange={(e) => setNationalIdUrl(e.target.value)} dir="ltr" placeholder="https://…" />
            </Field>
            <Field label={t('register.licenseDoc')} hint={t('register.docHint')}>
              <TextInput value={licenseUrl} onChange={(e) => setLicenseUrl(e.target.value)} dir="ltr" placeholder="https://…" />
            </Field>
          </>
        ) : (
          <>
            <Field label={t('register.category')}>
              <TextInput value={category} onChange={(e) => setCategory(e.target.value)} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('register.commercialReg')}>
                <TextInput value={commercialReg} onChange={(e) => setCommercialReg(e.target.value)} dir="ltr" />
              </Field>
              <Field label={t('register.vatNumber')}>
                <TextInput value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} dir="ltr" />
              </Field>
            </div>
            <Field label={t('register.address')}>
              <TextInput value={address} onChange={(e) => setAddress(e.target.value)} />
            </Field>
            <Field label={t('register.commercialRegDoc')} hint={t('register.docHint')}>
              <TextInput value={commercialRegUrl} onChange={(e) => setCommercialRegUrl(e.target.value)} dir="ltr" placeholder="https://…" />
            </Field>
          </>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('register.username')} hint={t('register.usernameHint')}>
            <TextInput value={username} onChange={(e) => setUsername(e.target.value)} dir="ltr" />
          </Field>
          <Field label={t('register.password')} required hint={t('register.passwordHint')}>
            <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" required minLength={8} />
          </Field>
        </div>

        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}

        <Button type="submit" loading={busy} className="w-full">{t('register.submit')}</Button>
        <p className="text-center text-xs text-slate-400">{t('register.approvalNote')}</p>
      </form>
    </Card>
  );
}
