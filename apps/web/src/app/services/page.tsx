'use client';

import Link from 'next/link';
import { useI18n } from '@/i18n/provider';
import { Section, SectionHeading, FeatureCard, Icon } from '@/components/ui/primitives';

export default function ServicesPage() {
  const { t } = useI18n();

  const services = [
    { icon: 'truck' as const, title: t('services.lastmile.title'), body: t('services.lastmile.body') },
    { icon: 'map' as const, title: t('services.internal.title'), body: t('services.internal.body') },
    { icon: 'wallet' as const, title: t('services.cod.title'), body: t('services.cod.body') },
    { icon: 'clock' as const, title: t('services.scheduled.title'), body: t('services.scheduled.body') },
    { icon: 'tracking' as const, title: t('services.tracking.title'), body: t('services.tracking.body') },
    { icon: 'truck' as const, title: t('services.fleet.title'), body: t('services.fleet.body') },
  ];

  return (
    <>
      <section className="brand-gradient border-b border-slate-100">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">{t('services.title')}</h1>
          <p className="mt-3 max-w-2xl text-base text-slate-600">{t('services.subtitle')}</p>
        </div>
      </section>

      <Section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <FeatureCard key={s.title} icon={<Icon name={s.icon} />} title={s.title} body={s.body} />
          ))}
        </div>
      </Section>

      <Section muted>
        <SectionHeading title={t('home.cta.title')} subtitle={t('home.cta.body')} center />
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/business" className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700">
            {t('home.cta.business')}
          </Link>
          <Link href="/track" className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-ink-800 hover:bg-slate-50">
            {t('home.heroCta')}
          </Link>
        </div>
      </Section>
    </>
  );
}
