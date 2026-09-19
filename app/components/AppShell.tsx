'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { getSession, logout, refreshSessionFromClient } from '../../lib/store';
import type { Session } from '../../lib/types';
import { useLanguage } from './LanguageProvider';

type NavIcon = 'profile' | 'clients' | 'dishes' | 'ingredients';
type ClientNavIcon = 'event' | 'team' | 'expenses' | 'pricing' | 'more';

type ClientFlowStep = {
  step: number;
  label: string;
};

function clientFlowForPath(pathname: string): ClientFlowStep | null {
  if (
    pathname === '/app/event' ||
    pathname === '/app/cost' ||
    pathname === '/app/grocery'
  ) {
    return { step: 1, label: 'Event & Menu' };
  }

  if (pathname === '/app/manpower') {
    return { step: 2, label: 'Team' };
  }

  if (
    pathname === '/app/operations' ||
    pathname === '/app/disposable'
  ) {
    return { step: 3, label: 'Expenses' };
  }

  if (pathname === '/app/final-costing') {
    return { step: 4, label: 'Pricing' };
  }

  if (pathname === '/app/quotation') {
    return { step: 5, label: 'Quotation' };
  }

  return null;
}

const adminNav = [
  { href: '/admin/users', label: 'Clients', mobileLabel: 'Clients', description: 'Accounts and access', icon: 'clients' as NavIcon },
  { href: '/admin/dishes', label: 'Dishes', mobileLabel: 'Dishes', description: 'Dish catalog and rates', icon: 'dishes' as NavIcon },
  { href: '/admin/recipes', label: 'Recipes', mobileLabel: 'Recipes', description: 'Ingredients and recipe costing', icon: 'dishes' as NavIcon },
  { href: '/admin/ingredients', label: 'Ingredients', mobileLabel: 'Items', description: 'Categories and rates', icon: 'ingredients' as NavIcon },
  { href: '/app/profile', label: 'Profile', mobileLabel: 'Profile', description: 'Workspace settings', icon: 'profile' as NavIcon },
];

let cachedShellSession: Session | null = null;

