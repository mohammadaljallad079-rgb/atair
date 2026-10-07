'use client';

import Link from 'next/link';
import { useI18n } from '@/i18n/provider';
import { useSetting } from '@/lib/site-provider';
import { BrandLogo } from '@/components/brand/brand-logo';
import { ADMIN_URL, MERCHANT_URL, CUSTOMER_URL } from './navbar';

export function Footer() {
  const { t } = useI18n();
  const companyName = useSetting('website.companyName', t('app.name'));
  const phone = useSetting('website.contactPhone', '');
  const email = useSetting('website.contactEmail', '');
  const address = useSetting('website.contactAddress', '');
  const social = useSetting('website.socialLinks', {});

  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-slate-200 bg-slate-50">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <BrandLogo variant="navigation" subtitle={t('app.tagline')} />
          <p className="mt-3 max-w-xs text-sm text-slate-500">{t('home.features.subtitle')}</p>
        </div>

        <nav aria-label={t('footer.quickLinks')}>
          <h2 className="mb-3 text-sm font-semibold text-slate-800">{t('footer.quickLinks')}</h2>
          <ul className="space-y-2 text-sm text-slate-600">
            <li><Link className="hover:text-brand-700" href="/services">{t('nav.services')}</Link></li>
            <li><Link className="hover:text-brand-700" href="/business">{t('nav.business')}</Link></li>
            <li><Link className="hover:text-brand-700" href="/track">{t('nav.track')}</Link></li>
            <li><Link className="hover:text-brand-700" href="/drivers">{t('nav.drivers')}</Link></li>
          </ul>
        </nav>

        <nav aria-label={t('footer.legal')}>
          <h2 className="mb-3 text-sm font-semibold text-slate-800">{t('footer.legal')}</h2>
          <ul className="space-y-2 text-sm text-slate-600">
            <li><Link className="hover:text-brand-700" href="/legal">{t('legal.title')}</Link></li>
            <li><Link className="hover:text-brand-700" href="/faq">{t('nav.faq')}</Link></li>
            <li><Link className="hover:text-brand-700" href="/about">{t('nav.about')}</Link></li>
            <li><Link className="hover:text-brand-700" href="/contact">{t('nav.contact')}</Link></li>
          </ul>
        </nav>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-800">{t('footer.contact')}</h2>
          <ul className="space-y-2 text-sm text-slate-600">
            {phone && <li><a className="hover:text-brand-700" href={`tel:${phone.replace(/\s/g, '')}`} dir="ltr">{phone}</a></li>}
            {email && <li><a className="hover:text-brand-700" href={`mailto:${email}`} dir="ltr">{email}</a></li>}
            {address && <li>{address}</li>}
          </ul>
          {(social.twitter || social.instagram || social.linkedin) && (
            <ul className="mt-3 flex gap-3 text-sm">
              {social.twitter && <li><a className="hover:text-brand-700" href={social.twitter} rel="noopener noreferrer">Twitter</a></li>}
              {social.instagram && <li><a className="hover:text-brand-700" href={social.instagram} rel="noopener noreferrer">Instagram</a></li>}
              {social.linkedin && <li><a className="hover:text-brand-700" href={social.linkedin} rel="noopener noreferrer">LinkedIn</a></li>}
            </ul>
          )}
        </div>
      </div>

      <div className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-slate-500 sm:flex-row">
          <p>© {year} {companyName} — {t('footer.rights')}</p>
          <ul className="flex flex-wrap items-center gap-3">
            <li><a className="hover:text-brand-700" href={CUSTOMER_URL}>{t('nav.login')}</a></li>
            <li><a className="hover:text-brand-700" href={MERCHANT_URL}>{t('nav.business')}</a></li>
            <li><a className="hover:text-brand-700" href={ADMIN_URL}>{t('app.tagline')}</a></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
