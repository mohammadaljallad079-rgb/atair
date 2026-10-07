'use client';

import { useI18n } from '@/i18n/provider';
import { endpoints } from '@/lib/endpoints';
import { useResourceList } from '@/lib/use-resource-list';
import { formatDateTime } from '@/lib/format';
import type { CustomerNotification } from '@/lib/types';
import { Card, EmptyState, ErrorState, LoadingState, PageHeader } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

export default function NotificationsPage() {
  const { t, locale } = useI18n();
  const list = useResourceList<CustomerNotification>((query, signal) => endpoints.notifications(query, signal));

  async function markRead(id: string) {
    await endpoints.markNotificationRead(id);
    list.reload();
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t('cust.notif.title')} />

      <Card>
        {list.loading ? (
          <LoadingState />
        ) : list.error ? (
          <ErrorState error={list.error} onRetry={list.reload} />
        ) : !list.data?.items.length ? (
          <EmptyState title={t('cust.notif.empty')} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {list.data.items.map((n) => {
              const unread = n.status !== 'read';
              return (
                <li key={n.id} className={cn('flex items-start justify-between gap-3 py-3', unread && 'bg-brand-50/30')}>
                  <div className="min-w-0">
                    {n.title && <p className="text-sm font-medium text-slate-800">{n.title}</p>}
                    <p className="text-sm text-slate-600">{n.body}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">{formatDateTime(n.createdAt, locale)}</p>
                  </div>
                  {unread && (
                    <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}>
                      {t('cust.notif.markRead')}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
