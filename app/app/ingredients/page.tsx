'use client';

import Link from 'next/link';
import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import AppShell from '../../components/AppShell';

import {
  type IngredientRate,
} from '../../../lib/ingredientCatalog';

type RecipeUsage = {
  id: string;
  name: string;
};

type UsageMap =
  Record<string, RecipeUsage[]>;

export default function ClientIngredientIndexPage() {
  const [rates, setRates] =
    useState<IngredientRate[]>([]);

  const [usage, setUsage] =
    useState<UsageMap>({});

  const [query, setQuery] =
    useState('');

  const [category, setCategory] =
    useState('ALL');

  const [ready, setReady] =
    useState(false);

  const [message, setMessage] =
    useState('');

  const [updatedAt, setUpdatedAt] =
    useState<string | null>(null);

  useEffect(() => {
    void loadIngredients();
  }, []);

  async function loadIngredients() {
    setReady(false);
    setMessage('');

    try {
      const response = await fetch(
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
            'Could not load Ingredient Index.',
        );
      }

      setRates(
        Array.isArray(data.rates)
          ? data.rates
          : [],
      );

      setUsage(
        data.usage &&
        typeof data.usage === 'object'
          ? data.usage
          : {},
      );

      setUpdatedAt(
        data.updatedAt || null,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not load Ingredient Index.',
      );
    } finally {
      setReady(true);
    }
  }

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          rates
            .map(
              (rate) =>
                rate.category,
            )
            .filter(Boolean),
        ),
      ).sort(),
    [rates],
  );

  const filteredRates = useMemo(() => {
    const search =
      query
        .trim()
        .toLowerCase();

    return rates
      .filter((rate) => {
        const matchesSearch =
          !search ||
          rate.name
            .toLowerCase()
            .includes(search) ||
          rate.category
            .toLowerCase()
            .includes(search) ||
          rate.unit.includes(search);

        const matchesCategory =
          category === 'ALL' ||
          rate.category === category;

        return (
          matchesSearch &&
          matchesCategory
        );
      })
      .sort((a, b) =>
        a.name.localeCompare(
          b.name,
          undefined,
          {
            sensitivity: 'base',
          },
        ),
      );
  }, [
    rates,
    query,
    category,
  ]);

  const linkedCount =
    rates.filter(
      (rate) =>
        (
          usage[rate.id]
            ?.length || 0
        ) > 0,
    ).length;

  const missingRateCount =
    rates.filter(
      (rate) =>
        !(Number(rate.rate) > 0),
    ).length;

  return (
    <AppShell
      title="Ingredient Index"
      subtitle="Ingredient names, market rates and units currently used by your menu costing"
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
              Master catalog
            </span>
          </div>

          <div className="stat-card">
            <small>
              Categories
            </small>
            <strong>
              {categories.length}
            </strong>
            <span>
              Ingredient groups
            </span>
          </div>

          <div className="stat-card">
            <small>
              Recipe linked
            </small>
            <strong>
              {linkedCount}
            </strong>
            <span>
              Used in recipes
            </span>
          </div>

          <div className="stat-card">
            <small>
              Missing rates
            </small>
            <strong>
              {missingRateCount}
            </strong>
            <span>
              Need admin review
            </span>
          </div>
        </div>

        <div className="glass-card">
          <div className="dish-list-heading">
            <div>
              <span className="section-kicker">
                Costing reference
              </span>

              <h2>
                Your Ingredient Index
              </h2>

              <p className="muted">
                These are the master rates currently
                used when recipe costs are calculated.
              </p>
            </div>

            <div className="action-row">
              <button
                className="ghost-button"
                type="button"
                onClick={() =>
                  void loadIngredients()
                }
              >
                Refresh
              </button>

              <Link
                href="/app/profile"
                className="secondary-button"
              >
                Back to Profile
              </Link>
            </div>
          </div>

          {updatedAt ? (
            <p className="muted">
              Last master update:{' '}
              <b>
                {new Date(
                  updatedAt,
                ).toLocaleString(
                  'en-IN',
                )}
              </b>
            </p>
          ) : null}

          {message ? (
            <div className="admin-message error">
              {message}
            </div>
          ) : null}
        </div>

        <div className="glass-card">
          <div className="ingredient-filter-grid">
            <div className="field ingredient-search-field">
              <label htmlFor="client-ingredient-search">
                Search ingredient
              </label>

              <input
                id="client-ingredient-search"
                className="input"
                value={query}
                placeholder="Paneer, tomato, rice..."
                onChange={(event) =>
                  setQuery(
                    event.target.value,
                  )
                }
              />
            </div>

            <div className="field">
              <label htmlFor="client-ingredient-category">
                Category
              </label>

              <select
                id="client-ingredient-category"
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
                Ingredient master
              </span>

              <h2>
                Ingredient Rates
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
              <strong>
                Loading ingredients…
              </strong>
            </div>
          ) : filteredRates.length ? (
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
                      Market Rate
                    </th>

                    <th>
                      Unit
                    </th>

                    <th>
                      Recipes
                    </th>

                    <th>
                      Used In
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRates.map(
                    (rate) => {
                      const recipes =
                        usage[
                          rate.id
                        ] || [];

                      return (
                        <tr
                          key={
                            rate.id
                          }
                        >
                          <td>
                            <strong>
                              {
                                rate.name
                              }
                            </strong>
                          </td>

                          <td>
                            {
                              rate.category
                            }
                          </td>

                          <td>
                            {Number(
                              rate.rate,
                            ) > 0 ? (
                              <strong>
                                ₹
                                {Number(
                                  rate.rate,
                                ).toLocaleString(
                                  'en-IN',
                                  {
                                    maximumFractionDigits: 3,
                                  },
                                )}
                              </strong>
                            ) : (
                              <span>
                                Rate pending
                              </span>
                            )}
                          </td>

                          <td>
                            {
                              rate.unit
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
                            {recipes.length
                              ? recipes
                                  .slice(
                                    0,
                                    4,
                                  )
                                  .map(
                                    (
                                      recipe,
                                    ) =>
                                      recipe.name,
                                  )
                                  .join(
                                    ', ',
                                  )
                              : 'Not linked'}

                            {recipes.length >
                            4
                              ? ` +${
                                  recipes.length -
                                  4
                                } more`
                              : ''}
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="admin-empty">
              <strong>
                No ingredients found
              </strong>

              <span>
                Try another search
                or category.
              </span>
            </div>
          )}
        </div>

        <div className="glass-card">
          <strong>
            Ingredient rates are managed by your account administrator.
          </strong>

          <p className="muted">
            When the master rate changes, your recipe
            costing uses the updated approved rate.
          </p>
        </div>

      </section>
    </AppShell>
  );
}
