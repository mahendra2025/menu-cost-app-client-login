'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import AppShell from '../../components/AppShell';

type Suggestion = {
  id: string;
  name: string;
  categoryHint: string;
  tenantId: string;
  sourceFileName: string;
  occurrences: number;
  createdAt: string;
  updatedAt: string;
};

type EditableSuggestion =
  Suggestion & {
    dishName: string;
    category: string;
    subcategory: string;
    rate: string;
  };

export default function NewDishesPage() {
  const [rows, setRows] =
    useState<EditableSuggestion[]>(
      [],
    );
  const [categories, setCategories] =
    useState<string[]>([]);
  const [loading, setLoading] =
    useState(true);
  const [workingId, setWorkingId] =
    useState('');
  const [message, setMessage] =
    useState('');
  const [messageType, setMessageType] =
    useState<'success' | 'error'>(
      'success',
    );
  const [query, setQuery] =
    useState('');

  async function loadQueue() {
    setLoading(true);
    setMessage('');

    try {
      const [
        queueResponse,
        catalogResponse,
      ] = await Promise.all([
        fetch(
          '/api/admin/dish-suggestions',
          { cache: 'no-store' },
        ),
        fetch('/api/admin/dishes', {
          cache: 'no-store',
        }),
      ]);
      const queueData =
        await queueResponse.json();
      const catalogData =
        await catalogResponse.json();

      if (!queueResponse.ok) {
        throw new Error(
          queueData.error ||
            'Could not load new dishes',
        );
      }

      const availableCategories =
        Array.isArray(
          catalogData.categories,
        )
          ? catalogData.categories
              .map(String)
              .filter(Boolean)
          : ['Other'];

      setCategories(
        availableCategories,
      );
      setRows(
        (
          queueData.suggestions ||
          []
        ).map(
          (
            suggestion: Suggestion,
          ): EditableSuggestion => ({
            ...suggestion,
            dishName:
              suggestion.name,
            category:
              availableCategories.includes(
                suggestion.categoryHint,
              )
                ? suggestion.categoryHint
                : 'Other',
            subcategory: '',
            rate: '',
          }),
        ),
      );
    } catch (error) {
      setMessageType('error');
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not load new dishes',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadQueue();
  }, []);

  function updateRow(
    id: string,
    changes: Partial<
      EditableSuggestion
    >,
  ) {
    setRows((current) =>
      current.map((row) =>
        row.id === id
          ? { ...row, ...changes }
          : row,
      ),
    );
  }

  async function approve(
    row: EditableSuggestion,
  ) {
    if (
      !row.dishName.trim() ||
      !row.category
    ) {
      setMessageType('error');
      setMessage(
        'Enter a dish name and category before adding it.',
      );
      return;
    }

    setWorkingId(row.id);
    setMessage('');

    try {
      const response = await fetch(
        '/api/admin/dish-suggestions',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            id: row.id,
            name: row.dishName,
            category: row.category,
            subcategory:
              row.subcategory,
            rate:
              Number(row.rate) || 0,
          }),
        },
      );
      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Could not add the dish',
        );
      }

      setRows((current) =>
        current.filter(
          (item) =>
            item.id !== row.id,
        ),
      );
      setMessageType('success');
      setMessage(
        `${row.dishName.trim()} was added to the Dish Catalog.`,
      );
    } catch (error) {
      setMessageType('error');
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not add the dish',
      );
    } finally {
      setWorkingId('');
    }
  }

  async function reject(
    row: EditableSuggestion,
  ) {
    setWorkingId(row.id);
    setMessage('');

    try {
      const response = await fetch(
        `/api/admin/dish-suggestions?id=${encodeURIComponent(row.id)}`,
        { method: 'DELETE' },
      );
      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Could not remove the suggestion',
        );
      }

      setRows((current) =>
        current.filter(
          (item) =>
            item.id !== row.id,
        ),
      );
      setMessageType('success');
      setMessage(
        `${row.name} was removed from the review queue.`,
      );
    } catch (error) {
      setMessageType('error');
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not remove the suggestion',
      );
    } finally {
      setWorkingId('');
    }
  }

  const visibleRows = useMemo(() => {
    const search =
      query.trim().toLowerCase();

    if (!search) return rows;

    return rows.filter((row) =>
      [
        row.name,
        row.categoryHint,
        row.sourceFileName,
      ].some((value) =>
        value
          .toLowerCase()
          .includes(search),
      ),
    );
  }, [query, rows]);

  return (
    <AppShell
      title="New Dishes"
      subtitle="Review possible dishes found in client uploads before adding them to the shared catalog"
    >
      <section className="content-grid">
        <div className="new-dish-overview">
          <div>
            <span className="section-kicker">
              Review queue
            </span>
            <h2>
              {rows.length
                ? `${rows.length} possible new ${rows.length === 1 ? 'dish' : 'dishes'}`
                : 'No dishes waiting'}
            </h2>
            <p>
              Client menus contain only
              approved catalog dishes.
              Review each suggestion here
              before publishing it.
            </p>
          </div>
          <button
            className="ghost-button"
            type="button"
            onClick={() =>
              void loadQueue()
            }
            disabled={loading}
          >
            {loading
              ? 'Refreshing…'
              : 'Refresh queue'}
          </button>
        </div>

        {message ? (
          <div
            className={`admin-message ${messageType}`}
            role="status"
          >
            {message}
          </div>
        ) : null}

        <div className="glass-card new-dish-queue">
          <div className="new-dish-toolbar">
            <div>
              <h2>Uploaded suggestions</h2>
              <p>
                Correct the name, choose
                its category and rate,
                then add it to the
                database.
              </p>
            </div>
            <input
              className="input"
              value={query}
              onChange={(event) =>
                setQuery(
                  event.target.value,
                )
              }
              placeholder="Search suggestions…"
              aria-label="Search new dish suggestions"
            />
          </div>

          {loading ? (
            <div className="admin-empty">
              <strong>
                Loading new dishes…
              </strong>
            </div>
          ) : null}

          {!loading &&
          !visibleRows.length ? (
            <div className="admin-empty">
              <strong>
                {rows.length
                  ? 'No matching suggestions'
                  : 'The review queue is clear'}
              </strong>
              <span>
                New candidates from client
                menu uploads will appear
                here.
              </span>
            </div>
          ) : null}

          <div className="new-dish-list">
            {visibleRows.map((row) => (
              <article
                className="new-dish-card"
                key={row.id}
              >
                <div className="new-dish-source">
                  <div>
                    <span>
                      Detected text
                    </span>
                    <strong>
                      {row.name}
                    </strong>
                  </div>
                  <div>
                    <b>
                      Seen{' '}
                      {row.occurrences}{' '}
                      {row.occurrences === 1
                        ? 'time'
                        : 'times'}
                    </b>
                    <small>
                      {row.sourceFileName ||
                        'Pasted menu'}
                    </small>
                  </div>
                </div>

                <div className="new-dish-fields">
                  <div className="field">
                    <label>
                      Dish name
                    </label>
                    <input
                      className="input"
                      value={
                        row.dishName
                      }
                      onChange={(event) =>
                        updateRow(row.id, {
                          dishName:
                            event.target
                              .value,
                        })
                      }
                    />
                  </div>
                  <div className="field">
                    <label>
                      Category
                    </label>
                    <select
                      className="select"
                      value={row.category}
                      onChange={(event) =>
                        updateRow(row.id, {
                          category:
                            event.target
                              .value,
                        })
                      }
                    >
                      {categories.map(
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
                  </div>
                  <div className="field">
                    <label>
                      Subcategory
                    </label>
                    <input
                      className="input"
                      value={
                        row.subcategory
                      }
                      onChange={(event) =>
                        updateRow(row.id, {
                          subcategory:
                            event.target
                              .value,
                        })
                      }
                      placeholder="Optional"
                    />
                  </div>
                  <div className="field">
                    <label>
                      Rate per serving
                    </label>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.rate}
                      onChange={(event) =>
                        updateRow(row.id, {
                          rate:
                            event.target
                              .value,
                        })
                      }
                      placeholder="₹ 0"
                    />
                  </div>
                </div>

                <div className="new-dish-actions">
                  <span>
                    Suggested category:{' '}
                    <b>
                      {row.categoryHint}
                    </b>
                  </span>
                  <button
                    className="danger-button"
                    type="button"
                    onClick={() =>
                      void reject(row)
                    }
                    disabled={
                      Boolean(workingId)
                    }
                  >
                    Reject
                  </button>
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() =>
                      void approve(row)
                    }
                    disabled={
                      Boolean(workingId)
                    }
                  >
                    {workingId === row.id
                      ? 'Saving…'
                      : 'Add to Dish Catalog'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
