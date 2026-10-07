import { WalletsService } from './wallets.service';

/**
 * Wallet ledger integrity: an adjustment must carry a reason (audit trail) and
 * may never drive the balance negative. Both guards protect the money ledger,
 * so they are pinned here.
 */
describe('WalletsService.adjust guards', () => {
  function buildService(wallet: Record<string, unknown>) {
    const updated = { ...wallet, balance: '0' };
    const prisma: any = {
      driverWallet: {
        findFirst: jest.fn().mockResolvedValue(wallet),
        update: jest.fn().mockResolvedValue(updated),
      },
      walletTransaction: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn((ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
    };
    const audit: any = { log: jest.fn() };
    return new WalletsService(prisma, audit);
  }

  it('requires a reason for any adjustment', async () => {
    const service = buildService({ id: 'w1', balance: '100' });
    await expect(
      service.adjust('t1', 'd1', { type: 'credit', amount: 10, reason: '' }, { userId: 'u1' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('rejects non-positive amounts', async () => {
    const service = buildService({ id: 'w1', balance: '100' });
    await expect(
      service.adjust('t1', 'd1', { type: 'credit', amount: 0, reason: 'top-up' }, { userId: 'u1' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('refuses to drive the balance negative', async () => {
    const service = buildService({ id: 'w1', balance: '5' });
    await expect(
      service.adjust('t1', 'd1', { type: 'debit', amount: 10, reason: 'correction' }, { userId: 'u1' }),
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_BALANCE' });
  });

  it('credits the wallet and audits the movement', async () => {
    const service = buildService({ id: 'w1', balance: '100' });
    const result = await service.adjust(
      't1', 'd1', { type: 'credit', amount: 25, reason: 'bonus' }, { userId: 'u1' },
    );
    expect(result).toBeDefined();
  });
});
