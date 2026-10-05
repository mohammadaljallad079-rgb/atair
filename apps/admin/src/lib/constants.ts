import type { OrderStatus, PaymentStatus } from './types';

export const ORDER_STATUSES: OrderStatus[] = [
  'draft', 'pending', 'confirmed', 'searching_driver', 'assigned', 'driver_arriving',
  'picked_up', 'in_transit', 'arriving', 'delivered', 'cancelled', 'failed_delivery', 'returned',
];

export const PAYMENT_STATUSES: PaymentStatus[] = [
  'pending', 'authorized', 'paid', 'failed', 'refunded', 'partially_refunded', 'cancelled',
];

export const PAYMENT_METHODS = ['cash', 'card', 'wallet', 'online', 'bank_transfer', 'cod'] as const;

export const DELIVERY_TYPES = ['immediate', 'scheduled', 'courier', 'internal'] as const;

export const DRIVER_STATUSES = ['offline', 'online', 'busy', 'paused', 'suspended'] as const;
export const VERIFICATION_STATUSES = ['pending', 'verified', 'rejected', 'expired'] as const;
export const CUSTOMER_STATUSES = ['active', 'blocked', 'inactive'] as const;
export const MERCHANT_STATUSES = ['active', 'inactive', 'suspended'] as const;
export const VEHICLE_STATUSES = ['active', 'inactive', 'maintenance'] as const;
export const TICKET_STATUSES = ['open', 'pending', 'resolved', 'closed'] as const;
export const TICKET_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export const USER_STATUSES = ['active', 'invited', 'suspended', 'locked'] as const;

/** Terminal order statuses cannot be transitioned further. */
export const TERMINAL_ORDER_STATUSES: OrderStatus[] = ['delivered', 'cancelled', 'returned'];

/**
 * Mirrors apps/api order-state.machine.ts exactly. Used only to offer valid next
 * statuses in the UI; the server remains the source of truth and rejects
 * invalid transitions with INVALID_STATUS_TRANSITION.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft: ['pending', 'cancelled'],
  pending: ['confirmed', 'cancelled'],
  confirmed: ['searching_driver', 'assigned', 'cancelled'],
  searching_driver: ['assigned', 'cancelled'],
  assigned: ['driver_arriving', 'picked_up', 'cancelled', 'searching_driver'],
  driver_arriving: ['picked_up', 'cancelled', 'failed_delivery'],
  picked_up: ['in_transit', 'arriving', 'delivered', 'failed_delivery', 'returned'],
  in_transit: ['arriving', 'delivered', 'failed_delivery', 'returned'],
  arriving: ['delivered', 'failed_delivery', 'returned'],
  delivered: ['returned'],
  cancelled: [],
  failed_delivery: ['returned', 'assigned', 'cancelled'],
  returned: [],
};

export function nextOrderStatuses(status: OrderStatus): OrderStatus[] {
  return ORDER_TRANSITIONS[status] ?? [];
}
