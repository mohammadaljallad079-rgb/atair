import { OrdersService } from './orders.service';

/**
 * The forced-transition override is the one path that can move an order along an
 * illegal status edge, so the reason is not optional metadata — it is the only
 * audit record of why it was allowed. These tests pin that guard.
 */
describe('OrdersService.transition force override', () => {
  function buildService(order: Record<string, unknown>) {
    const prisma: any = {
      order: {
        findFirst: jest.fn().mockResolvedValue(order),
        update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ ...order, ...data })),
        statusHistory: undefined,
      },
      orderStatusHistory: { create: jest.fn().mockResolvedValue({}) },
      driver: { update: jest.fn() },
      $transaction: jest.fn((cb: any) =>
        typeof cb === 'function'
          ? cb({
              order: { update: (a: any) => Promise.resolve({ ...order, ...a.data }) },
              orderStatusHistory: { create: jest.fn() },
            })
          : Promise.all(cb),
      ),
    };
    const audit: any = { log: jest.fn() };
    const pricing: any = {};
    const zones: any = {};
    const notifications: any = { emit: jest.fn() };
    const dispatch: any = { closeForOrder: jest.fn() };
    return new OrdersService(prisma, audit, pricing, zones, notifications, dispatch);
  }

  const baseOrder = { id: 'o1', status: 'delivered', orderNumber: 'ATA-1' };

  it('rejects a forced transition without a reason', async () => {
    const service = buildService(baseOrder);
    await expect(
      service.transition('t1', 'o1', { status: 'pending' }, { userId: 'u1' }, { force: true }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('rejects a whitespace-only reason for a forced transition', async () => {
    const service = buildService(baseOrder);
    await expect(
      service.transition('t1', 'o1', { status: 'pending', reason: '   ' }, { userId: 'u1' }, { force: true }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('allows a forced transition when a reason is supplied', async () => {
    const service = buildService(baseOrder);
    const result = await service.transition(
      't1', 'o1', { status: 'pending', reason: 'customer re-opened' }, { userId: 'u1' }, { force: true },
    );
    expect(result.status).toBe('pending');
  });

  it('still blocks an illegal (non-forced) transition', async () => {
    const service = buildService(baseOrder);
    await expect(
      service.transition('t1', 'o1', { status: 'pending' }, { userId: 'u1' }),
    ).rejects.toBeDefined();
  });
});
