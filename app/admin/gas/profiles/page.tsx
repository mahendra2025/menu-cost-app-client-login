'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import AppShell from '../../../components/AppShell';

import {
  DEFAULT_COOKING_GAS_KG_PER_100,
  DEFAULT_GAS_CATEGORY_RATES,
  DEFAULT_LPG_SETTING,
  categoryGasKgPer100,
  isNoGasCategory,
  lpgRatePerKg,
  type GasCategoryRateValue,
  type LpgCostSetting,
} from '../../../../lib/gasCost';

type GasProfileRow = {
  id: string;
  name: string;
  category: string;
  gasKgPer100: number | null;
  gasBurnerKgPerHour: number | null;
  gasCookingMinutes: number | null;
  gasBurnerCount: number | null;
  gasBatchPax: number | null;
};

type GasProfileSummary = {
  total: number;
  real: number;
  measured: number;
  fallback: number;
};

type GasProfileStatus =
  | 'ALL'
  | 'REAL'
  | 'MEASURED'
  | 'FALLBACK';

function inputNumber(
  value: string,
) {
  if (!value.trim()) {
    return null;
  }

  const number =
    Number(value);

  return Number.isFinite(
    number,
  )
    ? Math.max(
        0,
        number,
      )
    : null;
}

function hasRealProfile(
  row: GasProfileRow,
) {
  return (
    Number(row.gasBurnerKgPerHour) > 0 &&
    Number(row.gasCookingMinutes) > 0 &&
    Number(row.gasBurnerCount) > 0 &&
    Number(row.gasBatchPax) > 0
  );
}

function statusLabel(
  row: GasProfileRow,
  rates: GasCategoryRateValue[],
) {
  if (hasRealProfile(row)) {
    return 'REAL PROFILE';
  }

  if (
    row.gasKgPer100 !==
      null
  ) {
    return 'MEASURED';
  }

  if (
    isNoGasCategory(
      row.category,
    )
  ) {
    return 'NO GAS';
  }

  return (
    categoryGasKgPer100(
      row.category,
      rates,
    ) > 0
      ? 'CATEGORY'
      : 'SAFE DEFAULT'
  );
}

function gasKgFor100(
  row: GasProfileRow,
  rates: GasCategoryRateValue[],
) {
  if (
    hasRealProfile(
      row,
    )
  ) {
    const batches =
      Math.max(
        1,
        Math.ceil(
          100 /
          Math.max(
            1,
            Number(
              row.gasBatchPax,
            ),
          ),
        ),
      );

    return (
      Number(
        row.gasBurnerKgPerHour,
      ) *
      Number(
        row.gasBurnerCount,
      ) *
      (
        Number(
          row.gasCookingMinutes,
        ) /
        60
      ) *
      batches
    );
  }

  if (
    row.gasKgPer100 !==
      null
  ) {
    return Math.max(
      0,
      Number(
        row.gasKgPer100,
      ) || 0,
    );
  }

  if (
    isNoGasCategory(
      row.category,
    )
  ) {
    return 0;
  }

  const categoryGas =
    categoryGasKgPer100(
      row.category,
      rates,
    );

  return categoryGas > 0
    ? categoryGas
    : DEFAULT_COOKING_GAS_KG_PER_100;
}

