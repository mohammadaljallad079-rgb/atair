'use client';

import { useEffect, useState } from 'react';
import { endpoints } from '@/lib/endpoints';
import { useAsync } from '@/lib/use-async';
import { useI18n } from '@/i18n/provider';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { PageHeader, Card, ErrorState, LoadingState, EmptyState } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/field';
import { PermissionGate, RequirePermission } from '@/components/ui/permission-gate';
import type { SystemSetting } from '@/lib/types';

function stringify(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function SettingRow({ setting, onSaved }: { setting: SystemSetting; onSaved: () => void }) {
  const { t } = useI18n();
  const { notify } = useToast();
  const [draft, setDraft] = useState(stringify(setting.value));
  const [busy, setBusy] = useState(false);

  useEffect(() => setDraft(stringify(setting.value)), [setting.value]);

  async function save() {
    let parsed: unknown = draft;
    try {
      parsed = JSON.parse(draft);
    } catch {
      // keep as plain string
    }
    setBusy(true);
    try {
      await endpoints.setSetting(setting.key, parsed);
      notify(t('common.save'));
      onSaved();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-b border-slate-100 py-3 last:border-0">
      <div className="mb-1 flex items-center justify-between gap-2">
        <code className="font-mono text-xs text-ink-700">{setting.key}</code>
        <PermissionGate permission="settings.manage">
          <Button size="sm" variant="secondary" loading={busy} onClick={save}>{t('common.save')}</Button>
        </PermissionGate>
      </div>
      <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} className="font-mono text-xs" dir="ltr" />
    </div>
  );
}

export default function SettingsPage() {
  const { t } = useI18n();
  const settings = useAsync(() => endpoints.settings(), []);

  return (
    <RequirePermission permission="settings.view">
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />
      <Card>
        {settings.loading ? <LoadingState /> : settings.error ? (
          <ErrorState error={settings.error} onRetry={settings.reload} />
        ) : settings.data?.length ? (
          settings.data.map((s) => <SettingRow key={s.key} setting={s} onSaved={settings.reload} />)
        ) : <EmptyState />}
      </Card>
    </RequirePermission>
  );
}
