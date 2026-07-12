'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SESSION_KEY } from '../../lib/store';

export default function LoginPage() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

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

      if (data.session.role === 'ADMIN') {
        localStorage.setItem(
          SESSION_KEY,
          JSON.stringify({
            role: 'ADMIN',
            tenantId: 'admin',
            userId: 'admin',
            businessName: 'Super Admin',
            status: 'ACTIVE',
          })
        );
        router.push('/admin/users');
        return;
      }

      const clientSession = {
        role: 'CLIENT' as const,
        tenantId: data.session.tenantId,
        userId: data.session.email,
        businessName: data.session.tenantName,
        status: data.session.status,
      };

      localStorage.setItem(SESSION_KEY, JSON.stringify(clientSession));

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
        <p className="muted">Sign in to prepare menus, calculate plate costs, and create client-ready estimates.</p>

        <form className="form-grid" onSubmit={onSubmit}>
          <div className="field">
          <label htmlFor="userId">Email or user ID</label>
          <input
  id="userId"
  name="userId"
  autoComplete="username"
  className="input"
  value={userId}
  onChange={(e) => setUserId(e.target.value)}
  placeholder="example: jay"
/>
          </div>
          <div className="field">
          <label htmlFor="password">Password</label>
          <input
  id="password"
  name="password"
  autoComplete="current-password"
  className="input"
  type="password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  placeholder="Enter password"
/>
          </div>
          {error ? <div className="form-alert" role="alert">{error}</div> : null}

          <button className="primary-button full" type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="login-help">Need access? Contact your account administrator.</p>
      </section>
    </main>
  );
}
