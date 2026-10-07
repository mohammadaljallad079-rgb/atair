import { UsersService } from './users.service';
import { AppError } from '../../common/errors/app-error';

/**
 * Security regression: an administrator must never be able to grant a role whose
 * permissions exceed their own. Platform admins bypass the check.
 */
describe('UsersService privilege-escalation guard', () => {
  const tenantId = 'tenant-1';

  function buildService() {
    const prisma: any = {
      role: {
        findMany: jest.fn(),
      },
      user: { create: jest.fn().mockResolvedValue({ id: 'u-new' }) },
    };
    const audit: any = { log: jest.fn() };
    const config: any = { get: jest.fn().mockReturnValue(4) };
    return { service: new UsersService(prisma, audit, config), prisma };
  }

  const operationsRole = {
    id: 'r-ops',
    slug: 'operations_manager',
    rolePermissions: [{ permission: { code: 'orders.view' } }, { permission: { code: 'drivers.create' } }],
  };

  it('rejects granting a role with permissions the actor lacks (FORBIDDEN)', async () => {
    const { service, prisma } = buildService();
    // resolveRoles() then assertCanGrant() both call role.findMany.
    prisma.role.findMany
      .mockResolvedValueOnce([{ id: 'r-ops' }]) // resolveRoles
      .mockResolvedValueOnce([operationsRole]); // assertCanGrant
    const err = await service
      .create(
        tenantId,
        { fullName: 'X', password: 'password1', roleSlugs: ['operations_manager'] },
        { userId: 'actor', permissions: ['orders.view'], isPlatformAdmin: false },
      )
      .catch((e) => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err).toMatchObject({ code: 'FORBIDDEN' });
  });

  it('allows granting when the actor already holds every permission in the role', async () => {
    const { service, prisma } = buildService();
    prisma.role.findMany
      .mockResolvedValueOnce([{ id: 'r-ops' }])
      .mockResolvedValueOnce([operationsRole]);
    const created = await service.create(
      tenantId,
      { fullName: 'X', password: 'password1', roleSlugs: ['operations_manager'] },
      { userId: 'actor', permissions: ['orders.view', 'drivers.create'], isPlatformAdmin: false },
    );
    expect(created).toEqual({ id: 'u-new' });
  });

  it('lets a platform admin grant any role without a subset check', async () => {
    const { service, prisma } = buildService();
    prisma.role.findMany.mockResolvedValueOnce([{ id: 'r-ops' }]);
    const created = await service.create(
      tenantId,
      { fullName: 'X', password: 'password1', roleSlugs: ['operations_manager'] },
      { userId: 'actor', permissions: [], isPlatformAdmin: true },
    );
    expect(created).toEqual({ id: 'u-new' });
    // Only resolveRoles ran; assertCanGrant short-circuits for platform admins.
    expect(prisma.role.findMany).toHaveBeenCalledTimes(1);
  });
});

/**
 * Role CRUD must stay tenant-scoped and must never let a caller mint a role
 * carrying permissions they do not themselves hold.
 */
describe('UsersService role management', () => {
  const tenantId = 'tenant-1';
  const platformAdmin = { userId: 'actor', permissions: [], isPlatformAdmin: true };

  function buildService() {
    const prisma: any = {
      role: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      rolePermission: { deleteMany: jest.fn(), createMany: jest.fn() },
      permission: { findMany: jest.fn() },
      userRole: { count: jest.fn() },
      $transaction: jest.fn((ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
    };
    const audit: any = { log: jest.fn() };
    const config: any = { get: jest.fn().mockReturnValue(4) };
    return { service: new UsersService(prisma, audit, config), prisma };
  }

  it('rejects creating a role with permissions the actor does not hold', async () => {
    const { service, prisma } = buildService();
    const err = await service
      .createRole(tenantId, { name: 'Ops', permissions: ['users.delete'] }, {
        userId: 'actor', permissions: ['users.view'], isPlatformAdmin: false,
      })
      .catch((e) => e);
    expect(err).toMatchObject({ code: 'FORBIDDEN' });
    expect(prisma.role.create).not.toHaveBeenCalled();
  });

  it('creates a tenant role and resolves permission ids', async () => {
    const { service, prisma } = buildService();
    prisma.permission.findMany.mockResolvedValue([{ id: 'p-1', code: 'orders.view' }]);
    prisma.role.findFirst.mockResolvedValue(null);
    prisma.role.create.mockResolvedValue({ id: 'r-new', slug: 'ops', rolePermissions: [] });
    const role = await service.createRole(
      tenantId,
      { name: 'Ops', permissions: ['orders.view'] },
      platformAdmin,
    );
    expect(role).toEqual({ id: 'r-new', slug: 'ops', rolePermissions: [] });
    expect(prisma.role.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tenantId, slug: 'ops' }) }),
    );
  });

  it('rejects a duplicate role slug', async () => {
    const { service, prisma } = buildService();
    prisma.permission.findMany.mockResolvedValue([{ id: 'p-1', code: 'orders.view' }]);
    prisma.role.findFirst.mockResolvedValue({ id: 'existing' });
    const err = await service
      .createRole(tenantId, { name: 'Ops', permissions: ['orders.view'] }, platformAdmin)
      .catch((e) => e);
    expect(err).toMatchObject({ code: 'ROLE_EXISTS' });
  });

  it('refuses to modify a system role', async () => {
    const { service, prisma } = buildService();
    prisma.role.findFirst.mockResolvedValue({ id: 'r-sys', tenantId, isSystem: true });
    const err = await service
      .updateRole(tenantId, 'r-sys', { permissions: ['orders.view'] }, platformAdmin)
      .catch((e) => e);
    expect(err).toMatchObject({ code: 'ROLE_SYSTEM' });
  });

  it('refuses to delete a role that is still assigned', async () => {
    const { service, prisma } = buildService();
    prisma.role.findFirst.mockResolvedValue({ id: 'r-1', tenantId, isSystem: false, slug: 'ops' });
    prisma.userRole.count.mockResolvedValue(2);
    const err = await service.deleteRole(tenantId, 'r-1', platformAdmin).catch((e) => e);
    expect(err).toMatchObject({ code: 'ROLE_IN_USE' });
    expect(prisma.role.delete).not.toHaveBeenCalled();
  });

  it('deletes an unused custom role', async () => {
    const { service, prisma } = buildService();
    prisma.role.findFirst.mockResolvedValue({ id: 'r-1', tenantId, isSystem: false, slug: 'ops' });
    prisma.userRole.count.mockResolvedValue(0);
    prisma.role.delete.mockResolvedValue({ id: 'r-1' });
    const res = await service.deleteRole(tenantId, 'r-1', platformAdmin);
    expect(res).toEqual({ deleted: true });
  });
});
