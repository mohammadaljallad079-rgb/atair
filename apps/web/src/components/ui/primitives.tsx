'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Section({
  children,
  className,
  muted = false,
  id,
}: {
  children: ReactNode;
  className?: string;
  muted?: boolean;
  id?: string;
}) {
  return (
    <section id={id} className={cn('py-12 sm:py-16', muted && 'bg-slate-50', className)}>
      <div className="mx-auto max-w-6xl px-4">{children}</div>
    </section>
  );
}

export function SectionHeading({
  title,
  subtitle,
  center = false,
}: {
  title: string;
  subtitle?: string;
  center?: boolean;
}) {
  return (
    <div className={cn('mb-8', center && 'text-center')}>
      <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h2>
      {subtitle && <p className={cn('mt-2 max-w-2xl text-sm text-slate-500 sm:text-base', center && 'mx-auto')}>{subtitle}</p>}
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-2xl border border-slate-200 bg-white p-5 shadow-sm', className)}>{children}</div>;
}

export function FeatureCard({ title, body, icon }: { title: string; body: string; icon?: ReactNode }) {
  return (
    <Card className="h-full">
      {icon && (
        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600" aria-hidden>
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{body}</p>
    </Card>
  );
}

export function Step({ index, title, body }: { index: number; title: string; body: string }) {
  return (
    <div className="relative rounded-2xl border border-slate-200 bg-white p-5">
      <span className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-ink-700 text-sm font-bold text-white">
        {index}
      </span>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{body}</p>
    </div>
  );
}

export function Pill({ children, tone = 'brand' }: { children: ReactNode; tone?: 'brand' | 'ink' | 'slate' }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-700',
    ink: 'bg-ink-50 text-ink-700',
    slate: 'bg-slate-100 text-slate-600',
  };
  return <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-medium', tones[tone])}>{children}</span>;
}

export function CheckItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm text-slate-600">
      <svg className="mt-0.5 shrink-0 text-brand-600" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
        <path d="M20 6 9 17l-5-5" />
      </svg>
      <span>{children}</span>
    </li>
  );
}

export function Icon({ name }: { name: 'pricing' | 'tracking' | 'map' | 'wallet' | 'truck' | 'clock' | 'shield' | 'chat' }) {
  const paths: Record<string, ReactNode> = {
    pricing: <><path d="M12 1v22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>,
    tracking: <><path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" /></>,
    map: <><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" /><path d="M9 4v14M15 6v14" /></>,
    wallet: <><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M3 10h18" /></>,
    truck: <><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" /><circle cx="7" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    shield: <><path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></>,
    chat: <><path d="M21 12a8 8 0 0 1-8 8H8l-5 3 1.5-5A8 8 0 1 1 21 12Z" /></>,
  };
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {paths[name]}
    </svg>
  );
}
