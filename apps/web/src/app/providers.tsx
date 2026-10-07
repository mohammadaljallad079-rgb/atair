'use client';

import { I18nProvider } from '@/i18n/provider';
import { SiteProvider } from '@/lib/site-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <SiteProvider>{children}</SiteProvider>
    </I18nProvider>
  );
}
