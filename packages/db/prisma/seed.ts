import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import {
  PERMISSIONS,
  PERMISSION_DESCRIPTIONS,
  SYSTEM_ROLES,
  permissionModule,
} from '../src/permissions';

const prisma = new PrismaClient();

async function seedPermissionsAndRoles(tenantId: string | null) {
  // Permissions are global (tenant-agnostic catalog)
  const permissionIds: Record<string, string> = {};
  for (const code of Object.values(PERMISSIONS)) {
    const p = await prisma.permission.upsert({
      where: { code },
      update: { module: permissionModule(code), description: PERMISSION_DESCRIPTIONS[code] },
      create: { code, module: permissionModule(code), description: PERMISSION_DESCRIPTIONS[code] },
    });
    permissionIds[code] = p.id;
  }

  const roles: Record<string, string> = {};
  for (const [slug, def] of Object.entries(SYSTEM_ROLES)) {
    // Platform admin role is global; the rest are tenant-scoped templates.
    // A nullable compound-unique cannot be addressed via `where`, so the
    // global (tenantId = null) role is looked up manually.
    const roleTenantId = slug === 'platform_admin' ? null : tenantId;
    let role;
    if (roleTenantId === null) {
      const existing = await prisma.role.findFirst({ where: { tenantId: null, slug } });
      role = existing
        ? await prisma.role.update({
            where: { id: existing.id },
            data: { name: def.name, description: def.description, isSystem: true },
          })
        : await prisma.role.create({
            data: { tenantId: null, name: def.name, slug, description: def.description, isSystem: true },
          });
    } else {
      role = await prisma.role.upsert({
        where: { tenantId_slug: { tenantId: roleTenantId, slug } },
        update: { name: def.name, description: def.description, isSystem: true },
        create: { tenantId: roleTenantId, name: def.name, slug, description: def.description, isSystem: true },
      });
    }
    roles[slug] = role.id;
    for (const code of def.permissions) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permissionIds[code] } },
        update: {},
        create: { roleId: role.id, permissionId: permissionIds[code] },
      });
    }
  }
  return { permissionIds, roles };
}

