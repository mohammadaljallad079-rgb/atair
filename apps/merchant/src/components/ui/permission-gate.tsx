'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-provider';
import { useI18n } from '@/i18n/provider';
import { Button } from './button';

/**
 * UI-only permission gate. Hiding an action is a usability aid, NOT a security
 * boundary — the backend enforces every permission regardless of what is shown.
 */
export function PermissionGate({ permission, children, fallback = null }: {
  permission: string | string[]; children: ReactNode; fallback?: ReactNode;
}) {
  const { can } = useAuth();
  return can(permission) ? <>{children}</> : <>{fallback}</>;
}

/** Full-page guard: renders a localized 403 state instead of the page content. */
export function RequirePermission({ permission, children }: { permission: string | string[]; children: ReactNode }) {
  const { can, status } = useAuth();
  const { t } = useI18n();

  if (status === 'loading') {
    return <div className="py-16 text-center text-sm text-slate-500">{t('common.loading')}</div>;
  }
  if (!can(permission)) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-slate-800">{t('forbidden.title')}</h2>
        <p className="max-w-sm text-sm text-slate-500">{t('forbidden.subtitle')}</p>
        <Link href="/dashboard"><Button size="sm" variant="secondary">{t('forbidden.back')}</Button></Link>
      </div>
    );
  }
  return <>{children}</>;
}
