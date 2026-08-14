'use client';

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react';

import AppShell from '../../components/AppShell';

type RawRow = Record<string, unknown>;

type RecipeCatalog = {
  dishes: RawRow[];
  rates: RawRow[];
  deletedDishIds: string[];
  catalogVersion: number;
};

const RECIPE_CACHE_KEY = 'admin_recipe_catalog_v1';
const RECIPE_DISH_SYNC_KEY =
  'admin_recipe_dish_sync_v1';

function text(value: unknown) {
  return String(value ?? '').trim();
}

function numberValue(
  value: unknown,
  fallback = 0,
) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function requestedRecipeIndex(
  dishes: RawRow[],
) {
  if (
    typeof window ===
    'undefined'
  ) {
    return dishes.length
      ? 0
      : null;
  }

  const requested =
    new URLSearchParams(
      window.location.search,
    )
      .get('recipe')
      ?.trim()
      .toLowerCase();

  if (!requested) {
    return dishes.length
      ? 0
      : null;
  }

  const index =
    dishes.findIndex(
      (dish) =>
        String(
          dish.dishName ||
          dish.name ||
          '',
        )
          .trim()
          .toLowerCase() ===
        requested,
    );

  return index >= 0
    ? index
    : dishes.length
      ? 0
      : null;
}

function recipeName(dish: RawRow) {
  return text(
    dish.dishName ||
    dish.name,
  ) || 'Untitled Recipe';
}

function recipeIngredients(
  dish: RawRow,
) {
  return Array.isArray(
    dish.ingredients,
  )
    ? dish.ingredients.filter(
        (
          row,
        ): row is RawRow =>
          Boolean(
            row &&
            typeof row ===
              'object' &&
            !Array.isArray(row),
          ),
      )
    : [];
}

function ingredientQuantity(
  ingredient: RawRow,
) {
  return Math.max(
    0,
    numberValue(
      ingredient.quantity ??
      ingredient.qty,
    ),
  );
}

function ingredientRate(
  ingredient: RawRow,
) {
  return Math.max(
    0,
    numberValue(
      ingredient.marketRate ??
      ingredient.rate,
    ),
  );
}

function convertedQuantity(
  quantity: number,
  unit: string,
  rateUnit: string,
) {
  if (
    unit === rateUnit
  ) {
    return quantity;
  }

  if (
    unit === 'gram' &&
    rateUnit === 'kg'
  ) {
    return quantity / 1000;
  }

  if (
    unit === 'kg' &&
    rateUnit === 'gram'
  ) {
    return quantity * 1000;
  }

  if (
    unit === 'ml' &&
    rateUnit === 'ltr'
  ) {
    return quantity / 1000;
  }

  if (
    unit === 'ltr' &&
    rateUnit === 'ml'
  ) {
    return quantity * 1000;
  }

  return quantity;
}

function recipeTotal(
  dish: RawRow,
) {
  return recipeIngredients(
    dish,
  ).reduce(
    (
      total,
      ingredient,
    ) => {
      const qty =
        ingredientQuantity(
          ingredient,
        );

      const unit =
        text(
          ingredient.unit,
        ) || 'kg';

      const rateUnit =
        text(
          ingredient.rateUnit,
        ) || unit;

      return (
        total +
        convertedQuantity(
          qty,
          unit,
          rateUnit,
        ) *
          ingredientRate(
            ingredient,
          )
      );
    },
    0,
  );
}

function money(value: number) {
  return `₹${value.toLocaleString(
    'en-IN',
    {
      maximumFractionDigits: 2,
    },
  )}`;
}

