import { OrderStateMachine } from './order-state.machine';
import { AppError } from '../../common/errors/app-error';

describe('OrderStateMachine', () => {
  it('allows a valid forward transition', () => {
    expect(OrderStateMachine.canTransition('pending', 'confirmed')).toBe(true);
    expect(() => OrderStateMachine.assertTransition('pending', 'confirmed')).not.toThrow();
  });

  it('rejects an invalid transition with a domain error', () => {
    expect(OrderStateMachine.canTransition('pending', 'delivered')).toBe(false);
    expect(() => OrderStateMachine.assertTransition('pending', 'delivered')).toThrow(AppError);
  });

  it('treats delivered, cancelled and returned as terminal', () => {
    expect(OrderStateMachine.isTerminal('delivered')).toBe(true);
    expect(OrderStateMachine.isTerminal('cancelled')).toBe(true);
    expect(OrderStateMachine.isTerminal('returned')).toBe(true);
    expect(OrderStateMachine.isTerminal('in_transit')).toBe(false);
  });

  it('has no outgoing transitions from cancelled or returned', () => {
    expect(OrderStateMachine.next('cancelled')).toEqual([]);
    expect(OrderStateMachine.next('returned')).toEqual([]);
  });
});