export default function AdminGasProfilesPage() {
  const [
    rows,
    setRows,
  ] =
    useState<GasProfileRow[]>(
      [],
    );

  const [
    summary,
    setSummary,
  ] =
    useState<GasProfileSummary>({
      total: 0,
      real: 0,
      measured: 0,
      fallback: 0,
    });

  const [
    categories,
    setCategories,
  ] =
    useState<string[]>(
      [],
    );

  const [
    category,
    setCategory,
  ] =
    useState('ALL');

  const [
    status,
    setStatus,
  ] =
    useState<GasProfileStatus>(
      'ALL',
    );

  const [
    query,
    setQuery,
  ] =
    useState('');

  const [
    debouncedQuery,
    setDebouncedQuery,
  ] =
    useState('');

  const [
    page,
    setPage,
  ] =
    useState(1);

  const [
    pageCount,
    setPageCount,
  ] =
    useState(1);

  const [
    totalResults,
    setTotalResults,
  ] =
    useState(0);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    savingId,
    setSavingId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    dirtyIds,
    setDirtyIds,
  ] =
    useState<Set<string>>(
      () =>
        new Set(),
    );

  const [
    message,
    setMessage,
  ] =
    useState('');

  const [
    error,
    setError,
  ] =
    useState('');

  const [
    setting,
    setSetting,
  ] =
    useState<LpgCostSetting>({
      ...DEFAULT_LPG_SETTING,
    });

  const [
    categoryRates,
    setCategoryRates,
  ] =
    useState<GasCategoryRateValue[]>(
      () =>
        DEFAULT_GAS_CATEGORY_RATES.map(
          (rate) => ({
            ...rate,
          }),
        ),
    );

  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          setDebouncedQuery(
            query.trim(),
          );
          setPage(1);
        },
        250,
      );

    return () =>
      window.clearTimeout(
        timer,
      );
  }, [query]);

  useEffect(() => {
    void load();
  }, [
    debouncedQuery,
    category,
    status,
    page,
  ]);

  async function load() {
    setLoading(true);
    setError('');

    try {
      const params =
        new URLSearchParams({
          page:
            String(page),
          limit:
            '36',
          status,
        });

      if (
        debouncedQuery
      ) {
        params.set(
          'q',
          debouncedQuery,
        );
      }

      if (
        category !==
        'ALL'
      ) {
        params.set(
          'category',
          category,
        );
      }

      const [
        profilesResponse,
        masterResponse,
      ] =
        await Promise.all([
          fetch(
            `/api/admin/gas-profiles?${params.toString()}`,
            {
              cache:
                'no-store',
            },
          ),
          fetch(
            '/api/admin/gas-cost',
            {
              cache:
                'no-store',
            },
          ),
        ]);

      const profilesData =
        await profilesResponse
          .json();

      if (
        !profilesResponse.ok
      ) {
        throw new Error(
          profilesData.error ||
          'Could not load gas profiles.',
        );
      }

      setRows(
        Array.isArray(
          profilesData.items,
        )
          ? profilesData.items
          : [],
      );

      setSummary(
        profilesData.summary ||
        {
          total: 0,
          real: 0,
          measured: 0,
          fallback: 0,
        },
      );

      setCategories(
        Array.isArray(
          profilesData.categories,
        )
          ? profilesData.categories
          : [],
      );

      setPageCount(
        Math.max(
          1,
          Number(
            profilesData.pagination
              ?.pageCount,
          ) || 1,
        ),
      );

      setTotalResults(
        Math.max(
          0,
          Number(
            profilesData.pagination
              ?.total,
          ) || 0,
        ),
      );

      setDirtyIds(
        new Set(),
      );

      if (
        masterResponse.ok
      ) {
        const master =
          await masterResponse
            .json();

        if (
          master.setting
        ) {
          setSetting({
            cylinderPrice:
              Number(
                master.setting
                  .cylinderPrice,
              ) ||
              DEFAULT_LPG_SETTING
                .cylinderPrice,
            cylinderWeightKg:
              Number(
                master.setting
                  .cylinderWeightKg,
              ) ||
              DEFAULT_LPG_SETTING
                .cylinderWeightKg,
          });
        }

        if (
          Array.isArray(
            master.categoryRates,
          )
        ) {
          setCategoryRates(
            master.categoryRates,
          );
        }
      }
    } catch (loadError) {
      setError(
        loadError instanceof
        Error
          ? loadError.message
          : 'Could not load gas profiles.',
      );
    } finally {
      setLoading(
        false,
      );
    }
  }

  const ratePerKg =
    useMemo(
      () =>
        lpgRatePerKg(
          setting,
        ),
      [setting],
    );

  function updateRow(
    id: string,
    patch:
      Partial<GasProfileRow>,
  ) {
    setMessage('');
    setError('');

    setRows(
      (current) =>
        current.map(
          (row) =>
            row.id === id
              ? {
                  ...row,
                  ...patch,
                }
              : row,
        ),
    );

    setDirtyIds(
      (current) => {
        const next =
          new Set(
            current,
          );

        next.add(id);
        return next;
      },
    );
  }

  async function saveRow(
    row: GasProfileRow,
  ) {
    const realValues = [
      row.gasBurnerKgPerHour,
      row.gasCookingMinutes,
      row.gasBurnerCount,
      row.gasBatchPax,
    ];

    const hasAnyReal =
      realValues.some(
        (value) =>
          value !== null,
      );

    const completeReal =
      realValues.every(
        (value) =>
          value !== null &&
          Number(value) > 0,
      );

    if (
      hasAnyReal &&
      !completeReal
    ) {
      setError(
        `${row.name}: fill all 4 Real Profile fields, or clear all 4.`,
      );

      return;
    }

    setSavingId(
      row.id,
    );
    setMessage('');
    setError('');

    try {
      const response =
        await fetch(
          '/api/admin/gas-profiles',
          {
            method:
              'PATCH',
            headers: {
              'Content-Type':
                'application/json',
            },
            body:
              JSON.stringify({
                id:
                  row.id,
                gasKgPer100:
                  row.gasKgPer100,
                gasBurnerKgPerHour:
                  row.gasBurnerKgPerHour,
                gasCookingMinutes:
                  row.gasCookingMinutes,
                gasBurnerCount:
                  row.gasBurnerCount,
                gasBatchPax:
                  row.gasBatchPax,
              }),
          },
        );

      const data =
        await response
          .json()
          .catch(
            () => ({}),
          );

      if (
        !response.ok
      ) {
        throw new Error(
          data.error ||
          'Could not save gas profile.',
        );
      }

      if (
        data.item
      ) {
        setRows(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                  row.id
                  ? data.item
                  : item,
            ),
        );
      }

      setDirtyIds(
        (current) => {
          const next =
            new Set(
              current,
            );

          next.delete(
            row.id,
          );

          return next;
        },
      );

      setMessage(
        `${row.name} gas profile saved.`,
      );
    } catch (saveError) {
      setError(
        saveError instanceof
        Error
          ? saveError.message
          : 'Could not save gas profile.',
      );
    } finally {
      setSavingId(
        null,
      );
    }
  }

  function clearRealProfile(
    row: GasProfileRow,
  ) {
    updateRow(
      row.id,
      {
        gasBurnerKgPerHour:
          null,
        gasCookingMinutes:
          null,
        gasBurnerCount:
          null,
        gasBatchPax:
          null,
      },
    );
  }

  function setDalFryExample(
    row: GasProfileRow,
  ) {
    updateRow(
      row.id,
      {
        gasBurnerKgPerHour:
          0.5,
        gasCookingMinutes:
          60,
        gasBurnerCount:
          1,
        gasBatchPax:
          100,
      },
    );
  }

  return (
    <AppShell
      title="Gas Profiles"
      subtitle="Set real burner, cooking time and batch data for each dish"
    >
      <section className="content-grid gas-profile-page">
        <div className="final-costing-overview is-ready">
          <div>
            <span className="page-eyebrow">
              Dish Gas Profile Master
            </span>
            <h2>
              Every dish, separate gas cost
            </h2>
            <p>
              Search a dish such as Dal Fry and save only its LPG profile. Real profiles override measured and category fallback rates automatically.
            </p>
          </div>

          <div className="final-costing-overview-total">
            <span>
              LPG rate
            </span>
            <b>
              ₹{ratePerKg.toFixed(2)} / kg
            </b>
            <small>
              ₹{setting.cylinderPrice.toLocaleString('en-IN')} ÷ {setting.cylinderWeightKg} kg
            </small>
          </div>
        </div>

        <div className="stat-grid gas-profile-stats">
          <div className="stat-card">
            <small>Total dishes</small>
            <strong>{summary.total.toLocaleString('en-IN')}</strong>
            <span>Gas costing coverage</span>
          </div>

          <div className="stat-card">
            <small>Real profiles</small>
            <strong>{summary.real.toLocaleString('en-IN')}</strong>
            <span>Burner + time + batch</span>
          </div>

          <div className="stat-card">
            <small>Measured</small>
            <strong>{summary.measured.toLocaleString('en-IN')}</strong>
            <span>Dish kg / 100</span>
          </div>

          <div className="stat-card">
            <small>Fallback</small>
            <strong>{summary.fallback.toLocaleString('en-IN')}</strong>
            <span>Category or safe default</span>
          </div>
        </div>

        <div className="glass-card gas-profile-filter-card">
          <div className="final-costing-section-heading">
            <div>
              <span className="section-kicker">
                Find dish
              </span>
              <h2>
                Gas profile editor
              </h2>
              <p>
                Only gas fields are loaded here, so this page stays fast even with a large dish catalog.
              </p>
            </div>

            <span className="badge">
              {totalResults.toLocaleString('en-IN')} results
            </span>
          </div>

          <div className="gas-profile-filters">
            <label className="field">
              <span>Search dish</span>
              <input
                className="input"
                value={query}
                onChange={(event) =>
                  setQuery(
                    event.target.value,
                  )
                }
                placeholder="Dal Fry, Paneer, Rice…"
              />
            </label>

            <label className="field">
              <span>Category</span>
              <select
                className="select"
                value={category}
                onChange={(event) => {
                  setCategory(
                    event.target.value,
                  );
                  setPage(1);
                }}
              >
                <option value="ALL">
                  All categories
                </option>
                {categories.map(
                  (item) => (
                    <option
                      value={item}
                      key={item}
                    >
                      {item}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="field">
              <span>Profile status</span>
              <select
                className="select"
                value={status}
                onChange={(event) => {
                  setStatus(
                    event.target.value as
                      GasProfileStatus,
                  );
                  setPage(1);
                }}
              >
                <option value="ALL">
                  All
                </option>
                <option value="REAL">
                  Real profile
                </option>
                <option value="MEASURED">
                  Measured kg / 100
                </option>
                <option value="FALLBACK">
                  Fallback only
                </option>
              </select>
            </label>
          </div>
        </div>

        {message ? (
          <div className="admin-message success">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="admin-message error">
            {error}
          </div>
        ) : null}

        <div className="gas-profile-list">
          {loading ? (
            <div className="loader-card">
              Loading gas profiles…
            </div>
          ) : rows.length ? (
            rows.map(
              (row) => {
                const label =
                  statusLabel(
                    row,
                    categoryRates,
                  );

                const kg100 =
                  gasKgFor100(
                    row,
                    categoryRates,
                  );

                const cost100 =
                  kg100 *
                  ratePerKg;

                const dirty =
                  dirtyIds.has(
                    row.id,
                  );

                return (
                  <article
                    className="glass-card gas-profile-card"
                    key={row.id}
                  >
                    <div className="gas-profile-card-head">
                      <div>
                        <span className="section-kicker">
                          {row.category}
                        </span>
                        <h3>
                          {row.name}
                        </h3>
                        <small>
                          {label} · {kg100.toFixed(2)} kg / 100 · ₹{cost100.toFixed(2)} / 100 guests
                        </small>
                      </div>

                      <span className={
                        `gas-profile-status status-${label
                          .toLowerCase()
                          .replace(/[^a-z]+/g, '-')}`
                      }>
                        {label}
                      </span>
                    </div>

                    <div className="gas-profile-fields">
                      <label>
                        <span>Measured kg / 100</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            row.gasKgPer100 ??
                            ''
                          }
                          onChange={(event) =>
                            updateRow(
                              row.id,
                              {
                                gasKgPer100:
                                  inputNumber(
                                    event.target.value,
                                  ),
                              },
                            )
                          }
                          placeholder="Optional"
                        />
                      </label>

                      <label>
                        <span>Burner kg / hour</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            row.gasBurnerKgPerHour ??
                            ''
                          }
                          onChange={(event) =>
                            updateRow(
                              row.id,
                              {
                                gasBurnerKgPerHour:
                                  inputNumber(
                                    event.target.value,
                                  ),
                              },
                            )
                          }
                          placeholder="0.50"
                        />
                      </label>

                      <label>
                        <span>Cooking min / batch</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={
                            row.gasCookingMinutes ??
                            ''
                          }
                          onChange={(event) =>
                            updateRow(
                              row.id,
                              {
                                gasCookingMinutes:
                                  inputNumber(
                                    event.target.value,
                                  ),
                              },
                            )
                          }
                          placeholder="60"
                        />
                      </label>

                      <label>
                        <span>Burners used</span>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={
                            row.gasBurnerCount ??
                            ''
                          }
                          onChange={(event) =>
                            updateRow(
                              row.id,
                              {
                                gasBurnerCount:
                                  inputNumber(
                                    event.target.value,
                                  ),
                              },
                            )
                          }
                          placeholder="1"
                        />
                      </label>

                      <label>
                        <span>Batch capacity (pax)</span>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={
                            row.gasBatchPax ??
                            ''
                          }
                          onChange={(event) =>
                            updateRow(
                              row.id,
                              {
                                gasBatchPax:
                                  inputNumber(
                                    event.target.value,
                                  ),
                              },
                            )
                          }
                          placeholder="100"
                        />
                      </label>
                    </div>

                    <div className="action-row gas-profile-actions">
                      <button
                        className="primary-button"
                        type="button"
                        disabled={
                          !dirty ||
                          savingId ===
                            row.id
                        }
                        onClick={() =>
                          void saveRow(
                            row,
                          )
                        }
                      >
                        {savingId ===
                        row.id
                          ? 'Saving…'
                          : dirty
                            ? 'Save Gas Profile'
                            : 'Saved'}
                      </button>

                      <button
                        className="ghost-button"
                        type="button"
                        onClick={() =>
                          clearRealProfile(
                            row,
                          )
                        }
                      >
                        Clear Real Profile
                      </button>

                      {row.name
                        .trim()
                        .toLocaleLowerCase(
                          'en-IN',
                        ) ===
                      'dal fry' ? (
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() =>
                            setDalFryExample(
                              row,
                            )
                          }
                        >
                          Use Dal Fry Example
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              },
            )
          ) : (
            <div className="glass-card">
              No dishes match these filters.
            </div>
          )}
        </div>

        <div className="action-row gas-profile-pagination">
          <button
            className="ghost-button"
            type="button"
            disabled={
              page <= 1 ||
              loading
            }
            onClick={() =>
              setPage(
                (current) =>
                  Math.max(
                    1,
                    current - 1,
                  ),
              )
            }
          >
            Previous
          </button>

          <span>
            Page {page} of {pageCount}
          </span>

          <button
            className="ghost-button"
            type="button"
            disabled={
              page >=
                pageCount ||
              loading
            }
            onClick={() =>
              setPage(
                (current) =>
                  Math.min(
                    pageCount,
                    current + 1,
                  ),
              )
            }
          >
            Next
          </button>
        </div>

        <style jsx>{`
          .gas-profile-stats {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }

          .gas-profile-filter-card {
            display: grid;
            gap: 16px;
          }

          .gas-profile-filters {
            display: grid;
            grid-template-columns:
              minmax(260px, 1.4fr)
              minmax(180px, .8fr)
              minmax(180px, .8fr);
            gap: 12px;
            align-items: end;
          }

          .gas-profile-filters .field {
            margin: 0;
          }

          .gas-profile-list {
            display: grid;
            gap: 12px;
          }

          .gas-profile-card {
            display: grid;
            gap: 14px;
          }

          .gas-profile-card-head {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 16px;
          }

          .gas-profile-card-head h3 {
            margin: 4px 0 3px;
            font-size: 20px;
            letter-spacing: -.025em;
          }

          .gas-profile-card-head small {
            color: var(--muted);
            font-size: 11px;
            font-weight: 700;
          }

          .gas-profile-status {
            flex: 0 0 auto;
            padding: 7px 10px;
            border: 1px solid var(--border);
            border-radius: 999px;
            background: rgba(148, 163, 184, .08);
            font-size: 9px;
            font-weight: 900;
            letter-spacing: .04em;
          }

          .status-real-profile {
            color: #14733a;
            border-color: rgba(45, 164, 78, .24);
            background: rgba(45, 164, 78, .08);
          }

          .status-measured {
            color: #075db7;
            border-color: rgba(0, 122, 255, .22);
            background: rgba(0, 122, 255, .08);
          }

          .status-safe-default {
            color: #9a5a0a;
            border-color: rgba(255, 149, 0, .28);
            background: rgba(255, 149, 0, .09);
          }

          .gas-profile-fields {
            display: grid;
            grid-template-columns: repeat(5, minmax(120px, 1fr));
            gap: 10px;
          }

          .gas-profile-fields label {
            display: grid;
            gap: 6px;
          }

          .gas-profile-fields label > span {
            color: var(--muted);
            font-size: 9px;
            font-weight: 850;
            letter-spacing: .025em;
            text-transform: uppercase;
          }

          .gas-profile-fields input {
            width: 100%;
            min-height: 42px;
            padding: 9px 10px;
            border: 1px solid var(--border);
            border-radius: 10px;
            color: var(--text);
            background: var(--surface);
            font-size: 12px;
            font-weight: 800;
          }

          .gas-profile-fields input:focus {
            outline: none;
            border-color: rgba(0, 122, 255, .52);
            box-shadow: 0 0 0 4px rgba(0, 122, 255, .09);
          }

          .gas-profile-actions {
            margin: 0;
            padding-top: 12px;
            border-top: 1px solid var(--border);
          }

          .gas-profile-pagination {
            justify-content: center;
            align-items: center;
            margin: 4px 0 24px;
          }

          .gas-profile-pagination > span {
            min-width: 120px;
            text-align: center;
            color: var(--muted);
            font-size: 11px;
            font-weight: 800;
          }

          @media (max-width: 1050px) {
            .gas-profile-fields {
              grid-template-columns: repeat(3, minmax(120px, 1fr));
            }
          }

          @media (max-width: 760px) {
            .gas-profile-stats {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .gas-profile-filters {
              grid-template-columns: 1fr;
            }

            .gas-profile-card-head {
              flex-direction: column;
              gap: 9px;
            }

            .gas-profile-fields {
              grid-template-columns: 1fr 1fr;
            }

            .gas-profile-actions {
              display: grid;
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 460px) {
            .gas-profile-fields {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </section>
    </AppShell>
  );
}
