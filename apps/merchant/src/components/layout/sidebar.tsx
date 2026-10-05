'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_GROUPS } from '@/lib/nav';
import { useAuth } from '@/lib/auth-provider';
import { useI18n } from '@/i18n/provider';
import { cn } from '@/lib/cn';
import { Icon } from './icon';

/** Brand wordmark. The real logo asset is not present in the repo, so this is
 *  an explicit text placeholder with a brand-colored mark. */
export function BrandMark({ compact }: { compact?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-ink-700 text-sm font-bold text-white shadow-sm">
        ع
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block text-sm font-bold text-slate-900">{t('app.name')}</span>
          <span className="block text-[11px] text-slate-400">{t('merchant.portal')}</span>
        </span>
      )}
    </div>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { can } = useAuth();
  const { t } = useI18n();

  return (
    <nav className="flex h-full flex-col gap-4 overflow-y-auto p-3" aria-label="main">
      <div className="px-2 pt-2">
        <BrandMark />
      </div>
      {NAV_GROUPS.map((group) => {
        const items = group.items.filter((i) => !i.permission || can(i.permission));
        if (!items.length) return null;
        return (
          <div key={group.labelKey}>
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {t(group.labelKey)}
            </p>
            <ul className="space-y-0.5">
              {items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                        active
                          ? 'bg-brand-50 font-medium text-brand-800'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                      )}
                    >
                      <Icon name={item.icon} className={cn('h-4 w-4', active ? 'text-brand-600' : 'text-slate-400')} />
                      {t(item.labelKey)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
