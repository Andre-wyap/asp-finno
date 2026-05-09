import type { Metadata } from 'next';
import { Manrope, Plus_Jakarta_Sans } from 'next/font/google';
import { Navbar } from '../components/Navbar';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap'
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap'
});

export const metadata: Metadata = {
  title: {
    default: 'Allianz Shield Plus — Personal Accident Insurance',
    template: '%s — Allianz Shield Plus',
  },
  description:
    'Comprehensive personal accident coverage with 19 primary benefits — renewable up to age 80. Distributed by WF Wealth Management, powered by Allianz Malaysia.',
  keywords: ['personal accident insurance', 'Allianz Shield Plus', 'WF Wealth Management', 'Malaysia insurance', 'PA insurance'],
  authors: [{ name: 'WF Wealth Management' }],
  metadataBase: new URL('https://asp.finnomalaysia.com'),
  openGraph: {
    type: 'website',
    locale: 'en_MY',
    url: 'https://asp.finnomalaysia.com',
    siteName: 'Allianz Shield Plus',
    title: 'Allianz Shield Plus — Personal Accident Insurance',
    description:
      'Comprehensive personal accident coverage with 19 primary benefits — renewable up to age 80. Distributed by WF Wealth Management.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Allianz Shield Plus — Personal Accident Insurance',
    description:
      'Comprehensive personal accident coverage with 19 primary benefits — renewable up to age 80.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.variable} ${plusJakartaSans.variable}`}>
      <body className="font-sans">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
