'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import {
  flushWorkSave,
  getSession,
  loadWork,
  logout,
  refreshSessionFromClient,
  saveWork,
} from '../../lib/store';
import type { Session, WorkState } from '../../lib/types';
import { useLanguage } from './LanguageProvider';

type NavIcon = 'profile' | 'clients' | 'dishes' | 'ingredients';
type ClientNavIcon = 'event' | 'cost' | 'grocery' | 'team' | 'expenses' | 'pricing' | 'quotation' | 'history' | 'dishes' | 'ingredients' | 'profile' | 'more';

type ClientFlowStep = {
  step: number;
  label: string;
  desktopStep: number;
  desktopLabel: string;
};

function clientFlowForPath(pathname: string): ClientFlowStep | null {
  if (
    pathname === '/app/menu' ||
    pathname === '/app/event'
  ) {
    return {
      step: 1,
      label: 'Menu',
      desktopStep: 1,
      desktopLabel: 'Menu Studio',
    };
  }

  if (pathname === '/app/quotation') {
    return {
      step: 4,
      label: 'Quotation',
      desktopStep: 6,
      desktopLabel: 'Quotation',
    };
  }

  return null;
}

const adminNavGroups = [
  {
    label: 'Admin',
    items: [
      { href: '/admin/users', label: 'Caterer Accounts', mobileLabel: 'Users', description: 'Create, disable and reset caterer accounts', icon: 'clients' as NavIcon },
      { href: '/admin/dishes', label: 'Dish Master', mobileLabel: 'Dishes', description: 'Manage global dishes, categories and rates', icon: 'dishes' as NavIcon },
      { href: '/app/profile', label: 'Settings', mobileLabel: 'Settings', description: 'Business and account settings', icon: 'profile' as NavIcon },
    ],
  },
];

const adminNav =
  adminNavGroups.flatMap(
    (group) =>
      group.items.map((item) => ({
        ...item,
        section: group.label,
      })),
  );

const clientWorkflowNav = [
  { href: '/app/menu', match: '/app/menu', label: 'Menu Studio', description: 'Create the client-facing menu', icon: 'quotation' as ClientNavIcon },
  { href: '/app/quotation', match: '/app/quotation', label: 'Quotation', description: 'Client-facing quote', icon: 'quotation' as ClientNavIcon },
];

const clientWorkspaceNav = [
  { href: '/app/event-planning', match: '/app/event-planning', label: 'Event Planning', description: 'Vendors, agencies and readiness', icon: 'event' as ClientNavIcon },
  { href: '/app/history', match: '/app/history', label: 'History', description: 'Saved events', icon: 'history' as ClientNavIcon },
  { href: '/app/vendors', match: '/app/vendors', label: 'Vendors & Agencies', description: 'Supplier and rate master', icon: 'team' as ClientNavIcon },
  { href: '/app/dish-master', match: '/app/dish-master', label: 'My Dish Master', description: 'All dishes, my rates and categories', icon: 'dishes' as ClientNavIcon },
  { href: '/app/equipment', match: '/app/equipment', label: 'Equipment Master', description: 'Photo catalog and availability', icon: 'expenses' as ClientNavIcon },
  { href: '/app/crockery', match: '/app/crockery', label: 'Crockery & Cutlery', description: 'Photo stock and guest quantities', icon: 'expenses' as ClientNavIcon },
  { href: '/app/work-orders', match: '/app/work-orders', label: 'Work Orders', description: 'Printable vendor assignments', icon: 'quotation' as ClientNavIcon },
  { href: '/app/uniforms', match: '/app/uniforms', label: 'Dress & Uniform', description: 'Photo uniform stock and role mapping', icon: 'team' as ClientNavIcon },
  { href: '/app/disposable-master', match: '/app/disposable-master', label: 'Disposable Master', description: 'Photo catalog and supplier defaults', icon: 'expenses' as ClientNavIcon },
  { href: '/app/disposable-rates', match: '/app/disposable-rates', label: 'Plastic Rates', description: 'Reusable disposable purchase rates', icon: 'expenses' as ClientNavIcon },
  { href: '/app/manpower-rates', match: '/app/manpower-rates', label: 'Manpower Rates', description: 'Reusable staff rates', icon: 'team' as ClientNavIcon },
  { href: '/app/profile', match: '/app/profile', label: 'Profile', description: 'Business settings', icon: 'profile' as ClientNavIcon },
];

