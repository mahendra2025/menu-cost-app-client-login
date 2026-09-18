'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import AppShell from '../../../components/AppShell';
import type {
  IngredientRateHealthItem,
  IngredientRateHealthStatus,
  IngredientRateHealthSummary,
} from '../../../../lib/ingredientRateHealth';

type HealthResponse = {
  summary: IngredientRateHealthSummary;
  items: IngredientRateHealthItem[];
  categories: string[];
  thresholds: {
    staleAfterDays: number;
    recentWithinDays: number;
  };
  catalogUpdatedAt: string | null;
};

type HealthFilter =
  | 'ALL'
  | IngredientRateHealthStatus
  | 'LINKED';

type HealthSort =
  | 'PRIORITY'
  | 'MOST_USED'
  | 'OLDEST'
  | 'NAME';

const EMPTY_SUMMARY: IngredientRateHealthSummary = {
  total: 0,
  ready: 0,
  missingRate: 0,
  stale: 0,
  recent: 0,
  healthy: 0,
  linked: 0,
  rateCoveragePercent: 0,
  freshCoveragePercent: 0,
};

function statusLabel(status: IngredientRateHealthStatus) {
  if (status === 'MISSING_RATE') return 'Missing Rate';
  if (status === 'STALE') return 'Stale';
  if (status === 'RECENT') return 'Recently Updated';
  return 'Healthy';
}

function statusStyle(status: IngredientRateHealthStatus) {
  if (status === 'MISSING_RATE') {
    return {
      background: 'rgba(239,68,68,.10)',
      borderColor: 'rgba(239,68,68,.25)',
    };
  }

  if (status === 'STALE') {
    return {
      background: 'rgba(245,158,11,.10)',
      borderColor: 'rgba(245,158,11,.26)',
    };
  }

  if (status === 'RECENT') {
    return {
      background: 'rgba(34,197,94,.10)',
      borderColor: 'rgba(34,197,94,.25)',
    };
  }

  return {
    background: 'rgba(59,130,246,.08)',
    borderColor: 'rgba(59,130,246,.20)',
  };
}

function freshnessText(item: IngredientRateHealthItem) {
  if (item.status === 'MISSING_RATE') {
    return 'Rate required';
  }

  if (!item.freshnessKnown) {
    return 'Freshness unknown';
  }

  if (item.daysOld === 0) {
    return 'Updated today';
  }

  if (item.daysOld === 1) {
    return 'Updated 1 day ago';
  }

  return `Updated ${item.daysOld} days ago`;
}

function money(value: number) {
  return `₹${Number(value || 0).toLocaleString(
    'en-IN',
    {
      maximumFractionDigits: 2,
    },
  )}`;
}

