'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SESSION_KEY } from '../../../lib/store';

type ClientUser = {
  id: string;
  name: string;
  email: string;
  plan: string;
  status: string;
  createdAt: string;
};

const initialForm = {
  name: '',
  email: '',
  password: '',
  plan: 'PRO',
  status: 'ACTIVE',
};

function Icon({ name }: { name: 'users' | 'active' | 'blocked' | 'search' | 'plus' | 'logout' | 'trash' }) {
  const paths = {
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    active: <><path d="M20 6 9 17l-5-5"/></>,
    blocked: <><circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3M21 19V5a2 2 0 0 0-2-2h-6"/></>,
    trash: <><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5"/></>,
  };

  return <svg aria-hidden="true" className="admin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
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
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    try {
      const sessionRaw = localStorage.getItem(SESSION_KEY);
      const session = sessionRaw ? JSON.parse(sessionRaw) : null;
      if (!session || session.role !== 'ADMIN') {
        router.push('/login');
        return;
      }
      void loadUsers();
    } catch {
      router.push('/login');
    }
  }, [router]);

  const counts = useMemo(() => ({
    total: users.length,
    active: users.filter((user) => user.status === 'ACTIVE').length,
    inactive: users.filter((user) => user.status !== 'ACTIVE').length,
  }), [users]);

  const filteredUsers = useMemo(() => {
    const search = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesStatus = statusFilter === 'ALL' || user.status === statusFilter;
      const matchesSearch = !search || user.name.toLowerCase().includes(search) || user.email.toLowerCase().includes(search);
      return matchesStatus && matchesSearch;
    });
  }, [query, statusFilter, users]);

  async function loadUsers() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to load users');
        return;
      }
      setUsers(data.users || []);
    } catch {
      setError('Server connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create user');
        return;
      }
      setForm(initialForm);
      setNotice(`${form.name.trim()} can now sign in.`);
      await loadUsers();
    } catch {
      setError('Server connection failed. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(user: ClientUser) {
    const nextStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setWorkingId(user.id);
    setError('');
    setNotice('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, status: nextStatus }),
      });
      if (!res.ok) throw new Error();
      setNotice(`${user.name} is now ${nextStatus === 'ACTIVE' ? 'active' : 'blocked'}.`);
      await loadUsers();
    } catch {
      setError('Could not update this client. Please try again.');
    } finally {
      setWorkingId('');
    }
  }

  async function deleteUser(user: ClientUser) {
    if (!confirm(`Delete ${user.name}? Their saved work will also be deleted.`)) return;
    setWorkingId(user.id);
    setError('');
    setNotice('');
    try {
      const res = await fetch(`/api/admin/users?id=${user.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setNotice(`${user.name} was deleted.`);
      await loadUsers();
    } catch {
      setError('Could not delete this client. Please try again.');
    } finally {
      setWorkingId('');
    }
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    fetch('/api/admin/session', { method: 'DELETE' }).finally(() => router.push('/login'));
  }

  return (
    <main className="page-shell admin-page">
      <header className="admin-topbar">
        <div className="admin-brand">
          <span className="admin-brand-mark">MC</span>
          <div><strong>MenuCost</strong><small>Super Admin Console</small></div>
        </div>
        <nav className="admin-nav" aria-label="Super admin navigation">
          <Link className="active" href="/admin/users">Clients</Link>
          <Link href="/admin/dishes">Dish catalog</Link>
        </nav>
        <button className="admin-logout" onClick={logout}><Icon name="logout" /> Sign out</button>
      </header>

      <div className="admin-container">
        <section className="admin-welcome">
          <div>
            <span className="admin-overline">Workspace overview</span>
            <h1>Client management</h1>
            <p>Create accounts, control access, and see the health of your client workspace.</p>
          </div>
          <a className="primary-button" href="#new-client"><Icon name="plus" /> Add new client</a>
        </section>

        <section className="admin-stats" aria-label="Client summary">
          <div className="admin-stat"><span className="admin-stat-icon blue"><Icon name="users" /></span><div><small>Total clients</small><strong>{counts.total}</strong><p>All accounts</p></div></div>
          <div className="admin-stat"><span className="admin-stat-icon green"><Icon name="active" /></span><div><small>Active clients</small><strong>{counts.active}</strong><p>Can sign in</p></div></div>
          <div className="admin-stat"><span className="admin-stat-icon orange"><Icon name="blocked" /></span><div><small>Blocked clients</small><strong>{counts.inactive}</strong><p>Access paused</p></div></div>
        </section>

        {error ? <div className="admin-message error" role="alert">{error}</div> : null}
        {notice ? <div className="admin-message success" role="status">{notice}</div> : null}

        <section className="admin-layout">
          <div className="admin-client-panel">
            <div className="admin-panel-heading">
              <div><span className="admin-overline">Directory</span><h2>All clients</h2></div>
              <span className="admin-result-count">{filteredUsers.length} shown</span>
            </div>

            <div className="admin-toolbar">
              <label className="admin-search"><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search company or email" aria-label="Search clients" /></label>
              <div className="admin-filter" aria-label="Filter by status">
                {['ALL', 'ACTIVE', 'INACTIVE'].map((status) => <button key={status} className={statusFilter === status ? 'active' : ''} onClick={() => setStatusFilter(status)}>{status === 'ALL' ? 'All' : status === 'ACTIVE' ? 'Active' : 'Blocked'}</button>)}
              </div>
            </div>

            {loading ? <div className="admin-empty"><span className="admin-loader" />Loading clients…</div> : filteredUsers.length === 0 ? <div className="admin-empty"><strong>No clients found</strong><span>Try changing your search or filter.</span></div> : (
              <div className="admin-client-list">
                {filteredUsers.map((user) => {
                  const isActive = user.status === 'ACTIVE';
                  return <article className="admin-client-card" key={user.id}>
                    <div className="admin-avatar">{user.name.trim().slice(0, 2).toUpperCase()}</div>
                    <div className="admin-client-main"><strong>{user.name}</strong><span>{user.email}</span><small>Added {new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</small></div>
                    <div className="admin-client-meta"><span className={`admin-status ${isActive ? 'active' : 'inactive'}`}><i />{isActive ? 'Active' : 'Blocked'}</span><span className="admin-plan">{user.plan === 'WHITE_LABEL' ? 'White Label' : 'Pro'}</span></div>
                    <div className="admin-card-actions">
                      <button className={isActive ? 'admin-action block' : 'admin-action activate'} disabled={workingId === user.id} onClick={() => updateStatus(user)}>{isActive ? 'Block access' : 'Activate'}</button>
                      <button className="admin-delete" aria-label={`Delete ${user.name}`} disabled={workingId === user.id} onClick={() => deleteUser(user)}><Icon name="trash" /></button>
                    </div>
                  </article>;
                })}
              </div>
            )}
          </div>

          <aside className="admin-create-panel" id="new-client">
            <div className="admin-panel-heading"><div><span className="admin-overline">New account</span><h2>Add a client</h2></div></div>
            <p className="admin-form-intro">Create secure login details for a new catering client.</p>
            <form className="admin-form" onSubmit={createUser}>
              <div className="field"><label htmlFor="client-name">Client / company name</label><input id="client-name" className="input" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Kalash Caterers" /></div>
              <div className="field"><label htmlFor="client-email">Login email</label><input id="client-email" className="input" type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="client@company.com" /></div>
              <div className="field"><label htmlFor="client-password">Temporary password</label><input id="client-password" className="input" type="password" minLength={6} required autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Minimum 6 characters" /></div>
              <div className="admin-form-row">
                <div className="field"><label htmlFor="client-plan">Plan</label><select id="client-plan" className="select" value={form.plan} onChange={(event) => setForm({ ...form, plan: event.target.value })}><option value="PRO">Pro · ₹999/month</option><option value="WHITE_LABEL">White Label</option></select></div>
                <div className="field"><label htmlFor="client-status">Access</label><select id="client-status" className="select" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="ACTIVE">Active</option><option value="INACTIVE">Blocked</option></select></div>
              </div>
              <button className="primary-button full admin-submit" type="submit" disabled={saving}>{saving ? 'Creating client…' : <><Icon name="plus" /> Create client account</>}</button>
              <small className="admin-form-note">The client can sign in immediately when access is active.</small>
            </form>
          </aside>
        </section>
      </div>
    </main>
  );
}
