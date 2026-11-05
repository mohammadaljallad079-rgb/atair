'use client';

import Link from 'next/link';
import { useI18n } from '@/i18n/provider';
import { useSite } from '@/lib/site-provider';
import { Section, SectionHeading, Card, CheckItem } from '@/components/ui/primitives';
import { CUSTOMER_URL } from '@/components/layout/navbar';

export default function CustomersPage() {
  const { t } = useI18n();
  const { site } = useSite();

  return (
    <>
      <section className="brand-gradient border-b border-slate-100">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">{t('customers.title')}</h1>
          <p className="mt-3 max-w-2xl text-base text-slate-600">{t('customers.subtitle')}</p>
          <Link href="/track" className="mt-6 inline-flex rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700">
            {t('customers.cta')}
          </Link>
        </div>
      </section>

      <Section>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="text-lg font-bold text-slate-900">{t('customers.title')}</h2>
            <ul className="mt-4 space-y-3">
              <CheckItem>{t('customers.point1')}</CheckItem>
              <CheckItem>{t('customers.point2')}</CheckItem>
              <CheckItem>{t('customers.point3')}</CheckItem>
              <CheckItem>{t('customers.point4')}</CheckItem>
            </ul>
          </Card>
          <Card>
            <h2 className="text-lg font-bold text-slate-900">{t('customers.areasTitle')}</h2>
            {site?.serviceAreas.length ? (
              <ul className="mt-4 flex flex-wrap gap-2">
                {site.serviceAreas.map((z) => (
                  <li key={z.code} className="rounded-full bg-ink-50 px-3 py-1 text-sm font-medium text-ink-700">
                    {z.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-slate-500">{t('customers.areasEmpty')}</p>
            )}
          </Card>
        </div>
      </Section>

      <Section muted>
        <SectionHeading title={t('home.how.title')} center />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <Card key={n}>
              <h3 className="text-base font-semibold text-slate-900">{t(`home.how.step${n}.title`)}</h3>
              <p className="mt-1.5 text-sm text-slate-500">{t(`home.how.step${n}.body`)}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section>
        <div className="grid items-center gap-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 lg:grid-cols-[2fr_1fr]">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{t('register.customerTitle')}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{t('register.customerBody')}</p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <a
              href={`${CUSTOMER_URL}/register`}
              className="inline-flex rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              {t('register.customerCta')}
            </a>
            <a
              href={CUSTOMER_URL}
              className="inline-flex rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-ink-800 transition-colors hover:bg-slate-50"
            >
              {t('nav.login')}
            </a>
          </div>
        </div>
      </Section>
    </>
  );
}