function formatDate(value: string | null) {
  if (!value) return 'No individual rate timestamp';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export default function IngredientRateHealthPage() {
  const [data, setData] =
    useState<HealthResponse | null>(null);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState('');
  const [message, setMessage] =
    useState('');
  const [search, setSearch] =
    useState('');
  const [categoryFilter, setCategoryFilter] =
    useState('ALL');
  const [statusFilter, setStatusFilter] =
    useState<HealthFilter>('ALL');
  const [sortMode, setSortMode] =
    useState<HealthSort>('PRIORITY');
  const [draftRates, setDraftRates] =
    useState<Record<string, string>>({});
  const [savingId, setSavingId] =
    useState<string | null>(null);

  async function loadHealth() {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        '/api/admin/ingredients/health',
        {
          cache: 'no-store',
        },
      );
      const payload =
        await response.json() as
          Partial<HealthResponse> & {
            error?: string;
          };

      if (!response.ok) {
        throw new Error(
          payload.error ||
            'Could not load ingredient rate health.',
        );
      }

      const next: HealthResponse = {
        summary:
          payload.summary ||
          EMPTY_SUMMARY,
        items:
          Array.isArray(payload.items)
            ? payload.items
            : [],
        categories:
          Array.isArray(payload.categories)
            ? payload.categories
            : [],
        thresholds:
          payload.thresholds || {
            staleAfterDays: 60,
            recentWithinDays: 30,
          },
        catalogUpdatedAt:
          payload.catalogUpdatedAt ||
          null,
      };

      setData(next);
      setDraftRates(
        Object.fromEntries(
          next.items.map((item) => [
            item.id,
            item.rate > 0
              ? String(item.rate)
              : '',
          ]),
        ),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not load ingredient rate health.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadHealth();
  }, []);

  const items = data?.items || [];
  const summary =
    data?.summary || EMPTY_SUMMARY;

  const sortedFilteredItems = useMemo(() => {
    const query =
      search
        .trim()
        .toLocaleLowerCase('en-IN');

    return [...items]
      .filter((item) => {
        const matchesSearch =
          !query ||
          item.name
            .toLocaleLowerCase('en-IN')
            .includes(query) ||
          item.category
            .toLocaleLowerCase('en-IN')
            .includes(query) ||
          item.unit
            .toLocaleLowerCase('en-IN')
            .includes(query) ||
          item.affectedRecipes.some((recipe) =>
            recipe
              .toLocaleLowerCase('en-IN')
              .includes(query),
          );

        const matchesCategory =
          categoryFilter === 'ALL' ||
          item.category === categoryFilter;

        const matchesStatus =
          statusFilter === 'ALL' ||
          (
            statusFilter === 'LINKED'
              ? item.recipeCount > 0
              : item.status === statusFilter
          );

        return (
          matchesSearch &&
          matchesCategory &&
          matchesStatus
        );
      })
      .sort((left, right) => {
        if (sortMode === 'NAME') {
          return left.name.localeCompare(
            right.name,
          );
        }

        if (sortMode === 'MOST_USED') {
          return (
            right.recipeCount -
              left.recipeCount ||
            right.priorityScore -
              left.priorityScore
          );
        }

        if (sortMode === 'OLDEST') {
          const leftAge =
            left.daysOld === null
              ? Number.MAX_SAFE_INTEGER
              : left.daysOld;
          const rightAge =
            right.daysOld === null
              ? Number.MAX_SAFE_INTEGER
              : right.daysOld;

          return (
            rightAge -
              leftAge ||
            right.recipeCount -
              left.recipeCount
          );
        }

        return (
          right.priorityScore -
            left.priorityScore ||
          right.recipeCount -
            left.recipeCount ||
          left.name.localeCompare(
            right.name,
          )
        );
      });
  }, [
    categoryFilter,
    items,
    search,
    sortMode,
    statusFilter,
  ]);

  const priorityItems = useMemo(
    () =>
      items
        .filter(
          (item) =>
            item.status === 'MISSING_RATE' ||
            item.status === 'STALE',
        )
        .sort(
          (left, right) =>
            right.recipeCount -
              left.recipeCount ||
            right.priorityScore -
              left.priorityScore ||
            left.name.localeCompare(
              right.name,
            ),
        )
        .slice(0, 12),
    [items],
  );

  async function saveRate(item: IngredientRateHealthItem) {
    const rate = Number(
      draftRates[item.id],
    );

    if (!Number.isFinite(rate) || !(rate > 0)) {
      setError(
        `Enter a market rate greater than ₹0 for ${item.name}.`,
      );
      return;
    }

    setSavingId(item.id);
    setError('');
    setMessage('');

    try {
      const response = await fetch(
        '/api/admin/ingredients',
        {
          method: 'PATCH',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            id: item.id,
            rate,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            'Could not update rate.',
        );
      }

      const syncResponse = await fetch(
        '/api/admin/recipes',
        {
          method: 'POST',
        },
      );
      const syncResult =
        await syncResponse.json();

      if (!syncResponse.ok) {
        throw new Error(
          syncResult.error ||
            'Rate updated, but Dish Master sync failed.',
        );
      }

      const syncedDishes =
        Math.max(
          0,
          Number(
            syncResult.syncedDishes,
          ) || 0,
        );

      setMessage(
        `${item.name} updated to ${money(rate)}/${item.unit}. Linked recipes recalculated · ${syncedDishes} dish${syncedDishes === 1 ? '' : 'es'} synced.`,
      );

      await loadHealth();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Could not update rate.',
      );
    } finally {
      setSavingId(null);
    }
  }

  const tabs: Array<{
    value: HealthFilter;
    label: string;
    count: number;
  }> = [
    {
      value: 'ALL',
      label: 'All',
      count: summary.total,
    },
    {
      value: 'MISSING_RATE',
      label: 'Missing Rate',
      count: summary.missingRate,
    },
    {
      value: 'STALE',
      label: 'Stale',
      count: summary.stale,
    },
    {
      value: 'RECENT',
      label: 'Recently Updated',
      count: summary.recent,
    },
    {
      value: 'HEALTHY',
      label: 'Healthy',
      count: summary.healthy,
    },
    {
      value: 'LINKED',
      label: 'Recipe Linked',
      count: summary.linked,
    },
  ];

  function RateEditor({
    item,
  }: {
    item: IngredientRateHealthItem;
  }) {
    return (
      <div className="rate-health-editor">
        <label>
          <span>₹ / {item.unit}</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={
              draftRates[item.id] ??
              ''
            }
            placeholder="Enter rate"
            onChange={(event) =>
              setDraftRates(
                (current) => ({
                  ...current,
                  [item.id]:
                    event.target.value,
                }),
              )
            }
          />
        </label>

        <button
          type="button"
          className="primary-button"
          disabled={
            savingId === item.id
          }
          onClick={() =>
            void saveRate(item)
          }
        >
          {savingId === item.id
            ? 'Saving…'
            : item.rate > 0
              ? 'Update Rate'
              : 'Save Rate'}
        </button>
      </div>
    );
  }

  return (
    <AppShell
      title="Ingredient Rate Health"
      subtitle="Keep market rates complete and fresh so every recipe costs correctly"
    >
      <section className="content-grid rate-health-page">
        <div className="glass-card rate-health-hero">
          <div className="section-head">
            <div>
              <div className="section-kicker">
                Market price readiness
              </div>
              <h2>
                Ingredient Rate Health
              </h2>
              <p className="muted">
                Fix the ingredients that affect the most recipes first.
                Missing rates block accurate costing; stale rates reduce confidence in the result.
              </p>
            </div>

            <button
              className="ghost-button"
              type="button"
              disabled={loading}
              onClick={() =>
                void loadHealth()
              }
            >
              {loading
                ? 'Refreshing…'
                : 'Refresh'}
            </button>
          </div>

          <div className="rate-health-score-row">
            <div className="rate-health-score">
              <strong>
                {summary.rateCoveragePercent.toFixed(1)}%
              </strong>
              <span>Rate coverage</span>
            </div>

            <div className="rate-health-meter">
              <div
                style={{
                  width:
                    `${Math.max(
                      0,
                      Math.min(
                        100,
                        summary.rateCoveragePercent,
                      ),
                    )}%`,
                }}
              />
            </div>

            <div className="rate-health-score secondary">
              <strong>
                {summary.freshCoveragePercent.toFixed(1)}%
              </strong>
              <span>Fresh + healthy</span>
            </div>
          </div>

          <div className="rate-health-stat-grid">
            <div className="rate-health-stat">
              <span>Total ingredients</span>
              <b>
                {summary.total.toLocaleString(
                  'en-IN',
                )}
              </b>
              <small>Ingredient Master</small>
            </div>

            <div className="rate-health-stat is-ready">
              <span>Rate ready</span>
              <b>
                {summary.ready.toLocaleString(
                  'en-IN',
                )}
              </b>
              <small>Positive market rate</small>
            </div>

            <div className="rate-health-stat is-danger">
              <span>Missing rate</span>
              <b>
                {summary.missingRate.toLocaleString(
                  'en-IN',
                )}
              </b>
              <small>Fix first</small>
            </div>

            <div className="rate-health-stat is-warning">
              <span>Stale</span>
              <b>
                {summary.stale.toLocaleString(
                  'en-IN',
                )}
              </b>
              <small>
                &gt;{data?.thresholds.staleAfterDays || 60} days or freshness unknown
              </small>
            </div>

            <div className="rate-health-stat is-ready">
              <span>Recently updated</span>
              <b>
                {summary.recent.toLocaleString(
                  'en-IN',
                )}
              </b>
              <small>
                ≤{data?.thresholds.recentWithinDays || 30} days
              </small>
            </div>

            <div className="rate-health-stat">
              <span>Recipe linked</span>
              <b>
                {summary.linked.toLocaleString(
                  'en-IN',
                )}
              </b>
              <small>Used by ≥1 recipe</small>
            </div>
          </div>

          <p className="rate-health-footnote">
            Existing rates created before per-ingredient freshness tracking have no individual timestamp.
            They are shown as <b>Stale / freshness unknown</b> until that specific rate is updated.
          </p>
        </div>

        {message ? (
          <div className="glass-card rate-health-message">
            <b>Updated</b>
            <span>{message}</span>
          </div>
        ) : null}

        {error ? (
          <div className="alert-card">
            <b>Needs attention.</b>
            {' '}
            {error}
          </div>
        ) : null}

        <div className="glass-card">
          <div className="section-head">
            <div>
              <div className="section-kicker">
                Highest recipe impact
              </div>
              <h2>Priority to Update</h2>
              <p className="muted">
                Missing and stale rates are ranked by the number of recipes affected.
              </p>
            </div>
          </div>

          {loading ? (
            <p className="muted">
              Calculating rate health…
            </p>
          ) : priorityItems.length ? (
            <div className="rate-health-priority-list">
              {priorityItems.map(
                (item, index) => (
                  <article
                    key={item.id}
                    className="rate-health-priority-row"
                  >
                    <span className="rate-health-rank">
                      {index + 1}
                    </span>

                    <div className="rate-health-main">
                      <div className="rate-health-title-row">
                        <b>{item.name}</b>
                        <span
                          className="rate-health-badge"
                          style={statusStyle(
                            item.status,
                          )}
                        >
                          {statusLabel(
                            item.status,
                          )}
                        </span>
                      </div>

                      <div className="rate-health-meta">
                        <span>
                          {item.category}
                        </span>
                        <span>
                          Current:
                          {' '}
                          <b>
                            {item.rate > 0
                              ? `${money(item.rate)}/${item.unit}`
                              : 'No rate'}
                          </b>
                        </span>
                        <span>
                          Used in
                          {' '}
                          <b>
                            {item.recipeCount}
                          </b>
                          {' '}
                          recipe
                          {item.recipeCount === 1
                            ? ''
                            : 's'}
                        </span>
                        <span>
                          {freshnessText(item)}
                        </span>
                      </div>

                      {item.affectedRecipes.length ? (
                        <small className="muted">
                          Affects:
                          {' '}
                          {item.affectedRecipes
                            .slice(0, 5)
                            .join(', ')}
                          {item.affectedRecipes.length > 5
                            ? ` +${item.affectedRecipes.length - 5} more`
                            : ''}
                        </small>
                      ) : (
                        <small className="muted">
                          Not currently linked to a recipe.
                        </small>
                      )}
                    </div>

                    <RateEditor item={item} />
                  </article>
                ),
              )}
            </div>
          ) : (
            <div className="rate-health-empty">
              <h3>No urgent rate issues</h3>
              <p className="muted">
                There are no missing or stale ingredient rates.
              </p>
            </div>
          )}
        </div>

        <div className="glass-card rate-health-toolbar">
          <div
            className="rate-health-tabs"
            role="tablist"
            aria-label="Ingredient rate health"
          >
            {tabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                className={
                  statusFilter === tab.value
                    ? 'primary-button'
                    : 'ghost-button'
                }
                onClick={() =>
                  setStatusFilter(
                    tab.value,
                  )
                }
              >
                {tab.label}
                <span className="rate-health-tab-count">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="rate-health-filter-grid">
            <label className="field">
              <span>Search</span>
              <input
                value={search}
                placeholder="Ingredient or recipe"
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
              />
            </label>

            <label className="field">
              <span>Category</span>
              <select
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(
                    event.target.value,
                  )
                }
              >
                <option value="ALL">
                  All categories
                </option>
                {(data?.categories || []).map(
                  (category) => (
                    <option
                      key={category}
                      value={category}
                    >
                      {category}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="field">
              <span>Sort by</span>
              <select
                value={sortMode}
                onChange={(event) =>
                  setSortMode(
                    event.target
                      .value as HealthSort,
                  )
                }
              >
                <option value="PRIORITY">
                  Update priority
                </option>
                <option value="MOST_USED">
                  Most recipes affected
                </option>
                <option value="OLDEST">
                  Oldest / unknown first
                </option>
                <option value="NAME">
                  Ingredient name
                </option>
              </select>
            </label>
          </div>

          <div className="rate-health-result-count">
            <b>
              {sortedFilteredItems.length.toLocaleString(
                'en-IN',
              )}
            </b>
            {' '}
            ingredient
            {sortedFilteredItems.length === 1
              ? ''
              : 's'}
            {' '}
            shown
          </div>
        </div>

        <div className="glass-card">
          <div className="section-head">
            <div>
              <div className="section-kicker">
                Full catalog
              </div>
              <h2>All Ingredient Rates</h2>
            </div>
          </div>

          {loading ? (
            <p className="muted">
              Loading ingredient rates…
            </p>
          ) : sortedFilteredItems.length ? (
            <div className="rate-health-list">
              {sortedFilteredItems.map(
                (item) => (
                  <article
                    key={item.id}
                    className="rate-health-row"
                  >
                    <div className="rate-health-main">
                      <div className="rate-health-title-row">
                        <b>{item.name}</b>
                        <span
                          className="rate-health-badge"
                          style={statusStyle(
                            item.status,
                          )}
                        >
                          {statusLabel(
                            item.status,
                          )}
                        </span>
                      </div>

                      <div className="rate-health-meta">
                        <span>{item.category}</span>
                        <span>
                          {item.rate > 0
                            ? `${money(item.rate)}/${item.unit}`
                            : 'No rate'}
                        </span>
                        <span>
                          {item.recipeCount}
                          {' '}
                          recipe
                          {item.recipeCount === 1
                            ? ''
                            : 's'}
                        </span>
                        <span>
                          {freshnessText(item)}
                        </span>
                        <span>
                          {formatDate(item.updatedAt)}
                        </span>
                      </div>
                    </div>

                    <RateEditor item={item} />
                  </article>
                ),
              )}
            </div>
          ) : (
            <div className="rate-health-empty">
              <h3>No matching ingredients</h3>
              <p className="muted">
                Change the status, category or search filter.
              </p>
            </div>
          )}
        </div>

        <style>{`
          .rate-health-page{padding-bottom:36px}
          .rate-health-hero{display:grid;gap:18px}
          .rate-health-score-row{display:grid;grid-template-columns:auto minmax(180px,1fr) auto;align-items:center;gap:16px;padding:14px;border:1px solid rgba(148,163,184,.16);border-radius:18px;background:rgba(148,163,184,.035)}
          .rate-health-score{display:grid;gap:2px}.rate-health-score strong{font-size:30px;letter-spacing:-.04em}.rate-health-score span{font-size:10px;color:var(--muted);font-weight:800;text-transform:uppercase;letter-spacing:.06em}.rate-health-score.secondary{text-align:right}
          .rate-health-meter{height:10px;overflow:hidden;border-radius:999px;background:rgba(148,163,184,.14)}.rate-health-meter>div{height:100%;border-radius:inherit;background:currentColor;transition:width .25s ease}
          .rate-health-stat-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}.rate-health-stat{display:grid;gap:4px;padding:14px;border:1px solid rgba(148,163,184,.16);border-radius:15px;background:rgba(148,163,184,.035)}.rate-health-stat span,.rate-health-stat small{font-size:11px;color:var(--muted)}.rate-health-stat b{font-size:23px}.rate-health-stat.is-ready{background:rgba(34,197,94,.045);border-color:rgba(34,197,94,.17)}.rate-health-stat.is-danger{background:rgba(239,68,68,.045);border-color:rgba(239,68,68,.17)}.rate-health-stat.is-warning{background:rgba(245,158,11,.05);border-color:rgba(245,158,11,.18)}
          .rate-health-footnote{margin:0;color:var(--muted);font-size:11px;line-height:1.5}.rate-health-message{display:flex;gap:10px;align-items:center}.rate-health-message span{color:var(--muted)}
          .rate-health-priority-list,.rate-health-list{display:grid;gap:9px;margin-top:12px}.rate-health-priority-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:14px;padding:14px;border:1px solid rgba(148,163,184,.17);border-radius:16px;background:rgba(148,163,184,.025)}
          .rate-health-rank{display:grid;place-items:center;width:28px;height:28px;border-radius:9px;background:rgba(99,102,241,.10);font-size:12px;font-weight:800}.rate-health-main{display:grid;gap:5px;min-width:0}.rate-health-title-row,.rate-health-meta{display:flex;align-items:center;gap:7px 12px;flex-wrap:wrap}.rate-health-title-row>b{font-size:14px}.rate-health-meta{font-size:11px;color:var(--muted)}.rate-health-meta b{color:inherit}
          .rate-health-badge{display:inline-flex;align-items:center;padding:3px 7px;border:1px solid rgba(148,163,184,.20);border-radius:999px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.04em}
          .rate-health-editor{display:flex;align-items:end;gap:8px}.rate-health-editor label{display:grid;gap:4px}.rate-health-editor label span{font-size:9px;color:var(--muted);font-weight:750}.rate-health-editor input{width:116px}
          .rate-health-toolbar{display:grid;gap:15px}.rate-health-tabs{display:flex;gap:7px;flex-wrap:wrap}.rate-health-tabs button{display:inline-flex;align-items:center;gap:7px}.rate-health-tab-count{min-width:20px;padding:2px 5px;border-radius:999px;background:rgba(148,163,184,.14);font-size:10px}
          .rate-health-filter-grid{display:grid;grid-template-columns:2fr 1fr 1fr;gap:11px}.rate-health-result-count{font-size:12px;color:var(--muted)}
          .rate-health-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:14px;padding:13px 14px;border:1px solid rgba(148,163,184,.16);border-radius:15px}
          .rate-health-empty{padding:22px 0 8px}
          @media(max-width:1050px){.rate-health-stat-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.rate-health-priority-row{grid-template-columns:auto minmax(0,1fr)}.rate-health-priority-row .rate-health-editor{grid-column:2}}
          @media(max-width:720px){.rate-health-score-row,.rate-health-stat-grid,.rate-health-filter-grid{grid-template-columns:1fr}.rate-health-score.secondary{text-align:left}.rate-health-priority-row,.rate-health-row{grid-template-columns:1fr}.rate-health-rank{display:none}.rate-health-editor{display:grid;grid-template-columns:1fr auto;align-items:end}.rate-health-editor label input{width:100%}.rate-health-tabs{display:grid;grid-template-columns:1fr 1fr}.rate-health-tabs button{justify-content:center}}
        `}</style>
      </section>
    </AppShell>
  );
}
