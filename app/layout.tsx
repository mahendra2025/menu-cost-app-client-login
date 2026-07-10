import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Menu Cost App',
  description: 'Client login based menu costing app for caterers',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
