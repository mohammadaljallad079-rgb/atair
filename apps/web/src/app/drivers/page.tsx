'use client';

import { useI18n } from '@/i18n/provider';
import { Section, Card, CheckItem } from '@/components/ui/primitives';
import { RegistrationForm } from '@/components/forms/registration-form';

export default function DriversPage() {
  const { t } = useI18n();

  return (
    <>
      <section className="brand-gradient border-b border-slate-100">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">{t('drivers.title')}</h1>
          <p className="mt-3 max-w-2xl text-base text-slate-600">{t('drivers.subtitle')}</p>
        </div>
      </section>

      <Section>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <p className="text-sm leading-relaxed text-slate-600">{t('drivers.body')}</p>
            <ul className="mt-4 space-y-3">
              <CheckItem>{t('about.value.reliabilityBody')}</CheckItem>
              <CheckItem>{t('services.fleet.body')}</CheckItem>
              <CheckItem>{t('home.feature.payments.body')}</CheckItem>
            </ul>
            <p className="mt-5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">{t('drivers.note')}</p>
          </Card>
          <div>
            <h2 className="mb-4 text-lg font-bold text-slate-900">{t('register.driverTitle')}</h2>
            <RegistrationForm kind="driver" />
          </div>
        </div>
      </Section>
    </>
  );
}
