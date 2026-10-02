'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

import AppShell from '../../components/AppShell';

type CatererUser = {
  id: string;
  name: string;
  email: string;
  plan: string;
  status: string;
  ownerName: string;
  phone: string;
  city: string;
  onboardingCompleted: boolean;
  createdAt: string;
  _count?: {
    works: number;
    costingHistory: number;
    quotations: number;
  };
};

type Draft = {
  businessName: string;
  ownerName: string;
  userId: string;
  phone: string;
  city: string;
  plan: string;
  password: string;
};

const EMPTY_DRAFT: Draft = {
  businessName: '',
  ownerName: '',
  userId: '',
  phone: '',
  city: '',
  plan: 'PRO',
  password: '',
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function makePassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const values = new Uint32Array(14);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join('');
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<CatererUser[]>([]);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedId, setSelectedId] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    void loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/users', { cache: 'no-store' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Could not load caterer accounts');
      }

      const rows = Array.isArray(data.users) ? data.users as CatererUser[] : [];
      setUsers(rows);
      setSelectedId((current) =>
        rows.some((row) => row.id === current)
          ? current
          : rows[0]?.id || '',
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load caterer accounts');
    } finally {
      setLoading(false);
    }
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Could not create account');
      }

      setDraft(EMPTY_DRAFT);
      setMessage(`${data.user.name} account created. The user can now sign in with User ID: ${data.user.email}`);
      await loadUsers();
      setSelectedId(data.user.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create account');
    } finally {
      setSaving(false);
    }
  }

  async function patchUser(id: string, patch: Record<string, unknown>, successMessage: string) {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Could not update account');
      }

      setUsers((current) =>
        current.map((row) => row.id === id ? data.user as CatererUser : row),
      );
      setMessage(successMessage);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update account');
    } finally {
      setSaving(false);
    }
  }

  const selected = users.find((user) => user.id === selectedId) || null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return users.filter((user) => {
      const matchesStatus =
        statusFilter === 'ALL' ||
        user.status === statusFilter;

      const matchesQuery =
        !q ||
        [
          user.name,
          user.ownerName,
          user.email,
          user.phone,
          user.city,
        ]
          .join(' ')
          .toLowerCase()
          .includes(q);

      return matchesStatus && matchesQuery;
    });
  }, [query, statusFilter, users]);

  const activeCount = users.filter((user) => user.status === 'ACTIVE').length;
  const disabledCount = users.length - activeCount;

  return (
    <AppShell
      title="Caterer Accounts"
      subtitle="Create and control tenant workspaces"
      hidePageTitle
    >
      <section className="au-page">
        <style>{`
          .au-page{display:grid;gap:14px;color:#edf3f9}
          .au-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;padding:14px 2px 4px}
          .au-hero small{display:block;color:#78b5ff;font-size:9px;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
          .au-hero h1{margin:5px 0 5px;font-size:clamp(30px,4vw,44px);line-height:1;letter-spacing:-.05em}
          .au-hero p{margin:0;color:#8492a4;font-size:11px}
          .au-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
          .au-stat{padding:13px;border:1px solid #29323d;border-radius:14px;background:#10161e}
          .au-stat span,.au-stat b,.au-stat small{display:block}.au-stat span{color:#758397;font-size:8px;font-weight:850;text-transform:uppercase}.au-stat b{margin:5px 0 2px;font-size:21px}.au-stat small{color:#667487;font-size:8px}
          .au-layout{display:grid;grid-template-columns:minmax(0,1.35fr) 390px;gap:12px;align-items:start}
          .au-panel{border:1px solid #29323d;border-radius:15px;background:#10161e;overflow:hidden}
          .au-toolbar{display:grid;grid-template-columns:1fr 150px;gap:8px;padding:11px;border-bottom:1px solid #252d37}
          .au-input,.au-select{width:100%;min-height:38px;padding:0 10px;border:1px solid #303a47;border-radius:9px;outline:0;color:#e1e9f2;background:#151d27;font:inherit;font-size:10px}
          .au-list{display:grid}.au-user{display:grid;grid-template-columns:42px minmax(0,1fr) auto;gap:10px;align-items:center;padding:11px;border:0;border-bottom:1px solid rgba(148,163,184,.08);color:inherit;background:transparent;text-align:left;cursor:pointer}
          .au-user:last-child{border-bottom:0}.au-user:hover,.au-user.active{background:rgba(74,156,255,.045)}.au-avatar{display:grid;width:42px;height:42px;place-items:center;border-radius:12px;color:#9bc9ff;background:rgba(74,156,255,.09);font-size:11px;font-weight:900}
          .au-user-copy b,.au-user-copy span,.au-user-copy small{display:block}.au-user-copy b{font-size:11px}.au-user-copy span{margin-top:2px;color:#8491a2;font-size:8px}.au-user-copy small{margin-top:4px;color:#657487;font-size:7px}
          .au-status{padding:5px 7px;border-radius:999px;color:#9fe2bb;background:rgba(98,217,149,.07);font-size:7px;font-weight:900}.au-status.disabled{color:#e7a1a1;background:rgba(255,100,100,.07)}
          .au-editor{padding:14px}.au-editor h2{margin:0;font-size:17px}.au-editor>p{margin:4px 0 13px;color:#758397;font-size:9px}
          .au-form{display:grid;grid-template-columns:1fr 1fr;gap:9px}.au-field{display:grid;gap:5px}.au-field.full{grid-column:1/-1}.au-field>span{color:#7b899b;font-size:8px;font-weight:850;text-transform:uppercase}
          .au-password{display:grid;grid-template-columns:1fr auto;gap:6px}.au-button{min-height:38px;padding:0 11px;border:1px solid #303a47;border-radius:9px;color:#bdc8d5;background:#171f29;font:inherit;font-size:9px;font-weight:900;cursor:pointer}.au-button.primary{border-color:#1478f2;color:#fff;background:#1478f2}.au-button.danger{border-color:rgba(255,110,110,.18);color:#ffaaa5;background:rgba(255,110,110,.045)}
          .au-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:13px;padding-top:12px;border-top:1px solid #252d37}
          .au-msg{padding:10px 12px;border:1px solid rgba(98,217,149,.18);border-radius:10px;color:#9fe2bb;background:rgba(98,217,149,.045);font-size:9px}.au-msg.error{border-color:rgba(255,110,110,.18);color:#ffaaa5;background:rgba(255,110,110,.045)}
          .au-create{padding:14px;border-top:1px solid #252d37;background:#0d141c}.au-create h3{margin:0 0 4px;font-size:13px}.au-create>p{margin:0 0 12px;color:#718094;font-size:8px}.au-empty{padding:42px 15px;color:#748294;text-align:center;font-size:10px}
          @media(max-width:1050px){.au-layout{grid-template-columns:1fr}.au-stats{grid-template-columns:repeat(2,1fr)}}
          @media(max-width:680px){.au-hero{align-items:stretch;flex-direction:column}.au-toolbar,.au-form{grid-template-columns:1fr}.au-field.full{grid-column:auto}.au-stats{grid-template-columns:1fr 1fr}}
        `}</style>

        <header className="au-hero">
          <div>
            <small>Super Admin · Multi-tenant control</small>
            <h1>Caterer Accounts</h1>
            <p>Create one isolated workspace for every catering business and control access centrally.</p>
          </div>
          <button
            className="au-button primary"
            type="button"
            onClick={() =>
              document.getElementById('add-caterer-account')?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
              })
            }
          >
            + Add Caterer
          </button>
        </header>

        <section className="au-stats">
          <article className="au-stat"><span>Total caterers</span><b>{users.length}</b><small>Tenant workspaces</small></article>
          <article className="au-stat"><span>Active</span><b>{activeCount}</b><small>Can sign in</small></article>
          <article className="au-stat"><span>Disabled</span><b>{disabledCount}</b><small>Login blocked</small></article>
          <article className="au-stat"><span>Total events</span><b>{users.reduce((sum, user) => sum + (user._count?.costingHistory || 0), 0)}</b><small>Completed costings</small></article>
        </section>

        {message ? <div className="au-msg">{message}</div> : null}
        {error ? <div className="au-msg error">{error}</div> : null}

        <div className="au-layout">
          <section className="au-panel">
            <div className="au-toolbar">
              <input
                className="au-input"
                value={query}
                placeholder="Search business, owner, User ID, city…"
                onChange={(event) => setQuery(event.target.value)}
              />
              <select
                className="au-select"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="ALL">All accounts</option>
                <option value="ACTIVE">Active</option>
                <option value="DISABLED">Disabled</option>
              </select>
            </div>

            {loading ? (
              <div className="au-empty">Loading caterer accounts…</div>
            ) : filtered.length ? (
              <div className="au-list">
                {filtered.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    className={selectedId === user.id ? 'au-user active' : 'au-user'}
                    onClick={() => {
                      setSelectedId(user.id);
                      setResetPassword('');
                    }}
                  >
                    <span className="au-avatar">
                      {(user.name || 'CA').slice(0, 2).toUpperCase()}
                    </span>
                    <span className="au-user-copy">
                      <b>{user.name}</b>
                      <span>{user.email} · {user.ownerName || 'Owner not set'}</span>
                      <small>{user.city || 'City not set'} · Created {formatDate(user.createdAt)}</small>
                    </span>
                    <span className={user.status === 'ACTIVE' ? 'au-status' : 'au-status disabled'}>
                      {user.status === 'ACTIVE' ? 'ACTIVE' : 'DISABLED'}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="au-empty">No caterer accounts match this filter.</div>
            )}

            <form
              id="add-caterer-account"
              className="au-create"
              onSubmit={createUser}
            >
              <h3>Add new caterer account</h3>
              <p>The password is securely hashed before it is stored. You will not be able to view it later.</p>

              <div className="au-form">
                <label className="au-field full">
                  <span>Business Name</span>
                  <input className="au-input" required value={draft.businessName} onChange={(event) => setDraft({ ...draft, businessName: event.target.value })} placeholder="e.g. Shree Caterers" />
                </label>
                <label className="au-field">
                  <span>Owner Name</span>
                  <input className="au-input" value={draft.ownerName} onChange={(event) => setDraft({ ...draft, ownerName: event.target.value })} placeholder="Owner name" />
                </label>
                <label className="au-field">
                  <span>User ID / Email</span>
                  <input className="au-input" required value={draft.userId} onChange={(event) => setDraft({ ...draft, userId: event.target.value })} placeholder="shreecaterers" />
                </label>
                <label className="au-field">
                  <span>Phone</span>
                  <input className="au-input" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} placeholder="+91…" />
                </label>
                <label className="au-field">
                  <span>City</span>
                  <input className="au-input" value={draft.city} onChange={(event) => setDraft({ ...draft, city: event.target.value })} placeholder="Silvassa" />
                </label>
                <label className="au-field">
                  <span>Plan</span>
                  <select className="au-select" value={draft.plan} onChange={(event) => setDraft({ ...draft, plan: event.target.value })}>
                    <option value="PRO">PRO</option>
                    <option value="STARTER">STARTER</option>
                    <option value="FREE">FREE</option>
                    <option value="WHITE_LABEL">WHITE LABEL</option>
                  </select>
                </label>
                <label className="au-field full">
                  <span>Initial Password</span>
                  <div className="au-password">
                    <input className="au-input" minLength={8} required value={draft.password} onChange={(event) => setDraft({ ...draft, password: event.target.value })} placeholder="Minimum 8 characters" />
                    <button className="au-button" type="button" onClick={() => setDraft({ ...draft, password: makePassword() })}>Generate</button>
                  </div>
                </label>
              </div>

              <div className="au-actions">
                <button className="au-button primary" disabled={saving} type="submit">
                  {saving ? 'Creating…' : 'Create Account'}
                </button>
              </div>
            </form>
          </section>

          <aside className="au-panel">
            {selected ? (
              <div className="au-editor">
                <h2>{selected.name}</h2>
                <p>{selected.email} · {selected.city || 'No city'} · {selected.plan}</p>

                <div className="au-form">
                  <label className="au-field full">
                    <span>Business Name</span>
                    <input className="au-input" value={selected.name} onChange={(event) => setUsers((current) => current.map((row) => row.id === selected.id ? { ...row, name: event.target.value } : row))} />
                  </label>
                  <label className="au-field">
                    <span>Owner</span>
                    <input className="au-input" value={selected.ownerName} onChange={(event) => setUsers((current) => current.map((row) => row.id === selected.id ? { ...row, ownerName: event.target.value } : row))} />
                  </label>
                  <label className="au-field">
                    <span>User ID</span>
                    <input className="au-input" value={selected.email} onChange={(event) => setUsers((current) => current.map((row) => row.id === selected.id ? { ...row, email: event.target.value } : row))} />
                  </label>
                  <label className="au-field">
                    <span>Phone</span>
                    <input className="au-input" value={selected.phone} onChange={(event) => setUsers((current) => current.map((row) => row.id === selected.id ? { ...row, phone: event.target.value } : row))} />
                  </label>
                  <label className="au-field">
                    <span>City</span>
                    <input className="au-input" value={selected.city} onChange={(event) => setUsers((current) => current.map((row) => row.id === selected.id ? { ...row, city: event.target.value } : row))} />
                  </label>
                  <label className="au-field full">
                    <span>Plan</span>
                    <select className="au-select" value={selected.plan} onChange={(event) => setUsers((current) => current.map((row) => row.id === selected.id ? { ...row, plan: event.target.value } : row))}>
                      <option value="PRO">PRO</option>
                      <option value="STARTER">STARTER</option>
                      <option value="FREE">FREE</option>
                      <option value="WHITE_LABEL">WHITE LABEL</option>
                    </select>
                  </label>
                </div>

                <div className="au-actions">
                  <button
                    className="au-button primary"
                    type="button"
                    disabled={saving}
                    onClick={() => void patchUser(
                      selected.id,
                      {
                        businessName: selected.name,
                        ownerName: selected.ownerName,
                        userId: selected.email,
                        phone: selected.phone,
                        city: selected.city,
                        plan: selected.plan,
                      },
                      'Account details saved.',
                    )}
                  >
                    Save Details
                  </button>
                  <button
                    className={selected.status === 'ACTIVE' ? 'au-button danger' : 'au-button'}
                    type="button"
                    disabled={saving}
                    onClick={() => void patchUser(
                      selected.id,
                      { status: selected.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' },
                      selected.status === 'ACTIVE' ? 'Account disabled.' : 'Account activated.',
                    )}
                  >
                    {selected.status === 'ACTIVE' ? 'Disable Login' : 'Activate Login'}
                  </button>
                </div>

                <div style={{marginTop:14,paddingTop:13,borderTop:'1px solid #252d37'}}>
                  <label className="au-field">
                    <span>Reset Password</span>
                    <div className="au-password">
                      <input
                        className="au-input"
                        minLength={8}
                        value={resetPassword}
                        placeholder="New password"
                        onChange={(event) => setResetPassword(event.target.value)}
                      />
                      <button className="au-button" type="button" onClick={() => setResetPassword(makePassword())}>Generate</button>
                    </div>
                  </label>
                  <div className="au-actions">
                    <button
                      className="au-button"
                      type="button"
                      disabled={saving || resetPassword.length < 8}
                      onClick={() => void patchUser(
                        selected.id,
                        { password: resetPassword },
                        'Password reset successfully.',
                      ).then(() => setResetPassword(''))}
                    >
                      Save New Password
                    </button>
                  </div>
                </div>

                <div style={{marginTop:14,paddingTop:13,borderTop:'1px solid #252d37',display:'grid',gap:7}}>
                  <small style={{color:'#758397'}}>Workspace usage</small>
                  <div className="au-stats" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
                    <article className="au-stat"><span>Saved work</span><b>{selected._count?.works || 0}</b></article>
                    <article className="au-stat"><span>Events</span><b>{selected._count?.costingHistory || 0}</b></article>
                    <article className="au-stat"><span>Quotes</span><b>{selected._count?.quotations || 0}</b></article>
                  </div>
                </div>
              </div>
            ) : (
              <div className="au-empty">Select a caterer account to manage it.</div>
            )}
          </aside>
        </div>
      </section>
    </AppShell>
  );
}
