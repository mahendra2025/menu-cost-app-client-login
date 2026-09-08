'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { getSession, logout, refreshSessionFromClient } from '../../lib/store';
import type { Session } from '../../lib/types';
import FreeUsageMeter from './FreeUsageMeter';

type NavIcon = 'profile' | 'clients' | 'dishes' | 'ingredients';

const adminNav = [
  { href: '/admin/users', label: 'Clients', mobileLabel: 'Clients', description: 'Accounts and access', icon: 'clients' as NavIcon },
  { href: '/admin/dishes', label: 'Dishes', mobileLabel: 'Dishes', description: 'Dish catalog and rates', icon: 'dishes' as NavIcon },
  { href: '/admin/recipes', label: 'Recipes', mobileLabel: 'Recipes', description: 'Ingredients and recipe costing', icon: 'dishes' as NavIcon },
  { href: '/admin/ingredients', label: 'Ingredients', mobileLabel: 'Items', description: 'Categories and rates', icon: 'ingredients' as NavIcon },
  { href: '/app/profile', label: 'Profile', mobileLabel: 'Profile', description: 'Workspace settings', icon: 'profile' as NavIcon },
];

let cachedShellSession: Session | null = null;

function NavIconMark({ icon }: { icon: NavIcon }) {
  const paths: Record<NavIcon, ReactNode> = {
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
  const [session, setSession] = useState<Session | null>(() => cachedShellSession);
  const [ready, setReady] = useState(() => cachedShellSession !== null);

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

  const isAdmin = session?.role === 'ADMIN';
  const isAdminNavItemActive = (href: string) => pathname === href;

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

      <div className="app-layout" style={!isAdmin ? { display: 'block' } : undefined}>
        {isAdmin ? (
          <aside className="app-sidebar no-print">
            <div className="sidebar-heading">
              <span>Admin workspace</span>
              <b>Manage your catalog</b>
            </div>

            <nav className="sidebar-nav" aria-label="Admin navigation">
              {adminNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={isAdminNavItemActive(item.href) ? 'active' : ''}
                  aria-current={isAdminNavItemActive(item.href) ? 'page' : undefined}
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
              <span>Catalog workspace</span>
              <p>Review dish names, categories and rates before saving changes.</p>
            </div>
          </aside>
        ) : null}

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

              {isAdmin ? (
                <div className="page-progress" aria-label="Admin workspace">
                  <span>Workspace</span>
                  <div><i style={{ width: '100%' }} /></div>
                </div>
              ) : null}
            </section>
          ) : null}

          {children}
        </div>
      </div>

      {isAdmin ? (
        <nav className="bottom-nav no-print" aria-label="Admin navigation">
          {adminNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isAdminNavItemActive(item.href) ? 'active' : ''}
              aria-current={isAdminNavItemActive(item.href) ? 'page' : undefined}
            >
              <NavIconMark icon={item.icon} />
              <small>{item.mobileLabel}</small>
            </Link>
          ))}
        </nav>
      ) : null}
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
