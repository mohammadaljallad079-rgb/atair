import type { Locale } from '@/i18n/dictionary';

/** Formats a monetary amount. Values arrive as strings (Prisma Decimal). */
export function formatMoney(value: string | number | null | undefined, currency = 'SAR', locale: Locale = 'ar') {
  const n = typeof value === 'string' ? Number(value) : (value ?? 0);
  const safe = Number.isFinite(n) ? n : 0;
  try {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(safe);
  } catch {
    return `${safe.toFixed(2)} ${currency}`;
  }
}

export function formatNumber(value: number | string | null | undefined, locale: Locale = 'ar') {
  const n = typeof value === 'string' ? Number(value) : (value ?? 0);
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US').format(Number.isFinite(n) ? n : 0);
}

export function formatDate(value: string | Date | null | undefined, locale: Locale = 'ar') {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric', month: 'short', day: '2-digit',
  }).format(d);
}

export function formatDateTime(value: string | Date | null | undefined, locale: Locale = 'ar') {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(d);
}

export function formatDistance(km: string | number | null | undefined, locale: Locale = 'ar') {
  if (km === null || km === undefined || km === '') return '—';
  const n = typeof km === 'string' ? Number(km) : km;
  if (!Number.isFinite(n)) return '—';
  return `${formatNumber(Number(n.toFixed(2)), locale)} ${locale === 'ar' ? 'كم' : 'km'}`;
}

/** Copies text to the clipboard, returning whether it succeeded. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
