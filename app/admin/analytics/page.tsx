'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import Link from 'next/link';
import {
  useRouter,
} from 'next/navigation';

type FunnelStage = {
  key: string;
  label: string;
  count: number;
  conversion: number;
};

type TrendPoint = {
  date: string;
  label: string;
  signups: number;
  activity: number;
};

type ClientRow = {
  id: string;
  name: string;
  email: string;
  plan: string;
  status: string;
  onboardingCompleted: boolean;
  subscriptionStatus:
    | string
    | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  lastActiveAt: string;
  menuCount: number;
  costingCount: number;
  stage: string;
  attention: string;
};

type LatestEvent = {
  id: string;
  eventName: string;
  createdAt: string;
  tenantName: string;
};

type AnalyticsData = {
  days: number;
  generatedAt: string;
  metrics: {
    estimatedMrr: number;
    proUsers: number;
    activeClients: number;
    signups: number;
    visitorToSignup: number;
    signupToPro: number;
    finalCostingRate: number;
  };
  funnel: FunnelStage[];
  trend: TrendPoint[];
  attention: ClientRow[];
  clients: ClientRow[];
  latestEvents: LatestEvent[];
};

function money(
  value: number,
) {
  return `₹${Math.round(
    value,
  ).toLocaleString(
    'en-IN',
  )}`;
}

function dateTime(
  value: string,
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return '—';
  }

  return date.toLocaleString(
    'en-IN',
    {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    },
  );
}

function eventLabel(
  value: string,
) {
  const labels:
    Record<string, string> = {
      page_view:
        'Opened a page',
      landing_view:
        'Viewed landing page',
      signup_view:
        'Viewed signup',
      signup_cta_click:
        'Clicked Start Free',
      onboarding_view:
        'Viewed onboarding',
      menu_detected:
        'Detected a menu',
      menu_saved:
        'Saved a menu',
      cost_reviewed:
        'Reviewed costing',
      final_costing_viewed:
        'Opened final costing',
      final_costing_complete:
        'Completed final costing',
      pdf_exported:
        'Exported PDF',
    };

  return (
    labels[value] ||
    value
      .replace(/_/g, ' ')
      .replace(
        /\b\w/g,
        (letter) =>
          letter.toUpperCase(),
      )
  );
}

