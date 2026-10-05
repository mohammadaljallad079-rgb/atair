export interface NavItem {
  href: string;
  labelKey: string;
  permission?: string | string[];
  icon: string;
}

export interface NavGroup {
  labelKey: string;
  items: NavItem[];
}

/**
 * Sidebar structure. `permission` is a UI hint only — the backend still
 * authorizes every request. Items without a permission are visible to any
 * authenticated user.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: 'nav.group.operations',
    items: [
      { href: '/dashboard', labelKey: 'nav.dashboard', icon: 'grid', permission: 'reports.view' },
      { href: '/operations', labelKey: 'nav.operations', icon: 'pulse', permission: 'tracking.view' },
      { href: '/orders', labelKey: 'nav.orders', icon: 'box', permission: 'orders.view' },
      { href: '/drivers', labelKey: 'nav.drivers', icon: 'user', permission: 'drivers.view' },
      { href: '/dispatch', labelKey: 'nav.dispatch', icon: 'route', permission: 'dispatch.view' },
      { href: '/vehicles', labelKey: 'nav.vehicles', icon: 'truck', permission: 'vehicles.view' },
    ],
  },
  {
    labelKey: 'nav.group.finance',
    items: [
      { href: '/pricing', labelKey: 'nav.pricing', icon: 'tag', permission: 'pricing.view' },
      { href: '/zones', labelKey: 'nav.zones', icon: 'map', permission: 'zones.view' },
      { href: '/payments', labelKey: 'nav.payments', icon: 'card', permission: 'payments.view' },
      { href: '/wallets', labelKey: 'nav.wallets', icon: 'wallet', permission: 'wallets.view' },
    ],
  },
  {
    labelKey: 'nav.group.communication',
    items: [
      { href: '/customers', labelKey: 'nav.customers', icon: 'users', permission: 'customers.view' },
      { href: '/merchants', labelKey: 'nav.merchants', icon: 'store', permission: 'merchants.view' },
      { href: '/support', labelKey: 'nav.support', icon: 'life', permission: 'support.view' },
      { href: '/notifications', labelKey: 'nav.notifications', icon: 'bell', permission: 'notifications.view' },
    ],
  },
  {
    labelKey: 'nav.group.administration',
    items: [
      { href: '/audit', labelKey: 'nav.audit', icon: 'shield', permission: 'audit.view' },
      { href: '/users', labelKey: 'nav.users', icon: 'id', permission: 'users.view' },
      { href: '/roles', labelKey: 'nav.roles', icon: 'key', permission: 'users.view' },
      { href: '/settings', labelKey: 'nav.settings', icon: 'cog', permission: 'settings.view' },
    ],
  },
];
