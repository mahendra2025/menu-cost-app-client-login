'use client';

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

function safePercent(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.min(100, Math.max(0, number))
    : 0;
}

function safeDays(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.max(1, Math.round(number))
    : 7;
}

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

  function patchProfile(
    patch: Partial<WorkState['profile']>,
  ) {
    if (!work) return;

    persist({
      ...work,
      profile: {
        ...work.profile,
        ...patch,
      },
    });
    setMessage('');
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

  const profileChecks = [
    Boolean(
      work.profile.businessName.trim(),
    ),
    Boolean(
      work.profile.ownerName.trim(),
    ),
    Boolean(
      work.profile.phone.trim(),
    ),
    Boolean(
      work.profile.city.trim(),
    ),
    Boolean(
      work.profile.tagline?.trim(),
    ),
    safeDays(
      work.profile.quotationValidityDays,
    ) > 0,
    Boolean(
      work.profile.quotationPaymentTerms?.trim(),
    ),
  ];

  const profileReadinessPercent =
    Math.round(
      (
        profileChecks.filter(Boolean).length /
        profileChecks.length
      ) *
        100,
    );

  const quotationAdvancePercent =
    safePercent(
      work.profile.quotationAdvancePercent,
    );

  const quotationGstPercent =
    safePercent(
      work.profile.quotationGstPercent,
    );

  const quotationValidityDays =
    safeDays(
      work.profile.quotationValidityDays,
    );

  const optionalIdentityCount = [
    work.profile.email,
    work.profile.address,
    work.profile.gstin,
  ].filter(
    (value) =>
      Boolean(
        value?.trim(),
      ),
  ).length;

  const logoText =
    (
      work.profile.logoText ||
      work.profile.businessName
        .slice(0, 2)
    )
      .trim()
      .slice(0, 4)
      .toUpperCase() ||
    'MC';

  return (
    <AppShell
      title="Profile"
      subtitle="Single-business settings, security and master-data access"
      hidePageTitle
    >
      <section className="content-grid">
        <div className="profile-command">
          <div className="profile-command-copy">
            <span className="page-eyebrow">
              Business identity & document defaults
            </span>

            <h1>
              {work.profile.businessName || 'Business Profile'}
            </h1>

            <p>
              Control the details that appear across your workspace and new client quotations. Profile defaults flow into new quotations automatically.
            </p>

            <div className="profile-command-kpis">
              <article>
                <span>Owner</span>
                <b>{work.profile.ownerName || 'Not set'}</b>
                <small>{session.userId}</small>
              </article>

              <article>
                <span>Base city</span>
                <b>{work.profile.city || 'Not set'}</b>
                <small>Used for local rate context</small>
              </article>

              <article>
                <span>Quotation validity</span>
                <b>{quotationValidityDays} days</b>
                <small>{quotationAdvancePercent}% advance default</small>
              </article>

              <article>
                <span>Client identity</span>
                <b>{optionalIdentityCount}/3</b>
                <small>Email · Address · GSTIN</small>
              </article>
            </div>
          </div>

          <aside className="profile-command-side">
            <div
              className="profile-readiness-ring"
              style={{
                background:
                  `conic-gradient(${profileReadinessPercent === 100 ? '#55d98f' : '#4a9cff'} ${profileReadinessPercent * 3.6}deg, #25303d 0deg)`,
              }}
              aria-label={`Business profile readiness ${profileReadinessPercent}%`}
            >
              <span>
                <b>{profileReadinessPercent}%</b>
                <small>Ready</small>
              </span>
            </div>

            <div className="profile-brand-preview">
              <div className="profile-brand-mark">{logoText}</div>
              <div>
                <b>{work.profile.businessName || 'Business Name'}</b>
                <span>
                  {work.profile.tagline?.trim() ||
                    'Premium Event Catering'}
                </span>
                <small>
                  {[work.profile.phone, work.profile.city]
                    .filter(Boolean)
                    .join(' · ') || 'Phone · City'}
                </small>
              </div>
            </div>
          </aside>
        </div>

        <div className="profile-summary-grid">
          <article>
            <span>Workspace</span>
            <b>Single Business</b>
            <small>Owner-managed workspace</small>
          </article>
          <article>
            <span>Access</span>
            <b>Owner</b>
            <small>Single secure login</small>
          </article>
          <article>
            <span>Costings</span>
            <b>Unlimited</b>
            <small>No local plan limit</small>
          </article>
          <article>
            <span>Saving</span>
            <b>Auto-saved</b>
            <small>Browser + server history</small>
          </article>
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

        <div className="profile-settings-grid">
          <div className="glass-card profile-business-card">
            <div className="final-costing-section-heading">
              <div>
                <span className="section-kicker">Business identity</span>
                <h2>Client-facing business details</h2>
                <p>
                  These fields are used across the workspace and on new client quotation PDFs.
                </p>
              </div>

              <div className="profile-brand-mark large">
                {logoText}
              </div>
            </div>

            <div className="profile-form-grid">
              <label className="field">
                <span>Business Name</span>
                <input
                  className="input"
                  value={work.profile.businessName}
                  onChange={(event) =>
                    patchProfile({
                      businessName: event.target.value,
                    })
                  }
                />
              </label>

              <label className="field">
                <span>Owner Name</span>
                <input
                  className="input"
                  value={work.profile.ownerName}
                  onChange={(event) =>
                    patchProfile({
                      ownerName: event.target.value,
                    })
                  }
                />
              </label>

              <label className="field">
                <span>Brand Tagline</span>
                <input
                  className="input"
                  value={work.profile.tagline || ''}
                  placeholder="Premium Event Catering"
                  onChange={(event) =>
                    patchProfile({
                      tagline: event.target.value,
                    })
                  }
                />
              </label>

              <label className="field">
                <span>Logo Text / Initials</span>
                <input
                  className="input"
                  maxLength={4}
                  value={work.profile.logoText}
                  placeholder="KC"
                  onChange={(event) =>
                    patchProfile({
                      logoText: event.target.value
                        .slice(0, 4)
                        .toUpperCase(),
                    })
                  }
                />
              </label>

              <label className="field">
                <span>Phone</span>
                <input
                  className="input"
                  inputMode="tel"
                  value={work.profile.phone}
                  onChange={(event) =>
                    patchProfile({
                      phone: event.target.value,
                    })
                  }
                />
              </label>

              <label className="field">
                <span>Email</span>
                <input
                  className="input"
                  type="email"
                  value={work.profile.email || ''}
                  placeholder="business@example.com"
                  onChange={(event) =>
                    patchProfile({
                      email: event.target.value,
                    })
                  }
                />
              </label>

              <label className="field">
                <span>Base City</span>
                <input
                  className="input"
                  value={work.profile.city}
                  onChange={(event) =>
                    patchProfile({
                      city: event.target.value,
                    })
                  }
                />
              </label>

              <label className="field">
                <span>GSTIN</span>
                <input
                  className="input"
                  value={work.profile.gstin || ''}
                  placeholder="Optional"
                  onChange={(event) =>
                    patchProfile({
                      gstin: event.target.value.toUpperCase(),
                    })
                  }
                />
              </label>

              <label className="field full">
                <span>Business Address</span>
                <textarea
                  className="input profile-textarea"
                  value={work.profile.address || ''}
                  placeholder="Office / studio address for client documents"
                  onChange={(event) =>
                    patchProfile({
                      address: event.target.value,
                    })
                  }
                />
              </label>
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
          </div>

          <div className="glass-card profile-quotation-card">
            <div className="section-kicker">
              Quotation defaults
            </div>

            <h2>Default commercial terms</h2>

            <p className="muted">
              These settings are applied only when a new quotation is created. Existing saved quotations stay unchanged.
            </p>

            <div className="profile-default-preview">
              <div>
                <span>Validity</span>
                <b>{quotationValidityDays} days</b>
              </div>
              <div>
                <span>Advance</span>
                <b>{quotationAdvancePercent}%</b>
              </div>
              <div>
                <span>GST</span>
                <b>{quotationGstPercent}%</b>
              </div>
              <div>
                <span>Show total</span>
                <b>{work.profile.quotationIncludeTotal === false ? 'No' : 'Yes'}</b>
              </div>
            </div>

            <div className="profile-form-grid">
              <label className="field">
                <span>Quotation Validity (days)</span>
                <input
                  className="input"
                  type="number"
                  min="1"
                  max="365"
                  value={quotationValidityDays}
                  onChange={(event) =>
                    patchProfile({
                      quotationValidityDays:
                        safeDays(event.target.value),
                    })
                  }
                />
              </label>

              <label className="field">
                <span>Booking Advance %</span>
                <input
                  className="input"
                  type="number"
                  min="0"
                  max="100"
                  value={quotationAdvancePercent}
                  onChange={(event) =>
                    patchProfile({
                      quotationAdvancePercent:
                        safePercent(event.target.value),
                    })
                  }
                />
              </label>

              <label className="field">
                <span>Default GST %</span>
                <input
                  className="input"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={quotationGstPercent}
                  onChange={(event) =>
                    patchProfile({
                      quotationGstPercent:
                        safePercent(event.target.value),
                    })
                  }
                />
              </label>

              <label className="field profile-toggle-field">
                <span>Quotation Total</span>
                <button
                  type="button"
                  className={
                    work.profile.quotationIncludeTotal === false
                      ? 'profile-toggle'
                      : 'profile-toggle active'
                  }
                  aria-pressed={
                    work.profile.quotationIncludeTotal !== false
                  }
                  onClick={() =>
                    patchProfile({
                      quotationIncludeTotal:
                        work.profile.quotationIncludeTotal === false,
                    })
                  }
                >
                  <i />
                  {work.profile.quotationIncludeTotal === false
                    ? 'Hide total by default'
                    : 'Show total by default'}
                </button>
              </label>

              <label className="field full">
                <span>Default Payment Terms</span>
                <textarea
                  className="input profile-textarea"
                  value={work.profile.quotationPaymentTerms || ''}
                  placeholder="Balance payment as mutually agreed before or on the event date."
                  onChange={(event) =>
                    patchProfile({
                      quotationPaymentTerms: event.target.value,
                    })
                  }
                />
              </label>
            </div>

            <div className="profile-quotation-note">
              New quotations inherit these defaults. You can still edit each quotation separately.
            </div>

            <div className="action-row">
              <button
                className="secondary-button"
                type="button"
                onClick={() => router.push('/app/quotation')}
              >
                Open Quotation
              </button>
            </div>
          </div>
        </div>

        {message ? (
          <div className="admin-message">
            {message}
          </div>
        ) : null}

        <div className="glass-card profile-security-card">
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

        <div className="glass-card profile-danger-card">
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
        <style>{`
          .profile-command {
            display:grid;
            grid-template-columns:minmax(0,1fr) minmax(330px,.54fr);
            gap:18px;
            align-items:center;
            padding:18px 20px;
            border:1px solid #2a3542;
            border-radius:18px;
            background:
              radial-gradient(circle at 96% 10%,rgba(74,156,255,.13),transparent 22rem),
              linear-gradient(145deg,#111923,#0d141c);
            box-shadow:0 14px 34px rgba(0,0,0,.16);
          }

          .profile-command-copy h1 {
            margin:7px 0 6px;
            font-size:clamp(30px,3.5vw,42px);
            line-height:1.02;
            letter-spacing:-.05em;
          }

          .profile-command-copy > p {
            max-width:760px;
            margin:0;
            color:#8b98a9;
            font-size:10px;
            line-height:1.55;
          }

          .profile-command-kpis {
            display:grid;
            grid-template-columns:repeat(4,minmax(0,1fr));
            gap:7px;
            margin-top:14px;
          }

          .profile-command-kpis article {
            min-width:0;
            padding:10px;
            border:1px solid rgba(148,163,184,.10);
            border-radius:11px;
            background:rgba(255,255,255,.022);
          }

          .profile-command-kpis span,
          .profile-command-kpis b,
          .profile-command-kpis small {
            display:block;
          }

          .profile-command-kpis span {
            color:#718094;
            font-size:7px;
            font-weight:900;
            text-transform:uppercase;
          }

          .profile-command-kpis b {
            overflow:hidden;
            margin-top:5px;
            color:#e7eef6;
            font-size:13px;
            text-overflow:ellipsis;
            white-space:nowrap;
          }

          .profile-command-kpis small {
            margin-top:3px;
            color:#68778a;
            font-size:7px;
          }

          .profile-command-side {
            display:grid;
            grid-template-columns:80px minmax(0,1fr);
            gap:13px;
            align-items:center;
            padding:13px;
            border:1px solid rgba(74,156,255,.15);
            border-radius:15px;
            background:rgba(74,156,255,.04);
          }

          .profile-readiness-ring {
            display:grid;
            width:76px;
            height:76px;
            padding:6px;
            place-items:center;
            border-radius:50%;
          }

          .profile-readiness-ring > span {
            display:grid;
            width:100%;
            height:100%;
            place-items:center;
            border:1px solid rgba(255,255,255,.05);
            border-radius:50%;
            background:#0f161e;
          }

          .profile-readiness-ring b,
          .profile-readiness-ring small {
            display:block;
            line-height:1;
          }

          .profile-readiness-ring b {
            color:#eef5fc;
            font-size:17px;
          }

          .profile-readiness-ring small {
            margin-top:-10px;
            color:#748397;
            font-size:6px;
            font-weight:900;
            text-transform:uppercase;
          }

          .profile-brand-preview {
            display:grid;
            grid-template-columns:46px minmax(0,1fr);
            gap:10px;
            align-items:center;
          }

          .profile-brand-mark {
            display:grid;
            width:46px;
            height:46px;
            place-items:center;
            border:1px solid rgba(74,156,255,.24);
            border-radius:13px;
            color:#9fcaff;
            background:rgba(74,156,255,.08);
            font-size:13px;
            font-weight:950;
            letter-spacing:.03em;
          }

          .profile-brand-mark.large {
            width:58px;
            height:58px;
            font-size:16px;
          }

          .profile-brand-preview b,
          .profile-brand-preview span,
          .profile-brand-preview small {
            display:block;
          }

          .profile-brand-preview b {
            color:#edf4fb;
            font-size:12px;
          }

          .profile-brand-preview span {
            margin-top:2px;
            color:#8da0b5;
            font-size:8px;
          }

          .profile-brand-preview small {
            margin-top:4px;
            color:#68778a;
            font-size:7px;
          }

          .profile-summary-grid {
            display:grid;
            grid-template-columns:repeat(4,minmax(0,1fr));
            gap:8px;
          }

          .profile-summary-grid article {
            min-width:0;
            padding:12px 13px;
            border:1px solid #29333f;
            border-radius:12px;
            background:linear-gradient(180deg,#101720,#0d141b);
          }

          .profile-summary-grid span,
          .profile-summary-grid b,
          .profile-summary-grid small {
            display:block;
          }

          .profile-summary-grid span {
            color:#718094;
            font-size:7px;
            font-weight:900;
            text-transform:uppercase;
          }

          .profile-summary-grid b {
            margin:5px 0 2px;
            color:#e7eef6;
            font-size:13px;
          }

          .profile-summary-grid small {
            color:#68778a;
            font-size:7px;
          }

          .profile-settings-grid {
            display:grid;
            grid-template-columns:minmax(0,1.1fr) minmax(330px,.9fr);
            gap:12px;
            align-items:start;
          }

          .profile-business-card,
          .profile-quotation-card,
          .profile-security-card,
          .profile-danger-card {
            border-color:#29333f;
            background:#0f151c;
          }

          .profile-form-grid {
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:10px;
            margin-top:14px;
          }

          .profile-form-grid .full {
            grid-column:1/-1;
          }

          .profile-textarea {
            min-height:84px;
            padding:10px;
            resize:vertical;
          }

          .profile-default-preview {
            display:grid;
            grid-template-columns:repeat(4,minmax(0,1fr));
            gap:7px;
            margin:14px 0;
          }

          .profile-default-preview > div {
            min-width:0;
            padding:9px;
            border:1px solid rgba(148,163,184,.09);
            border-radius:9px;
            background:rgba(255,255,255,.02);
          }

          .profile-default-preview span,
          .profile-default-preview b {
            display:block;
          }

          .profile-default-preview span {
            color:#718094;
            font-size:7px;
            font-weight:900;
            text-transform:uppercase;
          }

          .profile-default-preview b {
            margin-top:4px;
            color:#dfe8f2;
            font-size:11px;
          }

          .profile-toggle-field {
            align-content:end;
          }

          .profile-toggle {
            display:flex;
            min-height:42px;
            align-items:center;
            gap:9px;
            padding:0 10px;
            border:1px solid #34404d;
            border-radius:9px;
            color:#a3b0bf;
            background:#151c25;
            font:inherit;
            font-size:9px;
            font-weight:800;
            cursor:pointer;
          }

          .profile-toggle i {
            position:relative;
            width:30px;
            height:16px;
            border-radius:999px;
            background:#27313d;
          }

          .profile-toggle i::after {
            content:'';
            position:absolute;
            top:3px;
            left:3px;
            width:10px;
            height:10px;
            border-radius:50%;
            background:#8391a3;
            transition:.18s ease;
          }

          .profile-toggle.active {
            border-color:rgba(85,217,143,.18);
            color:#a9e7c3;
            background:rgba(85,217,143,.035);
          }

          .profile-toggle.active i {
            background:rgba(85,217,143,.18);
          }

          .profile-toggle.active i::after {
            left:17px;
            background:#70dda1;
          }

          .profile-quotation-note {
            margin-top:10px;
            padding:9px 10px;
            border:1px solid rgba(74,156,255,.10);
            border-radius:9px;
            color:#7890a9;
            background:rgba(74,156,255,.035);
            font-size:8px;
            line-height:1.5;
          }

          .profile-danger-card {
            border-color:rgba(255,126,118,.14);
            background:rgba(255,126,118,.025);
          }

          @media(max-width:1100px) {
            .profile-command,
            .profile-settings-grid {
              grid-template-columns:1fr;
            }

            .profile-command-side {
              max-width:460px;
            }
          }

          @media(max-width:760px) {
            .profile-command {
              padding:16px;
            }

            .profile-command-kpis,
            .profile-summary-grid,
            .profile-default-preview {
              grid-template-columns:1fr 1fr;
            }

            .profile-command-side {
              grid-template-columns:62px minmax(0,1fr);
            }

            .profile-readiness-ring {
              width:58px;
              height:58px;
            }

            .profile-form-grid {
              grid-template-columns:1fr;
            }

            .profile-form-grid .full {
              grid-column:auto;
            }
          }
        `}</style>
      </section>
    </AppShell>
  );
}