type ActiveEventOption = {
  costingId: string;
  source: 'CURRENT' | 'DRAFT' | 'COMPLETED';
  eventName: string;
  clientName: string;
  eventDate: string;
  totalCovers: number;
  timestamp: string;
};

let cachedShellSession: Session | null = null;

function ClientNavIconMark({ icon }: { icon: ClientNavIcon }) {
  const paths: Record<ClientNavIcon, ReactNode> = {
    event: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="3" />
        <path d="M8 3v4M16 3v4M7 11h10M8 15h3" />
      </>
    ),
    cost: (
      <>
        <path d="M5 5h14v14H5z" />
        <path d="M8 9h8M8 13h5M8 17h3" />
      </>
    ),
    grocery: (
      <>
        <path d="M5 7h14l-1.4 10H6.4z" />
        <path d="M8 7V5h8v2M9 11h6M9 14h4" />
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
    quotation: (
      <>
        <path d="M6 3h9l3 3v15H6z" />
        <path d="M15 3v4h4M9 11h6M9 15h6" />
      </>
    ),
    history: (
      <>
        <path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.6" />
        <path d="M4 4v4.6h4.6M12 8v5l3 2" />
      </>
    ),
    dishes: (
      <>
        <path d="M4 16.5h16M6.5 16.5a5.5 5.5 0 0 1 11 0M12 8V5.5" />
        <path d="M3 20h18" />
      </>
    ),
    ingredients: (
      <>
        <path d="M8 4h8l1 4v12H7V8zM7 8h10" />
        <path d="M10 12h4M10 16h4" />
      </>
    ),
    profile: (
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c.5-4.2 2.8-6.3 7-6.3s6.5 2.1 7 6.3" />
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
  const [activeWork, setActiveWork] = useState<WorkState | null>(null);
  const [activeEventOptions, setActiveEventOptions] = useState<ActiveEventOption[]>([]);
  const [activeEventId, setActiveEventId] = useState('');
  const [activeEventLoading, setActiveEventLoading] = useState(false);
  const [activeEventError, setActiveEventError] = useState('');

  function activeEventLabel(work: WorkState | null) {
    if (!work) return 'No active event';

    return (
      work.event.eventName ||
      work.event.clientName ||
      'Current Event'
    );
  }

  async function loadActiveEventOptions(current: Session) {
    if (current.role !== 'CLIENT') return;

    const currentWork = loadWork(current.tenantId);
    setActiveWork(currentWork);
    setActiveEventId(currentWork.costingId);

    try {
      const [draftsResponse, costingsResponse] = await Promise.all([
        fetch('/api/client/drafts?limit=100', { cache: 'no-store' }),
        fetch('/api/client/costings?limit=100', { cache: 'no-store' }),
      ]);

      const options = new Map<string, ActiveEventOption>();

      if (costingsResponse.ok) {
        const data = await costingsResponse.json();
        const rows = Array.isArray(data.costings) ? data.costings : [];

        for (const item of rows) {
          const costingId = String(item.costingId || '');
          if (!costingId) continue;

          options.set(costingId, {
            costingId,
            source: 'COMPLETED',
            eventName: String(item.eventName || ''),
            clientName: String(item.clientName || ''),
            eventDate: String(item.eventDate || ''),
            totalCovers: Math.max(0, Number(item.totalCovers) || 0),
            timestamp: String(item.updatedAt || item.completedAt || ''),
          });
        }
      }

      if (draftsResponse.ok) {
        const data = await draftsResponse.json();
        const rows = Array.isArray(data.drafts) ? data.drafts : [];

        for (const item of rows) {
          const costingId = String(item.costingId || '');
          if (!costingId) continue;

          options.set(costingId, {
            costingId,
            source: 'DRAFT',
            eventName: String(item.eventName || ''),
            clientName: String(item.clientName || ''),
            eventDate: String(item.eventDate || ''),
            totalCovers: Math.max(0, Number(item.totalCovers) || 0),
            timestamp: String(item.updatedAt || ''),
          });
        }
      }

      if (currentWork.costingId) {
        const existing = options.get(currentWork.costingId);

        options.set(currentWork.costingId, {
          costingId: currentWork.costingId,
          source: existing?.source || 'CURRENT',
          eventName:
            currentWork.event.eventName ||
            existing?.eventName ||
            '',
          clientName:
            currentWork.event.clientName ||
            existing?.clientName ||
            '',
          eventDate:
            currentWork.event.eventDate ||
            existing?.eventDate ||
            '',
          totalCovers:
            Math.max(
              0,
              Number(currentWork.event.pax) ||
                existing?.totalCovers ||
                0,
            ),
          timestamp:
            currentWork.updatedAt ||
            existing?.timestamp ||
            '',
        });
      }

      const list = Array.from(options.values())
        .filter((item) => Boolean(item.costingId))
        .sort((left, right) => {
          if (left.costingId === currentWork.costingId) return -1;
          if (right.costingId === currentWork.costingId) return 1;

          return (
            new Date(
              right.timestamp ||
                right.eventDate ||
                0,
            ).getTime() -
            new Date(
              left.timestamp ||
                left.eventDate ||
                0,
            ).getTime()
          );
        });

      setActiveEventOptions(list);
    } catch {
      if (currentWork.costingId) {
        setActiveEventOptions([
          {
            costingId: currentWork.costingId,
            source: 'CURRENT',
            eventName: currentWork.event.eventName,
            clientName: currentWork.event.clientName,
            eventDate: currentWork.event.eventDate,
            totalCovers: Math.max(0, Number(currentWork.event.pax) || 0),
            timestamp: currentWork.updatedAt || '',
          },
        ]);
      }
    }
  }

  async function switchActiveEvent(costingId: string) {
    if (
      !session ||
      session.role !== 'CLIENT' ||
      !costingId ||
      costingId === activeEventId
    ) {
      return;
    }

    const option = activeEventOptions.find(
      (item) => item.costingId === costingId,
    );

    if (!option) return;

    setActiveEventLoading(true);
    setActiveEventError('');

    try {
      let nextWork: WorkState | null = null;

      if (option.source === 'DRAFT') {
        const response = await fetch(
          `/api/client/drafts?costingId=${encodeURIComponent(costingId)}`,
          { cache: 'no-store' },
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Could not load draft event');
        }

        nextWork = data.draft?.workData as WorkState;
      } else if (option.source === 'COMPLETED') {
        const response = await fetch(
          `/api/client/costings?costingId=${encodeURIComponent(costingId)}`,
          { cache: 'no-store' },
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Could not load completed event');
        }

        nextWork = data.costing?.snapshot as WorkState;
      }

      if (!nextWork || !nextWork.costingId) {
        throw new Error('Saved event data is unavailable');
      }

      saveWork(session.tenantId, nextWork);
      flushWorkSave(session.tenantId);
      setActiveWork(nextWork);
      setActiveEventId(nextWork.costingId);

      window.location.reload();
    } catch (error) {
      setActiveEventError(
        error instanceof Error
          ? error.message
          : 'Could not switch active event.',
      );
      setActiveEventLoading(false);
    }
  }

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

    // A real admin session already has the admin cookie and must not
    // be forced through the single-business client-session upgrader.
    if (current.role === 'ADMIN') {
      return;
    }

    /*
     * Validate the cookie in the background, but do not make the user wait
     * for history/draft queries before the workspace is usable.
     */
    void fetch(
      '/api/client/session',
      {
        method: 'POST',
      },
    )
      .then((response) => {
        if (
          response.status === 401 ||
          response.status === 403
        ) {
          cachedShellSession = null;
          logout();
          router.replace('/login');
        }
      })
      .catch(() => {
        // Keep the local workspace available during a temporary network issue.
      });

    const loadOptions = () => {
      void loadActiveEventOptions(current);
    };

    const timer = window.setTimeout(
      loadOptions,
      250,
    );

    return () =>
      window.clearTimeout(
        timer,
      );
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

  // Admin styling is route-based. Global master-data routes are reserved
  // for the Super Admin; caterer accounts stay inside their tenant workspace.
  const isAdmin =
    pathname === '/admin' ||
    pathname.startsWith('/admin/');
  const isUsersWorkspace =
    pathname === '/admin/users' ||
    pathname.startsWith('/admin/users/');
  const isDishWorkspace =
    pathname === '/admin/dishes' ||
    pathname.startsWith('/admin/dishes/');
  const isIngredientWorkspace =
    pathname === '/admin/ingredients' ||
    pathname.startsWith('/admin/ingredients/');
  const isGasWorkspace =
    pathname === '/admin/gas' ||
    pathname.startsWith('/admin/gas/') ||
    pathname.startsWith('/admin/settings/cost-masters/lpg');
  const isAdminNavItemActive = (href: string) =>
    pathname === href ||
    (href === '/admin/users' && isUsersWorkspace) ||
    (href === '/admin/dishes' && isDishWorkspace) ||
    (href === '/admin/ingredients' && isIngredientWorkspace) ||
    (href === '/admin/gas' && isGasWorkspace);

  const activeAdminItem =
    isAdmin
      ? adminNav.find(
          (item) =>
            isAdminNavItemActive(
              item.href,
            ),
        )
      : undefined;

  const activeAdminSection =
    activeAdminItem?.section ||
    'Master Data';

  const clientFlow =
    !isAdmin
      ? clientFlowForPath(pathname)
      : null;

  const clientMoreActive =
    moreOpen ||
    clientFlow?.step === 5 ||
    pathname === '/app/event-planning' ||
    pathname === '/app/history' ||
    pathname === '/app/vendors' ||
    pathname === '/app/equipment' ||
    pathname === '/app/crockery' ||
    pathname === '/app/work-orders' ||
    pathname === '/app/uniforms' ||
    pathname === '/app/disposable-master' ||
    pathname === '/app/ingredients' ||
    pathname === '/app/disposable-rates' ||
    pathname === '/app/manpower-rates' ||
    pathname === '/app/profile';

  const selectedActiveEvent =
    useMemo(
      () =>
        activeEventOptions.find(
          (item) =>
            item.costingId ===
            activeEventId,
        ),
      [
        activeEventOptions,
        activeEventId,
      ],
    );

  const activeEventDate =
    activeWork?.event.eventDate
      ? new Date(
          `${activeWork.event.eventDate}T00:00:00`,
        )
      : null;

  const validActiveEventDate =
    activeEventDate &&
    !Number.isNaN(
      activeEventDate.getTime(),
    )
      ? activeEventDate
      : null;

  const activeEventDay =
    validActiveEventDate
      ? String(
          validActiveEventDate.getDate(),
        ).padStart(2, '0')
      : '—';

  const activeEventMonth =
    validActiveEventDate
      ? validActiveEventDate
          .toLocaleString(
            'en-IN',
            {
              month: 'short',
            },
          )
          .toUpperCase()
      : 'DATE';

  const signOut = () => {
    cachedShellSession = null;
    logout();

    void Promise.all([
      fetch('/api/client/session', {
        method: 'DELETE',
      }),
      fetch('/api/admin/session', {
        method: 'DELETE',
      }),
    ]);

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
        <Link href={isAdmin ? '/admin/users' : '/app/menu'} className="brand-chip">
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

          <span className="account-status active">
            <i aria-hidden="true" />
            {session?.role === 'ADMIN' ? 'Super Admin' : 'Caterer Workspace'}
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

      {!isAdmin ? (
        <>
          <style>{`
            .global-active-event {
              display: grid;
              grid-template-columns: 58px minmax(0, 1fr) minmax(260px, 420px);
              gap: 14px;
              align-items: center;
              padding: 12px 18px;
              border-bottom: 1px solid rgba(148, 163, 184, .12);
              background:
                radial-gradient(circle at 8% 50%, rgba(74, 156, 255, .09), transparent 28%),
                rgba(13, 18, 25, .96);
            }

            .global-event-date-tile {
              display: grid;
              height: 54px;
              place-items: center;
              border: 1px solid rgba(111, 184, 255, .22);
              border-radius: 14px;
              background: linear-gradient(180deg, rgba(74, 156, 255, .14), rgba(74, 156, 255, .04));
              box-shadow: inset 0 1px 0 rgba(255, 255, 255, .04);
            }

            .global-event-date-tile b,
            .global-event-date-tile small {
              display: block;
              line-height: 1;
            }

            .global-event-date-tile b {
              color: #f6f9fc;
              font-size: 20px;
              letter-spacing: -.04em;
            }

            .global-event-date-tile small {
              margin-top: -6px;
              color: #78b5ff;
              font-size: 8px;
              font-weight: 900;
              letter-spacing: .08em;
            }

            .global-active-event-copy {
              min-width: 0;
            }

            .global-active-event-label {
              display: block;
              color: #78b5ff;
              font-size: 8px;
              font-weight: 900;
              letter-spacing: .09em;
              text-transform: uppercase;
            }

            .global-active-event-title {
              display: block;
              margin-top: 3px;
              overflow: hidden;
              color: #eef4fb;
              font-size: 13px;
              font-weight: 900;
              text-overflow: ellipsis;
              white-space: nowrap;
            }

            .global-active-event-meta {
              display: flex;
              gap: 6px;
              flex-wrap: wrap;
              margin-top: 7px;
              color: #8290a0;
              font-size: 9px;
            }

            .global-active-event-meta span {
              display: inline-flex;
              gap: 5px;
              align-items: center;
              padding: 4px 7px;
              border: 1px solid rgba(148, 163, 184, .10);
              border-radius: 999px;
              background: rgba(255, 255, 255, .025);
            }

            .global-active-event-meta svg {
              width: 11px;
              height: 11px;
              color: #6faeff;
            }

            .global-active-event-meta .event-state {
              color: #8fd8a9;
              border-color: rgba(56, 201, 121, .16);
              background: rgba(56, 201, 121, .06);
            }

            .global-active-event-select {
              width: 100%;
              min-height: 38px;
              padding: 0 11px;
              border: 1px solid #303a46;
              border-radius: 9px;
              outline: 0;
              color: #e9eff6;
              background: #151c25;
              font: inherit;
              font-size: 10px;
              font-weight: 800;
              color-scheme: dark;
            }

            .global-active-event-select:focus {
              border-color: rgba(74, 156, 255, .62);
              box-shadow: 0 0 0 3px rgba(74, 156, 255, .08);
            }

            .global-active-event-error {
              grid-column: 1 / -1;
              margin: -4px 0 0;
              color: #ff9c95;
              font-size: 9px;
            }

            @media (max-width: 760px) {
              .global-active-event {
                grid-template-columns: 48px minmax(0, 1fr);
                gap: 9px;
                padding: 9px 12px;
              }

              .global-event-date-tile {
                height: 48px;
                border-radius: 12px;
              }

              .global-active-event-select,
              .global-active-event-error {
                grid-column: 1 / -1;
              }

              .global-active-event-meta {
                gap: 4px;
                font-size: 8px;
              }
            }
          `}</style>

          <section
            className="global-active-event no-print"
            aria-label="Global active event"
          >
            <div
              className="global-event-date-tile"
              aria-hidden="true"
            >
              <b>{activeEventDay}</b>
              <small>{activeEventMonth}</small>
            </div>

            <div className="global-active-event-copy">
              <span className="global-active-event-label">
                Active Event
              </span>
              <b className="global-active-event-title">
                {activeEventLabel(activeWork)}
              </b>

              <div className="global-active-event-meta">
                <span>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="8" r="3" />
                    <path d="M5.5 19c.6-4 2.8-6 6.5-6s5.9 2 6.5 6" />
                  </svg>
                  {activeWork?.event.clientName ||
                    'Client not set'}
                </span>

                <span>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    aria-hidden="true"
                  >
                    <circle cx="9" cy="9" r="3" />
                    <circle cx="17" cy="10" r="2.3" />
                    <path d="M3.5 19c.5-3.6 2.3-5.4 5.5-5.4s5 1.8 5.5 5.4M15 15c2.8.1 4.4 1.5 4.8 4" />
                  </svg>
                  {Math.max(
                    0,
                    Number(
                      activeWork?.event.pax,
                    ) || 0,
                  ).toLocaleString('en-IN')}{' '}
                  guests
                </span>

                {(activeWork?.event.venue ||
                  activeWork?.event.city) ? (
                  <span>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      aria-hidden="true"
                    >
                      <path d="M12 21s6-5.3 6-11a6 6 0 1 0-12 0c0 5.7 6 11 6 11Z" />
                      <circle cx="12" cy="10" r="2" />
                    </svg>
                    {activeWork?.event.venue ||
                      activeWork?.event.city}
                  </span>
                ) : null}

                {selectedActiveEvent ? (
                  <span className="event-state">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      aria-hidden="true"
                    >
                      <path d="m6 12 4 4 8-9" />
                    </svg>
                    {selectedActiveEvent.source === 'COMPLETED'
                      ? 'Completed'
                      : selectedActiveEvent.source === 'DRAFT'
                        ? 'Draft'
                        : 'Current'}
                  </span>
                ) : null}
              </div>
            </div>

            <select
              className="global-active-event-select"
              value={activeEventId}
              disabled={
                activeEventLoading ||
                !activeEventOptions.length
              }
              onChange={(event) =>
                void switchActiveEvent(
                  event.target.value,
                )
              }
              aria-label="Change active event"
            >
              {!activeEventOptions.length ? (
                <option value="">
                  No saved events available
                </option>
              ) : null}

              {activeEventOptions.map(
                (item) => (
                  <option
                    key={item.costingId}
                    value={item.costingId}
                  >
                    {[
                      item.eventName ||
                        'Unnamed event',
                      item.clientName,
                      item.eventDate,
                      item.totalCovers > 0
                        ? `${item.totalCovers.toLocaleString('en-IN')} guests`
                        : '',
                      item.source === 'COMPLETED'
                        ? 'Completed'
                        : item.source === 'DRAFT'
                          ? 'Draft'
                          : 'Current',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </option>
                ),
              )}
            </select>

            {activeEventError ? (
              <p
                className="global-active-event-error"
                role="alert"
              >
                {activeEventError}
              </p>
            ) : null}
          </section>
        </>
      ) : null}

      <div className="app-layout">
        {isAdmin ? (
          <aside className="app-sidebar admin-desktop-sidebar no-print">
            <div className="sidebar-heading admin-sidebar-heading">
              <span>Super Admin</span>
              <b>Menu Costing</b>
              <small>Accounts, dishes and settings</small>
            </div>

            <nav className="sidebar-nav admin-sidebar-nav" aria-label="Admin navigation">
              {adminNavGroups.map((group) => (
                <div
                  className="admin-nav-group"
                  key={group.label}
                >
                  <span className="admin-nav-group-label">
                    {group.label}
                  </span>

                  <div className="admin-nav-group-links">
                    {group.items.map((item) => {
                      const active =
                        isAdminNavItemActive(
                          item.href,
                        );

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={active ? 'active' : ''}
                          aria-current={active ? 'page' : undefined}
                        >
                          <NavIconMark icon={item.icon} />
                          <span className="nav-copy">
                            <b>{item.label}</b>
                            <small>{item.description}</small>
                          </span>
                          <span className="admin-nav-chevron" aria-hidden="true">
                            ›
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="sidebar-support admin-sidebar-support">
              <span>Single business workspace</span>
              <p>Changes here apply to this catering business and future event costings.</p>
            </div>
          </aside>
        ) : null}

        {!isAdmin ? (
          <aside className="app-sidebar client-desktop-sidebar no-print">
            <div className="sidebar-heading">
              <span>Costing workspace</span>
              <b>Build event cost</b>
            </div>

            <nav className="sidebar-nav client-desktop-nav" aria-label={t('Costing workflow')}>
              {clientWorkflowNav.map((item, index) => {
                const isActive = pathname === item.match;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={isActive ? 'active' : ''}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <ClientNavIconMark icon={item.icon} />
                    <span className="nav-copy">
                      <b>{t(item.label)}</b>
                      <small>{t(item.description)}</small>
                    </span>
                    <span className="client-desktop-step" aria-hidden="true">{index + 1}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="client-sidebar-divider" />

            <nav className="sidebar-nav client-desktop-nav client-desktop-nav-secondary" aria-label={t('Workspace')}>
              {clientWorkspaceNav.map((item) => {
                const isActive = pathname === item.match;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={isActive ? 'active' : ''}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <ClientNavIconMark icon={item.icon} />
                    <span className="nav-copy">
                      <b>{t(item.label)}</b>
                      <small>{t(item.description)}</small>
                    </span>
                  </Link>
                );
              })}
            </nav>

            <div className="sidebar-support client-sidebar-support">
              <span>Current workspace</span>
              <p>{session?.businessName || 'Menu Costing'}</p>
            </div>
          </aside>
        ) : null}

        <div
          className={
            isAdmin
              ? 'app-workspace'
              : 'app-workspace client-ui-system-v2'
          }
        >
          {isAdmin && !hidePageTitle ? (
            <section className="page-title admin-page-head no-print">
              <div className="admin-page-head-copy">
                <div className="admin-breadcrumb" aria-label="Admin location">
                  <span>Business</span>
                  <i aria-hidden="true">/</i>
                  <b>{activeAdminSection}</b>
                </div>

                <h1>{title}</h1>
                <p>{subtitle ?? 'Manage Menu Costing administration.'}</p>
              </div>

              <div className="admin-page-context">
                <span>Admin workspace</span>
                <b>{activeAdminItem?.label || title}</b>
                <small>Accounts, dishes and settings</small>
              </div>
            </section>
          ) : null}

          {isAdmin && isDishWorkspace ? (
            <nav
              className="action-row admin-section-tabs no-print"
              aria-label="Dish management"
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
              className="action-row admin-section-tabs no-print"
              aria-label="Ingredient management"
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

          {isAdmin && isGasWorkspace ? (
            <nav
              className="action-row admin-section-tabs no-print"
              aria-label="Gas cost management"
            >
              <Link
                href="/admin/gas"
                className={
                  pathname === '/admin/gas'
                    ? 'primary-button'
                    : 'ghost-button'
                }
                aria-current={
                  pathname === '/admin/gas'
                    ? 'page'
                    : undefined
                }
              >
                Category Rates
              </Link>
              <Link
                href="/admin/gas/profiles"
                className={
                  pathname === '/admin/gas/profiles'
                    ? 'primary-button'
                    : 'ghost-button'
                }
                aria-current={
                  pathname === '/admin/gas/profiles'
                    ? 'page'
                    : undefined
                }
              >
                Dish Gas Profiles
              </Link>
              <Link
                href="/admin/gas/sweets"
                className={
                  pathname === '/admin/gas/sweets'
                    ? 'primary-button'
                    : 'ghost-button'
                }
                aria-current={
                  pathname === '/admin/gas/sweets'
                    ? 'page'
                    : undefined
                }
              >
                Sweet Gas Master
              </Link>
              <Link
                href="/admin/settings/cost-masters/lpg"
                className={
                  pathname === '/admin/settings/cost-masters/lpg'
                    ? 'primary-button'
                    : 'ghost-button'
                }
                aria-current={
                  pathname === '/admin/settings/cost-masters/lpg'
                    ? 'page'
                    : undefined
                }
              >
                LPG Settings
              </Link>
            </nav>
          ) : null}

          {!isAdmin && !hidePageTitle ? (
            <section className="client-desktop-page-head no-print">
              <div>
                <span className="page-eyebrow">{t('Costing workspace')}</span>
                <h1>{title}</h1>
                <p>{subtitle ?? t('Plan and cost this event from one workspace.')}</p>
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
              href="/app/menu"
              className={clientFlow?.step === 1 ? 'active' : ''}
              aria-current={clientFlow?.step === 1 ? 'page' : undefined}
            >
              <ClientNavIconMark icon="quotation" />
              <small>{t('Menu')}</small>
            </Link>

            <Link
              href="/app/quotation"
              className={clientFlow?.step === 4 ? 'active' : ''}
              aria-current={clientFlow?.step === 4 ? 'page' : undefined}
            >
              <ClientNavIconMark icon="quotation" />
              <small>{t('Quotation')}</small>
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
                  <Link href="/app/menu">
                    <b>{t('Menu Studio')}</b>
                    <small>{t('Create and preview client menu')}</small>
                  </Link>
                  <Link href="/app/event-planning">
                    <b>{t('Event Planning')}</b>
                    <small>{t('Vendors, agencies and readiness')}</small>
                  </Link>
                  <Link href="/app/history">
                    <b>{t('History')}</b>
                    <small>{t('Saved work')}</small>
                  </Link>
                  <Link href="/app/quotation">
                    <b>{t('Quotation')}</b>
                    <small>{t('Client quote')}</small>
                  </Link>
                  <Link href="/app/ingredients">
                    <b>{t('Ingredients')}</b>
                    <small>{t('Business + city rates')}</small>
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
      <h2>Workspace unavailable</h2>
      <p>Sign in again to continue using the business workspace.</p>
      <Link href="/login" className="primary-button">Sign In</Link>
    </div>
  );
}
