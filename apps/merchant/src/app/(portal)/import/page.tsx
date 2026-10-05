'use client';

import { useRef, useState } from 'react';
import { endpoints } from '@/lib/endpoints';
import { useI18n } from '@/i18n/provider';
import { useToast } from '@/components/ui/toast';
import { PageHeader, Card } from '@/components/ui/primitives';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Icon } from '@/components/layout/icon';
import type { ImportResult, ImportRowResult } from '@/lib/types';

/** Minimal CSV parser (no external dependency): handles quoted fields, escaped
 *  quotes and CRLF. Returns an array of row objects keyed by header name. */
function parseCsv(text: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c === '\r') { /* ignore */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ''));
  if (nonEmpty.length < 2) return [];
  const header = nonEmpty[0].map((h) => h.trim());
  return nonEmpty.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    header.forEach((h, i) => { obj[h] = (r[i] ?? '').trim(); });
    return obj;
  });
}

export default function ImportPage() {
  const { t } = useI18n();
  const { notify } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Array<Record<string, string>>>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File) {
    const text = await file.text();
    const parsed = parseCsv(text);
    setRows(parsed);
    setResult(null);
    if (!parsed.length) notify(t('import.emptyFile'), 'error');
  }

  async function run(dryRun: boolean) {
    if (!rows.length) return;
    setBusy(true);
    try {
      const res = await endpoints.importOrders({ rows, dryRun });
      setResult(res);
      if (!dryRun) notify(`${t('import.success')}: ${res.created}`);
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function downloadTemplate() {
    try {
      const tpl = await endpoints.importTemplate();
      const csv = `${tpl.columns.join(',')}\n${tpl.sample}\n`;
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'orders-template.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  }

  const columns: Column<ImportRowResult>[] = [
    { key: 'index', header: '#', render: (r) => String(r.index + 1) },
    { key: 'clientRef', header: t('orders.number'), render: (r) => r.clientRef ?? '—' },
    { key: 'valid', header: t('common.status'), render: (r) => <StatusBadge status={r.valid ? 'active' : 'failed'} /> },
    { key: 'orderNumber', header: t('orders.number'), render: (r) => r.orderNumber ?? '—' },
    { key: 'errors', header: t('import.rowErrors'), render: (r) => (r.errors.length ? r.errors.join('; ') : '—') },
  ];

  return (
    <div>
      <PageHeader
        title={t('import.title')}
        subtitle={t('import.subtitle')}
        actions={
          <Button variant="secondary" icon={<Icon name="box" className="h-4 w-4" />} onClick={downloadTemplate}>
            {t('import.template')}
          </Button>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            {t('import.upload')}
          </Button>
          <span className="text-xs text-slate-500">
            {t('import.rows')}: {rows.length}
          </span>
          <div className="ms-auto flex gap-2">
            <Button variant="secondary" disabled={!rows.length} loading={busy} onClick={() => run(true)}>
              {t('import.preview')}
            </Button>
            <Button disabled={!rows.length} loading={busy} onClick={() => run(false)}>
              {t('import.confirm')}
            </Button>
          </div>
        </div>
      </Card>

      {result && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label={t('import.rows')} value={result.totalRows} />
            <Stat label={t('import.valid')} value={result.validRows} tone="text-green-600" />
            <Stat label={t('import.invalid')} value={result.invalidRows} tone="text-red-600" />
            <Stat label={t('import.created')} value={result.created} tone="text-ink-700" />
          </div>
          <Card title={t('import.preview')}>
            <DataTable columns={columns} rows={result.rows} rowKey={(r) => `${r.index}-${r.clientRef ?? ''}`} emptyTitle={t('common.empty')} />
          </Card>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone = 'text-slate-900' }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}
