// Domain types mirroring the Al-Tayer API contract (apps/api). Kept hand-written
// and narrow to the fields the Admin actually renders, so the UI stays typed
// without importing backend internals.

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

export interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  [key: string]: string | number | boolean | undefined;
}

// ---- Orders ----
export type OrderStatus =
  | 'draft' | 'pending' | 'confirmed' | 'searching_driver' | 'assigned'
  | 'driver_arriving' | 'picked_up' | 'in_transit' | 'arriving' | 'delivered'
  | 'cancelled' | 'failed_delivery' | 'returned';

export type PaymentStatus =
  | 'pending' | 'authorized' | 'paid' | 'failed' | 'refunded' | 'partially_refunded' | 'cancelled';

export interface OrderListItem {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  deliveryType: string;
  total: string;
  currency: string;
  distanceKm: string | null;
  pickupAddress: string;
  dropoffAddress: string;
  scheduledPickupAt: string | null;
  createdAt: string;
  customer?: { id: string; fullName: string; phone: string } | null;
  driver?: { id: string; fullName: string; phone: string; status: string } | null;
  merchant?: { id: string; name: string } | null;
}

export interface OrderItem {
  id: string; name: string; description?: string | null;
  quantity: number; unitPrice: string; totalPrice: string; weightKg: string | null;
}

export interface OrderDetail extends OrderListItem {
  pickupLat: number | null; pickupLng: number | null;
  dropoffLat: number | null; dropoffLng: number | null;
  estimatedDurationMin: number | null;
  subtotal: string; discountAmount: string; taxAmount: string; surchargeAmount: string;
  priceBreakdown: unknown;
  notes: string | null; cancellationReason: string | null;
  confirmedAt: string | null; assignedAt: string | null;
  pickedUpAt: string | null; deliveredAt: string | null; cancelledAt: string | null;
  items: OrderItem[];
  statusHistory: Array<{ id: string; fromStatus: OrderStatus | null; toStatus: OrderStatus; reason: string | null; createdAt: string }>;
  assignments: Array<{ id: string; driverId: string; method: string; status: string; createdAt: string }>;
  payments: Payment[];
  deliveryProofs: Array<{ id: string; type: string; fileUrl: string | null; createdAt: string }>;
  deliveryAttempts: Array<{ id: string; attemptNo: number; outcome: string; reason: string | null; createdAt: string }>;
  customer?: { id: string; fullName: string; phone: string; email?: string | null } | null;
  driver?: { id: string; fullName: string; phone: string; status: string; rating?: number | null } | null;
  merchant?: { id: string; name: string } | null;
}

// ---- Drivers ----
export interface Driver {
  id: string; fullName: string; phone: string; email?: string | null;
  status: 'offline' | 'online' | 'busy' | 'paused' | 'suspended';
  verificationStatus: 'pending' | 'verified' | 'rejected' | 'expired';
  isAvailable: boolean; rating: number | null;
  completedOrders: number; cancelledOrders: number; totalEarnings: string;
  nationalId?: string | null; suspendedReason?: string | null;
  lastLocationAt: string | null; createdAt: string;
}
export interface DriverDetail extends Driver {
  documents: Array<{ id: string; type: string; fileUrl: string; status: string; expiresAt: string | null; rejectReason: string | null }>;
  vehicles: Array<{ vehicleId: string; isActive: boolean; vehicle: Vehicle }>;
  wallet: { id: string; balance: string; pending: string; currency: string } | null;
  activeAssignment?: {
    id: string; orderNumber: string; status: OrderStatus;
    total: string; currency: string; createdAt: string;
  } | null;
}

// ---- Customers ----
export interface Customer {
  id: string; fullName: string; phone: string; email?: string | null;
  status: 'active' | 'blocked' | 'inactive'; rating: number | null;
  notes?: string | null; createdAt: string;
}
export interface CustomerDetail extends Customer {
  addresses: Array<{ id: string; label: string; address: string; latitude: number | null; longitude: number | null; isDefault: boolean }>;
  orders?: Array<{
    id: string; orderNumber: string; status: OrderStatus;
    total: string; currency: string; paymentStatus: PaymentStatus; createdAt: string;
  }>;
}

