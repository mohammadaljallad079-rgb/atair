import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3004').replace(/\/$/, '');

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'عَ الطاير — توصيل سريع ونقل داخلي | Al-Tayer',
    template: '%s | عَ الطاير',
  },
  description:
    'منصة عَ الطاير للتوصيل للميل الأخير والنقل الداخلي: أسعار واضحة، تتبّع لحظي، وأسطول موثوق. Al-Tayer last-mile delivery and internal transport platform.',
  applicationName: 'عَ الطاير',
  keywords: ['توصيل', 'الرياض', 'توصيل سريع', 'نقل داخلي', 'تتبع الطلبات', 'Al-Tayer', 'last-mile delivery', 'Riyadh'],
  alternates: {
    canonical: '/',
    languages: { ar: '/', en: '/' },
  },
  openGraph: {
    type: 'website',
    siteName: 'عَ الطاير',
    title: 'عَ الطاير — توصيل سريع ونقل داخلي',
    description: 'أسعار واضحة، تتبّع لحظي، وأسطول موثوق للتوصيل والنقل الداخلي.',
    locale: 'ar_SA',
    alternateLocale: ['en_US'],
    url: '/',
    images: [{ url: '/assets/brand/logo-full.png', width: 519, height: 530, alt: 'عَ الطاير' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'عَ الطاير — توصيل سريع ونقل داخلي',
    description: 'أسعار واضحة، تتبّع لحظي، وأسطول موثوق.',
    images: ['/assets/brand/logo-full.png'],
  },
  robots: { index: true, follow: true },
  icons: {
    icon: '/favicon-32.png',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#ea580c',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <Providers>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:start-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-ink-700 focus:px-3 focus:py-2 focus:text-sm focus:text-white"
          >
            {`تخطَّ إلى المحتوى`}
          </a>
          <Navbar />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
