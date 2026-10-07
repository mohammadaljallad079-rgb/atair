'use client';

import Link from 'next/link';
import { useI18n } from '@/i18n/provider';
import { useSetting, useSite } from '@/lib/site-provider';
import { Section, SectionHeading, FeatureCard, Step, Icon, Pill, CheckItem } from '@/components/ui/primitives';

export default function HomePage() {
  const { t } = useI18n();
  const { site } = useSite();
  const heroTitle = useSetting('website.heroTitle', t('home.heroTitle'));
  const heroSubtitle = useSetting('website.heroSubtitle', t('home.heroSubtitle'));
  const areaCount = site?.serviceAreas.length ?? 0;

  return (
    <>
      <section className="brand-gradient border-b border-slate-100">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:py-20 lg:grid-cols-2">
          <div>
            <Pill>{t('home.badge')}</Pill>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl lg:text-5xl">
              {heroTitle}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">{heroSubtitle}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/track"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
              >
                {t('home.heroCta')}
              </Link>
              <Link
                href="/services"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-ink-800 transition-colors hover:bg-slate-50"
              >
                {t('home.heroSecondary')}
              </Link>
            </div>
            <ul className="mt-8 grid gap-2 sm:grid-cols-2">
              <CheckItem>{t('customers.point2')}</CheckItem>
              <CheckItem>{t('customers.point3')}</CheckItem>
              <CheckItem>{t('home.feature.pricing.title')}</CheckItem>
              <CheckItem>{t('home.feature.coverage.title')}</CheckItem>
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { value: areaCount || '—', label: t('home.stats.areas'), tone: 'bg-brand-50 text-brand-700' },
              { value: '2', label: t('home.stats.payments'), tone: 'bg-ink-50 text-ink-700' },
              { value: '24/7', label: t('home.stats.tracking'), tone: 'bg-slate-100 text-slate-700' },
              { value: '✓', label: t('home.stats.support'), tone: 'bg-emerald-50 text-emerald-700' },
            ].map((s) => (
              <div key={s.label} className={`rounded-2xl border border-slate-200 p-5 ${s.tone}`}>
                <p className="text-3xl font-extrabold">{s.value}</p>
                <p className="mt-1 text-xs font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Section>
        <SectionHeading title={t('home.features.title')} subtitle={t('home.features.subtitle')} center />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard icon={<Icon name="pricing" />} title={t('home.feature.pricing.title')} body={t('home.feature.pricing.body')} />
          <FeatureCard icon={<Icon name="tracking" />} title={t('home.feature.tracking.title')} body={t('home.feature.tracking.body')} />
          <FeatureCard icon={<Icon name="map" />} title={t('home.feature.coverage.title')} body={t('home.feature.coverage.body')} />
          <FeatureCard icon={<Icon name="wallet" />} title={t('home.feature.payments.title')} body={t('home.feature.payments.body')} />
        </div>
      </Section>

      <Section muted>
        <SectionHeading title={t('home.how.title')} center />
        <div className="grid gap-4 sm:grid-cols-3">
          <Step index={1} title={t('home.how.step1.title')} body={t('home.how.step1.body')} />
          <Step index={2} title={t('home.how.step2.title')} body={t('home.how.step2.body')} />
          <Step index={3} title={t('home.how.step3.title')} body={t('home.how.step3.body')} />
        </div>
      </Section>

      <Section>
        <div className="brand-ink-gradient overflow-hidden rounded-3xl px-6 py-10 text-center text-white sm:px-12 sm:py-14">
          <h2 className="text-2xl font-bold sm:text-3xl">{t('home.cta.title')}</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-white/90">{t('home.cta.body')}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/business" className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-brand-700 transition-colors hover:bg-slate-100">
              {t('home.cta.business')}
            </Link>
            <Link href="/contact" className="rounded-xl border border-white/60 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10">
              {t('home.cta.contact')}
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
