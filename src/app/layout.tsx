import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Nabora — Hyperlocal Workforce Marketplace',
    template: '%s | Nabora',
  },
  description:
    'Find skilled event staff, photographers, promoters, and gig workers near you. Nabora connects employers and workers across Ahmedabad and beyond.',
  keywords: ['gig work', 'event staff', 'promoters', 'photographers', 'Ahmedabad', 'workforce marketplace'],
  metadataBase: new URL('https://nabora.in'),
  openGraph: {
    type: 'website',
    siteName: 'Nabora',
    locale: 'en_IN',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};

import Providers from './providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
