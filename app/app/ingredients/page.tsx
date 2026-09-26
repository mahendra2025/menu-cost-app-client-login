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

type RateFilter =
  | 'ALL'
  | 'BUSINESS'
  | 'CITY'
  | 'GLOBAL';

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

function activeSource(
  row: UnifiedIngredientRate,
): Exclude<
  RateFilter,
  'ALL'
> {
  if (
    Number(
      row.businessRate,
    ) > 0
  ) {
    return 'BUSINESS';
  }

  if (
    Number(
      row.cityRate,
    ) > 0
  ) {
    return 'CITY';
  }

  return 'GLOBAL';
}

function activeRate(
  row: UnifiedIngredientRate,
) {
  const source =
    activeSource(row);

  if (
    source === 'BUSINESS'
  ) {
    return Number(
      row.businessRate,
    );
  }

  if (source === 'CITY') {
    return Number(
      row.cityRate,
    );
  }

  return Number(
    row.globalRate,
  );
}

function rateDifference(
  rate: number,
  base: number,
) {
  if (
    !(rate > 0) ||
    !(base > 0)
  ) {
    return null;
  }

  const percent =
    ((rate - base) /
      base) *
    100;

  if (
    Math.abs(percent) <
    0.05
  ) {
    return 'Same as global';
  }

  return `${percent > 0 ? '+' : ''}${percent.toFixed(
    1,
  )}% vs global`;
}

