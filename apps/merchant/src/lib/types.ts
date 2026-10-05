// Domain types mirroring the Merchant Portal API contract (apps/api
// /api/v1/merchant/*). Kept hand-written and narrow to what the portal renders.

export interface AuthUser {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  tenantId: string;
  tenantSlug: string;
  roles: string[];
  permissions: string[];
  merchantIds?: string[];
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface Paginated<T> {
  items: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface MerchantContext {
  merchantId: string;
  merchantName: string;
  merchantSlug: string;
  merchantStatus: string;
  branchId: string | null;
  merchantRole: string | null;
  currency: string;
  merchantIds: string[];
}

export type OrderStatus =
  | 'draft' | 'pending' | 'confirmed' | 'searching_driver' | 'assigned'
  | 'driver_arriving' | 'picked_up' | 'in_transit' | 'arriving' | 'delivered'
  | 'cancelled' | 'failed_delivery' | 'returned';

export type PaymentStatus =
  | 'pending' | 'authorized' | 'paid' | 'failed' | 'refunded' | 'partially_refunded' | 'cancelled';

export type CodStatus = 'none' | 'pending' | 'collected' | 'settled' | 'cancelled';

export interface MerchantOrderListItem {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  codAmount: string;
  codStatus: CodStatus;
  deliveryType: string;
  total: string;
  currency: string;
  distanceKm: string | null;
  pickupAddress: string;
  dropoffAddress: string;
  createdAt: string;
  customer?: { id: string; fullName: string; phone: string } | null;
  driver?: { id: string; fullName: string; phone: string; status: string } | null;
  merchantBranch?: { id: string; name: string } | null;
}

export interface MerchantOrderDetail extends MerchantOrderListItem {
  pickupLat: number | null; pickupLng: number | null;
  dropoffLat: number | null; dropoffLng: number | null;
  estimatedDurationMin: number | null;
  subtotal: string; discountAmount: string; taxAmount: string; surchargeAmount: string;
  priceBreakdown: unknown;
  notes: string | null; cancellationReason: string | null;
  scheduledPickupAt: string | null;
  confirmedAt: string | null; assignedAt: string | null;
  pickedUpAt: string | null; deliveredAt: string | null; cancelledAt: string | null;
  codCollectedAt: string | null; codSettledAt: string | null;
  items: Array<{ id: string; name: string; description?: string | null; quantity: number; unitPrice: string; totalPrice: string; weightKg: string | null }>;
  statusHistory: Array<{ id: string; fromStatus: OrderStatus | null; toStatus: OrderStatus; reason: string | null; createdAt: string }>;
  assignments: Array<{ id: string; driverId: string; method: string; status: string; createdAt: string }>;
  payments: MerchantPayment[];
  deliveryProofs: Array<{ id: string; type: string; fileUrl: string | null; createdAt: string }>;
  deliveryAttempts: Array<{ id: string; attemptNo: number; outcome: string; reason: string | null; createdAt: string }>;
  customer?: { id: string; fullName: string; phone: string; email?: string | null } | null;
  driver?: { id: string; fullName: string; phone: string; status: string; rating?: number | null } | null;
  merchantBranch?: { id: string; name: string; address: string } | null;
}

export interface MerchantCustomer {
  id: string; fullName: string; phone: string; email?: string | null;
  status: 'active' | 'blocked' | 'inactive'; rating: number | null;
  notes?: string | null; createdAt: string;
  _count?: { orders: number };
}
export interface MerchantCustomerDetail extends MerchantCustomer {
  addresses: Array<{ id: string; label: string; address: string; latitude: number | null; longitude: number | null; isDefault: boolean }>;
  orders: Array<{ id: string; orderNumber: string; status: OrderStatus; total: string; createdAt: string }>;
}

export interface MerchantBranch {
  id: string; name: string; address: string;
  latitude: number | null; longitude: number | null; phone: string | null;
  status: 'active' | 'inactive'; createdAt: string;
  _count?: { orders: number };
}

export interface MerchantTeamMember {
  userId: string; fullName: string; email: string | null; phone: string | null;
  status: string; role: string; branchId: string | null; branchName: string | null;
  lastLoginAt: string | null; createdAt: string; roles: string[];
}

export interface MerchantPayment {
  id: string; amount: string; currency: string; method: string; status: PaymentStatus;
  provider: string | null; providerRef: string | null; refundedAmount: string; createdAt: string;
  order?: { id: string; orderNumber: string; merchantId: string | null; codAmount: string } | null;
  customer?: { id: string; fullName: string; phone: string } | null;
  refunds?: Array<{ id: string; amount: string; reason: string | null; status: string; createdAt: string }>;
}

export interface CodRecord {
  id: string; orderNumber: string; status: OrderStatus;
  codAmount: string; codStatus: CodStatus; codCollectedAt: string | null; codSettledAt: string | null;
  currency: string; total: string; paymentStatus: PaymentStatus;
  createdAt: string; deliveredAt: string | null;
  customer?: { id: string; fullName: string; phone: string } | null;
  merchantBranch?: { id: string; name: string } | null;
}

export interface CodSummary {
  pending: { amount: number; count: number };
  collected: { amount: number; count: number };
  settled: { amount: number; count: number };
}

export interface MerchantSettlement {
  id: string; reference: string | null;
  periodStart: string; periodEnd: string;
  orderCount: number; codCollected: string; deliveryFees: string;
  commissionAmount: string; adjustments: string; netPayable: string;
  currency: string; status: 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled';
  paidAt: string | null; notes: string | null; createdAt: string;
}

export interface MerchantTicket {
  id: string; subject: string; description: string | null;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  orderId: string | null; createdAt: string; updatedAt: string;
  _count?: { messages: number };
}
export interface MerchantTicketDetail extends MerchantTicket {
  messages: Array<{ id: string; senderType: string; senderId: string | null; body: string; createdAt: string }>;
}

export interface MerchantNotification {
  id: string; channel: string; title: string | null; body: string;
  status: 'queued' | 'sent' | 'failed' | 'read';
  templateCode: string | null; userId: string | null;
  sentAt: string | null; readAt: string | null; createdAt: string;
}

export interface MerchantDashboard {
  orders: {
    total: number; active: number; pending: number; searchingDriver: number;
    inTransit: number; delivered: number; cancelled: number; failed: number;
  };
  cod: { pending: number };
  finance: { deliverySpend: number };
  branches: { active: number };
  customers: { total: number };
  range: { from: string; to: string };
}

export interface MerchantReportSummary {
  orders: { total: number; delivered: number; cancelled: number; failed: number };
  finance: { deliverySpend: number; averageDeliveryCost: number; codCollected: number; codPending: number };
  range: { from: string; to: string };
}

export interface MerchantTimeseriesPoint { bucket: string; orders: number; revenue: number; cod: number }
export interface MerchantStatusCount { status: OrderStatus; count: number }
export interface MerchantBranchPerformance { branchId: string; name: string; orders: number; revenue: number }

export interface PriceQuote {
  currency: string; subtotal: number; surchargeAmount: number;
  discountAmount: number; taxAmount: number; total: number;
  breakdown: Array<{ type: string; label: string; amount: number }>;
  ruleId: string | null; ruleName: string | null;
}

export interface MerchantProfile {
  id: string; fullName: string; email: string | null; phone: string | null;
  locale: string | null; status: string;
  merchantId: string; merchantName: string; merchantRole: string | null;
}

export interface BusinessSettings {
  id: string; name: string; slug: string; category: string | null;
  phone: string | null; email: string | null;
  settings: Record<string, unknown>;
}

export interface ImportRowResult {
  index: number; clientRef: string | null; valid: boolean; errors: string[];
  orderNumber?: string; orderId?: string;
}
export interface ImportResult {
  dryRun: boolean; totalRows: number; validRows: number; invalidRows: number;
  created: number; duplicateRefs: string[]; rows: ImportRowResult[];
}
export interface ImportTemplate { columns: string[]; sample: string }
