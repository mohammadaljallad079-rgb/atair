'use client';

import { useState } from 'react';
import { endpoints } from '@/lib/endpoints';
import { useResourceList } from '@/lib/use-resource-list';
import { useAsync } from '@/lib/use-async';
import { useI18n } from '@/i18n/provider';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { VEHICLE_STATUSES } from '@/lib/constants';
import { PageHeader, Card } from '@/components/ui/primitives';
import { DataTable, Column } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';
import { FilterBar, Modal, ConfirmDialog } from '@/components/ui/filters';
import { SearchInput, Select, Field, TextInput } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { PermissionGate, RequirePermission } from '@/components/ui/permission-gate';
import type { Vehicle, VehicleDetail, Driver } from '@/lib/types';

export default function VehiclesPage() {
  const { t } = useI18n();
  const { notify } = useToast();
  const list = useResourceList<Vehicle>((query, signal) => endpoints.vehicles(query), { pageSize: 20 });
  const types = useAsync(() => endpoints.vehicleTypes(), []);
  const drivers = useAsync(() => endpoints.drivers({ pageSize: 100 }), []);

  const [createOpen, setCreateOpen] = useState(false);
  const [plateNumber, setPlateNumber] = useState('');
  const [vehicleTypeId, setVehicleTypeId] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [busy, setBusy] = useState(false);

  const [assignTarget, setAssignTarget] = useState<VehicleDetail | null>(null);
  const [assignDriverId, setAssignDriverId] = useState('');
  const [unassignTarget, setUnassignTarget] = useState<{ vehicle: Vehicle; driverId: string; driverName: string } | null>(null);

  const typeName = (id: string | null | undefined) => types.data?.find((vt) => vt.id === id)?.name ?? '—';
  const activeDriver = (v: Vehicle) => v.drivers?.find((d) => d.isActive)?.driver ?? null;

  async function doCreate() {
    setBusy(true);
    try {
      await endpoints.createVehicle({
        plateNumber,
        vehicleTypeId: vehicleTypeId || undefined,
        make: make || undefined,
        model: model || undefined,
      });
      notify(t('common.save'));
      setCreateOpen(false);
      setPlateNumber(''); setVehicleTypeId(''); setMake(''); setModel('');
      list.reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(v: Vehicle, status: string) {
    try {
      await endpoints.setVehicleStatus(v.id, status);
      notify(t('common.save'));
      list.reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    }
  }

  async function openAssign(v: Vehicle) {
    setBusy(true);
    try {
      const detail = await endpoints.vehicle(v.id);
      setAssignTarget(detail);
      setAssignDriverId(detail.drivers?.find((d) => d.isActive)?.driverId ?? '');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function doAssign() {
    if (!assignTarget || !assignDriverId) return;
    setBusy(true);
    try {
      await endpoints.assignVehicleDriver(assignTarget.id, assignDriverId);
      notify(t('vehicles.assigned'));
      setAssignTarget(null);
      list.reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function doUnassign() {
    if (!unassignTarget) return;
    setBusy(true);
    try {
      await endpoints.unassignVehicleDriver(unassignTarget.vehicle.id, unassignTarget.driverId);
      notify(t('vehicles.unassigned'));
      setUnassignTarget(null);
      list.reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('common.error'), 'error');
    } finally {
      setBusy(false);
    }
  }

  const columns: Column<Vehicle>[] = [
    { key: 'plateNumber', header: t('vehicles.plate'), render: (r) => <span dir="ltr" className="font-medium">{r.plateNumber}</span> },
    { key: 'vehicleTypeId', header: t('vehicles.type'), render: (r) => typeName(r.vehicleTypeId) },
    { key: 'make', header: t('vehicles.make'), render: (r) => r.make ?? '—' },
    { key: 'model', header: t('vehicles.model'), render: (r) => r.model ?? '—' },
    { key: 'driver', header: t('vehicles.currentDriver'), render: (r) => activeDriver(r)?.fullName ?? <span className="text-slate-400">{t('vehicles.noDriver')}</span> },
    {
      key: 'status', header: t('common.status'), render: (r) => (
        <PermissionGate permission="vehicles.manage" fallback={<StatusBadge status={r.status} />}>
          <Select
            value={r.status}
            onChange={(e) => changeStatus(r, e.target.value)}
            className="h-8 w-32 text-xs"
            aria-label={t('common.status')}
          >
            {VEHICLE_STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
          </Select>
        </PermissionGate>
      ),
    },
    {
      key: 'actions', header: t('common.actions'), align: 'end',
      render: (r) => {
        const driver = activeDriver(r);
        return (
          <PermissionGate permission="vehicles.manage">
            <div className="flex justify-end gap-1.5">
              <Button size="sm" variant="secondary" loading={busy} onClick={() => openAssign(r)}>
                {t('vehicles.assignDriver')}
              </Button>
              {driver && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setUnassignTarget({ vehicle: r, driverId: driver.id, driverName: driver.fullName })}
                >
                  {t('vehicles.unassign')}
                </Button>
              )}
            </div>
          </PermissionGate>
        );
      },
    },
  ];

  return (
    <RequirePermission permission="vehicles.view">
      <PageHeader
        title={t('vehicles.title')}
        subtitle={t('vehicles.subtitle')}
        actions={
          <PermissionGate permission="vehicles.manage">
            <Button size="sm" onClick={() => setCreateOpen(true)}>{t('vehicles.create')}</Button>
          </PermissionGate>
        }
      />
      <Card>
        <FilterBar onClear={list.resetFilters}>
          <div className="w-full sm:w-64">
            <SearchInput value={list.search} onChange={list.setSearch} placeholder={t('common.searchPlaceholder')} />
          </div>
          <Select
            value={list.filters.status ?? ''}
            onChange={(e) => list.setFilter('status', e.target.value || undefined)}
            className="w-full sm:w-44"
            aria-label={t('common.status')}
          >
            <option value="">{t('common.status')}: {t('common.all')}</option>
            {VEHICLE_STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
          </Select>
        </FilterBar>
        <DataTable
          columns={columns}
          rows={list.data?.items ?? []}
          rowKey={(r) => r.id}
          loading={list.loading}
          error={list.error}
          onRetry={list.reload}
          stickyHeader
        />
        {list.data && (
          <Pagination
            page={list.data.meta.page}
            pageSize={list.data.meta.pageSize}
            total={list.data.meta.total}
            totalPages={list.data.meta.totalPages}
            onPageChange={list.setPage}
          />
        )}
      </Card>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t('vehicles.create')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>{t('common.cancel')}</Button>
            <Button loading={busy} disabled={!plateNumber} onClick={doCreate}>{t('common.save')}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label={t('vehicles.plate')} required>
            <TextInput value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} dir="ltr" />
          </Field>
          <Field label={t('vehicles.type')}>
            <Select value={vehicleTypeId} onChange={(e) => setVehicleTypeId(e.target.value)}>
              <option value="">{t('common.selectPlaceholder')}</option>
              {types.data?.map((vt) => <option key={vt.id} value={vt.id}>{vt.name}</option>)}
            </Select>
          </Field>
          <Field label={t('vehicles.make')}>
            <TextInput value={make} onChange={(e) => setMake(e.target.value)} />
          </Field>
          <Field label={t('vehicles.model')}>
            <TextInput value={model} onChange={(e) => setModel(e.target.value)} />
          </Field>
        </div>
      </Modal>

      <Modal
        open={!!assignTarget}
        onClose={() => setAssignTarget(null)}
        title={t('vehicles.assignDriver')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAssignTarget(null)}>{t('common.cancel')}</Button>
            <Button loading={busy} disabled={!assignDriverId} onClick={doAssign}>{t('common.save')}</Button>
          </>
        }
      >
        <p className="mb-2 text-xs text-slate-500">{assignTarget?.plateNumber}</p>
        <Field label={t('drivers.title')} hint={t('vehicles.driverHint')}>
          <Select value={assignDriverId} onChange={(e) => setAssignDriverId(e.target.value)}>
            <option value="">{t('common.selectPlaceholder')}</option>
            {drivers.data?.items.map((d: Driver) => (
              <option key={d.id} value={d.id}>{d.fullName} — {d.phone}</option>
            ))}
          </Select>
        </Field>
      </Modal>

      <ConfirmDialog
        open={!!unassignTarget}
        title={t('vehicles.unassign')}
        message={`${unassignTarget?.driverName ?? ''} — ${unassignTarget?.vehicle.plateNumber ?? ''}`}
        confirmLabel={t('vehicles.unassign')}
        loading={busy}
        onConfirm={doUnassign}
        onCancel={() => setUnassignTarget(null)}
      />
    </RequirePermission>
  );
}
