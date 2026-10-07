/**
 * Pricing Engine — no hardcoded fares. Rules and components come from the
 * database so administrators can change pricing without a deploy.
 */

export type PricingComponentType =
  | 'base_fare'
  | 'distance_fare'
  | 'time_fare'
  | 'zone_fare'
  | 'vehicle_fare'
  | 'weight_surcharge'
  | 'size_surcharge'
  | 'waiting_fee'
  | 'night_surcharge'
  | 'peak_surcharge'
  | 'scheduled_fee'
  | 'cod_fee';

/** Canonical runtime list — must stay in sync with the Prisma enum. */
export const PRICING_COMPONENT_TYPES: PricingComponentType[] = [
  'base_fare',
  'distance_fare',
  'time_fare',
  'zone_fare',
  'vehicle_fare',
  'weight_surcharge',
  'size_surcharge',
  'waiting_fee',
  'night_surcharge',
  'peak_surcharge',
  'scheduled_fee',
  'cod_fee',
];

export interface PricingComponentInput {
  type: PricingComponentType;
  amount: number;
  minValue?: number | null;
  maxValue?: number | null;
  meta?: Record<string, any> | null;
}

export interface PricingRuleInput {
  id: string;
  name: string;
  currency: string;
  priority: number;
  components: PricingComponentInput[];
}

export interface PriceQuoteInput {
  distanceKm: number;
  durationMin: number;
  weightKg?: number;
  scheduled?: boolean;
  paymentMethod?: 'cash' | 'card' | 'wallet' | 'online' | 'bank_transfer' | 'cod';
  at?: Date;
  discount?: { type: 'fixed' | 'percent'; amount: number } | null;
  taxRatePercent?: number;
}

export interface PriceLine {
  type: PricingComponentType;
  label: string;
  amount: number;
}

export interface PriceQuote {
  currency: string;
  subtotal: number;
  surchargeAmount: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  breakdown: PriceLine[];
  ruleId: string | null;
  ruleName: string | null;
}

const LABELS: Record<PricingComponentType, string> = {
  base_fare: 'الأجرة الأساسية',
  distance_fare: 'أجرة المسافة',
  time_fare: 'أجرة الوقت',
  zone_fare: 'أجرة المنطقة',
  vehicle_fare: 'أجرة نوع المركبة',
  weight_surcharge: 'رسوم الوزن',
  size_surcharge: 'رسوم الحجم',
  waiting_fee: 'رسوم الانتظار',
  night_surcharge: 'رسوم الليل',
  peak_surcharge: 'رسوم وقت الذروة',
  scheduled_fee: 'رسوم التوصيل المجدول',
  cod_fee: 'رسوم الدفع عند الاستلام',
};

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function inWindow(meta: Record<string, any> | null | undefined, at: Date): boolean {
  if (!meta?.from || !meta?.to) return true;
  const [fh, fm] = String(meta.from).split(':').map(Number);
  const [th, tm] = String(meta.to).split(':').map(Number);
  const minutes = at.getHours() * 60 + at.getMinutes();
  const from = fh * 60 + fm;
  const to = th * 60 + tm;
  // Windows that wrap past midnight (e.g. 22:00 → 06:00)
  return from <= to ? minutes >= from && minutes <= to : minutes >= from || minutes <= to;
}

export class PricingEngine {
  /** Picks the highest-priority applicable rule. */
  static selectRule(rules: PricingRuleInput[]): PricingRuleInput | null {
    if (rules.length === 0) return null;
    return [...rules].sort((a, b) => b.priority - a.priority)[0];
  }

  /** Computes a full, itemized quote. All arithmetic is server-side. */
  static quote(rule: PricingRuleInput | null, input: PriceQuoteInput): PriceQuote {
    const currency = rule?.currency ?? 'SAR';
    const at = input.at ?? new Date();
    const lines: PriceLine[] = [];
    let subtotal = 0;
    let surchargeAmount = 0;

    const distance = Math.max(0, input.distanceKm || 0);
    const duration = Math.max(0, input.durationMin || 0);
    const weight = Math.max(0, input.weightKg || 0);

    for (const c of rule?.components ?? []) {
      let amount = 0;
      switch (c.type) {
        case 'base_fare':
          amount = c.amount;
          subtotal += amount;
          break;
        case 'distance_fare': {
          const billable = Math.max(0, distance - (c.minValue ?? 0));
          const capped = c.maxValue != null ? Math.min(billable, c.maxValue) : billable;
          amount = capped * c.amount;
          subtotal += amount;
          break;
        }
        case 'time_fare':
          amount = duration * c.amount;
          subtotal += amount;
          break;
        case 'zone_fare':
        case 'vehicle_fare':
          amount = c.amount;
          subtotal += amount;
          break;
        case 'weight_surcharge': {
          const over = Math.max(0, weight - (c.minValue ?? 0));
          amount = over > 0 ? over * c.amount : 0;
          surchargeAmount += amount;
          break;
        }
        case 'size_surcharge':
        case 'waiting_fee':
        case 'peak_surcharge':
          amount = c.amount;
          surchargeAmount += amount;
          break;
        case 'night_surcharge': {
          if (!inWindow(c.meta, at)) break;
          amount = c.meta?.percent ? subtotal * (c.amount / 100) : c.amount;
          surchargeAmount += amount;
          break;
        }
        case 'scheduled_fee':
          if (!input.scheduled) break;
          amount = c.amount;
          surchargeAmount += amount;
          break;
        case 'cod_fee':
          if (input.paymentMethod !== 'cod' && input.paymentMethod !== 'cash') break;
          amount = c.amount;
          surchargeAmount += amount;
          break;
      }
      if (amount !== 0) {
        lines.push({ type: c.type, label: LABELS[c.type], amount: round2(amount) });
      }
    }

    const preDiscount = subtotal + surchargeAmount;
    let discountAmount = 0;
    if (input.discount) {
      discountAmount =
        input.discount.type === 'percent'
          ? preDiscount * (input.discount.amount / 100)
          : input.discount.amount;
      discountAmount = Math.min(Math.max(0, discountAmount), preDiscount);
    }

    const taxable = Math.max(0, preDiscount - discountAmount);
    const taxAmount = input.taxRatePercent ? taxable * (input.taxRatePercent / 100) : 0;
    const total = round2(taxable + taxAmount);

    if (discountAmount > 0) {
      lines.push({ type: 'base_fare', label: 'الخصم', amount: -round2(discountAmount) });
    }
    if (taxAmount > 0) {
      lines.push({ type: 'base_fare', label: 'الضريبة', amount: round2(taxAmount) });
    }

    return {
      currency,
      subtotal: round2(subtotal),
      surchargeAmount: round2(surchargeAmount),
      discountAmount: round2(discountAmount),
      taxAmount: round2(taxAmount),
      total,
      breakdown: lines,
      ruleId: rule?.id ?? null,
      ruleName: rule?.name ?? null,
    };
  }
}
