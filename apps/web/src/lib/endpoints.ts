import { publicApi } from './api';

export interface ServiceArea {
  name: string;
  code: string;
  centerLat: number | null;
  centerLng: number | null;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface SiteSettings {
  'website.enabled'?: boolean;
  'website.companyName'?: string;
  'website.heroTitle'?: string;
  'website.heroSubtitle'?: string;
  'website.aboutBody'?: string;
  'website.contactPhone'?: string;
  'website.contactEmail'?: string;
  'website.contactAddress'?: string;
  'website.contactHours'?: string;
  'website.socialLinks'?: { twitter?: string; instagram?: string; linkedin?: string };
  'website.seoTitle'?: string;
  'website.seoDescription'?: string;
  'website.vatNumber'?: string;
  'website.crn'?: string;
  'website.faq'?: FaqItem[];
  'website.maintenanceNotice'?: string;
}

export interface SiteResponse {
  tenant: { name: string; slug: string } | null;
  settings: SiteSettings;
  serviceAreas: ServiceArea[];
}

export interface TrackingSnapshot {
  orderNumber: string;
  status: string;
  milestone: string;
  pickupAddress: string;
  dropoffAddress: string;
  driverName: string | null;
  driverLocation: { latitude: number; longitude: number; recordedAt: string } | null;
  updatedAt: string;
  deliveredAt: string | null;
  cancelledAt: string | null;
}

export interface ContactResponse {
  received: boolean;
  ticketId: string;
}

/** The only backend paths the public website is allowed to call. */
export const endpoints = {
  site: (tenant?: string, signal?: AbortSignal) =>
    publicApi.get<SiteResponse>('/public/site', tenant ? { tenant } : undefined, signal),
  track: (code: string, signal?: AbortSignal) =>
    publicApi.get<TrackingSnapshot>(`/public/track/${encodeURIComponent(code)}`, undefined, signal),
  contact: (body: unknown, tenant?: string) =>
    publicApi.post<ContactResponse>('/public/contact', body, tenant ? { tenant } : undefined),
};
