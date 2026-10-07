import { CustomerOrdersService } from './customer-orders.service';
import { CustomerContext } from './customer-context.service';

/**
 * Security regression for the customer order surface.
 *
 * The core invariant: every read/write is scoped by the acting customer's id
 * resolved from the token, so a customer can never reach another customer's
 * order (IDOR). These tests assert the scoping filter is actually applied and
 * that ownership is never taken from the request body.
 */
const ctx: CustomerContext = {
  customerId: 'cust-A',
  tenantId: 'tenant-1',
  fullName: 'A',
  phone: '+966500000000',
  email: null,
  status: 'active',
};

function build(overrides: {
  orderFindFirst?: jest.Mock;
  serviceZoneFindFirst?: jest.Mock;
  orderCreate?: jest.Mock;
} = {}) {
  const orderFindFirst = overrides.orderFindFirst ?? jest.fn().mockResolvedValue(null);
  const serviceZoneFindFirst = overrides.serviceZoneFindFirst ?? jest.fn().mockResolvedValue(null);
  const prisma: any = {
    order: {
      findFirst: orderFindFirst,
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    serviceZone: { findFirst: serviceZoneFindFirst, findMany: jest.fn().mockResolvedValue([]) },
    orderStatusHistory: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    $transaction: (ops: unknown[]) => Promise.all(ops as Promise<unknown>[]),
  };
  const audit: any = { log: jest.fn() };
  const orders: any = { create: overrides.orderCreate ?? jest.fn(), cancel: jest.fn() };
  const pricing: any = { quote: jest.fn().mockResolvedValue({ ruleId: 'r1', total: 10, breakdown: [] }) };
  const trackingService: any = { track: jest.fn() };
  const zones: any = { resolveZone: jest.fn().mockResolvedValue(null) };
  const service = new CustomerOrdersService(prisma, audit, orders, pricing, trackingService, zones);
  return { service, prisma, audit, orders, pricing, trackingService, zones, orderFindFirst, serviceZoneFindFirst };
}

describe('CustomerOrdersService ownership boundary', () => {
  it('scopes get() by the acting customer id', async () => {
    const { service, orderFindFirst } = build();
    await expect(service.get(ctx, 'order-of-B')).rejects.toMatchObject({ status: 404 });
    expect(orderFindFirst).toHaveBeenCalledTimes(1);
    expect(orderFindFirst.mock.calls[0][0].where).toEqual({ id: 'order-of-B', customerId: 'cust-A' });
  });

  it('scopes list() by the acting customer id', async () => {
    const { service, prisma } = build();
    await service.list(ctx, { page: 1, pageSize: 20, skip: 0, take: 20 } as any);
    expect(prisma.order.findMany.mock.calls[0][0].where.customerId).toBe('cust-A');
  });

  it('scopes timeline() and tracking() by ownership before doing anything else', async () => {
    const { service, trackingService } = build();
    await expect(service.timeline(ctx, 'x')).rejects.toMatchObject({ status: 404 });
    await expect(service.tracking(ctx, 'x')).rejects.toMatchObject({ status: 404 });
    expect(trackingService.track).not.toHaveBeenCalled();
  });

  it('never lets the client choose the owner on create()', async () => {
    const created = { id: 'new-1', orderNumber: 'ATA-1' };
    const orderCreate = jest.fn().mockResolvedValue(created);
    const { service, orders, orderFindFirst } = build({ orderCreate });
    orderFindFirst.mockResolvedValue({ id: 'new-1' });

    await service.create(
      ctx,
      {
        pickupAddress: 'P', dropoffAddress: 'D',
        // A hostile body trying to set another customer id must be ignored.
        customerId: 'cust-B',
        paymentMethod: 'cod',
      } as any,
      { userId: 'user-A' },
    );

    const passed = orders.create.mock.calls[0][1];
    expect(passed.customerId).toBe('cust-A');
    expect(orderFindFirst.mock.calls.at(-1)[0].where).toEqual({ id: 'new-1', customerId: 'cust-A' });
  });

  it('rejects a scheduled pickup in the past', async () => {
    const { service, orders } = build();
    await expect(
      service.create(
        ctx,
        {
          pickupAddress: 'P', dropoffAddress: 'D',
          scheduledPickupAt: new Date(Date.now() - 3_600_000).toISOString(),
        } as any,
        { userId: 'user-A' },
      ),
    ).rejects.toMatchObject({ status: 422 });
    expect(orders.create).not.toHaveBeenCalled();
  });

  it('refuses to cancel an order that is not customer-cancellable', async () => {
    const orderFindFirst = jest.fn().mockResolvedValue({ id: 'o1', status: 'picked_up' });
    const { service, orders } = build({ orderFindFirst });
    await expect(service.cancel(ctx, 'o1', { reason: 'x' }, { userId: 'user-A' })).rejects.toMatchObject({
      code: 'ORDER_NOT_CANCELLABLE',
    });
    expect(orders.cancel).not.toHaveBeenCalled();
  });
});

describe('CustomerOrdersService quoting', () => {
  it('prices against the chosen service-area center and computes distance from it', async () => {
    const serviceZoneFindFirst = jest.fn().mockResolvedValue({
      id: 'zone-1', centerLat: 24.7136, centerLng: 46.6753,
    });
    const { service, pricing } = build({ serviceZoneFindFirst });

    await service.quote(ctx, {
      serviceAreaId: 'zone-1',
      dropoffLat: 24.6949,
      dropoffLng: 46.6853,
      weightKg: 2,
      paymentMethod: 'cod',
    } as any);

    const arg = pricing.quote.mock.calls[0][1];
    expect(arg.zoneId).toBe('zone-1');
    expect(arg.distanceKm).toBeGreaterThan(0);
  });

  it('surfaces PRICING_UNAVAILABLE instead of a zero-fare quote', async () => {
    const { service, pricing } = build();
    pricing.quote.mockResolvedValue({ ruleId: null, total: 0, breakdown: [] });
    await expect(service.quote(ctx, {} as any)).rejects.toMatchObject({ code: 'PRICING_UNAVAILABLE' });
  });

  it('rejects a service area that belongs to another tenant / is inactive', async () => {
    const serviceZoneFindFirst = jest.fn().mockResolvedValue(null);
    const { service } = build({ serviceZoneFindFirst });
    await expect(service.quote(ctx, { serviceAreaId: 'foreign-zone' } as any)).rejects.toMatchObject({
      status: 404,
    });
    // The lookup must be tenant-scoped and active-only.
    expect(serviceZoneFindFirst.mock.calls[0][0].where).toEqual({
      id: 'foreign-zone', tenantId: 'tenant-1', isActive: true,
    });
  });
});
