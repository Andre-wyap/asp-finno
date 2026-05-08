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
  title: 'Allianz Shield Plus',
  description:
    'Comprehensive personal accident coverage with 19 primary benefits — renewable up to age 80.'
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
