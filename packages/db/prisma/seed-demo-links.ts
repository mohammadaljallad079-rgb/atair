/**
 * Demo "wiring" on top of the base seed.
 *
 * The base seed (`seed.ts`) creates demo rows in the `atair-demo` tenant, but
 * leaves them unusable from the apps: customers/drivers have no login account,
 * drivers/merchants are `pending` (the portals reject a non-approved account),
 * and orders carry neither a tracking code nor a driver assignment.
 *
 * This script is additive and idempotent. It only ever touches rows that
 * belong to the `atair-demo` tenant, so it is safe to run on a database that
 * also holds real production tenants. It never deletes anything.
 *
 * Run: DATABASE_URL=... npx tsx prisma/seed-demo-links.ts
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

const DEMO_SLUG = 'atair-demo';
const PASSWORD = 'ChangeMe123!';

/**
 * Opaque, non-sequential tracking secret — same alphabet/shape as
 * `OrdersService.generateTrackingCode` (Crockford base32, 26 chars), so demo
 * codes look native and pass the public lookup unchanged.
 */
function generateTrackingCode(): string {
  const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const bytes = randomBytes(26);
  let code = '';
  for (let i = 0; i < bytes.length; i += 1) code += alphabet[bytes[i] % 32];
  return code;
}

async function upsertLogin(
  tenantId: string,
  roleId: string,
  opts: { email: string; phone: string; fullName: string },
  passwordHash: string,
): Promise<string> {
  const user = await prisma.user.upsert({
    where: { tenantId_email: { tenantId, email: opts.email } },
    update: {},
    create: {
      tenantId,
      email: opts.email,
      phone: opts.phone,
      fullName: opts.fullName,
      passwordHash,
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId } },
    update: {},
    create: { userId: user.id, roleId },
  });
  return user.id;
}

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: DEMO_SLUG } });
  if (!tenant) {
    console.log(`No '${DEMO_SLUG}' tenant — nothing to wire (run the base seed first).`);
    return;
  }
  const tenantId = tenant.id;
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const roleRows = await prisma.role.findMany({ where: { tenantId }, select: { id: true, slug: true } });
  const roleId: Record<string, string> = {};
  for (const r of roleRows) roleId[r.slug] = r.id;

  // ---- Customers: give each demo customer a login account -------------------
  const customers = await prisma.customer.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } });
  for (const c of customers) {
    if (c.userId) continue;
    const digits = (c.phone ?? '').replace(/\D/g, '');
    const userId = await upsertLogin(
      tenantId,
      roleId['customer'],
      { email: `c${digits}@atair.local`, phone: c.phone, fullName: c.fullName },
      passwordHash,
    );
    await prisma.customer.update({ where: { id: c.id }, data: { userId } });
  }

  // ---- Drivers: approve the working fleet + login accounts ------------------
  // One driver is deliberately left `pending` so the admin approval flow can be
  // demonstrated live; the rest are approved so the driver app can sign in.
  const drivers = await prisma.driver.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } });
  const approvedDriverIds: string[] = [];
  for (let i = 0; i < drivers.length; i++) {
    const d = drivers[i];
    const leavePending = i === drivers.length - 1;
    const status = leavePending ? 'pending' : 'approved';

    let userId = d.userId;
    if (!leavePending && !userId) {
      const digits = d.phone.replace(/\D/g, '');
      userId = await upsertLogin(
        tenantId,
        roleId['driver'],
        { email: `d${digits}@atair.local`, phone: d.phone, fullName: d.fullName },
        passwordHash,
      );
    }
    await prisma.driver.update({
      where: { id: d.id },
      data: { approvalStatus: status, ...(userId ? { userId } : {}) },
    });
    if (!leavePending) approvedDriverIds.push(d.id);
  }

  // ---- Merchants: approve the primary store (and its owner's link) ----------
  // `rival-store` stays pending to demonstrate merchant approval in the admin.
  // Login eligibility is derived from `Merchant.approvalStatus`, so approving
  // the merchant is enough — there is no per-user approval flag.
  const merchants = await prisma.merchant.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } });
  const primaryMerchant = merchants.find((m) => m.slug === 'atair-store') ?? merchants[0];
  if (primaryMerchant) {
    await prisma.merchant.update({ where: { id: primaryMerchant.id }, data: { approvalStatus: 'approved' } });
  }

  // ---- Orders: tracking codes + driver assignments --------------------------
  const orders = await prisma.order.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } });
  let assignIdx = 0;
  for (const o of orders) {
    const data: Record<string, unknown> = {};

    if (!o.trackingCode) data.trackingCode = generateTrackingCode();

    // Assign anything past `pending` to a real, approved driver so the driver
    // app has a live job list (round-robin over the fleet).
    const needsDriver = ['assigned', 'accepted', 'picked_up', 'in_transit', 'delivered'].includes(o.status);
    if (needsDriver && approvedDriverIds.length > 0) {
      const driverId = approvedDriverIds[assignIdx % approvedDriverIds.length];
      assignIdx++;
      if (!o.driverId) data.driverId = driverId;
      if (!o.assignedAt) data.assignedAt = o.createdAt;
      if (['picked_up', 'in_transit', 'delivered'].includes(o.status) && !o.pickedUpAt) {
        data.pickedUpAt = o.createdAt;
      }
      if (o.status === 'delivered' && !o.deliveredAt) data.deliveredAt = o.createdAt;
    }

    if (Object.keys(data).length > 0) {
      await prisma.order.update({ where: { id: o.id }, data });
    }
  }

  const summary = await prisma.$transaction([
    prisma.customer.count({ where: { tenantId, userId: { not: null } } }),
    prisma.driver.count({ where: { tenantId, approvalStatus: 'approved' } }),
    prisma.driver.count({ where: { tenantId, approvalStatus: 'pending' } }),
    prisma.merchant.count({ where: { tenantId, approvalStatus: 'approved' } }),
    prisma.merchant.count({ where: { tenantId, approvalStatus: 'pending' } }),
    prisma.order.count({ where: { tenantId, trackingCode: { not: null } } }),
    prisma.order.count({ where: { tenantId, driverId: { not: null } } }),
  ]);

  console.log('✅ Demo wiring complete (tenant: %s)', DEMO_SLUG);
  console.log('   Customers with login : %d', summary[0]);
  console.log('   Drivers approved     : %d  (pending, for demo: %d)', summary[1], summary[2]);
  console.log('   Merchants approved   : %d  (pending, for demo: %d)', summary[3], summary[4]);
  console.log('   Orders with tracking : %d', summary[5]);
  console.log('   Orders with driver   : %d', summary[6]);
  console.log('   Password for all demo logins: %s', PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
