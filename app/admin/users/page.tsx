'use client';

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SESSION_KEY } from '../../../lib/store';

type ClientPlan = 'FREE' | 'PRO' | 'WHITE_LABEL' | string;
type ClientStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | string;

type ClientUser = {
  id: string;
  name: string;
  email: string;
  plan: ClientPlan;
  status: ClientStatus;
  createdAt: string;
};

type IconName =
  | 'users'
  | 'active'
  | 'free'
  | 'pro'
  | 'recent'
  | 'search'
  | 'plus'
  | 'logout'
  | 'trash'
  | 'refresh'
  | 'chevron'
  | 'shield';

const initialForm = {
  name: '',
  email: '',
  password: '',
  plan: 'PRO',
  status: 'ACTIVE',
};

function Icon({
  name,
}: {
  name: IconName;
}) {
  const paths: Record<IconName, React.ReactNode> = {
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    active: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 2.5 2.5L16 9" />
      </>
    ),
    free: (
      <>
        <path d="M5 7.5h14v10H5z" />
        <path d="M8 7.5V5h8v2.5M8 12h8" />
      </>
    ),
    pro: (
      <>
        <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
      </>
    ),
    recent: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    logout: (
      <>
        <path d="M10 17l5-5-5-5M15 12H3M21 19V5a2 2 0 0 0-2-2h-6" />
      </>
    ),
    trash: (
      <>
        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 7v5h-5" />
        <path d="M4 17v-5h5" />
        <path d="M6.1 8.2A7 7 0 0 1 18.4 7L20 12M4 12l1.6 5A7 7 0 0 0 17.9 15.8" />
      </>
    ),
    chevron: (
      <>
        <path d="m9 18 6-6-6-6" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 5 6v5c0 4.7 2.8 8 7 10 4.2-2 7-5.3 7-10V6z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className="mc-admin-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function planLabel(plan: ClientPlan) {
  if (plan === 'FREE') return 'Free';
  if (plan === 'PRO') return 'Pro';
  if (plan === 'WHITE_LABEL') return 'White Label';
  return plan || 'Unknown';
}

function planClass(plan: ClientPlan) {
  if (plan === 'PRO') return 'pro';
  if (plan === 'WHITE_LABEL') return 'white-label';
  return 'free';
}

function statusLabel(status: ClientStatus) {
  if (status === 'ACTIVE') return 'Active';
  if (status === 'EXPIRED') return 'Expired';
  if (status === 'INACTIVE') return 'Blocked';
  return status || 'Unknown';
}

function initials(name: string) {
  const pieces = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (pieces.length === 0) return 'MC';

  return pieces
    .slice(0, 2)
    .map((piece) => piece[0]?.toUpperCase() || '')
    .join('');
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Unknown date';

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function AdminUsersPage() {
  const router = useRouter();

  const [users, setUsers] = useState<ClientUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workingId, setWorkingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [planFilter, setPlanFilter] = useState('ALL');
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    try {
      const sessionRaw =
        localStorage.getItem(SESSION_KEY);
      const session =
        sessionRaw
          ? JSON.parse(sessionRaw)
          : null;

      if (
        !session ||
        session.role !== 'ADMIN'
      ) {
        router.push('/login');
        return;
      }

      void loadUsers();
    } catch {
      router.push('/login');
    }
  }, [router]);

  const counts = useMemo(() => {
    const now = Date.now();
    const sevenDays =
      7 * 24 * 60 * 60 * 1000;

    return {
      total: users.length,
      active: users.filter(
        (user) =>
          user.status === 'ACTIVE',
      ).length,
      free: users.filter(
        (user) =>
          user.plan === 'FREE',
      ).length,
      pro: users.filter(
        (user) =>
          user.plan === 'PRO',
      ).length,
      recent: users.filter((user) => {
        const created =
          new Date(
            user.createdAt,
          ).getTime();

        return (
          Number.isFinite(created) &&
          now - created <= sevenDays
        );
      }).length,
    };
  }, [users]);

  const filteredUsers =
    useMemo(() => {
      const search =
        query.trim().toLowerCase();

      return users.filter((user) => {
        const matchesStatus =
          statusFilter === 'ALL' ||
          user.status === statusFilter;

        const matchesPlan =
          planFilter === 'ALL' ||
          user.plan === planFilter;

        const matchesSearch =
          !search ||
          user.name
            .toLowerCase()
            .includes(search) ||
          user.email
            .toLowerCase()
            .includes(search);

        return (
          matchesStatus &&
          matchesPlan &&
          matchesSearch
        );
      });
    }, [
      planFilter,
      query,
      statusFilter,
      users,
    ]);

  async function loadUsers() {
    setLoading(true);
    setError('');

    try {
      const res =
        await fetch(
          '/api/admin/users',
          {
            cache: 'no-store',
          },
        );

      const data =
        await res.json();

      if (!res.ok) {
        setError(
          data.error ||
            'Failed to load clients',
        );
        return;
      }

      setUsers(
        data.users || [],
      );
    } catch {
      setError(
        'Server connection failed. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function createUser(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');

    try {
      const res =
        await fetch(
          '/api/admin/users',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify(form),
          },
        );

      const data =
        await res.json();

      if (!res.ok) {
        setError(
          data.error ||
            'Failed to create client',
        );
        return;
      }

      setForm(initialForm);
      setNotice(
        `${form.name.trim()} can now sign in.`,
      );
      await loadUsers();
    } catch {
      setError(
        'Server connection failed. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function patchUser(
    user: ClientUser,
    patch: Partial<Pick<ClientUser, 'plan' | 'status'>>,
    successMessage: string,
  ) {
    setWorkingId(user.id);
    setError('');
    setNotice('');

    try {
      const res =
        await fetch(
          '/api/admin/users',
          {
            method: 'PATCH',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              id: user.id,
              ...patch,
            }),
          },
        );

      const data =
        await res.json().catch(
          () => ({}),
        );

      if (!res.ok) {
        throw new Error(
          data.error ||
            'Update failed',
        );
      }

      setNotice(successMessage);
      await loadUsers();
    } catch (caught) {
      setError(
        caught instanceof Error &&
          caught.message !==
            'Update failed'
          ? caught.message
          : 'Could not update this client. Please try again.',
      );
    } finally {
      setWorkingId('');
    }
  }

  async function updateStatus(
    user: ClientUser,
  ) {
    const nextStatus =
      user.status === 'ACTIVE'
        ? 'INACTIVE'
        : 'ACTIVE';

    await patchUser(
      user,
      {
        status: nextStatus,
      },
      `${user.name} is now ${
        nextStatus === 'ACTIVE'
          ? 'active'
          : 'blocked'
      }.`,
    );
  }

  async function updatePlan(
    user: ClientUser,
    nextPlan: string,
  ) {
    if (
      nextPlan === user.plan
    ) {
      return;
    }

    await patchUser(
      user,
      {
        plan: nextPlan,
      },
      `${user.name} moved to ${planLabel(
        nextPlan,
      )}.`,
    );
  }

  async function deleteUser(
    user: ClientUser,
  ) {
    if (
      !confirm(
        `Delete ${user.name}? Their saved tenant data will also be deleted.`,
      )
    ) {
      return;
    }

    setWorkingId(user.id);
    setError('');
    setNotice('');

    try {
      const res =
        await fetch(
          `/api/admin/users?id=${encodeURIComponent(
            user.id,
          )}`,
          {
            method: 'DELETE',
          },
        );

      if (!res.ok) {
        throw new Error();
      }

      setNotice(
        `${user.name} was deleted.`,
      );
      await loadUsers();
    } catch {
      setError(
        'Could not delete this client. Please try again.',
      );
    } finally {
      setWorkingId('');
    }
  }

  function logout() {
    localStorage.removeItem(
      SESSION_KEY,
    );

    fetch(
      '/api/admin/session',
      {
        method: 'DELETE',
      },
    ).finally(() =>
      router.push('/login'),
    );
  }

  return (
    <main className="mc-admin-page">
      <style>{`
        .mc-admin-page {
          --mc-admin-bg:#07090d;
          --mc-admin-panel:#10141b;
          --mc-admin-panel-2:#151a22;
          --mc-admin-line:#272d37;
          --mc-admin-line-soft:rgba(255,255,255,.07);
          --mc-admin-text:#f5f7fa;
          --mc-admin-muted:#929baa;
          --mc-admin-blue:#4a9cff;
          --mc-admin-green:#3ddc84;
          --mc-admin-orange:#ffad42;
          --mc-admin-red:#ff6259;
          min-height:100vh;
          padding:16px 22px 54px;
          color:var(--mc-admin-text);
          background:
            radial-gradient(circle at 7% 0%,rgba(74,156,255,.14),transparent 32rem),
            radial-gradient(circle at 96% 5%,rgba(112,81,255,.08),transparent 28rem),
            linear-gradient(180deg,#0b0e13 0%,#07090d 100%);
        }

        .mc-admin-page * {
          box-sizing:border-box;
        }

        .mc-admin-page a {
          color:inherit;
          text-decoration:none;
        }

        .mc-admin-topbar {
          position:sticky;
          top:12px;
          z-index:40;
          display:flex;
          width:min(1480px,100%);
          min-height:66px;
          align-items:center;
          justify-content:space-between;
          gap:18px;
          margin:0 auto;
          padding:9px 10px;
          border:1px solid rgba(255,255,255,.09);
          border-radius:18px;
          background:rgba(12,15,21,.88);
          box-shadow:0 18px 48px rgba(0,0,0,.28);
          backdrop-filter:blur(22px) saturate(145%);
          -webkit-backdrop-filter:blur(22px) saturate(145%);
        }

        .mc-admin-brand {
          display:flex;
          min-width:0;
          align-items:center;
          gap:11px;
        }

        .mc-admin-brand-mark {
          display:grid;
          width:44px;
          height:44px;
          flex:0 0 44px;
          place-items:center;
          border:1px solid rgba(255,255,255,.08);
          border-radius:13px;
          color:#fff;
          background:linear-gradient(145deg,#1b2635,#1478f2);
          box-shadow:0 9px 20px rgba(20,120,242,.24);
          font-size:12px;
          font-weight:900;
        }

        .mc-admin-brand-copy {
          min-width:0;
        }

        .mc-admin-brand-copy strong,
        .mc-admin-brand-copy small {
          display:block;
        }

        .mc-admin-brand-copy strong {
          font-size:14px;
          letter-spacing:-.02em;
        }

        .mc-admin-brand-copy small {
          margin-top:2px;
          color:#7f8a99;
          font-size:9px;
          font-weight:800;
          letter-spacing:.05em;
          text-transform:uppercase;
        }

        .mc-admin-nav {
          display:flex;
          align-items:center;
          gap:4px;
          padding:4px;
          border:1px solid rgba(255,255,255,.055);
          border-radius:12px;
          background:#11161e;
        }

        .mc-admin-nav a {
          padding:8px 11px;
          border-radius:9px;
          color:#7f8a99;
          font-size:10px;
          font-weight:850;
          white-space:nowrap;
        }

        .mc-admin-nav a:hover {
          color:#e8edf3;
          background:#171d26;
        }

        .mc-admin-nav a.active {
          color:#9bc8ff;
          background:rgba(74,156,255,.13);
          box-shadow:inset 0 0 0 1px rgba(74,156,255,.12);
        }

        .mc-admin-logout {
          display:inline-flex;
          min-height:40px;
          align-items:center;
          justify-content:center;
          gap:7px;
          padding:0 12px;
          border:1px solid #303743;
          border-radius:11px;
          color:#bac2cd;
          background:#151a22;
          font:inherit;
          font-size:10px;
          font-weight:850;
          cursor:pointer;
        }

        .mc-admin-logout:hover {
          color:#fff;
          border-color:#46505f;
          background:#1a2029;
        }

        .mc-admin-icon {
          width:17px;
          height:17px;
          flex:0 0 auto;
        }

        .mc-admin-container {
          width:min(1480px,100%);
          margin:0 auto;
        }

        .mc-admin-hero {
          display:flex;
          align-items:flex-end;
          justify-content:space-between;
          gap:28px;
          padding:46px 3px 26px;
        }

        .mc-admin-overline {
          color:#78b5ff;
          font-size:9px;
          font-weight:900;
          letter-spacing:.11em;
          text-transform:uppercase;
        }

        .mc-admin-hero h1 {
          margin:7px 0 6px;
          font-size:clamp(34px,4.5vw,56px);
          line-height:.98;
          letter-spacing:-.055em;
        }

        .mc-admin-hero p {
          max-width:680px;
          margin:0;
          color:var(--mc-admin-muted);
          font-size:13px;
          line-height:1.55;
        }

        .mc-admin-hero-actions {
          display:flex;
          flex:0 0 auto;
          gap:8px;
        }

        .mc-admin-button {
          display:inline-flex;
          min-height:42px;
          align-items:center;
          justify-content:center;
          gap:8px;
          padding:0 14px;
          border:1px solid transparent;
          border-radius:11px;
          font:inherit;
          font-size:10px;
          font-weight:900;
          cursor:pointer;
        }

        .mc-admin-button.primary {
          color:#fff;
          background:linear-gradient(180deg,#3190ff,#1478f2);
          box-shadow:0 8px 20px rgba(20,120,242,.21);
        }

        .mc-admin-button.secondary {
          color:#b8c1cc;
          border-color:#303743;
          background:#151a22;
        }

        .mc-admin-button:disabled {
          cursor:wait;
          opacity:.55;
        }

        .mc-admin-stats {
          display:grid;
          grid-template-columns:repeat(5,minmax(0,1fr));
          gap:10px;
          margin-bottom:18px;
        }

        .mc-admin-stat {
          position:relative;
          display:flex;
          min-height:112px;
          align-items:center;
          gap:13px;
          overflow:hidden;
          padding:17px;
          border:1px solid var(--mc-admin-line);
          border-radius:17px;
          background:linear-gradient(180deg,#11161e,#0f1319);
          box-shadow:0 10px 28px rgba(0,0,0,.18);
        }

        .mc-admin-stat::after {
          content:"";
          position:absolute;
          right:-28px;
          bottom:-28px;
          width:80px;
          height:80px;
          border-radius:50%;
          background:rgba(74,156,255,.035);
        }

        .mc-admin-stat-icon {
          display:grid;
          width:39px;
          height:39px;
          flex:0 0 39px;
          place-items:center;
          border-radius:12px;
          color:#8fc2ff;
          background:#14263a;
        }

        .mc-admin-stat-icon.green {
          color:#70e0a0;
          background:#10291e;
        }

        .mc-admin-stat-icon.orange {
          color:#ffc16b;
          background:#2a1d0f;
        }

        .mc-admin-stat-icon.purple {
          color:#b7a4ff;
          background:#211b39;
        }

        .mc-admin-stat small,
        .mc-admin-stat strong,
        .mc-admin-stat span {
          display:block;
        }

        .mc-admin-stat small {
          color:#747f8f;
          font-size:9px;
          font-weight:800;
          text-transform:uppercase;
        }

        .mc-admin-stat strong {
          margin:4px 0 2px;
          font-size:24px;
          letter-spacing:-.04em;
        }

        .mc-admin-stat span {
          color:#6f7988;
          font-size:8px;
        }

        .mc-admin-message {
          margin-bottom:12px;
          padding:12px 14px;
          border:1px solid;
          border-radius:12px;
          font-size:10px;
          font-weight:780;
        }

        .mc-admin-message.error {
          color:#ff918a;
          border-color:rgba(255,98,89,.25);
          background:rgba(255,98,89,.08);
        }

        .mc-admin-message.success {
          color:#6ce09e;
          border-color:rgba(61,220,132,.23);
          background:rgba(61,220,132,.08);
        }

        .mc-admin-main-grid {
          display:grid;
          grid-template-columns:minmax(0,1.7fr) minmax(320px,.8fr);
          gap:16px;
          align-items:start;
        }

        .mc-admin-panel {
          border:1px solid var(--mc-admin-line);
          border-radius:20px;
          background:rgba(16,20,27,.96);
          box-shadow:0 16px 38px rgba(0,0,0,.22);
        }

        .mc-admin-directory {
          min-width:0;
          padding:20px;
        }

        .mc-admin-create {
          position:sticky;
          top:96px;
          padding:20px;
        }

        .mc-admin-panel-head {
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:14px;
        }

        .mc-admin-panel-head h2 {
          margin:5px 0 0;
          font-size:20px;
          letter-spacing:-.035em;
        }

        .mc-admin-result-count {
          padding:6px 8px;
          border:1px solid #2c333e;
          border-radius:999px;
          color:#929baa;
          background:#151a22;
          font-size:8px;
          font-weight:850;
          white-space:nowrap;
        }

        .mc-admin-toolbar {
          display:grid;
          grid-template-columns:minmax(220px,1fr) auto auto;
          gap:8px;
          margin:18px 0 14px;
        }

        .mc-admin-search {
          display:flex;
          min-height:42px;
          align-items:center;
          gap:8px;
          padding:0 11px;
          border:1px solid #303743;
          border-radius:11px;
          color:#7d8897;
          background:#151a22;
        }

        .mc-admin-search:focus-within {
          border-color:rgba(74,156,255,.6);
          box-shadow:0 0 0 4px rgba(74,156,255,.08);
        }

        .mc-admin-search input {
          width:100%;
          border:0;
          outline:0;
          color:#f5f7fa;
          background:transparent;
          font:inherit;
          font-size:11px;
        }

        .mc-admin-search input::placeholder {
          color:#657080;
        }

        .mc-admin-filter {
          display:flex;
          gap:3px;
          padding:3px;
          border:1px solid rgba(255,255,255,.05);
          border-radius:10px;
          background:#11161e;
        }

        .mc-admin-filter button {
          min-height:34px;
          padding:0 9px;
          border:0;
          border-radius:8px;
          color:#798493;
          background:transparent;
          font:inherit;
          font-size:8px;
          font-weight:850;
          cursor:pointer;
        }

        .mc-admin-filter button.active {
          color:#e9edf3;
          background:#252c36;
        }

        .mc-admin-list {
          display:grid;
          gap:8px;
        }

        .mc-admin-client {
          display:grid;
          grid-template-columns:auto minmax(170px,1.2fr) minmax(110px,.65fr) minmax(140px,.75fr) auto;
          gap:12px;
          align-items:center;
          padding:12px;
          border:1px solid #252c35;
          border-radius:14px;
          background:#0d1117;
          transition:border-color .18s ease,background .18s ease;
        }

        .mc-admin-client:hover {
          border-color:#37414e;
          background:#10151c;
        }

        .mc-admin-avatar {
          display:grid;
          width:40px;
          height:40px;
          place-items:center;
          border:1px solid rgba(74,156,255,.16);
          border-radius:12px;
          color:#90c3ff;
          background:#14263a;
          font-size:10px;
          font-weight:900;
        }

        .mc-admin-client-main {
          min-width:0;
        }

        .mc-admin-client-main strong,
        .mc-admin-client-main span,
        .mc-admin-client-main small {
          display:block;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        }

        .mc-admin-client-main strong {
          color:#edf1f6;
          font-size:12px;
        }

        .mc-admin-client-main span {
          margin-top:2px;
          color:#8792a1;
          font-size:9px;
        }

        .mc-admin-client-main small {
          margin-top:4px;
          color:#596474;
          font-size:7px;
        }

        .mc-admin-status-wrap {
          display:grid;
          gap:5px;
        }

        .mc-admin-status {
          display:inline-flex;
          width:max-content;
          align-items:center;
          gap:6px;
          font-size:9px;
          font-weight:850;
        }

        .mc-admin-status i {
          width:6px;
          height:6px;
          border-radius:50%;
        }

        .mc-admin-status.active {
          color:#65df99;
        }

        .mc-admin-status.active i {
          background:#3ddc84;
          box-shadow:0 0 0 3px rgba(61,220,132,.11);
        }

        .mc-admin-status.inactive {
          color:#ffbd67;
        }

        .mc-admin-status.inactive i {
          background:#ffad42;
          box-shadow:0 0 0 3px rgba(255,173,66,.10);
        }

        .mc-admin-status.expired {
          color:#ff8b84;
        }

        .mc-admin-status.expired i {
          background:#ff6259;
        }

        .mc-admin-plan-badge {
          width:max-content;
          padding:4px 7px;
          border-radius:7px;
          font-size:7px;
          font-weight:900;
          letter-spacing:.04em;
          text-transform:uppercase;
        }

        .mc-admin-plan-badge.free {
          color:#a9b2bf;
          background:#202630;
        }

        .mc-admin-plan-badge.pro {
          color:#82bdff;
          background:#14263a;
        }

        .mc-admin-plan-badge.white-label {
          color:#c0adff;
          background:#211b39;
        }

        .mc-admin-plan-control {
          display:grid;
          gap:5px;
        }

        .mc-admin-plan-control label {
          color:#657080;
          font-size:7px;
          font-weight:850;
          text-transform:uppercase;
        }

        .mc-admin-plan-control select {
          width:100%;
          min-height:34px;
          padding:0 27px 0 9px;
          border:1px solid #303743;
          border-radius:9px;
          outline:0;
          color:#dce2e9;
          background:#151a22;
          font:inherit;
          font-size:9px;
          font-weight:750;
          color-scheme:dark;
        }

        .mc-admin-client-actions {
          display:flex;
          align-items:center;
          justify-content:flex-end;
          gap:6px;
        }

        .mc-admin-action {
          min-height:34px;
          padding:0 10px;
          border:0;
          border-radius:9px;
          font:inherit;
          font-size:8px;
          font-weight:900;
          cursor:pointer;
          white-space:nowrap;
        }

        .mc-admin-action.block {
          color:#ffc16b;
          background:rgba(255,173,66,.10);
        }

        .mc-admin-action.activate {
          color:#69df9c;
          background:rgba(61,220,132,.10);
        }

        .mc-admin-delete {
          display:grid;
          width:34px;
          height:34px;
          place-items:center;
          border:0;
          border-radius:9px;
          color:#747f8f;
          background:transparent;
          cursor:pointer;
        }

        .mc-admin-delete:hover {
          color:#ff7b73;
          background:rgba(255,98,89,.10);
        }

        .mc-admin-action:disabled,
        .mc-admin-delete:disabled,
        .mc-admin-plan-control select:disabled {
          cursor:wait;
          opacity:.5;
        }

        .mc-admin-empty {
          display:grid;
          min-height:240px;
          place-items:center;
          align-content:center;
          gap:8px;
          color:#758090;
          font-size:10px;
          text-align:center;
        }

        .mc-admin-empty strong {
          color:#c8d0da;
          font-size:12px;
        }

        .mc-admin-loader {
          width:25px;
          height:25px;
          border:3px solid #252c36;
          border-top-color:#4a9cff;
          border-radius:50%;
          animation:mc-admin-spin .8s linear infinite;
        }

        @keyframes mc-admin-spin {
          to {
            transform:rotate(360deg);
          }
        }

        .mc-admin-form-intro {
          margin:9px 0 18px;
          color:#7f8a99;
          font-size:10px;
          line-height:1.5;
        }

        .mc-admin-form {
          display:grid;
          gap:13px;
        }

        .mc-admin-field {
          display:grid;
          gap:6px;
        }

        .mc-admin-field label {
          color:#aeb7c3;
          font-size:9px;
          font-weight:800;
        }

        .mc-admin-field input,
        .mc-admin-field select {
          width:100%;
          min-height:43px;
          padding:0 11px;
          border:1px solid #303743;
          border-radius:10px;
          outline:0;
          color:#f5f7fa;
          background:#151a22;
          font:inherit;
          font-size:11px;
          color-scheme:dark;
        }

        .mc-admin-field input::placeholder {
          color:#616c7c;
        }

        .mc-admin-field input:focus,
        .mc-admin-field select:focus {
          border-color:rgba(74,156,255,.62);
          box-shadow:0 0 0 4px rgba(74,156,255,.08);
        }

        .mc-admin-form-row {
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:9px;
        }

        .mc-admin-submit {
          width:100%;
          min-height:46px;
          margin-top:2px;
        }

        .mc-admin-form-note {
          color:#606b7a;
          font-size:8px;
          line-height:1.45;
          text-align:center;
        }

        .mc-admin-create-tip {
          display:flex;
          align-items:flex-start;
          gap:9px;
          margin-top:16px;
          padding:11px;
          border:1px solid rgba(74,156,255,.13);
          border-radius:11px;
          color:#7e8b9b;
          background:rgba(74,156,255,.045);
          font-size:8px;
          line-height:1.5;
        }

        .mc-admin-create-tip .mc-admin-icon {
          width:15px;
          height:15px;
          color:#81baff;
        }

        @media (max-width:1180px) {
          .mc-admin-stats {
            grid-template-columns:repeat(3,minmax(0,1fr));
          }

          .mc-admin-main-grid {
            grid-template-columns:1fr;
          }

          .mc-admin-create {
            position:static;
            grid-row:1;
          }

          .mc-admin-client {
            grid-template-columns:auto minmax(160px,1fr) minmax(100px,.6fr) minmax(130px,.7fr);
          }

          .mc-admin-client-actions {
            grid-column:2 / -1;
          }
        }

        @media (max-width:820px) {
          .mc-admin-page {
            padding:10px 12px 32px;
          }

          .mc-admin-topbar {
            top:7px;
            min-height:60px;
            border-radius:15px;
          }

          .mc-admin-brand-copy small {
            display:none;
          }

          .mc-admin-nav a {
            padding-inline:8px;
            font-size:9px;
          }

          .mc-admin-logout {
            width:38px;
            min-width:38px;
            padding:0;
          }

          .mc-admin-logout span {
            display:none;
          }

          .mc-admin-hero {
            align-items:flex-start;
            flex-direction:column;
            padding-top:32px;
          }

          .mc-admin-hero-actions {
            width:100%;
          }

          .mc-admin-hero-actions .mc-admin-button {
            flex:1;
          }

          .mc-admin-stats {
            grid-template-columns:repeat(2,minmax(0,1fr));
          }

          .mc-admin-stat:first-child {
            grid-column:1 / -1;
          }

          .mc-admin-toolbar {
            grid-template-columns:1fr;
          }

          .mc-admin-filter {
            width:100%;
          }

          .mc-admin-filter button {
            flex:1;
          }

          .mc-admin-client {
            grid-template-columns:auto minmax(0,1fr);
          }

          .mc-admin-status-wrap,
          .mc-admin-plan-control,
          .mc-admin-client-actions {
            grid-column:2;
          }

          .mc-admin-client-actions {
            justify-content:flex-start;
          }
        }

        @media (max-width:560px) {
          .mc-admin-nav a:nth-child(3) {
            display:none;
          }

          .mc-admin-stats {
            grid-template-columns:1fr 1fr;
          }

          .mc-admin-stat {
            min-height:98px;
            padding:14px;
          }

          .mc-admin-directory,
          .mc-admin-create {
            padding:15px;
            border-radius:17px;
          }

          .mc-admin-panel-head {
            align-items:center;
          }

          .mc-admin-form-row {
            grid-template-columns:1fr;
          }

          .mc-admin-client {
            gap:10px;
          }

          .mc-admin-client-actions {
            grid-column:1 / -1;
          }

          .mc-admin-action {
            flex:1;
          }
        }
      `}</style>

      <header className="mc-admin-topbar">
        <Link
          className="mc-admin-brand"
          href="/admin/users"
        >
          <span className="mc-admin-brand-mark">
            MC
          </span>

          <span className="mc-admin-brand-copy">
            <strong>
              Menu Costing
            </strong>
            <small>
              Control Center
            </small>
          </span>
        </Link>

        <nav
          className="mc-admin-nav"
          aria-label="Super admin navigation"
        >
          <Link
            className="active"
            href="/admin/users"
          >
            Clients
          </Link>
          <Link href="/admin/analytics">
            Analytics
          </Link>

          <Link href="/admin/dishes">
            Dishes
          </Link>

          <Link href="/admin/recipes">
            Recipe Studio
          </Link>
        </nav>

        <button
          className="mc-admin-logout"
          onClick={logout}
          type="button"
        >
          <Icon name="logout" />
          <span>
            Sign out
          </span>
        </button>
      </header>

      <div className="mc-admin-container">
        <section className="mc-admin-hero">
          <div>
            <span className="mc-admin-overline">
              Menu Costing · Admin
            </span>

            <h1>
              Client control center
            </h1>

            <p>
              Manage caterer accounts, access status and subscription plans from one workspace.
            </p>
          </div>

          <div className="mc-admin-hero-actions">
            <button
              className="mc-admin-button secondary"
              disabled={loading}
              onClick={() =>
                void loadUsers()
              }
              type="button"
            >
              <Icon name="refresh" />
              Refresh
            </button>

            <a
              className="mc-admin-button primary"
              href="#new-client"
            >
              <Icon name="plus" />
              Add client
            </a>
          </div>
        </section>

        <section
          className="mc-admin-stats"
          aria-label="Client summary"
        >
          <div className="mc-admin-stat">
            <span className="mc-admin-stat-icon">
              <Icon name="users" />
            </span>
            <div>
              <small>
                Total clients
              </small>
              <strong>
                {counts.total}
              </strong>
              <span>
                All tenant accounts
              </span>
            </div>
          </div>

          <div className="mc-admin-stat">
            <span className="mc-admin-stat-icon green">
              <Icon name="active" />
            </span>
            <div>
              <small>
                Active
              </small>
              <strong>
                {counts.active}
              </strong>
              <span>
                Can access the app
              </span>
            </div>
          </div>

          <div className="mc-admin-stat">
            <span className="mc-admin-stat-icon">
              <Icon name="free" />
            </span>
            <div>
              <small>
                Free plan
              </small>
              <strong>
                {counts.free}
              </strong>
              <span>
                Free accounts
              </span>
            </div>
          </div>

          <div className="mc-admin-stat">
            <span className="mc-admin-stat-icon purple">
              <Icon name="pro" />
            </span>
            <div>
              <small>
                Pro plan
              </small>
              <strong>
                {counts.pro}
              </strong>
              <span>
                Pro accounts
              </span>
            </div>
          </div>

          <div className="mc-admin-stat">
            <span className="mc-admin-stat-icon orange">
              <Icon name="recent" />
            </span>
            <div>
              <small>
                New · 7 days
              </small>
              <strong>
                {counts.recent}
              </strong>
              <span>
                Recent signups
              </span>
            </div>
          </div>
        </section>

        {error ? (
          <div
            className="mc-admin-message error"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        {notice ? (
          <div
            className="mc-admin-message success"
            role="status"
          >
            {notice}
          </div>
        ) : null}

        <section className="mc-admin-main-grid">
          <div className="mc-admin-panel mc-admin-directory">
            <div className="mc-admin-panel-head">
              <div>
                <span className="mc-admin-overline">
                  Client directory
                </span>

                <h2>
                  All accounts
                </h2>
              </div>

              <span className="mc-admin-result-count">
                {filteredUsers.length} shown
              </span>
            </div>

            <div className="mc-admin-toolbar">
              <label className="mc-admin-search">
                <Icon name="search" />
                <input
                  value={query}
                  onChange={(event) =>
                    setQuery(
                      event.target.value,
                    )
                  }
                  placeholder="Search company or email"
                  aria-label="Search clients"
                />
              </label>

              <div
                className="mc-admin-filter"
                aria-label="Filter by status"
              >
                {[
                  ['ALL', 'All'],
                  ['ACTIVE', 'Active'],
                  ['INACTIVE', 'Blocked'],
                  ['EXPIRED', 'Expired'],
                ].map(
                  ([value, label]) => (
                    <button
                      key={value}
                      className={
                        statusFilter === value
                          ? 'active'
                          : ''
                      }
                      onClick={() =>
                        setStatusFilter(
                          value,
                        )
                      }
                      type="button"
                    >
                      {label}
                    </button>
                  ),
                )}
              </div>

              <div
                className="mc-admin-filter"
                aria-label="Filter by plan"
              >
                {[
                  ['ALL', 'All plans'],
                  ['FREE', 'Free'],
                  ['PRO', 'Pro'],
                ].map(
                  ([value, label]) => (
                    <button
                      key={value}
                      className={
                        planFilter === value
                          ? 'active'
                          : ''
                      }
                      onClick={() =>
                        setPlanFilter(
                          value,
                        )
                      }
                      type="button"
                    >
                      {label}
                    </button>
                  ),
                )}
              </div>
            </div>

            {loading ? (
              <div className="mc-admin-empty">
                <span className="mc-admin-loader" />
                Loading clients…
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="mc-admin-empty">
                <strong>
                  No clients found
                </strong>
                <span>
                  Change the search or filters to see more accounts.
                </span>
              </div>
            ) : (
              <div className="mc-admin-list">
                {filteredUsers.map(
                  (user) => {
                    const isActive =
                      user.status ===
                      'ACTIVE';

                    const statusClass =
                      user.status ===
                      'ACTIVE'
                        ? 'active'
                        : user.status ===
                            'EXPIRED'
                          ? 'expired'
                          : 'inactive';

                    return (
                      <article
                        className="mc-admin-client"
                        key={user.id}
                      >
                        <div className="mc-admin-avatar">
                          {initials(
                            user.name,
                          )}
                        </div>

                        <div className="mc-admin-client-main">
                          <strong>
                            {user.name}
                          </strong>

                          <span>
                            {user.email}
                          </span>

                          <small>
                            Added{' '}
                            {formatDate(
                              user.createdAt,
                            )}
                          </small>
                        </div>

                        <div className="mc-admin-status-wrap">
                          <span
                            className={`mc-admin-status ${statusClass}`}
                          >
                            <i />
                            {statusLabel(
                              user.status,
                            )}
                          </span>

                          <span
                            className={`mc-admin-plan-badge ${planClass(
                              user.plan,
                            )}`}
                          >
                            {planLabel(
                              user.plan,
                            )}
                          </span>
                        </div>

                        <div className="mc-admin-plan-control">
                          <label
                            htmlFor={`plan-${user.id}`}
                          >
                            Change plan
                          </label>

                          <select
                            id={`plan-${user.id}`}
                            value={user.plan}
                            disabled={
                              workingId ===
                              user.id
                            }
                            onChange={(event) =>
                              void updatePlan(
                                user,
                                event.target
                                  .value,
                              )
                            }
                          >
                            <option value="FREE">
                              Free
                            </option>
                            <option value="PRO">
                              Pro · ₹999/month
                            </option>
                            <option value="WHITE_LABEL">
                              White Label
                            </option>
                          </select>
                        </div>

                        <div className="mc-admin-client-actions">
                          <button
                            className={`mc-admin-action ${
                              isActive
                                ? 'block'
                                : 'activate'
                            }`}
                            disabled={
                              workingId ===
                              user.id
                            }
                            onClick={() =>
                              void updateStatus(
                                user,
                              )
                            }
                            type="button"
                          >
                            {isActive
                              ? 'Block'
                              : 'Activate'}
                          </button>

                          <button
                            className="mc-admin-delete"
                            aria-label={`Delete ${user.name}`}
                            disabled={
                              workingId ===
                              user.id
                            }
                            onClick={() =>
                              void deleteUser(
                                user,
                              )
                            }
                            type="button"
                          >
                            <Icon name="trash" />
                          </button>
                        </div>
                      </article>
                    );
                  },
                )}
              </div>
            )}
          </div>

          <aside
            className="mc-admin-panel mc-admin-create"
            id="new-client"
          >
            <div className="mc-admin-panel-head">
              <div>
                <span className="mc-admin-overline">
                  Manual account
                </span>

                <h2>
                  Add a client
                </h2>
              </div>
            </div>

            <p className="mc-admin-form-intro">
              Create a tenant manually when you need to provision an account from the admin console.
            </p>

            <form
              className="mc-admin-form"
              onSubmit={createUser}
            >
              <div className="mc-admin-field">
                <label htmlFor="client-name">
                  Client / company name
                </label>

                <input
                  id="client-name"
                  required
                  value={form.name}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      name: event.target
                        .value,
                    })
                  }
                  placeholder="e.g. Kalash Caterers"
                />
              </div>

              <div className="mc-admin-field">
                <label htmlFor="client-email">
                  Login email
                </label>

                <input
                  id="client-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      email:
                        event.target
                          .value,
                    })
                  }
                  placeholder="client@company.com"
                />
              </div>

              <div className="mc-admin-field">
                <label htmlFor="client-password">
                  Temporary password
                </label>

                <input
                  id="client-password"
                  type="password"
                  minLength={6}
                  required
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      password:
                        event.target
                          .value,
                    })
                  }
                  placeholder="Minimum 6 characters"
                />
              </div>

              <div className="mc-admin-form-row">
                <div className="mc-admin-field">
                  <label htmlFor="client-plan">
                    Plan
                  </label>

                  <select
                    id="client-plan"
                    value={form.plan}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        plan:
                          event.target
                            .value,
                      })
                    }
                  >
                    <option value="FREE">
                      Free
                    </option>
                    <option value="PRO">
                      Pro · ₹999/month
                    </option>
                    <option value="WHITE_LABEL">
                      White Label
                    </option>
                  </select>
                </div>

                <div className="mc-admin-field">
                  <label htmlFor="client-status">
                    Access
                  </label>

                  <select
                    id="client-status"
                    value={form.status}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        status:
                          event.target
                            .value,
                      })
                    }
                  >
                    <option value="ACTIVE">
                      Active
                    </option>
                    <option value="INACTIVE">
                      Blocked
                    </option>
                  </select>
                </div>
              </div>

              <button
                className="mc-admin-button primary mc-admin-submit"
                type="submit"
                disabled={saving}
              >
                {saving ? (
                  'Creating client…'
                ) : (
                  <>
                    <Icon name="plus" />
                    Create client account
                  </>
                )}
              </button>

              <small className="mc-admin-form-note">
                Active accounts can sign in immediately.
              </small>
            </form>

            <div className="mc-admin-create-tip">
              <Icon name="shield" />
              <span>
                Public customers can still use the normal signup flow. This form is for admin-created accounts and support cases.
              </span>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
