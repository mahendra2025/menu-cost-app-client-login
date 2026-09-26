'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SESSION_KEY } from '../../lib/store';
import styles from './page.module.css';

function BrandMark() {
  return (
    <span className={styles.brandMark} aria-hidden="true">
      <svg viewBox="0 0 32 32" role="img">
        <path d="M7.5 5.5v8.25M11.5 5.5v8.25M7.5 9.75h4M9.5 13.75V26" />
        <path d="M21.5 5.5c-3.2 2.7-3.2 8.5 0 11.2V26M21.5 5.5V26" />
      </svg>
    </span>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    try {
      setLoading(true);
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Wrong user ID or password.');
        return;
      }

      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          role: 'CLIENT',
          tenantId: data.session.tenantId,
          userId: data.session.email,
          businessName: data.session.tenantName,
          status: 'ACTIVE',
        }),
      );

      router.push('/app/event');
    } catch {
      setError('We could not reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.mobileBrand}>
        <Link className={styles.brand} href="/" aria-label="Menu Costing home">
          <BrandMark />
          <span>Menu Costing</span>
        </Link>
      </header>

      <section className={styles.story} aria-labelledby="login-story-title">
        <div className={styles.storyTop}>
          <Link className={styles.brand} href="/" aria-label="Menu Costing home">
            <BrandMark />
            <span>Menu Costing</span>
          </Link>
          <span className={styles.forCaterers}>Built for Indian caterers</span>
        </div>

        <div className={styles.storyCopy}>
          <p className={styles.kicker}>From menu to margin</p>
          <h1 id="login-story-title">Every plate, person and paisa—accounted for.</h1>
          <p className={styles.summary}>
            Build function-wise menus, plan manpower and know your true event cost before you send the quote.
          </p>
        </div>

        <div className={styles.eventPreview} aria-label="Example event costing summary">
          <div className={styles.previewHeading}>
            <div><span>Event costing</span><strong>Mehta Wedding</strong></div>
            <span className={styles.readyBadge}><i /> Ready to quote</span>
          </div>
          <div className={styles.functionRow}><span>Welcome lunch</span><small>450 guests</small><b>₹1.08L</b></div>
          <div className={styles.functionRow}><span>Sangeet dinner</span><small>800 guests</small><b>₹2.42L</b></div>
          <div className={styles.functionRow}><span>Wedding dinner</span><small>1,200 guests</small><b>₹3.76L</b></div>
          <div className={styles.previewTotal}>
            <span>Estimated event cost <small>Food, manpower and extras</small></span>
            <strong>₹7.26L</strong>
          </div>
        </div>

        <div className={styles.proof}>
          <span>English</span><i /><span>हिन्दी</span><i /><span>ગુજરાતી</span>
          <small>Menu detection in the language you use</small>
        </div>
      </section>

      <section className={styles.signIn} aria-labelledby="sign-in-title">
        <div className={styles.formWrap}>
          <div className={styles.heading}>
            <p>Business workspace</p>
            <h2 id="sign-in-title">Sign in to Menu Costing</h2>
            <span>One owner account for costing, masters and quotations.</span>
          </div>

          <form className={styles.form} onSubmit={onSubmit} aria-busy={loading}>
            <div className={styles.field}>
              <label htmlFor="userId">User ID</label>
              <div className={styles.inputWrap}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 20c.6-3.3 3.3-5 8-5s7.4 1.7 8 5M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
                </svg>
                <input
                  id="userId" name="userId" type="text" autoComplete="username"
                  value={userId} onChange={(event) => setUserId(event.target.value)}
                  placeholder="Owner user ID" aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'login-error' : undefined} autoFocus required
                />
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="password">Password</label>
              <div className={styles.inputWrap}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="4" y="10" width="16" height="11" rx="3" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                </svg>
                <input
                  id="password" name="password" autoComplete="current-password"
                  type={showPassword ? 'text' : 'password'} value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password" aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'login-error' : undefined} required
                />
                <button
                  className={styles.passwordToggle} type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error ? (
              <div className={styles.alert} id="login-error" role="alert">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8v5M12 17h.01" /><circle cx="12" cy="12" r="9" /></svg>
                <span>{error}</span>
              </div>
            ) : null}

            <button className={styles.submit} type="submit" disabled={loading}>
              <span>{loading ? 'Signing you in…' : 'Sign in securely'}</span>
              {loading ? <i className={styles.spinner} aria-hidden="true" /> : (
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
              )}
            </button>
          </form>

          <p className={styles.privacy}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 4.4 2.8 8.4 7 10 4.2-1.6 7-5.6 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg>
            Your recipes and ingredient rates stay private to your business.
          </p>
        </div>
      </section>
    </main>
  );
}
