'use client';

import Link from 'next/link';

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

type ClientIngredientRate =
  IngredientRate & {
    defaultRate: number;
    isCustomRate: boolean;
    customUpdatedAt?: string | null;
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

export default function ClientIngredientIndexPage() {
  const [rates, setRates] =
    useState<
      ClientIngredientRate[]
    >([]);

  const [usage, setUsage] =
    useState<UsageMap>({});

  const [query, setQuery] =
    useState('');

  const [category, setCategory] =
    useState('ALL');

  const [ready, setReady] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState('');

  const [changedIds, setChangedIds] =
    useState<Set<string>>(
      new Set(),
    );

  const [resetIds, setResetIds] =
    useState<Set<string>>(
      new Set(),
    );

  useEffect(() => {
    void loadIngredients();
  }, []);

  async function loadIngredients() {
    setReady(false);

    try {
      const response =
        await fetch(
          '/api/client/ingredients',
          {
            cache: 'no-store',
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Could not load ingredients.',
        );
      }

      setRates(
        Array.isArray(
          data.rates,
        )
          ? data.rates
          : [],
      );

      setUsage(
        data.usage &&
        typeof data.usage ===
          'object'
          ? data.usage
          : {},
      );

      setChangedIds(
        new Set(),
      );

      setResetIds(
        new Set(),
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not load ingredients.',
      );
    } finally {
      setReady(true);
    }
  }

  const categories =
    useMemo(
      () =>
        Array.from(
          new Set(
            rates.map(
              (rate) =>
                rate.category,
            ),
          ),
        ).sort(),
      [rates],
    );

  const filteredRates =
    useMemo(() => {
      const search =
        query
          .trim()
          .toLowerCase();

      return rates
        .filter((rate) => {
          return (
            (
              category ===
                'ALL' ||
              rate.category ===
                category
            ) &&
            (
              !search ||
              rate.name
                .toLowerCase()
                .includes(
                  search,
                ) ||
              rate.category
                .toLowerCase()
                .includes(
                  search,
                )
            )
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
      rates,
      query,
      category,
    ]);

  function updateRate(
    id: string,
    value: number,
  ) {
    setRates(
      (current) =>
        current.map(
          (rate) =>
            rate.id === id
              ? {
                  ...rate,
                  rate: value,
                  isCustomRate:
                    true,
                }
              : rate,
        ),
    );

    setChangedIds(
      (current) => {
        const next =
          new Set(current);

        next.add(id);

        return next;
      },
    );

    setResetIds(
      (current) => {
        const next =
          new Set(current);

        next.delete(id);

        return next;
      },
    );
  }

  function useAdminRate(
    row: ClientIngredientRate,
  ) {
    setRates(
      (current) =>
        current.map(
          (rate) =>
            rate.id === row.id
              ? {
                  ...rate,
                  rate:
                    row.defaultRate,
                  isCustomRate:
                    false,
                }
              : rate,
        ),
    );

    setChangedIds(
      (current) => {
        const next =
          new Set(current);

        next.delete(
          row.id,
        );

        return next;
      },
    );

    setResetIds(
      (current) => {
        const next =
          new Set(current);

        next.add(
          row.id,
        );

        return next;
      },
    );
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

  async function saveMyRates() {
    if (
      !changedIds.size &&
      !resetIds.size
    ) return;

    const changedRates =
      rates
        .filter(
          (rate) =>
            changedIds.has(
              rate.id,
            ),
        )
        .map((rate) => ({
          ingredientId:
            rate.id,

          rate:
            Number(
              rate.rate,
            ),
        }));

    const invalid =
      changedRates.find(
        (item) =>
          !Number.isFinite(
            item.rate,
          ) ||
          item.rate <= 0,
      );

    if (invalid) {
      setMessage(
        'Every personal rate must be greater than ₹0.',
      );

      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const response =
        await fetch(
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
                  changedRates,

                resetIngredientIds:
                  Array.from(
                    resetIds,
                  ),
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Could not save your rates.',
        );
      }

      await refreshCurrentMenuCosts();

      await loadIngredients();

      setMessage(
        'Your ingredient rates are saved. Your current and future dish costing now uses your personal rates.',
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not save your rates.',
      );
    } finally {
      setSaving(false);
    }
  }

  const customCount =
    rates.filter(
      (rate) =>
        rate.isCustomRate,
    ).length;

  const unsavedCount =
    changedIds.size +
    resetIds.size;

  return (
    <AppShell
      title="Ingredient Index"
      subtitle="Set your own ingredient purchase rates without changing any other user's rates"
    >
      <section className="content-grid">

        <div className="stat-grid">
          <div className="stat-card">
            <small>
              Ingredients
            </small>
            <strong>
              {rates.length}
            </strong>
            <span>
              Admin master
            </span>
          </div>

          <div className="stat-card">
            <small>
              My custom rates
            </small>
            <strong>
              {customCount}
            </strong>
            <span>
              Only your account
            </span>
          </div>

          <div className="stat-card">
            <small>
              Admin defaults
            </small>
            <strong>
              {
                rates.length -
                customCount
              }
            </strong>
            <span>
              Using master rate
            </span>
          </div>

          <div className="stat-card">
            <small>
              Unsaved
            </small>
            <strong>
              {unsavedCount}
            </strong>
            <span>
              Rate changes
            </span>
          </div>
        </div>

        <div className="glass-card">
          <div className="dish-list-heading">
            <div>
              <span className="section-kicker">
                Personal costing
              </span>

              <h2>
                My Ingredient Rates
              </h2>

              <p className="muted">
                You can edit only the rate.
                Ingredient name, category and
                purchase unit are controlled by
                the Admin Ingredient Master.
              </p>
            </div>

            <div className="action-row">
              <button
                className="primary-button"
                type="button"
                disabled={
                  saving ||
                  unsavedCount === 0
                }
                onClick={() =>
                  void saveMyRates()
                }
              >
                {saving
                  ? 'Saving…'
                  : `Save My Rates${
                      unsavedCount
                        ? ` (${unsavedCount})`
                        : ''
                    }`}
              </button>

              <Link
                href="/app/profile"
                className="ghost-button"
              >
                Profile
              </Link>
            </div>
          </div>

          {message ? (
            <div className="admin-message">
              {message}
            </div>
          ) : null}
        </div>

        <div className="glass-card">
          <div className="ingredient-filter-grid">
            <div className="field">
              <label>
                Search
              </label>

              <input
                className="input"
                value={query}
                placeholder="Search ingredient..."
                onChange={(event) =>
                  setQuery(
                    event.target.value,
                  )
                }
              />
            </div>

            <div className="field">
              <label>
                Category
              </label>

              <select
                className="select"
                value={category}
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
            </div>
          </div>
        </div>

        <div className="glass-card ingredient-list-card">
          <div className="dish-list-heading">
            <div>
              <span className="section-kicker">
                Tenant rates
              </span>

              <h2>
                Ingredient Index
              </h2>
            </div>

            <span className="badge">
              {
                filteredRates.length
              }{' '}
              ingredients
            </span>
          </div>

          {!ready ? (
            <div className="admin-empty">
              Loading…
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>
                      Ingredient
                    </th>

                    <th>
                      Category
                    </th>

                    <th>
                      Admin Rate
                    </th>

                    <th>
                      My Rate
                    </th>

                    <th>
                      Unit
                    </th>

                    <th>
                      Recipes
                    </th>

                    <th>
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRates.map(
                    (row) => {
                      const recipes =
                        usage[
                          row.id
                        ] || [];

                      return (
                        <tr key={row.id}>
                          <td>
                            <strong>
                              {row.name}
                            </strong>

                            {row.isCustomRate ? (
                              <small>
                                My custom rate
                              </small>
                            ) : null}
                          </td>

                          <td>
                            {
                              row.category
                            }
                          </td>

                          <td>
                            ₹
                            {Number(
                              row.defaultRate,
                            ).toLocaleString(
                              'en-IN',
                            )}
                          </td>

                          <td>
                            <label className="dish-rate-input">
                              <span>
                                ₹
                              </span>

                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={
                                  row.rate
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateRate(
                                    row.id,
                                    Number(
                                      event
                                        .target
                                        .value,
                                    ),
                                  )
                                }
                              />
                            </label>
                          </td>

                          <td>
                            {
                              row.unit
                            }
                          </td>

                          <td>
                            <span className="badge">
                              {
                                recipes.length
                              }
                            </span>
                          </td>

                          <td>
                            <button
                              className="ghost-button"
                              type="button"
                              disabled={
                                !row.isCustomRate &&
                                !changedIds.has(
                                  row.id,
                                )
                              }
                              onClick={() =>
                                useAdminRate(
                                  row,
                                )
                              }
                            >
                              Use Admin Rate
                            </button>
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </section>
    </AppShell>
  );
}
