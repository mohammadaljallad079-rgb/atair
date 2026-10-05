'use client';

import { ReactNode } from 'react';
import { useI18n } from '@/i18n/provider';
import { Button } from './button';
import { cn } from '@/lib/cn';

export function FilterBar({ children, onClear, className }: {
  children: ReactNode; onClear?: () => void; className?: string;
}) {
  const { t } = useI18n();
  return (
    <div className={cn('mb-3 flex flex-wrap items-end gap-2', className)}>
      {children}
      {onClear && (
        <Button size="sm" variant="ghost" onClick={onClear}>
          {t('common.clear')}
        </Button>
      )}
    </div>
  );
}

/** Segmented control used for range presets and status tabs. */
export function Segmented<T extends string>({ value, options, onChange }: {
  value: T; options: Array<{ value: T; label: string }>; onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            value === o.value ? 'bg-ink-700 text-white' : 'text-slate-600 hover:bg-slate-100',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Accessible modal used for confirmations and small forms. */
export function Modal({ open, onClose, title, children, footer, wide }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean;
}) {
  const { t } = useI18n();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn('relative z-10 w-full rounded-xl bg-white shadow-xl', wide ? 'max-w-2xl' : 'max-w-md')}
      >
        <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          <button onClick={onClose} aria-label={t('common.close')} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto p-4">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">{footer}</footer>}
      </div>
    </div>
  );
}

/** Right/left-side drawer for read-only detail panels. */
export function Drawer({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode;
}) {
  const { t } = useI18n();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} aria-hidden />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 flex h-full w-full max-w-lg flex-col bg-white shadow-xl"
      >
        <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          <button onClick={onClose} aria-label={t('common.close')} className="text-slate-400 hover:text-slate-600">✕</button>
        </header>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel, tone = 'danger', loading, onConfirm, onCancel }: {
  open: boolean; title: string; message: string; confirmLabel?: string;
  tone?: 'danger' | 'primary'; loading?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  const { t } = useI18n();
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>{t('common.cancel')}</Button>
          <Button variant={tone} loading={loading} onClick={onConfirm}>
            {confirmLabel ?? t('common.confirm')}
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">{message}</p>
    </Modal>
  );
}
