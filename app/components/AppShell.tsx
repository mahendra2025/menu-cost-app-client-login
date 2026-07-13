'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { syncDishCostItemsFromServer } from '../../lib/dishCostMaster';
import { getSession, logout, refreshSessionFromClient } from '../../lib/store';
import type { Session } from '../../lib/types';

const clientNav = [
  { href: '/app/event', label: 'Event', icon: '📄' },
  { href: '/app/menu', label: 'Menu', icon: '🍽️' },
  { href: '/app/cost', label: 'Cost', icon: '₹' },
  { href: '/app/pdf', label: 'PDF', icon: '🧾' },
  { href: '/app/profile', label: 'Profile', icon: '👤' },
];

const adminNav = [
  { href: '/admin/users', label: 'Users', icon: '👥' },
  { href: '/admin/dishes', label: 'Dishes', icon: '🍽️' },
  { href: '/admin/recipes', label: 'Recipes', icon: '🧮' },
  { href: '/app/profile', label: 'Profile', icon: '👤' },
];

export default function AppShell({ children, title, subtitle }: { children: ReactNode; title: string; subtitle?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const current = refreshSessionFromClient() ?? getSession();
    if (!current) {
      router.replace('/login');
      return;
    }
    setSession(current);
    setReady(true);
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    void syncDishCostItemsFromServer();
  }, [ready]);

  const nav = useMemo(() => (session?.role === 'ADMIN' ? adminNav : clientNav), [session]);

  if (!ready) {
    return (
      <main className="page-shell center-screen">
        <div className="loader-card">Opening Menu Cost App...</div>
      </main>
    );
  }

  return (
    <main className="page-shell app-frame">
      <header className="topbar no-print">
        <Link href={session?.role === 'ADMIN' ? '/admin/users' : '/app/event'} className="brand-chip">
          <span className="brand-logo">MC</span>
          <span>
            <b>Menu Cost</b>
            <small>{session?.businessName}</small>
          </span>
        </Link>
        <button
          className="ghost-button logout-button"
          aria-label="Log out of Menu Cost"
          onClick={() => {
            logout();
            router.replace('/login');
          }}
        >
          Logout
        </button>
      </header>

      {session?.status === 'EXPIRED' && session.role === 'CLIENT' ? (
        <div className="alert-card no-print">
          <b>Plan expired.</b> Upload, cost and PDF are locked. Renew ₹999/month from admin to continue.
        </div>
      ) : null}

      <section className="page-title no-print">
        <p>{subtitle ?? 'Apple-style clean workflow for caterers'}</p>
        <h1>{title}</h1>
      </section>

      {children}

      <nav className="bottom-nav no-print">
        {nav.map((item) => (
          <Link key={item.href} href={item.href} className={pathname === item.href ? 'active' : ''} aria-current={pathname === item.href ? 'page' : undefined}>
            <span aria-hidden="true">{item.icon}</span>
            <small>{item.label}</small>
          </Link>
        ))}
      </nav>
    </main>
  );
}

export function LockedCard() {
  return (
    <div className="locked-card">
      <h2>App locked</h2>
      <p>Your plan is expired. Only Profile and Logout are available until renewal.</p>
      <Link href="/app/profile" className="primary-button">Open Profile</Link>
    </div>
  );
}
