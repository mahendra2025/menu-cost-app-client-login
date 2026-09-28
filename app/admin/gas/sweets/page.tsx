'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import AppShell from '../../../components/AppShell';

import {
  DEFAULT_LPG_SETTING,
  lpgRatePerKg,
  type LpgCostSetting,
} from '../../../../lib/gasCost';

import {
  suggestSweetGas,
} from '../../../../lib/sweetGas';

type SweetRow = {
  id: string;
  name: string;
  category: string;
  gasKgPer100: number | null;
  gasBurnerKgPerHour: number | null;
  gasCookingMinutes: number | null;
  gasBurnerCount: number | null;
  gasBatchPax: number | null;
  gasNoGas: boolean;
};

type Summary = {
  total: number;
  real: number;
  measured: number;
  fallback: number;
  noGas: number;
};

function hasReal(
  row: SweetRow,
) {
  return (
    !row.gasNoGas &&
    Number(row.gasBurnerKgPerHour) > 0 &&
    Number(row.gasCookingMinutes) > 0 &&
    Number(row.gasBurnerCount) > 0 &&
    Number(row.gasBatchPax) > 0
  );
}

function realKgPer100(
  row: SweetRow,
) {
  const batchPax =
    Math.max(
      1,
      Number(
        row.gasBatchPax,
      ) || 1,
    );

  const batches =
    Math.max(
      1,
      Math.ceil(
        100 /
        batchPax,
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

function effectiveKgPer100(
  row: SweetRow,
) {
  if (row.gasNoGas) {
    return 0;
  }

  if (hasReal(row)) {
    return realKgPer100(
      row,
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

  return suggestSweetGas(
    row.name,
  ).kgPer100;
}

function profileLabel(
  row: SweetRow,
) {
  if (row.gasNoGas) {
    return 'NO GAS';
  }

  if (hasReal(row)) {
    return 'REAL PROFILE';
  }

  if (
    row.gasKgPer100 !==
      null
  ) {
    return 'DISH RATE';
  }

  return 'MISSING';
}

function numberOrNull(
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

export default function SweetGasMasterPage() {
  const [
    rows,
    setRows,
  ] =
    useState<SweetRow[]>(
      [],
    );

  const [
    summary,
    setSummary,
  ] =
    useState<Summary>({
      total: 0,
      real: 0,
      measured: 0,
      fallback: 0,
      noGas: 0,
    });

  const [
    query,
    setQuery,
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
    applying,
    setApplying,
  ] =
    useState(false);

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

  useEffect(() => {
    void load();
  }, [page]);

  async function load() {
    setLoading(true);
    setError('');

    try {
      const params =
        new URLSearchParams({
          category:
            'Sweet',
          page:
            String(page),
          limit:
            '100',
          status:
            'ALL',
        });

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

      const data =
        await profilesResponse
          .json();

      if (
        !profilesResponse.ok
      ) {
        throw new Error(
          data.error ||
          'Could not load Sweet gas profiles.',
        );
      }

      setRows(
        Array.isArray(
          data.items,
        )
          ? data.items
          : [],
      );

      setSummary({
        total:
          Number(
            data.summary
              ?.total,
          ) || 0,
        real:
          Number(
            data.summary
              ?.real,
          ) || 0,
        measured:
          Number(
            data.summary
              ?.measured,
          ) || 0,
        fallback:
          Number(
            data.summary
              ?.fallback,
          ) || 0,
        noGas:
          Number(
            data.summary
              ?.noGas,
          ) || 0,
      });

      setPageCount(
        Math.max(
          1,
          Number(
            data.pagination
              ?.pageCount,
          ) || 1,
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
      }
    } catch (loadError) {
      setError(
        loadError instanceof
        Error
          ? loadError.message
          : 'Could not load Sweet gas profiles.',
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

  const visibleRows =
    useMemo(
      () => {
        const search =
          query
            .trim()
            .toLocaleLowerCase(
              'en-IN',
            );

        if (!search) {
          return rows;
        }

        return rows.filter(
          (row) => {
            const suggestion =
              suggestSweetGas(
                row.name,
              );

            return (
              row.name
                .toLocaleLowerCase(
                  'en-IN',
                )
                .includes(
                  search,
                ) ||
              suggestion.group
                .toLocaleLowerCase(
                  'en-IN',
                )
                .includes(
                  search,
                )
            );
          },
        );
      },
      [query, rows],
    );

  function updateRow(
    id: string,
    patch:
      Partial<SweetRow>,
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

  function useSuggestion(
    row: SweetRow,
  ) {
    const suggestion =
      suggestSweetGas(
        row.name,
      );

    updateRow(
      row.id,
      suggestion.noGas
        ? {
            gasNoGas:
              true,
            gasKgPer100:
              0,
            gasBurnerKgPerHour:
              null,
            gasCookingMinutes:
              null,
            gasBurnerCount:
              null,
            gasBatchPax:
              null,
          }
        : {
            gasNoGas:
              false,
            gasKgPer100:
              suggestion
                .kgPer100,
          },
    );
  }

  async function saveRow(
    row: SweetRow,
  ) {
    setSavingId(
      row.id,
    );
    setError('');
    setMessage('');

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
                gasNoGas:
                  row.gasNoGas,
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
          'Could not save Sweet gas cost.',
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
        `${row.name} gas cost saved.`,
      );
    } catch (saveError) {
      setError(
        saveError instanceof
        Error
          ? saveError.message
          : 'Could not save Sweet gas cost.',
      );
    } finally {
      setSavingId(
        null,
      );
    }
  }

  async function fillMissing() {
    setApplying(true);
    setError('');
    setMessage('');

    try {
      const response =
        await fetch(
          '/api/admin/gas-profiles',
          {
            method:
              'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            body:
              JSON.stringify({
                action:
                  'APPLY_SWEET_DEFAULTS',
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
          'Could not fill missing Sweet gas costs.',
        );
      }

      setMessage(
        data.updated > 0
          ? `${data.updated} missing Sweet gas costs filled with starter estimates.`
          : 'Every Sweet already has dish-specific gas data.',
      );

      await load();
    } catch (applyError) {
      setError(
        applyError instanceof
        Error
          ? applyError.message
          : 'Could not fill missing Sweet gas costs.',
      );
    } finally {
      setApplying(
        false,
      );
    }
  }

  const covered =
    summary.real +
    summary.measured +
    summary.noGas;

  const coveragePercent =
    summary.total > 0
      ? Math.round(
          covered /
          summary.total *
          100,
        )
      : 0;

  return (
    <AppShell
      title="Sweet Gas Master"
      subtitle="Give every sweet its own LPG cost"
    >
      <section className="content-grid sweet-gas-page">
        <div className="final-costing-overview is-ready">
          <div>
            <span className="page-eyebrow">
              Sweet LPG Master
            </span>
            <h2>
              Every sweet, separate gas cost
            </h2>
            <p>
              Rabdi, Halwa, Jalebi, Ladoo and cold sweets should not share one generic gas rate. Starter estimates are editable and can later be replaced by real kitchen measurements.
            </p>
          </div>

          <div className="final-costing-overview-total">
            <span>
              Sweet coverage
            </span>
            <b>
              {coveragePercent}%
            </b>
            <small>
              {covered.toLocaleString('en-IN')} of {summary.total.toLocaleString('en-IN')} sweets have dish-specific data
            </small>

            <button
              className="secondary-button"
              type="button"
              disabled={
                applying ||
                summary.fallback ===
                  0
              }
              onClick={() =>
                void fillMissing()
              }
            >
              {applying
                ? 'Filling…'
                : 'Fill Missing Sweet Costs'}
            </button>
          </div>
        </div>

        <div className="stat-grid sweet-gas-stats">
          <div className="stat-card">
            <small>Total sweets</small>
            <strong>
              {summary.total.toLocaleString('en-IN')}
            </strong>
            <span>Sweet category</span>
          </div>

          <div className="stat-card">
            <small>Real profiles</small>
            <strong>
              {summary.real.toLocaleString('en-IN')}
            </strong>
            <span>Burner + time + batch</span>
          </div>

          <div className="stat-card">
            <small>Dish rates</small>
            <strong>
              {summary.measured.toLocaleString('en-IN')}
            </strong>
            <span>kg LPG / 100</span>
          </div>

          <div className="stat-card">
            <small>No Gas sweets</small>
            <strong>
              {summary.noGas.toLocaleString('en-IN')}
            </strong>
            <span>Cold preparation</span>
          </div>
        </div>

        <div className="glass-card sweet-gas-toolbar">
          <label className="field">
            <span>
              Search Sweet
            </span>
            <input
              className="input"
              value={query}
              onChange={(event) =>
                setQuery(
                  event.target.value,
                )
              }
              placeholder="Rabdi, Halwa, Ladoo, Milk Reduction…"
            />
          </label>

          <div className="sweet-gas-rate">
            <span>
              LPG rate
            </span>
            <b>
              ₹{ratePerKg.toFixed(2)} / kg
            </b>
            <small>
              ₹{setting.cylinderPrice.toLocaleString('en-IN')} / {setting.cylinderWeightKg} kg cylinder
            </small>
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

        <div className="sweet-gas-list">
          {loading ? (
            <div className="loader-card">
              Loading Sweet gas costs…
            </div>
          ) : visibleRows.length ? (
            visibleRows.map(
              (row) => {
                const suggestion =
                  suggestSweetGas(
                    row.name,
                  );

                const label =
                  profileLabel(
                    row,
                  );

                const kg100 =
                  effectiveKgPer100(
                    row,
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
                    className="glass-card sweet-gas-card"
                    key={row.id}
                  >
                    <div className="sweet-gas-card-head">
                      <div>
                        <span className="section-kicker">
                          {suggestion.group}
                        </span>
                        <h3>
                          {row.name}
                        </h3>
                        <small>
                          Current: {label}
                        </small>
                      </div>

                      <div className="sweet-gas-current">
                        <span>
                          Current / 100 guests
                        </span>
                        <b>
                          {kg100.toFixed(2)} kg
                        </b>
                        <small>
                          ₹{cost100.toFixed(2)}
                        </small>
                      </div>
                    </div>

                    <div className="sweet-gas-grid">
                      <div className="sweet-gas-suggestion">
                        <span>
                          Suggested starter
                        </span>
                        <b>
                          {suggestion.noGas
                            ? 'No Gas'
                            : `${suggestion.kgPer100.toFixed(2)} kg / 100`}
                        </b>
                        <small>
                          {suggestion.group}
                        </small>

                        {!hasReal(row) ? (
                          <button
                            className="ghost-button"
                            type="button"
                            onClick={() =>
                              useSuggestion(
                                row,
                              )
                            }
                          >
                            Use Suggestion
                          </button>
                        ) : (
                          <small>
                            Real profile already has priority.
                          </small>
                        )}
                      </div>

                      <label className="sweet-gas-field">
                        <span>
                          Dish LPG kg / 100
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          disabled={
                            row.gasNoGas ||
                            hasReal(row)
                          }
                          value={
                            row.gasKgPer100 ??
                            ''
                          }
                          onChange={(event) =>
                            updateRow(
                              row.id,
                              {
                                gasKgPer100:
                                  numberOrNull(
                                    event.target.value,
                                  ),
                                gasNoGas:
                                  false,
                              },
                            )
                          }
                          placeholder={
                            suggestion
                              .kgPer100
                              .toFixed(2)
                          }
                        />
                        <small>
                          Real measured value replaces starter estimate.
                        </small>
                      </label>

                      <label className="sweet-no-gas-toggle">
                        <input
                          type="checkbox"
                          checked={
                            row.gasNoGas
                          }
                          disabled={
                            hasReal(row)
                          }
                          onChange={(event) =>
                            updateRow(
                              row.id,
                              event.target
                                .checked
                                ? {
                                    gasNoGas:
                                      true,
                                    gasKgPer100:
                                      0,
                                    gasBurnerKgPerHour:
                                      null,
                                    gasCookingMinutes:
                                      null,
                                    gasBurnerCount:
                                      null,
                                    gasBatchPax:
                                      null,
                                  }
                                : {
                                    gasNoGas:
                                      false,
                                    gasKgPer100:
                                      suggestion
                                        .noGas
                                        ? null
                                        : suggestion
                                            .kgPer100,
                                  },
                            )
                          }
                        />
                        <span>
                          <b>No Gas Sweet</b>
                          <small>
                            For cold sweets such as Shrikhand.
                          </small>
                        </span>
                      </label>
                    </div>

                    {hasReal(row) ? (
                      <div className="sweet-real-profile">
                        <span>
                          Real cooking profile
                        </span>
                        <b>
                          {row.gasBurnerCount} burner × {Number(row.gasBurnerKgPerHour).toFixed(2)} kg/h × {Number(row.gasCookingMinutes).toFixed(0)} min · {row.gasBatchPax} pax/batch
                        </b>
                        <small>
                          Real profile remains the highest-priority gas calculation.
                        </small>
                      </div>
                    ) : null}

                    <div className="action-row sweet-gas-actions">
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
                            ? 'Save Sweet Gas Cost'
                            : 'Saved'}
                      </button>
                    </div>
                  </article>
                );
              },
            )
          ) : (
            <div className="glass-card">
              No Sweet dishes found.
            </div>
          )}
        </div>

        <div className="action-row sweet-gas-pagination">
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
          .sweet-gas-stats {
            grid-template-columns:
              repeat(
                4,
                minmax(0, 1fr)
              );
          }

          .sweet-gas-toolbar {
            display: grid;
            grid-template-columns:
              minmax(280px, 1fr)
              auto;
            gap: 18px;
            align-items: end;
          }

          .sweet-gas-toolbar .field {
            margin: 0;
          }

          .sweet-gas-rate {
            display: grid;
            gap: 2px;
            min-width: 170px;
            text-align: right;
          }

          .sweet-gas-rate span,
          .sweet-gas-rate small {
            color: var(--muted);
            font-size: 10px;
          }

          .sweet-gas-rate b {
            font-size: 20px;
          }

          .sweet-gas-list {
            display: grid;
            gap: 12px;
          }

          .sweet-gas-card {
            display: grid;
            gap: 14px;
          }

          .sweet-gas-card-head {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 18px;
          }

          .sweet-gas-card-head h3 {
            margin: 4px 0 3px;
            font-size: 21px;
            letter-spacing: -.03em;
          }

          .sweet-gas-card-head small {
            color: var(--muted);
            font-size: 10px;
          }

          .sweet-gas-current {
            display: grid;
            gap: 2px;
            min-width: 150px;
            text-align: right;
          }

          .sweet-gas-current span,
          .sweet-gas-current small {
            color: var(--muted);
            font-size: 9px;
            font-weight: 750;
          }

          .sweet-gas-current b {
            font-size: 18px;
          }

          .sweet-gas-grid {
            display: grid;
            grid-template-columns:
              minmax(190px, .8fr)
              minmax(220px, 1fr)
              minmax(210px, .9fr);
            gap: 10px;
          }

          .sweet-gas-suggestion,
          .sweet-gas-field,
          .sweet-no-gas-toggle {
            min-width: 0;
            padding: 12px;
            border: 1px solid var(--border);
            border-radius: 12px;
            background: rgba(148,163,184,.04);
          }

          .sweet-gas-suggestion {
            display: grid;
            gap: 5px;
          }

          .sweet-gas-suggestion > span,
          .sweet-gas-field > span {
            color: var(--muted);
            font-size: 9px;
            font-weight: 850;
            text-transform: uppercase;
          }

          .sweet-gas-suggestion small,
          .sweet-gas-field small,
          .sweet-no-gas-toggle small {
            color: var(--muted);
            font-size: 9px;
            line-height: 1.4;
          }

          .sweet-gas-suggestion button {
            width: fit-content;
            min-height: 34px;
            margin-top: 4px;
            padding: 7px 10px;
            font-size: 10px;
          }

          .sweet-gas-field {
            display: grid;
            gap: 6px;
          }

          .sweet-gas-field input {
            width: 100%;
            min-height: 42px;
            padding: 9px 10px;
            border: 1px solid var(--border);
            border-radius: 10px;
            color: var(--text);
            background: var(--surface);
            font-size: 13px;
            font-weight: 850;
          }

          .sweet-no-gas-toggle {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .sweet-no-gas-toggle input {
            width: 19px;
            height: 19px;
            flex: 0 0 auto;
          }

          .sweet-no-gas-toggle span {
            display: grid;
            gap: 3px;
          }

          .sweet-real-profile {
            display: grid;
            gap: 3px;
            padding: 11px 12px;
            border: 1px solid rgba(52,199,89,.2);
            border-radius: 11px;
            background: rgba(52,199,89,.06);
          }

          .sweet-real-profile span,
          .sweet-real-profile small {
            color: var(--muted);
            font-size: 9px;
          }

          .sweet-real-profile b {
            font-size: 11px;
          }

          .sweet-gas-actions {
            margin: 0;
            padding-top: 12px;
            border-top: 1px solid var(--border);
          }

          .sweet-gas-pagination {
            justify-content: center;
            align-items: center;
            margin-bottom: 24px;
          }

          .sweet-gas-pagination span {
            min-width: 120px;
            text-align: center;
            color: var(--muted);
            font-size: 11px;
            font-weight: 800;
          }

          @media (max-width: 900px) {
            .sweet-gas-grid {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 760px) {
            .sweet-gas-stats {
              grid-template-columns:
                repeat(
                  2,
                  minmax(0, 1fr)
                );
            }

            .sweet-gas-toolbar {
              grid-template-columns: 1fr;
            }

            .sweet-gas-rate {
              text-align: left;
            }

            .sweet-gas-card-head {
              flex-direction: column;
            }

            .sweet-gas-current {
              text-align: left;
            }
          }
        `}</style>
      </section>
    </AppShell>
  );
}
