'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/i18n/provider';
import { BrandLogo } from '@/components/brand/brand-logo';
import { cn } from '@/lib/cn';

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3001';
const MERCHANT_URL = process.env.NEXT_PUBLIC_MERCHANT_URL ?? 'http://localhost:3002';
const CUSTOMER_URL = process.env.NEXT_PUBLIC_CUSTOMER_URL ?? 'http://localhost:3003';

const LINKS = [
  { href: '/services', key: 'nav.services' },
  { href: '/customers', key: 'nav.customers' },
  { href: '/business', key: 'nav.business' },
  { href: '/track', key: 'nav.track' },
  { href: '/about', key: 'nav.about' },
  { href: '/faq', key: 'nav.faq' },
  { href: '/contact', key: 'nav.contact' },
];

function LanguageSwitch() {
  const { locale, setLocale } = useI18n();
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-slate-200">
      {(['ar', 'en'] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          aria-label={l === 'ar' ? 'العربية' : 'English'}
          aria-pressed={locale === l}
          className={cn(
            'px-2.5 py-1 text-xs font-medium transition-colors',
            locale === l ? 'bg-ink-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-100',
          )}
        >
          {l === 'ar' ? 'ع' : 'EN'}
        </button>
      ))}
    </div>
  );
}

export function Navbar() {
  const { t } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5" aria-label={t('common.home')}>
        <Link href="/" className="shrink-0" onClick={() => setOpen(false)}>
          <BrandLogo variant="navigation" subtitle={t('app.tagline')} />
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  )}
                >
                  {t(l.key)}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <LanguageSwitch />
          </div>
          <Link
            href={`${CUSTOMER_URL}`}
            className="hidden rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 sm:inline-flex"
          >
            {t('nav.login')}
          </Link>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={t('common.home')}
            onClick={() => setOpen((o) => !o)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </nav>

      {open && (
        <div id="mobile-nav" className="border-t border-slate-200 bg-white lg:hidden">
          <ul className="mx-auto grid max-w-6xl gap-1 px-4 py-3">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'block rounded-lg px-3 py-2.5 text-sm font-medium',
                    pathname === l.href ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-100',
                  )}
                >
                  {t(l.key)}
                </Link>
              </li>
            ))}
            <li className="mt-1 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <LanguageSwitch />
              <Link
                href={`${CUSTOMER_URL}`}
                onClick={() => setOpen(false)}
                className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white"
              >
                {t('nav.login')}
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}

export { ADMIN_URL, MERCHANT_URL, CUSTOMER_URL };
