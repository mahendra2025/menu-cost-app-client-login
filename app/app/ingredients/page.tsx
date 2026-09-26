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

import {
  type IngredientRate,
} from '../../../lib/ingredientCatalog';

type UnifiedIngredientRate =
  IngredientRate & {
    globalRate: number;
    cityRate: number | null;
    city: string;
    cityRateSource?: string;
    cityRateEffectiveDate?: string | null;
    rateSource?:
      | 'TENANT'
      | 'CITY'
      | 'GLOBAL';
    isCustomRate: boolean;
    isCityRate?: boolean;
    customUpdatedAt?: string | null;
    businessRate: number | null;
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

type KnownCity = {
  city: string;
  cityKey: string;
};

function money(
  value:
    | number
    | null
    | undefined,
) {
  if (!(Number(value) > 0)) {
    return '—';
  }

  return `₹${Number(
    value,
  ).toLocaleString(
    'en-IN',
    {
      maximumFractionDigits: 2,
    },
  )}`;
}

function dateValue(
  value:
    | string
    | null
    | undefined,
) {
  if (!value) return '';

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return '';
  }

  return parsed
    .toISOString()
    .slice(0, 10);
}

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

export default function IngredientRatesPage() {
  const [rows, setRows] =
    useState<
      UnifiedIngredientRate[]
    >([]);

  const [usage, setUsage] =
    useState<UsageMap>({});

  const [city, setCity] =
    useState('Silvassa');

  const [
    loadedCity,
    setLoadedCity,
  ] = useState('');

  const [
    knownCities,
    setKnownCities,
  ] = useState<KnownCity[]>(
    [],
  );

  const [query, setQuery] =
    useState('');

  const [category, setCategory] =
    useState('ALL');

  const [filter, setFilter] =
    useState<
      | 'ALL'
      | 'BUSINESS'
      | 'CITY'
      | 'GLOBAL'
    >('ALL');

  const [ready, setReady] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState('');

  const [error, setError] =
    useState('');

  const [
    initialCityRates,
    setInitialCityRates,
  ] = useState<
    Map<string, number>
  >(() => new Map());

  const [
    initialBusinessRates,
    setInitialBusinessRates,
  ] = useState<
    Map<string, number>
  >(() => new Map());

  const [bulkText, setBulkText] =
    useState('');

  async function loadIngredients(
    requestedCity = city,
  ) {
    const cleanCity =
      requestedCity
        .trim()
        .replace(/\s+/g, ' ') ||
      'Silvassa';

    setReady(false);
    setMessage('');
    setError('');

    try {
      const response =
        await fetch(
          `/api/client/ingredients?city=${encodeURIComponent(
            cleanCity,
          )}`,
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

      const loadedRows =
        Array.isArray(data.rates)
          ? data.rates.map(
              (
                rate: Omit<
                  UnifiedIngredientRate,
                  'businessRate'
                >,
              ) => ({
                ...rate,
                cityRate:
                  Number(
                    rate.cityRate,
                  ) > 0
                    ? Number(
                        rate.cityRate,
                      )
                    : null,
                cityRateEffectiveDate:
                  dateValue(
                    rate.cityRateEffectiveDate,
                  ),
                businessRate:
                  rate.isCustomRate
                    ? Number(
                        rate.rate,
                      )
                    : null,
              }),
            )
          : [];

      setRows(loadedRows);

      setUsage(
        data.usage &&
        typeof data.usage ===
          'object'
          ? data.usage
          : {},
      );

      setKnownCities(
        Array.isArray(
          data.cities,
        )
          ? data.cities
          : [],
      );

      const effectiveCity =
        String(
          data.city ||
            cleanCity,
        );

      setCity(effectiveCity);
      setLoadedCity(
        effectiveCity,
      );

      setInitialCityRates(
        new Map(
          loadedRows
            .filter(
              (
                row:
                  UnifiedIngredientRate,
              ) =>
                Number(
                  row.cityRate,
                ) > 0,
            )
            .map(
              (
                row:
                  UnifiedIngredientRate,
              ) => [
                row.id,
                Number(
                  row.cityRate,
                ),
              ],
            ),
        ),
      );

      setInitialBusinessRates(
        new Map(
          loadedRows
            .filter(
              (
                row:
                  UnifiedIngredientRate,
              ) =>
                Number(
                  row.businessRate,
                ) > 0,
            )
            .map(
              (
                row:
                  UnifiedIngredientRate,
              ) => [
                row.id,
                Number(
                  row.businessRate,
                ),
              ],
            ),
        ),
      );
    } catch (loadError) {
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
    void loadIngredients(
      'Silvassa',
    );
    // Initial business city.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories =
    useMemo(
      () =>
        Array.from(
          new Set(
            rows.map(
              (row) =>
                row.category,
            ),
          ),
        ).sort(),
      [rows],
    );

  const filteredRows =
    useMemo(() => {
      const search =
        normalize(query);

      return rows
        .filter((row) => {
          const activeSource =
            Number(
              row.businessRate,
            ) > 0
              ? 'BUSINESS'
              : Number(
                    row.cityRate,
                  ) > 0
                ? 'CITY'
                : 'GLOBAL';

          const matchesFilter =
            filter === 'ALL' ||
            filter ===
              activeSource;

          const matchesCategory =
            category === 'ALL' ||
            row.category ===
              category;

          const matchesSearch =
            !search ||
            normalize(
              row.name,
            ).includes(search) ||
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

          return (
            matchesFilter &&
            matchesCategory &&
            matchesSearch
          );
        })
        .sort((a, b) =>
          a.name.localeCompare(
            b.name,
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
      filter,
    ]);

  const businessRateCount =
    rows.filter(
      (row) =>
        Number(
          row.businessRate,
        ) > 0,
    ).length;

  const cityRateCount =
    rows.filter(
      (row) =>
        !(
          Number(
            row.businessRate,
          ) > 0
        ) &&
        Number(
          row.cityRate,
        ) > 0,
    ).length;

  const globalRateCount =
    rows.length -
    businessRateCount -
    cityRateCount;

  const changedCityCount =
    rows.filter((row) => {
      const before =
        initialCityRates.get(
          row.id,
        ) || 0;

      const after =
        Number(
          row.cityRate,
        ) || 0;

      return (
        Math.abs(
          before - after,
        ) > 0.000001
      );
    }).length;

  const changedBusinessCount =
    rows.filter((row) => {
      const before =
        initialBusinessRates.get(
          row.id,
        ) || 0;

      const after =
        Number(
          row.businessRate,
        ) || 0;

      return (
        Math.abs(
          before - after,
        ) > 0.000001
      );
    }).length;

  const changedCount =
    changedCityCount +
    changedBusinessCount;

  function updateRow(
    id: string,
    patch:
      Partial<
        UnifiedIngredientRate
      >,
  ) {
    setRows((current) =>
      current.map((row) =>
        row.id === id
          ? {
              ...row,
              ...patch,
            }
          : row,
      ),
    );

    setMessage('');
    setError('');
  }

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
            String(
              item.name || '',
            )
              .trim()
              .toLowerCase(),

            Number(
              item.rate,
            ) || 0,
          ],
        ),
      );

    const session =
      getSession();

    if (!session) return;

    const work =
      loadWork(
        session.tenantId,
      );

    const menu =
      work.menu.map(
        (item) => {
          const newRate =
            costByName.get(
              item.name
                .trim()
                .toLowerCase(),
            );

          return newRate &&
            newRate > 0
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
      },
    );
  }

  async function saveAllRates() {
    if (!loadedCity) {
      setError(
        'Load a city before saving.',
      );
      return;
    }

    const cityRates =
      rows
        .filter(
          (row) =>
            Number(
              row.cityRate,
            ) > 0,
        )
        .map((row) => ({
          ingredientId:
            row.id,
          rate:
            Number(
              row.cityRate,
            ),
          source:
            row.cityRateSource ||
            '',
          effectiveDate:
            row.cityRateEffectiveDate ||
            '',
        }));

    const resetCityIds =
      rows
        .filter(
          (row) =>
            initialCityRates.has(
              row.id,
            ) &&
            !(
              Number(
                row.cityRate,
              ) > 0
            ),
        )
        .map(
          (row) => row.id,
        );

    const businessRates =
      rows
        .filter(
          (row) =>
            Number(
              row.businessRate,
            ) > 0,
        )
        .map((row) => ({
          ingredientId:
            row.id,
          rate:
            Number(
              row.businessRate,
            ),
        }));

    const resetBusinessIds =
      rows
        .filter(
          (row) =>
            initialBusinessRates.has(
              row.id,
            ) &&
            !(
              Number(
                row.businessRate,
              ) > 0
            ),
        )
        .map(
          (row) => row.id,
        );

    setSaving(true);
    setMessage('');
    setError('');

    try {
      const [
        cityResponse,
        businessResponse,
      ] =
        await Promise.all([
          fetch(
            '/api/admin/ingredient-city-rates',
            {
              method: 'PUT',
              headers: {
                'Content-Type':
                  'application/json',
              },
              body:
                JSON.stringify({
                  city:
                    loadedCity,
                  rates:
                    cityRates,
                  resetIngredientIds:
                    resetCityIds,
                }),
            },
          ),

          fetch(
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
                    businessRates,
                  resetIngredientIds:
                    resetBusinessIds,
                }),
            },
          ),
        ]);

      const [
        cityData,
        businessData,
      ] =
        await Promise.all([
          cityResponse.json(),
          businessResponse.json(),
        ]);

      if (!cityResponse.ok) {
        throw new Error(
          cityData.error ||
            'Could not save city rates.',
        );
      }

      if (
        !businessResponse.ok
      ) {
        throw new Error(
          businessData.error ||
            'Could not save business rates.',
        );
      }

      await refreshCurrentMenuCosts();

      await loadIngredients(
        loadedCity,
      );

      setMessage(
        `Saved ${loadedCity} city rates and business purchase rates. Active priority: Business → City → Global.`,
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Could not save ingredient rates.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function copyFromCity() {
    if (!loadedCity) return;

    const sourceCity =
      window.prompt(
        `Copy city rates into ${loadedCity} from which city?`,
        knownCities.find(
          (item) =>
            normalize(
              item.city,
            ) !==
            normalize(
              loadedCity,
            ),
        )?.city || '',
      );

    if (
      sourceCity === null
    ) {
      return;
    }

    const cleanSource =
      sourceCity
        .trim()
        .replace(
          /\s+/g,
          ' ',
        );

    if (
      !cleanSource ||
      normalize(
        cleanSource,
      ) ===
        normalize(
          loadedCity,
        )
    ) {
      setError(
        'Choose a different source city.',
      );
      return;
    }

    setSaving(true);
    setMessage('');
    setError('');

    try {
      const response =
        await fetch(
          '/api/admin/ingredient-city-rates',
          {
            method: 'PUT',
            headers: {
              'Content-Type':
                'application/json',
            },
            body:
              JSON.stringify({
                city:
                  loadedCity,
                copyFromCity:
                  cleanSource,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Could not copy city rates.',
        );
      }

      await loadIngredients(
        loadedCity,
      );

      setMessage(
        `Copied available rates from ${cleanSource} to ${loadedCity}.`,
      );
    } catch (copyError) {
      setError(
        copyError instanceof Error
          ? copyError.message
          : 'Could not copy city rates.',
      );
    } finally {
      setSaving(false);
    }
  }

  function applyBulkCityRates() {
    const lines =
      bulkText
        .split(/\r?\n/)
        .map((line) =>
          line.trim(),
        )
        .filter(Boolean);

    if (!lines.length) {
      setError(
        'Paste ingredient rates first.',
      );
      return;
    }

    const byName =
      new Map<
        string,
        UnifiedIngredientRate[]
      >();

    rows.forEach((row) => {
      const key =
        normalize(
          row.name,
        );

      byName.set(
        key,
        [
          ...(byName.get(
            key,
          ) || []),
          row,
        ],
      );
    });

    const patches =
      new Map<
        string,
        Partial<
          UnifiedIngredientRate
        >
      >();

    let updated = 0;
    let skipped = 0;

    lines.forEach((line) => {
      const parts =
        line
          .split(/\t|\|/)
          .map((part) =>
            part.trim(),
          );

      const name =
        parts[0];

      const rate =
        Number(
          String(
            parts[1] || '',
          )
            .replace(
              /₹/g,
              '',
            )
            .replace(
              /,/g,
              '',
            ),
        );

      if (
        !name ||
        !Number.isFinite(
          rate,
        ) ||
        !(rate > 0)
      ) {
        skipped += 1;
        return;
      }

      const candidates =
        byName.get(
          normalize(name),
        ) || [];

      if (
        !candidates.length
      ) {
        skipped += 1;
        return;
      }

      const unitHint =
        normalize(
          parts[2],
        );

      const target =
        unitHint
          ? candidates.find(
              (row) =>
                normalize(
                  row.unit,
                ) ===
                unitHint,
            ) ||
            candidates[0]
          : candidates[0];

      patches.set(
        target.id,
        {
          cityRate: rate,
          cityRateSource:
            parts[3] ||
            target.cityRateSource ||
            '',
          cityRateEffectiveDate:
            parts[4] ||
            target.cityRateEffectiveDate ||
            '',
        },
      );

      updated += 1;
    });

    setRows((current) =>
      current.map(
        (row) => ({
          ...row,
          ...(patches.get(
            row.id,
          ) || {}),
        }),
      ),
    );

    setMessage(
      `Applied ${updated} city rate${updated === 1 ? '' : 's'}${skipped ? ` · ${skipped} skipped` : ''}. Click Save All Rates to publish.`,
    );
    setError('');
  }

  return (
    <AppShell
      title="Ingredient Rates"
      subtitle="Global, city and business purchase rates in one place"
    >
      <section className="content-grid">
        <div className="stat-grid">
          <div className="stat-card">
            <small>
              Ingredients
            </small>
            <strong>
              {rows.length}
            </strong>
            <span>
              Master items
            </span>
          </div>

          <div className="stat-card">
            <small>
              Business Rate
            </small>
            <strong>
              {businessRateCount}
            </strong>
            <span>
              Highest priority
            </span>
          </div>

          <div className="stat-card">
            <small>
              {loadedCity ||
                'City'}{' '}
              Rate
            </small>
            <strong>
              {cityRateCount}
            </strong>
            <span>
              Used when no business rate
            </span>
          </div>

          <div className="stat-card">
            <small>
              Global Rate
            </small>
            <strong>
              {globalRateCount}
            </strong>
            <span>
              Final fallback
            </span>
          </div>
        </div>

        <div className="glass-card">
          <div className="final-costing-section-heading">
            <div>
              <span className="section-kicker">
                One Ingredient Rate Page
              </span>
              <h2>
                Business + City + Global Rates
              </h2>
              <p className="muted">
                Active costing priority is Business Purchase Rate → Event City Rate → Global Master Rate.
              </p>
            </div>

            <div className="action-row">
              <button
                className="ghost-button"
                type="button"
                disabled={
                  saving ||
                  !loadedCity
                }
                onClick={() =>
                  void copyFromCity()
                }
              >
                Copy From City
              </button>

              <button
                className="primary-button"
                type="button"
                disabled={
                  saving ||
                  !ready
                }
                onClick={() =>
                  void saveAllRates()
                }
              >
                {saving
                  ? 'Saving…'
                  : `Save All Rates${changedCount ? ` (${changedCount})` : ''}`}
              </button>
            </div>
          </div>

          <div className="ingredient-rate-controls">
            <label className="field">
              <span>
                City
              </span>

              <input
                className="input"
                value={city}
                list="ingredient-city-options"
                placeholder="Silvassa"
                onChange={(event) =>
                  setCity(
                    event.target.value,
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key ===
                    'Enter'
                  ) {
                    void loadIngredients();
                  }
                }}
              />

              <datalist id="ingredient-city-options">
                {knownCities.map(
                  (item) => (
                    <option
                      key={
                        item.cityKey
                      }
                      value={
                        item.city
                      }
                    />
                  ),
                )}
              </datalist>
            </label>

            <button
              className="secondary-button"
              type="button"
              disabled={!ready}
              onClick={() =>
                void loadIngredients()
              }
            >
              Load City
            </button>

            <label className="field">
              <span>
                Search
              </span>

              <input
                className="input"
                value={query}
                placeholder="Paneer, Tomato, Oil..."
                onChange={(event) =>
                  setQuery(
                    event.target.value,
                  )
                }
              />
            </label>

            <label className="field">
              <span>
                Category
              </span>

              <select
                className="select"
                value={category}
                onChange={(event) =>
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
            </label>
          </div>

          <div className="ingredient-rate-filters">
            {(
              [
                ['ALL', 'All'],
                [
                  'BUSINESS',
                  'Business Active',
                ],
                [
                  'CITY',
                  'City Active',
                ],
                [
                  'GLOBAL',
                  'Global Active',
                ],
              ] as const
            ).map(
              ([value, label]) => (
                <button
                  key={value}
                  className={
                    filter ===
                    value
                      ? 'primary-button'
                      : 'ghost-button'
                  }
                  type="button"
                  onClick={() =>
                    setFilter(
                      value,
                    )
                  }
                >
                  {label}
                </button>
              ),
            )}
          </div>

          {message ? (
            <div className="admin-message">
              {message}
            </div>
          ) : null}

          {error ? (
            <div className="admin-message error">
              {error}
            </div>
          ) : null}
        </div>

        <div className="glass-card">
          <div className="final-costing-section-heading">
            <div>
              <span className="section-kicker">
                Fast City Update
              </span>
              <h2>
                Paste rates from Excel / WhatsApp
              </h2>
              <p className="muted">
                Format: Ingredient | Rate | Unit | Vendor | Effective Date
              </p>
            </div>

            <button
              className="secondary-button"
              type="button"
              onClick={
                applyBulkCityRates
              }
            >
              Apply to {loadedCity || 'City'}
            </button>
          </div>

          <textarea
            className="input"
            style={{
              minHeight: 92,
              marginTop: 12,
              resize: 'vertical',
            }}
            value={bulkText}
            onChange={(event) =>
              setBulkText(
                event.target.value,
              )
            }
            placeholder={
              'Tomato | 38 | kg | Local Market | 2026-09-26\nPaneer | 330 | kg | Dairy Vendor | 2026-09-26'
            }
          />
        </div>

        <div className="glass-card ingredient-list-card">
          <div className="dish-list-heading">
            <div>
              <span className="section-kicker">
                Ingredient Rate Control
              </span>
              <h2>
                {loadedCity ||
                  'City'}{' '}
                Ingredient Rates
              </h2>
              <p className="muted">
                Leave Business Rate blank to use City Rate. Leave City Rate blank to use Global Rate.
              </p>
            </div>

            <span className="badge">
              {
                filteredRows.length
              }{' '}
              ingredients
            </span>
          </div>

          {!ready ? (
            <div className="admin-empty">
              Loading…
            </div>
          ) : (
            <div className="table-wrap">
              <table className="disposable-table unified-rate-table">
                <thead>
                  <tr>
                    <th>
                      Ingredient
                    </th>
                    <th>
                      Unit
                    </th>
                    <th>
                      Global
                    </th>
                    <th>
                      {loadedCity ||
                        'City'}
                    </th>
                    <th>
                      Business
                    </th>
                    <th>
                      Active Rate
                    </th>
                    <th>
                      Source
                    </th>
                    <th>
                      Vendor / Date
                    </th>
                    <th>
                      Recipes
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRows.map(
                    (row) => {
                      const hasBusiness =
                        Number(
                          row.businessRate,
                        ) > 0;

                      const hasCity =
                        Number(
                          row.cityRate,
                        ) > 0;

                      const activeRate =
                        hasBusiness
                          ? Number(
                              row.businessRate,
                            )
                          : hasCity
                            ? Number(
                                row.cityRate,
                              )
                            : Number(
                                row.globalRate,
                              );

                      const activeSource =
                        hasBusiness
                          ? 'Business'
                          : hasCity
                            ? loadedCity ||
                              'City'
                            : 'Global';

                      const recipes =
                        usage[
                          row.id
                        ] || [];

                      return (
                        <tr
                          key={
                            row.id
                          }
                        >
                          <td>
                            <strong>
                              {
                                row.name
                              }
                            </strong>
                            <small className="muted">
                              {
                                row.category
                              }
                            </small>
                          </td>

                          <td>
                            {row.unit}
                          </td>

                          <td>
                            <strong>
                              {money(
                                row.globalRate,
                              )}
                            </strong>
                          </td>

                          <td>
                            <input
                              className="input rate-cell-input"
                              type="number"
                              min="0"
                              step="0.01"
                              value={
                                row.cityRate ??
                                ''
                              }
                              placeholder={String(
                                row.globalRate,
                              )}
                              onChange={(
                                event,
                              ) =>
                                updateRow(
                                  row.id,
                                  {
                                    cityRate:
                                      event
                                        .target
                                        .value ===
                                      ''
                                        ? null
                                        : Math.max(
                                            0,
                                            Number(
                                              event
                                                .target
                                                .value,
                                            ) ||
                                              0,
                                          ),
                                  },
                                )
                              }
                            />
                          </td>

                          <td>
                            <input
                              className="input rate-cell-input"
                              type="number"
                              min="0"
                              step="0.01"
                              value={
                                row.businessRate ??
                                ''
                              }
                              placeholder="Optional"
                              onChange={(
                                event,
                              ) =>
                                updateRow(
                                  row.id,
                                  {
                                    businessRate:
                                      event
                                        .target
                                        .value ===
                                      ''
                                        ? null
                                        : Math.max(
                                            0,
                                            Number(
                                              event
                                                .target
                                                .value,
                                            ) ||
                                              0,
                                          ),
                                  },
                                )
                              }
                            />
                          </td>

                          <td>
                            <strong>
                              {money(
                                activeRate,
                              )}
                            </strong>
                            <small className="muted">
                              {activeSource}
                            </small>
                          </td>

                          <td>
                            <span className={
                              hasBusiness
                                ? 'badge'
                                : hasCity
                                  ? 'badge'
                                  : 'muted'
                            }>
                              {activeSource}
                            </span>
                          </td>

                          <td>
                            <input
                              className="input source-cell-input"
                              value={
                                row.cityRateSource ||
                                ''
                              }
                              placeholder="Vendor / market"
                              onChange={(
                                event,
                              ) =>
                                updateRow(
                                  row.id,
                                  {
                                    cityRateSource:
                                      event
                                        .target
                                        .value,
                                  },
                                )
                              }
                            />

                            <input
                              className="input source-cell-input"
                              type="date"
                              value={
                                row.cityRateEffectiveDate ||
                                ''
                              }
                              onChange={(
                                event,
                              ) =>
                                updateRow(
                                  row.id,
                                  {
                                    cityRateEffectiveDate:
                                      event
                                        .target
                                        .value,
                                  },
                                )
                              }
                            />
                          </td>

                          <td>
                            <span className="badge">
                              {
                                recipes.length
                              }
                            </span>
                          </td>
                        </tr>
                      );
                    },
                  )}

                  {!filteredRows.length ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="muted"
                      >
                        No ingredients match this filter.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <style>{`
          .ingredient-rate-controls {
            display:grid;
            grid-template-columns:minmax(180px,.7fr) auto minmax(220px,1fr) minmax(180px,.7fr);
            gap:9px;
            align-items:end;
            margin-top:16px;
          }

          .ingredient-rate-filters {
            display:flex;
            gap:7px;
            flex-wrap:wrap;
            margin-top:11px;
          }

          .unified-rate-table td small {
            display:block;
            margin-top:4px;
          }

          .rate-cell-input {
            min-width:105px;
          }

          .source-cell-input {
            min-width:145px;
            margin-bottom:5px;
          }

          .source-cell-input:last-child {
            margin-bottom:0;
          }

          @media(max-width:1000px) {
            .ingredient-rate-controls {
              grid-template-columns:1fr 1fr;
            }
          }

          @media(max-width:650px) {
            .ingredient-rate-controls {
              grid-template-columns:1fr;
            }
          }
        `}</style>
      </section>
    </AppShell>
  );
}
