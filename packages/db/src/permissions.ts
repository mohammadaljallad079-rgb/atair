// Central RBAC permission catalog — the Single Source of Truth for
// authorization codes. Roles map to subsets of these codes.

export const PERMISSIONS = {
  // Users / staff
  users_view: 'users.view',
  users_create: 'users.create',
  users_update: 'users.update',
  users_delete: 'users.delete',
  users_manage_roles: 'users.manage_roles',

  // Customers
  customers_view: 'customers.view',
  customers_create: 'customers.create',
  customers_update: 'customers.update',
  customers_block: 'customers.block',

  // Drivers
  drivers_view: 'drivers.view',
  drivers_create: 'drivers.create',
  drivers_update: 'drivers.update',
  drivers_suspend: 'drivers.suspend',
  drivers_verify: 'drivers.verify',
  drivers_assign: 'drivers.assign',

  // Vehicles
  vehicles_view: 'vehicles.view',
  vehicles_manage: 'vehicles.manage',

  // Merchants
  merchants_view: 'merchants.view',
  merchants_manage: 'merchants.manage',

  // Orders
  orders_view: 'orders.view',
  orders_create: 'orders.create',
  orders_update: 'orders.update',
  orders_cancel: 'orders.cancel',
  orders_assign: 'orders.assign',
  orders_force_status: 'orders.force_status',

  // Dispatch
  dispatch_view: 'dispatch.view',
  dispatch_manage: 'dispatch.manage',

  // Tracking
  tracking_view: 'tracking.view',

  // Zones
  zones_view: 'zones.view',
  zones_manage: 'zones.manage',

  // Pricing
  pricing_view: 'pricing.view',
  pricing_manage: 'pricing.manage',

  // Payments / wallets
  payments_view: 'payments.view',
  payments_refund: 'payments.refund',
  payments_manage: 'payments.manage',
  wallets_view: 'wallets.view',
  wallets_manage: 'wallets.manage',

  // Notifications
  notifications_view: 'notifications.view',
  notifications_manage: 'notifications.manage',

  // Support
  support_view: 'support.view',
  support_manage: 'support.manage',

  // Reports
  reports_view: 'reports.view',
  reports_export: 'reports.export',

  // Settings
  settings_view: 'settings.view',
  settings_manage: 'settings.manage',

  // Audit
  audit_view: 'audit.view',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSION_MODULES: Record<string, string> = {
  users: 'users',
  customers: 'customers',
  drivers: 'drivers',
  vehicles: 'vehicles',
  merchants: 'merchants',
  orders: 'orders',
  dispatch: 'dispatch',
  tracking: 'tracking',
  zones: 'zones',
  pricing: 'pricing',
  payments: 'payments',
  wallets: 'wallets',
  notifications: 'notifications',
  support: 'support',
  reports: 'reports',
  settings: 'settings',
  audit: 'audit',
};

export function permissionModule(code: string): string {
  return code.split('.')[0];
}

const P = PERMISSIONS;
const all = Object.values(P);

// Role slugs and their permissions. `platform_admin` gets everything.
export const SYSTEM_ROLES: Record<string, { name: string; description: string; permissions: string[] }> = {
  platform_admin: {
    name: 'Platform Admin',
    description: 'Full platform control across all tenants',
    permissions: all,
  },
  tenant_admin: {
    name: 'Company Admin',
    description: 'Full control within a single tenant',
    permissions: all,
  },
  operations_manager: {
    name: 'Operations Manager',
    description: 'Manages day-to-day operations, orders, drivers and dispatch',
    permissions: [
      P.orders_view, P.orders_create, P.orders_update, P.orders_cancel, P.orders_assign,
      P.drivers_view, P.drivers_create, P.drivers_update, P.drivers_suspend, P.drivers_verify, P.drivers_assign,
      P.vehicles_view, P.vehicles_manage,
      P.customers_view, P.customers_update,
      P.merchants_view,
      P.dispatch_view, P.dispatch_manage,
      P.tracking_view,
      P.zones_view, P.zones_manage,
      P.pricing_view,
      P.payments_view,
      P.reports_view,
      P.support_view, P.support_manage,
      P.notifications_view, P.notifications_manage,
      P.users_view,
      P.audit_view,
    ],
  },
  dispatcher: {
    name: 'Dispatcher',
    description: 'Assigns drivers and monitors live operations',
    permissions: [
      P.orders_view, P.orders_assign, P.orders_update,
      P.drivers_view, P.drivers_assign,
      P.dispatch_view, P.dispatch_manage,
      P.tracking_view,
      P.customers_view,
      P.zones_view,
      P.reports_view,
    ],
  },
  finance: {
    name: 'Finance',
    description: 'Manages payments, wallets and settlements',
    permissions: [
      P.payments_view, P.payments_refund, P.payments_manage,
      P.wallets_view, P.wallets_manage,
      P.orders_view,
      P.drivers_view,
      P.reports_view, P.reports_export,
      P.audit_view,
    ],
  },
  support_agent: {
    name: 'Support Agent',
    description: 'Handles customer tickets and complaints',
    permissions: [
      P.support_view, P.support_manage,
      P.customers_view, P.customers_update,
      P.orders_view,
      P.drivers_view,
    ],
  },
  merchant_admin: {
    name: 'Merchant Admin',
    description: 'Manages a merchant account and its orders',
    permissions: [
      P.orders_view, P.orders_create, P.orders_update, P.orders_cancel,
      P.customers_view,
      P.pricing_view,
      P.reports_view,
      P.support_view,
    ],
  },
  // ---- Merchant Portal roles (business employees) -------------------------
  // These are granted to users linked to a merchant via MerchantUser. They
  // intentionally reuse the platform permission catalog; merchant data scoping
  // is enforced separately by the MerchantBoundaryGuard + merchant-scoped
  // queries, never by role-name checks.
  merchant_owner: {
    name: 'Merchant Owner',
    description: 'Full control of a merchant account, including team and finance',
    permissions: [
      P.orders_view, P.orders_create, P.orders_update, P.orders_cancel,
      P.customers_view, P.customers_create, P.customers_update,
      P.pricing_view,
      P.payments_view,
      P.reports_view, P.reports_export,
      P.support_view, P.support_manage,
      P.notifications_view,
      P.settings_view, P.settings_manage,
      P.users_view, P.users_create, P.users_update, P.users_manage_roles,
      P.tracking_view,
    ],
  },
  merchant_manager: {
    name: 'Merchant Manager',
    description: 'Runs day-to-day merchant operations, branches and team',
    permissions: [
      P.orders_view, P.orders_create, P.orders_update, P.orders_cancel,
      P.customers_view, P.customers_create, P.customers_update,
      P.pricing_view,
      P.payments_view,
      P.reports_view, P.reports_export,
      P.support_view, P.support_manage,
      P.notifications_view,
      P.settings_view,
      P.users_view, P.users_create, P.users_update,
      P.tracking_view,
    ],
  },
  merchant_operator: {
    name: 'Merchant Operator',
    description: 'Creates and tracks deliveries',
    permissions: [
      P.orders_view, P.orders_create, P.orders_update,
      P.customers_view, P.customers_create,
      P.pricing_view,
      P.support_view, P.support_manage,
      P.notifications_view,
      P.tracking_view,
    ],
  },
  merchant_finance: {
    name: 'Merchant Finance',
    description: 'Views merchant payments, COD and settlements',
    permissions: [
      P.orders_view,
      P.payments_view,
      P.reports_view, P.reports_export,
      P.support_view,
      P.notifications_view,
    ],
  },
  merchant_viewer: {
    name: 'Merchant Viewer',
    description: 'Read-only access to merchant orders and reports',
    permissions: [
      P.orders_view,
      P.reports_view,
      P.support_view,
      P.notifications_view,
    ],
  },
  driver: {
    name: 'Driver',
    description: 'Driver application access',
    permissions: [P.orders_view, P.tracking_view, P.wallets_view],
  },
  customer: {
    name: 'Customer',
    description: 'Customer application access',
    permissions: [P.orders_view, P.tracking_view, P.payments_view],
  },
};

export const PERMISSION_DESCRIPTIONS: Record<string, string> = Object.fromEntries(
  all.map((code) => [code, `Allows ${code.replace('.', ' ')}`]),
);
