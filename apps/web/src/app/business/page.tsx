'use client';

import Link from 'next/link';
import { useI18n } from '@/i18n/provider';
import { Section, SectionHeading, Card, CheckItem, Icon } from '@/components/ui/primitives';
import { MERCHANT_URL } from '@/components/layout/navbar';

export default function BusinessPage() {
  const { t } = useI18n();

  return (
    <>
      <section className="brand-gradient border-b border-slate-100">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">{t('business.title')}</h1>
          <p className="mt-3 max-w-2xl text-base text-slate-600">{t('business.subtitle')}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/contact" className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700">
              {t('business.cta')}
            </Link>
            <a href={MERCHANT_URL} className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-ink-800 hover:bg-slate-50">
              {t('nav.business')}
            </a>
          </div>
        </div>
      </section>

      <Section>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <h2 className="text-lg font-bold text-slate-900">{t('business.title')}</h2>
            <ul className="mt-4 space-y-3">
              <CheckItem>{t('business.point1')}</CheckItem>
              <CheckItem>{t('business.point2')}</CheckItem>
              <CheckItem>{t('business.point3')}</CheckItem>
              <CheckItem>{t('business.point4')}</CheckItem>
            </ul>
          </Card>
          <div className="grid gap-4">
            <Card>
              <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600" aria-hidden>
                <Icon name="pricing" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">{t('home.feature.pricing.title')}</h3>
              <p className="mt-1.5 text-sm text-slate-500">{t('home.feature.pricing.body')}</p>
            </Card>
            <Card>
              <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-ink-50 text-ink-600" aria-hidden>
                <Icon name="tracking" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">{t('home.feature.tracking.title')}</h3>
              <p className="mt-1.5 text-sm text-slate-500">{t('home.feature.tracking.body')}</p>
            </Card>
          </div>
        </div>
      </Section>

      <Section muted>
        <SectionHeading title={t('home.cta.title')} subtitle={t('home.cta.body')} center />
        <div className="flex justify-center">
          <Link href="/contact" className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700">
            {t('home.cta.contact')}
          </Link>
        </div>
      </Section>
    </>
  );
}
