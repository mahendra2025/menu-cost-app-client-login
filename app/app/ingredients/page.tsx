'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import AppShell from '../../components/AppShell';

import {
  getSession,
  loadWork,
  saveWork,
} from '../../../lib/store';

import type {
  IngredientRate,
} from '../../../lib/ingredientCatalog';

type ClientIngredientRate =
  IngredientRate & {
    globalRate?: number;
    cityRate?: number | null;
    city?: string;
    rateSource?:
      | 'TENANT'
      | 'CITY'
      | 'GLOBAL';
    isCustomRate?: boolean;
    customUpdatedAt?: string | null;
    myCityRate: number | null;
  };

type RecipeUsage = {
  id: string;
  name: string;
};

type UsageMap =
  Record<
    string,
    RecipeUsage[]
  >;

type UsageFilter =
  | 'ALL'
  | 'EVENT'
  | 'MISSING';

function normalize(
  value: unknown,
) {
  return String(value || '')
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase(
      'en-IN',
    )
    .replace(/\s+/g, ' ');
}

function money(
  value:
    | number
    | null
    | undefined,
) {
  const rate =
    Number(value) || 0;

  if (!(rate > 0)) {
    return '—';
  }

  return `₹${rate.toLocaleString(
    'en-IN',
    {
      maximumFractionDigits: 2,
    },
  )}`;
}

