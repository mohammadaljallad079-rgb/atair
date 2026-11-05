'use client';

import { useState } from 'react';
import { endpoints } from '@/lib/endpoints';
import { useAsync } from '@/lib/use-async';
import { useI18n } from '@/i18n/provider';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { Modal } from '@/components/ui/filters';
import { Field, TextInput, Select } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import {
  APPROVAL_STATUSES,
  DRIVER_CLASSIFICATIONS,
  DRIVER_DOCUMENT_TYPES,
  EMPLOYMENT_TYPES,
} from '@/lib/constants';

interface DocumentRow {
  type: string;
  fileUrl: string;
  number: string;
  expiresAt: string;
}

const emptyDoc = (): DocumentRow => ({ type: 'national_id', fileUrl: '', number: '', expiresAt: '' });

/**
 * Admin "Add Driver" form.
 *
 * Creates the driver record, its login account and its documents in one API
 * call (a single server-side transaction), so a failure never leaves an orphan
 * user. Phone/national-id/account duplicates are rejected by the API and shown
 * inline.
 */
export function AddDriverDialog({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: () => void;
}) {
  const { t } = useI18n();
  const { notify } = useToast();

  const vehicleTypes = useAsync(() => endpoints.allVehicleTypes(), [open]);
  const zones = useAsync(() => endpoints.zones({ pageSize: 100 }), [open]);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [nationality, setNationality] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved'>('pending');

  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [classification, setClassification] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [employmentType, setEmploymentType] = useState('');

  const [vehicleTypeId, setVehicleTypeId] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');

  const [documents, setDocuments] = useState<DocumentRow[]>([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function reset() {
    setFullName(''); setPhone(''); setEmail(''); setNationality(''); setNationalId('');
    setDateOfBirth(''); setAddress('');
    setUsername(''); setPassword(''); setApprovalStatus('pending');
    setLicenseNumber(''); setLicenseExpiry(''); setClassification(''); setZoneId(''); setEmploymentType('');
    setVehicleTypeId(''); setVehiclePlate(''); setVehicleMake(''); setVehicleModel('');
    setDocuments([]);
    setError('');
  }

  async function submit() {
    setError('');
    if (!fullName.trim() || !phone.trim()) {
      setError(t('drivers.form.required'));
      return;
    }
    setBusy(true);
    try {
      const docs = documents
        .filter((d) => d.fileUrl.trim())
        .map((d) => ({
          type: d.type,
          fileUrl: d.fileUrl.trim(),
          number: d.number || undefined,
          expiresAt: d.expiresAt ? new Date(d.expiresAt).toISOString() : undefined,
        }));

      await endpoints.createDriver({
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email || undefined,
        nationalId: nationalId || undefined,
        nationality: nationality || undefined,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString() : undefined,
        address: address || undefined,
        licenseNumber: licenseNumber || undefined,
        licenseExpiry: licenseExpiry ? new Date(licenseExpiry).toISOString() : undefined,
        classification: classification || undefined,
        zoneId: zoneId || undefined,
        employmentType: employmentType || undefined,
        vehicleTypeId: vehicleTypeId || undefined,
        vehiclePlate: vehiclePlate || undefined,
        vehicleMake: vehicleMake || undefined,
        vehicleModel: vehicleModel || undefined,
        approvalStatus,
        documents: docs.length ? docs : undefined,
        account: password
          ? { username: username || undefined, email: email || undefined, password }
          : undefined,
      });
      notify(t('drivers.form.created'));
      reset();
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose(); }}
      title={t('drivers.form.title')}
      wide
      footer={
        <>
          <Button variant="secondary" onClick={() => { reset(); onClose(); }}>{t('common.cancel')}</Button>
          <Button loading={busy} onClick={submit}>{t('drivers.form.submit')}</Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Personal */}
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{t('drivers.form.personal')}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('drivers.form.fullName')} required>
              <TextInput value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </Field>
            <Field label={t('drivers.form.phone')} required>
              <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" placeholder="+9665xxxxxxxx" />
            </Field>
            <Field label={t('drivers.form.email')}>
              <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
            </Field>
            <Field label={t('drivers.form.nationality')}>
              <TextInput value={nationality} onChange={(e) => setNationality(e.target.value)} />
            </Field>
            <Field label={t('drivers.form.nationalId')}>
              <TextInput value={nationalId} onChange={(e) => setNationalId(e.target.value)} dir="ltr" />
            </Field>
            <Field label={t('drivers.form.dateOfBirth')}>
              <TextInput type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} dir="ltr" />
            </Field>
            <Field label={t('drivers.form.address')}>
              <TextInput value={address} onChange={(e) => setAddress(e.target.value)} />
            </Field>
          </div>
        </section>

        {/* Account */}
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{t('drivers.form.account')}</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={t('users.username')} hint={t('users.usernameHint')}>
              <TextInput value={username} onChange={(e) => setUsername(e.target.value)} dir="ltr" />
            </Field>
            <Field label={t('drivers.form.password')} hint={t('drivers.form.passwordHint')}>
              <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" minLength={8} />
            </Field>
            <Field label={t('drivers.form.accountStatus')}>
              <Select value={approvalStatus} onChange={(e) => setApprovalStatus(e.target.value as 'pending' | 'approved')}>
                {APPROVAL_STATUSES.filter((s) => s === 'pending' || s === 'approved').map((s) => (
                  <option key={s} value={s}>{t(`status.${s}`)}</option>
                ))}
              </Select>
            </Field>
          </div>
        </section>

        {/* Driver info */}
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{t('drivers.form.driverInfo')}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('drivers.form.licenseNumber')}>
              <TextInput value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} dir="ltr" />
            </Field>
            <Field label={t('drivers.form.licenseExpiry')}>
              <TextInput type="date" value={licenseExpiry} onChange={(e) => setLicenseExpiry(e.target.value)} dir="ltr" />
            </Field>
            <Field label={t('drivers.form.classification')}>
              <Select value={classification} onChange={(e) => setClassification(e.target.value)}>
                <option value="">—</option>
                {DRIVER_CLASSIFICATIONS.map((c) => <option key={c} value={c}>{t(`driverClass.${c}`)}</option>)}
              </Select>
            </Field>
            <Field label={t('drivers.form.zone')}>
              <Select value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
                <option value="">—</option>
                {(zones.data?.items ?? []).map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </Select>
            </Field>
            <Field label={t('drivers.form.employmentType')}>
              <Select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)}>
                <option value="">—</option>
                {EMPLOYMENT_TYPES.map((c) => <option key={c} value={c}>{t(`employment.${c}`)}</option>)}
              </Select>
            </Field>
          </div>
        </section>

        {/* Vehicle */}
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{t('drivers.form.vehicle')}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('drivers.form.vehicleType')}>
              <Select value={vehicleTypeId} onChange={(e) => setVehicleTypeId(e.target.value)}>
                <option value="">—</option>
                {(vehicleTypes.data ?? []).map((vt) => <option key={vt.id} value={vt.id}>{vt.name}</option>)}
              </Select>
            </Field>
            <Field label={t('drivers.form.vehiclePlate')}>
              <TextInput value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value)} dir="ltr" />
            </Field>
            <Field label={t('drivers.form.vehicleMake')}>
              <TextInput value={vehicleMake} onChange={(e) => setVehicleMake(e.target.value)} />
            </Field>
            <Field label={t('drivers.form.vehicleModel')}>
              <TextInput value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} />
            </Field>
          </div>
        </section>

        {/* Documents */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('drivers.form.documents')}</h3>
            <Button size="sm" variant="secondary" onClick={() => setDocuments((d) => [...d, emptyDoc()])}>
              {t('drivers.form.addDocument')}
            </Button>
          </div>
          {documents.length === 0 && <p className="text-xs text-slate-400">{t('drivers.form.noDocuments')}</p>}
          <div className="space-y-2">
            {documents.map((doc, i) => (
              <div key={i} className="grid gap-2 rounded-lg border border-slate-200 p-2 sm:grid-cols-[1fr_2fr_1fr_1fr_auto]">
                <Select
                  value={doc.type}
                  onChange={(e) => setDocuments((d) => d.map((x, j) => (j === i ? { ...x, type: e.target.value } : x)))}
                  aria-label={t('drivers.form.documentType')}
                >
                  {DRIVER_DOCUMENT_TYPES.map((dt) => <option key={dt} value={dt}>{t(`docType.${dt}`)}</option>)}
                </Select>
                <TextInput
                  value={doc.fileUrl}
                  onChange={(e) => setDocuments((d) => d.map((x, j) => (j === i ? { ...x, fileUrl: e.target.value } : x)))}
                  placeholder="https://…"
                  dir="ltr"
                  aria-label={t('drivers.form.documentUrl')}
                />
                <TextInput
                  value={doc.number}
                  onChange={(e) => setDocuments((d) => d.map((x, j) => (j === i ? { ...x, number: e.target.value } : x)))}
                  dir="ltr"
                  aria-label={t('drivers.form.documentNumber')}
                />
                <TextInput
                  type="date"
                  value={doc.expiresAt}
                  onChange={(e) => setDocuments((d) => d.map((x, j) => (j === i ? { ...x, expiresAt: e.target.value } : x)))}
                  dir="ltr"
                  aria-label={t('drivers.form.documentExpiry')}
                />
                <Button size="sm" variant="ghost" onClick={() => setDocuments((d) => d.filter((_, j) => j !== i))}>
                  ✕
                </Button>
              </div>
            ))}
          </div>
        </section>

        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
      </div>
    </Modal>
  );
}
