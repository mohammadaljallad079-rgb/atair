// Domain types mirroring the Customer Application API contract
// (apps/api /api/v1/customer/*). Hand-written and narrow to what the app renders.

export interface AuthUser {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  tenantId: string;
  tenantSlug: string;
  roles: string[];
  permissions: string[];
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

export interface CustomerMe {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  email: string | null;
  status: 'active' | 'blocked' | 'inactive';
  rating: number | null;
  tenantId: string;
  tenantSlug: string;
  roles: string[];
  permissions: string[];
  createdAt: string;
}

export type OrderStatus =
  | 'draft' | 'pending' | 'confirmed' | 'searching_driver' | 'assigned'
  | 'driver_arriving' | 'picked_up' | 'in_transit' | 'arriving' | 'delivered'
  | 'cancelled' | 'failed_delivery' | 'returned';

export type PaymentStatus =
  | 'pending' | 'authorized' | 'paid' | 'failed' | 'refunded' | 'partially_refunded' | 'cancelled';

export type CodStatus = 'none' | 'pending' | 'collected' | 'settled' | 'cancelled';

export interface CustomerOrderListItem {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  deliveryType: string;
  pickupAddress: string;
  dropoffAddress: string;
  total: string;
  currency: string;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  codAmount: string;
  codStatus: CodStatus;
  createdAt: string;
  scheduledPickupAt: string | null;
  driver?: { fullName: string; rating: number | null; phone: string } | null;
}

export interface CustomerOrderDetail extends CustomerOrderListItem {
  pickupLat: number | null; pickupLng: number | null;
  dropoffLat: number | null; dropoffLng: number | null;
  distanceKm: string | null;
  estimatedDurationMin: number | null;
  subtotal: string; discountAmount: string; taxAmount: string; surchargeAmount: string;
  priceBreakdown: unknown;
  notes: string | null; cancellationReason: string | null;
  confirmedAt: string | null; assignedAt: string | null;
  pickedUpAt: string | null; deliveredAt: string | null; cancelledAt: string | null;
  updatedAt: string;
  items: Array<{ id: string; name: string; description?: string | null; quantity: number; unitPrice: string; totalPrice: string; weightKg: string | null }>;
  statusHistory: Array<{ id: string; fromStatus: OrderStatus | null; toStatus: OrderStatus; reason: string | null; meta?: unknown; createdAt: string }>;
  deliveryAddress: Array<{ id: string; type: 'pickup' | 'dropoff'; address: string; latitude: number | null; longitude: number | null; contactName: string | null; contactPhone: string | null; details: string | null }>;
  deliveryProofs: Array<{ id: string; type: string; fileUrl: string | null; createdAt: string }>;
  vehicle?: { plateNumber: string; make: string | null; model: string | null; color: string | null } | null;
}

export interface CustomerAddress {
  id: string;
  label: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  details: string | null;
  isDefault: boolean;
  createdAt: string;
}

export interface ServiceArea {
  id: string;
  name: string;
  code: string | null;
  centerLat: number | null;
  centerLng: number | null;
}

export interface PriceQuote {
  currency: string; subtotal: number; surchargeAmount: number;
  discountAmount: number; taxAmount: number; total: number;
  breakdown: Array<{ type: string; label: string; amount: number }>;
  ruleId: string | null; ruleName: string | null;
}

export interface TrackingSnapshot {
  order: CustomerOrderDetail;
  driverLocation: { latitude: number; longitude: number; recordedAt: string } | null;
  [key: string]: unknown;
}

export interface CustomerNotification {
  id: string; channel: string; title: string | null; body: string;
  status: 'queued' | 'sent' | 'failed' | 'read';
  templateCode: string | null; userId: string | null; customerId: string | null;
  sentAt: string | null; readAt: string | null; createdAt: string;
}

export interface CustomerTicket {
  id: string; subject: string; description: string | null;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  orderId: string | null; createdAt: string; updatedAt: string;
  _count?: { messages: number };
}
export interface CustomerTicketDetail extends CustomerTicket {
  messages: Array<{ id: string; senderType: string; senderId: string | null; body: string; createdAt: string }>;
}

export interface AuthConfig {
  enabled: boolean;
  requiresTenantSlug: boolean;
  tenantSlug: string | null;
  defaultTenantName: string | null;
  paymentMethods: Array<{ code: string; available: boolean }>;
}
