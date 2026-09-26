'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import AppShell from '../../components/AppShell';

type CityRateRow = {
  id: string;
  name: string;
  category: string;
  unit: string;
  globalRate: number;
  cityRate: number | null;
  source: string;
  effectiveDate: string;
  cityUpdatedAt?: string | null;
};

type KnownCity = {
  city: string;
  cityKey: string;
};

function normalize(value: unknown) {
  return String(value || '')
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('en-IN')
    .replace(/\s+/g, ' ');
}

function money(value: number | null) {
  if (!(Number(value) > 0)) return '—';
  return `₹${Number(value).toLocaleString(
    'en-IN',
    {
      maximumFractionDigits: 2,
    },
  )}`;
}

export default function IngredientCityRatesPage() {
  const [city, setCity] =
    useState('Silvassa');
  const [loadedCity, setLoadedCity] =
    useState('');
  const [knownCities, setKnownCities] =
    useState<KnownCity[]>([]);
  const [rows, setRows] =
    useState<CityRateRow[]>([]);
  const [initialRates, setInitialRates] =
    useState<Map<string, number>>(
      () => new Map(),
    );
  const [query, setQuery] =
    useState('');
  const [filter, setFilter] =
    useState<
      'ALL' | 'SET' | 'MISSING'
    >('ALL');
  const [loading, setLoading] =
    useState(false);
  const [saving, setSaving] =
    useState(false);
  const [message, setMessage] =
    useState('');
  const [error, setError] =
    useState('');
  const [bulkText, setBulkText] =
    useState('');

  async function loadCity(
    requestedCity = city,
  ) {
    const cleanCity =
      requestedCity
        .trim()
        .replace(/\s+/g, ' ');

    if (!cleanCity) {
      setError('Enter a city first.');
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response =
        await fetch(
          `/api/admin/ingredient-city-rates?city=${encodeURIComponent(
            cleanCity,
          )}`,
          { cache: 'no-store' },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Could not load city rates.',
        );
      }

      const loadedRows =
        Array.isArray(data.rates)
          ? (data.rates as CityRateRow[])
          : [];

      setRows(loadedRows);
      setInitialRates(
        new Map(
          loadedRows
            .filter(
              (row) =>
                Number(row.cityRate) >
                0,
            )
            .map((row) => [
              row.id,
              Number(row.cityRate),
            ]),
        ),
      );
      setKnownCities(
        Array.isArray(data.cities)
          ? data.cities
          : [],
      );
      setCity(
        String(data.city || cleanCity),
      );
      setLoadedCity(
        String(data.city || cleanCity),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not load city rates.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCity('Silvassa');
    // Initial city only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRows =
    useMemo(() => {
      const search =
        normalize(query);

      return rows
        .filter((row) => {
          const hasCityRate =
            Number(row.cityRate) > 0;

          const matchesFilter =
            filter === 'ALL' ||
            (filter === 'SET' &&
              hasCityRate) ||
            (filter === 'MISSING' &&
              !hasCityRate);

          const matchesSearch =
            !search ||
            normalize(row.name).includes(
              search,
            ) ||
            normalize(
              row.category,
            ).includes(search) ||
            normalize(row.unit).includes(
              search,
            );

          return (
            matchesFilter &&
            matchesSearch
          );
        })
        .sort((left, right) =>
          left.name.localeCompare(
            right.name,
            undefined,
            { sensitivity: 'base' },
          ),
        );
    }, [rows, query, filter]);

  const cityRateCount =
    rows.filter(
      (row) =>
        Number(row.cityRate) > 0,
    ).length;

  const changedCount =
    rows.filter((row) => {
      const before =
        initialRates.get(row.id) || 0;
      const after =
        Number(row.cityRate) || 0;

      return (
        Math.abs(before - after) >
        0.000001
      );
    }).length;

  function updateRow(
    id: string,
    patch: Partial<CityRateRow>,
  ) {
    setRows((current) =>
      current.map((row) =>
        row.id === id
          ? { ...row, ...patch }
          : row,
      ),
    );
    setMessage('');
    setError('');
  }

  async function saveRates() {
    if (!loadedCity) {
      setError(
        'Load a city before saving.',
      );
      return;
    }

    const submitted =
      rows
        .filter(
          (row) =>
            Number(row.cityRate) > 0,
        )
        .map((row) => ({
          ingredientId: row.id,
          rate:
            Number(row.cityRate),
          source: row.source,
          effectiveDate:
            row.effectiveDate,
        }));

    const resetIngredientIds =
      rows
        .filter(
          (row) =>
            initialRates.has(row.id) &&
            !(Number(row.cityRate) > 0),
        )
        .map((row) => row.id);

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
            body: JSON.stringify({
              city: loadedCity,
              rates: submitted,
              resetIngredientIds,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Could not save city rates.',
        );
      }

      setMessage(
        `${loadedCity}: ${submitted.length} city rate${submitted.length === 1 ? '' : 's'} saved.`,
      );

      await loadCity(
        loadedCity,
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Could not save city rates.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function copyFromCity() {
    if (!loadedCity) return;

    const from =
      window.prompt(
        `Copy ingredient rates into ${loadedCity} from which city?`,
        knownCities.find(
          (item) =>
            normalize(item.city) !==
            normalize(loadedCity),
        )?.city || '',
      );

    if (from === null) return;

    const cleanFrom =
      from.trim();

    if (!cleanFrom) {
      setError(
        'Enter a source city to copy.',
      );
      return;
    }

    if (
      normalize(cleanFrom) ===
      normalize(loadedCity)
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
            body: JSON.stringify({
              city: loadedCity,
              copyFromCity:
                cleanFrom,
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

      setMessage(
        `Copied available ingredient rates from ${cleanFrom} to ${loadedCity}. Review and edit any differences.`,
      );

      await loadCity(
        loadedCity,
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

  function applyBulkPaste() {
    const lines =
      bulkText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    if (!lines.length) {
      setError(
        'Paste ingredient and rate rows first.',
      );
      return;
    }

    const byName =
      new Map<
        string,
        CityRateRow[]
      >();

    rows.forEach((row) => {
      const key =
        normalize(row.name);
      byName.set(
        key,
        [
          ...(byName.get(key) || []),
          row,
        ],
      );
    });

    let updated = 0;
    let skipped = 0;

    const patches =
      new Map<
        string,
        Partial<CityRateRow>
      >();

    lines.forEach((line) => {
      const parts =
        line
          .split(/\t|\||,/)
          .map((part) =>
            part.trim(),
          );

      const name = parts[0];
      const rate =
        Number(
          String(parts[1] || '')
            .replace(/₹/g, '')
            .replace(/,/g, ''),
        );

      if (
        !name ||
        !Number.isFinite(rate) ||
        !(rate > 0)
      ) {
        skipped += 1;
        return;
      }

      const candidates =
        byName.get(
          normalize(name),
        ) || [];

      if (!candidates.length) {
        skipped += 1;
        return;
      }

      const unitHint =
        normalize(parts[2]);
      const target =
        unitHint
          ? candidates.find(
              (row) =>
                normalize(row.unit) ===
                unitHint,
            ) || candidates[0]
          : candidates[0];

      patches.set(target.id, {
        cityRate: rate,
        source:
          parts[3] ||
          target.source,
        effectiveDate:
          parts[4] ||
          target.effectiveDate,
      });

      updated += 1;
    });

    setRows((current) =>
      current.map((row) => {
        const patch =
          patches.get(row.id);
        return patch
          ? { ...row, ...patch }
          : row;
      }),
    );

    setMessage(
      `Bulk paste applied to ${updated} ingredient${updated === 1 ? '' : 's'}${skipped ? ` · ${skipped} skipped` : ''}. Save City Rates to publish.`,
    );
    setError('');
  }

  return (
    <AppShell
      title="Ingredient City Rates"
      subtitle="Maintain local market rates without changing the global Ingredient Master"
    >
      <section className="content-grid">
        <div className="glass-card">
          <div className="final-costing-section-heading">
            <div>
              <span className="section-kicker">
                Ingredients · City Rates
              </span>
              <h2>
                City-wise ingredient market rates
              </h2>
              <p>
                Event costing uses My Rate → Event City Rate → Global Master Rate.
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              <button
                className="secondary-button"
                type="button"
                onClick={copyFromCity}
                disabled={
                  saving ||
                  !loadedCity
                }
              >
                Copy From City
              </button>
              <button
                className="primary-button"
                type="button"
                onClick={saveRates}
                disabled={
                  saving ||
                  loading
                }
              >
                {saving
                  ? 'Saving…'
                  : `Save City Rates${changedCount ? ` (${changedCount})` : ''}`}
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'minmax(220px, 1fr) auto minmax(220px, 1fr)',
              gap: 10,
              alignItems: 'end',
              marginTop: 16,
            }}
          >
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
                    void loadCity();
                  }
                }}
              />
              <datalist id="ingredient-city-options">
                {knownCities.map(
                  (item) => (
                    <option
                      value={item.city}
                      key={item.cityKey}
                    />
                  ),
                )}
              </datalist>
            </label>

            <button
              className="secondary-button"
              type="button"
              onClick={() =>
                void loadCity()
              }
              disabled={loading}
            >
              {loading
                ? 'Loading…'
                : 'Load City'}
            </button>

            <label className="field">
              <span>
                Search Ingredient
              </span>
              <input
                className="input"
                value={query}
                placeholder="Tomato, Paneer, Oil…"
                onChange={(event) =>
                  setQuery(
                    event.target.value,
                  )
                }
              />
            </label>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 8,
              marginTop: 12,
              flexWrap: 'wrap',
            }}
          >
            {(
              [
                ['ALL', 'All'],
                ['SET', 'City Rate Set'],
                [
                  'MISSING',
                  'Using Global',
                ],
              ] as const
            ).map(
              ([value, label]) => (
                <button
                  key={value}
                  className={
                    filter === value
                      ? 'primary-button'
                      : 'ghost-button'
                  }
                  type="button"
                  onClick={() =>
                    setFilter(value)
                  }
                >
                  {label}
                </button>
              ),
            )}

            <span
              className="muted"
              style={{
                alignSelf:
                  'center',
                marginLeft: 'auto',
              }}
            >
              {loadedCity ||
                'City'}{' '}
              · {cityRateCount} local
              rates ·{' '}
              {rows.length -
                cityRateCount}{' '}
              global fallbacks
            </span>
          </div>

          {message ? (
            <div
              className="admin-message"
              style={{
                marginTop: 12,
              }}
            >
              {message}
            </div>
          ) : null}

          {error ? (
            <div
              className="admin-message error"
              style={{
                marginTop: 12,
              }}
            >
              {error}
            </div>
          ) : null}
        </div>

        <div className="glass-card">
          <div className="final-costing-section-heading">
            <div>
              <span className="section-kicker">
                Fast update
              </span>
              <h2>
                Paste rates from Excel / WhatsApp
              </h2>
              <p>
                Format: Ingredient | Rate | Unit (optional) | Source (optional) | Effective Date (optional)
              </p>
            </div>

            <button
              className="secondary-button"
              type="button"
              onClick={applyBulkPaste}
            >
              Apply Paste
            </button>
          </div>

          <textarea
            className="input"
            style={{
              minHeight: 100,
              marginTop: 12,
              resize: 'vertical',
            }}
            value={bulkText}
            onChange={(event) =>
              setBulkText(
                event.target.value,
              )
            }
            placeholder={'Tomato | 38 | kg | Local market | 2026-09-26\nPaneer | 330 | kg | Vendor quote | 2026-09-26'}
          />
        </div>

        <div className="glass-card">
          <div className="table-wrap">
            <table className="disposable-table">
              <thead>
                <tr>
                  <th>
                    Ingredient
                  </th>
                  <th>
                    Unit
                  </th>
                  <th>
                    Global Rate
                  </th>
                  <th>
                    {loadedCity ||
                      'City'}{' '}
                    Rate
                  </th>
                  <th>
                    Source / Vendor
                  </th>
                  <th>
                    Effective Date
                  </th>
                  <th>
                    Active Rate
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map(
                  (row) => {
                    const hasCityRate =
                      Number(
                        row.cityRate,
                      ) > 0;

                    return (
                      <tr
                        key={row.id}
                        className={
                          hasCityRate
                            ? 'is-active'
                            : ''
                        }
                      >
                        <td>
                          <strong>
                            {row.name}
                          </strong>
                          <small
                            className="muted"
                            style={{
                              display:
                                'block',
                            }}
                          >
                            {
                              row.category
                            }
                          </small>
                        </td>
                        <td>
                          {row.unit}
                        </td>
                        <td>
                          {money(
                            row.globalRate,
                          )}
                        </td>
                        <td>
                          <input
                            className="input"
                            style={{
                              minWidth: 110,
                            }}
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              row.cityRate ??
                              ''
                            }
                            placeholder={
                              String(
                                row.globalRate,
                              )
                            }
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
                            className="input"
                            value={
                              row.source ||
                              ''
                            }
                            placeholder="Vendor / market"
                            onChange={(
                              event,
                            ) =>
                              updateRow(
                                row.id,
                                {
                                  source:
                                    event
                                      .target
                                      .value,
                                },
                              )
                            }
                          />
                        </td>
                        <td>
                          <input
                            className="input"
                            type="date"
                            value={
                              row.effectiveDate ||
                              ''
                            }
                            onChange={(
                              event,
                            ) =>
                              updateRow(
                                row.id,
                                {
                                  effectiveDate:
                                    event
                                      .target
                                      .value,
                                },
                              )
                            }
                          />
                        </td>
                        <td>
                          <strong>
                            {hasCityRate
                              ? money(
                                  row.cityRate,
                                )
                              : money(
                                  row.globalRate,
                                )}
                          </strong>
                          <small
                            className="muted"
                            style={{
                              display:
                                'block',
                            }}
                          >
                            {hasCityRate
                              ? `${loadedCity} city rate`
                              : 'Global fallback'}
                          </small>
                        </td>
                      </tr>
                    );
                  },
                )}

                {!loading &&
                !filteredRows.length ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="muted"
                    >
                      No ingredients match this filter.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <style>{`
          @media(max-width:900px){
            .glass-card > div[style*="grid-template-columns"]{grid-template-columns:1fr!important}
          }
        `}</style>
      </section>
    </AppShell>
  );
}
