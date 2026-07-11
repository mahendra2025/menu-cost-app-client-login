'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (userId.trim() === 'admin' && password.trim() === 'admin123') {
      localStorage.setItem(
        'menu_cost_session',
        JSON.stringify({
          role: 'ADMIN',
          tenantId: 'admin',
          tenantName: 'Admin',
          email: 'admin',
          plan: 'ADMIN',
          status: 'ACTIVE',
        })
      );

      router.push('/admin/users');
      return;
    }

    try {
      setLoading(true);

      const res = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userId,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Wrong user ID or password');
        return;
      }

      localStorage.setItem(
        'menu_cost_session',
        JSON.stringify({
          ...data.session,
          role: 'CLIENT',
        })
      );

      router.push('/app/event');
    } catch {
      setError('Server connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell center-screen">
      <section className="login-card">
        <div className="app-mark">MC</div>
        <p className="eyebrow">Client Login</p>
        <h1>Menu Cost App</h1>
        <p className="muted">
          Admin creates user ID and password. Client logs in and sees only their own menu costing data.
        </p>

        <form className="form-grid" onSubmit={onSubmit}>
          <div className="field">
            <label>User ID / Email</label>
            <input
              className="input"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="example: mahendra@test.com"
            />
          </div>

          <div className="field">
            <label>Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>

          {error ? <div className="alert-card" style={{ margin: 0 }}>{error}</div> : null}

          <button className="primary-button full" type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="panel" style={{ marginTop: 16, padding: 16 }}>
          <b>Admin login</b>
          <p className="muted" style={{ marginBottom: 0 }}>
            User ID: <b>admin</b> / Password: <b>admin123</b>
          </p>
        </div>
      </section>
    </main>
  );
}