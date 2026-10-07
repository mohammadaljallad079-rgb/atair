'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-provider';
import { useI18n } from '@/i18n/provider';
import { Locale } from '@/i18n/dictionary';
import { Sidebar } from './sidebar';
import { Icon } from './icon';
import { TAB_ITEMS } from '@/lib/nav';
import { cn } from '@/lib/cn';
import { BrandLogo } from '@/components/brand/brand-logo';

function LanguageSwitch() {
  const { locale, setLocale } = useI18n();
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-slate-200">
      {(['ar', 'en'] as Locale[]).map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
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

function UserMenu() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  if (!user) return null;
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white">
          {user.fullName?.slice(0, 1) ?? '?'}
        </span>
        <span className="hidden text-start leading-tight sm:block">
          <span className="block text-xs font-medium text-slate-800">{user.fullName}</span>
          <span className="block text-[11px] text-slate-400">{user.phone ?? user.email}</span>
        </span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute end-0 z-20 mt-1 w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-lg" role="menu">
            <div className="border-b border-slate-100 px-3 py-2">
              <p className="text-xs font-medium text-slate-800">{user.fullName}</p>
              <p className="text-[11px] text-slate-400">{user.email ?? user.phone}</p>
            </div>
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
              role="menuitem"
            >
              {t('cust.profile.title')}
            </Link>
            <button
              onClick={() => { setOpen(false); void logout(); }}
              className="block w-full rounded-lg px-3 py-2 text-start text-sm text-red-600 hover:bg-red-50"
              role="menuitem"
            >
              {t('cust.profile.logout')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (status === 'anonymous') router.replace('/login');
  }, [status, router]);

  useEffect(() => setMobileOpen(false), [pathname]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        <span className="me-2 h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-ink-500" />
        {t('common.loading')}
      </div>
    );
  }
  if (status === 'anonymous') return null;

  return (
    <div className="flex min-h-screen">
      <aside className="no-print hidden w-60 shrink-0 border-e border-slate-200 bg-white lg:block">
        <Sidebar />
      </aside>

      {mobileOpen && (
        <div className="no-print fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileOpen(false)} aria-hidden />
          <aside className="relative z-10 h-full w-64 border-e border-slate-200 bg-white">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-slate-200 bg-white/90 px-3 backdrop-blur sm:px-4">
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="open menu"
            >
              <Icon name="grid" />
            </button>
            <BrandLogo variant="compact" className="lg:hidden" />
            <span className="hidden text-sm font-semibold text-slate-800 sm:inline">{t('cust.tagline')}</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitch />
            <UserMenu />
          </div>
        </header>

        <main className="mx-auto w-full max-w-3xl flex-1 p-4 pb-24 sm:p-6 lg:pb-6">{children}</main>

        <nav
          className="no-print fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white lg:hidden"
          aria-label="tabs"
        >
          {TAB_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]',
                  active ? 'text-brand-700' : 'text-slate-500',
                )}
              >
                <Icon name={item.icon} className="h-5 w-5" />
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
