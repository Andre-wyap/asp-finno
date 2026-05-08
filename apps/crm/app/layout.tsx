import type { Metadata } from 'next';
import { Manrope, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const manrope = Manrope({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap'
});

export const metadata: Metadata = {
  title: 'Allianz Shield Plus — CRM',
  description: 'Admin portal for Allianz Shield Plus applications'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${plusJakartaSans.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