// ---- Merchants ----
export interface Merchant {
  id: string; name: string; slug: string; category?: string | null;
  phone?: string | null; email?: string | null;
  status: 'active' | 'inactive' | 'suspended';
  commissionRate: string | null; createdAt: string;
}
export interface MerchantDetail extends Merchant {
  branches: Array<{ id: string; name: string; address: string; latitude: number | null; longitude: number | null; phone: string | null; status: string }>;
  users?: Array<{ merchantId: string; role: string; user: { id: string; fullName: string; email: string | null; phone: string | null; status: string } }>;
  orderCount?: number;
}

// ---- Vehicles ----
export interface Vehicle {
  id: string; plateNumber: string; make?: string | null; model?: string | null;
  year?: number | null; color?: string | null;
  status: 'active' | 'inactive' | 'maintenance';
  vehicleTypeId?: string | null; createdAt: string;
  vehicleType?: VehicleType | null;
  drivers?: Array<{ driverId: string; isActive: boolean; driver: { id: string; fullName: string; phone: string; status: string } }>;
}
export interface VehicleDetail extends Vehicle {
  drivers: Array<{
    driverId: string; isActive: boolean; assignedAt: string;
    driver: { id: string; fullName: string; phone: string; status: string; verificationStatus: string };
  }>;
}
export interface VehicleType {
  id: string; name: string; slug: string; capacityKg: number | null; maxWeightKg: number | null; isActive: boolean;
}

// ---- Zones / Pricing ----
export interface ServiceZone {
  id: string; name: string; code: string | null;
  polygon: number[][] | null; centerLat: number | null; centerLng: number | null;
  isActive: boolean; createdAt: string;
}
export interface PricingComponent {
  id: string; type: string; amount: string;
  minValue: string | null; maxValue: string | null;
}
export interface PricingRule {
  id: string; name: string; description: string | null;
  zoneId: string | null; merchantId: string | null; vehicleTypeId: string | null;
  deliveryType: string | null; priority: number; currency: string; isActive: boolean;
  components: PricingComponent[];
  zone?: { id: string; name: string } | null;
  merchant?: { id: string; name: string } | null;
}
export interface PriceQuote {
  currency: string; subtotal: number; surchargeAmount: number;
  discountAmount: number; taxAmount: number; total: number;
  breakdown: Array<{ type: string; label: string; amount: number }>;
  ruleId: string | null; ruleName: string | null;
}

// ---- Payments / Wallets ----
export interface Payment {
  id: string; amount: string; currency: string;
  method: string; status: PaymentStatus;
  provider: string | null; providerRef: string | null;
  refundedAmount: string; createdAt: string;
  order?: { id: string; orderNumber: string; merchantId: string | null } | null;
  customer?: { id: string; fullName: string; phone: string } | null;
  refunds?: Array<{ id: string; amount: string; reason: string | null; status: string; createdAt: string }>;
}
export interface DriverWallet {
  id: string; driverId: string; balance: string; pending: string; currency: string;
  updatedAt: string;
  driver?: { id: string; fullName: string; phone: string };
  transactions?: WalletTransaction[];
}
export interface WalletTransaction {
  id: string; type: 'credit' | 'debit' | 'payout' | 'adjustment';
  amount: string; balanceAfter: string; reference: string | null;
  description: string | null; createdAt: string;
}

// ---- Support / Notifications ----
export interface SupportTicket {
  id: string; subject: string; description: string | null;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  customerId: string | null; orderId: string | null;
  assignedToUserId: string | null; createdAt: string; updatedAt: string;
}
export interface SupportTicketDetail extends SupportTicket {
  messages: Array<{ id: string; senderType: string; senderId: string | null; body: string; createdAt: string }>;
  complaints: Array<{ id: string; category: string; body: string; status: string; createdAt: string }>;
}
export interface Notification {
  id: string; channel: string; title: string | null; body: string;
  status: 'queued' | 'sent' | 'failed' | 'read';
  templateCode: string | null; userId: string | null;
  customerId: string | null; driverId: string | null;
  sentAt: string | null; readAt: string | null; createdAt: string;
}