async function main() {
  const platformTenant = await prisma.tenant.upsert({
    where: { slug: 'atair-platform' },
    update: {},
    create: { name: 'عَ الطاير — Platform', slug: 'atair-platform', type: 'platform' },
  });

  const demoTenant = await prisma.tenant.upsert({
    where: { slug: 'atair-demo' },
    update: {},
    create: { name: 'عَ الطاير — Demo Company', slug: 'atair-demo', type: 'company' },
  });

  const platform = await seedPermissionsAndRoles(null);
  const demo = await seedPermissionsAndRoles(demoTenant.id);

  // Demo staff users
  const passwordHash = await bcrypt.hash('ChangeMe123!', 12);

  const adminUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: demoTenant.id, email: 'admin@atair.local' } },
    update: {},
    create: {
      tenantId: demoTenant.id,
      email: 'admin@atair.local',
      phone: '+966500000001',
      fullName: 'مدير النظام',
      passwordHash,
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: demo.roles.tenant_admin } },
    update: {},
    create: { userId: adminUser.id, roleId: demo.roles.tenant_admin },
  });

  const dispatcherUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: demoTenant.id, email: 'dispatcher@atair.local' } },
    update: {},
    create: {
      tenantId: demoTenant.id,
      email: 'dispatcher@atair.local',
      phone: '+966500000002',
      fullName: 'موزّع الطلبات',
      passwordHash,
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: dispatcherUser.id, roleId: demo.roles.dispatcher } },
    update: {},
    create: { userId: dispatcherUser.id, roleId: demo.roles.dispatcher },
  });

  const platformAdmin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: platformTenant.id, email: 'root@atair.local' } },
    update: {},
    create: {
      tenantId: platformTenant.id,
      email: 'root@atair.local',
      phone: '+966500000000',
      fullName: 'Platform Root',
      passwordHash,
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: platformAdmin.id, roleId: platform.roles.platform_admin } },
    update: {},
    create: { userId: platformAdmin.id, roleId: platform.roles.platform_admin },
  });

  // Vehicle types (global)
  const vehicleTypes = [
    { slug: 'motorcycle', name: 'دراجة نارية', capacityKg: 30, maxWeightKg: 30 },
    { slug: 'car', name: 'سيارة', capacityKg: 200, maxWeightKg: 200 },
    { slug: 'van', name: 'فان', capacityKg: 1200, maxWeightKg: 1200 },
    { slug: 'truck', name: 'شاحنة صغيرة', capacityKg: 3500, maxWeightKg: 3500 },
  ];
  for (const vt of vehicleTypes) {
    const existing = await prisma.vehicleType.findFirst({ where: { tenantId: null, slug: vt.slug } });
    if (existing) {
      await prisma.vehicleType.update({ where: { id: existing.id }, data: { ...vt } });
    } else {
      await prisma.vehicleType.create({ data: { tenantId: null, ...vt } });
    }
  }

  // Default service zone + pricing rule for demo tenant. The polygon is
  // required for zone resolution (and therefore zone-scoped pricing) to work.
  const riyadhPolygon = [
    [46.3, 24.4],
    [47.0, 24.4],
    [47.0, 25.1],
    [46.3, 25.1],
  ];
  const zone = await prisma.serviceZone.upsert({
    where: { tenantId_code: { tenantId: demoTenant.id, code: 'RIYADH' } },
    update: { polygon: riyadhPolygon },
    create: {
      tenantId: demoTenant.id,
      name: 'الرياض',
      code: 'RIYADH',
      centerLat: 24.7136,
      centerLng: 46.6753,
      polygon: riyadhPolygon,
    },
  });

  const existingRule = await prisma.pricingRule.findFirst({
    where: { tenantId: demoTenant.id, name: 'Default Riyadh Pricing' },
  });
  if (!existingRule) {
    await prisma.pricingRule.create({
      data: {
        tenantId: demoTenant.id,
        name: 'Default Riyadh Pricing',
        description: 'Default pricing for immediate delivery in Riyadh',
        zoneId: zone.id,
        priority: 10,
        currency: 'SAR',
        components: {
          create: [
            { type: 'base_fare', amount: 8 },
            { type: 'distance_fare', amount: 1.75, minValue: 0 },
            { type: 'time_fare', amount: 0.35, minValue: 0 },
            { type: 'night_surcharge', amount: 0.2, meta: { from: '22:00', to: '06:00', percent: true } },
            { type: 'cod_fee', amount: 3 },
          ],
        },
      },
    });
  }

  // Notification templates
  const templates = [
    { code: 'order.created', channel: 'in_app', subject: 'تم إنشاء الطلب', body: 'تم استلام طلبك رقم {{orderNumber}}' },
    { code: 'order.assigned', channel: 'in_app', subject: 'تم تعيين سائق', body: 'السائق {{driverName}} في الطريق إليك' },
    { code: 'order.delivered', channel: 'in_app', subject: 'تم التسليم', body: 'تم تسليم الطلب {{orderNumber}} بنجاح' },
  ];
  for (const t of templates) {
    await prisma.notificationTemplate.upsert({
      where: {
        tenantId_code_channel_locale: {
          tenantId: demoTenant.id,
          code: t.code,
          channel: 'in_app' as any,
          locale: 'ar',
        },
      },
      update: { subject: t.subject, body: t.body },
      create: {
        tenantId: demoTenant.id,
        code: t.code,
        channel: 'in_app' as any,
        locale: 'ar',
        subject: t.subject,
        body: t.body,
      },
    });
  }

  console.log('✅ Seed complete');
  console.log('   Platform admin: root@atair.local / ChangeMe123!');
  console.log('   Tenant admin:   admin@atair.local / ChangeMe123!');
  console.log('   Dispatcher:     dispatcher@atair.local / ChangeMe123!');
  console.log('   Merchant owner: owner@atair.local / ChangeMe123!  (merchant: atair-store)');
}

