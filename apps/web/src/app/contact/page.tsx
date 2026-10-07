'use client';

import { FormEvent, useState } from 'react';
import { useI18n } from '@/i18n/provider';
import { useSetting } from '@/lib/site-provider';
import { endpoints } from '@/lib/endpoints';
import { ApiError } from '@/lib/api';
import { Section, Card } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Field, TextInput, Textarea } from '@/components/ui/field';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ContactPage() {
  const { t } = useI18n();
  const phone = useSetting('website.contactPhone', '');
  const email = useSetting('website.contactEmail', '');
  const address = useSetting('website.contactAddress', '');
  const hours = useSetting('website.contactHours', '');

  const [name, setName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validate(): string | null {
    if (!name.trim() || !subject.trim() || !message.trim()) return t('common.required');
    if (senderEmail.trim() && !EMAIL_RE.test(senderEmail.trim())) return t('common.error');
    if (message.trim().length < 10) return t('common.error');
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
    setSending(true);
    try {
      await endpoints.contact({
        name: name.trim(),
        email: senderEmail.trim() || undefined,
        phone: senderPhone.trim() || undefined,
        subject: subject.trim(),
        message: message.trim(),
      });
      setOk(true);
      setName('');
      setSenderEmail('');
      setSenderPhone('');
      setSubject('');
      setMessage('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('contact.error'));
    } finally {
      setSending(false);
    }
  }

  return (
    <Section>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h1 className="text-3xl font-extrabold text-slate-900">{t('contact.title')}</h1>
          <p className="mt-2 text-sm text-slate-600">{t('contact.subtitle')}</p>

          <Card className="mt-6">
            {ok && (
              <div role="status" className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {t('contact.success')}
              </div>
            )}
            <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
              <Field label={t('contact.name')} required>
                <TextInput value={name} onChange={(e) => setName(e.target.value)} required />
              </Field>
              <Field label={t('contact.email')}>
                <TextInput type="email" value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} dir="ltr" />
              </Field>
              <Field label={t('contact.phone')}>
                <TextInput value={senderPhone} onChange={(e) => setSenderPhone(e.target.value)} inputMode="tel" dir="ltr" />
              </Field>
              <Field label={t('contact.subject')} required>
                <TextInput value={subject} onChange={(e) => setSubject(e.target.value)} required />
              </Field>
              <div className="sm:col-span-2">
                <Field label={t('contact.message')} required>
                  <Textarea value={message} onChange={(e) => setMessage(e.target.value)} className="min-h-[140px]" required />
                </Field>
              </div>
              {error && (
                <p role="alert" className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
              )}
              <div className="sm:col-span-2">
                <Button type="submit" loading={sending}>{t('common.submit')}</Button>
              </div>
            </form>
          </Card>
        </div>

        <Card className="h-fit">
          <h2 className="text-base font-semibold text-slate-900">{t('footer.contact')}</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            {phone && (
              <li>
                <span className="block text-xs text-slate-400">{t('contact.phone')}</span>
                <a className="hover:text-brand-700" href={`tel:${phone.replace(/\s/g, '')}`} dir="ltr">{phone}</a>
              </li>
            )}
            {email && (
              <li>
                <span className="block text-xs text-slate-400">{t('contact.email')}</span>
                <a className="hover:text-brand-700" href={`mailto:${email}`} dir="ltr">{email}</a>
              </li>
            )}
            {address && (
              <li>
                <span className="block text-xs text-slate-400">{t('contact.address')}</span>
                {address}
              </li>
            )}
            {hours && (
              <li>
                <span className="block text-xs text-slate-400">{t('contact.hours')}</span>
                {hours}
              </li>
            )}
          </ul>
        </Card>
      </div>
    </Section>
  );
}
