export interface NavItem {
  href: string;
  labelKey: string;
  icon: string;
  /** Hide from the primary desktop rail (still reachable via the header). */
  secondary?: boolean;
}

/**
 * Customer app navigation. `permission` gating is intentionally absent: a
 * customer principal is confined to the customer surface by the API boundary,
 * so every item here is available to any signed-in customer.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: '/home', labelKey: 'cust.nav.home', icon: 'grid' },
  { href: '/orders/new', labelKey: 'cust.nav.newOrder', icon: 'route' },
  { href: '/orders', labelKey: 'cust.nav.orders', icon: 'box' },
  { href: '/addresses', labelKey: 'cust.nav.addresses', icon: 'map' },
  { href: '/notifications', labelKey: 'cust.nav.notifications', icon: 'bell' },
  { href: '/profile', labelKey: 'cust.nav.profile', icon: 'user' },
];

/** Bottom mobile tab bar (primary actions only). */
export const TAB_ITEMS: NavItem[] = [
  { href: '/home', labelKey: 'cust.nav.home', icon: 'grid' },
  { href: '/orders', labelKey: 'cust.nav.orders', icon: 'box' },
  { href: '/orders/new', labelKey: 'cust.nav.newOrder', icon: 'route' },
  { href: '/notifications', labelKey: 'cust.nav.notifications', icon: 'bell' },
  { href: '/profile', labelKey: 'cust.nav.profile', icon: 'user' },
];
