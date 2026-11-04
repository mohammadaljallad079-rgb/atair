import { MerchantsService } from './merchants.service';

/**
 * Merchant approval lifecycle: approval activates the merchant and its owner
 * logins; rejection/suspension deactivate them and revoke sessions.
 */
describe('MerchantsService approval', () => {
  const tenantId = 'tenant-1';

  function buildService(merchant: Record<string, unknown>, links: { userId: string }[] = []) {
    const prisma: any = {
      merchant: {
        findFirst: jest.fn().mockResolvedValue(merchant),
        update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ ...merchant, ...data })),
      },
      merchantUser: { findMany: jest.fn().mockResolvedValue(links) },
      user: { updateMany: jest.fn() },
      session: { updateMany: jest.fn() },
      $transaction: jest.fn().mockImplementation((cb: any) =>
        typeof cb === 'function' ? cb(prisma) : Promise.all(cb),
      ),
    };
    const audit: any = { log: jest.fn() };
    const accounts: any = { provision: jest.fn() };
    return { service: new MerchantsService(prisma, audit, accounts), prisma, audit };
  }

  it('approves a pending merchant and activates owner logins', async () => {
    const { service, prisma, audit } = buildService(
      { id: 'm1', tenantId, approvalStatus: 'pending' },
      [{ userId: 'u1' }],
    );
    const result = await service.approve(tenantId, 'm1', { userId: 'admin' });
    expect(result).toMatchObject({ approvalStatus: 'approved', status: 'active' });
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['u1'] } },
      data: { status: 'active' },
    });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'merchant.approve' }));
  });

  it('refuses to approve an already-approved merchant', async () => {
    const { service } = buildService({ id: 'm1', approvalStatus: 'approved' });
    await expect(service.approve(tenantId, 'm1', { userId: 'admin' })).rejects.toMatchObject({
      code: 'MERCHANT_ALREADY_APPROVED',
    });
  });

  it('rejects a merchant, suspends logins and revokes sessions', async () => {
    const { service, prisma } = buildService({ id: 'm1', approvalStatus: 'pending' }, [{ userId: 'u1' }]);
    const result = await service.reject(tenantId, 'm1', { reason: 'documents missing' }, { userId: 'admin' });
    expect(result).toMatchObject({ approvalStatus: 'rejected', status: 'inactive' });
    expect(prisma.user.updateMany).toHaveBeenCalledWith({ where: { id: { in: ['u1'] } }, data: { status: 'suspended' } });
    expect(prisma.session.updateMany).toHaveBeenCalledWith({
      where: { userId: { in: ['u1'] }, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('suspends a merchant and its logins', async () => {
    const { service, prisma } = buildService({ id: 'm1', status: 'active', approvalStatus: 'approved' }, [{ userId: 'u1' }]);
    const result = await service.suspend(tenantId, 'm1', 'fraud review', { userId: 'admin' });
    expect(result).toMatchObject({ status: 'suspended', approvalStatus: 'suspended' });
    expect(prisma.session.updateMany).toHaveBeenCalled();
  });

  it('reactivates a suspended merchant', async () => {
    const { service } = buildService({ id: 'm1', status: 'suspended', approvalStatus: 'suspended' }, [{ userId: 'u1' }]);
    const result = await service.reactivate(tenantId, 'm1', { userId: 'admin' });
    expect(result).toMatchObject({ status: 'active', approvalStatus: 'approved' });
  });
});
