'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '../../lib/store';

export default function LoginPage() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const result = login(userId, password);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.push(result.session.role === 'ADMIN' ? '/admin/users' : '/app/event');
  }

  return (
    <main className="page-shell center-screen">
      <section className="login-card">
        <div className="app-mark">MC</div>
        <p className="eyebrow">Client Login</p>
        <h1>Menu Cost App</h1>
        <p className="muted">Admin creates user ID and password. Client logs in and sees only their own menu costing data.</p>

        <form className="form-grid" onSubmit={onSubmit}>
          <div className="field">
            <label>User ID</label>
            <input className="input" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="example: kalash001" />
          </div>
          <div className="field">
            <label>Password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" />
          </div>
          {error ? <div className="alert-card" style={{ margin: 0 }}>{error}</div> : null}
          <button className="primary-button full" type="submit">Login</button>
        </form>

        <div className="panel" style={{ marginTop: 16, padding: 16 }}>
          <b>Admin login</b>
          <p className="muted" style={{ marginBottom: 0 }}>User ID: <b>admin</b> / Password: <b>admin123</b></p>
        </div>
      </section>
    </main>
  );
}
