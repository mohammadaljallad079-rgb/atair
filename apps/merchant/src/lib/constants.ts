import type { OrderStatus, PaymentStatus, CodStatus } from './types';

export const ORDER_STATUSES: OrderStatus[] = [
  'draft', 'pending', 'confirmed', 'searching_driver', 'assigned', 'driver_arriving',
  'picked_up', 'in_transit', 'arriving', 'delivered', 'cancelled', 'failed_delivery', 'returned',
];

export const PAYMENT_STATUSES: PaymentStatus[] = [
  'pending', 'authorized', 'paid', 'failed', 'refunded', 'partially_refunded', 'cancelled',
];

export const COD_STATUSES: CodStatus[] = ['none', 'pending', 'collected', 'settled', 'cancelled'];

export const PAYMENT_METHODS = ['cash', 'card', 'wallet', 'online', 'bank_transfer', 'cod'] as const;

/** Statuses a merchant may cancel (mirrors the server-side allow-list). */
export const MERCHANT_CANCELLABLE: OrderStatus[] = [
  'draft', 'pending', 'confirmed', 'searching_driver', 'assigned', 'driver_arriving',
];

export const BUSINESS_ROLES = ['owner', 'manager', 'operator', 'finance', 'viewer'] as const;

export const SETTLEMENT_STATUSES = ['pending', 'processing', 'paid', 'failed', 'cancelled'] as const;

export const REPORT_PRESETS = ['today', 'yesterday', 'week', 'month', 'all'] as const;