// ============================================================
// Merchant portal demo data — deterministic and idempotent.
// ============================================================
async function seedMerchantDemo(
  tenantId: string,
  roles: Record<string, string>,
  passwordHash: string,
) {
  const merchant = await prisma.merchant.upsert({
    where: { tenantId_slug: { tenantId, slug: 'atair-store' } },
    update: {},
    create: {
      tenantId,
      name: 'متجر عَ الطاير',
      slug: 'atair-store',
      category: 'retail',
      phone: '+966500000100',
      email: 'store@atair.local',
      status: 'active',
      commissionRate: 10,
      settings: {
        currency: 'SAR',
        contactName: 'خالد التاجر',
        contactPhone: '+966500000100',
        contactEmail: 'store@atair.local',
        defaultPickupAddress: 'مستودع الرياض، طريق الملك فهد',
        invoiceVatNumber: '310123456700003',
        language: 'ar',
        notifyOnStatus: true,
      },
    },
  });

  let branchMain = await prisma.merchantBranch.findFirst({
    where: { merchantId: merchant.id, name: 'الفرع الرئيسي — الرياض' },
  });
  if (!branchMain) {
    branchMain = await prisma.merchantBranch.create({
      data: {
        tenantId,
        merchantId: merchant.id,
        name: 'الفرع الرئيسي — الرياض',
        address: 'طريق الملك فهد، الرياض',
        latitude: 24.7136,
        longitude: 46.6753,
        phone: '+966500000100',
        status: 'active',
      },
    });
  }
  let branchNorth = await prisma.merchantBranch.findFirst({
    where: { merchantId: merchant.id, name: 'فرع شمال الرياض' },
  });
  if (!branchNorth) {
    branchNorth = await prisma.merchantBranch.create({
      data: {
        tenantId,
        merchantId: merchant.id,
        name: 'فرع شمال الرياض',
        address: 'حي النرجس، الرياض',
        latitude: 24.8607,
        longitude: 46.6374,
        phone: '+966500000101',
        status: 'active',
      },
    });
  }

  // Merchant team
  const owner = await prisma.user.upsert({
    where: { tenantId_email: { tenantId, email: 'owner@atair.local' } },
    update: {},
    create: {
      tenantId,
      email: 'owner@atair.local',
      phone: '+966500000110',
      fullName: 'خالد التاجر',
      passwordHash,
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: owner.id, roleId: roles.merchant_owner } },
    update: {},
    create: { userId: owner.id, roleId: roles.merchant_owner },
  });
  await prisma.merchantUser.upsert({
    where: { merchantId_userId: { merchantId: merchant.id, userId: owner.id } },
    update: { role: 'owner', branchId: branchMain.id },
    create: { merchantId: merchant.id, userId: owner.id, role: 'owner', branchId: branchMain.id },
  });

  const finance = await prisma.user.upsert({
    where: { tenantId_email: { tenantId, email: 'finance@atair.local' } },
    update: {},
    create: {
      tenantId,
      email: 'finance@atair.local',
      phone: '+966500000111',
      fullName: 'سارة المحاسبة',
      passwordHash,
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: finance.id, roleId: roles.merchant_finance } },
    update: {},
    create: { userId: finance.id, roleId: roles.merchant_finance },
  });
  await prisma.merchantUser.upsert({
    where: { merchantId_userId: { merchantId: merchant.id, userId: finance.id } },
    update: { role: 'finance', branchId: branchMain.id },
    create: { merchantId: merchant.id, userId: finance.id, role: 'finance', branchId: branchMain.id },
  });

  const operator = await prisma.user.upsert({
    where: { tenantId_email: { tenantId, email: 'operator@atair.local' } },
    update: {},
    create: {
      tenantId,
      email: 'operator@atair.local',
      phone: '+966500000112',
      fullName: 'عمر المشغّل',
      passwordHash,
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: operator.id, roleId: roles.merchant_operator } },
    update: {},
    create: { userId: operator.id, roleId: roles.merchant_operator },
  });
  await prisma.merchantUser.upsert({
    where: { merchantId_userId: { merchantId: merchant.id, userId: operator.id } },
    update: { role: 'operator', branchId: branchNorth.id },
    create: { merchantId: merchant.id, userId: operator.id, role: 'operator', branchId: branchNorth.id },
  });

  // A second merchant (isolation demo) with its own owner and orders.
  const rival = await prisma.merchant.upsert({
    where: { tenantId_slug: { tenantId, slug: 'rival-store' } },
    update: {},
    create: {
      tenantId,
      name: 'متجر المنافس',
      slug: 'rival-store',
      category: 'retail',
      phone: '+966500000200',
      email: 'rival@atair.local',
      status: 'active',
      commissionRate: 12,
      settings: { currency: 'SAR' },
    },
  });
  const rivalOwner = await prisma.user.upsert({
    where: { tenantId_email: { tenantId, email: 'rival@atair.local' } },
    update: {},
    create: {
      tenantId,
      email: 'rival@atair.local',
      phone: '+966500000210',
      fullName: 'فهد المنافس',
      passwordHash,
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: rivalOwner.id, roleId: roles.merchant_owner } },
    update: {},
    create: { userId: rivalOwner.id, roleId: roles.merchant_owner },
  });
  await prisma.merchantUser.upsert({
    where: { merchantId_userId: { merchantId: rival.id, userId: rivalOwner.id } },
    update: { role: 'owner' },
    create: { merchantId: rival.id, userId: rivalOwner.id, role: 'owner' },
  });

  // Merchant customers
  const customerSeeds = [
    { fullName: 'محمد العتيبي', phone: '+966500000301', email: 'mohammed@example.com' },
    { fullName: 'نورة القحطاني', phone: '+966500000302', email: 'noura@example.com' },
    { fullName: 'عبدالله الشمري', phone: '+966500000303', email: 'abdullah@example.com' },
    { fullName: 'ريم الدوسري', phone: '+966500000304', email: 'reem@example.com' },
    { fullName: 'سلمان الحربي', phone: '+966500000305', email: 'salman@example.com' },
  ];
  const customers: Array<{ id: string; fullName: string; phone: string }> = [];
  for (const c of customerSeeds) {
    const existing = await prisma.customer.findFirst({ where: { tenantId, merchantId: merchant.id, phone: c.phone } });
    const customer =
      existing ??
      (await prisma.customer.create({
        data: { tenantId, merchantId: merchant.id, ...c },
      }));
    customers.push({ id: customer.id, fullName: customer.fullName, phone: customer.phone });
  }
  // Addresses for the first customer
  const hasAddress = await prisma.customerAddress.findFirst({ where: { customerId: customers[0].id } });
  if (!hasAddress) {
    await prisma.customerAddress.createMany({
      data: [
        {
          tenantId,
          customerId: customers[0].id,
          label: 'home',
          address: 'حي العليا، شارع التخصصي، الرياض',
          latitude: 24.6949,
          longitude: 46.6853,
          isDefault: true,
        },
        {
          tenantId,
          customerId: customers[0].id,
          label: 'work',
          address: 'مركز الملك عبدالله المالي، الرياض',
          latitude: 24.7611,
          longitude: 46.6428,
          isDefault: false,
        },
      ],
    });
  }

  // Merchant orders across the lifecycle (deterministic by orderNumber).
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const orderSeeds: Array<{
    orderNumber: string;
    status: string;
    paymentMethod: string;
    codAmount: number;
    total: number;
    customerIndex: number;
    branchId: string;
    createdDaysAgo: number;
    delivered?: boolean;
  }> = [
    { orderNumber: 'MER-1001', status: 'delivered', paymentMethod: 'cod', codAmount: 250, total: 22.5, customerIndex: 0, branchId: branchMain.id, createdDaysAgo: 6, delivered: true },
    { orderNumber: 'MER-1002', status: 'delivered', paymentMethod: 'card', codAmount: 0, total: 18, customerIndex: 1, branchId: branchMain.id, createdDaysAgo: 5, delivered: true },
    { orderNumber: 'MER-1003', status: 'delivered', paymentMethod: 'cod', codAmount: 480, total: 27.75, customerIndex: 2, branchId: branchNorth.id, createdDaysAgo: 4, delivered: true },
    { orderNumber: 'MER-1004', status: 'in_transit', paymentMethod: 'cod', codAmount: 320, total: 24, customerIndex: 3, branchId: branchMain.id, createdDaysAgo: 1 },
    { orderNumber: 'MER-1005', status: 'assigned', paymentMethod: 'cash', codAmount: 0, total: 15.5, customerIndex: 4, branchId: branchNorth.id, createdDaysAgo: 1 },
    { orderNumber: 'MER-1006', status: 'searching_driver', paymentMethod: 'cod', codAmount: 175, total: 20, customerIndex: 0, branchId: branchMain.id, createdDaysAgo: 0 },
    { orderNumber: 'MER-1007', status: 'pending', paymentMethod: 'online', codAmount: 0, total: 19.25, customerIndex: 1, branchId: branchMain.id, createdDaysAgo: 0 },
    { orderNumber: 'MER-1008', status: 'cancelled', paymentMethod: 'cash', codAmount: 0, total: 12, customerIndex: 2, branchId: branchNorth.id, createdDaysAgo: 3 },
    { orderNumber: 'MER-1009', status: 'failed_delivery', paymentMethod: 'cod', codAmount: 210, total: 21, customerIndex: 3, branchId: branchMain.id, createdDaysAgo: 2 },
  ];

  for (const o of orderSeeds) {
    const createdAt = new Date(now - o.createdDaysAgo * day);
    const codStatus = o.paymentMethod !== 'cod' ? 'none' : o.status === 'delivered' ? 'collected' : 'pending';
    await prisma.order.upsert({
      where: { tenantId_orderNumber: { tenantId, orderNumber: o.orderNumber } },
      update: {},
      create: {
        tenantId,
        orderNumber: o.orderNumber,
        merchantId: merchant.id,
        merchantBranchId: o.branchId,
        customerId: customers[o.customerIndex].id,
        status: o.status as any,
        deliveryType: 'immediate',
        pickupAddress: 'مستودع الرياض، طريق الملك فهد',
        pickupLat: 24.7136,
        pickupLng: 46.6753,
        dropoffAddress: `حي ${['العليا', 'النرجس', 'الملز', 'الروضة', 'الياسمين'][o.customerIndex]}، الرياض`,
        dropoffLat: 24.7 + o.customerIndex * 0.02,
        dropoffLng: 46.68 - o.customerIndex * 0.01,
        distanceKm: 4 + o.customerIndex * 1.5,
        estimatedDurationMin: 15 + o.customerIndex * 4,
        subtotal: o.total - 3,
        taxAmount: 0,
        surchargeAmount: 3,
        total: o.total,
        currency: 'SAR',
        paymentMethod: o.paymentMethod as any,
        paymentStatus: o.delivered ? 'paid' : 'pending',
        codAmount: o.codAmount,
        codStatus: codStatus as any,
        codCollectedAt: codStatus === 'collected' ? createdAt : null,
        createdByUserId: owner.id,
        createdAt,
        confirmedAt: o.status !== 'pending' ? createdAt : null,
        assignedAt: ['assigned', 'in_transit', 'delivered'].includes(o.status) ? createdAt : null,
        pickedUpAt: ['in_transit', 'delivered'].includes(o.status) ? createdAt : null,
        deliveredAt: o.delivered ? createdAt : null,
        statusHistory: {
          create: [{ toStatus: 'pending', changedByUserId: owner.id, reason: 'order created', createdAt }],
        },
      },
    });
  }

  // Merchant settlement for the previous period (collected COD, net payable).
  const existingSettlement = await prisma.merchantSettlement.findFirst({
    where: { merchantId: merchant.id, reference: 'MS-2026-001' },
  });
  if (!existingSettlement) {
    const periodEnd = new Date(now - 2 * day);
    const periodStart = new Date(now - 9 * day);
    await prisma.merchantSettlement.create({
      data: {
        tenantId,
        merchantId: merchant.id,
        reference: 'MS-2026-001',
        periodStart,
        periodEnd,
        orderCount: 3,
        codCollected: 730,
        deliveryFees: 68.25,
        commissionAmount: 73,
        adjustments: 0,
        netPayable: 730 - 73,
        currency: 'SAR',
        status: 'pending',
      },
    });
  }

  // Merchant support tickets
  const existingTicket = await prisma.supportTicket.findFirst({
    where: { merchantId: merchant.id, subject: 'تأخير في استلام شحنة' },
  });
  if (!existingTicket) {
    await prisma.supportTicket.create({
      data: {
        tenantId,
        merchantId: merchant.id,
        subject: 'تأخير في استلام شحنة',
        description: 'الشحنة رقم MER-1004 تأخر السائق عن موعد الاستلام.',
        status: 'open',
        priority: 'high',
        messages: {
          create: {
            senderType: 'merchant',
            senderId: owner.id,
            body: 'نرجو المتابعة مع السائق بأسرع وقت.',
          },
        },
      },
    });
  }
}

main()
  .then(async () => {
    // Re-resolve tenants/roles needed for the merchant demo pass.
    const demoTenant = await prisma.tenant.findUnique({ where: { slug: 'atair-demo' } });
    if (demoTenant) {
      const roleRows = await prisma.role.findMany({ where: { tenantId: demoTenant.id } });
      const roles: Record<string, string> = {};
      for (const r of roleRows) roles[r.slug] = r.id;
      const passwordHash = await bcrypt.hash('ChangeMe123!', 12);
      await seedMerchantDemo(demoTenant.id, roles, passwordHash);
      console.log('   Merchant demo data: atair-store + rival-store seeded');
    }
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
