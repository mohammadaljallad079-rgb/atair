'use client';

import Link from 'next/link';
import { useI18n } from '@/i18n/provider';

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-6xl font-extrabold text-brand-600">404</p>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">{t('notFound.title')}</h1>
      <p className="mt-2 text-sm text-slate-500">{t('notFound.body')}</p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700"
      >
        {t('common.backHome')}
      </Link>
    </div>
  );
}
