import { api } from './api';
import type {
  ActivityLog, ApiLog, Customer, CustomerDetail, DashboardData, DispatchOffer, Driver,
  DriverDetail, DriverWallet, HealthStatus, LiveOps, LoginResponse, Merchant, MerchantDetail,
  Notification, OperationsSummary, OrderDetail, OrderListItem, Paginated, Payment,
  Permission, PriceQuote, PricingRule, Role, SecurityEvent, ServiceZone, StaffUser,
  StatusCount, SupportTicket, SupportTicketDetail, SystemSetting, TimeseriesPoint, Vehicle,
  VehicleType,
} from './types';

type Q = Record<string, unknown>;

/**
 * Typed endpoint map — the only place backend paths are declared.
 * All list calls return the paginated envelope; all others return the payload.
 */
export const endpoints = {
  // Auth
  login: (identifier: string, password: string, tenantSlug?: string) =>
    api.post<LoginResponse>('/auth/login', { identifier, password, tenantSlug }),
  me: () => api.get<LoginResponse['user']>('/auth/me'),
  logout: () => api.post<{ loggedOut: boolean }>('/auth/logout'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<{ changed: boolean }>('/auth/change-password', { currentPassword, newPassword }),

  health: () => api.get<HealthStatus>('/health'),

  // Reports
  dashboard: (q: Q) => api.get<DashboardData>('/reports/dashboard', q),
  operations: () => api.get<OperationsSummary>('/reports/operations'),
  timeseries: (q: Q) => api.get<TimeseriesPoint[]>('/reports/timeseries', q),
  ordersByStatus: (q: Q) => api.get<StatusCount[]>('/reports/orders-by-status', q),

  // Orders
  orders: (q: Q) => api.getList<OrderListItem>('/orders', q),
  order: (id: string) => api.get<OrderDetail>(`/orders/${id}`),
  orderTimeline: (id: string) => api.get<OrderDetail['statusHistory']>(`/orders/${id}/timeline`),
  createOrder: (body: unknown) => api.post<OrderDetail>('/orders', body),
  transitionOrder: (id: string, status: string, reason?: string) =>
    api.post<OrderDetail>(`/orders/${id}/transition`, { status, reason }),
  assignOrder: (id: string, driverId: string, vehicleId?: string) =>
    api.post<OrderDetail>(`/orders/${id}/assign`, { driverId, vehicleId }),
  cancelOrder: (id: string, reason?: string) =>
    api.post<OrderDetail>(`/orders/${id}/cancel`, { reason }),

  // Drivers
  drivers: (q: Q) => api.getList<Driver>('/drivers', q),
  driver: (id: string) => api.get<DriverDetail>(`/drivers/${id}`),
  createDriver: (body: unknown) => api.post<Driver>('/drivers', body),
  updateDriver: (id: string, body: unknown) => api.patch<Driver>(`/drivers/${id}`, body),
  suspendDriver: (id: string, reason?: string) => api.post<Driver>(`/drivers/${id}/suspend`, { reason }),
  reviewDriverDocument: (id: string, docId: string, status: 'approved' | 'rejected', rejectReason?: string) =>
    api.post<unknown>(`/drivers/${id}/documents/${docId}/review`, { status, rejectReason }),
  driverLocations: () => api.get<Array<{ id: string; fullName: string; status: string; location: unknown }>>('/drivers/locations'),

  // Customers
  customers: (q: Q) => api.getList<Customer>('/customers', q),
  customer: (id: string) => api.get<CustomerDetail>(`/customers/${id}`),
  createCustomer: (body: unknown) => api.post<Customer>('/customers', body),
  updateCustomer: (id: string, body: unknown) => api.patch<Customer>(`/customers/${id}`, body),

  // Merchants
  merchants: (q: Q) => api.getList<Merchant>('/merchants', q),
  merchant: (id: string) => api.get<MerchantDetail>(`/merchants/${id}`),
  createMerchant: (body: unknown) => api.post<Merchant>('/merchants', body),
  updateMerchant: (id: string, body: unknown) => api.patch<Merchant>(`/merchants/${id}`, body),

  // Vehicles
  vehicles: (q: Q) => api.getList<Vehicle>('/vehicles', q),
  vehicleTypes: () => api.get<VehicleType[]>('/vehicles/types'),
  createVehicle: (body: unknown) => api.post<Vehicle>('/vehicles', body),
  updateVehicle: (id: string, body: unknown) => api.patch<Vehicle>(`/vehicles/${id}`, body),

  // Zones
  zones: (q: Q) => api.getList<ServiceZone>('/zones', q),
  createZone: (body: unknown) => api.post<ServiceZone>('/zones', body),
  updateZone: (id: string, body: unknown) => api.patch<ServiceZone>(`/zones/${id}`, body),

  // Pricing
  pricingRules: (q: Q) => api.getList<PricingRule>('/pricing/rules', q),
  createPricingRule: (body: unknown) => api.post<PricingRule>('/pricing/rules', body),
  updatePricingRule: (id: string, body: unknown) => api.patch<PricingRule>(`/pricing/rules/${id}`, body),
  quote: (body: unknown) => api.post<PriceQuote>('/pricing/quote', body),

  // Payments
  payments: (q: Q) => api.getList<Payment>('/payments', q),
  markPaymentPaid: (id: string) => api.post<Payment>(`/payments/${id}/mark-paid`),
  refundPayment: (id: string, amount?: number, reason?: string) =>
    api.post<Payment>(`/payments/${id}/refund`, { amount, reason }),

  // Wallets
  wallets: () => api.get<DriverWallet[]>('/wallets'),
  driverWallet: (driverId: string) => api.get<DriverWallet>(`/wallets/driver/${driverId}`),
  adjustWallet: (driverId: string, body: unknown) => api.post<DriverWallet>(`/wallets/driver/${driverId}/adjust`, body),

  // Support
  tickets: (q: Q) => api.getList<SupportTicket>('/support/tickets', q),
  ticket: (id: string) => api.get<SupportTicketDetail>(`/support/tickets/${id}`),
  createTicket: (body: unknown) => api.post<SupportTicket>('/support/tickets', body),
  addTicketMessage: (id: string, body: string) => api.post<unknown>(`/support/tickets/${id}/messages`, { body }),
  setTicketStatus: (id: string, status: string) => api.patch<SupportTicket>(`/support/tickets/${id}/status`, { status }),

  // Notifications
  notifications: (q: Q) => api.getList<Notification>('/notifications', q),
  markNotificationRead: (id: string) => api.post<Notification>(`/notifications/${id}/read`),

  // Audit
  auditActivity: (q: Q) => api.getList<ActivityLog>('/audit/activity', q),
  auditApiLogs: (q: Q) => api.getList<ApiLog>('/audit/api-logs', q),
  auditSecurityEvents: (q: Q) => api.getList<SecurityEvent>('/audit/security-events', q),

  // Users / Roles
  users: (q: Q) => api.getList<StaffUser>('/users', q),
  user: (id: string) => api.get<StaffUser>(`/users/${id}`),
  createUser: (body: unknown) => api.post<StaffUser>('/users', body),
  updateUser: (id: string, body: unknown) => api.patch<StaffUser>(`/users/${id}`, body),
  roles: async () => {
    const raw = await api.get<Array<Omit<Role, 'permissions'>>>('/users/roles');
    return raw.map((r) => ({
      ...r,
      permissions: (r.rolePermissions ?? []).map((rp) => rp.permission.code),
    })) as Role[];
  },
  permissions: () => api.get<Permission[]>('/users/permissions'),

  // Dispatch / tracking
  dispatchOffers: (orderId: string) => api.get<DispatchOffer[]>(`/dispatch/orders/${orderId}/offers`),
  redispatch: (orderId: string) => api.post<unknown>(`/dispatch/orders/${orderId}/redispatch`),
  liveOps: () => api.get<LiveOps>('/tracking/live'),
  trackOrder: (id: string) => api.get<{ order: unknown; driverLocation: unknown }>(`/tracking/orders/${id}`),

  // Settings
  settings: () => api.get<SystemSetting[]>('/settings'),
  setSetting: (key: string, value: unknown) => api.put<SystemSetting>(`/settings/${key}`, { value }),
};

export type { Paginated };
