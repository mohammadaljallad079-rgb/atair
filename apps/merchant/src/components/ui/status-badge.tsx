'use client';

import { useI18n } from '@/i18n/provider';
import { cn } from '@/lib/cn';

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'brand';

const tones: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  info: 'bg-blue-50 text-blue-700 ring-blue-200',
  success: 'bg-green-50 text-green-700 ring-green-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  danger: 'bg-red-50 text-red-700 ring-red-200',
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
};

const STATUS_TONES: Record<string, Tone> = {
  // order
  draft: 'neutral', pending: 'warning', confirmed: 'info', searching_driver: 'info',
  assigned: 'brand', driver_arriving: 'brand', picked_up: 'brand', in_transit: 'brand',
  arriving: 'brand', delivered: 'success', cancelled: 'danger', failed_delivery: 'danger',
  returned: 'warning',
  // generic
  active: 'success', inactive: 'neutral', blocked: 'danger', suspended: 'danger',
  locked: 'danger', invited: 'warning',
  offline: 'neutral', online: 'success', busy: 'warning', paused: 'warning',
  verified: 'success', rejected: 'danger', expired: 'warning', approved: 'success',
  maintenance: 'warning',
  // payment
  authorized: 'info', paid: 'success', failed: 'danger', refunded: 'warning',
  partially_refunded: 'warning',
  // cash on delivery
  none: 'neutral', collected: 'info', settled: 'success',
  // ticket / notification
  open: 'info', resolved: 'success', closed: 'neutral',
  queued: 'neutral', sent: 'success', read: 'neutral',
  processing: 'info',
  // priority / severity
  low: 'neutral', normal: 'info', high: 'warning', urgent: 'danger',
  info: 'info', warning: 'warning', critical: 'danger',
};

/** Maps a raw status code to a localized label + semantic color. */
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const { t } = useI18n();
  const tone = STATUS_TONES[status] ?? 'neutral';
  const key = `status.${status}`;
  const label = t(key);
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        tones[tone],
        className,
      )}
    >
      {label === key ? status : label}
    </span>
  );
}
