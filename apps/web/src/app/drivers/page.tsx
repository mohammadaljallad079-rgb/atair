'use client';

import Link from 'next/link';
import { useI18n } from '@/i18n/provider';
import { Section, Card, CheckItem } from '@/components/ui/primitives';

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
        <Card className="mx-auto max-w-2xl">
          <p className="text-sm leading-relaxed text-slate-600">{t('drivers.body')}</p>
          <ul className="mt-4 space-y-3">
            <CheckItem>{t('about.value.reliabilityBody')}</CheckItem>
            <CheckItem>{t('services.fleet.body')}</CheckItem>
            <CheckItem>{t('home.feature.payments.body')}</CheckItem>
          </ul>
          <p className="mt-5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">{t('drivers.note')}</p>
          <Link
            href="/contact"
            className="mt-5 inline-flex rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700"
          >
            {t('drivers.cta')}
          </Link>
        </Card>
      </Section>
    </>
  );
}