export default function IngredientRatesPage() {
  const [rows, setRows] =
    useState<
      ClientIngredientRate[]
    >([]);

  const [usage, setUsage] =
    useState<UsageMap>({});

  const [city, setCity] =
    useState('');

  const [query, setQuery] =
    useState('');

  const [category, setCategory] =
    useState('ALL');

  const [
    usageFilter,
    setUsageFilter,
  ] = useState<UsageFilter>(
    'ALL',
  );

  const [
    currentEventDishNames,
    setCurrentEventDishNames,
  ] = useState<string[]>([]);

  const [
    currentEventName,
    setCurrentEventName,
  ] = useState('');

  const [
    initialRates,
    setInitialRates,
  ] = useState<
    Map<string, number>
  >(() => new Map());

  const [ready, setReady] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState('');

  const [error, setError] =
    useState('');

  const [bulkText, setBulkText] =
    useState('');

  async function loadIngredients() {
    setReady(false);
    setMessage('');
    setError('');

    try {
      const response =
        await fetch(
          '/api/client/ingredients',
          {
            cache: 'no-store',
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Could not load ingredient rates.',
        );
      }

      const loadedRows:
        ClientIngredientRate[] =
        Array.isArray(
          data.rates,
        )
          ? data.rates.map(
              (
                value: IngredientRate &
                  Record<
                    string,
                    unknown
                  >,
              ) => {
                const rate =
                  Math.max(
                    0,
                    Number(
                      value.rate,
                    ) || 0,
                  );

                return {
                  ...value,
                  myCityRate:
                    rate > 0
                      ? rate
                      : null,
                } as
                  ClientIngredientRate;
              },
            )
          : [];

      setRows(
        loadedRows,
      );

      setInitialRates(
        new Map(
          loadedRows.map(
            (row) => [
              row.id,
              Math.max(
                0,
                Number(
                  row.myCityRate,
                ) || 0,
              ),
            ],
          ),
        ),
      );

      setUsage(
        data.usage &&
        typeof data.usage ===
          'object'
          ? data.usage
          : {},
      );

      setCity(
        String(
          data.city ||
            '',
        ).trim(),
      );
    } catch (
      loadError
    ) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not load ingredient rates.',
      );
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    const session =
      getSession();

    if (session) {
      const work =
        loadWork(
          session.tenantId,
        );

      setCurrentEventName(
        work.event.eventName ||
          work.event.clientName ||
          'Current event',
      );

      setCurrentEventDishNames(
        Array.from(
          new Set(
            work.menu
              .filter(
                (item) =>
                  item.coverageStatus !==
                  'REJECTED',
              )
              .map(
                (item) =>
                  normalize(
                    item.name,
                  ),
              )
              .filter(Boolean),
          ),
        ),
      );
    }

    void loadIngredients();
  }, []);

  const categories =
    useMemo(
      () =>
        Array.from(
          new Set(
            rows
              .map(
                (row) =>
                  row.category,
              )
              .filter(Boolean),
          ),
        ).sort(
          (
            left,
            right,
          ) =>
            left.localeCompare(
              right,
            ),
        ),
      [rows],
    );

  const currentEventDishSet =
    useMemo(
      () =>
        new Set(
          currentEventDishNames,
        ),
      [
        currentEventDishNames,
      ],
    );

  function currentEventRecipes(
    row: ClientIngredientRate,
  ) {
    return (
      usage[row.id] || []
    ).filter(
      (recipe) =>
        currentEventDishSet.has(
          normalize(
            recipe.name,
          ),
        ),
    );
  }

  function isCurrentEventIngredient(
    row: ClientIngredientRate,
  ) {
    return (
      currentEventRecipes(
        row,
      ).length > 0
    );
  }

  function rowHasChanges(
    row: ClientIngredientRate,
  ) {
    const before =
      initialRates.get(
        row.id,
      ) || 0;

    const after =
      Math.max(
        0,
        Number(
          row.myCityRate,
        ) || 0,
      );

    return (
      Math.abs(
        before -
          after,
      ) >
      0.000001
    );
  }

  const changedRows =
    rows.filter(
      rowHasChanges,
    );

  const changedCount =
    changedRows.length;

  useEffect(() => {
    if (!changedCount) {
      return;
    }

    const warnBeforeLeave = (
      event: BeforeUnloadEvent,
    ) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener(
      'beforeunload',
      warnBeforeLeave,
    );

    return () => {
      window.removeEventListener(
        'beforeunload',
        warnBeforeLeave,
      );
    };
  }, [changedCount]);

  function updateRate(
    id: string,
    value: string,
  ) {
    setRows(
      (current) =>
        current.map(
          (row) =>
            row.id === id
              ? {
                  ...row,
                  myCityRate:
                    value === ''
                      ? null
                      : Math.max(
                          0,
                          Number(
                            value,
                          ) || 0,
                        ),
                }
              : row,
        ),
    );

    setMessage('');
    setError('');
  }

  const filteredRows =
    useMemo(() => {
      const search =
        normalize(query);

      return rows
        .filter(
          (row) => {
            const matchesSearch =
              !search ||
              normalize(
                row.name,
              ).includes(
                search,
              ) ||
              normalize(
                row.category,
              ).includes(
                search,
              ) ||
              normalize(
                row.unit,
              ).includes(
                search,
              );

            const matchesCategory =
              category ===
                'ALL' ||
              row.category ===
                category;

            const rate =
              Math.max(
                0,
                Number(
                  row.myCityRate,
                ) || 0,
              );

            const matchesUsage =
              usageFilter ===
                'ALL' ||
              (
                usageFilter ===
                  'EVENT' &&
                isCurrentEventIngredient(
                  row,
                )
              ) ||
              (
                usageFilter ===
                  'MISSING' &&
                !(rate > 0)
              );

            return (
              matchesSearch &&
              matchesCategory &&
              matchesUsage
            );
          },
        )
        .sort(
          (
            left,
            right,
          ) =>
            left.name.localeCompare(
              right.name,
              undefined,
              {
                sensitivity:
                  'base',
              },
            ),
        );
    }, [
      rows,
      query,
      category,
      usageFilter,
      currentEventDishSet,
      usage,
    ]);

  const currentEventRows =
    rows.filter(
      isCurrentEventIngredient,
    );

  const currentEventReady =
    currentEventRows.filter(
      (row) =>
        Number(
          row.myCityRate,
        ) > 0,
    ).length;

  const rateReadyCount =
    rows.filter(
      (row) =>
        Number(
          row.myCityRate,
        ) > 0,
    ).length;

  const missingRateCount =
    Math.max(
      0,
      rows.length -
        rateReadyCount,
    );

  async function refreshCurrentMenuCosts() {
    const response =
      await fetch(
        '/api/dishes',
        {
          cache: 'no-store',
        },
      );

    if (!response.ok) {
      return;
    }

    const data =
      await response.json();

    const items =
      Array.isArray(
        data.items,
      )
        ? data.items
        : [];

    const costByName =
      new Map<
        string,
        number
      >(
        items.map(
          (
            item: {
              name?: string;
              rate?: number;
            },
          ) => [
            normalize(
              item.name,
            ),
            Math.max(
              0,
              Number(
                item.rate,
              ) || 0,
            ),
          ],
        ),
      );

    const session =
      getSession();

    if (!session) {
      return;
    }

    const work =
      loadWork(
        session.tenantId,
      );

    const menu =
      work.menu.map(
        (item) => {
          const newRate =
            costByName.get(
              normalize(
                item.name,
              ),
            );

          return (
            newRate &&
            newRate > 0
          )
            ? {
                ...item,
                costPerPlate:
                  newRate,
              }
            : item;
        },
      );

    saveWork(
      session.tenantId,
      {
        ...work,
        menu,
        updatedAt:
          new Date()
            .toISOString(),
      },
    );
  }

  async function saveAllRates() {
    if (
      !changedRows.length
    ) {
      return;
    }

    const invalid =
      changedRows.find(
        (row) =>
          !(
            Number(
              row.myCityRate,
            ) > 0
          ),
      );

    if (invalid) {
      setError(
        `Enter a valid ${city || 'city'} rate for ${invalid.name}.`,
      );
      return;
    }

    setSaving(true);
    setMessage('');
    setError('');

    try {
      const response =
        await fetch(
          '/api/client/ingredients',
          {
            method: 'PUT',
            headers: {
              'Content-Type':
                'application/json',
            },
            body:
              JSON.stringify({
                rates:
                  changedRows.map(
                    (row) => ({
                      ingredientId:
                        row.id,
                      rate:
                        Number(
                          row.myCityRate,
                        ),
                    }),
                  ),
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Could not save your city rates.',
        );
      }

      await refreshCurrentMenuCosts();
      await loadIngredients();

      setMessage(
        `Saved ${changedRows.length} ${city || 'city'} rate${changedRows.length === 1 ? '' : 's'}. Only your caterer account was updated.`,
      );
    } catch (
      saveError
    ) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Could not save your city rates.',
      );
    } finally {
      setSaving(false);
    }
  }

  function applyBulkRates() {
    if (!bulkText.trim()) {
      return;
    }

    const rateByName =
      new Map<
        string,
        number
      >();

    bulkText
      .split(/\r?\n/)
      .map(
        (line) =>
          line.trim(),
      )
      .filter(Boolean)
      .forEach(
        (line) => {
          const parts =
            line
              .split(
                /\t|\||,/,
              )
              .map(
                (part) =>
                  part.trim(),
              );

          const name =
            normalize(
              parts[0],
            );

          const rate =
            Number(
              String(
                parts[1] ||
                  '',
              ).replace(
                /[^0-9.]/g,
                '',
              ),
            );

          if (
            name &&
            Number.isFinite(
              rate,
            ) &&
            rate > 0
          ) {
            rateByName.set(
              name,
              rate,
            );
          }
        },
      );

    let updated = 0;

    setRows(
      (current) =>
        current.map(
          (row) => {
            const nextRate =
              rateByName.get(
                normalize(
                  row.name,
                ),
              );

            if (
              !nextRate
            ) {
              return row;
            }

            updated += 1;

            return {
              ...row,
              myCityRate:
                nextRate,
            };
          },
        ),
    );

    if (!updated) {
      setError(
        'No ingredient names matched. Use: Ingredient | Rate',
      );
      return;
    }

    setError('');
    setMessage(
      `Applied ${updated} ${city || 'city'} rate${updated === 1 ? '' : 's'}. Review and save.`,
    );
  }

  const hasFilters =
    Boolean(query) ||
    category !== 'ALL' ||
    usageFilter !== 'ALL';

  return (
    <AppShell
      title="Ingredient Rates"
      subtitle="Your city ingredient prices for accurate event costing"
      hidePageTitle
    >
      <section className="content-grid ingredient-city-page">
        <section className="ingredient-city-hero">
          <div>
            <span className="ingredient-city-eyebrow">
              My city ingredient rates
            </span>
            <h1>
              {city || 'Business city'} Rate Master
            </h1>
            <p>
              You can view and update rates only for your own caterer account. Other cities, other caterers and Super Admin master rates are not editable here.
            </p>
          </div>

          <div className="ingredient-city-lock">
            <span>City locked</span>
            <b>{city || 'Not set'}</b>
            <small>
              Managed from your caterer account
            </small>
          </div>
        </section>

        <section className="ingredient-city-stats">
          <article>
            <span>City</span>
            <b>{city || '—'}</b>
            <small>Only this market is visible</small>
          </article>

          <article>
            <span>Rates ready</span>
            <b>
              {rateReadyCount}/{rows.length}
            </b>
            <small>
              {missingRateCount} missing
            </small>
          </article>

          <article>
            <span>Current event</span>
            <b>
              {currentEventReady}/{currentEventRows.length}
            </b>
            <small>
              {currentEventName || 'No active event'}
            </small>
          </article>

          <article
            className={
              changedCount
                ? 'attention'
                : 'ready'
            }
          >
            <span>Unsaved</span>
            <b>{changedCount}</b>
            <small>
              {changedCount
                ? 'Save your changes'
                : 'Everything saved'}
            </small>
          </article>
        </section>

        <section className="glass-card ingredient-city-toolbar">
          <div className="ingredient-city-search-row">
            <label className="ingredient-city-search">
              <span aria-hidden="true">
                ⌕
              </span>
              <input
                value={query}
                placeholder="Search ingredient, category or unit…"
                onChange={(
                  event,
                ) =>
                  setQuery(
                    event.target.value,
                  )
                }
              />
            </label>

            <select
              className="select"
              value={category}
              aria-label="Ingredient category"
              onChange={(
                event,
              ) =>
                setCategory(
                  event.target.value,
                )
              }
            >
              <option value="ALL">
                All categories
              </option>

              {categories.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ),
              )}
            </select>

            <div className="ingredient-city-filter-chips">
              {(
                [
                  [
                    'ALL',
                    'All',
                  ],
                  [
                    'EVENT',
                    'Current Event',
                  ],
                  [
                    'MISSING',
                    'Missing Rate',
                  ],
                ] as
                  Array<
                    [
                      UsageFilter,
                      string,
                    ]
                  >
              ).map(
                ([
                  value,
                  label,
                ]) => (
                  <button
                    key={value}
                    type="button"
                    className={
                      usageFilter ===
                      value
                        ? 'active'
                        : ''
                    }
                    onClick={() =>
                      setUsageFilter(
                        value,
                      )
                    }
                  >
                    {label}
                  </button>
                ),
              )}
            </div>

            {hasFilters ? (
              <button
                className="ingredient-city-clear"
                type="button"
                onClick={() => {
                  setQuery('');
                  setCategory(
                    'ALL',
                  );
                  setUsageFilter(
                    'ALL',
                  );
                }}
              >
                Clear
              </button>
            ) : null}
          </div>

          <div className="ingredient-city-result-line">
            <span>
              Showing <b>{filteredRows.length}</b> of <b>{rows.length}</b> ingredients
            </span>

            <span>
              Editing: <b>{city || 'your city'}</b>
            </span>
          </div>

          {message ? (
            <div className="ingredient-city-message">
              {message}
            </div>
          ) : null}

          {error ? (
            <div className="ingredient-city-message error">
              {error}
            </div>
          ) : null}
        </section>

        <details className="glass-card ingredient-city-bulk">
          <summary>
            <div>
              <span>
                Fast update
              </span>
              <b>
                Paste {city || 'city'} rates
              </b>
              <small>
                Format: Ingredient | Rate
              </small>
            </div>
            <strong>＋</strong>
          </summary>

          <div className="ingredient-city-bulk-body">
            <textarea
              className="input"
              value={bulkText}
              onChange={(
                event,
              ) =>
                setBulkText(
                  event.target.value,
                )
              }
              placeholder={
                'Tomato | 38\nPaneer | 330\nSugar | 46'
              }
            />

            <button
              className="secondary-button"
              type="button"
              onClick={
                applyBulkRates
              }
            >
              Apply to {city || 'My City'}
            </button>
          </div>
        </details>

        <section className="glass-card ingredient-city-table-card">
          <div className="ingredient-city-table-head">
            <div>
              <span>
                My rate master
              </span>
              <h2>
                {city || 'City'} ingredient prices
              </h2>
              <p>
                Edit only the rate you actually pay in your market. Saved changes affect only your caterer account.
              </p>
            </div>

            <button
              className="primary-button"
              type="button"
              disabled={
                saving ||
                !ready ||
                changedCount === 0
              }
              onClick={() =>
                void saveAllRates()
              }
            >
              {saving
                ? 'Saving…'
                : 'Save Rates'}
            </button>
          </div>

          {!ready ? (
            <div className="ingredient-city-loading">
              Loading your city rates…
            </div>
          ) : (
            <div className="table-wrap ingredient-city-table-wrap">
              <table className="ingredient-city-table">
                <thead>
                  <tr>
                    <th>
                      Ingredient
                    </th>
                    <th>
                      My {city || 'City'} Rate
                    </th>
                    <th>
                      Current Event
                    </th>
                    <th>
                      Recipes
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRows.map(
                    (row) => {
                      const eventRecipes =
                        currentEventRecipes(
                          row,
                        );

                      const recipes =
                        usage[
                          row.id
                        ] || [];

                      const changed =
                        rowHasChanges(
                          row,
                        );

                      return (
                        <tr
                          key={row.id}
                          className={
                            [
                              changed
                                ? 'is-edited'
                                : '',
                              eventRecipes.length
                                ? 'is-event'
                                : '',
                              !(
                                Number(
                                  row.myCityRate,
                                ) > 0
                              )
                                ? 'is-missing'
                                : '',
                            ]
                              .filter(Boolean)
                              .join(' ')
                          }
                        >
                          <td>
                            <div className="ingredient-city-name">
                              <strong>
                                {row.name}
                              </strong>

                              {changed ? (
                                <span>
                                  Edited
                                </span>
                              ) : null}
                            </div>

                            <small>
                              {row.category} · {row.unit}
                            </small>
                          </td>

                          <td>
                            <label className="ingredient-city-rate-input">
                              <span>
                                ₹
                              </span>

                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={
                                  row.myCityRate ??
                                  ''
                                }
                                placeholder="Enter rate"
                                onChange={(
                                  event,
                                ) =>
                                  updateRate(
                                    row.id,
                                    event.target.value,
                                  )
                                }
                              />

                              <small>
                                / {row.unit}
                              </small>
                            </label>

                            <div className="ingredient-city-rate-preview">
                              {money(
                                row.myCityRate,
                              )}{' '}
                              per {row.unit}
                            </div>
                          </td>

                          <td>
                            <div
                              className={
                                eventRecipes.length
                                  ? 'ingredient-city-event active'
                                  : 'ingredient-city-event'
                              }
                            >
                              <b>
                                {eventRecipes.length}
                              </b>
                              <span>
                                {eventRecipes.length
                                  ? `${eventRecipes.length} event dish${eventRecipes.length === 1 ? '' : 'es'}`
                                  : 'Not used now'}
                              </span>
                            </div>
                          </td>

                          <td>
                            <div className="ingredient-city-recipes">
                              <b>
                                {recipes.length}
                              </b>
                              <span>
                                recipe{recipes.length === 1 ? '' : 's'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    },
                  )}

                  {!filteredRows.length ? (
                    <tr>
                      <td
                        colSpan={4}
                      >
                        <div className="ingredient-city-empty">
                          <b>
                            No ingredients found
                          </b>
                          <span>
                            Try another search or filter.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div
          className={
            `ingredient-city-save-dock ${changedCount ? 'is-visible' : ''}`
          }
        >
          <div>
            <strong>
              {changedCount} unsaved rate{changedCount === 1 ? '' : 's'}
            </strong>
            <span>
              Saving updates only your {city || 'city'} rates.
            </span>
          </div>

          <button
            className="primary-button"
            type="button"
            disabled={
              saving ||
              changedCount === 0
            }
            onClick={() =>
              void saveAllRates()
            }
          >
            {saving
              ? 'Saving…'
              : 'Save My Rates'}
          </button>
        </div>

        <style>{`
          .ingredient-city-page{gap:12px}
          .ingredient-city-hero{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:22px;border:1px solid rgba(74,156,255,.15);border-radius:18px;background:linear-gradient(135deg,rgba(18,28,42,.98),rgba(10,14,20,.98));box-shadow:0 16px 38px rgba(0,0,0,.2)}
          .ingredient-city-eyebrow,.ingredient-city-table-head>div>span,.ingredient-city-bulk summary span{display:block;color:#74adf2;font-size:9px;font-weight:900;letter-spacing:.09em;text-transform:uppercase}
          .ingredient-city-hero h1{margin:5px 0 7px;color:#f4f8fc;font-size:26px;letter-spacing:-.03em}
          .ingredient-city-hero p{max-width:760px;margin:0;color:#8392a6;font-size:11px;line-height:1.6}
          .ingredient-city-lock{min-width:190px;padding:14px;border:1px solid rgba(85,217,143,.18);border-radius:14px;background:rgba(85,217,143,.04)}
          .ingredient-city-lock span,.ingredient-city-lock b,.ingredient-city-lock small{display:block}
          .ingredient-city-lock span{color:#70c997;font-size:8px;font-weight:900;text-transform:uppercase}
          .ingredient-city-lock b{margin:4px 0;color:#eef7f2;font-size:19px}
          .ingredient-city-lock small{color:#6f8176;font-size:8px}
          .ingredient-city-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
          .ingredient-city-stats article{padding:13px 14px;border:1px solid rgba(148,163,184,.12);border-radius:13px;background:rgba(255,255,255,.02)}
          .ingredient-city-stats span,.ingredient-city-stats b,.ingredient-city-stats small{display:block}
          .ingredient-city-stats span{color:#7d8ca0;font-size:8px;font-weight:900;text-transform:uppercase}
          .ingredient-city-stats b{margin:4px 0;color:#eef4fb;font-size:20px}
          .ingredient-city-stats small{color:#66768a;font-size:8px}
          .ingredient-city-stats article.attention{border-color:rgba(244,182,74,.22);background:rgba(244,182,74,.04)}
          .ingredient-city-stats article.ready{border-color:rgba(85,217,143,.16)}
          .ingredient-city-toolbar{position:sticky;top:64px;z-index:10;padding:13px 15px;background:rgba(10,14,20,.95);backdrop-filter:blur(16px)}
          .ingredient-city-search-row{display:grid;grid-template-columns:minmax(220px,1fr) 190px auto auto;gap:8px;align-items:center}
          .ingredient-city-search{display:flex;align-items:center;gap:8px;min-height:40px;padding:0 11px;border:1px solid #303b47;border-radius:10px;background:#111820}
          .ingredient-city-search span{color:#718196}
          .ingredient-city-search input{width:100%;border:0;outline:0;color:#e9f0f7;background:transparent;font:inherit}
          .ingredient-city-filter-chips{display:flex;gap:5px;flex-wrap:wrap}
          .ingredient-city-filter-chips button,.ingredient-city-clear{min-height:34px;padding:0 9px;border:1px solid #303b47;border-radius:9px;color:#8292a5;background:#121a23;font:inherit;font-size:8px;font-weight:850;cursor:pointer}
          .ingredient-city-filter-chips button.active{border-color:rgba(74,156,255,.32);color:#a9d0ff;background:rgba(74,156,255,.08)}
          .ingredient-city-result-line{display:flex;justify-content:space-between;gap:12px;margin-top:9px;color:#697a8e;font-size:8px}
          .ingredient-city-result-line b{color:#cfd9e4}
          .ingredient-city-message{margin-top:10px;padding:9px 10px;border:1px solid rgba(85,217,143,.18);border-radius:9px;color:#8bdbad;background:rgba(85,217,143,.05);font-size:9px}
          .ingredient-city-message.error{border-color:rgba(255,98,89,.2);color:#ef9a95;background:rgba(255,98,89,.05)}
          .ingredient-city-bulk{padding:0;overflow:hidden}
          .ingredient-city-bulk summary{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;cursor:pointer}
          .ingredient-city-bulk summary b,.ingredient-city-bulk summary small{display:block}
          .ingredient-city-bulk summary b{margin-top:2px;color:#dce6f0;font-size:11px}
          .ingredient-city-bulk summary small{margin-top:2px;color:#6d7d90;font-size:8px}
          .ingredient-city-bulk-body{display:grid;grid-template-columns:1fr auto;gap:10px;padding:0 16px 16px}
          .ingredient-city-bulk textarea{min-height:110px;resize:vertical}
          .ingredient-city-table-card{padding:0;overflow:hidden}
          .ingredient-city-table-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px;border-bottom:1px solid rgba(148,163,184,.1)}
          .ingredient-city-table-head h2{margin:3px 0;color:#eef4fa;font-size:18px}
          .ingredient-city-table-head p{margin:0;color:#728296;font-size:9px}
          .ingredient-city-loading,.ingredient-city-empty{padding:36px;color:#748498;text-align:center}
          .ingredient-city-table{width:100%;border-collapse:collapse}
          .ingredient-city-table th{padding:10px 12px;border-bottom:1px solid rgba(148,163,184,.1);color:#718196;font-size:7px;font-weight:900;text-align:left;text-transform:uppercase}
          .ingredient-city-table td{padding:11px 12px;border-bottom:1px solid rgba(148,163,184,.07);vertical-align:middle}
          .ingredient-city-table tr.is-edited{background:rgba(74,156,255,.035)}
          .ingredient-city-table tr.is-event{box-shadow:inset 2px 0 0 rgba(85,217,143,.5)}
          .ingredient-city-table tr.is-missing{background:rgba(244,182,74,.025)}
          .ingredient-city-name{display:flex;align-items:center;gap:7px}
          .ingredient-city-name strong{color:#e7eef6;font-size:10px}
          .ingredient-city-name span{padding:2px 5px;border-radius:999px;color:#91c5ff;background:rgba(74,156,255,.08);font-size:6px;font-weight:900;text-transform:uppercase}
          .ingredient-city-table td>small{display:block;margin-top:3px;color:#68798c;font-size:7px}
          .ingredient-city-rate-input{display:grid;grid-template-columns:22px minmax(90px,140px) auto;align-items:center;gap:4px}
          .ingredient-city-rate-input>span{color:#7f8fa3;font-weight:900}
          .ingredient-city-rate-input input{height:38px;padding:0 9px;border:1px solid #33404d;border-radius:9px;outline:0;color:#edf3f9;background:#121a23;font:inherit;font-size:11px;font-weight:900}
          .ingredient-city-rate-input input:focus{border-color:rgba(74,156,255,.6);box-shadow:0 0 0 3px rgba(74,156,255,.07)}
          .ingredient-city-rate-input small,.ingredient-city-rate-preview{color:#68798d;font-size:7px}
          .ingredient-city-rate-preview{margin-top:3px}
          .ingredient-city-event,.ingredient-city-recipes{display:flex;align-items:center;gap:7px}
          .ingredient-city-event b,.ingredient-city-recipes b{display:grid;place-items:center;min-width:27px;height:27px;border:1px solid rgba(148,163,184,.12);border-radius:8px;color:#cbd6e2;background:rgba(255,255,255,.025);font-size:9px}
          .ingredient-city-event span,.ingredient-city-recipes span{color:#718195;font-size:7px}
          .ingredient-city-event.active b{border-color:rgba(85,217,143,.2);color:#89dfad;background:rgba(85,217,143,.05)}
          .ingredient-city-save-dock{position:fixed;right:22px;bottom:20px;z-index:30;display:flex;align-items:center;gap:18px;padding:12px 13px 12px 15px;border:1px solid rgba(74,156,255,.24);border-radius:14px;background:rgba(11,16,23,.96);box-shadow:0 18px 45px rgba(0,0,0,.35);transform:translateY(130%);opacity:0;pointer-events:none;transition:.2s ease}
          .ingredient-city-save-dock.is-visible{transform:translateY(0);opacity:1;pointer-events:auto}
          .ingredient-city-save-dock strong,.ingredient-city-save-dock span{display:block}
          .ingredient-city-save-dock strong{color:#e8f0f8;font-size:9px}
          .ingredient-city-save-dock span{margin-top:2px;color:#718196;font-size:7px}
          @media(max-width:900px){.ingredient-city-stats{grid-template-columns:1fr 1fr}.ingredient-city-search-row{grid-template-columns:1fr 1fr}.ingredient-city-filter-chips{grid-column:1/-1}.ingredient-city-hero{align-items:stretch;flex-direction:column}.ingredient-city-lock{min-width:0}.ingredient-city-table{min-width:720px}}
          @media(max-width:600px){.ingredient-city-stats{grid-template-columns:1fr 1fr}.ingredient-city-search-row{grid-template-columns:1fr}.ingredient-city-filter-chips{grid-column:auto}.ingredient-city-result-line{align-items:flex-start;flex-direction:column}.ingredient-city-bulk-body{grid-template-columns:1fr}.ingredient-city-table-head{align-items:stretch;flex-direction:column}.ingredient-city-table-head .primary-button{width:100%}.ingredient-city-save-dock{left:10px;right:10px;bottom:10px;justify-content:space-between}.ingredient-city-save-dock>div{min-width:0}}
        `}</style>
      </section>
    </AppShell>
  );
}
