import { DriversService } from './drivers.service';

/**
 * Driver lifecycle: suspension is reversible, reactivation is validated, and
 * availability cannot be granted to a suspended or unapproved driver.
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
      $transaction: jest.fn().mockImplementation((cb: any) =>
        typeof cb === 'function' ? cb(prisma) : Promise.all(cb),
      ),
    };
    const audit: any = { log: jest.fn() };
    const accounts: any = { provision: jest.fn() };
    return { service: new DriversService(prisma, audit, accounts), prisma, audit };
  }

  it('rejects reactivating a non-suspended driver', async () => {
    const { service } = buildService({ id: 'd1', tenantId, status: 'online', isAvailable: true, approvalStatus: 'approved' });
    await expect(service.unsuspend(tenantId, 'd1', { userId: 'a' })).rejects.toMatchObject({
      code: 'DRIVER_NOT_SUSPENDED',
    });
  });

  it('unsuspends a suspended driver back to offline and audits it', async () => {
    const { service, prisma, audit } = buildService({ id: 'd1', tenantId, status: 'suspended', isAvailable: false, approvalStatus: 'approved' });
    const result = await service.unsuspend(tenantId, 'd1', { userId: 'a' });
    expect(result).toMatchObject({ status: 'offline', isAvailable: false, suspendedReason: null });
    expect(prisma.driverStatusLog.create).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'driver.unsuspend' }));
  });

  it('blocks making a suspended driver available', async () => {
    const { service } = buildService({ id: 'd1', tenantId, status: 'suspended', isAvailable: false, approvalStatus: 'approved' });
    await expect(service.setAvailability(tenantId, 'd1', true, { userId: 'a' })).rejects.toMatchObject({
      code: 'DRIVER_SUSPENDED',
    });
  });

  it('blocks making an unapproved driver available', async () => {
    const { service } = buildService({ id: 'd1', tenantId, status: 'offline', isAvailable: false, approvalStatus: 'pending' });
    await expect(service.setAvailability(tenantId, 'd1', true, { userId: 'a' })).rejects.toMatchObject({
      code: 'DRIVER_NOT_APPROVED',
    });
  });

  it('toggles availability for an approved active driver', async () => {
    const { service, audit } = buildService({ id: 'd1', tenantId, status: 'online', isAvailable: false, approvalStatus: 'approved' });
    const result = await service.setAvailability(tenantId, 'd1', true, { userId: 'a' });
    expect(result).toMatchObject({ isAvailable: true });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'driver.availability_change' }));
  });

  it('rejects creating a driver with a duplicate phone', async () => {
    const prisma: any = { driver: { findFirst: jest.fn().mockResolvedValue({ id: 'd1' }) } };
    const audit: any = { log: jest.fn() };
    const accounts: any = { provision: jest.fn() };
    const service = new DriversService(prisma, audit, accounts);
    await expect(
      service.create(tenantId, { fullName: 'A', phone: '+966500000001' } as any, { userId: 'a' }),
    ).rejects.toMatchObject({ code: 'DRIVER_EXISTS' });
  });

  it('approves a pending driver and activates the login account', async () => {
    const prisma: any = {
      driver: {
        findFirst: jest.fn().mockResolvedValue({ id: 'd1', tenantId, approvalStatus: 'pending', userId: 'u1' }),
        update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'd1', ...data })),
      },
      user: { update: jest.fn() },
      $transaction: jest.fn().mockImplementation((cb: any) => cb(prisma)),
    };
    const audit: any = { log: jest.fn() };
    const accounts: any = { provision: jest.fn() };
    const service = new DriversService(prisma, audit, accounts);
    const result = await service.approve(tenantId, 'd1', { userId: 'admin' });
    expect(result).toMatchObject({ approvalStatus: 'approved', verificationStatus: 'verified' });
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { status: 'active' } });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'driver.approve' }));
  });

  it('refuses to approve an already-approved driver', async () => {
    const prisma: any = { driver: { findFirst: jest.fn().mockResolvedValue({ id: 'd1', approvalStatus: 'approved' }) } };
    const service = new DriversService(prisma, { log: jest.fn() } as any, { provision: jest.fn() } as any);
    await expect(service.approve(tenantId, 'd1', { userId: 'admin' })).rejects.toMatchObject({
      code: 'DRIVER_ALREADY_APPROVED',
    });
  });
});
