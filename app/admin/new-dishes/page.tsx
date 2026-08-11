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
    saveAs: 'new' | 'alias';
    aliasCategory: string;
    aliasTarget: string;
  };

type CatalogDish = {
  name: string;
  category: string;
  rate: number;
  aliases: string[];
};

type GoogleDishResult = {
  title: string;
  link: string;
  snippet: string;
};

type DishVerification = {
  loading: boolean;
  searched: boolean;
  confirmed: boolean;
  automatic: boolean;
  searchUrl: string;
  results: GoogleDishResult[];
  error: string;
};

export default function NewDishesPage() {
  const [rows, setRows] =
    useState<EditableSuggestion[]>(
      [],
    );
  const [categories, setCategories] =
    useState<string[]>([]);
  const [catalogDishes, setCatalogDishes] =
    useState<CatalogDish[]>([]);
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
  const [verifications, setVerifications] =
    useState<Record<string, DishVerification>>({});

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
      setCatalogDishes(
        Array.isArray(catalogData.items)
          ? catalogData.items
              .map((item: Record<string, unknown>) => ({
                name: String(item.name || '').trim(),
                category: String(item.category || '').trim(),
                rate: Math.max(Number(item.rate) || 0, 0),
                aliases: Array.isArray(item.aliases)
                  ? item.aliases.map(String).filter(Boolean)
                  : [],
              }))
              .filter((item: CatalogDish) => item.name)
          : [],
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
            saveAs: 'new',
            aliasCategory: '',
            aliasTarget: '',
          }),
        ),
      );
      setVerifications({});
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

    if (changes.dishName !== undefined) {
      setVerifications((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    }
  }

  async function verifyOnGoogle(
    row: EditableSuggestion,
  ) {
    const dishName =
      row.dishName.trim();

    if (!dishName) {
      setMessageType('error');
      setMessage(
        'Enter the dish name before searching Google.',
      );
      return;
    }

    setVerifications((current) => ({
      ...current,
      [row.id]: {
        loading: true,
        searched: false,
        confirmed: false,
        automatic: false,
        searchUrl: '',
        results: [],
        error: '',
      },
    }));

    try {
      const response = await fetch(
        `/api/admin/dish-suggestions/google-search?q=${encodeURIComponent(dishName)}`,
        { cache: 'no-store' },
      );
      const data = await response.json() as {
        configured?: boolean;
        searchUrl?: string;
        results?: GoogleDishResult[];
        error?: string;
      };
      const searchUrl =
        String(data.searchUrl || '');

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Google search failed',
        );
      }

      const results =
        Array.isArray(data.results)
          ? data.results
          : [];

      setVerifications((current) => ({
        ...current,
        [row.id]: {
          loading: false,
          searched: true,
          confirmed: false,
          automatic:
            Boolean(data.configured),
          searchUrl,
          results,
          error: '',
        },
      }));

      if (!data.configured && searchUrl) {
        window.open(
          searchUrl,
          '_blank',
          'noopener,noreferrer',
        );
      }
    } catch (error) {
      setVerifications((current) => ({
        ...current,
        [row.id]: {
          loading: false,
          searched: false,
          confirmed: false,
          automatic: false,
          searchUrl: '',
          results: [],
          error:
            error instanceof Error
              ? error.message
              : 'Google search failed',
        },
      }));
    }
  }

  function confirmGoogleDish(id: string) {
    setVerifications((current) => ({
      ...current,
      [id]: {
        ...current[id],
        confirmed: true,
      },
    }));
  }

  async function approve(
    row: EditableSuggestion,
  ) {
    const verification =
      verifications[row.id];
    const aliasTarget = catalogDishes.find(
      (dish) =>
        dish.name.toLowerCase() ===
          row.aliasTarget.trim().toLowerCase() &&
        dish.category.toLowerCase() ===
          row.aliasCategory.trim().toLowerCase(),
    );

    if (
      !row.dishName.trim() ||
      (row.saveAs === 'new' &&
        (!row.category || !(Number(row.rate) > 0))) ||
      (row.saveAs === 'alias' &&
        (!row.aliasCategory || !aliasTarget)) ||
      !verification?.confirmed
    ) {
      setMessageType('error');
      setMessage(
        row.saveAs === 'alias'
          ? 'Verify the dish on Google, then choose an existing catalog dish for this alias.'
          : 'Verify the dish on Google, then enter its name, category, and a positive manual rate.',
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
            mode: row.saveAs,
            aliasOf: aliasTarget?.name || '',
            googleVerified: true,
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
        row.saveAs === 'alias'
          ? `${row.dishName.trim()} was added as an alias of ${aliasTarget?.name}.`
          : `${row.dishName.trim()} was added to the Dish Catalog.`,
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
        row.dishName,
        row.aliasCategory,
        row.aliasTarget,
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
      subtitle="Review dishes found in client uploads and add each one to Available Dishes as a new dish or an alias"
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
                For each incoming dish,
                choose one of two options:
                create a new available dish
                or link the name as an alias.
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

                <div className="new-dish-verification">
                  <div className="new-dish-verification-heading">
                    <div>
                      <b>Google dish verification</b>
                      <span>
                        Search for food or recipe evidence, review it, then confirm manually.
                      </span>
                    </div>
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() =>
                        void verifyOnGoogle(row)
                      }
                      disabled={
                        Boolean(workingId) ||
                        verifications[row.id]
                          ?.loading
                      }
                    >
                      {verifications[row.id]
                        ?.loading
                        ? 'Searching…'
                        : 'Search Google'}
                    </button>
                  </div>

                  {verifications[row.id]
                    ?.error ? (
                    <p className="new-dish-verification-error">
                      {verifications[row.id].error}
                    </p>
                  ) : null}

                  {verifications[row.id]
                    ?.searched ? (
                    <div className="new-dish-search-results">
                      {verifications[row.id]
                        .results.length ? (
                        verifications[row.id]
                          .results.map(
                            (result) => (
                              <a
                                href={result.link}
                                key={result.link}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <b>{result.title}</b>
                                <span>{result.snippet}</span>
                              </a>
                            ),
                          )
                      ) : (
                        <p>
                          Review the Google results in the opened tab. Automatic in-app results require the optional Google API configuration.
                        </p>
                      )}

                      <div className="new-dish-verification-confirm">
                        {verifications[row.id]
                          .searchUrl ? (
                          <a
                            href={verifications[row.id].searchUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open full Google search
                          </a>
                        ) : null}
                        <button
                          type="button"
                          onClick={() =>
                            confirmGoogleDish(
                              row.id,
                            )
                          }
                          disabled={
                            verifications[row.id]
                              .confirmed
                          }
                        >
                          {verifications[row.id]
                            .confirmed
                            ? '✓ Dish confirmed'
                            : 'Confirm this is a dish'}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="new-dish-save-choice">
                  <span>Add to Available Dishes as</span>
                  <div role="group" aria-label={`How to add ${row.dishName}`}>
                    <button
                      type="button"
                      className={row.saveAs === 'new' ? 'active' : ''}
                      aria-pressed={row.saveAs === 'new'}
                      onClick={() => updateRow(row.id, {
                        saveAs: 'new',
                        aliasCategory: '',
                        aliasTarget: '',
                      })}
                    >
                      New Dish
                    </button>
                    <button
                      type="button"
                      className={row.saveAs === 'alias' ? 'active' : ''}
                      aria-pressed={row.saveAs === 'alias'}
                      onClick={() => updateRow(row.id, {
                        saveAs: 'alias',
                      })}
                    >
                      Alias of Available Dish
                    </button>
                  </div>
                </div>

                <div className="new-dish-fields">
                  <div className="field">
                    <label>
                      {row.saveAs === 'alias' ? 'Alias name' : 'Dish name'}
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
                  {row.saveAs === 'alias' ? (
                    <>
                    <div className="field">
                      <label>Present dish category</label>
                      <select
                        className="select"
                        value={row.aliasCategory}
                        onChange={(event) =>
                          updateRow(row.id, {
                            aliasCategory: event.target.value,
                            aliasTarget: '',
                          })
                        }
                      >
                        <option value="">Select category…</option>
                        {Array.from(new Set(
                          catalogDishes.map((dish) => dish.category).filter(Boolean),
                        )).sort((left, right) => left.localeCompare(right)).map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label>Present catalog dish</label>
                      <select
                        className="select"
                        value={row.aliasTarget}
                        onChange={(event) =>
                          updateRow(row.id, {
                            aliasTarget: event.target.value,
                          })
                        }
                        disabled={!row.aliasCategory}
                      >
                        <option value="">
                          {row.aliasCategory
                            ? 'Select present dish…'
                            : 'Select category first…'}
                        </option>
                        {catalogDishes
                          .filter((dish) => dish.category === row.aliasCategory)
                          .map((dish) => (
                            <option key={dish.name} value={dish.name}>
                              {dish.name} · ₹{dish.rate}
                            </option>
                          ))}
                      </select>
                    </div>
                    </>
                  ) : (
                  <><div className="field">
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
                      min="0.01"
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
                  </>
                  )}
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
                      Boolean(workingId) ||
                      !verifications[row.id]
                        ?.confirmed ||
                      (row.saveAs === 'new'
                        ? !(Number(row.rate) > 0)
                        : !row.aliasCategory || !catalogDishes.some(
                            (dish) =>
                              dish.name.toLowerCase() === row.aliasTarget.trim().toLowerCase() &&
                              dish.category.toLowerCase() === row.aliasCategory.trim().toLowerCase(),
                          ))
                    }
                  >
                    {workingId === row.id
                      ? 'Saving…'
                      : row.saveAs === 'alias'
                        ? 'Add as Alias'
                        : 'Add as New Dish'}
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
