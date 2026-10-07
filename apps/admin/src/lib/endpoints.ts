import { api } from './api';
import type {
  ActivityLog, ApiLog, Customer, CustomerDetail, DashboardData, DispatchBoard, DispatchOffer, Driver,
  DriverDetail, DriverReportRow, DriverWallet, HealthStatus, LiveOps, LiveOverview, LoginResponse, Merchant,
  MerchantDetail, MerchantReportRow, Notification, NotificationDetail, NotificationTemplate, OperationsSummary,
  OrderDetail, OrderListItem, Paginated, Payment, Permission, PriceQuote, PricingRule, Role, SecurityEvent,
  ServiceZone, StaffUser, StatusCount, SupportTicket, SupportTicketDetail, SystemSetting, TimeseriesPoint,
  Vehicle, VehicleDetail, VehicleType,
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
  liveOverview: () => api.get<LiveOverview>('/reports/live-overview'),
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
  unsuspendDriver: (id: string) => api.post<Driver>(`/drivers/${id}/unsuspend`),
  setDriverAvailability: (id: string, isAvailable: boolean) =>
    api.patch<Driver>(`/drivers/${id}/availability`, { isAvailable }),
  assignDriverVehicle: (id: string, vehicleId: string) => api.post<unknown>(`/drivers/${id}/vehicle/${vehicleId}`),
  unassignDriverVehicle: (id: string, vehicleId: string) => api.post<unknown>(`/drivers/${id}/vehicle/${vehicleId}/unassign`),
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
  vehicle: (id: string) => api.get<VehicleDetail>(`/vehicles/${id}`),
  vehicleTypes: () => api.get<VehicleType[]>('/vehicles/types'),
  createVehicle: (body: unknown) => api.post<Vehicle>('/vehicles', body),
  updateVehicle: (id: string, body: unknown) => api.patch<Vehicle>(`/vehicles/${id}`, body),
  setVehicleStatus: (id: string, status: string) => api.patch<Vehicle>(`/vehicles/${id}/status`, { status }),
  assignVehicleDriver: (id: string, driverId: string) => api.post<VehicleDetail>(`/vehicles/${id}/driver`, { driverId }),
  unassignVehicleDriver: (id: string, driverId: string) =>
    api.post<VehicleDetail>(`/vehicles/${id}/driver/${driverId}/unassign`),

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

  // Wallets (ledger)
  wallets: (q: Q) => api.getList<DriverWallet>('/wallets', q),
  driverWallet: (driverId: string, q?: Q) => api.get<DriverWallet>(`/wallets/driver/${driverId}`, q),
  adjustWallet: (driverId: string, body: unknown) => api.post<DriverWallet>(`/wallets/driver/${driverId}/adjust`, body),

  // Support
  tickets: (q: Q) => api.getList<SupportTicket>('/support/tickets', q),
  ticket: (id: string) => api.get<SupportTicketDetail>(`/support/tickets/${id}`),
  createTicket: (body: unknown) => api.post<SupportTicket>('/support/tickets', body),
  addTicketMessage: (id: string, body: string) => api.post<unknown>(`/support/tickets/${id}/messages`, { body }),
  setTicketStatus: (id: string, status: string) => api.patch<SupportTicket>(`/support/tickets/${id}/status`, { status }),
  setTicketPriority: (id: string, priority: string) => api.patch<SupportTicket>(`/support/tickets/${id}/priority`, { priority }),
  assignTicket: (id: string, assignedToUserId: string | null) =>
    api.patch<SupportTicket>(`/support/tickets/${id}/assign`, { assignedToUserId }),

  // Notifications
  notifications: (q: Q) => api.getList<Notification>('/notifications', q),
  notification: (id: string) => api.get<NotificationDetail>(`/notifications/${id}`),
  notificationTemplates: () => api.get<NotificationTemplate[]>('/notifications/templates'),
  sendNotification: (body: unknown) => api.post<Notification>('/notifications/send', body),
  retryNotification: (id: string) => api.post<Notification>(`/notifications/${id}/retry`),
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
  resetUserPassword: (id: string) => api.post<{ temporaryPassword: string }>(`/users/${id}/reset-password`),
  revokeUserSessions: (id: string) => api.post<{ revoked: number }>(`/users/${id}/revoke-sessions`),
  roles: async () => {
    const raw = await api.get<Array<Omit<Role, 'permissions'>>>('/users/roles');
    return raw.map((r) => ({
      ...r,
      permissions: (r.rolePermissions ?? []).map((rp) => rp.permission.code),
    })) as Role[];
  },
  createRole: (body: unknown) => api.post<Role>('/users/roles', body),
  updateRole: (id: string, body: unknown) => api.patch<Role>(`/users/roles/${id}`, body),
  deleteRole: (id: string) => api.delete<{ deleted: boolean }>(`/users/roles/${id}`),
  permissions: () => api.get<Permission[]>('/users/permissions'),

  // Dispatch / tracking
  dispatchOffers: (orderId: string) => api.get<DispatchOffer[]>(`/dispatch/orders/${orderId}/offers`),
  dispatchBoard: () => api.get<DispatchBoard>('/dispatch/board'),
  redispatch: (orderId: string) => api.post<unknown>(`/dispatch/orders/${orderId}/redispatch`),
  liveOps: () => api.get<LiveOps>('/tracking/live'),
  trackOrder: (id: string) => api.get<{ order: unknown; driverLocation: unknown }>(`/tracking/orders/${id}`),

  // Reports
  driverReport: (q: Q) => api.get<DriverReportRow[]>('/reports/drivers', q),
  merchantReport: (q: Q) => api.get<MerchantReportRow[]>('/reports/merchants', q),
  exportOrders: (q: Q) => api.download('/reports/export/orders', q),

  // Settings
  settings: () => api.get<SystemSetting[]>('/settings'),
  setSetting: (key: string, value: unknown) => api.put<SystemSetting>(`/settings/${key}`, { value }),
};

export type { Paginated };
