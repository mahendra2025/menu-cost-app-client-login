'use client';

import { FormEvent, useEffect, useState } from 'react';
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

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<ClientUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    plan: 'PRO',
    status: 'ACTIVE',
  });

  useEffect(() => {
    const sessionRaw = localStorage.getItem(SESSION_KEY);
    const session = sessionRaw ? JSON.parse(sessionRaw) : null;

    if (!session || session.role !== 'ADMIN') {
      router.push('/login');
      return;
    }

    loadUsers();
  }, [router]);

  async function loadUsers() {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to load users');
        return;
      }

      setUsers(data.users || []);
    } catch {
      setError('Server connection failed');
    } finally {
      setLoading(false);
    }
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');

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

      setForm({
        name: '',
        email: '',
        password: '',
        plan: 'PRO',
        status: 'ACTIVE',
      });

      await loadUsers();
    } catch {
      setError('Server connection failed');
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });

    await loadUsers();
  }

  async function deleteUser(id: string) {
    const ok = confirm('Delete this client user? Their saved work will also be deleted.');
    if (!ok) return;

    await fetch(`/api/admin/users?id=${id}`, {
      method: 'DELETE',
    });

    await loadUsers();
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    fetch('/api/admin/session', { method: 'DELETE' }).finally(() => {
      router.push('/login');
    });
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Super Admin</p>
          <h1>Client User Control</h1>
          <p className="muted">
            Create client login ID and password. Active clients can login. Inactive clients cannot login.
          </p>
        </div>

        <button className="secondary-button" onClick={logout}>
          Logout
        </button>
      </section>

      {error ? <div className="alert-card">{error}</div> : null}

      <section className="panel" style={{ marginBottom: 20 }}>
        <h2>Add New Client</h2>

        <form className="form-grid" onSubmit={createUser}>
          <div className="field">
            <label>Client / Company Name</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Kalash Caterers"
            />
          </div>

          <div className="field">
            <label>User ID / Email</label>
            <input
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="client@test.com"
            />
          </div>

          <div className="field">
            <label>Password</label>
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="123456"
            />
          </div>

          <div className="field">
            <label>Plan</label>
            <select
              className="input"
              value={form.plan}
              onChange={(e) => setForm({ ...form, plan: e.target.value })}
            >
              <option value="PRO">PRO ₹999/month</option>
              <option value="WHITE_LABEL">WHITE LABEL</option>
            </select>
          </div>

          <div className="field">
            <label>Status</label>
            <select
              className="input"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>

          <button className="primary-button full" type="submit" disabled={saving}>
            {saving ? 'Creating...' : 'Create Client User'}
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>All Client Users</h2>

        {loading ? (
          <p className="muted">Loading users...</p>
        ) : users.length === 0 ? (
          <p className="muted">No client users yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: 12 }}>Client</th>
                  <th style={{ textAlign: 'left', padding: 12 }}>User ID</th>
                  <th style={{ textAlign: 'left', padding: 12 }}>Plan</th>
                  <th style={{ textAlign: 'left', padding: 12 }}>Status</th>
                  <th style={{ textAlign: 'left', padding: 12 }}>Action</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => (
                  <tr key={user.id} style={{ borderTop: '1px solid rgba(148,163,184,.25)' }}>
                    <td style={{ padding: 12 }}>
                      <b>{user.name}</b>
                    </td>
                    <td style={{ padding: 12 }}>{user.email}</td>
                    <td style={{ padding: 12 }}>{user.plan}</td>
                    <td style={{ padding: 12 }}>
                      <b>{user.status}</b>
                    </td>
                    <td style={{ padding: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {user.status === 'ACTIVE' ? (
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() => updateStatus(user.id, 'INACTIVE')}
                        >
                          Block
                        </button>
                      ) : (
                        <button
                          className="primary-button"
                          type="button"
                          onClick={() => updateStatus(user.id, 'ACTIVE')}
                        >
                          Activate
                        </button>
                      )}

                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => deleteUser(user.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