function ClientNavIconMark({ icon }: { icon: ClientNavIcon }) {
  const paths: Record<ClientNavIcon, ReactNode> = {
    event: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="3" />
        <path d="M8 3v4M16 3v4M7 11h10M8 15h3" />
      </>
    ),
    team: (
      <>
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M3.5 19c.4-3.4 2.2-5.2 5.5-5.2s5.1 1.8 5.5 5.2M15 14c3 .1 4.7 1.8 5 5" />
      </>
    ),
    expenses: (
      <>
        <path d="M4 7h16v11H4zM4 10h16" />
        <path d="M8 15h3M16 14v2" />
      </>
    ),
    pricing: (
      <>
        <path d="M4 17.5V11l7-7h6l3 3v6l-7 7H6.5z" />
        <circle cx="15.5" cy="8.5" r="1.2" />
      </>
    ),
    more: (
      <>
        <circle cx="5" cy="12" r="1.4" />
        <circle cx="12" cy="12" r="1.4" />
        <circle cx="19" cy="12" r="1.4" />
      </>
    ),
  };

  return (
    <span className="client-nav-icon" aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {paths[icon]}
      </svg>
    </span>
  );
}

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
  const { language, setLanguage, t } = useLanguage();
  const [session, setSession] = useState<Session | null>(() => cachedShellSession);
  const [ready, setReady] = useState(() => cachedShellSession !== null);
  const [moreOpen, setMoreOpen] = useState(false);

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

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMoreOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    document.body.classList.add('client-sheet-open');

    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.classList.remove('client-sheet-open');
    };
  }, [moreOpen]);

  const isAdmin = session?.role === 'ADMIN';
  const isDishWorkspace =
    pathname === '/admin/dishes' ||
    pathname.startsWith('/admin/dishes/');
  const isIngredientWorkspace =
    pathname === '/admin/ingredients' ||
    pathname.startsWith('/admin/ingredients/');
  const isAdminNavItemActive = (href: string) =>
    pathname === href ||
    (href === '/admin/dishes' && isDishWorkspace) ||
    (href === '/admin/ingredients' && isIngredientWorkspace);

  const clientFlow =
    !isAdmin
      ? clientFlowForPath(pathname)
      : null;

  const clientMoreActive =
    moreOpen ||
    clientFlow?.step === 5 ||
    pathname === '/app/history' ||
    pathname === '/app/ingredients' ||
    pathname === '/app/profile';

  const signOut = () => {
    cachedShellSession = null;
    logout();
    void fetch('/api/client/session', {
      method: 'DELETE',
    });
    router.replace('/login');
  };

  if (!ready) {
    return (
      <main className="page-shell center-screen">
        <div className="loader-card">{t('Opening Menu Costing App...')}</div>
      </main>
    );
  }

  return (
    <main className={`page-shell app-frame admin-theme ${isAdmin ? 'admin-workspace-shell' : 'client-theme'}`}>
      <header className="topbar no-print">
        <Link href={isAdmin ? '/admin/users' : '/app/event?resume=1'} className="brand-chip">
          <span className="brand-logo">MC</span>
          <span className="brand-copy">
            <b>Menu Costing</b>
            <small>{session?.businessName}</small>
          </span>
        </Link>

        <div className="topbar-actions">
          {!isAdmin ? (
            <label className="app-language-select">
              <span>{t('App language')}</span>
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value === 'hi' ? 'hi' : 'en')}
                aria-label={t('App language')}
              >
                <option value="en">EN · English</option>
                <option value="hi">हिं · हिन्दी</option>
              </select>
            </label>
          ) : null}

          <span className={`account-status ${session?.status === 'ACTIVE' ? 'active' : ''}`}>
            <i aria-hidden="true" />
            {isAdmin ? 'Admin' : session?.status === 'ACTIVE' ? t('Active') : session?.status}
          </span>

          <button
            className="ghost-button logout-button"
            aria-label={t('Sign out')}
            onClick={signOut}
          >
            <svg className="logout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 8l4 4-4 4M18 12H8" />
              <path d="M11 5H5v14h6" />
            </svg>
            <span>{t('Sign out')}</span>
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
          {session?.status === 'EXPIRED' && session.role === 'CLIENT' ? (
            <div className="alert-card no-print">
              <b>Plan expired.</b> Upload, cost and final costing are locked. Renew ₹999/month from admin to continue.
            </div>
          ) : null}

          {isAdmin && !hidePageTitle ? (
            <section className="page-title no-print">
              <div>
                <span className="page-eyebrow">Menu Costing Admin</span>
                <h1>{title}</h1>
                <p>{subtitle ?? 'Plan, price and present every event with confidence.'}</p>
              </div>

              <div className="page-progress" aria-label="Admin workspace">
                <span>Workspace</span>
                <div><i style={{ width: '100%' }} /></div>
              </div>
            </section>
          ) : null}

          {isAdmin && isDishWorkspace ? (
            <nav
              className="action-row no-print"
              aria-label="Dish management"
              style={{
                justifyContent: 'flex-start',
                gap: '10px',
                marginBottom: '18px',
                flexWrap: 'wrap',
              }}
            >
              <Link
                href="/admin/dishes"
                className={
                  pathname === '/admin/dishes'
                    ? 'primary-button'
                    : 'ghost-button'
                }
                aria-current={
                  pathname === '/admin/dishes'
                    ? 'page'
                    : undefined
                }
              >
                Dish Master
              </Link>
              <Link
                href="/admin/dishes/unknown"
                className={
                  pathname === '/admin/dishes/unknown'
                    ? 'primary-button'
                    : 'ghost-button'
                }
                aria-current={
                  pathname === '/admin/dishes/unknown'
                    ? 'page'
                    : undefined
                }
              >
                Unknown Queue
              </Link>
              <Link
                href="/admin/dishes/coverage"
                className={
                  pathname === '/admin/dishes/coverage'
                    ? 'primary-button'
                    : 'ghost-button'
                }
                aria-current={
                  pathname === '/admin/dishes/coverage'
                    ? 'page'
                    : undefined
                }
              >
                Recipe Coverage
              </Link>
            </nav>
          ) : null}

          {isAdmin && isIngredientWorkspace ? (
            <nav
              className="action-row no-print"
              aria-label="Ingredient management"
              style={{
                justifyContent: 'flex-start',
                gap: '10px',
                marginBottom: '18px',
                flexWrap: 'wrap',
              }}
            >
              <Link
                href="/admin/ingredients"
                className={
                  pathname === '/admin/ingredients'
                    ? 'primary-button'
                    : 'ghost-button'
                }
                aria-current={
                  pathname === '/admin/ingredients'
                    ? 'page'
                    : undefined
                }
              >
                Ingredient Master
              </Link>
              <Link
                href="/admin/ingredients/health"
                className={
                  pathname === '/admin/ingredients/health'
                    ? 'primary-button'
                    : 'ghost-button'
                }
                aria-current={
                  pathname === '/admin/ingredients/health'
                    ? 'page'
                    : undefined
                }
              >
                Rate Health
              </Link>
            </nav>
          ) : null}

          {!isAdmin && clientFlow ? (
            <section
              className="client-flow-progress no-print"
              aria-label={t('Costing progress')}
            >
              <div className="client-flow-progress-copy">
                <span>{t(`Step ${clientFlow.step} of 5`)}</span>
                <b>{t(clientFlow.label)}</b>
              </div>
              <div className="client-flow-progress-track" aria-hidden="true">
                {[1, 2, 3, 4, 5].map((step) => (
                  <i
                    key={step}
                    className={
                      step <= clientFlow.step
                        ? 'is-complete'
                        : ''
                    }
                  />
                ))}
              </div>
            </section>
          ) : null}

          {children}
        </div>
      </div>

      {!isAdmin ? (
        <>
          <nav
            className="client-mobile-nav no-print"
            aria-label={t('Main navigation')}
          >
            <Link
              href="/app/event?resume=1"
              className={clientFlow?.step === 1 ? 'active' : ''}
              aria-current={clientFlow?.step === 1 ? 'page' : undefined}
            >
              <ClientNavIconMark icon="event" />
              <small>{t('Event')}</small>
            </Link>

            <Link
              href="/app/manpower"
              className={clientFlow?.step === 2 ? 'active' : ''}
              aria-current={clientFlow?.step === 2 ? 'page' : undefined}
            >
              <ClientNavIconMark icon="team" />
              <small>{t('Team')}</small>
            </Link>

            <Link
              href="/app/operations"
              className={clientFlow?.step === 3 ? 'active' : ''}
              aria-current={clientFlow?.step === 3 ? 'page' : undefined}
            >
              <ClientNavIconMark icon="expenses" />
              <small>{t('Expenses')}</small>
            </Link>

            <Link
              href="/app/final-costing"
              className={clientFlow?.step === 4 ? 'active' : ''}
              aria-current={clientFlow?.step === 4 ? 'page' : undefined}
            >
              <ClientNavIconMark icon="pricing" />
              <small>{t('Pricing')}</small>
            </Link>

            <button
              type="button"
              className={clientMoreActive ? 'active' : ''}
              aria-expanded={moreOpen}
              aria-controls="client-more-sheet"
              onClick={() =>
                setMoreOpen((current) => !current)
              }
            >
              <ClientNavIconMark icon="more" />
              <small>{t('More')}</small>
            </button>
          </nav>

          {moreOpen ? (
            <div className="client-more-layer no-print">
              <button
                type="button"
                className="client-more-backdrop"
                aria-label={t('Close')}
                onClick={() => setMoreOpen(false)}
              />

              <section
                id="client-more-sheet"
                className="client-more-sheet"
                role="dialog"
                aria-modal="true"
                aria-label={t('More')}
              >
                <div className="client-more-handle" aria-hidden="true" />

                <div className="client-more-heading">
                  <div>
                    <span>{t('Menu Costing')}</span>
                    <b>{t('More')}</b>
                  </div>
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => setMoreOpen(false)}
                  >
                    {t('Close')}
                  </button>
                </div>

                <div className="client-more-grid">
                  <Link href="/app/history">
                    <b>{t('History')}</b>
                    <small>{t('Saved work')}</small>
                  </Link>
                  <Link href="/app/grocery">
                    <b>{t('Grocery')}</b>
                    <small>{t('Ingredient requirements')}</small>
                  </Link>
                  <Link href="/app/cost">
                    <b>{t('Cost Review')}</b>
                    <small>{t('Dish costs')}</small>
                  </Link>
                  <Link href="/app/quotation">
                    <b>{t('Quotation')}</b>
                    <small>{t('Client quote')}</small>
                  </Link>
                  <Link href="/app/ingredients">
                    <b>{t('Ingredients')}</b>
                    <small>{t('My custom rates')}</small>
                  </Link>
                  <Link href="/app/profile">
                    <b>{t('Profile')}</b>
                    <small>{t('Business settings')}</small>
                  </Link>
                </div>

                <div className="client-more-language">
                  <span>{t('App language')}</span>
                  <div>
                    <button
                      type="button"
                      className={language === 'en' ? 'active' : ''}
                      onClick={() => setLanguage('en')}
                    >
                      English
                    </button>
                    <button
                      type="button"
                      className={language === 'hi' ? 'active' : ''}
                      onClick={() => setLanguage('hi')}
                    >
                      हिन्दी
                    </button>
                  </div>
                </div>

                <button
                  className="client-more-signout"
                  type="button"
                  onClick={signOut}
                >
                  {t('Sign out')}
                </button>
              </section>
            </div>
          ) : null}
        </>
      ) : null}

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
