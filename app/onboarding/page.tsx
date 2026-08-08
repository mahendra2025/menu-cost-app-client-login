'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useRouter,
} from 'next/navigation';

import {
  getSession,
  loadWork,
  saveWork,
  SESSION_KEY,
} from '../../lib/store';

type Ingredient = {
  id: string;
  name: string;
  category: string;
  unit: string;
  rate: number;
  defaultRate: number;
  isCustomRate: boolean;
};

type TenantInfo = {
  name: string;
  ownerName: string;
  phone: string;
  city: string;
};

const IMPORTANT_INGREDIENTS = [
  'paneer',
  'tomato',
  'onion',
  'potato',
  'milk',
  'curd',
  'ghee',
  'oil',
  'basmati',
  'atta',
  'besan',
  'sugar',
];

function normalize(
  value: string,
) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export default function OnboardingPage() {
  const router =
    useRouter();

  const [
    step,
    setStep,
  ] = useState(1);

  const [
    business,
    setBusiness,
  ] = useState<TenantInfo>({
    name: '',
    ownerName: '',
    phone: '',
    city: '',
  });

  const [
    ingredients,
    setIngredients,
  ] = useState<
    Ingredient[]
  >([]);

  const [
    rateValues,
    setRateValues,
  ] = useState<
    Record<
      string,
      string
    >
  >({});

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState('');

  useEffect(() => {
    const session =
      getSession();

    if (
      !session ||
      session.role !==
        'CLIENT'
    ) {
      router.replace(
        '/login',
      );

      return;
    }

    void loadSetup();
  }, [router]);

  async function loadSetup() {
    setLoading(true);

    try {
      const [
        profileResponse,
        ingredientResponse,
      ] =
        await Promise.all([
          fetch(
            '/api/client/onboarding',
            {
              cache:
                'no-store',
            },
          ),

          fetch(
            '/api/client/ingredients',
            {
              cache:
                'no-store',
            },
          ),
        ]);

      if (
        profileResponse.status ===
        401
      ) {
        router.replace(
          '/login',
        );

        return;
      }

      const profile =
        await profileResponse.json();

      const ingredientData =
        await ingredientResponse.json();

      if (
        profileResponse.ok &&
        profile.tenant
      ) {
        if (
          profile.tenant
            .onboardingCompleted
        ) {
          router.replace(
            '/app/event',
          );

          return;
        }

        setBusiness({
          name:
            profile.tenant
              .name || '',

          ownerName:
            profile.tenant
              .ownerName || '',

          phone:
            profile.tenant
              .phone || '',

          city:
            profile.tenant
              .city || '',
        });
      }

      if (
        ingredientResponse.ok &&
        Array.isArray(
          ingredientData.rates,
        )
      ) {
        const rows =
          ingredientData
            .rates as Ingredient[];

        setIngredients(
          rows,
        );

        setRateValues(
          Object.fromEntries(
            rows.map(
              (row) => [
                row.id,
                String(
                  Number(
                    row.rate,
                  ) || '',
                ),
              ],
            ),
          ),
        );
      }
    } catch {
      setMessage(
        'Could not load setup. Please refresh.',
      );
    } finally {
      setLoading(false);
    }
  }

  const importantRates =
    useMemo(() => {
      const picked =
        new Map<
          string,
          Ingredient
        >();

      for (
        const search of
        IMPORTANT_INGREDIENTS
      ) {
        const found =
          ingredients.find(
            (row) => {
              const name =
                normalize(
                  row.name,
                );

              return (
                !picked.has(
                  row.id,
                ) &&
                name.includes(
                  search,
                )
              );
            },
          );

        if (found) {
          picked.set(
            found.id,
            found,
          );
        }
      }

      if (
        picked.size < 8
      ) {
        for (
          const row of
          ingredients
        ) {
          if (
            picked.size >=
            12
          ) {
            break;
          }

          if (
            Number(
              row.rate,
            ) > 0 &&
            !picked.has(
              row.id,
            )
          ) {
            picked.set(
              row.id,
              row,
            );
          }
        }
      }

      return Array.from(
        picked.values(),
      ).slice(
        0,
        12,
      );
    }, [
      ingredients,
    ]);

  async function saveBusiness() {
    if (
      !business.name
        .trim()
    ) {
      setMessage(
        'Enter your business name.',
      );

      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const response =
        await fetch(
          '/api/client/onboarding',
          {
            method: 'PUT',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                businessName:
                  business.name,

                ownerName:
                  business.ownerName,

                phone:
                  business.phone,

                city:
                  business.city,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Could not save business details.',
        );
      }

      const session =
        getSession();

      if (session) {
        localStorage.setItem(
          SESSION_KEY,

          JSON.stringify({
            ...session,

            businessName:
              business.name
                .trim(),
          }),
        );
      }

      setStep(2);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not save business details.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveRates() {
    setSaving(true);
    setMessage('');

    try {
      const changed =
        importantRates
          .filter(
            (row) => {
              const next =
                Number(
                  rateValues[
                    row.id
                  ],
                );

              return (
                next > 0 &&
                Math.abs(
                  next -
                    Number(
                      row.rate,
                    ),
                ) >
                  0.0001
              );
            },
          )
          .map(
            (row) => ({
              ingredientId:
                row.id,

              rate:
                Number(
                  rateValues[
                    row.id
                  ],
                ),
            }),
          );

      if (
        changed.length
      ) {
        const response =
          await fetch(
            '/api/client/ingredients',
            {
              method:
                'PUT',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body:
                JSON.stringify({
                  rates:
                    changed,
                }),
            },
          );

        const data =
          await response.json();

        if (
          !response.ok
        ) {
          throw new Error(
            data.error ||
              'Could not save ingredient rates.',
          );
        }
      }

      setStep(3);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not save ingredient rates.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function finish() {
    setSaving(true);
    setMessage('');

    try {
      const response =
        await fetch(
          '/api/client/onboarding',
          {
            method:
              'PUT',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                businessName:
                  business.name,

                ownerName:
                  business.ownerName,

                phone:
                  business.phone,

                city:
                  business.city,

                completed:
                  true,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Could not finish setup.',
        );
      }

      const session =
        getSession();

      if (session) {
        const work =
          loadWork(
            session.tenantId,
          );

        saveWork(
          session.tenantId,
          {
            ...work,

            profile: {
              ...work.profile,

              businessName:
                business.name
                  .trim(),

              ownerName:
                business.ownerName
                  .trim(),

              phone:
                business.phone
                  .trim(),

              city:
                business.city
                  .trim(),

              logoText:
                (
                  business.name ||
                  'MC'
                )
                  .trim()
                  .slice(
                    0,
                    2,
                  )
                  .toUpperCase(),
            },
          },
        );

        localStorage.setItem(
          SESSION_KEY,

          JSON.stringify({
            ...session,

            businessName:
              business.name
                .trim(),
          }),
        );
      }

      router.replace(
        '/app/event',
      );

      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not finish setup.',
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="page-shell center-screen">
        <div className="login-card">
          Preparing your Menu Cost workspace…
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell onboarding-page">
      <style>{`
        .onboarding-page {
          display:grid;
          place-items:center;
          min-height:100vh;
        }

        .onboarding-shell {
          width:min(920px,100%);
          display:grid;
          gap:18px;
        }

        .onboarding-top {
          padding:26px;
          border:1px solid var(--border);
          border-radius:28px;
          background:rgba(255,255,255,.88);
          box-shadow:var(--shadow-soft);
        }

        .onboarding-brand {
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:20px;
        }

        .onboarding-brand h1 {
          margin:8px 0 5px;
          font-size:clamp(30px,5vw,46px);
          letter-spacing:-.05em;
        }

        .onboarding-brand p {
          margin:0;
          color:var(--muted);
        }

        .onboarding-progress {
          display:grid;
          grid-template-columns:repeat(3,1fr);
          gap:8px;
          margin-top:24px;
        }

        .onboarding-progress div {
          height:6px;
          border-radius:99px;
          background:#e5e7eb;
        }

        .onboarding-progress div.active {
          background:var(--blue);
        }

        .onboarding-card {
          padding:28px;
          border:1px solid var(--border);
          border-radius:28px;
          background:rgba(255,255,255,.92);
          box-shadow:var(--shadow-soft);
        }

        .onboarding-card h2 {
          margin:0 0 7px;
          font-size:27px;
          letter-spacing:-.035em;
        }

        .onboarding-card > p {
          margin:0 0 24px;
          color:var(--muted);
          line-height:1.6;
        }

        .onboarding-rates {
          display:grid;
          grid-template-columns:repeat(2,minmax(0,1fr));
          gap:10px;
        }

        .onboarding-rate {
          display:grid;
          grid-template-columns:minmax(0,1fr) 130px;
          align-items:center;
          gap:14px;
          padding:13px 14px;
          border:1px solid var(--border);
          border-radius:17px;
          background:#fff;
        }

        .onboarding-rate b {
          display:block;
          font-size:14px;
        }

        .onboarding-rate small {
          display:block;
          margin-top:3px;
          color:var(--muted);
        }

        .onboarding-rate-input {
          display:flex;
          align-items:center;
          gap:4px;
          border:1px solid var(--border);
          border-radius:13px;
          padding:0 10px;
        }

        .onboarding-rate-input input {
          width:100%;
          min-width:0;
          border:0;
          outline:0;
          padding:11px 2px;
          background:transparent;
          font-weight:800;
        }

        .onboarding-success {
          text-align:center;
          padding-block:14px;
        }

        .onboarding-success-mark {
          display:grid;
          place-items:center;
          width:64px;
          height:64px;
          margin:0 auto 18px;
          border-radius:22px;
          background:rgba(52,199,89,.12);
          color:#16803c;
          font-size:30px;
          font-weight:900;
        }

        .onboarding-actions {
          display:flex;
          justify-content:flex-end;
          gap:10px;
          margin-top:24px;
          flex-wrap:wrap;
        }

        @media(max-width:700px) {
          .onboarding-rates {
            grid-template-columns:1fr;
          }

          .onboarding-rate {
            grid-template-columns:1fr 120px;
          }

          .onboarding-card,
          .onboarding-top {
            padding:21px;
            border-radius:23px;
          }
        }
      `}</style>

      <div className="onboarding-shell">
        <section className="onboarding-top">
          <div className="onboarding-brand">
            <div>
              <span className="section-kicker">
                Welcome to Menu Cost
              </span>

              <h1>
                Set up your costing workspace
              </h1>

              <p>
                Three short steps before your first menu.
              </p>
            </div>

            <div className="app-mark">
              MC
            </div>
          </div>

          <div className="onboarding-progress">
            {[1,2,3].map(
              (item) => (
                <div
                  key={item}
                  className={
                    item <= step
                      ? 'active'
                      : ''
                  }
                />
              ),
            )}
          </div>
        </section>

        <section className="onboarding-card">

          {step === 1 ? (
            <>
              <span className="section-kicker">
                Step 1 of 3
              </span>

              <h2>
                Your catering business
              </h2>

              <p>
                These details will be used inside your Menu Cost workspace.
              </p>

              <div className="form-grid">
                <div className="two-grid">
                  <div className="field">
                    <label>
                      Business Name
                    </label>

                    <input
                      className="input"
                      value={
                        business.name
                      }
                      onChange={(
                        event,
                      ) =>
                        setBusiness({
                          ...business,
                          name:
                            event.target
                              .value,
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
                        business.ownerName
                      }
                      placeholder="Your name"
                      onChange={(
                        event,
                      ) =>
                        setBusiness({
                          ...business,
                          ownerName:
                            event.target
                              .value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="two-grid">
                  <div className="field">
                    <label>
                      Mobile Number
                    </label>

                    <input
                      className="input"
                      type="tel"
                      value={
                        business.phone
                      }
                      placeholder="Mobile number"
                      onChange={(
                        event,
                      ) =>
                        setBusiness({
                          ...business,
                          phone:
                            event.target
                              .value,
                        })
                      }
                    />
                  </div>

                  <div className="field">
                    <label>
                      City
                    </label>

                    <input
                      className="input"
                      value={
                        business.city
                      }
                      placeholder="Your city"
                      onChange={(
                        event,
                      ) =>
                        setBusiness({
                          ...business,
                          city:
                            event.target
                              .value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="onboarding-actions">
                <button
                  className="primary-button"
                  disabled={saving}
                  onClick={() =>
                    void saveBusiness()
                  }
                >
                  {saving
                    ? 'Saving…'
                    : 'Continue'}
                </button>
              </div>
            </>
          ) : null}


          {step === 2 ? (
            <>
              <span className="section-kicker">
                Step 2 of 3
              </span>

              <h2>
                Review your ingredient rates
              </h2>

              <p>
                We loaded the Admin default rates. Change only the prices that differ for your business. You can edit the complete Ingredient Index later.
              </p>

              <div className="onboarding-rates">
                {importantRates.map(
                  (row) => (
                    <div
                      key={row.id}
                      className="onboarding-rate"
                    >
                      <div>
                        <b>
                          {row.name}
                        </b>

                        <small>
                          Default ₹
                          {Number(
                            row.defaultRate,
                          ).toLocaleString(
                            'en-IN',
                          )}
                          {' / '}
                          {row.unit}
                        </small>
                      </div>

                      <label className="onboarding-rate-input">
                        ₹

                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={
                            rateValues[
                              row.id
                            ] || ''
                          }
                          onChange={(
                            event,
                          ) =>
                            setRateValues({
                              ...rateValues,

                              [row.id]:
                                event.target
                                  .value,
                            })
                          }
                        />
                      </label>
                    </div>
                  ),
                )}
              </div>

              {!importantRates.length ? (
                <div className="admin-message">
                  Ingredient defaults will be available after the Admin Ingredient Master is ready. You can continue now.
                </div>
              ) : null}

              <div className="onboarding-actions">
                <button
                  className="ghost-button"
                  onClick={() =>
                    setStep(1)
                  }
                >
                  Back
                </button>

                <button
                  className="primary-button"
                  disabled={saving}
                  onClick={() =>
                    void saveRates()
                  }
                >
                  {saving
                    ? 'Saving…'
                    : 'Continue'}
                </button>
              </div>
            </>
          ) : null}


          {step === 3 ? (
            <div className="onboarding-success">
              <div className="onboarding-success-mark">
                ✓
              </div>

              <span className="section-kicker">
                Step 3 of 3
              </span>

              <h2>
                Your workspace is ready
              </h2>

              <p>
                Now add your first event menu. Menu Cost will detect the dishes and start building your costing.
              </p>

              <div className="onboarding-actions" style={{
                justifyContent:
                  'center',
              }}>
                <button
                  className="ghost-button"
                  onClick={() =>
                    setStep(2)
                  }
                >
                  Back
                </button>

                <button
                  className="primary-button"
                  disabled={saving}
                  onClick={() =>
                    void finish()
                  }
                >
                  {saving
                    ? 'Opening…'
                    : 'Upload My First Menu'}
                </button>
              </div>
            </div>
          ) : null}

          {message ? (
            <div
              className="form-alert"
              style={{
                marginTop: 18,
              }}
            >
              {message}
            </div>
          ) : null}

        </section>
      </div>
    </main>
  );
}
