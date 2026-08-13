'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { getSession, logout, refreshSessionFromClient } from '../../lib/store';
import type { Session } from '../../lib/types';
import FreeUsageMeter from './FreeUsageMeter';

type NavIcon = 'event' | 'team' | 'extras' | 'cost' | 'final' | 'profile' | 'clients' | 'dishes' | 'ingredients';

const clientNav = [
  { href: '/app/event', label: 'Event', mobileLabel: 'Event', description: 'Event and menu', icon: 'event' as NavIcon },
  { href: '/app/manpower', label: 'Manpower', mobileLabel: 'Team', description: 'Plan the team', icon: 'team' as NavIcon },
  { href: '/app/extra-cost', label: 'Extra Cost', mobileLabel: 'Extras', description: 'Transport and supplies', icon: 'extras' as NavIcon },
  { href: '/app/cost', label: 'Cost', mobileLabel: 'Cost', description: 'Calculate price', icon: 'cost' as NavIcon },
  { href: '/app/final-costing', label: 'Final Costing', mobileLabel: 'Final', description: 'Price and profit', icon: 'final' as NavIcon },
  { href: '/app/profile', label: 'Profile', mobileLabel: 'Profile', description: 'Business settings', icon: 'profile' as NavIcon },
];

const adminNav = [
  { href: '/admin/users', label: 'Clients', mobileLabel: 'Clients', description: 'Accounts and access', icon: 'clients' as NavIcon },
  { href: '/admin/new-dishes', label: 'New dishes', mobileLabel: 'New', description: 'Review uploaded dishes', icon: 'dishes' as NavIcon },
  { href: '/admin/dishes', label: 'Dishes & recipes', mobileLabel: 'Dishes', description: 'Catalog, rates and recipes', icon: 'dishes' as NavIcon },
  { href: '/admin/ingredients', label: 'Ingredients', mobileLabel: 'Items', description: 'Categories and rates', icon: 'ingredients' as NavIcon },
  { href: '/app/profile', label: 'Profile', mobileLabel: 'Profile', description: 'Workspace settings', icon: 'profile' as NavIcon },
];

let cachedShellSession: Session | null = null;

function NavIconMark({ icon }: { icon: NavIcon }) {
  const paths: Record<NavIcon, ReactNode> = {
    event: <><path d="M4 6.5h16v13H4z"/><path d="M8 3.5v5M16 3.5v5M4 10.5h16"/></>,
    team: <><circle cx="9" cy="8" r="3"/><path d="M3.5 19c.4-3.4 2.2-5.2 5.5-5.2s5.1 1.8 5.5 5.2M15 5.5a3 3 0 0 1 0 5.8M16 14c2.6.3 4 2 4.3 5"/></>,
    extras: <><path d="M4 8h16l-1.3 11H5.3zM8 8a4 4 0 0 1 8 0"/><path d="M9 13h6"/></>,
    cost: <><circle cx="12" cy="12" r="8.5"/><path d="M14.8 8.8c-.7-.6-1.6-.9-2.8-.9-1.5 0-2.6.7-2.6 1.8 0 2.8 5.7 1.1 5.7 4.2 0 1.2-1.1 2.1-3 2.1-1.2 0-2.3-.4-3.1-1.1M12 6.4v11.2"/></>,
    final: <><path d="M5 3.5h14v17H5z"/><path d="m8.5 12 2.2 2.2 4.8-5M8.5 17h7"/></>,
    profile: <><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.5-4.2 2.8-6.3 7-6.3s6.5 2.1 7 6.3"/></>,
    clients: <><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3.5 19c.4-3.4 2.2-5.2 5.5-5.2s5.1 1.8 5.5 5.2M15 14c3 .1 4.7 1.8 5 5"/></>,
    dishes: <><path d="M4 16.5h16M6.5 16.5a5.5 5.5 0 0 1 11 0M12 8V5.5"/><path d="M3 20h18"/></>,
    ingredients: <><path d="M8 4h8l1 4v12H7V8zM7 8h10"/><path d="M10 12h4"/></>,
  };

  return (
    <span className="nav-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {paths[icon]}
      </svg>
    </span>
  );
}

