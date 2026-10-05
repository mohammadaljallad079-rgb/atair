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

  // Default service zone + pricing rule for demo tenant
  const zone = await prisma.serviceZone.upsert({
    where: { tenantId_code: { tenantId: demoTenant.id, code: 'RIYADH' } },
    update: {},
    create: {
      tenantId: demoTenant.id,
      name: 'الرياض',
      code: 'RIYADH',
      centerLat: 24.7136,
      centerLng: 46.6753,
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
