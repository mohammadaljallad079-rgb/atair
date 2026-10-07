import { VehiclesService } from './vehicles.service';

/**
 * Regression: driver/vehicle assignment must never leave two active links. The
 * service deactivates any prior vehicle link for the driver and any prior driver
 * link for the vehicle before upserting the new active assignment.
 */
describe('VehiclesService driver assignment', () => {
  const tenantId = 'tenant-1';

  function buildService() {
    const prisma: any = {
      vehicle: {
        findFirst: jest.fn().mockResolvedValue({ id: 'v1', tenantId, plateNumber: 'ABC-123' }),
        update: jest.fn(),
      },
      driver: { findFirst: jest.fn().mockResolvedValue({ id: 'd1', tenantId, status: 'online' }) },
      driverVehicle: {
        updateMany: jest.fn(),
        upsert: jest.fn().mockResolvedValue({ driverId: 'd1', vehicleId: 'v1', isActive: true }),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
    };
    const audit: any = { log: jest.fn() };
    return { service: new VehiclesService(prisma, audit), prisma };
  }

  it('rejects assigning a suspended driver', async () => {
    const { service, prisma } = buildService();
    prisma.driver.findFirst.mockResolvedValue({ id: 'd1', tenantId, status: 'suspended' });
    await expect(service.assignDriver(tenantId, 'v1', 'd1', { userId: 'a' })).rejects.toMatchObject({
      code: 'DRIVER_SUSPENDED',
    });
  });

  it('deactivates conflicting links before creating the new assignment', async () => {
    const { service, prisma } = buildService();
    await service.assignDriver(tenantId, 'v1', 'd1', { userId: 'a' });
    expect(prisma.driverVehicle.updateMany).toHaveBeenCalledWith({ where: { vehicleId: 'v1' }, data: { isActive: false } });
    expect(prisma.driverVehicle.updateMany).toHaveBeenCalledWith({ where: { driverId: 'd1' }, data: { isActive: false } });
    expect(prisma.driverVehicle.upsert).toHaveBeenCalled();
  });

  it('audits the assignment', async () => {
    const { service, prisma } = buildService();
    const audit = (service as any).audit;
    await service.assignDriver(tenantId, 'v1', 'd1', { userId: 'a' });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'vehicle.assign_driver' }));
    expect(prisma.vehicle.findFirst).toHaveBeenCalled();
  });

  it('rejects an invalid status value', async () => {
    const { service } = buildService();
    await expect(service.setStatus(tenantId, 'v1', 'broken' as any, { userId: 'a' })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });
});
