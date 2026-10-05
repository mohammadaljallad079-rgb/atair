'use client';

import { endpoints } from '@/lib/endpoints';
import { useI18n } from '@/i18n/provider';
import { useResourceList } from '@/lib/use-resource-list';
import { useToast } from '@/components/ui/toast';
import { formatDateTime } from '@/lib/format';
import { PageHeader, Card } from '@/components/ui/primitives';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import type { MerchantNotification } from '@/lib/types';

export default function NotificationsPage() {
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const list = useResourceList<MerchantNotification>((q, s) => endpoints.notifications(q, s));

  async function markRead(id: string) {
    try {
      await endpoints.markNotificationRead(id);
      list.reload();
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  }

  return (
    <div>
      <PageHeader title={t('notifications.title')} subtitle={t('notifications.subtitle')} />

      <Card>
        {list.loading && <p className="py-8 text-center text-sm text-slate-400">{t('common.loading')}</p>}
        {!list.loading && !(list.data?.items.length) && (
          <p className="py-8 text-center text-sm text-slate-400">{t('common.empty')}</p>
        )}
        <ul className="divide-y divide-slate-100">
          {(list.data?.items ?? []).map((n) => (
            <li key={n.id} className="flex items-start justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium text-slate-800">{n.title ?? t('notifications.title')}</p>
                <p className="text-xs text-slate-500">{n.body}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">{formatDateTime(n.createdAt, locale)}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={n.status} />
                {n.status !== 'read' && (
                  <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}>{t('notifications.markRead')}</Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>
      {list.data && (
        <Pagination page={list.page} pageSize={list.pageSize} total={list.data.meta.total} totalPages={list.data.meta.totalPages} onPageChange={list.setPage} />
      )}
    </div>
  );
}
