'use client';

import { useI18n } from '@/i18n/provider';
import { useSetting } from '@/lib/site-provider';
import { Section, SectionHeading, Card, FeatureCard, Icon } from '@/components/ui/primitives';

export default function AboutPage() {
  const { t } = useI18n();
  const about = useSetting('website.aboutBody', t('home.features.subtitle'));
  const companyName = useSetting('website.companyName', t('app.name'));

  return (
    <>
      <section className="brand-gradient border-b border-slate-100">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">{t('about.title')}</h1>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-600">{about}</p>
        </div>
      </section>

      <Section>
        <SectionHeading title={t('about.values.title')} center />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard icon={<Icon name="shield" />} title={t('about.value.reliability')} body={t('about.value.reliabilityBody')} />
          <FeatureCard icon={<Icon name="pricing" />} title={t('about.value.transparency')} body={t('about.value.transparencyBody')} />
          <FeatureCard icon={<Icon name="map" />} title={t('about.value.coverage')} body={t('about.value.coverageBody')} />
          <FeatureCard icon={<Icon name="chat" />} title={t('about.value.support')} body={t('about.value.supportBody')} />
        </div>
      </Section>

      <Section muted>
        <Card className="mx-auto max-w-2xl text-center">
          <p className="text-sm text-slate-500">{companyName}</p>
        </Card>
      </Section>
    </>
  );
}
