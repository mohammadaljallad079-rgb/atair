'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { cn } from '@/lib/cn';

type ToastTone = 'success' | 'error' | 'info';
interface Toast { id: number; tone: ToastTone; message: string }

interface ToastContextValue {
  notify: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, tone, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  const toneClass: Record<ToastTone, string> = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-ink-700',
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 end-4 z-[100] flex flex-col gap-2" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={cn('rounded-lg px-4 py-2 text-sm text-white shadow-lg', toneClass[toast.tone])}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
