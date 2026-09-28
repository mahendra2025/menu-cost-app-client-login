'use client';

import Link from 'next/link';
import {
  useEffect,
  useState,
} from 'react';
import {
  useRouter,
} from 'next/navigation';

import AppShell from '../../components/AppShell';
import CostingHistoryCard from '../../components/CostingHistoryCard';
import {
  useLanguage,
} from '../../components/LanguageProvider';
import {
  clearWork,
  getSession,
  loadWork,
  saveWork,
} from '../../../lib/store';
import type {
  Session,
  WorkState,
} from '../../../lib/types';

export default function ProfilePage() {
  const router = useRouter();
  const {
    language,
    setLanguage,
    t,
  } = useLanguage();

  const [session, setSession] =
    useState<Session | null>(
      null,
    );
  const [work, setWork] =
    useState<WorkState | null>(
      null,
    );
  const [message, setMessage] =
    useState('');

  const [
    currentPassword,
    setCurrentPassword,
  ] = useState('');
  const [
    newPassword,
    setNewPassword,
  ] = useState('');
  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('');
  const [
    passwordBusy,
    setPasswordBusy,
  ] = useState(false);
  const [
    passwordMessage,
    setPasswordMessage,
  ] = useState('');
  const [
    passwordError,
    setPasswordError,
  ] = useState(false);

  useEffect(() => {
    const current =
      getSession();

    if (!current) {
      router.replace(
        '/login',
      );
      return;
    }

    setSession(current);
    setWork(
      loadWork(
        current.tenantId,
      ),
    );
  }, [router]);

  if (!work || !session) {
    return (
      <AppShell title="Profile">
        <div className="content-grid">
          <div className="glass-card">
            Loading...
          </div>
        </div>
      </AppShell>
    );
  }

  function persist(
    next: WorkState,
  ) {
    if (!session) return;

    setWork(next);

    saveWork(
      session.tenantId,
      next,
    );
  }

  function saveProfile() {
    if (!work) return;

    persist({
      ...work,
      updatedAt:
        new Date().toISOString(),
    });

    setMessage(
      'Business profile saved.',
    );
  }

  function resetWorkspaceData() {
    if (!session) return;

    if (
      !confirm(
        'Clear the current event, menu, costs and local business profile from this browser?',
      )
    ) {
      return;
    }

    clearWork(
      session.tenantId,
    );

    const fresh =
      loadWork(
        session.tenantId,
      );

    setWork(fresh);
    setMessage(
      'Local workspace data cleared.',
    );
  }

  async function changeMyPassword() {
    setPasswordMessage('');
    setPasswordError(false);

    if (
      newPassword.length < 8
    ) {
      setPasswordError(true);
      setPasswordMessage(
        'New password must be at least 8 characters.',
      );
      return;
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      setPasswordError(true);
      setPasswordMessage(
        'New passwords do not match.',
      );
      return;
    }

    setPasswordBusy(true);

    try {
      const response =
        await fetch(
          '/api/client/change-password',
          {
            method: 'PUT',
            headers: {
              'Content-Type':
                'application/json',
            },
            body:
              JSON.stringify({
                currentPassword,
                newPassword,
                confirmPassword,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Could not change password.',
        );
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMessage(
        'Password changed successfully.',
      );
    } catch (error) {
      setPasswordError(true);
      setPasswordMessage(
        error instanceof Error
          ? error.message
          : 'Could not change password.',
      );
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <AppShell
      title="Profile"
      subtitle="Single-business settings, security and master-data access"
    >
      <section className="content-grid">
        <div className="stat-grid">
          <div className="stat-card">
            <small>
              Workspace
            </small>
            <strong>
              Single Business
            </strong>
            <span>
              No multi-account mode
            </span>
          </div>

          <div className="stat-card">
            <small>
              Access
            </small>
            <strong>
              Owner
            </strong>
            <span>
              {session.userId}
            </span>
          </div>

          <div className="stat-card">
            <small>
              Costings
            </small>
            <strong>
              Unlimited
            </strong>
            <span>
              No plan limits
            </span>
          </div>

          <div className="stat-card">
            <small>
              Saving
            </small>
            <strong>
              Auto-saved
            </strong>
            <span>
              Browser + server history
            </span>
          </div>
        </div>

        <div className="glass-card language-preference-card">
          <div>
            <div className="section-kicker">
              {t(
                'Language preference',
              )}
            </div>

            <h2>
              {t(
                'App language',
              )}
            </h2>

            <p className="muted">
              {t(
                'Choose the language used for navigation and key workflow instructions.',
              )}
            </p>

            <small>
              {t(
                'Saved on this device and applied immediately.',
              )}
            </small>
          </div>

          <div
            className="language-choice"
            role="group"
            aria-label={t(
              'App language',
            )}
          >
            <button
              type="button"
              className={
                language === 'en'
                  ? 'is-active'
                  : ''
              }
              aria-pressed={
                language === 'en'
              }
              onClick={() =>
                setLanguage(
                  'en',
                )
              }
            >
              <span>EN</span>
              <b>English</b>
            </button>

            <button
              type="button"
              className={
                language === 'hi'
                  ? 'is-active'
                  : ''
              }
              aria-pressed={
                language === 'hi'
              }
              onClick={() =>
                setLanguage(
                  'hi',
                )
              }
            >
              <span>हिं</span>
              <b>हिन्दी</b>
            </button>
          </div>
        </div>

        <div className="glass-card">
          <div className="section-kicker">
            Business profile
          </div>

          <h2>
            Catering Business
          </h2>

          <div className="form-grid">
            <div className="two-grid">
              <div className="field">
                <label>
                  Business Name
                </label>

                <input
                  className="input"
                  value={
                    work.profile
                      .businessName
                  }
                  onChange={(
                    event,
                  ) =>
                    persist({
                      ...work,
                      profile: {
                        ...work.profile,
                        businessName:
                          event
                            .target
                            .value,
                      },
                    })
                  }
                />
              </div>

              <div className="field">
                <label>
                  Owner Name
                </label>

                <input
                  className="input"
                  value={
                    work.profile
                      .ownerName
                  }
                  onChange={(
                    event,
                  ) =>
                    persist({
                      ...work,
                      profile: {
                        ...work.profile,
                        ownerName:
                          event
                            .target
                            .value,
                      },
                    })
                  }
                />
              </div>
            </div>

            <div className="two-grid">
              <div className="field">
                <label>
                  Phone
                </label>

                <input
                  className="input"
                  value={
                    work.profile.phone
                  }
                  onChange={(
                    event,
                  ) =>
                    persist({
                      ...work,
                      profile: {
                        ...work.profile,
                        phone:
                          event
                            .target
                            .value,
                      },
                    })
                  }
                />
              </div>

              <div className="field">
                <label>
                  Base City
                </label>

                <input
                  className="input"
                  value={
                    work.profile.city
                  }
                  onChange={(
                    event,
                  ) =>
                    persist({
                      ...work,
                      profile: {
                        ...work.profile,
                        city:
                          event
                            .target
                            .value,
                      },
                    })
                  }
                />
              </div>
            </div>

            <div className="action-row">
              <button
                className="primary-button"
                type="button"
                onClick={saveProfile}
              >
                Save Business Profile
              </button>
            </div>

            {message ? (
              <div className="admin-message">
                {message}
              </div>
            ) : null}
          </div>
        </div>

        <div className="glass-card">
          <div className="section-kicker">
            Master data
          </div>

          <h2>
            Costing Masters
          </h2>

          <p className="muted">
            The same owner account manages all business master data.
          </p>

          <div className="action-row">
            <Link
              href="/admin/dishes"
              className="ghost-button"
            >
              Dish Master
            </Link>

            <Link
              href="/admin/recipes"
              className="ghost-button"
            >
              Recipes
            </Link>

            <Link
              href="/admin/ingredients"
              className="ghost-button"
            >
              Ingredients
            </Link>

            <Link
              href="/app/ingredients"
              className="ghost-button"
            >
              Ingredient Rates
            </Link>

            <Link
              href="/admin/gas"
              className="ghost-button"
            >
              Gas Cost
            </Link>

            <Link
              href="/admin/manpower"
              className="ghost-button"
            >
              Manpower
            </Link>
          </div>
        </div>

        <div className="glass-card">
          <div className="section-kicker">
            Owner security
          </div>

          <h2>
            Change Password
          </h2>

          <p className="muted">
            Change the password for the single owner login.
          </p>

          <div className="form-grid">
            <div className="field">
              <label
                htmlFor="current-password"
              >
                Current Password
              </label>

              <input
                id="current-password"
                className="input"
                type="password"
                autoComplete="current-password"
                value={
                  currentPassword
                }
                onChange={(
                  event,
                ) =>
                  setCurrentPassword(
                    event.target.value,
                  )
                }
                placeholder="Enter current password"
              />
            </div>

            <div className="two-grid">
              <div className="field">
                <label
                  htmlFor="new-password"
                >
                  New Password
                </label>

                <input
                  id="new-password"
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={
                    newPassword
                  }
                  onChange={(
                    event,
                  ) =>
                    setNewPassword(
                      event.target.value,
                    )
                  }
                  placeholder="Minimum 8 characters"
                />
              </div>

              <div className="field">
                <label
                  htmlFor="confirm-password"
                >
                  Confirm New Password
                </label>

                <input
                  id="confirm-password"
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={
                    confirmPassword
                  }
                  onChange={(
                    event,
                  ) =>
                    setConfirmPassword(
                      event.target.value,
                    )
                  }
                  placeholder="Enter new password again"
                />
              </div>
            </div>

            {passwordMessage ? (
              <div
                className={`admin-message ${passwordError ? 'error' : 'success'}`}
              >
                {passwordMessage}
              </div>
            ) : null}

            <div className="action-row">
              <button
                className="primary-button"
                type="button"
                disabled={
                  passwordBusy ||
                  !currentPassword ||
                  !newPassword ||
                  !confirmPassword
                }
                onClick={() =>
                  void changeMyPassword()
                }
              >
                {passwordBusy
                  ? 'Changing…'
                  : 'Change Password'}
              </button>
            </div>
          </div>
        </div>

        <CostingHistoryCard />

        <div className="glass-card">
          <div className="section-kicker">
            Local data
          </div>

          <h2>
            Reset Current Browser Workspace
          </h2>

          <p className="muted">
            Clears the current local event workspace. Saved server history is not deleted.
          </p>

          <button
            className="danger-button"
            type="button"
            onClick={
              resetWorkspaceData
            }
          >
            Clear Local Workspace
          </button>
        </div>
      </section>
    </AppShell>
  );
}