// ---- Audit ----
export interface ActivityLog {
  id: string; tenantId: string | null; userId: string | null;
  action: string; entity: string; entityId: string | null;
  before: unknown; after: unknown; ip: string | null; createdAt: string;
}
export interface ApiLog {
  id: string; method: string; path: string; statusCode: number;
  durationMs: number; ip: string | null; createdAt: string;
}
export interface SecurityEvent {
  id: string; type: string; severity: string; details: unknown;
  ip: string | null; createdAt: string;
}

// ---- Users / Roles ----
export interface StaffUser {
  id: string; fullName: string; email: string | null; phone: string | null;
  status: 'active' | 'invited' | 'suspended' | 'locked';
  lastLoginAt: string | null; createdAt: string; roles: string[];
}
export interface Role {
  id: string; tenantId: string | null; name: string; slug: string;
  description: string | null; isSystem: boolean;
  /** Present on /users/roles: the raw join rows. */
  rolePermissions?: Array<{ permission: { code: string } }>;
  /** Convenience: flattened permission codes (derived client-side). */
  permissions: string[];
}
export interface Permission {
  id: string; code: string; module: string; description: string | null;
}

// ---- Reports ----
export interface DashboardData {
  orders: { total: number; active: number; pending: number; completed: number; cancelled: number };
  drivers: { online: number; busy: number };
  finance: { revenue: number; driverEarnings: number; platformCommission: number; pendingPayments: number };
  range: { from: string; to: string };
}
export interface OperationsSummary {
  unassignedOrders: number; activeOrders: number;
  onlineDrivers: number; busyDrivers: number; availableDrivers: number;
  pausedDrivers: number; suspendedDrivers: number;
}
export interface TimeseriesPoint { bucket: string; orders: number; revenue: number }
export interface StatusCount { status: OrderStatus; count: number }

// ---- Tracking / Dispatch ----
export interface LiveOps {
  activeOrders: Array<{
    id: string; orderNumber: string; status: OrderStatus; driverId: string | null;
    pickupLat: number | null; pickupLng: number | null;
    dropoffLat: number | null; dropoffLng: number | null;
    createdAt: string; updatedAt: string;
  }>;
  drivers: Array<{
    id: string; fullName: string; status: string;
    location: { latitude: number; longitude: number; recordedAt: string } | null;
  }>;
}
export interface DispatchOffer {
  id: string; orderId: string; driverId: string;
  method: string; status: string; distanceKm: string | null;
  respondedAt: string | null; createdAt: string;
}
export interface DispatchBoard {
  unassigned: Array<{
    id: string; orderNumber: string; status: OrderStatus; deliveryType: string;
    total: string; currency: string; pickupAddress: string; dropoffAddress: string;
    distanceKm: string | null; createdAt: string;
  }>;
  active: Array<{
    id: string; orderNumber: string; status: OrderStatus; total: string; currency: string;
    pickupAddress: string; dropoffAddress: string; createdAt: string;
    driver: { id: string; fullName: string; phone: string } | null;
  }>;
  availableDrivers: Array<{ id: string; fullName: string; phone: string; status: string; rating: number | null; completedOrders: number }>;
  busyDrivers: Array<{ id: string; fullName: string; phone: string; status: string; rating: number | null; completedOrders: number }>;
}

// ---- Reports ----
export interface DriverReportRow {
  id: string; fullName: string; status: string; verificationStatus: string;
  isAvailable: boolean; rating: number | null;
  completedOrders: number; cancelledOrders: number; totalEarnings: string;
  completedInRange: number; revenueInRange: number;
}
export interface MerchantReportRow {
  id: string; name: string; slug: string; status: string; commissionRate: string | null;
  orders: number; delivered: number; revenue: number;
}

// ---- Settings ----
export interface SystemSetting { id: string; key: string; value: unknown; updatedAt: string }

// ---- Health ----
export interface HealthStatus { status: string; database: string; timestamp: string; uptimeSeconds: number }
