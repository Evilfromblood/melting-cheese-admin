import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Melting Cheese POS & Kitchen Admin',
  description: 'Ultra-simple standalone Kitchen POS & Order Management for Melting Cheese Bhadohi',
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0c0d10] text-[#f4f4f6] antialiased selection:bg-amber-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}
