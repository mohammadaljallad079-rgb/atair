import { api } from './api';
import type {
  AuthConfig, CustomerAddress, CustomerMe, CustomerNotification, CustomerOrderDetail,
  CustomerOrderListItem, CustomerTicket, CustomerTicketDetail, LoginResponse, Paginated,
  PriceQuote, ServiceArea, TrackingSnapshot,
} from './types';

type Q = Record<string, unknown>;

/**
 * Typed endpoint map for the Customer Application API (/api/v1/customer/*).
 * This is the only place customer API paths are declared.
 */
export const endpoints = {
  // Auth (shared login/refresh; registration is customer-specific)
  authConfig: (signal?: AbortSignal) => api.get<AuthConfig>('/customer/auth/config', undefined, signal),
  register: (body: { fullName: string; phone: string; email?: string; password: string; tenantSlug?: string }) =>
    api.post<LoginResponse>('/customer/auth/register', body),
  login: (identifier: string, password: string, tenantSlug?: string) =>
    api.post<LoginResponse>('/auth/login', { identifier, password, tenantSlug }),
  logout: () => api.post<{ loggedOut: boolean }>('/auth/logout'),
  me: (signal?: AbortSignal) => api.get<CustomerMe>('/customer/me', undefined, signal),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<{ changed: boolean }>('/auth/change-password', { currentPassword, newPassword }),

  // Profile
  profile: (signal?: AbortSignal) => api.get<CustomerMe>('/customer/profile', undefined, signal),
  updateProfile: (body: unknown) => api.patch<CustomerMe>('/customer/profile', body),

  // Addresses
  addresses: (signal?: AbortSignal) => api.get<CustomerAddress[]>('/customer/addresses', undefined, signal),
  addAddress: (body: unknown) => api.post<CustomerAddress>('/customer/addresses', body),
  updateAddress: (id: string, body: unknown) => api.patch<CustomerAddress>(`/customer/addresses/${id}`, body),
  deleteAddress: (id: string) => api.delete<{ deleted: boolean }>(`/customer/addresses/${id}`),

  // Service areas (real configured zones)
  serviceAreas: (signal?: AbortSignal) => api.get<ServiceArea[]>('/customer/service-areas', undefined, signal),

  // Orders
  orders: (q: Q, signal?: AbortSignal) => api.getList<CustomerOrderListItem>('/customer/orders', q, signal),
  order: (id: string, signal?: AbortSignal) => api.get<CustomerOrderDetail>(`/customer/orders/${id}`, undefined, signal),
  orderTimeline: (id: string, signal?: AbortSignal) => api.get<CustomerOrderDetail['statusHistory']>(`/customer/orders/${id}/timeline`, undefined, signal),
  orderTracking: (id: string, signal?: AbortSignal) => api.get<TrackingSnapshot>(`/customer/orders/${id}/tracking`, undefined, signal),
  quote: (body: unknown) => api.post<PriceQuote>('/customer/orders/quote', body),
  createOrder: (body: unknown) => api.post<CustomerOrderDetail>('/customer/orders', body),
  cancelOrder: (id: string, reason?: string) =>
    api.post<CustomerOrderDetail>(`/customer/orders/${id}/cancel`, { reason }),

  // Notifications
  notifications: (q: Q, signal?: AbortSignal) => api.getList<CustomerNotification>('/customer/notifications', q, signal),
  markNotificationRead: (id: string) => api.post<{ read: boolean }>(`/customer/notifications/${id}/read`),

  // Support
  tickets: (q: Q, signal?: AbortSignal) => api.getList<CustomerTicket>('/customer/support/tickets', q, signal),
  ticket: (id: string, signal?: AbortSignal) => api.get<CustomerTicketDetail>(`/customer/support/tickets/${id}`, undefined, signal),
  createTicket: (body: unknown) => api.post<CustomerTicket>('/customer/support/tickets', body),
  addTicketMessage: (id: string, body: string) =>
    api.post<CustomerTicketDetail['messages'][number]>(`/customer/support/tickets/${id}/messages`, { body }),
};

export type { Paginated };