export default function AppShell({
  children,
  title,
  subtitle,
  hidePageTitle = false,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  hidePageTitle?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(
    () => cachedShellSession,
  );
  const [ready, setReady] = useState(
    () => cachedShellSession !== null,
  );

  useEffect(() => {
    const current = refreshSessionFromClient() ?? getSession();
    if (!current) {
      cachedShellSession = null;
      router.replace('/login');
      return;
    }
    cachedShellSession = current;
    setSession(current);
    setReady(true);
  }, [router]);

  const nav = useMemo(() => (session?.role === 'ADMIN' ? adminNav : clientNav), [session]);
  const isAdmin = session?.role === 'ADMIN';
  const isIngredientIndex = !isAdmin && pathname === '/app/ingredients';
  const isHistory = !isAdmin && pathname === '/app/history';
  const directActiveIndex = nav.findIndex((item) => item.href === pathname);
  const profileIndex = nav.findIndex((item) => item.href === '/app/profile');
  const activeIndex = directActiveIndex >= 0
    ? directActiveIndex
    : isIngredientIndex && profileIndex >= 0
      ? profileIndex
      : 0;
  const activeItem = isHistory
    ? { mobileLabel: 'History' }
    : isIngredientIndex
      ? { mobileLabel: 'Ingredients' }
      : nav[activeIndex];
  const progress = isAdmin ? 100 : ((activeIndex + 1) / clientNav.length) * 100;

  if (!ready) {
    return (
      <main className="page-shell center-screen">
        <div className="loader-card">Opening Menu Costing App...</div>
      </main>
    );
  }

  return (
    <main className={`page-shell app-frame admin-theme ${isAdmin ? 'admin-workspace-shell' : 'client-theme'}`}>
      <header className="topbar no-print">
        <Link href={isAdmin ? '/admin/users' : '/app/event'} className="brand-chip">
          <span className="brand-logo">MC</span>
          <span className="brand-copy">
            <b>Menu Costing</b>
            <small>{session?.businessName}</small>
          </span>
        </Link>
        <div className="topbar-actions">
          {!isAdmin ? <Link href="/app/history" className="ghost-button history-shortcut">History</Link> : null}
          <span className="mobile-page-context" aria-hidden="true">{activeItem?.mobileLabel}</span>
          <span className={`account-status ${session?.status === 'ACTIVE' ? 'active' : ''}`}>
            <i aria-hidden="true" />
            {isAdmin ? 'Admin' : session?.status === 'ACTIVE' ? 'Active' : session?.status}
          </span>
          <button
            className="ghost-button logout-button"
            aria-label="Log out of Menu Costing"
            onClick={() => {
              cachedShellSession = null;
              logout();
              void fetch('/api/client/session', { method: 'DELETE' });
              router.replace('/login');
            }}
          >
            <svg className="logout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 8l4 4-4 4M18 12H8" />
              <path d="M11 5H5v14h6" />
            </svg>
            <span>Sign out</span>
          </button>
        </div>
      </header>

      <div className="app-layout">
        <aside className="app-sidebar no-print">
          <div className="sidebar-heading">
            <span>{isAdmin ? 'Admin workspace' : 'Costing workflow'}</span>
            <b>{isAdmin ? 'Manage your catalog' : `Step ${activeIndex + 1} of ${clientNav.length}`}</b>
          </div>
          <nav className="sidebar-nav" aria-label={isAdmin ? 'Admin navigation' : 'Costing workflow'}>
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={pathname === item.href || (isIngredientIndex && item.href === '/app/profile') ? 'active' : ''}
                aria-current={pathname === item.href || (isIngredientIndex && item.href === '/app/profile') ? 'page' : undefined}
              >
                <NavIconMark icon={item.icon} />
                <span className="nav-copy">
                  <b>{item.label}</b>
                  <small>{item.description}</small>
                </span>
              </Link>
            ))}
          </nav>
          <div className="sidebar-support">
            <span>{session?.role === 'ADMIN' ? 'Catalog workspace' : 'Need a clean estimate?'}</span>
            <p>{session?.role === 'ADMIN' ? 'Review dish names, categories and rates before saving changes.' : 'Complete each step in order. Your work saves automatically.'}</p>
          </div>
        </aside>

        <div className="app-workspace">
          {!isAdmin ? <FreeUsageMeter /> : null}

          {session?.status === 'EXPIRED' && session.role === 'CLIENT' ? (
            <div className="alert-card no-print">
              <b>Plan expired.</b> Upload, cost and final costing are locked. Renew ₹999/month from admin to continue.
            </div>
          ) : null}

          {!hidePageTitle ? (
            <section className="page-title no-print">
              <div>
                <span className="page-eyebrow">{isAdmin ? 'Menu Costing Admin' : 'Catering workspace'}</span>
                <h1>{title}</h1>
                <p>{subtitle ?? 'Plan, price and present every event with confidence.'}</p>
              </div>
              <div className="page-progress" aria-label={isAdmin ? 'Admin workspace' : `Step ${activeIndex + 1} of ${clientNav.length}`}>
                <span>{isAdmin ? 'Workspace' : `${activeIndex + 1}/${clientNav.length}`}</span>
                <div><i style={{ width: `${progress}%` }} /></div>
              </div>
            </section>
          ) : null}

          {children}
        </div>
      </div>

      <nav className="bottom-nav no-print" aria-label={isAdmin ? 'Admin navigation' : 'Costing workflow'}>
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={pathname === item.href || (isIngredientIndex && item.href === '/app/profile') ? 'active' : ''}
            aria-current={pathname === item.href || (isIngredientIndex && item.href === '/app/profile') ? 'page' : undefined}
          >
            <NavIconMark icon={item.icon} />
            <small>{item.mobileLabel}</small>
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
