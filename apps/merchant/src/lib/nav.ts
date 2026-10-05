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
 * Merchant portal sidebar. `permission` is a UI hint only — the backend
 * authorizes every request. Items without a permission are visible to any
 * authenticated merchant user.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: 'nav.group.business',
    items: [
      { href: '/dashboard', labelKey: 'nav.dashboard', icon: 'grid', permission: 'reports.view' },
      { href: '/orders/new', labelKey: 'nav.newOrder', icon: 'route', permission: 'orders.create' },
      { href: '/orders', labelKey: 'nav.orders', icon: 'box', permission: 'orders.view' },
      { href: '/import', labelKey: 'nav.import', icon: 'truck', permission: 'orders.create' },
      { href: '/customers', labelKey: 'nav.customers', icon: 'users', permission: 'customers.view' },
      { href: '/branches', labelKey: 'nav.branches', icon: 'store' },
      { href: '/team', labelKey: 'nav.team', icon: 'id', permission: 'users.view' },
    ],
  },
  {
    labelKey: 'nav.group.finance',
    items: [
      { href: '/payments', labelKey: 'nav.payments', icon: 'card', permission: 'payments.view' },
      { href: '/cod', labelKey: 'nav.cod', icon: 'wallet', permission: 'payments.view' },
      { href: '/settlements', labelKey: 'nav.settlements', icon: 'tag', permission: 'payments.view' },
      { href: '/reports', labelKey: 'nav.reports', icon: 'pulse', permission: 'reports.view' },
    ],
  },
  {
    labelKey: 'nav.group.service',
    items: [
      { href: '/support', labelKey: 'nav.support', icon: 'life', permission: 'support.view' },
      { href: '/notifications', labelKey: 'nav.notifications', icon: 'bell', permission: 'notifications.view' },
    ],
  },
  {
    labelKey: 'nav.group.account',
    items: [
      { href: '/profile', labelKey: 'nav.profile', icon: 'user' },
      { href: '/settings', labelKey: 'nav.settings', icon: 'cog', permission: 'settings.view' },
    ],
  },
];
