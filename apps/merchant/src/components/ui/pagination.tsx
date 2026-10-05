'use client';

import { useI18n } from '@/i18n/provider';
import { Button } from './button';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/** Compact pagination control with RTL-aware previous/next. */
export function Pagination({ page, pageSize, total, totalPages, onPageChange }: PaginationProps) {
  const { t, isRTL } = useI18n();
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
      <span>
        {from}–{to} {t('common.of')} {total} {t('common.results')}
      </span>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          {isRTL ? '›' : '‹'} {t('common.previous')}
        </Button>
        <span className="tabular-nums">
          {t('common.page')} {page} / {Math.max(totalPages, 1)}
        </span>
        <Button
          size="sm"
          variant="secondary"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          {t('common.next')} {isRTL ? '‹' : '›'}
        </Button>
      </div>
    </div>
  );
}
