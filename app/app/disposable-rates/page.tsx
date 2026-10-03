'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import AppShell from '../../components/AppShell';
import {
  getSession,
  loadDisposableRateMaster,
  loadWork,
  saveDisposableRateMaster,
  saveWork,
  type DisposableRateMasterItem,
} from '../../../lib/store';
import {
  calculateDisposableCost,
} from '../../../lib/disposableCost';
import type {
  Session,
  WorkState,
} from '../../../lib/types';

const UNITS = [
  'pcs',
  'pair',
  'pack',
  'box',
  'roll',
  'kg',
  'g',
  'litre',
  'ml',
  'set',
  'dozen',
  'bundle',
  'event',
];

function money(value: number) {
  return `₹${Math.round(value * 100) / 100}`;
}

function safeNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function categoryFor(name: string) {
  const value = name.toLocaleLowerCase('en-IN');
  if (/plate|spoon|fork|bowl/.test(value)) return 'Serviceware';
  if (/cup|glass|straw/.test(value)) return 'Beverage';
  if (/box|packing|silver roll|foil|wrap/.test(value)) return 'Packing';
  if (/tissue|napkin|cap|glove|toothpick/.test(value)) return 'Hygiene';
  if (/garbage|waste/.test(value)) return 'Waste';
  return 'Other';
}

function normalizeName(value: string) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('en-IN')
    .replace(/\s+/g, ' ');
}

type PlasticUsageFilter =
  | 'ALL'
  | 'EVENT'
  | 'MISSING';

