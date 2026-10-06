'use client';

import { I18nProvider } from '@/i18n/provider';
import { AuthProvider } from '@/lib/auth-provider';
import { ToastProvider } from '@/components/ui/toast';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <ToastProvider>
        <AuthProvider>{children}</AuthProvider>
      </ToastProvider>
    </I18nProvider>
  );
}
