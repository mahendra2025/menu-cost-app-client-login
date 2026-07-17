import type { Metadata, Viewport } from 'next';
import PwaRegister from './components/PwaRegister';
import './globals.css';

export const metadata: Metadata = {
  title: 'Menu Cost App',
  description: 'Client login based menu costing app for caterers',
  applicationName: 'Menu Cost App',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Menu Cost',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#111827',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
  <html lang="en" data-theme="dark">
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
