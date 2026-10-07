'use client';

import Link from 'next/link';
import { useI18n } from '@/i18n/provider';
import { useSetting } from '@/lib/site-provider';
import { Section } from '@/components/ui/primitives';

export default function FaqPage() {
  const { t } = useI18n();
  const faq = useSetting('website.faq', [] as Array<{ q: string; a: string }>);

  return (
    <Section>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-extrabold text-slate-900">{t('faq.title')}</h1>
        <p className="mt-2 text-sm text-slate-600">{t('faq.subtitle')}</p>

        {faq.length ? (
          <div className="mt-6 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
            {faq.map((item) => (
              <details key={item.q} className="group p-4">
                <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900 marker:hidden">
                  <span className="flex items-center justify-between gap-3">
                    {item.q}
                    <span className="text-slate-400 transition-transform group-open:rotate-45" aria-hidden>+</span>
                  </span>
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.a}</p>
              </details>
            ))}
          </div>
        ) : (
          <p className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">{t('faq.empty')}</p>
        )}

        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
          {t('contact.subtitle')}{' '}
          <Link href="/contact" className="font-medium text-brand-700 hover:underline">{t('nav.contact')}</Link>
        </div>
      </div>
    </Section>
  );
}
