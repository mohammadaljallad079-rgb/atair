import { api, apiBaseUrl } from './api';
import type {
  BusinessSettings, CodRecord, CodSummary, ImportResult, ImportTemplate,
  LoginResponse, MerchantBranch, MerchantContext, MerchantCustomer, MerchantCustomerDetail,
  MerchantDashboard, MerchantNotification, MerchantOrderDetail, MerchantOrderListItem,
  MerchantPayment, MerchantProfile, MerchantReportSummary, MerchantSettlement,
  MerchantStatusCount, MerchantTeamMember, MerchantTicket, MerchantTicketDetail,
  MerchantTimeseriesPoint, MerchantBranchPerformance, Paginated, PriceQuote,
} from './types';

type Q = Record<string, unknown>;

/**
 * Typed endpoint map for the Merchant Portal API (/api/v1/merchant/*).
 * This is the only place merchant API paths are declared.
 */
export const endpoints = {
  // Auth (shared with the platform)
  login: (identifier: string, password: string, tenantSlug?: string) =>
    api.post<LoginResponse>('/auth/login', { identifier, password, tenantSlug }),
  me: () => api.get<LoginResponse['user']>('/auth/me'),
  logout: () => api.post<{ loggedOut: boolean }>('/auth/logout'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<{ changed: boolean }>('/auth/change-password', { currentPassword, newPassword }),

  context: (q?: Q, signal?: AbortSignal) => api.get<MerchantContext>('/merchant/context', q, signal),

  // Dashboard / reports
  dashboard: (q: Q, signal?: AbortSignal) => api.get<MerchantDashboard>('/merchant/dashboard', q, signal),
  reportSummary: (q: Q, signal?: AbortSignal) => api.get<MerchantReportSummary>('/merchant/reports/summary', q, signal),
  reportOrdersByStatus: (q: Q, signal?: AbortSignal) => api.get<MerchantStatusCount[]>('/merchant/reports/orders-by-status', q, signal),
  reportTimeseries: (q: Q, signal?: AbortSignal) => api.get<MerchantTimeseriesPoint[]>('/merchant/reports/timeseries', q, signal),
  reportBranches: (q: Q, signal?: AbortSignal) => api.get<MerchantBranchPerformance[]>('/merchant/reports/branches', q, signal),

  // Orders
  orders: (q: Q, signal?: AbortSignal) => api.getList<MerchantOrderListItem>('/merchant/orders', q, signal),
  order: (id: string, signal?: AbortSignal) => api.get<MerchantOrderDetail>(`/merchant/orders/${id}`, undefined, signal),
  orderTimeline: (id: string, signal?: AbortSignal) => api.get<MerchantOrderDetail['statusHistory']>(`/merchant/orders/${id}/timeline`, undefined, signal),
  orderTracking: (id: string, signal?: AbortSignal) => api.get<{ order: unknown; driverLocation: unknown }>(`/merchant/orders/${id}/tracking`, undefined, signal),
  quote: (body: unknown) => api.post<PriceQuote>('/merchant/orders/quote', body),
  createOrder: (body: unknown) => api.post<MerchantOrderDetail>('/merchant/orders', body),
  cancelOrder: (id: string, reason?: string) =>
    api.post<MerchantOrderDetail>(`/merchant/orders/${id}/cancel`, { reason }),
  importTemplate: () => api.post<ImportTemplate>('/merchant/orders/import/template'),
  importOrders: (body: unknown) => api.post<ImportResult>('/merchant/orders/import', body),

  // Customers
  customers: (q: Q, signal?: AbortSignal) => api.getList<MerchantCustomer>('/merchant/customers', q, signal),
  customer: (id: string, signal?: AbortSignal) => api.get<MerchantCustomerDetail>(`/merchant/customers/${id}`, undefined, signal),
  createCustomer: (body: unknown) => api.post<MerchantCustomer>('/merchant/customers', body),
  updateCustomer: (id: string, body: unknown) => api.patch<MerchantCustomer>(`/merchant/customers/${id}`, body),
  customerAddresses: (id: string) => api.get<MerchantCustomerDetail['addresses']>(`/merchant/customers/${id}/addresses`),
  addCustomerAddress: (id: string, body: unknown) =>
    api.post<MerchantCustomerDetail['addresses'][number]>(`/merchant/customers/${id}/addresses`, body),

  // Branches
  branches: (q: Q, signal?: AbortSignal) => api.getList<MerchantBranch>('/merchant/branches', q, signal),
  branch: (id: string, signal?: AbortSignal) => api.get<MerchantBranch>(`/merchant/branches/${id}`, undefined, signal),
  createBranch: (body: unknown) => api.post<MerchantBranch>('/merchant/branches', body),
  updateBranch: (id: string, body: unknown) => api.patch<MerchantBranch>(`/merchant/branches/${id}`, body),

  // Team
  team: (q?: Q, signal?: AbortSignal) => api.get<MerchantTeamMember[]>('/merchant/team', q, signal),
  inviteTeamMember: (body: unknown) => api.post<MerchantTeamMember>('/merchant/team', body),
  updateTeamMember: (userId: string, body: unknown) =>
    api.patch<{ updated: boolean }>(`/merchant/team/${userId}`, body),

  // Payments / COD / settlements
  payments: (q: Q, signal?: AbortSignal) => api.getList<MerchantPayment>('/merchant/payments', q, signal),
  cod: (q: Q, signal?: AbortSignal) => api.getList<CodRecord>('/merchant/cod', q, signal),
  codSummary: (q?: Q, signal?: AbortSignal) => api.get<CodSummary>('/merchant/cod/summary', q, signal),
  settlements: (q: Q, signal?: AbortSignal) => api.getList<MerchantSettlement>('/merchant/settlements', q, signal),
  settlement: (id: string, signal?: AbortSignal) => api.get<MerchantSettlement>(`/merchant/settlements/${id}`, undefined, signal),

  // Support
  tickets: (q: Q, signal?: AbortSignal) => api.getList<MerchantTicket>('/merchant/support/tickets', q, signal),
  ticket: (id: string, signal?: AbortSignal) => api.get<MerchantTicketDetail>(`/merchant/support/tickets/${id}`, undefined, signal),
  createTicket: (body: unknown) => api.post<MerchantTicket>('/merchant/support/tickets', body),
  addTicketMessage: (id: string, body: string) =>
    api.post<MerchantTicketDetail['messages'][number]>(`/merchant/support/tickets/${id}/messages`, { body }),

  // Notifications
  notifications: (q: Q, signal?: AbortSignal) => api.getList<MerchantNotification>('/merchant/notifications', q, signal),
  markNotificationRead: (id: string) => api.post<{ read: boolean }>(`/merchant/notifications/${id}/read`),

  // Profile / settings
  profile: (signal?: AbortSignal) => api.get<MerchantProfile>('/merchant/profile', undefined, signal),
  updateProfile: (body: unknown) => api.patch<MerchantProfile>('/merchant/profile', body),
  settings: (q?: Q, signal?: AbortSignal) => api.get<BusinessSettings>('/merchant/settings', q, signal),
  updateSettings: (body: unknown) => api.patch<BusinessSettings>('/merchant/settings', body),
};

/** Builds an absolute CSV download URL for a merchant export resource. */
export function exportUrl(resource: string, q: Q = {}): string {
  const qs = new URLSearchParams({ resource });
  for (const [k, v] of Object.entries(q)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  }
  return `${apiBaseUrl}/api/v1/merchant/export?${qs.toString()}`;
}

export type { Paginated };
