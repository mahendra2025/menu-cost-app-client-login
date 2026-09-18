'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import AppShell from '../../../components/AppShell';
import {
  rankDishMatches,
  unknownDishPriorityScore,
} from '../../../../lib/unknownDishQueue';

type QueueStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'MATCHED'
  | 'IGNORED'
  | 'ALL';

type PendingDish = {
  id: string;
  name: string;
  normalizedName: string;
  categoryHint: string;
  tenantId: string;
  sourceFileName: string;
  occurrences: number;
  status: string;
  canonicalName: string;
  suggestedCategory: string;
  suggestedSubcategory: string;
  aiConfidence: number | null;
  duplicateScore: number | null;
  matchedDishName: string;
  recommendation: string;
  riskLevel: string;
  analysisReason: string;
  adminNotes: string;
  analyzedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type DishOption = {
  name: string;
  category: string;
  subcategory?: string;
  rate: number;
  servingQuantity?: number;
  servingUnit?: string;
};

type ReviewDraft = {
  name: string;
  category: string;
  subcategory: string;
  rate: string;
  servingQuantity: string;
  servingUnit: string;
  aliases: string;
  targetDishName: string;
  adminNotes: string;
};

type StatusCounts = {
  PENDING: number;
  APPROVED: number;
  MATCHED: number;
  IGNORED: number;
  ALL: number;
};

const EMPTY_COUNTS: StatusCounts = {
  PENDING: 0,
  APPROVED: 0,
  MATCHED: 0,
  IGNORED: 0,
  ALL: 0,
};

function emptyDraft(): ReviewDraft {
  return {
    name: '',
    category: 'Other',
    subcategory: '',
    rate: '',
    servingQuantity: '1',
    servingUnit: 'serving',
    aliases: '',
    targetDishName: '',
    adminNotes: '',
  };
}

function formatDate(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function percentValue(value: number | null | undefined) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 0;
  return Math.min(100, number <= 1 ? number * 100 : number);
}

function riskLabel(item: PendingDish) {
  const risk = String(item.riskLevel || '').toUpperCase();
  if (risk) return risk;
  if (percentValue(item.duplicateScore) >= 75) return 'DUPLICATE';
  return 'REVIEW';
}

function statusLabel(status: string) {
  if (status === 'ALL') return 'All';
  if (status === 'APPROVED') return 'Added';
  if (status === 'MATCHED') return 'Matched';
  if (status === 'IGNORED') return 'Ignored';
  return 'Pending';
}

function riskStyle(risk: string) {
  if (risk === 'HIGH') {
    return {
      background: 'rgba(239,68,68,.12)',
      borderColor: 'rgba(239,68,68,.28)',
    };
  }
  if (risk === 'MEDIUM' || risk === 'DUPLICATE') {
    return {
      background: 'rgba(245,158,11,.12)',
      borderColor: 'rgba(245,158,11,.28)',
    };
  }
  return {
    background: 'rgba(148,163,184,.10)',
    borderColor: 'rgba(148,163,184,.22)',
  };
}

export default function UnknownDishQueuePage() {
  const [items, setItems] = useState<PendingDish[]>([]);
  const [dishOptions, setDishOptions] = useState<DishOption[]>([]);
  const [categories, setCategories] = useState<string[]>(['Other']);
  const [statusCounts, setStatusCounts] =
    useState<StatusCounts>(EMPTY_COUNTS);

  const [statusFilter, setStatusFilter] =
    useState<QueueStatus>('PENDING');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] =
    useState<'PRIORITY' | 'OCCURRENCES' | 'NEWEST'>('PRIORITY');

  const [selectedId, setSelectedId] =
    useState<string | null>(null);
  const [checkedIds, setCheckedIds] =
    useState<Set<string>>(new Set());
  const [draft, setDraft] =
    useState<ReviewDraft>(emptyDraft);

  const [loading, setLoading] = useState(true);
  const [masterLoading, setMasterLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] =
    useState<'success' | 'error'>('success');
  const reviewRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  const rankedMatches = useMemo(
    () =>
      selected
        ? rankDishMatches(selected.name, dishOptions, 6)
        : [],
    [selected, dishOptions],
  );

  const matchingDishes = useMemo(() => {
    const query = draft.targetDishName
      .trim()
      .toLocaleLowerCase('en-IN');

    if (!query) return rankedMatches.slice(0, 6);

    const direct = dishOptions
      .filter((dish) =>
        dish.name.toLocaleLowerCase('en-IN').includes(query) ||
        dish.category.toLocaleLowerCase('en-IN').includes(query),
      )
      .slice(0, 10);

    return direct.length ? direct : rankedMatches.slice(0, 6);
  }, [dishOptions, draft.targetDishName, rankedMatches]);

  const sortedItems = useMemo(() => {
    return [...items].sort((left, right) => {
      if (sortMode === 'NEWEST') {
        return (
          new Date(right.updatedAt).getTime() -
          new Date(left.updatedAt).getTime()
        );
      }

      if (sortMode === 'OCCURRENCES') {
        return (
          Number(right.occurrences || 0) -
            Number(left.occurrences || 0) ||
          new Date(right.updatedAt).getTime() -
            new Date(left.updatedAt).getTime()
        );
      }

      return (
        unknownDishPriorityScore(right) -
          unknownDishPriorityScore(left) ||
        Number(right.occurrences || 0) -
          Number(left.occurrences || 0)
      );
    });
  }, [items, sortMode]);

  const totalOccurrences = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum + Math.max(0, Number(item.occurrences) || 0),
        0,
      ),
    [items],
  );

  const highRiskCount = useMemo(
    () =>
      items.filter(
        (item) =>
          String(item.riskLevel || '').toUpperCase() === 'HIGH',
      ).length,
    [items],
  );

  async function loadDishMaster() {
    setMasterLoading(true);

    try {
      const response = await fetch('/api/admin/dishes', {
        cache: 'no-store',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Could not load Dish Master.',
        );
      }

      const nextDishes = Array.isArray(data.items)
        ? (data.items as DishOption[]).filter((dish) =>
            Boolean(String(dish?.name || '').trim()),
          )
        : [];

      const nextCategories = Array.isArray(data.categories)
        ? data.categories
            .map((category: unknown) =>
              String(category || '').trim(),
            )
            .filter(Boolean)
        : [];

      setDishOptions(nextDishes);
      setCategories(
        Array.from(new Set([...nextCategories, 'Other'])).sort(
          (left, right) => left.localeCompare(right),
        ),
      );
    } catch (error) {
      setMessageType('error');
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not load Dish Master.',
      );
    } finally {
      setMasterLoading(false);
    }
  }

  async function loadQueue() {
    setLoading(true);

    try {
      const params = new URLSearchParams({
        status: statusFilter,
        limit: '300',
      });

      if (search.trim()) params.set('q', search.trim());
      if (categoryFilter !== 'ALL') {
        params.set('category', categoryFilter);
      }

      const response = await fetch(
        `/api/admin/dishes/pending?${params.toString()}`,
        { cache: 'no-store' },
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Could not load unknown dishes.',
        );
      }

      const nextItems = Array.isArray(data.items)
        ? (data.items as PendingDish[])
        : [];

      setItems(nextItems);
      setStatusCounts({
        ...EMPTY_COUNTS,
        ...(data.statusCounts || {}),
      });

      setCheckedIds((current) => {
        const valid = new Set(
          nextItems
            .filter((item) => item.status === 'PENDING')
            .map((item) => item.id),
        );
        return new Set(
          Array.from(current).filter((id) => valid.has(id)),
        );
      });

      if (
        selectedId &&
        !nextItems.some((item) => item.id === selectedId)
      ) {
        setSelectedId(null);
        setDraft(emptyDraft());
      }
    } catch (error) {
      setMessageType('error');
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not load unknown dishes.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDishMaster();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadQueue();
    }, search.trim() ? 250 : 0);

    return () => window.clearTimeout(timer);
  }, [statusFilter, categoryFilter, search]);

  useEffect(() => {
    if (!selectedId) return;

    reviewRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, [selectedId]);

  function beginReview(item: PendingDish) {
    const suggestions = rankDishMatches(item.name, dishOptions, 3);
    const best = suggestions[0];
    const suggestedTarget =
      item.matchedDishName ||
      item.canonicalName ||
      ((best?.score ?? 0) >= 68 ? best.name : '');

    setSelectedId(item.id);
    setMessage('');

    setDraft({
      name: item.name,
      category:
        item.suggestedCategory ||
        item.categoryHint ||
        'Other',
      subcategory: item.suggestedSubcategory || '',
      rate: '',
      servingQuantity: '1',
      servingUnit: 'serving',
      aliases: '',
      targetDishName: suggestedTarget,
      adminNotes: item.adminNotes || '',
    });
  }

  function toggleChecked(id: string) {
    setCheckedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisiblePending() {
    const pendingIds = sortedItems
      .filter((item) => item.status === 'PENDING')
      .map((item) => item.id);

    const allSelected =
      pendingIds.length > 0 &&
      pendingIds.every((id) => checkedIds.has(id));

    setCheckedIds(
      allSelected ? new Set() : new Set(pendingIds),
    );
  }

  async function bulkIgnore() {
    const ids = Array.from(checkedIds);
    if (!ids.length) return;

    if (
      !window.confirm(
        `Ignore ${ids.length} selected queue item${ids.length === 1 ? '' : 's'}? Use this only for headings, garbage or non-dish text.`,
      )
    ) {
      return;
    }

    setBusy(true);
    setMessage('');

    try {
      const response = await fetch(
        '/api/admin/dishes/pending',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'IGNORE_MANY',
            ids,
            adminNotes: 'Bulk ignored from admin queue.',
          }),
        },
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Could not ignore selected items.',
        );
      }

      setCheckedIds(new Set());
      setMessageType('success');
      setMessage(
        `${Number(data.count) || ids.length} queue item${(Number(data.count) || ids.length) === 1 ? '' : 's'} ignored.`,
      );
      await loadQueue();
    } catch (error) {
      setMessageType('error');
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not ignore selected items.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitAction(
    action: 'ADD_NEW' | 'MATCH_EXISTING' | 'IGNORE',
  ) {
    if (!selected || selected.status !== 'PENDING') return;

    if (
      action === 'ADD_NEW' &&
      !(
        Number(draft.rate) > 0 &&
        Number(draft.servingQuantity) > 0 &&
        draft.name.trim() &&
        draft.category.trim() &&
        draft.servingUnit.trim()
      )
    ) {
      setMessageType('error');
      setMessage(
        'Add New needs dish name, category, cost and serving details.',
      );
      return;
    }

    if (
      action === 'MATCH_EXISTING' &&
      !draft.targetDishName.trim()
    ) {
      setMessageType('error');
      setMessage(
        'Choose an existing Dish Master item first.',
      );
      return;
    }

    if (
      action === 'IGNORE' &&
      !window.confirm(
        'Ignore this name? Use Ignore only for headings, garbage or non-dish text.',
      )
    ) {
      return;
    }

    setBusy(true);
    setMessage('');

    try {
      const response = await fetch(
        '/api/admin/dishes/pending',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: selected.id,
            action,
            name: draft.name,
            category: draft.category,
            subcategory: draft.subcategory,
            rate: Number(draft.rate),
            servingQuantity: Number(draft.servingQuantity),
            servingUnit: draft.servingUnit,
            aliases: draft.aliases,
            targetDishName: draft.targetDishName,
            adminNotes: draft.adminNotes,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Could not save this review.',
        );
      }

      setMessageType('success');
      setMessage(
        action === 'ADD_NEW'
          ? 'Dish added to Dish Master.'
          : action === 'MATCH_EXISTING'
            ? 'Unknown name saved as an alias of the existing dish.'
            : 'Dish suggestion ignored.',
      );
      setSelectedId(null);
      setDraft(emptyDraft());
      await loadQueue();
      if (action !== 'IGNORE') {
        await loadDishMaster();
      }
    } catch (error) {
      setMessageType('error');
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not save this review.',
      );
    } finally {
      setBusy(false);
    }
  }

  const statusTabs: Array<{
    value: QueueStatus;
    label: string;
  }> = [
    { value: 'PENDING', label: 'Pending' },
    { value: 'MATCHED', label: 'Matched' },
    { value: 'APPROVED', label: 'Added New' },
    { value: 'IGNORED', label: 'Ignored' },
    { value: 'ALL', label: 'All' },
  ];

  const checkedVisibleCount = sortedItems.filter(
    (item) => checkedIds.has(item.id),
  ).length;

  return (
    <AppShell
      title="Dishes"
      subtitle="Review unknown menu names and continuously improve Dish Master"
    >
      <section className="content-grid unknown-queue-page">
        <div className="glass-card queue-hero">
          <div className="section-head">
            <div>
              <div className="section-kicker">
                Dish learning control center
              </div>
              <h2>Unknown Dish Queue</h2>
              <p className="muted">
                Prioritize repeated or risky names, match spelling variants to Dish Master,
                add genuinely new dishes, and ignore only non-dish text.
              </p>
            </div>
            <button
              className="ghost-button"
              type="button"
              onClick={() => {
                void loadQueue();
                void loadDishMaster();
              }}
              disabled={loading || masterLoading || busy}
            >
              {loading || masterLoading
                ? 'Refreshing…'
                : 'Refresh'}
            </button>
          </div>

          <div className="queue-stat-grid">
            <div className="queue-stat">
              <span>Pending</span>
              <b>{statusCounts.PENDING.toLocaleString('en-IN')}</b>
              <small>Needs admin decision</small>
            </div>
            <div className="queue-stat">
              <span>Matched</span>
              <b>{statusCounts.MATCHED.toLocaleString('en-IN')}</b>
              <small>Aliases learned</small>
            </div>
            <div className="queue-stat">
              <span>Added New</span>
              <b>{statusCounts.APPROVED.toLocaleString('en-IN')}</b>
              <small>New master dishes</small>
            </div>
            <div className="queue-stat">
              <span>Dish Master</span>
              <b>{dishOptions.length.toLocaleString('en-IN')}</b>
              <small>Available match targets</small>
            </div>
          </div>
        </div>

        {message ? (
          <div
            className={
              messageType === 'error'
                ? 'alert-card'
                : 'glass-card queue-message'
            }
          >
            <b>
              {messageType === 'error'
                ? 'Needs attention'
                : 'Saved'}
            </b>
            <span>{message}</span>
          </div>
        ) : null}

        <div className="glass-card queue-toolbar-card">
          <div className="queue-tabs" role="tablist" aria-label="Queue status">
            {statusTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                className={
                  statusFilter === tab.value
                    ? 'primary-button'
                    : 'ghost-button'
                }
                onClick={() => {
                  setStatusFilter(tab.value);
                  setSelectedId(null);
                  setCheckedIds(new Set());
                }}
              >
                {tab.label}
                <span className="queue-tab-count">
                  {statusCounts[tab.value]}
                </span>
              </button>
            ))}
          </div>

          <div className="queue-filter-grid">
            <label className="field">
              <span>Search queue</span>
              <input
                value={search}
                placeholder="Dish name, file or matched dish"
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <label className="field">
              <span>Category</span>
              <select
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(event.target.value)
                }
              >
                <option value="ALL">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Sort by</span>
              <select
                value={sortMode}
                onChange={(event) =>
                  setSortMode(
                    event.target.value as
                      | 'PRIORITY'
                      | 'OCCURRENCES'
                      | 'NEWEST',
                  )
                }
              >
                <option value="PRIORITY">
                  Review priority
                </option>
                <option value="OCCURRENCES">
                  Most repeated
                </option>
                <option value="NEWEST">
                  Newest first
                </option>
              </select>
            </label>
          </div>

          <div className="queue-view-summary">
            <span>
              <b>{items.length}</b> shown
            </span>
            <span>
              <b>{totalOccurrences}</b> upload occurrences
            </span>
            <span>
              <b>{highRiskCount}</b> high risk in this view
            </span>
          </div>
        </div>

        {statusFilter === 'PENDING' && items.length ? (
          <div className="glass-card queue-bulk-bar">
            <label className="queue-check-all">
              <input
                type="checkbox"
                checked={
                  sortedItems.length > 0 &&
                  sortedItems
                    .filter((item) => item.status === 'PENDING')
                    .every((item) => checkedIds.has(item.id))
                }
                onChange={toggleAllVisiblePending}
              />
              <span>Select visible pending items</span>
            </label>
            <div className="action-row">
              <span className="muted">
                {checkedVisibleCount} selected
              </span>
              <button
                type="button"
                className="secondary-button"
                disabled={!checkedIds.size || busy}
                onClick={() => void bulkIgnore()}
              >
                Ignore Selected
              </button>
            </div>
          </div>
        ) : null}

        <div className="glass-card">
          <div className="section-head">
            <div>
              <div className="section-kicker">
                {statusLabel(statusFilter)}
              </div>
              <h2>
                {statusFilter === 'PENDING'
                  ? 'Names waiting for review'
                  : 'Review history'}
              </h2>
            </div>
          </div>

          {loading ? (
            <p className="muted">Loading unknown dishes…</p>
          ) : sortedItems.length === 0 ? (
            <div className="queue-empty">
              <h3>
                {statusFilter === 'PENDING'
                  ? 'Queue is clear'
                  : 'No items in this view'}
              </h3>
              <p className="muted">
                {search || categoryFilter !== 'ALL'
                  ? 'Try clearing the search or category filter.'
                  : 'New unknown dish names will appear here automatically after customer menu uploads.'}
              </p>
            </div>
          ) : (
            <div className="queue-list">
              {sortedItems.map((item) => {
                const risk = riskLabel(item);
                const duplicate = percentValue(item.duplicateScore);
                const confidence = percentValue(item.aiConfidence);
                const rowMatches = rankDishMatches(
                  item.name,
                  dishOptions,
                  1,
                );
                const likely = rowMatches[0];

                return (
                  <article
                    key={item.id}
                    className={
                      selectedId === item.id
                        ? 'queue-row is-selected'
                        : 'queue-row'
                    }
                    onClick={(event) => {
                      const target = event.target as HTMLElement;

                      if (
                        target.closest(
                          'input, button, a, select, textarea, label',
                        )
                      ) {
                        return;
                      }

                      beginReview(item);
                    }}
                  >
                    {item.status === 'PENDING' ? (
                      <input
                        className="queue-row-check"
                        type="checkbox"
                        checked={checkedIds.has(item.id)}
                        onChange={() => toggleChecked(item.id)}
                        aria-label={`Select ${item.name}`}
                      />
                    ) : (
                      <span className="queue-status-dot" />
                    )}

                    <div className="queue-row-main">
                      <div className="queue-row-title">
                        <b>{item.name}</b>
                        <span
                          className="queue-badge"
                          style={riskStyle(risk)}
                        >
                          {risk}
                        </span>
                        <span className="queue-badge">
                          {statusLabel(item.status)}
                        </span>
                      </div>

                      <div className="queue-row-meta">
                        <span>
                          {item.categoryHint || 'Other'}
                        </span>
                        <span>
                          {item.occurrences} upload
                          {item.occurrences === 1 ? '' : 's'}
                        </span>
                        {item.sourceFileName ? (
                          <span>{item.sourceFileName}</span>
                        ) : null}
                        <span>{formatDate(item.updatedAt)}</span>
                      </div>

                      <div className="queue-row-insight">
                        {duplicate > 0 ? (
                          <span>
                            Duplicate signal <b>{Math.round(duplicate)}%</b>
                          </span>
                        ) : null}
                        {confidence > 0 ? (
                          <span>
                            Detection confidence <b>{Math.round(confidence)}%</b>
                          </span>
                        ) : null}
                        {likely && likely.score >= 55 ? (
                          <span>
                            Likely match <b>{likely.name}</b> · {likely.score}%
                          </span>
                        ) : null}
                        {item.canonicalName ? (
                          <span>
                            Saved as <b>{item.canonicalName}</b>
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <button
                      className={
                        selectedId === item.id
                          ? 'primary-button'
                          : 'ghost-button'
                      }
                      type="button"
                      onClick={() => beginReview(item)}
                    >
                      {item.status === 'PENDING'
                        ? selectedId === item.id
                          ? 'Reviewing'
                          : 'Review'
                        : 'Details'}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {selected ? (
          <div
            ref={reviewRef}
            className="glass-card queue-review-card"
          >
            <div className="section-head">
              <div>
                <div className="section-kicker">
                  {selected.status === 'PENDING'
                    ? 'Review decision'
                    : 'Resolved queue item'}
                </div>
                <h2>{selected.name}</h2>
                <p className="muted">
                  {selected.status === 'PENDING'
                    ? 'Choose the permanent outcome for this name. Matching an existing dish is preferred when the difference is only spelling or naming.'
                    : `This item is already ${statusLabel(selected.status).toLowerCase()}.`}
                </p>
              </div>
              <button
                className="ghost-button"
                type="button"
                onClick={() => {
                  setSelectedId(null);
                  setDraft(emptyDraft());
                }}
              >
                Close
              </button>
            </div>

            <div className="queue-analysis-grid">
              <div>
                <span>Occurrences</span>
                <b>{selected.occurrences}</b>
              </div>
              <div>
                <span>Risk</span>
                <b>{riskLabel(selected)}</b>
              </div>
              <div>
                <span>Duplicate score</span>
                <b>
                  {percentValue(selected.duplicateScore)
                    ? `${Math.round(percentValue(selected.duplicateScore))}%`
                    : '—'}
                </b>
              </div>
              <div>
                <span>Confidence</span>
                <b>
                  {percentValue(selected.aiConfidence)
                    ? `${Math.round(percentValue(selected.aiConfidence))}%`
                    : '—'}
                </b>
              </div>
            </div>

            {selected.analysisReason ||
            selected.recommendation ? (
              <div className="queue-analysis-note">
                <b>
                  {selected.recommendation
                    ? `System recommendation: ${selected.recommendation.replace(/_/g, ' ')}`
                    : 'System analysis'}
                </b>
                {selected.analysisReason ? (
                  <p>{selected.analysisReason}</p>
                ) : null}
              </div>
            ) : null}

            {selected.status !== 'PENDING' ? (
              <div className="queue-resolved-summary">
                <div>
                  <span>Final action</span>
                  <b>{statusLabel(selected.status)}</b>
                </div>
                <div>
                  <span>Canonical dish</span>
                  <b>
                    {selected.canonicalName ||
                      selected.matchedDishName ||
                      '—'}
                  </b>
                </div>
                <div>
                  <span>Admin notes</span>
                  <b>{selected.adminNotes || '—'}</b>
                </div>
                <div>
                  <span>Reviewed</span>
                  <b>
                    {formatDate(
                      selected.analyzedAt || selected.updatedAt,
                    )}
                  </b>
                </div>
              </div>
            ) : (
              <>
                <div className="queue-decision-grid">
                  <section className="queue-decision-card is-match">
                    <div className="section-kicker">
                      Option 1 · Preferred for variants
                    </div>
                    <h3>Match Existing Dish</h3>
                    <p className="muted">
                      Saves “{selected.name}” as an alias so future uploads recognize it automatically.
                    </p>

                    {rankedMatches.length ? (
                      <div className="queue-suggestions">
                        {rankedMatches.slice(0, 4).map((dish) => (
                          <button
                            key={dish.name}
                            type="button"
                            className={
                              draft.targetDishName === dish.name
                                ? 'primary-button'
                                : 'ghost-button'
                            }
                            onClick={() =>
                              setDraft((current) => ({
                                ...current,
                                targetDishName: dish.name,
                              }))
                            }
                          >
                            {dish.name}
                            <small>{dish.score}%</small>
                          </button>
                        ))}
                      </div>
                    ) : null}

                    <label className="field">
                      <span>Find Dish Master item</span>
                      <input
                        value={draft.targetDishName}
                        placeholder="Type existing dish name"
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            targetDishName: event.target.value,
                          }))
                        }
                      />
                    </label>

                    {draft.targetDishName ? (
                      <div className="queue-match-results">
                        {matchingDishes.map((dish) => (
                          <button
                            key={dish.name}
                            type="button"
                            onClick={() =>
                              setDraft((current) => ({
                                ...current,
                                targetDishName: dish.name,
                              }))
                            }
                          >
                            <b>{dish.name}</b>
                            <small>
                              {dish.category}
                              {dish.rate > 0
                                ? ` · ₹${dish.rate}`
                                : ''}
                            </small>
                          </button>
                        ))}
                      </div>
                    ) : null}

                    <button
                      className="primary-button queue-decision-action"
                      type="button"
                      disabled={busy || !draft.targetDishName.trim()}
                      onClick={() =>
                        void submitAction('MATCH_EXISTING')
                      }
                    >
                      Match & Learn Alias
                    </button>
                  </section>

                  <section className="queue-decision-card">
                    <div className="section-kicker">
                      Option 2 · Genuine new dish
                    </div>
                    <h3>Add New Dish</h3>
                    <p className="muted">
                      Add only when this is truly missing from Dish Master.
                    </p>

                    <div className="queue-add-grid">
                      <label className="field">
                        <span>Dish name</span>
                        <input
                          value={draft.name}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              name: event.target.value,
                            }))
                          }
                        />
                      </label>

                      <label className="field">
                        <span>Category</span>
                        <select
                          value={draft.category}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              category: event.target.value,
                            }))
                          }
                        >
                          {categories.map((category) => (
                            <option
                              key={category}
                              value={category}
                            >
                              {category}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="field">
                        <span>Subcategory</span>
                        <input
                          value={draft.subcategory}
                          placeholder="Optional"
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              subcategory: event.target.value,
                            }))
                          }
                        />
                      </label>

                      <label className="field">
                        <span>Cost / serving ₹</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          value={draft.rate}
                          placeholder="38"
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              rate: event.target.value,
                            }))
                          }
                        />
                      </label>

                      <label className="field">
                        <span>Serving quantity</span>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={draft.servingQuantity}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              servingQuantity: event.target.value,
                            }))
                          }
                        />
                      </label>

                      <label className="field">
                        <span>Serving unit</span>
                        <select
                          value={draft.servingUnit}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              servingUnit: event.target.value,
                            }))
                          }
                        >
                          <option value="serving">serving</option>
                          <option value="gram">gram</option>
                          <option value="ml">ml</option>
                          <option value="piece">piece</option>
                        </select>
                      </label>
                    </div>

                    <label className="field">
                      <span>Extra aliases</span>
                      <input
                        value={draft.aliases}
                        placeholder="Comma-separated alternate names"
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            aliases: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <button
                      className="secondary-button queue-decision-action"
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void submitAction('ADD_NEW')
                      }
                    >
                      Add to Dish Master
                    </button>
                  </section>
                </div>

                <label className="field queue-admin-notes">
                  <span>Admin notes</span>
                  <textarea
                    rows={3}
                    value={draft.adminNotes}
                    placeholder="Optional review note"
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        adminNotes: event.target.value,
                      }))
                    }
                  />
                </label>

                <div className="queue-ignore-zone">
                  <div>
                    <b>Not a dish?</b>
                    <span>
                      Ignore headings, venue text, branding, OCR garbage or other non-menu content.
                    </span>
                  </div>
                  <button
                    className="ghost-button"
                    type="button"
                    disabled={busy}
                    onClick={() => void submitAction('IGNORE')}
                  >
                    Ignore This Item
                  </button>
                </div>
              </>
            )}
          </div>
        ) : null}

        <style>{`
          .unknown-queue-page{padding-bottom:36px}
          .queue-hero{overflow:hidden}
          .queue-stat-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:18px}
          .queue-stat{padding:16px;border:1px solid rgba(148,163,184,.18);border-radius:16px;background:rgba(148,163,184,.05);display:grid;gap:4px}
          .queue-stat span,.queue-stat small{color:var(--muted);font-size:12px}.queue-stat b{font-size:26px}
          .queue-message{display:flex;align-items:center;gap:10px}.queue-message span{color:var(--muted)}
          .queue-toolbar-card{display:grid;gap:16px}.queue-tabs{display:flex;gap:8px;flex-wrap:wrap}.queue-tabs button{display:inline-flex;align-items:center;gap:8px}
          .queue-tab-count{min-width:22px;padding:2px 6px;border-radius:999px;background:rgba(148,163,184,.14);font-size:11px}
          .queue-filter-grid{display:grid;grid-template-columns:2fr 1fr 1fr;gap:12px}.queue-view-summary{display:flex;gap:18px;flex-wrap:wrap;color:var(--muted);font-size:13px}.queue-view-summary b{color:inherit}
          .queue-bulk-bar{display:flex;align-items:center;justify-content:space-between;gap:14px}.queue-check-all{display:flex;align-items:center;gap:10px;font-weight:650}
          .queue-empty{padding:22px 0 8px}.queue-list{display:grid;gap:9px;margin-top:12px}
          .queue-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:14px;padding:14px 15px;border:1px solid rgba(148,163,184,.18);border-radius:16px;background:rgba(148,163,184,.025);transition:.15s ease;cursor:pointer}
          .queue-row:hover,.queue-row.is-selected{border-color:rgba(99,102,241,.38);background:rgba(99,102,241,.05)}
          .queue-row-check{width:18px;height:18px}.queue-status-dot{width:10px;height:10px;border-radius:50%;background:rgba(148,163,184,.5)}
          .queue-row-main{min-width:0;display:grid;gap:6px}.queue-row-title{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.queue-row-title>b{font-size:15px}
          .queue-badge{display:inline-flex;align-items:center;padding:3px 7px;border:1px solid rgba(148,163,184,.2);border-radius:999px;font-size:10px;font-weight:750;letter-spacing:.03em}
          .queue-row-meta,.queue-row-insight{display:flex;gap:8px 14px;flex-wrap:wrap;color:var(--muted);font-size:12px}.queue-row-insight b{color:inherit}
          .queue-review-card{scroll-margin-top:20px}.queue-analysis-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:16px}
          .queue-analysis-grid>div,.queue-resolved-summary>div{padding:13px;border:1px solid rgba(148,163,184,.17);border-radius:14px;display:grid;gap:4px}.queue-analysis-grid span,.queue-resolved-summary span{color:var(--muted);font-size:11px}
          .queue-analysis-note{margin-top:12px;padding:14px 15px;border:1px solid rgba(99,102,241,.2);border-radius:14px;background:rgba(99,102,241,.05)}.queue-analysis-note p{margin:5px 0 0;color:var(--muted)}
          .queue-resolved-summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:16px}
          .queue-decision-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:18px}.queue-decision-card{padding:17px;border:1px solid rgba(148,163,184,.18);border-radius:18px;display:grid;gap:12px}.queue-decision-card.is-match{border-color:rgba(34,197,94,.26);background:rgba(34,197,94,.035)}
          .queue-decision-card h3,.queue-decision-card p{margin:0}.queue-suggestions{display:flex;gap:7px;flex-wrap:wrap}.queue-suggestions button{display:inline-flex;align-items:center;gap:7px}.queue-suggestions small{opacity:.7}
          .queue-match-results{display:grid;gap:6px;max-height:190px;overflow:auto}.queue-match-results button{display:flex;justify-content:space-between;gap:12px;text-align:left;padding:9px 11px;border:1px solid rgba(148,163,184,.16);border-radius:11px;background:transparent;color:inherit}.queue-match-results small{color:var(--muted)}
          .queue-add-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.queue-decision-action{margin-top:4px;width:100%}
          .queue-admin-notes{margin-top:14px}.queue-admin-notes textarea{width:100%;resize:vertical}
          .queue-ignore-zone{margin-top:14px;padding:14px 15px;border:1px dashed rgba(148,163,184,.25);border-radius:15px;display:flex;align-items:center;justify-content:space-between;gap:14px}.queue-ignore-zone>div{display:grid;gap:3px}.queue-ignore-zone span{color:var(--muted);font-size:12px}
          @media(max-width:900px){.queue-stat-grid{grid-template-columns:1fr 1fr}.queue-filter-grid{grid-template-columns:1fr 1fr}.queue-filter-grid .field:first-child{grid-column:1/-1}.queue-decision-grid{grid-template-columns:1fr}}
          @media(max-width:620px){.queue-stat-grid,.queue-analysis-grid,.queue-resolved-summary,.queue-add-grid,.queue-filter-grid{grid-template-columns:1fr}.queue-filter-grid .field:first-child{grid-column:auto}.queue-row{grid-template-columns:auto minmax(0,1fr)}.queue-row>button{grid-column:1/-1;width:100%}.queue-bulk-bar,.queue-ignore-zone{align-items:stretch;flex-direction:column}.queue-tabs{display:grid;grid-template-columns:1fr 1fr}.queue-tabs button{justify-content:center}.queue-stat b{font-size:22px}}
        `}</style>
      </section>
    </AppShell>
  );
}