export default function IngredientRatesPage() {
  const [rows, setRows] =
    useState<
      UnifiedIngredientRate[]
    >([]);

  const [usage, setUsage] =
    useState<UsageMap>({});

  const [city, setCity] =
    useState('');

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
    useState<RateFilter>(
      'ALL',
    );

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
    initialCityMeta,
    setInitialCityMeta,
  ] = useState<
    Map<string, string>
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
    requestedCity = '',
  ) {
    const cleanCity =
      requestedCity
        .trim()
        .replace(/\s+/g, ' ');

    setReady(false);
    setMessage('');
    setError('');

    try {
      const queryString =
        cleanCity
          ? `?city=${encodeURIComponent(
              cleanCity,
            )}`
          : '';

      const response =
        await fetch(
          `/api/client/ingredients${queryString}`,
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
        UnifiedIngredientRate[] =
        Array.isArray(
          data.rates,
        )
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
            cleanCity ||
            'Silvassa',
        );

      setCity(effectiveCity);
      setLoadedCity(
        effectiveCity,
      );

      setInitialCityRates(
        new Map(
          loadedRows
            .filter(
              (row) =>
                Number(
                  row.cityRate,
                ) > 0,
            )
            .map((row) => [
              row.id,
              Number(
                row.cityRate,
              ),
            ]),
        ),
      );

      setInitialCityMeta(
        new Map(
          loadedRows.map(
            (row) => [
              row.id,
              `${row.cityRateSource || ''}|${row.cityRateEffectiveDate || ''}`,
            ],
          ),
        ),
      );

      setInitialBusinessRates(
        new Map(
          loadedRows
            .filter(
              (row) =>
                Number(
                  row.businessRate,
                ) > 0,
            )
            .map((row) => [
              row.id,
              Number(
                row.businessRate,
              ),
            ]),
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
    void loadIngredients();
    // Load the business/profile city when available.
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
          const source =
            activeSource(row);

          const matchesFilter =
            filter === 'ALL' ||
            filter === source;

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
        activeSource(row) ===
        'BUSINESS',
    ).length;

  const cityRateCount =
    rows.filter(
      (row) =>
        activeSource(row) ===
        'CITY',
    ).length;

  const globalRateCount =
    rows.filter(
      (row) =>
        activeSource(row) ===
        'GLOBAL',
    ).length;

  const changedCityCount =
    rows.filter((row) => {
      const beforeRate =
        initialCityRates.get(
          row.id,
        ) || 0;

      const afterRate =
        Number(
          row.cityRate,
        ) || 0;

      const beforeMeta =
        initialCityMeta.get(
          row.id,
        ) || '|';

      const afterMeta =
        `${row.cityRateSource || ''}|${row.cityRateEffectiveDate || ''}`;

      return (
        Math.abs(
          beforeRate -
            afterRate,
        ) > 0.000001 ||
        beforeMeta !==
          afterMeta
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

  function rowHasChanges(
    row: UnifiedIngredientRate,
  ) {
    const initialCityRate =
      initialCityRates.get(
        row.id,
      ) || 0;

    const currentCityRate =
      Number(
        row.cityRate,
      ) || 0;

    const initialBusinessRate =
      initialBusinessRates.get(
        row.id,
      ) || 0;

    const currentBusinessRate =
      Number(
        row.businessRate,
      ) || 0;

    const initialMeta =
      initialCityMeta.get(
        row.id,
      ) || '|';

    const currentMeta =
      `${row.cityRateSource || ''}|${row.cityRateEffectiveDate || ''}`;

    return (
      Math.abs(
        initialCityRate -
          currentCityRate,
      ) > 0.000001 ||
      Math.abs(
        initialBusinessRate -
          currentBusinessRate,
      ) > 0.000001 ||
      initialMeta !==
        currentMeta
    );
  }

  function clearFilters() {
    setQuery('');
    setCategory('ALL');
    setFilter('ALL');
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
    if (
      !loadedCity ||
      !changedCount
    ) {
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
        `Saved ${loadedCity} rates. Costing priority is Business → City → Global.`,
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

  function loadSelectedCity() {
    if (
      changedCount &&
      !window.confirm(
        'You have unsaved ingredient-rate changes. Load another city and discard them?',
      )
    ) {
      return;
    }

    void loadIngredients(
      city,
    );
  }

  async function copyFromCity() {
    if (!loadedCity) return;

    if (
      changedCount &&
      !window.confirm(
        'Copying another city will discard your unsaved changes. Continue?',
      )
    ) {
      return;
    }

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
      `Applied ${updated} city rate${updated === 1 ? '' : 's'}${skipped ? ` · ${skipped} skipped` : ''}. Review and save the changes.`,
    );
    setError('');
  }

  const hasFilters =
    Boolean(query) ||
    category !== 'ALL' ||
    filter !== 'ALL';

  return (
    <AppShell
      title="Ingredient Rates"
      subtitle="Control the exact ingredient rate used in every event costing"
    >
      <section className="content-grid ingredient-rates-page">
        <div className="ingredient-rate-hero">
          <div>
            <span className="ingredient-rate-eyebrow">
              Cost master · {loadedCity || 'Business city'}
            </span>

            <h2>
              One place for every ingredient rate
            </h2>

            <p>
              Set a business purchase rate when you know your actual buying price. Otherwise Menu Cost uses the selected city rate, then the global master rate.
            </p>
          </div>

          <div className="ingredient-rate-priority" aria-label="Rate priority">
            <span>
              <b>1</b>
              Business
            </span>
            <i>→</i>
            <span>
              <b>2</b>
              {loadedCity || 'City'}
            </span>
            <i>→</i>
            <span>
              <b>3</b>
              Global
            </span>
          </div>
        </div>

        <div className="ingredient-rate-stats">
          <button
            type="button"
            className={filter === 'BUSINESS' ? 'active' : ''}
            onClick={() =>
              setFilter(
                filter === 'BUSINESS'
                  ? 'ALL'
                  : 'BUSINESS',
              )
            }
          >
            <small>Business active</small>
            <strong>{businessRateCount}</strong>
            <span>your purchase price</span>
          </button>

          <button
            type="button"
            className={filter === 'CITY' ? 'active' : ''}
            onClick={() =>
              setFilter(
                filter === 'CITY'
                  ? 'ALL'
                  : 'CITY',
              )
            }
          >
            <small>{loadedCity || 'City'} active</small>
            <strong>{cityRateCount}</strong>
            <span>local market rate</span>
          </button>

          <button
            type="button"
            className={filter === 'GLOBAL' ? 'active' : ''}
            onClick={() =>
              setFilter(
                filter === 'GLOBAL'
                  ? 'ALL'
                  : 'GLOBAL',
              )
            }
          >
            <small>Global fallback</small>
            <strong>{globalRateCount}</strong>
            <span>master rate</span>
          </button>

          <div className={changedCount ? 'has-changes' : ''}>
            <small>Unsaved</small>
            <strong>{changedCount}</strong>
            <span>
              {changedCount
                ? 'changes waiting'
                : 'everything saved'}
            </span>
          </div>
        </div>

        <div className="glass-card ingredient-rate-toolbar">
          <div className="ingredient-rate-toolbar-top">
            <div className="ingredient-rate-city-control">
              <label className="field">
                <span>
                  Market city
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
                      loadSelectedCity();
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
                onClick={
                  loadSelectedCity
                }
              >
                {ready
                  ? 'Load City'
                  : 'Loading…'}
              </button>

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
                Copy Rates
              </button>
            </div>

            <div className="ingredient-rate-primary-action">
              <span>
                {changedCount
                  ? `${changedCount} unsaved change${changedCount === 1 ? '' : 's'}`
                  : 'All rates saved'}
              </span>

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
          </div>

          <div className="ingredient-rate-search-row">
            <label className="ingredient-rate-search">
              <span aria-hidden="true">
                ⌕
              </span>
              <input
                value={query}
                placeholder="Search ingredient, category or unit…"
                onChange={(event) =>
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

            <div className="ingredient-rate-filter-chips">
              {(
                [
                  ['ALL', 'All'],
                  ['BUSINESS', 'Business'],
                  ['CITY', 'City'],
                  ['GLOBAL', 'Global'],
                ] as const
              ).map(
                ([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={
                      filter ===
                      value
                        ? 'active'
                        : ''
                    }
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

            {hasFilters ? (
              <button
                className="ingredient-rate-clear"
                type="button"
                onClick={
                  clearFilters
                }
              >
                Clear
              </button>
            ) : null}
          </div>

          <div className="ingredient-rate-result-line">
            <span>
              Showing <b>{filteredRows.length}</b> of <b>{rows.length}</b> ingredients
            </span>
            <span>
              City: <b>{loadedCity || '—'}</b>
            </span>
          </div>

          {message ? (
            <div className="admin-message ingredient-rate-feedback">
              {message}
            </div>
          ) : null}

          {error ? (
            <div className="admin-message error ingredient-rate-feedback">
              {error}
            </div>
          ) : null}
        </div>

        <details className="glass-card ingredient-rate-bulk">
          <summary>
            <div>
              <span className="section-kicker">
                Fast update
              </span>
              <b>
                Paste {loadedCity || 'city'} rates from Excel / WhatsApp
              </b>
              <small>
                Ingredient | Rate | Unit | Vendor | Effective Date
              </small>
            </div>
            <span aria-hidden="true">
              +
            </span>
          </summary>

          <div className="ingredient-rate-bulk-body">
            <textarea
              className="input"
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
        </details>

        <div className="glass-card ingredient-rate-table-card">
          <div className="ingredient-rate-table-head">
            <div>
              <span className="section-kicker">
                Active costing rates
              </span>
              <h2>
                Ingredient price control
              </h2>
              <p>
                The highlighted Active Rate is the price Menu Cost will use.
              </p>
            </div>

            <span className="badge">
              {filteredRows.length} ingredients
            </span>
          </div>

          {!ready ? (
            <div className="ingredient-rate-loading">
              Loading ingredient rates…
            </div>
          ) : (
            <div className="table-wrap ingredient-rate-table-wrap">
              <table className="ingredient-rate-table">
                <thead>
                  <tr>
                    <th>
                      Ingredient
                    </th>
                    <th>
                      Global
                    </th>
                    <th>
                      {loadedCity || 'City'} Rate
                    </th>
                    <th>
                      Business Rate
                    </th>
                    <th>
                      Active Rate
                    </th>
                    <th>
                      Market details
                    </th>
                    <th>
                      Recipes
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRows.map(
                    (row) => {
                      const source =
                        activeSource(
                          row,
                        );

                      const currentRate =
                        activeRate(
                          row,
                        );

                      const diff =
                        rateDifference(
                          currentRate,
                          Number(
                            row.globalRate,
                          ),
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
                            changed
                              ? 'is-edited'
                              : ''
                          }
                        >
                          <td className="ingredient-rate-name-cell">
                            <div className="ingredient-rate-name">
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
                            <div className="ingredient-static-rate">
                              <strong>
                                {money(
                                  row.globalRate,
                                )}
                              </strong>
                              <small>
                                master
                              </small>
                            </div>
                          </td>

                          <td>
                            <div className="ingredient-rate-edit">
                              <label>
                                <span>
                                  ₹
                                </span>
                                <input
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
                              </label>

                              {Number(
                                row.cityRate,
                              ) > 0 ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateRow(
                                      row.id,
                                      {
                                        cityRate:
                                          null,
                                      },
                                    )
                                  }
                                >
                                  Use global
                                </button>
                              ) : (
                                <small>
                                  falls back to global
                                </small>
                              )}
                            </div>
                          </td>

                          <td>
                            <div className="ingredient-rate-edit">
                              <label className="business-rate-input">
                                <span>
                                  ₹
                                </span>
                                <input
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
                              </label>

                              {Number(
                                row.businessRate,
                              ) > 0 ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateRow(
                                      row.id,
                                      {
                                        businessRate:
                                          null,
                                      },
                                    )
                                  }
                                >
                                  Use city
                                </button>
                              ) : (
                                <small>
                                  optional override
                                </small>
                              )}
                            </div>
                          </td>

                          <td>
                            <div
                              className="ingredient-active-rate"
                              data-source={
                                source
                              }
                            >
                              <span>
                                {source ===
                                'BUSINESS'
                                  ? 'Business'
                                  : source ===
                                      'CITY'
                                    ? loadedCity ||
                                      'City'
                                    : 'Global'}
                              </span>
                              <strong>
                                {money(
                                  currentRate,
                                )}
                              </strong>
                              <small>
                                {diff ||
                                  'active'}
                              </small>
                            </div>
                          </td>

                          <td>
                            <div className="ingredient-market-fields">
                              <input
                                className="input"
                                value={
                                  row.cityRateSource ||
                                  ''
                                }
                                placeholder="Vendor / market"
                                aria-label={`${row.name} city rate source`}
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
                                className="input"
                                type="date"
                                value={
                                  row.cityRateEffectiveDate ||
                                  ''
                                }
                                aria-label={`${row.name} city rate date`}
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
                            </div>
                          </td>

                          <td>
                            <div className="ingredient-recipe-count">
                              <strong>
                                {recipes.length}
                              </strong>
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
                        colSpan={7}
                      >
                        <div className="ingredient-rate-empty">
                          <b>
                            No ingredients found
                          </b>
                          <span>
                            Try another search, category or rate source.
                          </span>
                          <button
                            type="button"
                            onClick={
                              clearFilters
                            }
                          >
                            Clear filters
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className={`ingredient-save-dock ${changedCount ? 'is-visible' : ''}`}>
          <div>
            <strong>
              {changedCount
                ? `${changedCount} unsaved change${changedCount === 1 ? '' : 's'}`
                : 'Rates are up to date'}
            </strong>
            <span>
              Saving updates city rates and business purchase rates together.
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
              : 'Save Rates'}
          </button>
        </div>

        <style>{`
          .ingredient-rates-page {
            --rate-border: rgba(148,163,184,.12);
            --rate-muted: #7e8da1;
          }

          .ingredient-rate-hero {
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:22px;
            padding:20px 22px;
            border:1px solid rgba(74,156,255,.14);
            border-radius:16px;
            background:
              radial-gradient(circle at 92% 0%, rgba(74,156,255,.13), transparent 18rem),
              linear-gradient(135deg, rgba(20,30,44,.94), rgba(10,14,20,.98));
            box-shadow:0 14px 36px rgba(0,0,0,.22);
          }

          .ingredient-rate-eyebrow {
            display:block;
            margin-bottom:6px;
            color:#73adf3;
            font-size:9px;
            font-weight:900;
            letter-spacing:.09em;
            text-transform:uppercase;
          }

          .ingredient-rate-hero h2 {
            margin:0 0 6px;
            color:#f5f8fc;
            font-size:22px;
            letter-spacing:-.025em;
          }

          .ingredient-rate-hero p {
            max-width:720px;
            margin:0;
            color:#8291a5;
            font-size:11px;
            line-height:1.55;
          }

          .ingredient-rate-priority {
            display:flex;
            align-items:center;
            gap:8px;
            flex:0 0 auto;
          }

          .ingredient-rate-priority span {
            display:grid;
            gap:2px;
            min-width:86px;
            padding:9px 10px;
            border:1px solid rgba(148,163,184,.11);
            border-radius:11px;
            color:#c9d5e4;
            background:rgba(255,255,255,.025);
            font-size:9px;
            font-weight:850;
          }

          .ingredient-rate-priority span:first-child {
            border-color:rgba(98,217,149,.18);
            background:rgba(98,217,149,.045);
          }

          .ingredient-rate-priority b {
            color:#6f9fd8;
            font-size:8px;
          }

          .ingredient-rate-priority i {
            color:#47566a;
            font-style:normal;
          }

          .ingredient-rate-stats {
            display:grid;
            grid-template-columns:repeat(4,minmax(0,1fr));
            gap:10px;
          }

          .ingredient-rate-stats > button,
          .ingredient-rate-stats > div {
            min-width:0;
            padding:13px 14px;
            border:1px solid var(--rate-border);
            border-radius:13px;
            color:#8998aa;
            background:rgba(255,255,255,.02);
            text-align:left;
          }

          .ingredient-rate-stats > button {
            font:inherit;
            cursor:pointer;
            transition:border-color .16s ease, background .16s ease, transform .16s ease;
          }

          .ingredient-rate-stats > button:hover,
          .ingredient-rate-stats > button.active {
            border-color:rgba(74,156,255,.28);
            background:rgba(74,156,255,.055);
            transform:translateY(-1px);
          }

          .ingredient-rate-stats small,
          .ingredient-rate-stats strong,
          .ingredient-rate-stats span {
            display:block;
          }

          .ingredient-rate-stats small {
            color:#78879a;
            font-size:8px;
            font-weight:850;
            text-transform:uppercase;
            letter-spacing:.045em;
          }

          .ingredient-rate-stats strong {
            margin:3px 0 1px;
            color:#edf3fa;
            font-size:21px;
            letter-spacing:-.03em;
          }

          .ingredient-rate-stats span {
            color:#657589;
            font-size:8px;
          }

          .ingredient-rate-stats .has-changes {
            border-color:rgba(244,182,74,.24);
            background:rgba(244,182,74,.04);
          }

          .ingredient-rate-stats .has-changes strong {
            color:#e8c47e;
          }

          .ingredient-rate-toolbar {
            position:sticky;
            top:64px;
            z-index:11;
            padding:14px 16px;
            border-color:rgba(74,156,255,.11);
            background:rgba(10,14,20,.94);
            backdrop-filter:blur(18px);
            -webkit-backdrop-filter:blur(18px);
          }

          .ingredient-rate-toolbar-top {
            display:flex;
            align-items:end;
            justify-content:space-between;
            gap:16px;
          }

          .ingredient-rate-city-control {
            display:flex;
            align-items:end;
            gap:7px;
            flex-wrap:wrap;
          }

          .ingredient-rate-city-control .field {
            width:min(260px,42vw);
          }

          .ingredient-rate-primary-action {
            display:flex;
            align-items:center;
            gap:10px;
          }

          .ingredient-rate-primary-action > span {
            color:#718196;
            font-size:9px;
            white-space:nowrap;
          }

          .ingredient-rate-search-row {
            display:grid;
            grid-template-columns:minmax(240px,1fr) 190px auto auto;
            gap:8px;
            align-items:center;
            margin-top:12px;
            padding-top:12px;
            border-top:1px solid rgba(148,163,184,.08);
          }

          .ingredient-rate-search {
            display:grid;
            grid-template-columns:28px minmax(0,1fr);
            align-items:center;
            min-height:38px;
            padding:0 8px;
            border:1px solid rgba(148,163,184,.13);
            border-radius:10px;
            background:rgba(255,255,255,.025);
          }

          .ingredient-rate-search > span {
            color:#63748a;
            font-size:18px;
            text-align:center;
          }

          .ingredient-rate-search input {
            min-width:0;
            border:0;
            outline:0;
            color:#e7eef7;
            background:transparent;
            font:inherit;
            font-size:11px;
          }

          .ingredient-rate-search input::placeholder {
            color:#59697d;
          }

          .ingredient-rate-filter-chips {
            display:flex;
            gap:4px;
            padding:3px;
            border:1px solid rgba(148,163,184,.09);
            border-radius:10px;
            background:rgba(255,255,255,.018);
          }

          .ingredient-rate-filter-chips button,
          .ingredient-rate-clear {
            min-height:30px;
            padding:5px 9px;
            border:0;
            border-radius:7px;
            color:#738398;
            background:transparent;
            font:inherit;
            font-size:9px;
            font-weight:800;
            cursor:pointer;
          }

          .ingredient-rate-filter-chips button:hover,
          .ingredient-rate-filter-chips button.active {
            color:#eaf3ff;
            background:rgba(74,156,255,.13);
          }

          .ingredient-rate-clear {
            color:#9aabba;
          }

          .ingredient-rate-result-line {
            display:flex;
            justify-content:space-between;
            gap:14px;
            margin-top:9px;
            color:#5f7085;
            font-size:8px;
          }

          .ingredient-rate-result-line b {
            color:#99a9bb;
          }

          .ingredient-rate-feedback {
            margin-top:10px!important;
          }

          .ingredient-rate-bulk {
            padding:0!important;
            overflow:hidden;
          }

          .ingredient-rate-bulk summary {
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:16px;
            padding:14px 16px;
            cursor:pointer;
            list-style:none;
          }

          .ingredient-rate-bulk summary::-webkit-details-marker {
            display:none;
          }

          .ingredient-rate-bulk summary b,
          .ingredient-rate-bulk summary small {
            display:block;
          }

          .ingredient-rate-bulk summary b {
            color:#dce6f1;
            font-size:11px;
          }

          .ingredient-rate-bulk summary small {
            margin-top:3px;
            color:#6e7e92;
            font-size:8px;
          }

          .ingredient-rate-bulk summary > span {
            display:grid;
            width:28px;
            height:28px;
            place-items:center;
            border:1px solid rgba(148,163,184,.11);
            border-radius:8px;
            color:#8da0b7;
            transition:transform .18s ease;
          }

          .ingredient-rate-bulk[open] summary > span {
            transform:rotate(45deg);
          }

          .ingredient-rate-bulk-body {
            display:grid;
            grid-template-columns:minmax(0,1fr) auto;
            gap:10px;
            align-items:end;
            padding:0 16px 16px;
            border-top:1px solid rgba(148,163,184,.07);
          }

          .ingredient-rate-bulk-body textarea {
            min-height:92px;
            margin-top:12px;
            resize:vertical;
          }

          .ingredient-rate-table-card {
            padding:0!important;
            overflow:hidden;
          }

          .ingredient-rate-table-head {
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:14px;
            padding:16px 18px 12px;
            border-bottom:1px solid rgba(148,163,184,.08);
          }

          .ingredient-rate-table-head h2 {
            margin:3px 0 3px;
            color:#edf3fa;
            font-size:17px;
          }

          .ingredient-rate-table-head p {
            margin:0;
            color:#718196;
            font-size:9px;
          }

          .ingredient-rate-table-wrap {
            max-height:calc(100vh - 250px);
            min-height:280px;
            overflow:auto;
          }

          .ingredient-rate-table {
            min-width:1050px;
            width:100%;
            border-collapse:separate;
            border-spacing:0;
          }

          .ingredient-rate-table thead th {
            position:sticky;
            top:0;
            z-index:4;
            padding:10px 12px;
            border-bottom:1px solid rgba(148,163,184,.11);
            color:#74849a;
            background:#0d1219;
            font-size:8px;
            font-weight:900;
            letter-spacing:.045em;
            text-align:left;
            text-transform:uppercase;
          }

          .ingredient-rate-table thead th:first-child {
            left:0;
            z-index:6;
          }

          .ingredient-rate-table tbody td {
            padding:10px 12px;
            border-bottom:1px solid rgba(148,163,184,.065);
            vertical-align:middle;
          }

          .ingredient-rate-table tbody tr {
            transition:background .14s ease;
          }

          .ingredient-rate-table tbody tr:hover {
            background:rgba(74,156,255,.028);
          }

          .ingredient-rate-table tbody tr.is-edited {
            background:rgba(244,182,74,.025);
          }

          .ingredient-rate-name-cell {
            position:sticky;
            left:0;
            z-index:2;
            min-width:210px;
            background:#0d1219;
            box-shadow:10px 0 20px rgba(0,0,0,.10);
          }

          .ingredient-rate-table tbody tr:hover .ingredient-rate-name-cell {
            background:#101720;
          }

          .ingredient-rate-table tbody tr.is-edited .ingredient-rate-name-cell {
            background:#151714;
          }

          .ingredient-rate-name {
            display:flex;
            align-items:center;
            gap:7px;
          }

          .ingredient-rate-name strong {
            color:#dfe7f1;
            font-size:10px;
          }

          .ingredient-rate-name > span {
            padding:2px 5px;
            border-radius:5px;
            color:#d5ad65;
            background:rgba(244,182,74,.075);
            font-size:7px;
            font-weight:900;
            text-transform:uppercase;
          }

          .ingredient-rate-name-cell > small {
            display:block;
            margin-top:3px;
            color:#627287;
            font-size:8px;
          }

          .ingredient-static-rate {
            display:grid;
            gap:2px;
            min-width:92px;
          }

          .ingredient-static-rate strong {
            color:#aebbc9;
            font-size:11px;
          }

          .ingredient-static-rate small {
            color:#58687d;
            font-size:7px;
          }

          .ingredient-rate-edit {
            display:grid;
            gap:4px;
            min-width:125px;
          }

          .ingredient-rate-edit label {
            display:grid;
            grid-template-columns:24px minmax(0,1fr);
            align-items:center;
            min-height:36px;
            border:1px solid rgba(148,163,184,.13);
            border-radius:9px;
            background:rgba(255,255,255,.025);
            overflow:hidden;
          }

          .ingredient-rate-edit label:focus-within {
            border-color:rgba(74,156,255,.46);
            box-shadow:0 0 0 3px rgba(74,156,255,.08);
          }

          .ingredient-rate-edit label > span {
            color:#6f8094;
            font-size:10px;
            text-align:center;
          }

          .ingredient-rate-edit input {
            width:100%;
            min-width:0;
            min-height:34px;
            padding:6px 8px 6px 0;
            border:0;
            outline:0;
            color:#dfe9f5;
            background:transparent;
            font:inherit;
            font-size:10px;
          }

          .ingredient-rate-edit button {
            justify-self:start;
            padding:0;
            border:0;
            color:#6e9fd7;
            background:transparent;
            font:inherit;
            font-size:7px;
            font-weight:800;
            cursor:pointer;
          }

          .ingredient-rate-edit small {
            color:#536378;
            font-size:7px;
          }

          .business-rate-input {
            border-color:rgba(98,217,149,.12)!important;
            background:rgba(98,217,149,.022)!important;
          }

          .ingredient-active-rate {
            display:grid;
            gap:2px;
            min-width:120px;
            padding:9px 10px;
            border:1px solid rgba(148,163,184,.12);
            border-radius:10px;
            background:rgba(255,255,255,.025);
          }

          .ingredient-active-rate > span {
            color:#7c8ca1;
            font-size:7px;
            font-weight:900;
            letter-spacing:.04em;
            text-transform:uppercase;
          }

          .ingredient-active-rate strong {
            color:#eef5fc;
            font-size:14px;
            letter-spacing:-.02em;
          }

          .ingredient-active-rate small {
            color:#627287;
            font-size:7px;
          }

          .ingredient-active-rate[data-source="BUSINESS"] {
            border-color:rgba(98,217,149,.18);
            background:rgba(98,217,149,.04);
          }

          .ingredient-active-rate[data-source="BUSINESS"] > span,
          .ingredient-active-rate[data-source="BUSINESS"] strong {
            color:#b7e3c6;
          }

          .ingredient-active-rate[data-source="CITY"] {
            border-color:rgba(74,156,255,.20);
            background:rgba(74,156,255,.045);
          }

          .ingredient-active-rate[data-source="CITY"] > span,
          .ingredient-active-rate[data-source="CITY"] strong {
            color:#b9d8ff;
          }

          .ingredient-market-fields {
            display:grid;
            grid-template-columns:minmax(130px,1fr) 132px;
            gap:6px;
            min-width:280px;
          }

          .ingredient-market-fields .input {
            min-height:34px;
            padding:6px 8px;
            font-size:9px;
          }

          .ingredient-recipe-count {
            display:grid;
            min-width:64px;
            gap:1px;
            text-align:center;
          }

          .ingredient-recipe-count strong {
            color:#c9d6e5;
            font-size:13px;
          }

          .ingredient-recipe-count span {
            color:#5e6e82;
            font-size:7px;
          }

          .ingredient-rate-empty {
            display:grid;
            justify-items:center;
            gap:4px;
            padding:36px 20px;
            text-align:center;
          }

          .ingredient-rate-empty b {
            color:#cbd7e5;
            font-size:12px;
          }

          .ingredient-rate-empty span {
            color:#68798e;
            font-size:9px;
          }

          .ingredient-rate-empty button {
            margin-top:5px;
            padding:6px 9px;
            border:1px solid rgba(148,163,184,.12);
            border-radius:7px;
            color:#9bacc0;
            background:rgba(255,255,255,.025);
            font:inherit;
            font-size:8px;
            cursor:pointer;
          }

          .ingredient-rate-loading {
            min-height:280px;
            display:grid;
            place-items:center;
            color:#6e7f93;
            font-size:10px;
          }

          .ingredient-save-dock {
            position:sticky;
            bottom:14px;
            z-index:10;
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:16px;
            margin:0 auto;
            width:min(680px,calc(100% - 24px));
            padding:10px 11px 10px 14px;
            border:1px solid rgba(98,217,149,.16);
            border-radius:13px;
            background:rgba(10,16,14,.94);
            box-shadow:0 14px 36px rgba(0,0,0,.32);
            backdrop-filter:blur(18px);
            -webkit-backdrop-filter:blur(18px);
            opacity:0;
            pointer-events:none;
            transform:translateY(10px);
            transition:opacity .16s ease, transform .16s ease;
          }

          .ingredient-save-dock.is-visible {
            opacity:1;
            pointer-events:auto;
            transform:translateY(0);
          }

          .ingredient-save-dock strong,
          .ingredient-save-dock span {
            display:block;
          }

          .ingredient-save-dock strong {
            color:#d8eadf;
            font-size:10px;
          }

          .ingredient-save-dock span {
            margin-top:2px;
            color:#708279;
            font-size:8px;
          }

          @media(max-width:1100px) {
            .ingredient-rate-hero {
              display:grid;
            }

            .ingredient-rate-priority {
              justify-content:start;
            }

            .ingredient-rate-search-row {
              grid-template-columns:minmax(220px,1fr) 180px;
            }

            .ingredient-rate-filter-chips {
              justify-self:start;
            }

            .ingredient-rate-clear {
              justify-self:end;
            }
          }

          @media(max-width:760px) {
            .ingredient-rate-hero {
              padding:16px;
            }

            .ingredient-rate-priority {
              display:grid;
              grid-template-columns:1fr;
              width:100%;
            }

            .ingredient-rate-priority i {
              display:none;
            }

            .ingredient-rate-stats {
              grid-template-columns:repeat(2,minmax(0,1fr));
            }

            .ingredient-rate-toolbar {
              position:static;
            }

            .ingredient-rate-toolbar-top,
            .ingredient-rate-primary-action {
              display:grid;
              width:100%;
            }

            .ingredient-rate-city-control {
              display:grid;
              grid-template-columns:1fr 1fr;
              width:100%;
            }

            .ingredient-rate-city-control .field {
              grid-column:1 / -1;
              width:100%;
            }

            .ingredient-rate-primary-action {
              grid-template-columns:1fr auto;
              align-items:center;
            }

            .ingredient-rate-search-row {
              grid-template-columns:1fr;
            }

            .ingredient-rate-filter-chips {
              width:100%;
              overflow:auto;
            }

            .ingredient-rate-filter-chips button {
              flex:1 0 auto;
            }

            .ingredient-rate-result-line {
              display:grid;
            }

            .ingredient-rate-bulk-body {
              grid-template-columns:1fr;
            }

            .ingredient-rate-table-wrap {
              max-height:none;
            }

            .ingredient-save-dock {
              bottom:76px;
            }
          }
        `}</style>
      </section>
    </AppShell>
  );
}
