'use client';

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react';

import AppShell from '../../components/AppShell';

import {
  applyRecipeWastage,
  assessRecipeQuality,
  readCostableRecipe,
} from '../../../lib/recipeCosting';

type RawRow = Record<string, unknown>;

type RecipeCatalog = {
  dishes: RawRow[];
  rates: RawRow[];
  deletedDishIds: string[];
  catalogVersion: number;
  categories: string[];
  subcategories:
    Record<string, string[]>;
};

const RECIPE_CACHE_KEY = 'admin_recipe_catalog_v2';
const RECIPE_DISH_SYNC_KEY =
  'admin_recipe_dish_sync_v1';

let memoryRecipeCatalog:
  RecipeCatalog | null =
    null;

let memoryRecipeCatalogLoadedAt =
  0;

const RECIPE_MEMORY_FRESH_MS =
  20 * 1000;

const RECIPES_PER_PAGE = 30;

function recipePageForIndex(
  index: number | null,
) {
  if (
    index === null ||
    index < 0
  ) {
    return 1;
  }

  return (
    Math.floor(
      index /
        RECIPES_PER_PAGE,
    ) + 1
  );
}

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
    syncStatus,
    setSyncStatus,
  ] = useState<
    'idle' |
    'syncing' |
    'synced' |
    'error'
  >('idle');

  const [
    syncMessage,
    setSyncMessage,
  ] = useState(
    'Auto sync to Dish Master is enabled.',
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

  const [
    recipePage,
    setRecipePage,
  ] = useState(1);

  const [
    bulkIngredients,
    setBulkIngredients,
  ] = useState('');

  const [
    bulkRecipes,
    setBulkRecipes,
  ] = useState('');

  const [
    showBulkRecipes,
    setShowBulkRecipes,
  ] = useState(false);

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

          categories:
            Array.isArray(
              data.categories,
            )
              ? data.categories
                  .map(String)
                  .map(
                    (item: string) =>
                      item.trim(),
                  )
                  .filter(Boolean)
              : [],

          subcategories:
            data.subcategories &&
            typeof data.subcategories ===
              'object' &&
            !Array.isArray(
              data.subcategories,
            )
              ? Object.fromEntries(
                  Object.entries(
                    data.subcategories as
                      Record<
                        string,
                        unknown
                      >,
                  ).map(
                    ([
                      category,
                      values,
                    ]) => [
                      category,
                      Array.isArray(
                        values,
                      )
                        ? values
                            .map(String)
                            .map(
                              (
                                item,
                              ) =>
                                item.trim(),
                            )
                            .filter(
                              Boolean,
                            )
                        : [],
                    ],
                  ),
                )
              : {},
        };

      setCatalog(
        nextCatalog,
      );

      memoryRecipeCatalog =
        nextCatalog;

      memoryRecipeCatalogLoadedAt =
        Date.now();

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
    if (memoryRecipeCatalog) {
      setCatalog(
        memoryRecipeCatalog,
      );

      setSelectedIndex(
        requestedRecipeIndex(
          memoryRecipeCatalog.dishes,
        ),
      );

      setLoading(false);

      if (
        Date.now() -
          memoryRecipeCatalogLoadedAt >
        RECIPE_MEMORY_FRESH_MS
      ) {
        void loadRecipes(true);
      }

      return;
    }

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
          memoryRecipeCatalog =
            cached;

          memoryRecipeCatalogLoadedAt =
            0;

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
          new Set([
            ...(
              catalog
                ?.categories ||
              []
            ),

            ...(
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

            'Other',
          ]),
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

  const recipePageCount =
    Math.max(
      1,
      Math.ceil(
        visibleRecipes.length /
          RECIPES_PER_PAGE,
      ),
    );

  const paginatedRecipes =
    visibleRecipes.slice(
      (recipePage - 1) *
        RECIPES_PER_PAGE,
      recipePage *
        RECIPES_PER_PAGE,
    );

  useEffect(() => {
    setRecipePage(1);
  }, [
    category,
    deferredQuery,
  ]);

  useEffect(() => {
    if (
      recipePage >
      recipePageCount
    ) {
      setRecipePage(
        recipePageCount,
      );
    }
  }, [
    recipePage,
    recipePageCount,
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

  function addBulkIngredients() {
    if (
      selectedIndex === null ||
      !selectedDish
    ) {
      return;
    }

    const unitAliases:
      Record<string, string> = {
        kg: 'kg',
        kgs: 'kg',
        kilogram: 'kg',
        g: 'gram',
        gm: 'gram',
        gram: 'gram',
        l: 'ltr',
        lt: 'ltr',
        ltr: 'ltr',
        litre: 'ltr',
        ml: 'ml',
        pc: 'piece',
        pcs: 'piece',
        piece: 'piece',
        pkt: 'packet',
        packet: 'packet',
      };

    const lines =
      bulkIngredients
        .split(/\r?\n/)
        .map((line) =>
          line.trim(),
        )
        .filter(Boolean);

    const added:
      RawRow[] = [];

    let skipped = 0;

    lines.forEach((line) => {
      const parts =
        line
          .split(
            /\s*(?:\t|\||,)\s*/,
          )
          .map((part) =>
            part.trim(),
          );

      const name =
        parts[0] || '';

      const quantity =
        Number(parts[1]);

      const rawUnit =
        (
          parts[2] ||
          'kg'
        ).toLowerCase();

      const unit =
        unitAliases[
          rawUnit
        ];

      const rate =
        Number(parts[3]);

      if (
        !name ||
        !Number.isFinite(
          quantity,
        ) ||
        quantity < 0 ||
        !unit
      ) {
        skipped += 1;
        return;
      }

      const safeRate =
        Number.isFinite(rate) &&
        rate >= 0
          ? rate
          : 0;

      added.push({
        name,
        quantity,
        qty: quantity,
        unit,
        marketRate:
          safeRate,
        rate:
          safeRate,
        rateUnit:
          unit,
      });
    });

    if (!added.length) {
      setError(
        'No valid ingredients found. Use: Name, Qty, Unit, Rate',
      );
      return;
    }

    updateDish(
      selectedIndex,
      {
        ingredients: [
          ...recipeIngredients(
            selectedDish,
          ),
          ...added,
        ],
      },
    );

    setBulkIngredients('');
    setError('');

    setMessage(
      `${added.length} ingredient${
        added.length === 1
          ? ''
          : 's'
      } added${
        skipped
          ? ` · ${skipped} skipped`
          : ''
      }.`,
    );
  }

  function changeServingQuantity(
    nextValue: number,
  ) {
    if (
      selectedIndex === null ||
      !selectedDish
    ) {
      return;
    }

    const currentServing =
      Math.max(
        0.01,
        numberValue(
          selectedDish.servingSize,
          1,
        ),
      );

    const nextServing =
      Math.max(
        0.01,
        nextValue || 0.01,
      );

    const ratio =
      nextServing /
      currentServing;

    const scaledIngredients =
      recipeIngredients(
        selectedDish,
      ).map(
        (ingredient) => {
          const currentQuantity =
            ingredientQuantity(
              ingredient,
            );

          const nextQuantity =
            Math.round(
              currentQuantity *
                ratio *
                1000000,
            ) / 1000000;

          return {
            ...ingredient,
            quantity:
              nextQuantity,
            qty:
              nextQuantity,
          };
        },
      );

    updateDish(
      selectedIndex,
      {
        servingSize:
          nextServing,
        ingredients:
          scaledIngredients,
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

  function addBulkRecipes() {
    if (!catalog) {
      return;
    }

    const unitAliases:
      Record<string, string> = {
        g: 'gram',
        gm: 'gram',
        gram: 'gram',
        grams: 'gram',

        ml: 'ml',

        pc: 'piece',
        pcs: 'piece',
        piece: 'piece',
        pieces: 'piece',

        serving: 'serving',
        servings: 'serving',

        kg: 'kg',
        kgs: 'kg',

        l: 'ltr',
        lt: 'ltr',
        ltr: 'ltr',
        litre: 'ltr',
        liter: 'ltr',
      };

    const lines =
      bulkRecipes
        .split(/\r?\n/)
        .map(
          (line) =>
            line.trim(),
        )
        .filter(Boolean);

    if (!lines.length) {
      setError(
        'Paste at least one recipe.',
      );
      return;
    }

    const existingNames =
      new Set(
        catalog.dishes.map(
          (dish) =>
            recipeName(dish)
              .toLowerCase(),
        ),
      );

    const added:
      RawRow[] = [];

    const nextCategories =
      new Set(
        catalog.categories,
      );

    const nextSubcategories:
      Record<
        string,
        string[]
      > = {
        ...catalog.subcategories,
      };

    let skipped = 0;

    for (const line of lines) {
      const parts =
        line
          .split(
            /\s*(?:\t|\||,)\s*/,
          )
          .map(
            (part) =>
              part.trim(),
          );

      const name =
        parts[0] || '';

      const recipeCategory =
        parts[1] ||
        'Other';

      const subcategory =
        parts[2] || '';

      const servingSize =
        Number(
          parts[3],
        );

      const rawServingUnit =
        (
          parts[4] ||
          'serving'
        )
          .trim()
          .toLowerCase();

      const servingUnit =
        unitAliases[
          rawServingUnit
        ];

      const baseGuests =
        Number(
          parts[5],
        );

      const normalizedName =
        name
          .replace(
            /\s+/g,
            ' ',
          )
          .trim();

      const nameKey =
        normalizedName
          .toLowerCase();

      if (
        !normalizedName ||
        existingNames.has(
          nameKey,
        ) ||
        !servingUnit
      ) {
        skipped += 1;
        continue;
      }

      const safeServingSize =
        Number.isFinite(
          servingSize,
        ) &&
        servingSize > 0
          ? servingSize
          : 1;

      const safeBaseGuests =
        Number.isFinite(
          baseGuests,
        ) &&
        baseGuests > 0
          ? Math.round(
              baseGuests,
            )
          : 100;

      added.push({
        dishName:
          normalizedName,
        name:
          normalizedName,

        category:
          recipeCategory,

        subcategory,

        baseGuests:
          safeBaseGuests,

        servingSize:
          safeServingSize,

        servingUnit,

        dishRate: 0,

        ingredients: [],
      });

      existingNames.add(
        nameKey,
      );

      nextCategories.add(
        recipeCategory,
      );

      if (subcategory) {
        const current =
          nextSubcategories[
            recipeCategory
          ] || [];

        if (
          !current.some(
            (item) =>
              item
                .toLowerCase() ===
              subcategory
                .toLowerCase(),
          )
        ) {
          nextSubcategories[
            recipeCategory
          ] = [
            ...current,
            subcategory,
          ];
        }
      }
    }

    if (!added.length) {
      setError(
        'No new valid recipes found. Duplicate recipe names are skipped.',
      );
      return;
    }

    const firstAddedIndex =
      catalog.dishes.length;

    const nextCatalog = {
      ...catalog,

      dishes: [
        ...catalog.dishes,
        ...added,
      ],

      categories:
        Array.from(
          nextCategories,
        ),

      subcategories:
        nextSubcategories,
    };

    setCatalog(
      nextCatalog,
    );

    memoryRecipeCatalog =
      nextCatalog;

    setBulkRecipes('');

    setShowBulkRecipes(
      false,
    );

    setQuery('');

    setCategory(
      'ALL',
    );

    setSelectedIndex(
      firstAddedIndex,
    );

    setRecipePage(
      recipePageForIndex(
        firstAddedIndex,
      ),
    );

    setError('');

    setMessage(
      `${added.length} recipe${
        added.length === 1
          ? ''
          : 's'
      } added${
        skipped
          ? ` · ${skipped} duplicate/invalid skipped`
          : ''
      }. Click Save & Sync to publish.`,
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

    setRecipePage(
      recipePageForIndex(
        index,
      ),
    );
  }

  async function deleteSelectedRecipe() {
    if (
      !catalog ||
      selectedIndex === null ||
      !selectedDish
    ) {
      return;
    }

    const name =
      recipeName(selectedDish);

    const confirmed =
      window.confirm(
        `Delete ${name}? This will delete both the Recipe and linked Dish.`,
      );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setMessage('');
    setError('');

    try {
      const response =
        await fetch(
          `/api/admin/dishes/item?name=${encodeURIComponent(
            name,
          )}`,
          {
            method: 'DELETE',
          },
        );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Could not delete recipe and dish.',
        );
      }

      try {
        localStorage.removeItem(
          RECIPE_CACHE_KEY,
        );
      } catch {
        // Cache is optional.
      }

      await loadRecipes();

      setMessage(
        `${name} recipe and linked dish deleted.`,
      );

      setSyncStatus('synced');

      setSyncMessage(
        '✓ Recipe and Dish removed together',
      );
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Could not delete recipe and dish.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveRecipes() {
    if (!catalog) {
      return;
    }

    setSaving(true);
    setSyncStatus(
      'syncing',
    );
    setSyncMessage(
      'Saving and syncing to Dish Master…',
    );
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
          ? applyRecipeWastage(
              recipeTotal(
                activeDish,
              ) /
                activeGuests,
            )
          : 0;

      setSyncStatus(
        'synced',
      );

      setSyncMessage(
        `✓ ${syncedDishes} recipe${
          syncedDishes === 1
            ? ''
            : 's'
        } synced to Dish Master`,
      );

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
      setSyncStatus(
        'error',
      );

      setSyncMessage(
        'Sync failed — save again to retry.',
      );

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

  const rawPerPerson =
    totalCost /
    guests;

  const finalPerPerson =
    applyRecipeWastage(
      rawPerPerson,
    );

  const wastagePerPerson =
    Math.max(
      0,
      finalPerPerson -
        Math.round(
          rawPerPerson *
            100,
        ) /
          100,
    );

  const finalTotalCost =
    finalPerPerson *
    guests;

  const missingRateCount =
    ingredients.filter(
      (ingredient) =>
        !(
          ingredientRate(
            ingredient,
          ) > 0
        ),
    ).length;

  const estimatedRateCount =
    ingredients.filter(
      (ingredient) =>
        text(
          ingredient.rateSource,
        ) ===
        'category_estimate',
    ).length;

  const qualityRecipe =
    selectedDish
      ? readCostableRecipe(
          selectedDish,
        )
      : null;

  const recipeQuality =
    assessRecipeQuality(
      qualityRecipe,
      {
        missingRates:
          missingRateCount,

        estimatedRates:
          estimatedRateCount,

        costPerPlate:
          finalPerPerson,
      },
    );

  const selectedCategory =
    text(
      selectedDish?.category,
    ) ||
    'Other';

  const selectedSubcategory =
    text(
      selectedDish
        ?.subcategory,
    );

  const selectedSubcategories =
    Array.from(
      new Set([
        ...(
          catalog
            ?.subcategories?.[
              selectedCategory
            ] ||
          []
        ),

        ...(
          selectedSubcategory
            ? [
                selectedSubcategory,
              ]
            : []
        ),
      ]),
    ).sort(
      (a, b) =>
        a.localeCompare(
          b,
        ),
    );

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

          .recipe-fast-actions {
            flex-wrap:wrap;
          }

          .recipe-fast-bulk-recipes {
            display:grid;
            gap:10px;
            padding:14px;
            border:1px solid #303944;
            border-radius:14px;
            background:#10161e;
          }

          .recipe-fast-bulk-head {
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:12px;
          }

          .recipe-fast-bulk-head div {
            display:grid;
            gap:3px;
          }

          .recipe-fast-bulk-head strong {
            font-size:14px;
          }

          .recipe-fast-bulk-head span {
            color:#8995a4;
            font-size:10px;
          }

          .recipe-fast-bulk-textarea {
            width:100%;
            min-height:170px;
            resize:vertical;
            padding:12px;
            border:1px solid #303844;
            border-radius:10px;
            outline:0;
            background:#0b1016;
            color:#e7edf4;
            font:inherit;
            font-size:11px;
            line-height:1.6;
          }

          .recipe-fast-bulk-textarea:focus {
            border-color:#428de8;
          }

          .recipe-fast-bulk-footer {
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:12px;
          }

          .recipe-fast-bulk-footer small {
            color:#7f8b99;
            font-size:9px;
          }

          .recipe-fast-sync {
            padding:9px 11px;
            border:1px solid #303944;
            border-radius:10px;
            background:#111820;
            color:#8794a3;
            font-size:10px;
            font-weight:800;
          }

          .recipe-fast-sync.synced {
            border-color:rgba(52,199,89,.25);
            background:rgba(52,199,89,.07);
            color:#8ee6a5;
          }

          .recipe-fast-sync.syncing {
            border-color:rgba(64,156,255,.25);
            background:rgba(64,156,255,.07);
            color:#8cc5ff;
          }

          .recipe-fast-sync.error {
            border-color:rgba(255,90,90,.25);
            background:rgba(255,90,90,.07);
            color:#ff9b94;
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
            grid-template-columns:2fr 1fr 1fr 1fr;
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
            grid-template-columns:repeat(4,1fr);
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

          .recipe-fast-quality {
            display:grid;
            gap:9px;
            margin:0 0 14px;
            padding:12px;
            border:1px solid #303944;
            border-radius:12px;
            background:#111820;
          }

          .recipe-fast-quality.ready {
            border-color:rgba(52,199,89,.32);
            background:rgba(52,199,89,.06);
          }

          .recipe-fast-quality.review {
            border-color:rgba(255,159,10,.34);
            background:rgba(255,159,10,.06);
          }

          .recipe-fast-quality.blocked {
            border-color:rgba(255,69,58,.34);
            background:rgba(255,69,58,.06);
          }

          .recipe-fast-quality-head {
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:10px;
          }

          .recipe-fast-quality-head strong {
            font-size:12px;
          }

          .recipe-fast-quality-badge {
            padding:5px 8px;
            border:1px solid #3b4653;
            border-radius:999px;
            font-size:9px;
            font-weight:900;
          }

          .recipe-fast-quality.ready
          .recipe-fast-quality-badge {
            color:#8ee6a5;
          }

          .recipe-fast-quality.review
          .recipe-fast-quality-badge {
            color:#ffc267;
          }

          .recipe-fast-quality.blocked
          .recipe-fast-quality-badge {
            color:#ff9b94;
          }

          .recipe-fast-quality-metrics {
            display:grid;
            grid-template-columns:repeat(3,1fr);
            gap:6px;
          }

          .recipe-fast-quality-metrics div {
            padding:8px;
            border:1px solid #29323d;
            border-radius:9px;
            background:rgba(0,0,0,.12);
          }

          .recipe-fast-quality-metrics span,
          .recipe-fast-quality-metrics b {
            display:block;
          }

          .recipe-fast-quality-metrics span {
            color:#788593;
            font-size:8px;
            text-transform:uppercase;
          }

          .recipe-fast-quality-metrics b {
            margin-top:3px;
            font-size:11px;
          }

          .recipe-fast-quality-issues {
            display:grid;
            gap:4px;
            margin:0;
            padding-left:18px;
            color:#aab4c0;
            font-size:10px;
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
            {typeof window !== 'undefined' &&
            new URLSearchParams(window.location.search).get('from') === 'dishes' ? (
              <button
                className="recipe-fast-button"
                type="button"
                onClick={() =>
                  window.location.assign('/admin/dishes')
                }
              >
                ← Back to Dishes
              </button>
            ) : null}

            <button
              className="recipe-fast-button"
              type="button"
              onClick={() =>
                setShowBulkRecipes(
                  (current) =>
                    !current,
                )
              }
              disabled={
                !catalog
              }
            >
              + Bulk Recipes
            </button>

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
                ? 'Saving & Syncing…'
                : 'Save & Sync'}
            </button>
          </div>
        </div>

        {showBulkRecipes ? (
          <div className="recipe-fast-bulk-recipes">
            <div className="recipe-fast-bulk-head">
              <div>
                <strong>
                  Bulk Recipe Adder
                </strong>

                <span>
                  Add many recipe headers in one paste.
                </span>
              </div>

              <button
                className="recipe-fast-button"
                type="button"
                onClick={() =>
                  setShowBulkRecipes(
                    false,
                  )
                }
              >
                Close
              </button>
            </div>

            <textarea
              className="recipe-fast-bulk-textarea"
              value={bulkRecipes}
              onChange={(event) =>
                setBulkRecipes(
                  event.target.value,
                )
              }
              placeholder={`Dish Name | Category | Subcategory | Serving Qty | Serving Unit | Base Guests

Mix Veg | Sabji | Dry | 100 | gram | 100
Matar Paneer | Paneer | Gravy | 120 | gram | 100
Veg Pulao | Rice | Pulao | 150 | gram | 100
Gulab Jamun | Sweet | Indian Sweet | 1 | piece | 100`}
            />

            <div className="recipe-fast-bulk-footer">
              <small>
                Format: Dish Name | Category | Subcategory | Serving Qty | Serving Unit | Base Guests
              </small>

              <button
                className="recipe-fast-button primary"
                type="button"
                disabled={
                  !bulkRecipes.trim()
                }
                onClick={
                  addBulkRecipes
                }
              >
                Add Recipes
              </button>
            </div>
          </div>
        ) : null}

        <div
          className={`recipe-fast-sync ${
            syncStatus
          }`}
        >
          {syncMessage}
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
              {paginatedRecipes.length ? (
                paginatedRecipes.map(
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
              {visibleRecipes.length >
              RECIPES_PER_PAGE ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      '1fr auto 1fr',
                    gap: '6px',
                    alignItems: 'center',
                    padding: '9px',
                    borderTop:
                      '1px solid #222a33',
                    background:
                      '#0d1218',
                  }}
                >
                  <button
                    className="recipe-fast-button"
                    type="button"
                    disabled={
                      recipePage <= 1
                    }
                    onClick={() =>
                      setRecipePage(
                        (current) =>
                          Math.max(
                            1,
                            current - 1,
                          ),
                      )
                    }
                  >
                    ← Prev
                  </button>

                  <span
                    style={{
                      color: '#8995a4',
                      fontSize: '10px',
                      textAlign: 'center',
                    }}
                  >
                    {recipePage}
                    {' / '}
                    {recipePageCount}
                    <br />
                    {visibleRecipes.length}
                    {' recipes'}
                  </span>

                  <button
                    className="recipe-fast-button"
                    type="button"
                    disabled={
                      recipePage >=
                      recipePageCount
                    }
                    onClick={() =>
                      setRecipePage(
                        (current) =>
                          Math.min(
                            recipePageCount,
                            current + 1,
                          ),
                      )
                    }
                  >
                    Next →
                  </button>
                </div>
              ) : null}
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

                      <select
                        className="recipe-fast-input"
                        value={
                          selectedCategory
                        }
                        onChange={(event) => {
                          const nextCategory =
                            event
                              .target
                              .value;

                          const allowedSubcategories =
                            catalog
                              ?.subcategories?.[
                                nextCategory
                              ] ||
                            [];

                          updateDish(
                            selectedIndex,
                            {
                              category:
                                nextCategory,

                              subcategory:
                                allowedSubcategories
                                  .includes(
                                    selectedSubcategory,
                                  )
                                  ? selectedSubcategory
                                  : '',
                            },
                          );
                        }}
                      >
                        {categories.map(
                          (item) => (
                            <option
                              key={
                                item
                              }
                              value={
                                item
                              }
                            >
                              {item}
                            </option>
                          ),
                        )}
                      </select>
                    </div>

                    <div className="recipe-fast-field">
                      <label>
                        Subcategory
                      </label>

                      <select
                        className="recipe-fast-input"
                        value={
                          selectedSubcategory
                        }
                        onChange={(event) =>
                          updateDish(
                            selectedIndex,
                            {
                              subcategory:
                                event
                                  .target
                                  .value,
                            },
                          )
                        }
                      >
                        <option value="">
                          No subcategory
                        </option>

                        {selectedSubcategories.map(
                          (item) => (
                            <option
                              key={
                                item
                              }
                              value={
                                item
                              }
                            >
                              {item}
                            </option>
                          ),
                        )}
                      </select>
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

                    <div className="recipe-fast-field">
                      <label>
                        Serving Quantity
                      </label>

                      <input
                        className="recipe-fast-input"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={Math.max(
                          0.01,
                          numberValue(
                            selectedDish.servingSize,
                            1,
                          ),
                        )}
                        onChange={(event) =>
                          changeServingQuantity(
                            Number(
                              event.target.value,
                            ),
                          )
                        }
                      />
                    </div>

                    <div className="recipe-fast-field">
                      <label>
                        Serving Unit
                      </label>

                      <select
                        className="recipe-fast-input"
                        value={
                          text(
                            selectedDish.servingUnit,
                          ) || 'serving'
                        }
                        onChange={(event) =>
                          updateDish(
                            selectedIndex,
                            {
                              servingUnit:
                                event.target.value,
                            },
                          )
                        }
                      >
                        <option value="gram">
                          gram
                        </option>

                        <option value="ml">
                          ml
                        </option>

                        <option value="piece">
                          piece
                        </option>

                        <option value="serving">
                          serving
                        </option>

                        <option value="kg">
                          kg
                        </option>

                        <option value="ltr">
                          ltr
                        </option>
                      </select>
                    </div>
                  </div>

                  <div className="recipe-fast-costs">
                    <div className="recipe-fast-cost">
                      <span>
                        Raw Batch Cost
                      </span>

                      <b>
                        {money(
                          totalCost,
                        )}
                      </b>
                    </div>

                    <div className="recipe-fast-cost">
                      <span>
                        Wastage 8%
                      </span>

                      <b>
                        {money(
                          wastagePerPerson *
                            guests,
                        )}
                      </b>
                    </div>

                    <div className="recipe-fast-cost">
                      <span>
                        Final Batch Cost
                      </span>

                      <b>
                        {money(
                          finalTotalCost,
                        )}
                      </b>
                    </div>

                    <div className="recipe-fast-cost">
                      <span>
                        Final / Person
                      </span>

                      <b>
                        {money(
                          finalPerPerson,
                        )}
                      </b>
                    </div>
                  </div>

                  <div
                    className={`recipe-fast-quality ${
                      recipeQuality.status
                        .toLowerCase()
                    }`}
                  >
                    <div className="recipe-fast-quality-head">
                      <strong>
                        Recipe Quality Gate
                      </strong>

                      <span className="recipe-fast-quality-badge">
                        {recipeQuality.status}
                        {' · '}
                        {recipeQuality.score}/100
                      </span>
                    </div>

                    <div className="recipe-fast-quality-metrics">
                      <div>
                        <span>
                          Rate coverage
                        </span>

                        <b>
                          {recipeQuality.rateCoveragePercent}%
                        </b>
                      </div>

                      <div>
                        <span>
                          Missing rates
                        </span>

                        <b>
                          {recipeQuality.missingRates}
                        </b>
                      </div>

                      <div>
                        <span>
                          Warnings
                        </span>

                        <b>
                          {recipeQuality.warningCount}
                        </b>
                      </div>
                    </div>

                    {recipeQuality.issues.length ? (
                      <ul className="recipe-fast-quality-issues">
                        {recipeQuality.issues
                          .slice(
                            0,
                            5,
                          )
                          .map(
                            (
                              issue,
                              index,
                            ) => (
                              <li
                                key={`${issue.code}-${index}`}
                              >
                                {issue.message}
                              </li>
                            ),
                          )}
                      </ul>
                    ) : null}
                  </div>

                  <div className="recipe-fast-heading">
                    <h2>
                      Ingredients
                    </h2>

                    <div
                      style={{
                        display: 'flex',
                        gap: '7px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <button
                        className="recipe-fast-button"
                        type="button"
                        onClick={
                          addIngredient
                        }
                      >
                        + Ingredient
                      </button>

                      <button
                        className="recipe-fast-remove"
                        type="button"
                        style={{
                          width: 'auto',
                          padding: '0 12px',
                        }}
                        disabled={saving}
                        onClick={() =>
                          void deleteSelectedRecipe()
                        }
                      >
                        Delete Recipe + Dish
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gap: '8px',
                      marginBottom: '12px',
                      padding: '12px',
                      border: '1px solid #29323d',
                      borderRadius: '12px',
                      background: '#111820',
                    }}
                  >
                    <div>
                      <strong
                        style={{
                          fontSize: '12px',
                        }}
                      >
                        Paste Bulk Ingredients
                      </strong>

                      <div
                        style={{
                          marginTop: '4px',
                          color: '#7f8b99',
                          fontSize: '10px',
                        }}
                      >
                        One per line:
                        Name, Qty, Unit, Rate
                      </div>
                    </div>

                    <textarea
                      className="recipe-fast-input"
                      value={bulkIngredients}
                      rows={6}
                      style={{
                        minHeight: '130px',
                        paddingTop: '10px',
                        paddingBottom: '10px',
                        resize: 'vertical',
                      }}
                      placeholder={`Paneer,8,kg,280
Onion,2,kg,30
Tomato,3,kg,35
Cream,0.8,kg,220`}
                      onChange={(event) =>
                        setBulkIngredients(
                          event.target.value,
                        )
                      }
                    />

                    <div>
                      <button
                        className="recipe-fast-button primary"
                        type="button"
                        disabled={
                          !bulkIngredients.trim()
                        }
                        onClick={
                          addBulkIngredients
                        }
                      >
                        + Add Bulk Ingredients
                      </button>
                    </div>
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

                            <select
                              className="recipe-fast-input"
                              value=""
                              onChange={(event) => {
                                const selected =
                                  catalog?.rates.find(
                                    (item) =>
                                      text(item.id) ===
                                      event.target.value,
                                  );

                                if (!selected) return;

                                updateIngredient(
                                  selectedIndex,
                                  ingredientIndex,
                                  {
                                    name: text(selected.name),
                                    ingredientName: text(selected.name),
                                    rateKey: text(selected.id),
                                    marketRate: numberValue(selected.rate),
                                    rate: numberValue(selected.rate),
                                    unit: text(selected.unit) || 'kg',
                                    rateUnit: text(selected.unit) || 'kg',
                                  },
                                );
                              }}
                            >
                              <option value="">
                                Select from Ingredient Master
                              </option>

                              {(catalog?.rates || [])
                                .slice()
                                .sort((a, b) =>
                                  text(a.name).localeCompare(
                                    text(b.name),
                                  ),
                                )
                                .map((item) => (
                                  <option
                                    key={text(item.id)}
                                    value={text(item.id)}
                                  >
                                    {text(item.name)}
                                    {' · ₹'}
                                    {numberValue(item.rate)}
                                    {'/'}
                                    {text(item.unit)}
                                  </option>
                                ))}
                            </select>

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
