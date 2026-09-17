'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import AppShell from '../../../components/AppShell';

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
  matchedDishName: string;
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

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat(
    'en-IN',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    },
  ).format(date);
}

export default function UnknownDishQueuePage() {
  const [items, setItems] =
    useState<PendingDish[]>([]);
  const [dishOptions, setDishOptions] =
    useState<DishOption[]>([]);
  const [categories, setCategories] =
    useState<string[]>(['Other']);
  const [pendingCount, setPendingCount] =
    useState(0);
  const [selectedId, setSelectedId] =
    useState<string | null>(null);
  const [draft, setDraft] =
    useState<ReviewDraft>(emptyDraft);
  const [loading, setLoading] =
    useState(true);
  const [busy, setBusy] =
    useState(false);
  const [message, setMessage] =
    useState('');
  const [messageType, setMessageType] =
    useState<'success' | 'error'>('success');

  const selected = useMemo(
    () =>
      items.find(
        (item) =>
          item.id === selectedId,
      ) ?? null,
    [items, selectedId],
  );

  const totalOccurrences = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum +
          Math.max(
            0,
            Number(item.occurrences) || 0,
          ),
        0,
      ),
    [items],
  );

  const matchingDishes = useMemo(() => {
    const query =
      draft.targetDishName
        .trim()
        .toLocaleLowerCase('en-IN');

    if (!query) {
      return dishOptions.slice(0, 8);
    }

    return dishOptions
      .filter((dish) =>
        dish.name
          .toLocaleLowerCase('en-IN')
          .includes(query) ||
        dish.category
          .toLocaleLowerCase('en-IN')
          .includes(query),
      )
      .slice(0, 12);
  }, [dishOptions, draft.targetDishName]);

  async function loadData() {
    setLoading(true);

    try {
      const [queueResponse, dishesResponse] =
        await Promise.all([
          fetch(
            '/api/admin/dishes/pending',
            { cache: 'no-store' },
          ),
          fetch(
            '/api/admin/dishes',
            { cache: 'no-store' },
          ),
        ]);

      const queueData =
        await queueResponse.json();
      const dishesData =
        await dishesResponse.json();

      if (!queueResponse.ok) {
        throw new Error(
          queueData.error ||
          'Could not load unknown dishes.',
        );
      }

      if (!dishesResponse.ok) {
        throw new Error(
          dishesData.error ||
          'Could not load Dish Master.',
        );
      }

      const nextItems =
        Array.isArray(queueData.items)
          ? queueData.items as PendingDish[]
          : [];
      const nextDishes =
        Array.isArray(dishesData.items)
          ? (dishesData.items as DishOption[])
              .filter((dish) =>
                Boolean(
                  String(
                    dish?.name || '',
                  ).trim(),
                ),
              )
          : [];
      const nextCategories =
        Array.isArray(dishesData.categories)
          ? dishesData.categories
              .map((category: unknown) =>
                String(category || '').trim(),
              )
              .filter(Boolean)
          : [];

      setItems(nextItems);
      setDishOptions(nextDishes);
      setPendingCount(
        Math.max(
          0,
          Number(queueData.pendingCount) ||
          nextItems.length,
        ),
      );
      setCategories(
        Array.from(
          new Set([
            ...nextCategories,
            ...nextItems
              .map((item) =>
                item.categoryHint,
              )
              .filter(Boolean),
            'Other',
          ]),
        ).sort((left, right) =>
          left.localeCompare(right),
        ),
      );

      if (
        selectedId &&
        !nextItems.some(
          (item) =>
            item.id === selectedId,
        )
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
    void loadData();
  }, []);

  function beginReview(item: PendingDish) {
    setSelectedId(item.id);
    setMessage('');
    setDraft({
      name: item.name,
      category:
        item.categoryHint || 'Other',
      subcategory: '',
      rate: '',
      servingQuantity: '1',
      servingUnit: 'serving',
      aliases: '',
      targetDishName: '',
      adminNotes: '',
    });
  }

  async function submitAction(
    action:
      | 'ADD_NEW'
      | 'MATCH_EXISTING'
      | 'IGNORE',
  ) {
    if (!selected) return;

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

    setBusy(true);
    setMessage('');

    try {
      const response = await fetch(
        '/api/admin/dishes/pending',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            id: selected.id,
            action,
            name: draft.name,
            category: draft.category,
            subcategory:
              draft.subcategory,
            rate: Number(draft.rate),
            servingQuantity:
              Number(
                draft.servingQuantity,
              ),
            servingUnit:
              draft.servingUnit,
            aliases: draft.aliases,
            targetDishName:
              draft.targetDishName,
            adminNotes:
              draft.adminNotes,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          'Could not save this review.',
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
      await loadData();
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

  return (
    <AppShell
      title="Dishes"
      subtitle="Review unknown menu dishes and teach the database"
    >
      <section className="content-grid">
        <div className="glass-card">
          <div className="section-head">
            <div>
              <div className="section-kicker">
                Learning queue
              </div>
              <h2>Unknown Dishes</h2>
              <p className="muted">
                These names came from customer menu uploads but were not confidently found in Dish Master.
              </p>
            </div>

            <button
              className="ghost-button"
              type="button"
              onClick={() =>
                void loadData()
              }
              disabled={loading || busy}
            >
              {loading
                ? 'Refreshing…'
                : 'Refresh'}
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 12,
              marginTop: 16,
            }}
          >
            <div className="glass-card">
              <small className="muted">
                Pending dishes
              </small>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  marginTop: 6,
                }}
              >
                {pendingCount}
              </div>
            </div>
            <div className="glass-card">
              <small className="muted">
                Upload occurrences
              </small>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  marginTop: 6,
                }}
              >
                {totalOccurrences}
              </div>
            </div>
            <div className="glass-card">
              <small className="muted">
                Dish Master
              </small>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  marginTop: 6,
                }}
              >
                {dishOptions.length.toLocaleString(
                  'en-IN',
                )}
              </div>
            </div>
          </div>
        </div>

        {message ? (
          <div
            className={
              messageType === 'error'
                ? 'alert-card'
                : 'glass-card'
            }
          >
            <b>
              {messageType === 'error'
                ? 'Needs attention'
                : 'Saved'}
            </b>
            <p style={{ marginBottom: 0 }}>
              {message}
            </p>
          </div>
        ) : null}

        <div className="glass-card">
          <div className="section-head">
            <div>
              <div className="section-kicker">
                Pending review
              </div>
              <h2>Customer-uploaded names</h2>
            </div>
          </div>

          {loading ? (
            <p className="muted">
              Loading unknown dishes…
            </p>
          ) : items.length === 0 ? (
            <div
              style={{
                padding: '24px 0 8px',
              }}
            >
              <h3>Queue is clear</h3>
              <p className="muted">
                New unknown dish names will appear here automatically after customer menu uploads.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gap: 10,
                marginTop: 12,
              }}
            >
              {items.map((item) => (
                <article
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent:
                      'space-between',
                    gap: 14,
                    flexWrap: 'wrap',
                    padding: '14px 16px',
                    border:
                      selectedId === item.id
                        ? '2px solid currentColor'
                        : '1px solid rgba(127, 127, 127, 0.22)',
                    borderRadius: 16,
                  }}
                >
                  <div
                    style={{
                      minWidth: 0,
                      flex: '1 1 260px',
                    }}
                  >
                    <b>{item.name}</b>
                    <div
                      className="muted"
                      style={{
                        marginTop: 5,
                        fontSize: 13,
                      }}
                    >
                      {item.categoryHint ||
                        'Other'}
                      {' · '}
                      {item.occurrences}{' '}
                      upload
                      {item.occurrences === 1
                        ? ''
                        : 's'}
                      {item.sourceFileName
                        ? ` · ${item.sourceFileName}`
                        : ''}
                      {item.updatedAt
                        ? ` · ${formatDate(item.updatedAt)}`
                        : ''}
                    </div>
                  </div>

                  <button
                    className={
                      selectedId === item.id
                        ? 'primary-button'
                        : 'ghost-button'
                    }
                    type="button"
                    onClick={() =>
                      beginReview(item)
                    }
                  >
                    {selectedId === item.id
                      ? 'Reviewing'
                      : 'Review'}
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>

        {selected ? (
          <div className="glass-card">
            <div className="section-head">
              <div>
                <div className="section-kicker">
                  Review unknown dish
                </div>
                <h2>{selected.name}</h2>
                <p className="muted">
                  Choose one permanent action. Matching is best when this is only another name for an existing dish.
                </p>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(190px, 1fr))',
                gap: 12,
                marginTop: 16,
              }}
            >
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
                      category:
                        event.target.value,
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
                      subcategory:
                        event.target.value,
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
                  inputMode="decimal"
                  value={
                    draft.servingQuantity
                  }
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      servingQuantity:
                        event.target.value,
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
                      servingUnit:
                        event.target.value,
                    }))
                  }
                >
                  <option value="serving">
                    serving
                  </option>
                  <option value="gram">
                    gram
                  </option>
                  <option value="ml">
                    ml
                  </option>
                  <option value="piece">
                    piece
                  </option>
                </select>
              </label>
            </div>

            <label
              className="field"
              style={{ marginTop: 12 }}
            >
              <span>Extra aliases</span>
              <input
                value={draft.aliases}
                placeholder="Angoor Rabdi, Royal Rabdi"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    aliases:
                      event.target.value,
                  }))
                }
              />
            </label>

            <div
              style={{
                marginTop: 22,
                paddingTop: 18,
                borderTop:
                  '1px solid rgba(127, 127, 127, 0.22)',
              }}
            >
              <div className="section-kicker">
                Or match existing
              </div>
              <h3 style={{ marginTop: 6 }}>
                Same dish, different name
              </h3>

              <label className="field">
                <span>Search Dish Master</span>
                <input
                  value={
                    draft.targetDishName
                  }
                  placeholder="Type Paneer Handi…"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      targetDishName:
                        event.target.value,
                    }))
                  }
                />
              </label>

              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  flexWrap: 'wrap',
                  marginTop: 10,
                }}
              >
                {matchingDishes.map((dish) => (
                  <button
                    key={dish.name}
                    className="ghost-button"
                    type="button"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        targetDishName:
                          dish.name,
                      }))
                    }
                  >
                    {dish.name}
                    {' · '}
                    {dish.category}
                  </button>
                ))}
              </div>
            </div>

            <label
              className="field"
              style={{ marginTop: 18 }}
            >
              <span>Admin notes</span>
              <textarea
                rows={3}
                value={draft.adminNotes}
                placeholder="Optional note"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    adminNotes:
                      event.target.value,
                  }))
                }
              />
            </label>

            <div
              className="action-row"
              style={{
                justifyContent: 'flex-start',
                flexWrap: 'wrap',
                marginTop: 18,
              }}
            >
              <button
                className="primary-button"
                type="button"
                disabled={busy}
                onClick={() =>
                  void submitAction(
                    'ADD_NEW',
                  )
                }
              >
                {busy
                  ? 'Saving…'
                  : 'Add as New Dish'}
              </button>

              <button
                className="ghost-button"
                type="button"
                disabled={busy}
                onClick={() =>
                  void submitAction(
                    'MATCH_EXISTING',
                  )
                }
              >
                Match Existing
              </button>

              <button
                className="ghost-button"
                type="button"
                disabled={busy}
                onClick={() =>
                  void submitAction(
                    'IGNORE',
                  )
                }
              >
                Ignore
              </button>

              <button
                className="ghost-button"
                type="button"
                disabled={busy}
                onClick={() => {
                  setSelectedId(null);
                  setDraft(emptyDraft());
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