export default function AdminAnalyticsPage() {
  const router =
    useRouter();

  const [days, setDays] =
    useState(30);

  const [data, setData] =
    useState<AnalyticsData | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  useEffect(() => {
    void loadAnalytics();
  }, [days]);

  async function loadAnalytics() {
    setLoading(true);
    setError('');

    try {
      const response =
        await fetch(
          `/api/admin/analytics?days=${days}`,
          {
            cache: 'no-store',
          },
        );

      if (
        response.status ===
        401
      ) {
        router.push('/login');
        return;
      }

      const result =
        await response.json();

      if (!response.ok) {
        setError(
          result.error ||
            'Analytics could not be loaded.',
        );
        return;
      }

      setData(result);
    } catch {
      setError(
        'Server connection failed.',
      );
    } finally {
      setLoading(false);
    }
  }

  const maxFunnel =
    useMemo(
      () =>
        Math.max(
          1,
          ...(data?.funnel.map(
            (item) =>
              item.count,
          ) || [1]),
        ),
      [data],
    );

  const maxTrend =
    useMemo(
      () =>
        Math.max(
          1,
          ...(data?.trend.map(
            (item) =>
              Math.max(
                item.signups,
                item.activity,
              ),
          ) || [1]),
        ),
      [data],
    );

  return (
    <main className="mca-page">
      <style>{`
        .mca-page {
          --bg:#07090d;
          --panel:#10141b;
          --panel2:#151a22;
          --line:#272d37;
          --text:#f5f7fa;
          --muted:#929baa;
          --blue:#4a9cff;
          --green:#3ddc84;
          --orange:#ffad42;
          min-height:100vh;
          padding:16px 22px 54px;
          color:var(--text);
          background:
            radial-gradient(circle at 7% 0%,rgba(74,156,255,.14),transparent 32rem),
            radial-gradient(circle at 96% 5%,rgba(112,81,255,.08),transparent 28rem),
            linear-gradient(180deg,#0b0e13 0%,#07090d 100%);
          font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif;
        }

        .mca-page * {
          box-sizing:border-box;
        }

        .mca-page a {
          color:inherit;
          text-decoration:none;
        }

        .mca-topbar {
          position:sticky;
          top:12px;
          z-index:40;
          display:flex;
          width:min(1480px,100%);
          min-height:66px;
          align-items:center;
          justify-content:space-between;
          gap:18px;
          margin:0 auto;
          padding:9px 10px;
          border:1px solid rgba(255,255,255,.09);
          border-radius:18px;
          background:rgba(12,15,21,.9);
          box-shadow:0 18px 48px rgba(0,0,0,.28);
          backdrop-filter:blur(22px) saturate(145%);
        }

        .mca-brand {
          display:flex;
          align-items:center;
          gap:10px;
          min-width:0;
        }

        .mca-mark {
          display:grid;
          width:43px;
          height:43px;
          place-items:center;
          border-radius:13px;
          color:#fff;
          background:linear-gradient(145deg,#1b2635,#1478f2);
          font-size:12px;
          font-weight:900;
        }

        .mca-brand b,
        .mca-brand small {
          display:block;
        }

        .mca-brand b {
          font-size:14px;
        }

        .mca-brand small {
          margin-top:2px;
          color:#7f8a99;
          font-size:9px;
          font-weight:800;
          text-transform:uppercase;
        }

        .mca-nav {
          display:flex;
          gap:4px;
          padding:4px;
          border-radius:12px;
          background:#11161e;
        }

        .mca-nav a {
          padding:8px 11px;
          border-radius:9px;
          color:#7f8a99;
          font-size:10px;
          font-weight:850;
        }

        .mca-nav a.active {
          color:#9bc8ff;
          background:rgba(74,156,255,.13);
        }

        .mca-refresh {
          min-height:40px;
          padding:0 13px;
          border:1px solid #303743;
          border-radius:11px;
          color:#c2cad5;
          background:#151a22;
          font:inherit;
          font-size:10px;
          font-weight:850;
          cursor:pointer;
        }

        .mca-wrap {
          width:min(1480px,100%);
          margin:0 auto;
        }

        .mca-hero {
          display:flex;
          align-items:flex-end;
          justify-content:space-between;
          gap:25px;
          padding:45px 3px 25px;
        }

        .mca-overline {
          color:#78b5ff;
          font-size:9px;
          font-weight:900;
          letter-spacing:.11em;
          text-transform:uppercase;
        }

        .mca-hero h1 {
          margin:7px 0 6px;
          font-size:clamp(36px,4.5vw,56px);
          line-height:.98;
          letter-spacing:-.055em;
        }

        .mca-hero p {
          max-width:760px;
          margin:0;
          color:var(--muted);
          font-size:13px;
          line-height:1.55;
        }

        .mca-period {
          display:flex;
          gap:4px;
          padding:4px;
          border:1px solid rgba(255,255,255,.06);
          border-radius:11px;
          background:#11161e;
        }

        .mca-period button {
          min-height:34px;
          padding:0 11px;
          border:0;
          border-radius:8px;
          color:#7c8796;
          background:transparent;
          font:inherit;
          font-size:9px;
          font-weight:850;
          cursor:pointer;
        }

        .mca-period button.active {
          color:#fff;
          background:#252c36;
        }

        .mca-note,
        .mca-error {
          margin-bottom:13px;
          padding:12px 14px;
          border-radius:12px;
          font-size:10px;
          line-height:1.5;
        }

        .mca-note {
          border:1px solid rgba(74,156,255,.15);
          color:#9cb0c8;
          background:rgba(74,156,255,.055);
        }

        .mca-error {
          border:1px solid rgba(255,98,89,.25);
          color:#ff918a;
          background:rgba(255,98,89,.08);
        }

        .mca-metrics {
          display:grid;
          grid-template-columns:repeat(6,minmax(0,1fr));
          gap:10px;
          margin-bottom:16px;
        }

        .mca-metric {
          min-height:112px;
          padding:17px;
          border:1px solid var(--line);
          border-radius:17px;
          background:linear-gradient(180deg,#11161e,#0f1319);
          box-shadow:0 10px 28px rgba(0,0,0,.18);
        }

        .mca-metric span,
        .mca-metric strong,
        .mca-metric small {
          display:block;
        }

        .mca-metric span {
          color:#7b8796;
          font-size:8px;
          font-weight:850;
          letter-spacing:.05em;
          text-transform:uppercase;
        }

        .mca-metric strong {
          margin:9px 0 4px;
          font-size:24px;
          letter-spacing:-.045em;
        }

        .mca-metric small {
          color:#667181;
          font-size:8px;
          line-height:1.4;
        }

        .mca-grid {
          display:grid;
          grid-template-columns:minmax(0,1.2fr) minmax(330px,.8fr);
          gap:16px;
          margin-bottom:16px;
        }

        .mca-panel {
          border:1px solid var(--line);
          border-radius:20px;
          background:rgba(16,20,27,.96);
          box-shadow:0 16px 38px rgba(0,0,0,.22);
        }

        .mca-panel-inner {
          padding:20px;
        }

        .mca-panel-head {
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:15px;
          margin-bottom:18px;
        }

        .mca-panel-head h2 {
          margin:5px 0 0;
          font-size:20px;
          letter-spacing:-.035em;
        }

        .mca-panel-head span:last-child {
          color:#697585;
          font-size:8px;
        }

        .mca-funnel {
          display:grid;
          gap:8px;
        }

        .mca-funnel-row {
          display:grid;
          grid-template-columns:minmax(130px,.8fr) minmax(160px,1.6fr) 70px 68px;
          gap:11px;
          align-items:center;
        }

        .mca-funnel-label {
          min-width:0;
          color:#c7ced7;
          font-size:10px;
          font-weight:780;
        }

        .mca-funnel-track {
          height:30px;
          overflow:hidden;
          border-radius:9px;
          background:#0b0f14;
        }

        .mca-funnel-fill {
          display:flex;
          min-width:4px;
          height:100%;
          align-items:center;
          padding-left:9px;
          border-radius:9px;
          background:linear-gradient(90deg,#1478f2,#4a9cff);
        }

        .mca-funnel-count {
          color:#f3f6f9;
          font-size:11px;
          font-weight:900;
          text-align:right;
        }

        .mca-funnel-rate {
          color:#7f8b9a;
          font-size:8px;
          font-weight:800;
          text-align:right;
        }

        .mca-attention-list,
        .mca-activity-list {
          display:grid;
          gap:7px;
        }

        .mca-attention-item,
        .mca-activity-item {
          padding:11px 12px;
          border:1px solid #252c35;
          border-radius:11px;
          background:#0d1117;
        }

        .mca-attention-item {
          display:grid;
          grid-template-columns:1fr auto;
          gap:10px;
        }

        .mca-attention-item b,
        .mca-attention-item span,
        .mca-attention-item small,
        .mca-activity-item b,
        .mca-activity-item span {
          display:block;
        }

        .mca-attention-item b,
        .mca-activity-item b {
          color:#e7ebf0;
          font-size:10px;
        }

        .mca-attention-item span {
          margin-top:3px;
          color:#ffbd67;
          font-size:8px;
          line-height:1.4;
        }

        .mca-attention-item small {
          color:#626d7c;
          font-size:7px;
          text-align:right;
        }

        .mca-empty {
          display:grid;
          min-height:180px;
          place-items:center;
          color:#768191;
          font-size:10px;
          text-align:center;
        }

        .mca-trend {
          display:grid;
          grid-template-columns:repeat(auto-fit,minmax(16px,1fr));
          min-height:210px;
          align-items:end;
          gap:5px;
          padding-top:16px;
        }

        .mca-trend-col {
          display:grid;
          min-width:0;
          height:190px;
          grid-template-rows:1fr auto;
          gap:6px;
          align-items:end;
        }

        .mca-bars {
          display:flex;
          height:100%;
          align-items:flex-end;
          justify-content:center;
          gap:2px;
        }

        .mca-bar {
          width:7px;
          min-height:2px;
          border-radius:4px 4px 2px 2px;
          background:#4a9cff;
        }

        .mca-bar.activity {
          background:#3ddc84;
          opacity:.65;
        }

        .mca-trend-col small {
          overflow:hidden;
          color:#566170;
          font-size:6px;
          text-align:center;
          text-overflow:clip;
          white-space:nowrap;
        }

        .mca-legend {
          display:flex;
          gap:13px;
          margin-top:12px;
          color:#7d8897;
          font-size:8px;
          font-weight:750;
        }

        .mca-legend span {
          display:flex;
          align-items:center;
          gap:6px;
        }

        .mca-legend i {
          width:8px;
          height:8px;
          border-radius:3px;
          background:#4a9cff;
        }

        .mca-legend i.green {
          background:#3ddc84;
          opacity:.65;
        }

        .mca-table-wrap {
          overflow:auto;
        }

        .mca-table {
          width:100%;
          min-width:900px;
          border-collapse:collapse;
        }

        .mca-table th,
        .mca-table td {
          padding:12px 13px;
          border-bottom:1px solid rgba(255,255,255,.055);
          text-align:left;
        }

        .mca-table th {
          color:#687484;
          background:#11161e;
          font-size:7px;
          font-weight:900;
          letter-spacing:.06em;
          text-transform:uppercase;
        }

        .mca-table td {
          color:#aeb7c3;
          font-size:9px;
        }

        .mca-client b,
        .mca-client span {
          display:block;
        }

        .mca-client b {
          color:#eef2f6;
          font-size:10px;
        }

        .mca-client span {
          margin-top:2px;
          color:#687484;
          font-size:8px;
        }

        .mca-stage {
          display:inline-flex;
          padding:5px 7px;
          border-radius:7px;
          color:#86bcff;
          background:rgba(74,156,255,.10);
          font-size:7px;
          font-weight:900;
        }

        .mca-plan {
          display:inline-flex;
          padding:5px 7px;
          border-radius:7px;
          color:#aeb7c3;
          background:#202630;
          font-size:7px;
          font-weight:900;
          text-transform:uppercase;
        }

        .mca-plan.pro {
          color:#86bcff;
          background:#14263a;
        }

        .mca-alert {
          color:#ffbd67;
          font-size:8px;
          font-weight:750;
        }

        .mca-activity-item {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
        }

        .mca-activity-item span {
          margin-top:3px;
          color:#697585;
          font-size:8px;
        }

        .mca-activity-time {
          color:#5d6877;
          font-size:7px;
          white-space:nowrap;
        }

        .mca-loading {
          display:grid;
          min-height:320px;
          place-items:center;
          color:#7e8998;
          font-size:11px;
        }

        @media (max-width:1180px) {
          .mca-metrics {
            grid-template-columns:repeat(3,minmax(0,1fr));
          }

          .mca-grid {
            grid-template-columns:1fr;
          }
        }

        @media (max-width:760px) {
          .mca-page {
            padding:10px 12px 32px;
          }

          .mca-topbar {
            top:7px;
            min-height:60px;
            border-radius:15px;
          }

          .mca-brand small {
            display:none;
          }

          .mca-nav a {
            padding-inline:8px;
            font-size:9px;
          }

          .mca-refresh {
            padding-inline:9px;
          }

          .mca-hero {
            align-items:flex-start;
            flex-direction:column;
            padding-top:32px;
          }

          .mca-metrics {
            grid-template-columns:repeat(2,minmax(0,1fr));
          }

          .mca-funnel-row {
            grid-template-columns:105px minmax(100px,1fr) 45px;
          }

          .mca-funnel-rate {
            display:none;
          }
        }

        @media (max-width:520px) {
          .mca-nav a:nth-child(4) {
            display:none;
          }

          .mca-metric {
            min-height:98px;
            padding:14px;
          }

          .mca-panel-inner {
            padding:15px;
          }

          .mca-funnel-row {
            grid-template-columns:95px minmax(80px,1fr) 38px;
            gap:7px;
          }
        }
      `}</style>

      <header className="mca-topbar">
        <Link
          href="/admin/users"
          className="mca-brand"
        >
          <span className="mca-mark">
            MC
          </span>
          <span>
            <b>
              Menu Costing
            </b>
            <small>
              Control Center
            </small>
          </span>
        </Link>

        <nav className="mca-nav">
          <Link href="/admin/users">
            Clients
          </Link>
          <Link
            className="active"
            href="/admin/analytics"
          >
            Analytics
          </Link>
          <Link href="/admin/dishes">
            Dishes
          </Link>
          <Link href="/admin/recipes">
            Recipes
          </Link>
        </nav>

        <button
          className="mca-refresh"
          type="button"
          disabled={loading}
          onClick={() =>
            void loadAnalytics()
          }
        >
          {loading
            ? 'Loading…'
            : 'Refresh'}
        </button>
      </header>

      <div className="mca-wrap">
        <section className="mca-hero">
          <div>
            <span className="mca-overline">
              Product analytics
            </span>
            <h1>
              Conversion dashboard
            </h1>
            <p>
              See where caterers move forward, where they stop, and which accounts need attention before they disappear from the funnel.
            </p>
          </div>

          <div className="mca-period">
            {[7, 30, 90].map(
              (value) => (
                <button
                  key={value}
                  type="button"
                  className={
                    days === value
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    setDays(value)
                  }
                >
                  {value} days
                </button>
              ),
            )}
          </div>
        </section>

        <div className="mca-note">
          Visitor and in-product event analytics begin collecting after this release. Existing tenant signup, onboarding and plan data comes from your current database, but historical landing visits and menu actions cannot be reconstructed.
        </div>

        {error ? (
          <div className="mca-error">
            {error}
          </div>
        ) : null}

        {loading && !data ? (
          <div className="mca-loading">
            Loading Menu Costing analytics…
          </div>
        ) : data ? (
          <>
            <section className="mca-metrics">
              <article className="mca-metric">
                <span>
                  Estimated MRR
                </span>
                <strong>
                  {money(
                    data.metrics
                      .estimatedMrr,
                  )}
                </strong>
                <small>
                  Active Pro users × ₹999
                </small>
              </article>

              <article className="mca-metric">
                <span>
                  Pro users
                </span>
                <strong>
                  {
                    data.metrics
                      .proUsers
                  }
                </strong>
                <small>
                  Current active Pro accounts
                </small>
              </article>

              <article className="mca-metric">
                <span>
                  Signups
                </span>
                <strong>
                  {
                    data.metrics
                      .signups
                  }
                </strong>
                <small>
                  New accounts in this period
                </small>
              </article>

              <article className="mca-metric">
                <span>
                  Visitor → signup
                </span>
                <strong>
                  {
                    data.metrics
                      .visitorToSignup
                  }
                  %
                </strong>
                <small>
                  Landing visitors converting
                </small>
              </article>

              <article className="mca-metric">
                <span>
                  Signup → Pro
                </span>
                <strong>
                  {
                    data.metrics
                      .signupToPro
                  }
                  %
                </strong>
                <small>
                  New signup cohort now on Pro
                </small>
              </article>

              <article className="mca-metric">
                <span>
                  Final costing
                </span>
                <strong>
                  {
                    data.metrics
                      .finalCostingRate
                  }
                  %
                </strong>
                <small>
                  Signup cohort reaching completed costing
                </small>
              </article>
            </section>

            <section className="mca-grid">
              <article className="mca-panel">
                <div className="mca-panel-inner">
                  <div className="mca-panel-head">
                    <div>
                      <span className="mca-overline">
                        Activation funnel
                      </span>
                      <h2>
                        From visit to Pro
                      </h2>
                    </div>
                    <span>
                      Last {data.days} days
                    </span>
                  </div>

                  <div className="mca-funnel">
                    {data.funnel.map(
                      (
                        stage,
                        index,
                      ) => (
                        <div
                          className="mca-funnel-row"
                          key={
                            stage.key
                          }
                        >
                          <span className="mca-funnel-label">
                            {
                              stage.label
                            }
                          </span>

                          <div className="mca-funnel-track">
                            <div
                              className="mca-funnel-fill"
                              style={{
                                width: `${Math.max(
                                  2,
                                  (stage.count /
                                    maxFunnel) *
                                    100,
                                )}%`,
                              }}
                            />
                          </div>

                          <strong className="mca-funnel-count">
                            {
                              stage.count
                            }
                          </strong>

                          <span className="mca-funnel-rate">
                            {index === 0
                              ? 'base'
                              : `${stage.conversion}%`}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </article>

              <article className="mca-panel">
                <div className="mca-panel-inner">
                  <div className="mca-panel-head">
                    <div>
                      <span className="mca-overline">
                        Needs attention
                      </span>
                      <h2>
                        Users at risk
                      </h2>
                    </div>
                    <span>
                      {
                        data.attention
                          .length
                      }{' '}
                      shown
                    </span>
                  </div>

                  {data.attention
                    .length === 0 ? (
                    <div className="mca-empty">
                      No account currently matches the attention rules.
                    </div>
                  ) : (
                    <div className="mca-attention-list">
                      {data.attention.map(
                        (client) => (
                          <div
                            className="mca-attention-item"
                            key={
                              client.id
                            }
                          >
                            <div>
                              <b>
                                {
                                  client.name
                                }
                              </b>
                              <span>
                                {
                                  client.attention
                                }
                              </span>
                            </div>
                            <small>
                              {
                                client.stage
                              }
                            </small>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </article>
            </section>

            <section className="mca-grid">
              <article className="mca-panel">
                <div className="mca-panel-inner">
                  <div className="mca-panel-head">
                    <div>
                      <span className="mca-overline">
                        Activity trend
                      </span>
                      <h2>
                        Signups and product activity
                      </h2>
                    </div>
                    <span>
                      Last{' '}
                      {
                        data.trend
                          .length
                      }{' '}
                      days shown
                    </span>
                  </div>

                  <div className="mca-trend">
                    {data.trend.map(
                      (point) => (
                        <div
                          className="mca-trend-col"
                          key={
                            point.date
                          }
                          title={`${point.label}: ${point.signups} signups, ${point.activity} client events`}
                        >
                          <div className="mca-bars">
                            <i
                              className="mca-bar"
                              style={{
                                height: `${Math.max(
                                  2,
                                  (point.signups /
                                    maxTrend) *
                                    100,
                                )}%`,
                              }}
                            />
                            <i
                              className="mca-bar activity"
                              style={{
                                height: `${Math.max(
                                  2,
                                  (point.activity /
                                    maxTrend) *
                                    100,
                                )}%`,
                              }}
                            />
                          </div>
                          <small>
                            {
                              point.label
                            }
                          </small>
                        </div>
                      ),
                    )}
                  </div>

                  <div className="mca-legend">
                    <span>
                      <i />
                      Signups
                    </span>
                    <span>
                      <i className="green" />
                      Product activity
                    </span>
                  </div>
                </div>
              </article>

              <article className="mca-panel">
                <div className="mca-panel-inner">
                  <div className="mca-panel-head">
                    <div>
                      <span className="mca-overline">
                        Live activity
                      </span>
                      <h2>
                        Recent actions
                      </h2>
                    </div>
                  </div>

                  {data.latestEvents
                    .length === 0 ? (
                    <div className="mca-empty">
                      New product actions will appear here after analytics starts collecting.
                    </div>
                  ) : (
                    <div className="mca-activity-list">
                      {data.latestEvents.map(
                        (event) => (
                          <div
                            className="mca-activity-item"
                            key={
                              event.id
                            }
                          >
                            <div>
                              <b>
                                {
                                  event.tenantName
                                }
                              </b>
                              <span>
                                {eventLabel(
                                  event.eventName,
                                )}
                              </span>
                            </div>
                            <small className="mca-activity-time">
                              {dateTime(
                                event.createdAt,
                              )}
                            </small>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </article>
            </section>

            <section className="mca-panel">
              <div className="mca-panel-inner">
                <div className="mca-panel-head">
                  <div>
                    <span className="mca-overline">
                      Client activity
                    </span>
                    <h2>
                      Activation by account
                    </h2>
                  </div>
                  <span>
                    {
                      data.clients
                        .length
                    }{' '}
                    accounts
                  </span>
                </div>

                <div className="mca-table-wrap">
                  <table className="mca-table">
                    <thead>
                      <tr>
                        <th>
                          Client
                        </th>
                        <th>
                          Stage
                        </th>
                        <th>
                          Plan
                        </th>
                        <th>
                          Menus
                        </th>
                        <th>
                          Costings
                        </th>
                        <th>
                          Last active
                        </th>
                        <th>
                          Attention
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.clients.map(
                        (client) => (
                          <tr
                            key={
                              client.id
                            }
                          >
                            <td>
                              <div className="mca-client">
                                <b>
                                  {
                                    client.name
                                  }
                                </b>
                                <span>
                                  {
                                    client.email
                                  }
                                </span>
                              </div>
                            </td>
                            <td>
                              <span className="mca-stage">
                                {
                                  client.stage
                                }
                              </span>
                            </td>
                            <td>
                              <span
                                className={`mca-plan ${
                                  client.plan ===
                                  'PRO'
                                    ? 'pro'
                                    : ''
                                }`}
                              >
                                {
                                  client.plan
                                }
                              </span>
                            </td>
                            <td>
                              {
                                client.menuCount
                              }
                            </td>
                            <td>
                              {
                                client.costingCount
                              }
                            </td>
                            <td>
                              {dateTime(
                                client.lastActiveAt,
                              )}
                            </td>
                            <td>
                              <span className="mca-alert">
                                {client.attention ||
                                  '—'}
                              </span>
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
