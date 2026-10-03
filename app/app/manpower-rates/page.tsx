'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import AppShell from '../../components/AppShell';
import {
  applyManpowerRateMaster,
  getSession,
  loadManpowerRateMaster,
  loadWork,
  saveManpowerRateMaster,
  saveWork,
  type ManpowerRateMasterItem,
} from '../../../lib/store';
import {
  calculateManpowerCost,
} from '../../../lib/manpowerCost';
import type {
  Session,
  WorkState,
} from '../../../lib/types';

function money(value: number) {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

function safeRate(value: string) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function normalizeRole(value: string) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('en-IN')
    .replace(/\s+/g, ' ');
}

type RateStatusFilter =
  | 'ALL'
  | 'EVENT'
  | 'MISSING';

export default function ManpowerRateMasterPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [items, setItems] = useState<ManpowerRateMasterItem[]>([]);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('ALL');
  const [statusFilter, setStatusFilter] =
    useState<RateStatusFilter>('ALL');
  const [message, setMessage] = useState('');
  const [work, setWork] =
    useState<WorkState | null>(null);

  useEffect(() => {
    const current = getSession();
    if (!current) {
      router.replace('/login');
      return;
    }

    setSession(current);
    setItems(loadManpowerRateMaster(current.tenantId));
    setWork(loadWork(current.tenantId));
  }, [router]);

  const departments = useMemo(
    () =>
      Array.from(
        new Set(items.map((item) => item.department || 'CUSTOM')),
      ),
    [items],
  );

  const eventRows =
    work?.manpower.filter(
      (row) =>
        Math.max(
          0,
          Number(row.quantity) || 0,
        ) > 0,
    ) || [];

  const eventRoleSummary =
    useMemo(() => {
      const map =
        new Map<
          string,
          {
            quantity: number;
            eventRate: number;
            manualOverride: boolean;
          }
        >();

      eventRows.forEach((row) => {
        const key =
          normalizeRole(row.role);

        if (!key) return;

        const current =
          map.get(key) || {
            quantity: 0,
            eventRate: 0,
            manualOverride: false,
          };

        map.set(key, {
          quantity:
            current.quantity +
            Math.max(
              0,
              Number(row.quantity) || 0,
            ),
          eventRate:
            Math.max(
              current.eventRate,
              Math.max(
                0,
                Number(row.rate) || 0,
              ),
            ),
          manualOverride:
            current.manualOverride ||
            Boolean(
              row.rateManualOverride,
            ),
        });
      });

      return map;
    }, [eventRows]);

  function eventSummaryFor(
    item: ManpowerRateMasterItem,
  ) {
    return (
      eventRoleSummary.get(
        normalizeRole(item.role),
      ) || null
    );
  }

  const filteredItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('en-IN');

    return items.filter((item) => {
      const matchesSearch =
        !query ||
        item.role.toLocaleLowerCase('en-IN').includes(query) ||
        item.department.toLocaleLowerCase('en-IN').includes(query);

      const matchesDepartment =
        department === 'ALL' ||
        item.department === department;

      const eventSummary =
        eventRoleSummary.get(
          normalizeRole(item.role),
        );

      const matchesStatus =
        statusFilter === 'ALL' ||
        (
          statusFilter === 'EVENT' &&
          Boolean(eventSummary)
        ) ||
        (
          statusFilter === 'MISSING' &&
          Boolean(eventSummary) &&
          !(item.rate > 0)
        );

      return (
        matchesSearch &&
        matchesDepartment &&
        matchesStatus
      );
    });
  }, [
    items,
    search,
    department,
    statusFilter,
    eventRoleSummary,
  ]);

  const pricedCount = items.filter((item) => item.rate > 0).length;
  const missingRateCount = items.length - pricedCount;

  const eventMasterRoles =
    items.filter(
      (item) =>
        eventRoleSummary.has(
          normalizeRole(item.role),
        ),
    );

  const eventMissingRateCount =
    eventMasterRoles.filter(
      (item) =>
        !(item.rate > 0),
    ).length;

  const eventRateReadyCount =
    eventMasterRoles.length -
    eventMissingRateCount;

  const eventRateCoveragePercent =
    eventMasterRoles.length > 0
      ? Math.round(
          (
            eventRateReadyCount /
            eventMasterRoles.length
          ) *
            100,
        )
      : 100;

  const totalEventPeople =
    eventRows.reduce(
      (sum, row) =>
        sum +
        Math.max(
          0,
          Number(row.quantity) || 0,
        ),
      0,
    );

  const currentEventCost =
    work
      ? calculateManpowerCost(
          work.manpower,
        )
      : 0;

  const projectedRows =
    work && session
      ? applyManpowerRateMaster(
          session.tenantId,
          work.manpower,
          false,
        )
      : [];

  const projectedEventCost =
    work
      ? calculateManpowerCost(
          projectedRows,
        )
      : 0;

  const manualOverrideCount =
    eventRows.filter(
      (row) =>
        Boolean(
          row.rateManualOverride,
        ),
    ).length;

  const currentEventName =
    work?.event.eventName ||
    work?.event.clientName ||
    'Current event';

  function updateRate(id: string, value: string) {
    const rate = safeRate(value);
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, rate } : item,
      ),
    );
    setMessage('');
  }

  function saveRates() {
    if (!session) return;
    const saved = saveManpowerRateMaster(session.tenantId, items);
    setItems(saved);
    setMessage('Manpower Rate Master saved. New event manpower will reuse these rates.');
  }

  function applyRatesToCurrentEvent() {
    if (!session || !work) return;

    const saved =
      saveManpowerRateMaster(
        session.tenantId,
        items,
      );

    const manpower =
      applyManpowerRateMaster(
        session.tenantId,
        work.manpower,
        false,
      );

    const nextWork: WorkState = {
      ...work,
      manpower,
      extras: {
        ...work.extras,
        staff:
          calculateManpowerCost(
            manpower,
          ),
      },
      sellingPricePerPlate: 0,
      updatedAt:
        new Date().toISOString(),
    };

    setItems(saved);
    setWork(nextWork);
    saveWork(
      session.tenantId,
      nextWork,
    );

    setMessage(
      'Rate Master applied to the current event. Manual event-rate overrides were preserved.',
    );
  }

  if (!session) {
    return (
      <AppShell title="Manpower Rate Master">
        <div className="loader-card">Loading manpower rates…</div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Manpower Rate Master"
      subtitle="Maintain reusable staff rates for all events"
      hidePageTitle
    >
      <section className="content-grid">
        <div className="manpower-rate-command">
          <div className="manpower-rate-command-copy">
            <span className="page-eyebrow">Cost Master · Manpower</span>
            <h2>Keep every staff role priced before the event reaches Final Cost</h2>
            <p>
              Set reusable purchase/contract rates once, see which roles are active in {currentEventName}, and apply the master without overwriting deliberate event-specific rate overrides.
            </p>

            <div className="manpower-rate-command-kpis">
              <article>
                <span>Event people</span>
                <b>{totalEventPeople}</b>
                <small>{eventMasterRoles.length} active master role{eventMasterRoles.length === 1 ? '' : 's'}</small>
              </article>
              <article className={eventMissingRateCount ? 'attention' : 'ready'}>
                <span>Missing event rates</span>
                <b>{eventMissingRateCount}</b>
                <small>{eventMissingRateCount ? 'Fix before Final Cost' : 'All active roles priced'}</small>
              </article>
              <article>
                <span>Current labor cost</span>
                <b>{money(currentEventCost)}</b>
                <small>{manualOverrideCount} event override{manualOverrideCount === 1 ? '' : 's'}</small>
              </article>
              <article>
                <span>Master-applied cost</span>
                <b>{money(projectedEventCost)}</b>
                <small>Manual overrides preserved</small>
              </article>
            </div>
          </div>

          <aside className="manpower-rate-command-side">
            <div
              className="manpower-rate-readiness-ring"
              style={{
                background:
                  `conic-gradient(${eventRateCoveragePercent === 100 ? '#55d98f' : '#4a9cff'} ${eventRateCoveragePercent * 3.6}deg, #25303d 0deg)`,
              }}
              aria-label={`Current event manpower rate coverage ${eventRateCoveragePercent}%`}
            >
              <span>
                <b>{eventRateCoveragePercent}%</b>
                <small>Rate ready</small>
              </span>
            </div>

            <div className="manpower-rate-command-action">
              <span>Current event</span>
              <b>{currentEventName}</b>
              <small>{eventRateReadyCount}/{eventMasterRoles.length} used roles have master rates</small>

              <button
                className="primary-button"
                type="button"
                disabled={!work}
                onClick={applyRatesToCurrentEvent}
              >
                Apply to Current Event
              </button>
            </div>
          </aside>
        </div>

        <div className="glass-card">
          <div className="final-costing-section-heading">
            <div>
              <span className="section-kicker">Reusable manpower rates</span>
              <h2>Role rate master</h2>
              <p>
                These are your normal purchase/contract rates per person. You can still override any rate inside an individual event.
              </p>
            </div>
            <button
              className="secondary-button"
              type="button"
              onClick={() => router.push('/app/team')}
            >
              Back to Manpower
            </button>
          </div>

          <div
            className="no-print"
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(220px, 1fr) 200px 200px',
              gap: 10,
              alignItems: 'end',
              marginBottom: 14,
            }}
          >
            <label className="field">
              <span>Find role</span>
              <input
                className="input"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search waiter, cook, helper..."
              />
            </label>

            <label className="field">
              <span>Department</span>
              <select
                className="input"
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
              >
                <option value="ALL">All departments</option>
                {departments.map((item) => (
                  <option value={item} key={item}>
                    {item.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Usage status</span>
              <select
                className="input"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as RateStatusFilter,
                  )
                }
              >
                <option value="ALL">All roles</option>
                <option value="EVENT">Current event roles</option>
                <option value="MISSING">Missing event rates</option>
              </select>
            </label>
          </div>

          <div className="table-wrap">
            <table className="manpower-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Rate / person</th>
                  <th>Current Event</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, index) => {
                  const eventSummary =
                    eventSummaryFor(item);

                  return (
                  <tr
                    key={item.id}
                    className={
                      [
                        item.rate > 0 ? 'is-active' : '',
                        eventSummary ? 'is-event-role' : '',
                        eventSummary && !(item.rate > 0) ? 'is-missing-rate' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')
                    }
                  >
                    <td><b>{index + 1}</b></td>
                    <td>
                      <strong>{item.role}</strong>
                      {item.customRole ? (
                        <small className="muted" style={{ display: 'block' }}>Custom role</small>
                      ) : null}
                    </td>
                    <td>
                      <span className="muted">{item.department.replace(/_/g, ' ')}</span>
                    </td>
                    <td>
                      <label className="manpower-rate-input">
                        <span aria-hidden="true">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          inputMode="decimal"
                          value={item.rate || ''}
                          placeholder="0"
                          onChange={(event) => updateRate(item.id, event.target.value)}
                          aria-label={`Rate for ${item.role}`}
                        />
                      </label>
                    </td>
                    <td>
                      {eventSummary ? (
                        <div className="manpower-rate-event-cell">
                          <b>{eventSummary.quantity} people</b>
                          <span>
                            Event rate {money(eventSummary.eventRate)}
                          </span>
                          {eventSummary.manualOverride ? (
                            <small>Manual event override</small>
                          ) : (
                            <small>Uses rate master</small>
                          )}
                        </div>
                      ) : (
                        <span className="muted">Not used</span>
                      )}
                    </td>
                    <td>
                      <span className={item.rate > 0 ? 'account-status active' : 'needs-attention'}>
                        {item.rate > 0 ? `${money(item.rate)} / person` : 'Add rate'}
                      </span>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredItems.length === 0 ? (
            <div className="empty-state">
              <div>
                <h3>No matching manpower roles</h3>
                <p>Clear search or department filter to show all roles.</p>
              </div>
              <button
                className="ghost-button"
                type="button"
                onClick={() => {
                  setSearch('');
                  setDepartment('ALL');
                }}
              >
                Clear filters
              </button>
            </div>
          ) : null}

          {message ? (
            <div className="admin-message" style={{ marginTop: 14 }}>
              {message}
            </div>
          ) : null}
        </div>

        <div className="action-row page-actions">
          <button className="primary-button" type="button" onClick={saveRates}>
            Save Manpower Rates
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={applyRatesToCurrentEvent}
            disabled={!work}
          >
            Apply to Current Event
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={() => router.push('/app/team')}
          >
            Back to Manpower
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={() => router.push('/app/vendors')}
          >
            Vendors & Agencies
          </button>
        </div>
        <style>{`
          .manpower-rate-command {
            display:grid;
            grid-template-columns:minmax(0,1fr) minmax(330px,.52fr);
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

          .manpower-rate-command-copy h2 {
            margin:7px 0 6px;
            max-width:820px;
            font-size:clamp(28px,3.4vw,40px);
            line-height:1.04;
            letter-spacing:-.045em;
          }

          .manpower-rate-command-copy > p {
            max-width:800px;
            margin:0;
            color:#8b98a9;
            font-size:10px;
            line-height:1.55;
          }

          .manpower-rate-command-kpis {
            display:grid;
            grid-template-columns:repeat(4,minmax(0,1fr));
            gap:7px;
            margin-top:14px;
          }

          .manpower-rate-command-kpis article {
            min-width:0;
            padding:10px;
            border:1px solid rgba(148,163,184,.10);
            border-radius:11px;
            background:rgba(255,255,255,.022);
          }

          .manpower-rate-command-kpis article.ready {
            border-color:rgba(85,217,143,.15);
            background:rgba(85,217,143,.035);
          }

          .manpower-rate-command-kpis article.attention {
            border-color:rgba(244,173,84,.18);
            background:rgba(244,173,84,.045);
          }

          .manpower-rate-command-kpis span,
          .manpower-rate-command-kpis b,
          .manpower-rate-command-kpis small {
            display:block;
          }

          .manpower-rate-command-kpis span {
            color:#718094;
            font-size:7px;
            font-weight:900;
            text-transform:uppercase;
          }

          .manpower-rate-command-kpis b {
            margin-top:5px;
            color:#e7eef6;
            font-size:14px;
          }

          .manpower-rate-command-kpis small {
            margin-top:3px;
            color:#68778a;
            font-size:7px;
          }

          .manpower-rate-command-side {
            display:grid;
            grid-template-columns:80px minmax(0,1fr);
            gap:13px;
            align-items:center;
            padding:13px;
            border:1px solid rgba(74,156,255,.15);
            border-radius:15px;
            background:rgba(74,156,255,.04);
          }

          .manpower-rate-readiness-ring {
            display:grid;
            width:76px;
            height:76px;
            padding:6px;
            place-items:center;
            border-radius:50%;
          }

          .manpower-rate-readiness-ring > span {
            display:grid;
            width:100%;
            height:100%;
            place-items:center;
            border:1px solid rgba(255,255,255,.05);
            border-radius:50%;
            background:#0f161e;
          }

          .manpower-rate-readiness-ring b,
          .manpower-rate-readiness-ring small {
            display:block;
            line-height:1;
          }

          .manpower-rate-readiness-ring b {
            color:#eef5fc;
            font-size:17px;
          }

          .manpower-rate-readiness-ring small {
            margin-top:-10px;
            color:#748397;
            font-size:6px;
            font-weight:900;
            text-transform:uppercase;
          }

          .manpower-rate-command-action > span,
          .manpower-rate-command-action > b,
          .manpower-rate-command-action > small {
            display:block;
          }

          .manpower-rate-command-action > span {
            color:#8190a2;
            font-size:7px;
            font-weight:900;
            text-transform:uppercase;
          }

          .manpower-rate-command-action > b {
            margin:4px 0;
            color:#f4f8fc;
            font-size:13px;
          }

          .manpower-rate-command-action > small {
            color:#7d8b9d;
            font-size:8px;
          }

          .manpower-rate-command-action .primary-button {
            width:100%;
            margin-top:9px;
          }

          .manpower-table tbody tr.is-event-role {
            box-shadow:inset 3px 0 0 rgba(74,156,255,.55);
          }

          .manpower-table tbody tr.is-missing-rate {
            box-shadow:inset 3px 0 0 rgba(255,126,118,.70);
          }

          .manpower-rate-event-cell {
            display:grid;
            gap:2px;
            min-width:120px;
          }

          .manpower-rate-event-cell b {
            color:#cfe2f7;
            font-size:10px;
          }

          .manpower-rate-event-cell span {
            color:#8190a2;
            font-size:8px;
          }

          .manpower-rate-event-cell small {
            color:#64758a;
            font-size:7px;
          }

          @media(max-width:1100px) {
            .manpower-rate-command {
              grid-template-columns:1fr;
            }

            .manpower-rate-command-side {
              max-width:440px;
            }

            .manpower-rate-command-kpis {
              grid-template-columns:1fr 1fr;
            }
          }

          @media(max-width:760px) {
            .manpower-rate-command {
              padding:16px;
            }

            .manpower-rate-command-side {
              grid-template-columns:62px minmax(0,1fr);
            }

            .manpower-rate-readiness-ring {
              width:58px;
              height:58px;
            }

            .manpower-rate-command-kpis {
              grid-template-columns:1fr 1fr;
            }
          }
        `}</style>
      </section>
    </AppShell>
  );
}
