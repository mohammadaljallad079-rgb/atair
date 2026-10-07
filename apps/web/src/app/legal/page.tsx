'use client';

import Link from 'next/link';
import { useI18n } from '@/i18n/provider';
import { Section, Card } from '@/components/ui/primitives';

export default function LegalPage() {
  const { t } = useI18n();

  return (
    <Section>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-extrabold text-slate-900">{t('legal.title')}</h1>
        <p className="mt-2 text-sm text-slate-600">{t('legal.subtitle')}</p>

        <Card className="mt-6">
          <h2 className="text-lg font-bold text-slate-900">{t('legal.terms.title')}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{t('legal.terms.body')}</p>
        </Card>

        <Card className="mt-4">
          <h2 className="text-lg font-bold text-slate-900">{t('legal.privacy.title')}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{t('legal.privacy.body')}</p>
        </Card>

        <p className="mt-6 text-sm text-slate-500">
          {t('legal.contact')}{' '}
          <Link href="/contact" className="font-medium text-brand-700 hover:underline">{t('nav.contact')}</Link>
        </p>
      </div>
    </Section>
  );
}
