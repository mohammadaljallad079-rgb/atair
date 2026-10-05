'use client';

import Link from 'next/link';
import { useI18n } from '@/i18n/provider';
import { Button } from '@/components/ui/button';

export default function ForbiddenPage() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <h1 className="text-lg font-bold text-slate-800">{t('forbidden.title')}</h1>
      <p className="max-w-sm text-sm text-slate-500">{t('forbidden.subtitle')}</p>
      <Link href="/dashboard"><Button size="sm" variant="secondary">{t('forbidden.back')}</Button></Link>
    </div>
  );
}
