import type { MetadataRoute } from 'next';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3004').replace(/\/$/, '');

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/services', '/customers', '/business', '/track', '/about', '/contact', '/faq', '/legal', '/drivers'];
  const now = new Date();
  return routes.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === '' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : 0.7,
    alternates: { languages: { ar: `${SITE_URL}${path}`, en: `${SITE_URL}${path}` } },
  }));
}
