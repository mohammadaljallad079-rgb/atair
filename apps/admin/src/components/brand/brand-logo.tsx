'use client';

import { useI18n } from '@/i18n/provider';
import { cn } from '@/lib/cn';

/**
 * Centralized brand lockup for the official عَ الطاير identity.
 *
 * The official source is `public/assets/brand/logo-original.jpeg` (never edited).
 * The web/derived files below are faithful crops of that source:
 *   - logo-full.*  → bird + Arabic wordmark (login / branding moments)
 *   - logo-mark.*  → bird only (navigation / compact)
 * The supplied artwork is NOT mirrored in RTL — only the surrounding layout flips.
 */
export type BrandVariant = 'navigation' | 'compact' | 'login' | 'full';

const MARK_WEBP = '/assets/brand/logo-mark.webp';
const MARK_PNG = '/assets/brand/logo-mark.png';
const FULL_WEBP = '/assets/brand/logo-full.webp';
const FULL_PNG = '/assets/brand/logo-full.png';

const MARK_SIZE: Record<'navigation' | 'compact', string> = {
  navigation: 'h-9 w-9',
  compact: 'h-8 w-8',
};

const FULL_SIZE: Record<'login' | 'full', string> = {
  login: 'h-12 sm:h-14',
  full: 'h-16',
};

export function BrandLogo({
  variant = 'navigation',
  className,
  subtitle,
}: {
  variant?: BrandVariant;
  className?: string;
  subtitle?: string;
}) {
  const { t } = useI18n();
  const alt = t('app.name');

  if (variant === 'login' || variant === 'full') {
    return (
      <picture className={className}>
        <source srcSet={FULL_WEBP} type="image/webp" />
        <img
          src={FULL_PNG}
          alt={alt}
          width={519}
          height={530}
          className={cn('w-auto object-contain', FULL_SIZE[variant])}
        />
      </picture>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <picture>
        <source srcSet={MARK_WEBP} type="image/webp" />
        <img
          src={MARK_PNG}
          alt={alt}
          width={420}
          height={260}
          className={cn(
            'shrink-0 rounded-lg object-cover shadow-sm ring-1 ring-slate-200/70',
            MARK_SIZE[variant],
          )}
        />
      </picture>
      {variant === 'navigation' && (
        <span className="leading-tight">
          <span className="block text-sm font-bold text-slate-900">{t('app.name')}</span>
          <span className="block text-[11px] text-slate-400">{subtitle ?? t('app.tagline')}</span>
        </span>
      )}
    </div>
  );
}
