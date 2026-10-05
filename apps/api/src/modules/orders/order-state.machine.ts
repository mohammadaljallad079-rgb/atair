import { Errors } from '../../common/errors/app-error';

export type OrderStatus =
  | 'draft'
  | 'pending'
  | 'confirmed'
  | 'searching_driver'
  | 'assigned'
  | 'driver_arriving'
  | 'picked_up'
  | 'in_transit'
  | 'arriving'
  | 'delivered'
  | 'cancelled'
  | 'failed_delivery'
  | 'returned';

/**
 * Allowed order transitions. Enforced server-side so a client can never move
 * an order through an invalid path.
 */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
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

export const TERMINAL_STATUSES: OrderStatus[] = ['delivered', 'cancelled', 'returned'];

export const ACTIVE_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'searching_driver',
  'assigned',
  'driver_arriving',
  'picked_up',
  'in_transit',
  'arriving',
];

export class OrderStateMachine {
  static canTransition(from: OrderStatus, to: OrderStatus): boolean {
    return TRANSITIONS[from]?.includes(to) ?? false;
  }

  static assertTransition(from: OrderStatus, to: OrderStatus): void {
    if (!this.canTransition(from, to)) {
      throw Errors.invalidTransition(from, to);
    }
  }

  static next(from: OrderStatus): OrderStatus[] {
    return TRANSITIONS[from] ?? [];
  }

  static isTerminal(status: OrderStatus): boolean {
    return TERMINAL_STATUSES.includes(status);
  }
}
