'use client';

import Link from 'next/link';
import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import AppShell from '../../../components/AppShell';
import type {
  RecipeCoverageItem,
  RecipeCoverageStatus,
  RecipeCoverageSummary,
} from '../../../../lib/recipeCoverage';

type CoverageResponse = {
  summary: RecipeCoverageSummary;
  items: RecipeCoverageItem[];
  categories: string[];
  usageWindow: {
    completedCostings: number;
    maximum: number;
  };
  recipeCatalogUpdatedAt: string | null;
};

type CoverageFilter =
  | 'ALL'
  | RecipeCoverageStatus
  | 'FALLBACK';

type CoverageSort =
  | 'PRIORITY'
  | 'MOST_USED'
  | 'NAME';

const EMPTY_SUMMARY: RecipeCoverageSummary = {
  total: 0,
  ready: 0,
  missingRecipe: 0,
  missingRate: 0,
  incomplete: 0,
  fallbackOnly: 0,
  coveragePercent: 0,
};

function statusLabel(status: RecipeCoverageStatus) {
  if (status === 'READY') return 'Ready';
  if (status === 'MISSING_RECIPE') return 'Missing Recipe';
  if (status === 'MISSING_RATE') return 'Missing Rate';
  return 'Incomplete';
}

function statusNote(status: RecipeCoverageStatus) {
  if (status === 'READY') {
    return 'Recipe and ingredient rates are complete.';
  }

  if (status === 'MISSING_RECIPE') {
    return 'Dish exists in Dish Master but has no recipe.';
  }

  if (status === 'MISSING_RATE') {
    return 'Recipe is complete but one or more ingredient prices are missing.';
  }

  return 'Recipe structure needs ingredient or base-guest details.';
}

function statusStyle(status: RecipeCoverageStatus) {
  if (status === 'READY') {
    return {
      background: 'rgba(34,197,94,.10)',
      borderColor: 'rgba(34,197,94,.24)',
    };
  }

  if (status === 'MISSING_RECIPE') {
    return {
      background: 'rgba(239,68,68,.10)',
      borderColor: 'rgba(239,68,68,.24)',
    };
  }

  if (status === 'MISSING_RATE') {
    return {
      background: 'rgba(245,158,11,.11)',
      borderColor: 'rgba(245,158,11,.27)',
    };
  }

  return {
    background: 'rgba(99,102,241,.09)',
    borderColor: 'rgba(99,102,241,.24)',
  };
}

function recipeHref(item: RecipeCoverageItem) {
  const params = new URLSearchParams({
    from: 'coverage',
  });

  if (item.status === 'MISSING_RECIPE') {
    params.set('create', item.name);
    params.set('category', item.category);

    if (item.subcategory) {
      params.set('subcategory', item.subcategory);
    }
  } else {
    params.set(
      'recipe',
      item.recipeName || item.name,
    );
  }

  return `/admin/recipes?${params.toString()}`;
}

