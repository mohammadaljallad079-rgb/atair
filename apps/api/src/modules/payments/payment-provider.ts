/**
 * Payment provider abstraction. Domain code depends only on this interface,
 * so providers (Moyasar, Tap, Stripe, HyperPay, ...) can be added without
 * touching order or wallet logic.
 */

export interface ChargeRequest {
  amount: number;
  currency: string;
  reference: string;
  idempotencyKey?: string;
  metadata?: Record<string, any>;
}

export interface ChargeResult {
  providerRef: string;
  status: 'pending' | 'authorized' | 'paid' | 'failed';
  raw?: unknown;
}

export interface RefundRequest {
  providerRef: string;
  amount: number;
  currency: string;
  reason?: string;
}

export interface RefundResult {
  providerRef: string;
  status: 'pending' | 'refunded' | 'failed';
  raw?: unknown;
}

export interface PaymentProvider {
  readonly name: string;
  supports(method: string): boolean;
  charge(req: ChargeRequest): Promise<ChargeResult>;
  refund(req: RefundRequest): Promise<RefundResult>;
}

/** Cash / COD provider: no external call, settles on delivery. */
export class CashPaymentProvider implements PaymentProvider {
  readonly name = 'cash';

  supports(method: string): boolean {
    return method === 'cash' || method === 'cod';
  }

  async charge(req: ChargeRequest): Promise<ChargeResult> {
    return { providerRef: `cash_${req.reference}`, status: 'pending' };
  }

  async refund(req: RefundRequest): Promise<RefundResult> {
    return { providerRef: `cash_refund_${req.providerRef}`, status: 'refunded' };
  }
}