export default function DisposableRateMasterPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [items, setItems] = useState<DisposableRateMasterItem[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [usageFilter, setUsageFilter] =
    useState<PlasticUsageFilter>('ALL');
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
    setItems(loadDisposableRateMaster(current.tenantId));
    setWork(loadWork(current.tenantId));
  }, [router]);

  const categories =
    useMemo(
      () =>
        Array.from(
          new Set(
            items.map(
              (item) =>
                categoryFor(
                  item.name,
                ),
            ),
          ),
        ).sort(),
      [items],
    );

  const masterByName =
    useMemo(
      () =>
        new Map(
          items.map(
            (item) => [
              normalizeName(
                item.name,
              ),
              item,
            ] as const,
          ),
        ),
      [items],
    );

  const eventItems =
    work?.disposableItems.filter(
      (item) =>
        Math.max(
          0,
          Number(
            item.quantity,
          ) || 0,
        ) > 0,
    ) || [];

  const eventItemByName =
    useMemo(
      () =>
        new Map(
          eventItems.map(
            (item) => [
              normalizeName(
                item.name,
              ),
              item,
            ] as const,
          ),
        ),
      [eventItems],
    );

  const projectedEventItems =
    work
      ? work.disposableItems.map(
          (item) => {
            if (
              Number(
                item.unitCost,
              ) > 0
            ) {
              return item;
            }

            const master =
              masterByName.get(
                normalizeName(
                  item.name,
                ),
              );

            if (!master) {
              return item;
            }

            return {
              ...item,
              unit:
                item.unit ||
                master.unit ||
                'pcs',
              unitCost:
                Math.max(
                  0,
                  Number(
                    master.unitCost,
                  ) || 0,
                ),
            };
          },
        )
      : [];

  const currentEventCost =
    work
      ? calculateDisposableCost(
          work.disposableItems,
        ).total
      : 0;

  const projectedEventCost =
    work
      ? calculateDisposableCost(
          projectedEventItems,
        ).total
      : 0;

  const currentEventQuantity =
    eventItems.reduce(
      (sum, item) =>
        sum +
        Math.max(
          0,
          Number(
            item.quantity,
          ) || 0,
        ),
      0,
    );

  const eventRateReadyCount =
    eventItems.filter(
      (item) => {
        if (
          Number(
            item.unitCost,
          ) > 0
        ) {
          return true;
        }

        const master =
          masterByName.get(
            normalizeName(
              item.name,
            ),
          );

        return (
          Number(
            master?.unitCost,
          ) > 0
        );
      },
    ).length;

  const eventMissingRateCount =
    Math.max(
      0,
      eventItems.length -
        eventRateReadyCount,
    );

  const eventRateCoveragePercent =
    eventItems.length > 0
      ? Math.round(
          (
            eventRateReadyCount /
            eventItems.length
          ) *
            100,
        )
      : 100;

  const eventUnmappedCount =
    eventItems.filter(
      (item) =>
        !masterByName.has(
          normalizeName(
            item.name,
          ),
        ),
    ).length;

  const filteredItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('en-IN');

    return items.filter(
      (item) => {
        const itemCategory =
          categoryFor(
            item.name,
          );

        const eventItem =
          eventItemByName.get(
            normalizeName(
              item.name,
            ),
          );

        const matchesSearch =
          !query ||
          item.name
            .toLocaleLowerCase(
              'en-IN',
            )
            .includes(
              query,
            ) ||
          itemCategory
            .toLocaleLowerCase(
              'en-IN',
            )
            .includes(
              query,
            );

        const matchesCategory =
          category ===
            'ALL' ||
          itemCategory ===
            category;

        const matchesUsage =
          usageFilter ===
            'ALL' ||
          (
            usageFilter ===
              'EVENT' &&
            Boolean(
              eventItem,
            )
          ) ||
          (
            usageFilter ===
              'MISSING' &&
            Boolean(
              eventItem,
            ) &&
            !(item.unitCost > 0) &&
            !(
              Number(
                eventItem
                  ?.unitCost,
              ) > 0
            )
          );

        return (
          matchesSearch &&
          matchesCategory &&
          matchesUsage
        );
      },
    );
  }, [
    category,
    eventItemByName,
    items,
    search,
    usageFilter,
  ]);

  const pricedCount = items.filter((item) => item.unitCost > 0).length;
  const missingCount = items.length - pricedCount;

  const currentEventName =
    work?.event.eventName ||
    work?.event.clientName ||
    'Current event';

  function updateItem(
    id: string,
    patch: Partial<DisposableRateMasterItem>,
  ) {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    );
    setMessage('');
  }

  function saveRates() {
    if (!session) return;
    const saved = saveDisposableRateMaster(session.tenantId, items);
    setItems(saved);
    setMessage('Plastic rates saved. New event costings can reuse these rates.');
  }

  function applyMissingRatesToEvent() {
    if (!session || !work) return;

    const saved =
      saveDisposableRateMaster(
        session.tenantId,
        items,
      );

    const savedByName =
      new Map(
        saved.map(
          (item) => [
            normalizeName(
              item.name,
            ),
            item,
          ] as const,
        ),
      );

    const disposableItems =
      work.disposableItems.map(
        (item) => {
          if (
            Number(
              item.unitCost,
            ) > 0
          ) {
            return item;
          }

          const master =
            savedByName.get(
              normalizeName(
                item.name,
              ),
            );

          if (!master) {
            return item;
          }

          return {
            ...item,
            unit:
              item.unit ||
              master.unit ||
              'pcs',
            unitCost:
              Math.max(
                0,
                Number(
                  master.unitCost,
                ) || 0,
              ),
          };
        },
      );

    const disposable =
      calculateDisposableCost(
        disposableItems,
      );

    const nextWork: WorkState = {
      ...work,
      disposableItems,
      extras: {
        ...work.extras,
        disposable:
          disposable.total,
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
      'Missing plastic/disposable rates applied to the current event. Existing event rates were preserved.',
    );
  }

  if (!session) {
    return (
      <AppShell title="Plastic Rate Master">
        <div className="loader-card">Loading plastic rates…</div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Plastic Rate Master"
      subtitle="Maintain reusable purchase rates for plastic and disposable items"
      hidePageTitle
    >
      <section className="content-grid">
        <div className="plastic-rate-command">
          <div className="plastic-rate-command-copy">
            <span className="page-eyebrow">Cost Master · Plastic & Disposable</span>
            <h2>Price the disposable items that affect this event now</h2>
            <p>
              Maintain reusable purchase rates, see exactly which plastic/disposable items are active in {currentEventName}, and fill only missing event rates without overwriting positive event-specific pricing.
            </p>

            <div className="plastic-rate-command-kpis">
              <article>
                <span>Event items</span>
                <b>{eventItems.length}</b>
                <small>{currentEventQuantity.toLocaleString('en-IN')} total units</small>
              </article>
              <article className={eventMissingRateCount ? 'attention' : 'ready'}>
                <span>Missing event rates</span>
                <b>{eventMissingRateCount}</b>
                <small>{eventMissingRateCount ? 'Fix before Final Cost' : 'All active items priced'}</small>
              </article>
              <article>
                <span>Current event cost</span>
                <b>{money(currentEventCost)}</b>
                <small>Saved event rates</small>
              </article>
              <article>
                <span>After master fill</span>
                <b>{money(projectedEventCost)}</b>
                <small>{eventUnmappedCount} event item{eventUnmappedCount === 1 ? '' : 's'} outside master</small>
              </article>
            </div>
          </div>

          <aside className="plastic-rate-command-side">
            <div
              className="plastic-rate-readiness-ring"
              style={{
                background:
                  `conic-gradient(${eventRateCoveragePercent === 100 ? '#55d98f' : '#4a9cff'} ${eventRateCoveragePercent * 3.6}deg, #25303d 0deg)`,
              }}
              aria-label={`Current event plastic rate coverage ${eventRateCoveragePercent}%`}
            >
              <span>
                <b>{eventRateCoveragePercent}%</b>
                <small>Rate ready</small>
              </span>
            </div>

            <div className="plastic-rate-command-action">
              <span>Current event</span>
              <b>{currentEventName}</b>
              <small>{eventRateReadyCount}/{eventItems.length} used items have an event or master rate</small>

              <button
                className="primary-button"
                type="button"
                disabled={!work}
                onClick={applyMissingRatesToEvent}
              >
                Fill Missing Event Rates
              </button>
            </div>
          </aside>
        </div>

        <div className="glass-card">
          <div className="final-costing-section-heading">
            <div>
              <span className="section-kicker">Reusable master rates</span>
              <h2>Plastic purchase rates</h2>
              <p>
                Enter your real vendor purchase rate. Example: Cup ₹1.20 / pcs, Garbage Bag ₹8 / pcs, Packing Roll ₹95 / roll.
              </p>
            </div>
            <button
              className="secondary-button"
              type="button"
              onClick={() => router.push('/app/disposable')}
            >
              Back to Event Plastic Cost
            </button>
          </div>

          <div className="plastic-rate-toolbar no-print">
            <label className="field">
              <span>Find item</span>
              <input
                className="input"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search cup, box, tissue..."
              />
            </label>

            <label className="field">
              <span>Category</span>
              <select
                className="input"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="ALL">All categories</option>
                {categories.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Usage</span>
              <select
                className="input"
                value={usageFilter}
                onChange={(event) =>
                  setUsageFilter(
                    event.target.value as PlasticUsageFilter,
                  )
                }
              >
                <option value="ALL">All master items</option>
                <option value="EVENT">Current event items</option>
                <option value="MISSING">Missing event rates</option>
              </select>
            </label>
          </div>

          <datalist id="plastic-rate-unit-options">
            {UNITS.map((unit) => (
              <option key={unit} value={unit} />
            ))}
          </datalist>

          <div className="table-wrap">
            <table className="disposable-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th>Purchase unit</th>
                  <th>Rate / unit</th>
                  <th>Current Event</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const eventItem =
                    eventItemByName.get(
                      normalizeName(
                        item.name,
                      ),
                    );

                  return (
                  <tr
                    key={item.id}
                    className={
                      [
                        item.unitCost > 0 ? 'is-active' : '',
                        eventItem ? 'is-event-item' : '',
                        eventItem &&
                        !(item.unitCost > 0) &&
                        !(Number(eventItem.unitCost) > 0)
                          ? 'is-missing-rate'
                          : '',
                      ]
                        .filter(Boolean)
                        .join(' ')
                    }
                  >
                    <td>
                      <strong>{item.name}</strong>
                    </td>
                    <td>
                      <span className="muted">{categoryFor(item.name)}</span>
                    </td>
                    <td>
                      <input
                        className="input"
                        list="plastic-rate-unit-options"
                        value={item.unit}
                        onChange={(event) =>
                          updateItem(item.id, { unit: event.target.value })
                        }
                      />
                    </td>
                    <td>
                      <label className="manpower-rate-input">
                        <span aria-hidden="true">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          value={item.unitCost || ''}
                          placeholder="0"
                          onChange={(event) =>
                            updateItem(item.id, {
                              unitCost: safeNumber(event.target.value),
                            })
                          }
                          aria-label={`Rate for ${item.name}`}
                        />
                      </label>
                    </td>
                    <td>
                      {eventItem ? (
                        <div className="plastic-rate-event-cell">
                          <b>{eventItem.quantity.toLocaleString('en-IN')} {eventItem.unit || item.unit}</b>
                          <span>
                            Event rate {money(Number(eventItem.unitCost) || 0)}
                          </span>
                          <small>
                            {Number(eventItem.unitCost) > 0
                              ? 'Event rate preserved'
                              : item.unitCost > 0
                                ? 'Master rate ready'
                                : 'Missing event rate'}
                          </small>
                        </div>
                      ) : (
                        <span className="muted">Not used</span>
                      )}
                    </td>
                    <td>
                      <span className={item.unitCost > 0 ? 'account-status active' : 'needs-attention'}>
                        {item.unitCost > 0 ? `${money(item.unitCost)} / ${item.unit}` : 'Add rate'}
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
                <h3>No matching items</h3>
                <p>Clear the search to show all plastic rate master items.</p>
              </div>
              <button
                className="ghost-button"
                type="button"
                onClick={() => {
                  setSearch('');
                  setCategory('ALL');
                  setUsageFilter('ALL');
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
            Save Plastic Rates
          </button>
          <button
            className="secondary-button"
            type="button"
            disabled={!work}
            onClick={applyMissingRatesToEvent}
          >
            Fill Missing Event Rates
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={() => router.push('/app/disposable')}
          >
            Back to Plastic Costing
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={() => router.push('/app/final-costing')}
          >
            Final Cost
          </button>
        </div>
        <style>{`
          .plastic-rate-command {
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

          .plastic-rate-command-copy h2 {
            margin:7px 0 6px;
            max-width:820px;
            font-size:clamp(28px,3.4vw,40px);
            line-height:1.04;
            letter-spacing:-.045em;
          }

          .plastic-rate-command-copy > p {
            max-width:800px;
            margin:0;
            color:#8b98a9;
            font-size:10px;
            line-height:1.55;
          }

          .plastic-rate-command-kpis {
            display:grid;
            grid-template-columns:repeat(4,minmax(0,1fr));
            gap:7px;
            margin-top:14px;
          }

          .plastic-rate-command-kpis article {
            min-width:0;
            padding:10px;
            border:1px solid rgba(148,163,184,.10);
            border-radius:11px;
            background:rgba(255,255,255,.022);
          }

          .plastic-rate-command-kpis article.ready {
            border-color:rgba(85,217,143,.15);
            background:rgba(85,217,143,.035);
          }

          .plastic-rate-command-kpis article.attention {
            border-color:rgba(244,173,84,.18);
            background:rgba(244,173,84,.045);
          }

          .plastic-rate-command-kpis span,
          .plastic-rate-command-kpis b,
          .plastic-rate-command-kpis small {
            display:block;
          }

          .plastic-rate-command-kpis span {
            color:#718094;
            font-size:7px;
            font-weight:900;
            text-transform:uppercase;
          }

          .plastic-rate-command-kpis b {
            margin-top:5px;
            color:#e7eef6;
            font-size:14px;
          }

          .plastic-rate-command-kpis small {
            margin-top:3px;
            color:#68778a;
            font-size:7px;
          }

          .plastic-rate-command-side {
            display:grid;
            grid-template-columns:80px minmax(0,1fr);
            gap:13px;
            align-items:center;
            padding:13px;
            border:1px solid rgba(74,156,255,.15);
            border-radius:15px;
            background:rgba(74,156,255,.04);
          }

          .plastic-rate-readiness-ring {
            display:grid;
            width:76px;
            height:76px;
            padding:6px;
            place-items:center;
            border-radius:50%;
          }

          .plastic-rate-readiness-ring > span {
            display:grid;
            width:100%;
            height:100%;
            place-items:center;
            border:1px solid rgba(255,255,255,.05);
            border-radius:50%;
            background:#0f161e;
          }

          .plastic-rate-readiness-ring b,
          .plastic-rate-readiness-ring small {
            display:block;
            line-height:1;
          }

          .plastic-rate-readiness-ring b {
            color:#eef5fc;
            font-size:17px;
          }

          .plastic-rate-readiness-ring small {
            margin-top:-10px;
            color:#748397;
            font-size:6px;
            font-weight:900;
            text-transform:uppercase;
          }

          .plastic-rate-command-action > span,
          .plastic-rate-command-action > b,
          .plastic-rate-command-action > small {
            display:block;
          }

          .plastic-rate-command-action > span {
            color:#8190a2;
            font-size:7px;
            font-weight:900;
            text-transform:uppercase;
          }

          .plastic-rate-command-action > b {
            margin:4px 0;
            color:#f4f8fc;
            font-size:13px;
          }

          .plastic-rate-command-action > small {
            color:#7d8b9d;
            font-size:8px;
          }

          .plastic-rate-command-action .primary-button {
            width:100%;
            margin-top:9px;
          }

          .plastic-rate-toolbar {
            display:grid;
            grid-template-columns:minmax(220px,1fr) 180px 190px;
            gap:10px;
            align-items:end;
            margin-bottom:14px;
          }

          .disposable-table tbody tr.is-event-item {
            box-shadow:inset 3px 0 0 rgba(74,156,255,.55);
          }

          .disposable-table tbody tr.is-missing-rate {
            box-shadow:inset 3px 0 0 rgba(255,126,118,.7);
          }

          .plastic-rate-event-cell {
            display:grid;
            gap:2px;
            min-width:120px;
          }

          .plastic-rate-event-cell b {
            color:#cfe2f7;
            font-size:10px;
          }

          .plastic-rate-event-cell span {
            color:#8190a2;
            font-size:8px;
          }

          .plastic-rate-event-cell small {
            color:#64758a;
            font-size:7px;
          }

          @media(max-width:1100px) {
            .plastic-rate-command {
              grid-template-columns:1fr;
            }

            .plastic-rate-command-side {
              max-width:440px;
            }

            .plastic-rate-command-kpis {
              grid-template-columns:1fr 1fr;
            }
          }

          @media(max-width:760px) {
            .plastic-rate-command {
              padding:16px;
            }

            .plastic-rate-command-side {
              grid-template-columns:62px minmax(0,1fr);
            }

            .plastic-rate-readiness-ring {
              width:58px;
              height:58px;
            }

            .plastic-rate-command-kpis {
              grid-template-columns:1fr 1fr;
            }

            .plastic-rate-toolbar {
              grid-template-columns:1fr;
            }
          }
        `}</style>
      </section>
    </AppShell>
  );
}
