import { DriversService } from './drivers.service';

/**
 * Driver lifecycle: suspension is reversible, reactivation is validated, and
 * availability cannot be granted to a suspended driver.
 */
describe('DriversService lifecycle', () => {
  const tenantId = 'tenant-1';

  function buildService(driver: Record<string, unknown>) {
    const prisma: any = {
      driver: {
        findFirst: jest.fn().mockResolvedValue(driver),
        update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ ...driver, ...data })),
      },
      driverStatusLog: { create: jest.fn() },
      order: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const audit: any = { log: jest.fn() };
    return { service: new DriversService(prisma, audit), prisma, audit };
  }

  it('rejects reactivating a non-suspended driver', async () => {
    const { service } = buildService({ id: 'd1', tenantId, status: 'online', isAvailable: true });
    await expect(service.unsuspend(tenantId, 'd1', { userId: 'a' })).rejects.toMatchObject({
      code: 'DRIVER_NOT_SUSPENDED',
    });
  });

  it('unsuspends a suspended driver back to offline and audits it', async () => {
    const { service, prisma, audit } = buildService({ id: 'd1', tenantId, status: 'suspended', isAvailable: false });
    const result = await service.unsuspend(tenantId, 'd1', { userId: 'a' });
    expect(result).toMatchObject({ status: 'offline', isAvailable: false, suspendedReason: null });
    expect(prisma.driverStatusLog.create).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'driver.unsuspend' }));
  });

  it('blocks making a suspended driver available', async () => {
    const { service } = buildService({ id: 'd1', tenantId, status: 'suspended', isAvailable: false });
    await expect(service.setAvailability(tenantId, 'd1', true, { userId: 'a' })).rejects.toMatchObject({
      code: 'DRIVER_SUSPENDED',
    });
  });

  it('toggles availability for an active driver', async () => {
    const { service, audit } = buildService({ id: 'd1', tenantId, status: 'online', isAvailable: false });
    const result = await service.setAvailability(tenantId, 'd1', true, { userId: 'a' });
    expect(result).toMatchObject({ isAvailable: true });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'driver.availability_change' }));
  });
});
