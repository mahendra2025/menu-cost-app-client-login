'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { syncDishCostItemsFromServer } from '../../lib/dishCostMaster';
import { getSession, logout, refreshSessionFromClient } from '../../lib/store';
import type { Session } from '../../lib/types';

const clientNav = [
  { href: '/app/event', label: 'Event', description: 'Event and menu', mark: '1' },
  { href: '/app/menu', label: 'Menu', description: 'Review dishes', mark: '2' },
  { href: '/app/manpower', label: 'Manpower', description: 'Plan the team', mark: '3' },
  { href: '/app/cost', label: 'Cost', description: 'Calculate price', mark: '4' },
  { href: '/app/pdf', label: 'Quotation', description: 'Print and export', mark: '5' },
  { href: '/app/profile', label: 'Profile', description: 'Business settings', mark: '6' },
];

const adminNav = [
  { href: '/admin/users', label: 'Clients', description: 'Accounts and access', mark: 'C' },
  { href: '/admin/dishes', label: 'Dish catalog', description: 'Dishes and rates', mark: 'D' },
  { href: '/admin/recipes', label: 'Recipe studio', description: 'Ingredients and yield', mark: 'R' },
  { href: '/app/profile', label: 'Profile', description: 'Workspace settings', mark: 'P' },
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
  const activeIndex = Math.max(0, nav.findIndex((item) => item.href === pathname));
  const isAdmin = session?.role === 'ADMIN';
  const progress = isAdmin ? 100 : ((activeIndex + 1) / clientNav.length) * 100;

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
        <Link href={isAdmin ? '/admin/users' : '/app/event'} className="brand-chip">
          <span className="brand-logo">MC</span>
          <span className="brand-copy">
            <b>Menu Cost</b>
            <small>{session?.businessName}</small>
          </span>
        </Link>
        <div className="topbar-actions">
          <span className={`account-status ${session?.status === 'ACTIVE' ? 'active' : ''}`}>
            <i aria-hidden="true" />
            {isAdmin ? 'Admin' : session?.status === 'ACTIVE' ? 'Active' : session?.status}
          </span>
          <button
            className="ghost-button logout-button"
            aria-label="Log out of Menu Cost"
            onClick={() => {
              logout();
              void fetch('/api/client/session', { method: 'DELETE' });
              router.replace('/login');
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="app-layout">
        <aside className="app-sidebar no-print">
          <div className="sidebar-heading">
            <span>{isAdmin ? 'Admin workspace' : 'Quotation workflow'}</span>
            <b>{isAdmin ? 'Manage your catalog' : `Step ${activeIndex + 1} of ${clientNav.length}`}</b>
          </div>
          <nav className="sidebar-nav" aria-label={isAdmin ? 'Admin navigation' : 'Quotation workflow'}>
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={pathname === item.href ? 'active' : ''}
                aria-current={pathname === item.href ? 'page' : undefined}
              >
                <span className="nav-mark" aria-hidden="true">{item.mark}</span>
                <span className="nav-copy">
                  <b>{item.label}</b>
                  <small>{item.description}</small>
                </span>
              </Link>
            ))}
          </nav>
          <div className="sidebar-support">
            <span>Need a clean estimate?</span>
            <p>Complete each step in order. Your work saves automatically.</p>
          </div>
        </aside>

        <div className="app-workspace">
          {session?.status === 'EXPIRED' && session.role === 'CLIENT' ? (
            <div className="alert-card no-print">
              <b>Plan expired.</b> Upload, cost and PDF are locked. Renew ₹999/month from admin to continue.
            </div>
          ) : null}

          <section className="page-title no-print">
            <div>
              <span className="page-eyebrow">{isAdmin ? 'Menu Cost Admin' : 'Catering workspace'}</span>
              <h1>{title}</h1>
              <p>{subtitle ?? 'Plan, price and present every event with confidence.'}</p>
            </div>
            <div className="page-progress" aria-label={isAdmin ? 'Admin workspace' : `Step ${activeIndex + 1} of ${clientNav.length}`}>
              <span>{isAdmin ? 'Workspace' : `${activeIndex + 1}/${clientNav.length}`}</span>
              <div><i style={{ width: `${progress}%` }} /></div>
            </div>
          </section>

          {children}
        </div>
      </div>

      <nav className="bottom-nav no-print" aria-label={isAdmin ? 'Admin navigation' : 'Quotation workflow'}>
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={pathname === item.href ? 'active' : ''}
            aria-current={pathname === item.href ? 'page' : undefined}
          >
            <span className="nav-mark" aria-hidden="true">{item.mark}</span>
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
