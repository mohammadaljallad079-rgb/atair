'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/lib/nav';
import { useI18n } from '@/i18n/provider';
import { cn } from '@/lib/cn';
import { Icon } from './icon';
import { BrandLogo } from '@/components/brand/brand-logo';

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav className="flex h-full flex-col gap-2 overflow-y-auto p-3" aria-label="main">
      <div className="px-2 pt-2">
        <BrandLogo variant="navigation" subtitle={t('cust.tagline')} />
      </div>
      <ul className="mt-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
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
    </nav>
  );
}
