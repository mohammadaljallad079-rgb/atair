'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Button } from './button';
import { useI18n } from '@/i18n/provider';

export function PageHeader({ title, subtitle, actions }: {
  title: string; subtitle?: ReactNode; actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className, title, actions }: {
  children: ReactNode; className?: string; title?: string; actions?: ReactNode;
}) {
  return (
    <section className={cn('rounded-xl border border-slate-200 bg-white shadow-sm', className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          {title && <h2 className="text-sm font-semibold text-slate-800">{title}</h2>}
          {actions}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function EmptyState({ title, hint, action }: { title?: string; hint?: string; action?: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 7h18M3 12h18M3 17h10" />
        </svg>
      </div>
      <p className="text-sm font-medium text-slate-600">{title ?? t('common.empty')}</p>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
      {action}
    </div>
  );
}

export function LoadingState({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-ink-500" />
      {label ?? t('common.loading')}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        </svg>
      </div>
      <p className="text-sm font-medium text-slate-700">{t('common.error')}</p>
      <p className="max-w-md text-xs text-slate-500">{error.message}</p>
      {onRetry && <Button size="sm" variant="secondary" onClick={onRetry}>{t('common.retry')}</Button>}
    </div>
  );
}

export function MetricCard({ label, value, tone = 'neutral', hint }: {
  label: string; value: ReactNode; tone?: 'neutral' | 'brand' | 'info' | 'success' | 'warning' | 'danger'; hint?: string;
}) {
  const toneRing: Record<string, string> = {
    neutral: 'text-slate-900',
    brand: 'text-brand-600',
    info: 'text-ink-700',
    success: 'text-green-600',
    warning: 'text-amber-600',
    danger: 'text-red-600',
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={cn('mt-1 text-2xl font-bold', toneRing[tone])}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
