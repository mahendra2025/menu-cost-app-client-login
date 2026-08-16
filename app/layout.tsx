import type { Metadata, Viewport } from 'next';
import PwaRegister from './components/PwaRegister';
import ProductAnalyticsTracker from './components/ProductAnalyticsTracker';
import AdminPerformanceBootstrap from './components/AdminPerformanceBootstrap';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://menu-costing.com'),
  title: 'Menu Costing App',
  description: 'Client login based menu costing app for caterers',
  applicationName: 'Menu Costing App',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Menu Costing',
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
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
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
    <html lang="en-IN" data-theme="dark" data-scroll-behavior="smooth">
      <body>
        {children}
        <AdminPerformanceBootstrap />
        <ProductAnalyticsTracker />
        <PwaRegister />
      </body>
    </html>
  );
}
