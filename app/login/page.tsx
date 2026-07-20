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
    <main className="page-shell auth-page">
      <div className="auth-layout">
        <section className="auth-intro">
          <div className="app-mark">MC</div>
          <p className="eyebrow">Built for caterers</p>
          <h1>Price every event with clarity.</h1>
          <p>Turn a full wedding menu into organized functions, staffing plans, costs and a client-ready quotation.</p>
          <div className="auth-benefits" aria-label="Product benefits">
            <div><span>01</span><b>Detect complete menus</b><small>English, Roman, Hindi and Gujarati</small></div>
            <div><span>02</span><b>Plan function-wise</b><small>Dishes, guests and manpower stay separate</small></div>
            <div><span>03</span><b>Quote confidently</b><small>Food, extras and profit in one clear view</small></div>
          </div>
        </section>

        <section className="login-card">
          <div className="login-heading">
            <p className="eyebrow">Welcome back</p>
            <h2>Sign in to Menu Cost</h2>
            <p className="muted">Use the login details provided by your account administrator.</p>
          </div>

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
                placeholder="you@company.com"
                required
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
                placeholder="Enter your password"
                required
              />
            </div>
            {error ? <div className="form-alert" role="alert">{error}</div> : null}

            <button className="primary-button full auth-submit" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in securely'}
            </button>
          </form>

          <p className="login-help">Need access? Contact your account administrator.</p>
        </section>
      </div>
    </main>
  );
}