export default function RecipesPage() {
  const [
    catalog,
    setCatalog,
  ] =
    useState<RecipeCatalog | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

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
    query,
    setQuery,
  ] =
    useState('');

  const deferredQuery =
    useDeferredValue(
      query,
    );

  const [
    category,
    setCategory,
  ] =
    useState('ALL');

  const [
    selectedIndex,
    setSelectedIndex,
  ] =
    useState<number | null>(
      null,
    );

  async function loadRecipes(background = false) {
    if (!background) setLoading(true);
    setError('');

    try {
      const response =
        await fetch(
          '/api/admin/recipes',
          {
            cache:
              'no-store',
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          'Could not load recipes.',
        );
      }

      const source =
        data.catalog;

      const nextCatalog:
        RecipeCatalog = {
          dishes:
            Array.isArray(
              source?.dishes,
            )
              ? source.dishes
              : [],

          rates:
            Array.isArray(
              source?.rates,
            )
              ? source.rates
              : [],

          deletedDishIds:
            Array.isArray(
              source
                ?.deletedDishIds,
            )
              ? source
                  .deletedDishIds
                  .map(String)
              : [],

          catalogVersion:
            Math.max(
              1,
              Number(
                source
                  ?.catalogVersion,
              ) || 1,
            ),
        };

      setCatalog(
        nextCatalog,
      );

      setSelectedIndex(
        requestedRecipeIndex(
          nextCatalog.dishes,
        ),
      );

      try {
        localStorage.setItem(
          RECIPE_CACHE_KEY,
          JSON.stringify(nextCatalog),
        );
      } catch {
        // Cache is optional.
      }

    } catch (
      loadError
    ) {
      setError(
        loadError instanceof
          Error
          ? loadError.message
          : 'Could not load recipes.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    try {
      const raw =
        localStorage.getItem(
          RECIPE_CACHE_KEY,
        );

      if (raw) {
        const cached =
          JSON.parse(raw) as RecipeCatalog;

        if (
          Array.isArray(cached.dishes) &&
          Array.isArray(cached.rates)
        ) {
          setCatalog(cached);

          setSelectedIndex(
            requestedRecipeIndex(
              cached.dishes,
            ),
          );

          setLoading(false);

          void loadRecipes(true);
          return;
        }
      }
    } catch {
      localStorage.removeItem(
        RECIPE_CACHE_KEY,
      );
    }

    void loadRecipes();
  }, []);

  const categories =
    useMemo(
      () =>
        Array.from(
          new Set(
            (
              catalog
                ?.dishes ||
              []
            )
              .map(
                (dish) =>
                  text(
                    dish.category,
                  ),
              )
              .filter(
                Boolean,
              ),
          ),
        ).sort(
          (a, b) =>
            a.localeCompare(
              b,
            ),
        ),
      [catalog],
    );

  const visibleRecipes =
    useMemo(() => {
      const q =
        deferredQuery
          .trim()
          .toLowerCase();

      return (
        catalog
          ?.dishes ||
        []
      )
        .map(
          (
            dish,
            index,
          ) => ({
            dish,
            index,
          }),
        )
        .filter(
          ({
            dish,
          }) => {
            const matchesCategory =
              category ===
                'ALL' ||
              text(
                dish.category,
              ) ===
                category;

            const searchable =
              [
                recipeName(
                  dish,
                ),
                text(
                  dish.category,
                ),
                text(
                  dish.subcategory,
                ),
              ]
                .join(' ')
                .toLowerCase();

            return (
              matchesCategory &&
              (
                !q ||
                searchable.includes(
                  q,
                )
              )
            );
          },
        );
    }, [
      catalog,
      category,
      deferredQuery,
    ]);

  const selectedDish =
    selectedIndex ===
      null
      ? null
      : catalog
          ?.dishes[
            selectedIndex
          ] ||
        null;

  function updateDish(
    index: number,
    patch: RawRow,
  ) {
    setMessage('');

    setCatalog(
      (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,

          dishes:
            current.dishes.map(
              (
                dish,
                dishIndex,
              ) =>
                dishIndex ===
                index
                  ? {
                      ...dish,
                      ...patch,
                    }
                  : dish,
            ),
        };
      },
    );
  }

  function updateIngredient(
    dishIndex: number,
    ingredientIndex: number,
    patch: RawRow,
  ) {
    if (!catalog) {
      return;
    }

    const dish =
      catalog.dishes[
        dishIndex
      ];

    const ingredients =
      recipeIngredients(
        dish,
      );

    updateDish(
      dishIndex,
      {
        ingredients:
          ingredients.map(
            (
              ingredient,
              index,
            ) =>
              index ===
              ingredientIndex
                ? {
                    ...ingredient,
                    ...patch,
                  }
                : ingredient,
          ),
      },
    );
  }

  function addIngredient() {
    if (
      selectedIndex ===
        null ||
      !selectedDish
    ) {
      return;
    }

    updateDish(
      selectedIndex,
      {
        ingredients: [
          ...recipeIngredients(
            selectedDish,
          ),
          {
            name:
              'New Ingredient',
            quantity: 1,
            unit: 'kg',
            marketRate: 0,
            rateUnit: 'kg',
          },
        ],
      },
    );
  }

  function removeIngredient(
    ingredientIndex: number,
  ) {
    if (
      selectedIndex ===
        null ||
      !selectedDish
    ) {
      return;
    }

    updateDish(
      selectedIndex,
      {
        ingredients:
          recipeIngredients(
            selectedDish,
          ).filter(
            (
              _,
              index,
            ) =>
              index !==
              ingredientIndex,
          ),
      },
    );
  }

  function addRecipe() {
    if (!catalog) {
      return;
    }

    const index =
      catalog.dishes.length;

    const dish = {
      dishName:
        'New Recipe',
      category:
        'Other',
      subcategory: '',
      baseGuests: 100,
      servingSize: 1,
      servingUnit:
        'serving',
      dishRate: 0,
      ingredients: [],
    };

    setCatalog({
      ...catalog,

      dishes: [
        ...catalog.dishes,
        dish,
      ],
    });

    setQuery('');
    setCategory(
      'ALL',
    );
    setSelectedIndex(
      index,
    );
  }

  async function saveRecipes() {
    if (!catalog) {
      return;
    }

    setSaving(true);
    setMessage('');
    setError('');

    try {
      const response =
        await fetch(
          '/api/admin/recipes',
          {
            method:
              'PUT',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify(
                catalog,
              ),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          'Could not save recipes.',
        );
      }

      try {
        localStorage.setItem(
          RECIPE_CACHE_KEY,
          JSON.stringify(catalog),
        );

        if (
          data.updatedAt
        ) {
          localStorage.setItem(
            RECIPE_DISH_SYNC_KEY,
            String(
              data.updatedAt,
            ),
          );
        }
      } catch {
        // Cache is optional.
      }

      const syncedDishes =
        Math.max(
          0,
          Number(
            data.syncedDishes,
          ) || 0,
        );

      const activeDish =
        selectedIndex === null
          ? null
          : catalog.dishes[
              selectedIndex
            ] || null;

      const activeGuests =
        activeDish
          ? Math.max(
              1,
              numberValue(
                activeDish.baseGuests,
                100,
              ),
            )
          : 100;

      const activeRate =
        activeDish
          ? recipeTotal(
              activeDish,
            ) / activeGuests
          : 0;

      setMessage(
        syncedDishes > 0
          ? `Saved · Synced to Dish Master: ${syncedDishes} recipe${
              syncedDishes === 1
                ? ''
                : 's'
            }${
              activeDish
                ? ` · ${recipeName(activeDish)} ${money(activeRate)}/plate`
                : ''
            }.`
          : 'Saved successfully.',
      );
    } catch (
      saveError
    ) {
      setError(
        saveError instanceof
          Error
          ? saveError.message
          : 'Could not save recipes.',
      );
    } finally {
      setSaving(false);
    }
  }

  const ingredients =
    selectedDish
      ? recipeIngredients(
          selectedDish,
        )
      : [];

  const totalCost =
    selectedDish
      ? recipeTotal(
          selectedDish,
        )
      : 0;

  const guests =
    Math.max(
      1,
      numberValue(
        selectedDish
          ?.baseGuests,
        100,
      ),
    );

  const perPerson =
    totalCost /
    guests;

  return (
    <AppShell
      title="Recipes"
      subtitle="Fast recipe costing workspace"
      hidePageTitle
    >
      <section className="recipe-fast-page">
        <style>{`
          .recipe-fast-page {
            display:grid;
            gap:12px;
          }

          .recipe-fast-hero {
            display:flex;
            align-items:flex-end;
            justify-content:space-between;
            gap:16px;
            padding:16px 2px 6px;
          }

          .recipe-fast-kicker {
            color:#6eabff;
            font-size:10px;
            font-weight:900;
            letter-spacing:.1em;
            text-transform:uppercase;
          }

          .recipe-fast-hero h1 {
            margin:6px 0 5px;
            font-size:34px;
            letter-spacing:-.045em;
          }

          .recipe-fast-hero p {
            margin:0;
            color:#8995a4;
            font-size:12px;
          }

          .recipe-fast-actions {
            display:flex;
            gap:7px;
          }

          .recipe-fast-button {
            min-height:40px;
            padding:0 13px;
            border:1px solid #303944;
            border-radius:10px;
            background:#151b23;
            color:#dce5ef;
            font:inherit;
            font-size:11px;
            font-weight:900;
            cursor:pointer;
          }

          .recipe-fast-button.primary {
            border-color:#1478f2;
            background:#1478f2;
            color:#fff;
          }

          .recipe-fast-button:disabled {
            opacity:.55;
            cursor:wait;
          }

          .recipe-fast-message {
            padding:10px 12px;
            border:1px solid rgba(52,199,89,.22);
            border-radius:10px;
            background:rgba(52,199,89,.07);
            color:#8ee6a5;
            font-size:11px;
          }

          .recipe-fast-error {
            padding:10px 12px;
            border:1px solid rgba(255,90,90,.25);
            border-radius:10px;
            background:rgba(255,90,90,.07);
            color:#ff9b94;
            font-size:11px;
          }

          .recipe-fast-stats {
            display:grid;
            grid-template-columns:repeat(4,1fr);
            gap:8px;
          }

          .recipe-fast-stat {
            padding:12px;
            border:1px solid #282f39;
            border-radius:12px;
            background:#10151c;
          }

          .recipe-fast-stat small,
          .recipe-fast-stat strong {
            display:block;
          }

          .recipe-fast-stat small {
            color:#7f8b99;
            font-size:8px;
            font-weight:850;
            text-transform:uppercase;
          }

          .recipe-fast-stat strong {
            margin-top:5px;
            font-size:19px;
          }

          .recipe-fast-toolbar {
            display:grid;
            grid-template-columns:1fr 210px;
            gap:7px;
          }

          .recipe-fast-input {
            width:100%;
            min-height:42px;
            padding:0 11px;
            border:1px solid #303844;
            border-radius:10px;
            outline:0;
            background:#151b23;
            color:#e7edf4;
            font:inherit;
            font-size:12px;
            color-scheme:dark;
          }

          .recipe-fast-input:focus {
            border-color:#428de8;
          }

          .recipe-fast-workspace {
            display:grid;
            grid-template-columns:300px minmax(0,1fr);
            gap:10px;
            min-height:560px;
          }

          .recipe-fast-list,
          .recipe-fast-editor {
            border:1px solid #282f39;
            border-radius:14px;
            background:#0f141b;
            overflow:hidden;
          }

          .recipe-fast-list {
            max-height:680px;
            overflow:auto;
          }

          .recipe-fast-row {
            width:100%;
            display:block;
            padding:11px 12px;
            border:0;
            border-bottom:1px solid #222a33;
            background:transparent;
            color:#dce4ed;
            text-align:left;
            cursor:pointer;
          }

          .recipe-fast-row:hover,
          .recipe-fast-row.active {
            background:#17212d;
          }

          .recipe-fast-row b,
          .recipe-fast-row span {
            display:block;
          }

          .recipe-fast-row b {
            font-size:11px;
          }

          .recipe-fast-row span {
            margin-top:3px;
            color:#7f8b99;
            font-size:9px;
          }

          .recipe-fast-editor {
            padding:14px;
            overflow:auto;
          }

          .recipe-fast-grid {
            display:grid;
            grid-template-columns:2fr 1fr 1fr;
            gap:8px;
          }

          .recipe-fast-field {
            display:grid;
            gap:5px;
          }

          .recipe-fast-field label {
            color:#7f8b99;
            font-size:8px;
            font-weight:850;
            text-transform:uppercase;
          }

          .recipe-fast-costs {
            display:grid;
            grid-template-columns:repeat(3,1fr);
            gap:7px;
            margin:12px 0;
          }

          .recipe-fast-cost {
            padding:10px;
            border:1px solid #29323d;
            border-radius:10px;
            background:#141a22;
          }

          .recipe-fast-cost span,
          .recipe-fast-cost b {
            display:block;
          }

          .recipe-fast-cost span {
            color:#788593;
            font-size:8px;
            text-transform:uppercase;
          }

          .recipe-fast-cost b {
            margin-top:4px;
            font-size:14px;
          }

          .recipe-fast-heading {
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:10px;
            margin:15px 0 8px;
          }

          .recipe-fast-heading h2 {
            margin:0;
            font-size:14px;
          }

          .recipe-fast-ingredient {
            display:grid;
            grid-template-columns:2fr .7fr .7fr .8fr .7fr auto;
            gap:6px;
            align-items:end;
            padding:8px 0;
            border-top:1px solid #222a33;
          }

          .recipe-fast-remove {
            width:36px;
            min-height:38px;
            border:1px solid rgba(255,90,90,.2);
            border-radius:9px;
            background:rgba(255,90,90,.06);
            color:#ff8e88;
            cursor:pointer;
          }

          .recipe-fast-empty {
            display:grid;
            min-height:360px;
            place-items:center;
            color:#7f8b99;
            font-size:11px;
          }

          @media(max-width:900px) {
            .recipe-fast-workspace {
              grid-template-columns:1fr;
            }

            .recipe-fast-list {
              max-height:260px;
            }

            .recipe-fast-stats {
              grid-template-columns:1fr 1fr;
            }

            .recipe-fast-grid {
              grid-template-columns:1fr;
            }

            .recipe-fast-ingredient {
              grid-template-columns:1fr 1fr;
            }
          }

          @media(max-width:620px) {
            .recipe-fast-hero {
              align-items:stretch;
              flex-direction:column;
            }

            .recipe-fast-actions {
              display:grid;
              grid-template-columns:1fr 1fr;
            }

            .recipe-fast-toolbar {
              grid-template-columns:1fr;
            }

            .recipe-fast-costs {
              grid-template-columns:1fr;
            }
          }
        `}</style>

        <div className="recipe-fast-hero">
          <div>
            <span className="recipe-fast-kicker">
              Recipe Library
            </span>

            <h1>
              Recipes
            </h1>

            <p>
              Direct recipe loading — no Dish page and no iframe.
            </p>
          </div>

          <div className="recipe-fast-actions">
            <button
              className="recipe-fast-button"
              type="button"
              onClick={
                addRecipe
              }
              disabled={
                !catalog
              }
            >
              + New Recipe
            </button>

            <button
              className="recipe-fast-button primary"
              type="button"
              onClick={() =>
                void saveRecipes()
              }
              disabled={
                saving ||
                !catalog
              }
            >
              {saving
                ? 'Saving…'
                : 'Save Recipes'}
            </button>
          </div>
        </div>

        {message ? (
          <div className="recipe-fast-message">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="recipe-fast-error">
            {error}
            {' '}
            <button
              type="button"
              onClick={() =>
                void loadRecipes()
              }
            >
              Retry
            </button>
          </div>
        ) : null}

        <div className="recipe-fast-stats">
          <div className="recipe-fast-stat">
            <small>
              Recipes
            </small>
            <strong>
              {catalog?.dishes.length ?? 0}
            </strong>
          </div>

          <div className="recipe-fast-stat">
            <small>
              Categories
            </small>
            <strong>
              {categories.length}
            </strong>
          </div>

          <div className="recipe-fast-stat">
            <small>
              Ingredients
            </small>
            <strong>
              {catalog
                ?.dishes.reduce(
                  (
                    total,
                    dish,
                  ) =>
                    total +
                    recipeIngredients(
                      dish,
                    ).length,
                  0,
                ) ?? 0}
            </strong>
          </div>

          <div className="recipe-fast-stat">
            <small>
              Market Rates
            </small>
            <strong>
              {catalog?.rates.length ?? 0}
            </strong>
          </div>
        </div>

        <div className="recipe-fast-toolbar">
          <input
            className="recipe-fast-input"
            type="search"
            value={query}
            onChange={(event) =>
              setQuery(
                event.target.value,
              )
            }
            placeholder="Search recipe…"
          />

          <select
            className="recipe-fast-input"
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

        {loading ? (
          <div className="recipe-fast-empty">
            Loading recipes…
          </div>
        ) : (
          <div className="recipe-fast-workspace">
            <aside className="recipe-fast-list">
              {visibleRecipes.length ? (
                visibleRecipes.map(
                  ({
                    dish,
                    index,
                  }) => (
                    <button
                      className={`recipe-fast-row ${
                        selectedIndex === index
                          ? 'active'
                          : ''
                      }`}
                      key={`${recipeName(dish)}-${index}`}
                      type="button"
                      onClick={() =>
                        setSelectedIndex(
                          index,
                        )
                      }
                    >
                      <b>
                        {recipeName(
                          dish,
                        )}
                      </b>

                      <span>
                        {text(
                          dish.category,
                        ) ||
                          'Other'}
                        {' · '}
                        {recipeIngredients(
                          dish,
                        ).length}
                        {' ingredients'}
                      </span>
                    </button>
                  ),
                )
              ) : (
                <div className="recipe-fast-empty">
                  No matching recipes
                </div>
              )}
            </aside>

            <main className="recipe-fast-editor">
              {selectedDish &&
              selectedIndex !==
                null ? (
                <>
                  <div className="recipe-fast-grid">
                    <div className="recipe-fast-field">
                      <label>
                        Dish name
                      </label>

                      <input
                        className="recipe-fast-input"
                        value={recipeName(
                          selectedDish,
                        )}
                        onChange={(event) =>
                          updateDish(
                            selectedIndex,
                            {
                              dishName:
                                event
                                  .target
                                  .value,
                              name:
                                event
                                  .target
                                  .value,
                            },
                          )
                        }
                      />
                    </div>

                    <div className="recipe-fast-field">
                      <label>
                        Category
                      </label>

                      <input
                        className="recipe-fast-input"
                        value={text(
                          selectedDish.category,
                        )}
                        onChange={(event) =>
                          updateDish(
                            selectedIndex,
                            {
                              category:
                                event
                                  .target
                                  .value,
                            },
                          )
                        }
                      />
                    </div>

                    <div className="recipe-fast-field">
                      <label>
                        Batch guests
                      </label>

                      <input
                        className="recipe-fast-input"
                        type="number"
                        min="1"
                        value={guests}
                        onChange={(event) =>
                          updateDish(
                            selectedIndex,
                            {
                              baseGuests:
                                Math.max(
                                  1,
                                  Number(
                                    event
                                      .target
                                      .value,
                                  ) ||
                                    1,
                                ),
                            },
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="recipe-fast-costs">
                    <div className="recipe-fast-cost">
                      <span>
                        Batch Cost
                      </span>

                      <b>
                        {money(
                          totalCost,
                        )}
                      </b>
                    </div>

                    <div className="recipe-fast-cost">
                      <span>
                        Cost / Person
                      </span>

                      <b>
                        {money(
                          perPerson,
                        )}
                      </b>
                    </div>

                    <div className="recipe-fast-cost">
                      <span>
                        Ingredients
                      </span>

                      <b>
                        {ingredients.length}
                      </b>
                    </div>
                  </div>

                  <div className="recipe-fast-heading">
                    <h2>
                      Ingredients
                    </h2>

                    <button
                      className="recipe-fast-button"
                      type="button"
                      onClick={
                        addIngredient
                      }
                    >
                      + Ingredient
                    </button>
                  </div>

                  {ingredients.map(
                    (
                      ingredient,
                      ingredientIndex,
                    ) => {
                      const quantity =
                        ingredientQuantity(
                          ingredient,
                        );

                      const rate =
                        ingredientRate(
                          ingredient,
                        );

                      return (
                        <div
                          className="recipe-fast-ingredient"
                          key={ingredientIndex}
                        >
                          <div className="recipe-fast-field">
                            <label>
                              Ingredient
                            </label>

                            <input
                              className="recipe-fast-input"
                              value={text(
                                ingredient.name ||
                                  ingredient.ingredientName,
                              )}
                              onChange={(event) =>
                                updateIngredient(
                                  selectedIndex,
                                  ingredientIndex,
                                  {
                                    name:
                                      event
                                        .target
                                        .value,
                                  },
                                )
                              }
                            />
                          </div>

                          <div className="recipe-fast-field">
                            <label>
                              Qty
                            </label>

                            <input
                              className="recipe-fast-input"
                              type="number"
                              min="0"
                              step="0.01"
                              value={quantity}
                              onChange={(event) =>
                                updateIngredient(
                                  selectedIndex,
                                  ingredientIndex,
                                  {
                                    quantity:
                                      Math.max(
                                        0,
                                        Number(
                                          event
                                            .target
                                            .value,
                                        ) ||
                                          0,
                                      ),
                                    qty:
                                      Math.max(
                                        0,
                                        Number(
                                          event
                                            .target
                                            .value,
                                        ) ||
                                          0,
                                      ),
                                  },
                                )
                              }
                            />
                          </div>

                          <div className="recipe-fast-field">
                            <label>
                              Unit
                            </label>

                            <select
                              className="recipe-fast-input"
                              value={
                                text(
                                  ingredient.unit,
                                ) ||
                                'kg'
                              }
                              onChange={(event) =>
                                updateIngredient(
                                  selectedIndex,
                                  ingredientIndex,
                                  {
                                    unit:
                                      event
                                        .target
                                        .value,
                                  },
                                )
                              }
                            >
                              <option value="kg">kg</option>
                              <option value="gram">gram</option>
                              <option value="ltr">ltr</option>
                              <option value="ml">ml</option>
                              <option value="piece">piece</option>
                              <option value="packet">packet</option>
                            </select>
                          </div>

                          <div className="recipe-fast-field">
                            <label>
                              Rate
                            </label>

                            <input
                              className="recipe-fast-input"
                              type="number"
                              min="0"
                              step="0.01"
                              value={rate}
                              onChange={(event) =>
                                updateIngredient(
                                  selectedIndex,
                                  ingredientIndex,
                                  {
                                    marketRate:
                                      Math.max(
                                        0,
                                        Number(
                                          event
                                            .target
                                            .value,
                                        ) ||
                                          0,
                                      ),
                                    rate:
                                      Math.max(
                                        0,
                                        Number(
                                          event
                                            .target
                                            .value,
                                        ) ||
                                          0,
                                      ),
                                  },
                                )
                              }
                            />
                          </div>

                          <div className="recipe-fast-field">
                            <label>
                              Cost
                            </label>

                            <input
                              className="recipe-fast-input"
                              readOnly
                              value={money(
                                convertedQuantity(
                                  quantity,
                                  text(
                                    ingredient.unit,
                                  ) ||
                                    'kg',
                                  text(
                                    ingredient.rateUnit,
                                  ) ||
                                    text(
                                      ingredient.unit,
                                    ) ||
                                    'kg',
                                ) *
                                  rate,
                              )}
                            />
                          </div>

                          <button
                            className="recipe-fast-remove"
                            type="button"
                            aria-label="Remove ingredient"
                            onClick={() =>
                              removeIngredient(
                                ingredientIndex,
                              )
                            }
                          >
                            ×
                          </button>
                        </div>
                      );
                    },
                  )}

                  {!ingredients.length ? (
                    <div className="recipe-fast-empty">
                      Add the first ingredient
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="recipe-fast-empty">
                  Select a recipe
                </div>
              )}
            </main>
          </div>
        )}
      </section>
    </AppShell>
  );
}