function formatUpdatedAt(value: string | null) {
  if (!value) return 'Not saved yet';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function RecipeCoveragePage() {
  const [data, setData] =
    useState<CoverageResponse | null>(null);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState('');
  const [search, setSearch] =
    useState('');
  const [statusFilter, setStatusFilter] =
    useState<CoverageFilter>('ALL');
  const [categoryFilter, setCategoryFilter] =
    useState('ALL');
  const [sortMode, setSortMode] =
    useState<CoverageSort>('PRIORITY');

  async function loadCoverage() {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        '/api/admin/dishes/coverage',
        {
          cache: 'no-store',
        },
      );
      const payload =
        await response.json() as
          Partial<CoverageResponse> & {
            error?: string;
          };

      if (!response.ok) {
        throw new Error(
          payload.error ||
            'Could not load recipe coverage.',
        );
      }

      setData({
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
        usageWindow:
          payload.usageWindow || {
            completedCostings: 0,
            maximum: 250,
          },
        recipeCatalogUpdatedAt:
          payload.recipeCatalogUpdatedAt ||
          null,
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not load recipe coverage.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCoverage();
  }, []);

  const items = data?.items || [];
  const summary =
    data?.summary || EMPTY_SUMMARY;

  const filteredItems = useMemo(() => {
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
          item.subcategory
            .toLocaleLowerCase('en-IN')
            .includes(query) ||
          item.issues.some((issue) =>
            issue
              .toLocaleLowerCase('en-IN')
              .includes(query),
          );

        const matchesCategory =
          categoryFilter === 'ALL' ||
          item.category === categoryFilter;

        const matchesStatus =
          statusFilter === 'ALL' ||
          (
            statusFilter === 'FALLBACK'
              ? item.fallbackOnly
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
            right.usageCount -
              left.usageCount ||
            right.priorityScore -
              left.priorityScore ||
            left.name.localeCompare(
              right.name,
            )
          );
        }

        return (
          right.priorityScore -
            left.priorityScore ||
          right.usageCount -
            left.usageCount ||
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
            item.status !== 'READY',
        )
        .sort(
          (left, right) =>
            right.usageCount -
              left.usageCount ||
            right.priorityScore -
              left.priorityScore ||
            left.name.localeCompare(
              right.name,
            ),
        )
        .slice(0, 10),
    [items],
  );

  const tabs: Array<{
    value: CoverageFilter;
    label: string;
    count: number;
  }> = [
    {
      value: 'ALL',
      label: 'All',
      count: summary.total,
    },
    {
      value: 'READY',
      label: 'Ready',
      count: summary.ready,
    },
    {
      value: 'MISSING_RECIPE',
      label: 'Missing Recipe',
      count: summary.missingRecipe,
    },
    {
      value: 'MISSING_RATE',
      label: 'Missing Rate',
      count: summary.missingRate,
    },
    {
      value: 'INCOMPLETE',
      label: 'Incomplete',
      count: summary.incomplete,
    },
    {
      value: 'FALLBACK',
      label: 'Fallback',
      count: summary.fallbackOnly,
    },
  ];

  return (
    <AppShell
      title="Recipe Coverage"
      subtitle="See which Dish Master items are ready for accurate ingredient costing"
    >
      <section className="content-grid recipe-coverage-page">
        <div className="glass-card coverage-hero">
          <div className="section-head">
            <div>
              <div className="section-kicker">
                Costing readiness
              </div>
              <h2>
                Recipe Coverage Dashboard
              </h2>
              <p className="muted">
                Dish Master is only costing-ready when a recipe exists,
                ingredients are complete, and every required ingredient has a usable rate.
              </p>
            </div>

            <button
              className="ghost-button"
              type="button"
              disabled={loading}
              onClick={() =>
                void loadCoverage()
              }
            >
              {loading
                ? 'Refreshing…'
                : 'Refresh'}
            </button>
          </div>

          <div className="coverage-score-row">
            <div
              className="coverage-score"
              aria-label="Recipe coverage percentage"
            >
              <strong>
                {summary.coveragePercent.toFixed(1)}%
              </strong>
              <span>Costing-ready</span>
            </div>

            <div className="coverage-meter">
              <div
                style={{
                  width:
                    `${Math.max(
                      0,
                      Math.min(
                        100,
                        summary.coveragePercent,
                      ),
                    )}%`,
                }}
              />
            </div>

            <div className="coverage-meta">
              <span>
                Recipe catalog updated
                {' '}
                <b>
                  {formatUpdatedAt(
                    data?.recipeCatalogUpdatedAt ||
                      null,
                  )}
                </b>
              </span>
              <span>
                Usage priority from
                {' '}
                <b>
                  {data?.usageWindow
                    .completedCostings || 0}
                </b>
                {' '}
                recent completed costing
                {(data?.usageWindow
                  .completedCostings || 0) === 1
                  ? ''
                  : 's'}
              </span>
            </div>
          </div>

          <div className="coverage-stat-grid">
            <div className="coverage-stat">
              <span>Total dishes</span>
              <b>
                {summary.total.toLocaleString(
                  'en-IN',
                )}
              </b>
              <small>Dish Master</small>
            </div>

            <div className="coverage-stat is-ready">
              <span>Ready</span>
              <b>
                {summary.ready.toLocaleString(
                  'en-IN',
                )}
              </b>
              <small>Recipe + rates complete</small>
            </div>

            <div className="coverage-stat is-danger">
              <span>Missing recipe</span>
              <b>
                {summary.missingRecipe.toLocaleString(
                  'en-IN',
                )}
              </b>
              <small>Create recipe first</small>
            </div>

            <div className="coverage-stat is-warning">
              <span>Missing rates</span>
              <b>
                {summary.missingRate.toLocaleString(
                  'en-IN',
                )}
              </b>
              <small>Recipe exists</small>
            </div>

            <div className="coverage-stat">
              <span>Incomplete</span>
              <b>
                {summary.incomplete.toLocaleString(
                  'en-IN',
                )}
              </b>
              <small>Recipe needs repair</small>
            </div>

            <div className="coverage-stat">
              <span>Fallback only</span>
              <b>
                {summary.fallbackOnly.toLocaleString(
                  'en-IN',
                )}
              </b>
              <small>Dish rate exists, recipe not ready</small>
            </div>
          </div>
        </div>

        {error ? (
          <div className="alert-card">
            <b>Coverage could not load.</b>
            {' '}
            {error}
          </div>
        ) : null}

        <div className="glass-card">
          <div className="section-head">
            <div>
              <div className="section-kicker">
                Highest impact first
              </div>
              <h2>Priority to Fix</h2>
              <p className="muted">
                Most-used problem dishes are shown first, then other high-impact coverage gaps.
              </p>
            </div>
          </div>

          {loading ? (
            <p className="muted">
              Calculating recipe coverage…
            </p>
          ) : priorityItems.length ? (
            <div className="coverage-priority-list">
              {priorityItems.map(
                (item, index) => (
                  <article
                    key={item.name}
                    className="coverage-priority-row"
                  >
                    <span className="coverage-rank">
                      {index + 1}
                    </span>

                    <div className="coverage-priority-main">
                      <div className="coverage-title-row">
                        <b>{item.name}</b>
                        <span
                          className="coverage-badge"
                          style={statusStyle(
                            item.status,
                          )}
                        >
                          {statusLabel(
                            item.status,
                          )}
                        </span>
                        {item.fallbackOnly ? (
                          <span className="coverage-badge">
                            Fallback
                          </span>
                        ) : null}
                      </div>

                      <div className="coverage-row-meta">
                        <span>
                          {item.category}
                        </span>
                        <span>
                          {item.usageCount}
                          {' '}
                          recent completed use
                          {item.usageCount === 1
                            ? ''
                            : 's'}
                        </span>
                        <span>
                          {item.ingredientCount}
                          {' '}
                          ingredient
                          {item.ingredientCount === 1
                            ? ''
                            : 's'}
                        </span>
                        {item.missingRateCount ? (
                          <span>
                            {item.missingRateCount}
                            {' '}
                            missing rate
                            {item.missingRateCount === 1
                              ? ''
                              : 's'}
                          </span>
                        ) : null}
                      </div>

                      <small className="muted">
                        {item.issues.join(' · ') ||
                          statusNote(item.status)}
                      </small>
                    </div>

                    <Link
                      href={recipeHref(item)}
                      className="primary-button"
                    >
                      {item.status ===
                      'MISSING_RECIPE'
                        ? 'Create Recipe'
                        : 'Open Recipe'}
                    </Link>
                  </article>
                ),
              )}
            </div>
          ) : (
            <div className="coverage-empty">
              <h3>Everything is ready</h3>
              <p className="muted">
                There are no recipe coverage problems in Dish Master.
              </p>
            </div>
          )}
        </div>

        <div className="glass-card coverage-toolbar">
          <div
            className="coverage-tabs"
            role="tablist"
            aria-label="Recipe coverage status"
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
                  setStatusFilter(tab.value)
                }
              >
                {tab.label}
                <span className="coverage-tab-count">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="coverage-filter-grid">
            <label className="field">
              <span>Search dishes</span>
              <input
                value={search}
                placeholder="Dish, category or issue"
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
                      .value as CoverageSort,
                  )
                }
              >
                <option value="PRIORITY">
                  Fix priority
                </option>
                <option value="MOST_USED">
                  Most used
                </option>
                <option value="NAME">
                  Dish name
                </option>
              </select>
            </label>
          </div>

          <div className="coverage-result-count">
            <b>
              {filteredItems.length.toLocaleString(
                'en-IN',
              )}
            </b>
            {' '}
            dish
            {filteredItems.length === 1
              ? ''
              : 'es'}
            {' '}
            shown
          </div>
        </div>

        <div className="glass-card">
          <div className="section-head">
            <div>
              <div className="section-kicker">
                Dish Master readiness
              </div>
              <h2>All Dish Coverage</h2>
            </div>
          </div>

          {loading ? (
            <p className="muted">
              Loading dish readiness…
            </p>
          ) : filteredItems.length ? (
            <div className="coverage-list">
              {filteredItems.map((item) => (
                <article
                  key={item.name}
                  className="coverage-row"
                >
                  <div className="coverage-row-main">
                    <div className="coverage-title-row">
                      <b>{item.name}</b>
                      <span
                        className="coverage-badge"
                        style={statusStyle(
                          item.status,
                        )}
                      >
                        {statusLabel(
                          item.status,
                        )}
                      </span>
                      {item.fallbackOnly ? (
                        <span className="coverage-badge">
                          Fallback
                        </span>
                      ) : null}
                    </div>

                    <div className="coverage-row-meta">
                      <span>
                        {item.category}
                        {item.subcategory
                          ? ` · ${item.subcategory}`
                          : ''}
                      </span>
                      <span>
                        {item.ingredientCount}
                        {' '}
                        ingredient
                        {item.ingredientCount === 1
                          ? ''
                          : 's'}
                      </span>
                      <span>
                        {item.usageCount}
                        {' '}
                        recent use
                        {item.usageCount === 1
                          ? ''
                          : 's'}
                      </span>
                      {item.dishRate > 0 ? (
                        <span>
                          Dish rate ₹
                          {item.dishRate.toLocaleString(
                            'en-IN',
                            {
                              maximumFractionDigits: 2,
                            },
                          )}
                        </span>
                      ) : null}
                    </div>

                    <small className="muted">
                      {item.issues.length
                        ? item.issues.join(' · ')
                        : statusNote(
                            item.status,
                          )}
                    </small>
                  </div>

                  <Link
                    href={recipeHref(item)}
                    className={
                      item.status === 'READY'
                        ? 'ghost-button'
                        : 'secondary-button'
                    }
                  >
                    {item.status ===
                    'MISSING_RECIPE'
                      ? 'Create Recipe'
                      : 'Open Recipe'}
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="coverage-empty">
              <h3>No dishes match</h3>
              <p className="muted">
                Change the status, category or search filter.
              </p>
            </div>
          )}
        </div>

        <style>{`
          .recipe-coverage-page{padding-bottom:36px}
          .coverage-hero{display:grid;gap:18px}
          .coverage-score-row{display:grid;grid-template-columns:auto minmax(180px,1fr) minmax(230px,auto);align-items:center;gap:16px;padding:14px;border:1px solid rgba(148,163,184,.16);border-radius:18px;background:rgba(148,163,184,.035)}
          .coverage-score{display:grid;gap:2px}.coverage-score strong{font-size:31px;letter-spacing:-.04em}.coverage-score span{font-size:11px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.06em}
          .coverage-meter{height:10px;overflow:hidden;border-radius:999px;background:rgba(148,163,184,.14)}.coverage-meter>div{height:100%;border-radius:inherit;background:currentColor;transition:width .25s ease}
          .coverage-meta{display:grid;gap:5px;color:var(--muted);font-size:11px;text-align:right}.coverage-meta b{color:inherit}
          .coverage-stat-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}
          .coverage-stat{display:grid;gap:4px;padding:14px;border:1px solid rgba(148,163,184,.16);border-radius:15px;background:rgba(148,163,184,.035)}.coverage-stat span,.coverage-stat small{font-size:11px;color:var(--muted)}.coverage-stat b{font-size:23px}.coverage-stat.is-ready{background:rgba(34,197,94,.05);border-color:rgba(34,197,94,.17)}.coverage-stat.is-danger{background:rgba(239,68,68,.045);border-color:rgba(239,68,68,.17)}.coverage-stat.is-warning{background:rgba(245,158,11,.05);border-color:rgba(245,158,11,.18)}
          .coverage-priority-list,.coverage-list{display:grid;gap:9px;margin-top:12px}
          .coverage-priority-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:13px;padding:14px;border:1px solid rgba(148,163,184,.17);border-radius:16px;background:rgba(148,163,184,.025)}
          .coverage-rank{display:grid;place-items:center;width:28px;height:28px;border-radius:9px;background:rgba(99,102,241,.10);font-size:12px;font-weight:800}
          .coverage-priority-main,.coverage-row-main{display:grid;gap:5px;min-width:0}
          .coverage-title-row,.coverage-row-meta{display:flex;align-items:center;gap:7px 12px;flex-wrap:wrap}.coverage-title-row>b{font-size:14px}
          .coverage-row-meta{font-size:11px;color:var(--muted)}
          .coverage-badge{display:inline-flex;align-items:center;padding:3px 7px;border:1px solid rgba(148,163,184,.20);border-radius:999px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.04em}
          .coverage-toolbar{display:grid;gap:15px}.coverage-tabs{display:flex;gap:7px;flex-wrap:wrap}.coverage-tabs button{display:inline-flex;align-items:center;gap:7px}.coverage-tab-count{min-width:20px;padding:2px 5px;border-radius:999px;background:rgba(148,163,184,.14);font-size:10px}
          .coverage-filter-grid{display:grid;grid-template-columns:2fr 1fr 1fr;gap:11px}.coverage-result-count{font-size:12px;color:var(--muted)}
          .coverage-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:14px;padding:13px 14px;border:1px solid rgba(148,163,184,.16);border-radius:15px}
          .coverage-empty{padding:22px 0 8px}
          @media(max-width:1050px){.coverage-stat-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.coverage-score-row{grid-template-columns:auto 1fr}.coverage-meta{grid-column:1/-1;text-align:left;grid-template-columns:1fr 1fr}}
          @media(max-width:720px){.coverage-stat-grid{grid-template-columns:1fr 1fr}.coverage-filter-grid{grid-template-columns:1fr}.coverage-priority-row,.coverage-row{grid-template-columns:1fr}.coverage-rank{display:none}.coverage-priority-row>a,.coverage-row>a{width:100%;text-align:center}.coverage-score-row{grid-template-columns:1fr}.coverage-meta{grid-template-columns:1fr}.coverage-tabs{display:grid;grid-template-columns:1fr 1fr}.coverage-tabs button{justify-content:center}}
        `}</style>
      </section>
    </AppShell>
  );
}
