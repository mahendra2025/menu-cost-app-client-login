'use client';

import {
  FormEvent,
  useState,
} from 'react';

import Link from 'next/link';

import {
  useRouter,
} from 'next/navigation';

import {
  SESSION_KEY,
} from '../../lib/store';

export default function SignupPage() {
  const router =
    useRouter();

  const [
    businessName,
    setBusinessName,
  ] = useState('');

  const [
    email,
    setEmail,
  ] = useState('');

  const [
    password,
    setPassword,
  ] = useState('');

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('');

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState('');

  async function submit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (loading) return;

    setError('');

    if (
      password !==
      confirmPassword
    ) {
      setError(
        'Passwords do not match.',
      );

      return;
    }

    setLoading(true);

    try {
      const response =
        await fetch(
          '/api/signup',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                businessName,
                email,
                password,
                confirmPassword,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Could not create account.',
        );
      }

      localStorage.setItem(
        SESSION_KEY,

        JSON.stringify({
          role:
            'CLIENT',

          tenantId:
            data.session
              .tenantId,

          userId:
            data.session
              .email,

          businessName:
            data.session
              .tenantName,

          status:
            data.session
              .status,
        }),
      );

      router.replace(
        '/onboarding',
      );

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Could not create account.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell auth-page">
      <div className="auth-layout">

        <section className="auth-intro">
          <div className="app-mark">
            MC
          </div>

          <p className="eyebrow">
            Start free
          </p>

          <h1>
            Know your menu cost
            before you quote.
          </h1>

          <p>
            Create your Menu Costing
            account and start with
            your first catering menu.
          </p>

          <div
            className="auth-benefits"
            aria-label="Menu Costing benefits"
          >
            <div>
              <span>
                01
              </span>

              <b>
                Add your menu
              </b>

              <small>
                Wedding, event or
                industrial catering
              </small>
            </div>

            <div>
              <span>
                02
              </span>

              <b>
                Use your own rates
              </b>

              <small>
                Personal ingredient
                rates stay private
              </small>
            </div>

            <div>
              <span>
                03
              </span>

              <b>
                Calculate before quoting
              </b>

              <small>
                Food, manpower and
                extra costs together
              </small>
            </div>
          </div>
        </section>

        <section className="login-card">
          <div className="login-heading">
            <p className="eyebrow">
              Create account
            </p>

            <h2>
              Start with Menu Costing
            </h2>

            <p className="muted">
              No payment is required
              to create your account.
            </p>
          </div>

          <form
            className="form-grid"
            onSubmit={submit}
          >
            <div className="field">
              <label
                htmlFor="businessName"
              >
                Catering Business Name
              </label>

              <input
                id="businessName"
                className="input"
                value={
                  businessName
                }
                maxLength={120}
                autoComplete="organization"
                placeholder="Your catering business"
                onChange={(
                  event,
                ) =>
                  setBusinessName(
                    event.target
                      .value,
                  )
                }
                required
              />
            </div>

            <div className="field">
              <label
                htmlFor="signupEmail"
              >
                Email
              </label>

              <input
                id="signupEmail"
                className="input"
                type="email"
                value={email}
                autoComplete="email"
                placeholder="you@company.com"
                onChange={(
                  event,
                ) =>
                  setEmail(
                    event.target
                      .value,
                  )
                }
                required
              />
            </div>

            <div className="two-grid">
              <div className="field">
                <label
                  htmlFor="signupPassword"
                >
                  Password
                </label>

                <input
                  id="signupPassword"
                  className="input"
                  type="password"
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  value={password}
                  placeholder="Minimum 8 characters"
                  onChange={(
                    event,
                  ) =>
                    setPassword(
                      event.target
                        .value,
                    )
                  }
                  required
                />
              </div>

              <div className="field">
                <label
                  htmlFor="confirmSignupPassword"
                >
                  Confirm Password
                </label>

                <input
                  id="confirmSignupPassword"
                  className="input"
                  type="password"
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  value={
                    confirmPassword
                  }
                  placeholder="Repeat password"
                  onChange={(
                    event,
                  ) =>
                    setConfirmPassword(
                      event.target
                        .value,
                    )
                  }
                  required
                />
              </div>
            </div>

            {error ? (
              <div
                className="form-alert"
                role="alert"
              >
                {error}
              </div>
            ) : null}

            <button
              className="primary-button full auth-submit"
              type="submit"
              disabled={loading}
            >
              {loading
                ? 'Creating account…'
                : 'Start Free'}
            </button>
          </form>

          <p className="login-help">
            Already have an account?{' '}

            <Link
              href="/login"
              style={{
                color:
                  '#007aff',

                fontWeight:
                  800,
              }}
            >
              Sign in
            </Link>
          </p>
        </section>

      </div>
    </main>
  );
}
