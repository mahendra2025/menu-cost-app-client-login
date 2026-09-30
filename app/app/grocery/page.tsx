'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';

import AppShell, {
  LockedCard,
} from '../../components/AppShell';

import {
  getSession,
  loadWork,
  saveWork,
} from '../../../lib/store';

import type {
  GroceryIngredientPurchaseOverride,
  Session,
  WorkState,
} from '../../../lib/types';

import {
  buildFunctionGroceryPlan,
  downloadFunctionGroceryCsv,
  groceryPurchaseKey,
  type FunctionGroceryItem,
  type GroceryIngredientRate,
  type GroceryRecipe,
  type GroceryRecipeCoverage,
} from '../../../lib/functionGrocery';

import {
  canonicalIngredientName,
  inferIngredientCategory,
  INGREDIENT_CATEGORIES,
} from '../../../lib/ingredientCatalog';

type ClientIngredientRate =
  GroceryIngredientRate & {
    id: string;
    category?: string;
    defaultRate?: number;
    isCustomRate?: boolean;
  };

type RateSaveState = {
  status:
    | 'idle'
    | 'saving'
    | 'saved'
    | 'error';
  message?: string;
};

function money(value: number) {
  return `₹${Math.max(0, Number(value) || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function quantity(value: number) {
  return Math.max(0, Number(value) || 0)
    .toFixed(3)
    .replace(/\.?0+$/, '');
}

function normalize(value: unknown) {
  return String(value || '')
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('en-IN')
    .replace(/\s+/g, ' ');
}

function unitFamily(unit: string) {
  const value = normalize(unit);

  if (
    [
      'kg',
      'kilogram',
      'kilograms',
      'kgs',
      'g',
      'gm',
      'gms',
      'gram',
      'grams',
    ].includes(value)
  ) {
    return 'mass';
  }

  if (
    [
      'l',
      'lt',
      'ltr',
      'litre',
      'litres',
      'liter',
      'liters',
      'ml',
      'millilitre',
      'millilitres',
      'milliliter',
      'milliliters',
    ].includes(value)
  ) {
    return 'volume';
  }

  if (
    [
      'piece',
      'pieces',
      'pc',
      'pcs',
      'nos',
      'no',
      'unit',
      'units',
    ].includes(value)
  ) {
    return 'piece';
  }

  if (
    [
      'packet',
      'packets',
      'pack',
      'packs',
      'pkt',
    ].includes(value)
  ) {
    return 'packet';
  }

  return `other:${value || 'unit'}`;
}

function displayRateFromSource(
  sourceRate: number,
  sourceUnit: string,
) {
  const rate =
    Math.max(
      0,
      Number(sourceRate) || 0,
    );

  const normalizedUnit =
    normalize(sourceUnit);

  if (
    [
      'g',
      'gm',
      'gms',
      'gram',
      'grams',
    ].includes(normalizedUnit)
  ) {
    return rate * 1000;
  }

  if (
    [
      'ml',
      'millilitre',
      'millilitres',
      'milliliter',
      'milliliters',
    ].includes(normalizedUnit)
  ) {
    return rate * 1000;
  }

  return rate;
}

function sourceRateFromDisplay(
  displayRate: number,
  sourceUnit: string,
) {
  const rate =
    Math.max(
      0,
      Number(displayRate) || 0,
    );

  const normalizedUnit =
    normalize(sourceUnit);

  if (
    [
      'g',
      'gm',
      'gms',
      'gram',
      'grams',
      'ml',
      'millilitre',
      'millilitres',
      'milliliter',
      'milliliters',
    ].includes(normalizedUnit)
  ) {
    return rate / 1000;
  }

  return rate;
}

function rateRowForItem(
  item: FunctionGroceryItem,
  rates: ClientIngredientRate[],
) {
  const ingredientName =
    normalize(
      canonicalIngredientName(
        item.name,
      ),
    );

  const family =
    unitFamily(
      item.unit,
    );

  return rates.find(
    (rate) =>
      normalize(
        canonicalIngredientName(
          rate.name,
        ),
      ) ===
        ingredientName &&
      unitFamily(
        rate.unit,
      ) ===
        family,
  );
}

function groceryCategoryRank(
  category: string,
) {
  const index =
    INGREDIENT_CATEGORIES.findIndex(
      (value) =>
        value === category,
    );

  return index >= 0
    ? index
    : INGREDIENT_CATEGORIES.length;
}

function groceryRateKey(
  item: FunctionGroceryItem,
) {
  return [
    normalize(
      canonicalIngredientName(
        item.name,
      ),
    ),
    normalize(
      item.unit,
    ),
  ].join('::');
}

export default function GroceryPage() {
  const router = useRouter();

  const [
    session,
    setSession,
  ] =
    useState<Session | null>(
      null,
    );

  const [
    work,
    setWork,
  ] =
    useState<WorkState | null>(
      null,
    );

  const [
    recipes,
    setRecipes,
  ] =
    useState<GroceryRecipe[]>(
      [],
    );

  const [
    rates,
    setRates,
  ] =
    useState<
      ClientIngredientRate[]
    >([]);

  const [
    loadingData,
    setLoadingData,
  ] =
    useState(true);

  const [
    loadError,
    setLoadError,
  ] =
    useState('');

  const [
    search,
    setSearch,
  ] =
    useState('');

  const [
    functionFilter,
    setFunctionFilter,
  ] =
    useState('ALL');

  const [
    categoryFilter,
    setCategoryFilter,
  ] =
    useState('ALL');

  const [
    rateFilter,
    setRateFilter,
  ] =
    useState<
      'ALL' |
      'MISSING' |
      'PRICED'
    >('ALL');

  const [
    rateDrafts,
    setRateDrafts,
  ] =
    useState<
      Record<string, string>
    >({});

  const [
    rateStates,
    setRateStates,
  ] =
    useState<
      Record<
        string,
        RateSaveState
      >
    >({});

  const [
    rateMessage,
    setRateMessage,
  ] =
    useState('');

  const [
    rateMessageType,
    setRateMessageType,
  ] =
    useState<
      'saving' |
      'success' |
      'error'
    >('success');

  useEffect(() => {
    const current =
      getSession();

    if (!current) {
      router.replace(
        '/login',
      );

      return;
    }

    setSession(current);

    const savedWork =
      loadWork(
        current.tenantId,
      );

    setWork(
      savedWork,
    );

    if (
      savedWork.menu.length ===
      0
    ) {
      setLoadingData(
        false,
      );

      return;
    }

    const dishNames =
      Array.from(
        new Set(
          savedWork.menu
            .filter(
              (item) =>
                item.coverageStatus !==
                'REJECTED',
            )
            .map(
              (item) =>
                item.name,
            )
            .filter(Boolean),
        ),
      );

    void Promise.all([
      fetch(
        '/api/recipe-ingredients',
        {
          method:
            'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body:
            JSON.stringify({
              dishNames,
            }),
        },
      ).then(
        async (
          response,
        ) => {
          const data =
            await response.json();

          if (
            !response.ok
          ) {
            throw new Error(
              data.error ||
              'Could not load recipe ingredients.',
            );
          }

          return Array.isArray(
            data.recipes,
          )
            ? data.recipes
            : [];
        },
      ),

      fetch(
        `/api/client/ingredients?city=${encodeURIComponent(
          savedWork.event.city ||
            savedWork.profile.city ||
            '',
        )}`,
        {
          cache:
            'no-store',
        },
      ).then(
        async (
          response,
        ) => {
          const data =
            await response.json();

          if (
            !response.ok
          ) {
            throw new Error(
              data.error ||
              'Could not load ingredient rates.',
            );
          }

          return Array.isArray(
            data.rates,
          )
            ? data.rates
            : [];
        },
      ),
    ])
      .then(
        ([
          recipeValues,
          rateValues,
        ]) => {
          setRecipes(
            recipeValues as
              GroceryRecipe[],
          );

          setRates(
            rateValues as
              ClientIngredientRate[],
          );

          setLoadError(
            '',
          );
        },
      )
      .catch(
        (error) => {
          setLoadError(
            error instanceof
            Error
              ? error.message
              : 'Grocery data could not be loaded.',
          );
        },
      )
      .finally(
        () => {
          setLoadingData(
            false,
          );
        },
      );
  }, [router]);

  const plan =
    useMemo(
      () =>
        work
          ? buildFunctionGroceryPlan(
              work,
              recipes,
              rates,
            )
          : null,
      [
        work,
        recipes,
        rates,
      ],
    );

  const selectedFunction =
    plan &&
    functionFilter !==
      'ALL'
      ? plan.functions.find(
          (section) =>
            section.key ===
            functionFilter,
        )
      : null;

  const scopedItems =
    plan
      ? selectedFunction
        ? selectedFunction.items
        : plan.combinedItems
      : [];

  const categories =
    useMemo(
      () =>
        Array.from(
          new Set(
            scopedItems.map(
              (item) =>
                inferIngredientCategory(
                  item.name,
                ),
            ),
          ),
        ).sort(
          (
            left,
            right,
          ) =>
            groceryCategoryRank(
              left,
            ) -
              groceryCategoryRank(
                right,
              ) ||
            left.localeCompare(
              right,
            ),
        ),
      [scopedItems],
    );

  const normalizedSearch =
    normalize(
      search,
    );

  const filteredItems =
    useMemo(
      () =>
        scopedItems
          .filter(
            (item) => {
              const category =
                inferIngredientCategory(
                  item.name,
                );

              const matchesSearch =
                !normalizedSearch ||
                normalize(
                  item.name,
                ).includes(
                  normalizedSearch,
                ) ||
                item.dishes.some(
                  (dish) =>
                    normalize(
                      dish,
                    ).includes(
                      normalizedSearch,
                    ),
                );

              const matchesCategory =
                categoryFilter ===
                  'ALL' ||
                category ===
                  categoryFilter;

              const matchesRate =
                rateFilter ===
                  'ALL'
                  ? true
                  : rateFilter ===
                      'MISSING'
                    ? !item.hasRate
                    : item.hasRate;

              return (
                matchesSearch &&
                matchesCategory &&
                matchesRate
              );
            },
          )
          .sort(
            (
              left,
              right,
            ) => {
              const leftCategory =
                inferIngredientCategory(
                  left.name,
                );

              const rightCategory =
                inferIngredientCategory(
                  right.name,
                );

              return (
                groceryCategoryRank(
                  leftCategory,
                ) -
                  groceryCategoryRank(
                    rightCategory,
                  ) ||
                left.name.localeCompare(
                  right.name,
                )
              );
            },
          ),
      [
        scopedItems,
        normalizedSearch,
        categoryFilter,
        rateFilter,
      ],
    );

  if (
    !session ||
    !work
  ) {
    return (
      <AppShell
        title="Grocery"
        subtitle="Build the event ingredient requirement from saved recipes"
      >
        <div className="content-grid">
          <div className="glass-card">
            Loading grocery…
          </div>
        </div>
      </AppShell>
    );
  }

  if (
    session.status ===
    'EXPIRED'
  ) {
    return (
      <AppShell
        title="Grocery"
      >
        <LockedCard />
      </AppShell>
    );
  }

  const tenantId =
    session.tenantId;

  const totalIngredientCount =
    plan?.combinedItems
      .length || 0;

  const pricedIngredientCount =
    plan?.pricedIngredientCount ||
    0;

  const missingIngredientCount =
    plan?.unpricedIngredientCount ||
    0;

  const groceryTotal =
    plan?.combinedPurchaseCost ||
    0;

  const totalCovers =
    plan?.totalFunctionCovers ||
    0;

  const groceryPerCover =
    totalCovers > 0
      ? groceryTotal /
        totalCovers
      : 0;

  const categoryCount =
    new Set(
      (
        plan?.combinedItems ||
        []
      ).map(
        (item) =>
          inferIngredientCategory(
            item.name,
          ),
      ),
    ).size;

  const recipeIssues =
    plan?.recipeCoverage.filter(
      (recipe) =>
        recipe.status !==
        'COMPLETE',
    ) || [];

  const totalRecipeCount =
    plan?.recipeCoverage.length ||
    0;

  const defaultWastagePercent =
    Math.min(
      100,
      Math.max(
        0,
        Number(
          work
            .groceryPurchaseSettings
            ?.defaultWastagePercent,
        ) || 0,
      ),
    );

  function updatePurchaseSettings(
    nextWork: WorkState,
  ) {
    setWork(nextWork);
    saveWork(
      tenantId,
      nextWork,
    );
  }

  function updateDefaultWastage(
    value: number,
  ) {
    const nextValue =
      Math.min(
        100,
        Math.max(
          0,
          Number(value) || 0,
        ),
      );

    updatePurchaseSettings({
      ...work,
      groceryPurchaseSettings: {
        ...work
          .groceryPurchaseSettings,
        defaultWastagePercent:
          nextValue,
        ingredientOverrides:
          work
            .groceryPurchaseSettings
            ?.ingredientOverrides ||
          [],
      },
    });
  }

  function updateIngredientPurchase(
    item: FunctionGroceryItem,
    patch:
      Partial<GroceryIngredientPurchaseOverride>,
  ) {
    const key =
      groceryPurchaseKey(
        item.name,
        item.unit,
      );
    const settings =
      work.groceryPurchaseSettings ||
      {};
    const overrides =
      settings
        .ingredientOverrides ||
      [];
    const existing =
      overrides.find(
        (override) =>
          override.key === key,
      ) || { key };
    const nextOverride = {
      ...existing,
      ...patch,
      key,
      updatedAt:
        new Date()
          .toISOString(),
    };
    const keepOverride =
      (
        Number(
          nextOverride
            .requiredQuantityOverride,
        ) > 0
      ) ||
      (
        nextOverride
          .wastagePercent !==
        undefined
      ) ||
      (
        Number(
          nextOverride.roundTo,
        ) > 0
      );
    const nextOverrides =
      keepOverride
        ? [
            ...overrides.filter(
              (override) =>
                override.key !==
                key,
            ),
            nextOverride,
          ]
        : overrides.filter(
            (override) =>
              override.key !==
              key,
          );

    updatePurchaseSettings({
      ...work,
      groceryPurchaseSettings: {
        ...settings,
        defaultWastagePercent:
          settings
            .defaultWastagePercent ??
          0,
        ingredientOverrides:
          nextOverrides,
      },
    });
  }

  function openRecipeEditor(
    recipe: GroceryRecipeCoverage,
  ) {
    const params =
      new URLSearchParams({
        from: 'grocery',
      });

    if (
      recipe.status ===
      'MISSING'
    ) {
      params.set(
        'create',
        recipe.name,
      );
      params.set(
        'category',
        recipe.category ||
          'Other',
      );
    } else {
      params.set(
        'recipe',
        recipe.name,
      );
    }

    router.push(
      `/admin/recipes?${params.toString()}`,
    );
  }

  async function saveIngredientRate(
    item: FunctionGroceryItem,
    displayRate: number,
  ) {
    const key =
      groceryRateKey(
        item,
      );

    const safeDisplayRate =
      Math.max(
        0,
        Number(displayRate) || 0,
      );

    if (
      !(safeDisplayRate > 0)
    ) {
      const message =
        'Ingredient rate must be greater than ₹0.';

      setRateStates(
        (current) => ({
          ...current,
          [key]: {
            status: 'error',
            message,
          },
        }),
      );

      setRateMessageType(
        'error',
      );

      setRateMessage(
        message,
      );

      return;
    }

    const source =
      rateRowForItem(
        item,
        rates,
      );

    const sourceUnit =
      source?.unit ||
      item.unit;

    const sourceRate =
      sourceRateFromDisplay(
        safeDisplayRate,
        sourceUnit,
      );

    setRateStates(
      (current) => ({
        ...current,
        [key]: {
          status: 'saving',
          message: 'Saving…',
        },
      }),
    );

    setRateMessageType(
      'saving',
    );

    setRateMessage(
      `Saving ${item.name} rate…`,
    );

    try {
      const response =
        await fetch(
          '/api/client/ingredients',
          {
            method:
              'PUT',
            headers: {
              'Content-Type':
                'application/json',
            },
            body:
              JSON.stringify({
                rates: [
                  {
                    ...(source
                      ? {
                          ingredientId:
                            source.id,
                        }
                      : {
                          name:
                            item.name,
                          category:
                            inferIngredientCategory(
                              item.name,
                            ),
                          unit:
                            sourceUnit,
                        }),
                    rate:
                      sourceRate,
                  },
                ],
              }),
          },
        );

      const data =
        await response.json();

      if (
        !response.ok
      ) {
        throw new Error(
          data.error ||
          'Ingredient rate could not be saved.',
        );
      }

      const savedRate =
        Array.isArray(
          data.savedRates,
        )
          ? data.savedRates[0] as
              ClientIngredientRate |
              undefined
          : undefined;

      setRates(
        (current) => {
          if (savedRate) {
            const exists =
              current.some(
                (rate) =>
                  rate.id ===
                  savedRate.id,
              );

            return exists
              ? current.map(
                  (rate) =>
                    rate.id ===
                    savedRate.id
                      ? {
                          ...rate,
                          ...savedRate,
                        }
                      : rate,
                )
              : [
                  ...current,
                  savedRate,
                ];
          }

          if (source) {
            return current.map(
              (rate) =>
                rate.id ===
                source.id
                  ? {
                      ...rate,
                      rate:
                        sourceRate,
                      isCustomRate:
                        true,
                    }
                  : rate,
            );
          }

          return current;
        },
      );

      setRateDrafts(
        (current) => ({
          ...current,
          [key]:
            safeDisplayRate.toFixed(
              2,
            ),
        }),
      );

      const created =
        Number(
          data.created,
        ) > 0;

      const message =
        created
          ? 'Saved · Ingredient Master item created'
          : 'Saved';

      setRateStates(
        (current) => ({
          ...current,
          [key]: {
            status: 'saved',
            message,
          },
        }),
      );

      setRateMessageType(
        'success',
      );

      setRateMessage(
        created
          ? `${item.name} created in Ingredient Master and rate saved.`
          : `${item.name} rate saved.`,
      );
    } catch (
      error
    ) {
      const message =
        error instanceof
        Error
          ? error.message
          : 'Ingredient rate could not be saved.';

      setRateStates(
        (current) => ({
          ...current,
          [key]: {
            status: 'error',
            message,
          },
        }),
      );

      setRateMessageType(
        'error',
      );

      setRateMessage(
        `Error: ${message}`,
      );
    }
  }

  async function downloadPdf() {
    if (
      !work ||
      !plan ||
      !plan.combinedItems
        .length
    ) {
      return;
    }

    const {
      downloadGroceryEventPdf,
    } =
      await import(
        '../../../lib/groceryEventPdf'
      );

    downloadGroceryEventPdf(
      work,
      plan,
    );
  }

  return (
    <AppShell
      title="Grocery"
      subtitle="See what to buy, how much you need, and the estimated ingredient cost"
    >
      <section className="content-grid grocery-workspace-page">
        <div className="grocery-overview-card">
          <div className="grocery-overview-copy">
            <span className="page-eyebrow">
              Ingredient requirement
            </span>

            <h2>
              {work.event.eventName ||
                'Event grocery plan'}
            </h2>

            <p>
              {work.event.clientName
                ? `${work.event.clientName} · `
                : ''}
              {plan?.functions.length ||
                0}{' '}
              {plan?.functions.length ===
              1
                ? 'function'
                : 'functions'}
              {' · '}
              {totalCovers.toLocaleString(
                'en-IN',
              )}{' '}
              function covers
            </p>
          </div>

          <div className="grocery-overview-actions no-print">
            <button
              type="button"
              className="ghost-button"
              disabled={
                !plan ||
                !plan.combinedItems
                  .length
              }
              onClick={() =>
                downloadFunctionGroceryCsv(
                  work,
                  plan!,
                )
              }
            >
              Export CSV
            </button>

            <button
              type="button"
              className="secondary-button"
              disabled={
                !plan ||
                !plan.combinedItems
                  .length
              }
              onClick={() =>
                window.print()
              }
            >
              Print
            </button>

            <button
              type="button"
              className="primary-button"
              disabled={
                !plan ||
                !plan.combinedItems
                  .length
              }
              onClick={() =>
                void downloadPdf()
              }
            >
              Grocery PDF
            </button>
          </div>
        </div>

        {loadingData ? (
          <div className="glass-card grocery-loading-card">
            <span className="upload-spinner" aria-hidden="true" />
            <div>
              <b>
                Building grocery list…
              </b>
              <p>
                Matching saved recipes with ingredient rates.
              </p>
            </div>
          </div>
        ) : null}

        {loadError ? (
          <div
            className="admin-message error"
            role="alert"
          >
            {loadError}
          </div>
        ) : null}

        {!loadingData &&
        work.menu.length === 0 ? (
          <div className="glass-card empty-state">
            <div className="empty-state-icon" aria-hidden="true">
              🧾
            </div>

            <div>
              <h3>
                Add an event menu first
              </h3>
              <p>
                Grocery quantities are generated from saved menu dishes and linked recipes.
              </p>
            </div>

            <button
              className="primary-button"
              type="button"
              onClick={() =>
                router.push(
                  '/app/event?resume=1',
                )
              }
            >
              Open Event & Menu
            </button>
          </div>
        ) : null}

        {!loadingData &&
        work.menu.length > 0 ? (
          <div className="grocery-desktop-workspace">
            <div className="glass-card grocery-main-card">
              <div className="grocery-toolbar no-print">
                <label className="field grocery-search-field">
                  <span>
                    Find ingredient or dish
                  </span>

                  <input
                    className="input"
                    type="search"
                    value={
                      search
                    }
                    onChange={(
                      event,
                    ) =>
                      setSearch(
                        event.target
                          .value,
                      )
                    }
                    placeholder="Search ingredient or used-in dish"
                  />
                </label>

                <label className="field">
                  <span>
                    Function
                  </span>

                  <select
                    className="select"
                    value={
                      functionFilter
                    }
                    onChange={(
                      event,
                    ) => {
                      setFunctionFilter(
                        event.target
                          .value,
                      );

                      setCategoryFilter(
                        'ALL',
                      );
                    }}
                  >
                    <option value="ALL">
                      Combined event
                    </option>

                    {plan?.functions.map(
                      (
                        section,
                      ) => (
                        <option
                          key={
                            section.key
                          }
                          value={
                            section.key
                          }
                        >
                          {[
                            section.dayLabel,
                            section.mealLabel,
                          ]
                            .filter(
                              Boolean,
                            )
                            .join(
                              ' · ',
                            ) ||
                            'Event Menu'}
                          {' · '}
                          {
                            section.pax
                          }{' '}
                          guests
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label className="field">
                  <span>
                    Category
                  </span>

                  <select
                    className="select"
                    value={
                      categoryFilter
                    }
                    onChange={(
                      event,
                    ) =>
                      setCategoryFilter(
                        event.target
                          .value,
                      )
                    }
                  >
                    <option value="ALL">
                      All categories
                    </option>

                    {categories.map(
                      (
                        category,
                      ) => (
                        <option
                          key={
                            category
                          }
                          value={
                            category
                          }
                        >
                          {
                            category
                          }
                        </option>
                      ),
                    )}
                  </select>
                </label>
              </div>

              <div className="grocery-status-tabs no-print">
                <button
                  type="button"
                  className={
                    rateFilter ===
                    'ALL'
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    setRateFilter(
                      'ALL',
                    )
                  }
                >
                  <span>
                    All
                  </span>
                  <b>
                    {
                      scopedItems.length
                    }
                  </b>
                </button>

                <button
                  type="button"
                  className={
                    rateFilter ===
                    'MISSING'
                      ? 'active attention'
                      : 'attention'
                  }
                  onClick={() =>
                    setRateFilter(
                      'MISSING',
                    )
                  }
                >
                  <span>
                    Missing rate
                  </span>
                  <b>
                    {
                      scopedItems.filter(
                        (item) =>
                          !item.hasRate,
                      ).length
                    }
                  </b>
                </button>

                <button
                  type="button"
                  className={
                    rateFilter ===
                    'PRICED'
                      ? 'active ready'
                      : 'ready'
                  }
                  onClick={() =>
                    setRateFilter(
                      'PRICED',
                    )
                  }
                >
                  <span>
                    Priced
                  </span>
                  <b>
                    {
                      scopedItems.filter(
                        (item) =>
                          item.hasRate,
                      ).length
                    }
                  </b>
                </button>
              </div>

              {rateMessage ? (
                <div
                  className={`grocery-rate-message ${rateMessageType}`}
                  role={
                    rateMessageType ===
                    'error'
                      ? 'alert'
                      : 'status'
                  }
                >
                  {rateMessage}
                </div>
              ) : null}

              <div className="grocery-purchase-settings no-print">
                <div>
                  <b>
                    Purchase quantity settings
                  </b>
                  <span>
                    Required quantity can be overridden for this event only. Purchase quantity adds wastage and rounds up to the buying step.
                  </span>
                </div>

                <label>
                  <span>
                    Default wastage %
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    key={`default-wastage-${defaultWastagePercent}`}
                    defaultValue={
                      defaultWastagePercent
                    }
                    onBlur={(event) =>
                      updateDefaultWastage(
                        Number(
                          event.currentTarget
                            .value,
                        ),
                      )
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key ===
                        'Enter'
                      ) {
                        event.currentTarget
                          .blur();
                      }
                    }}
                  />
                </label>
              </div>

              <div className="grocery-recipe-health">
                <div className="grocery-recipe-health-head">
                  <div>
                    <b>
                      Recipe Coverage
                    </b>
                    <span>
                      Grocery is trustworthy only when every menu dish has a complete recipe.
                    </span>
                  </div>

                  <strong>
                    {plan?.completeRecipeCount ||
                      0}
                    /
                    {totalRecipeCount}{' '}
                    complete
                  </strong>
                </div>

                <div className="grocery-recipe-health-stats">
                  <div className="ready">
                    <span>
                      Complete
                    </span>
                    <b>
                      {plan?.completeRecipeCount ||
                        0}
                    </b>
                  </div>

                  <div className="attention">
                    <span>
                      Incomplete
                    </span>
                    <b>
                      {plan?.incompleteRecipeCount ||
                        0}
                    </b>
                  </div>

                  <div className="missing">
                    <span>
                      No recipe
                    </span>
                    <b>
                      {plan?.missingRecipeCount ||
                        0}
                    </b>
                  </div>
                </div>

                {recipeIssues.length ? (
                  <div className="grocery-recipe-issues">
                    {recipeIssues.map(
                      (recipe) => (
                        <div
                          key={`${recipe.status}::${recipe.name}`}
                          className={`grocery-recipe-issue ${recipe.status.toLowerCase()}`}
                        >
                          <div>
                            <b>
                              {recipe.name}
                            </b>
                            <span>
                              {recipe.status ===
                              'MISSING'
                                ? 'No linked recipe. Grocery quantity is blocked for this dish.'
                                : `${recipe.issueCount} ingredient row${recipe.issueCount === 1 ? '' : 's'} need quantity, unit or ingredient details.`}
                            </span>
                          </div>

                          <button
                            type="button"
                            className="ghost-button"
                            onClick={() =>
                              openRecipeEditor(
                                recipe,
                              )
                            }
                          >
                            {recipe.status ===
                            'MISSING'
                              ? 'Make Recipe'
                              : 'Fix Recipe'}
                          </button>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <div className="grocery-recipe-ready">
                    ✓ Every menu dish has a complete recipe.
                  </div>
                )}
              </div>

              {filteredItems.length ===
              0 ? (
                <div className="grocery-empty-filter">
                  <b>
                    No ingredients in this view
                  </b>

                  <span>
                    Change the function, category, search or rate filter.
                  </span>

                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setFunctionFilter(
                        'ALL',
                      );
                      setCategoryFilter(
                        'ALL',
                      );
                      setRateFilter(
                        'ALL',
                      );
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <>
                  <div className="grocery-table-wrap">
                    <table className="grocery-table">
                      <thead>
                        <tr>
                          <th>
                            Ingredient
                          </th>
                          <th>
                            Category
                          </th>
                          <th>
                            Recipe Qty
                          </th>
                          <th>
                            Event Required
                          </th>
                          <th>
                            Purchase Qty
                          </th>
                          <th>
                            Rate
                          </th>
                          <th>
                            Purchase Cost
                          </th>
                          <th>
                            Used In
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredItems.map(
                          (
                            item,
                          ) => {
                            const category =
                              inferIngredientCategory(
                                item.name,
                              );

                            const sourceRate =
                              rateRowForItem(
                                item,
                                rates,
                              );

                            const key =
                              groceryRateKey(
                                item,
                              );

                            const rateState =
                              rateStates[
                                key
                              ] || {
                                status:
                                  'idle',
                              };

                            const saving =
                              rateState.status ===
                              'saving';

                            const displayedRate =
                              sourceRate
                                ? displayRateFromSource(
                                    sourceRate.rate,
                                    sourceRate.unit,
                                  )
                                : item.rate;

                            const draftRate =
                              rateDrafts[
                                key
                              ] ??
                              (
                                displayedRate &&
                                displayedRate >
                                  0
                                  ? Number(
                                      displayedRate,
                                    ).toFixed(
                                      2,
                                    )
                                  : ''
                              );

                            return (
                              <tr
                                key={`${item.name}::${item.unit}`}
                                className={
                                  !item.hasRate
                                    ? 'grocery-rate-missing'
                                    : ''
                                }
                              >
                                <td>
                                  <div className="grocery-ingredient-name">
                                    <b>
                                      {
                                        item.name
                                      }
                                    </b>

                                    <small>
                                      {
                                        item.dishes.length
                                      }{' '}
                                      {item.dishes.length ===
                                      1
                                        ? 'dish'
                                        : 'dishes'}
                                    </small>
                                  </div>
                                </td>

                                <td>
                                  <span className="grocery-category-pill">
                                    {
                                      category
                                    }
                                  </span>
                                </td>

                                <td>
                                  <strong className="grocery-quantity grocery-recipe-quantity">
                                    {quantity(
                                      item.recipeQuantity,
                                    )}{' '}
                                    {
                                      item.unit
                                    }
                                  </strong>
                                </td>

                                <td>
                                  {functionFilter ===
                                  'ALL' ? (
                                    <div className="grocery-required-editor">
                                      <input
                                        key={`required-${key}-${item.requiredQuantity}`}
                                        type="number"
                                        min="0"
                                        step="0.001"
                                        defaultValue={quantity(
                                          item.requiredQuantity,
                                        )}
                                        aria-label={`Event required quantity for ${item.name}`}
                                        onBlur={(event) => {
                                          const value =
                                            Number(
                                              event.currentTarget
                                                .value,
                                            );

                                          updateIngredientPurchase(
                                            item,
                                            {
                                              requiredQuantityOverride:
                                                value >
                                                0
                                                  ? value
                                                  : undefined,
                                            },
                                          );
                                        }}
                                        onKeyDown={(event) => {
                                          if (
                                            event.key ===
                                            'Enter'
                                          ) {
                                            event.currentTarget
                                              .blur();
                                          }
                                        }}
                                      />

                                      {item.manualQuantityOverride ? (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            updateIngredientPurchase(
                                              item,
                                              {
                                                requiredQuantityOverride:
                                                  undefined,
                                              },
                                            )
                                          }
                                        >
                                          Auto
                                        </button>
                                      ) : (
                                        <small>
                                          Recipe
                                        </small>
                                      )}
                                    </div>
                                  ) : (
                                    <strong className="grocery-quantity">
                                      {quantity(
                                        item.requiredQuantity,
                                      )}{' '}
                                      {item.unit}
                                    </strong>
                                  )}
                                </td>

                                <td>
                                  <div className="grocery-purchase-quantity">
                                    <strong>
                                      {quantity(
                                        item.purchaseQuantity,
                                      )}{' '}
                                      {item.unit}
                                    </strong>

                                    {functionFilter ===
                                    'ALL' ? (
                                      <div className="grocery-purchase-mini">
                                        <label>
                                          <span>
                                            Waste %
                                          </span>
                                          <input
                                            key={`waste-${key}-${item.wastagePercent}`}
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.5"
                                            defaultValue={
                                              item.wastagePercent
                                            }
                                            onBlur={(event) =>
                                              updateIngredientPurchase(
                                                item,
                                                {
                                                  wastagePercent:
                                                    Math.min(
                                                      100,
                                                      Math.max(
                                                        0,
                                                        Number(
                                                          event.currentTarget
                                                            .value,
                                                        ) ||
                                                          0,
                                                      ),
                                                    ),
                                                },
                                              )
                                            }
                                            onKeyDown={(event) => {
                                              if (
                                                event.key ===
                                                'Enter'
                                              ) {
                                                event.currentTarget
                                                  .blur();
                                              }
                                            }}
                                          />
                                        </label>

                                        <label>
                                          <span>
                                            Round to
                                          </span>
                                          <input
                                            key={`round-${key}-${item.roundTo}`}
                                            type="number"
                                            min="0.001"
                                            step="0.001"
                                            defaultValue={
                                              item.roundTo
                                            }
                                            onBlur={(event) =>
                                              updateIngredientPurchase(
                                                item,
                                                {
                                                  roundTo:
                                                    Math.max(
                                                      0.001,
                                                      Number(
                                                        event.currentTarget
                                                          .value,
                                                      ) ||
                                                        1,
                                                    ),
                                                },
                                              )
                                            }
                                            onKeyDown={(event) => {
                                              if (
                                                event.key ===
                                                'Enter'
                                              ) {
                                                event.currentTarget
                                                  .blur();
                                              }
                                            }}
                                          />
                                        </label>
                                      </div>
                                    ) : null}
                                  </div>
                                </td>

                                <td>
                                  <div className="grocery-rate-editor">
                                    <label className="grocery-rate-input">
                                      <span>
                                        ₹
                                      </span>

                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={
                                          draftRate
                                        }
                                        placeholder="Rate"
                                        disabled={
                                          saving
                                        }
                                        aria-label={`Rate for ${item.name}`}
                                        onChange={(
                                          event,
                                        ) => {
                                          const value =
                                            event.target
                                              .value;

                                          setRateDrafts(
                                            (
                                              current,
                                            ) => ({
                                              ...current,
                                              [key]:
                                                value,
                                            }),
                                          );

                                          setRateStates(
                                            (
                                              current,
                                            ) => ({
                                              ...current,
                                              [key]: {
                                                status:
                                                  'idle',
                                              },
                                            }),
                                          );

                                          setRateMessage(
                                            '',
                                          );
                                        }}
                                        onKeyDown={(
                                          event,
                                        ) => {
                                          if (
                                            event.key ===
                                            'Enter'
                                          ) {
                                            event.preventDefault();

                                            void saveIngredientRate(
                                              item,
                                              Number(
                                                event.currentTarget
                                                  .value,
                                              ),
                                            );
                                          }
                                        }}
                                      />

                                      <small>
                                        /{' '}
                                        {sourceRate?.unit ||
                                          item.rateUnit ||
                                          item.unit}
                                      </small>
                                    </label>

                                    <button
                                      className="grocery-rate-save-button"
                                      type="button"
                                      disabled={
                                        saving ||
                                        !(
                                          Number(
                                            draftRate,
                                          ) >
                                          0
                                        )
                                      }
                                      onClick={() =>
                                        void saveIngredientRate(
                                          item,
                                          Number(
                                            draftRate,
                                          ),
                                        )
                                      }
                                    >
                                      {saving
                                        ? 'Saving…'
                                        : sourceRate
                                          ? 'Save'
                                          : 'Create & Save'}
                                    </button>

                                    <small
                                      className={`grocery-rate-save-status ${rateState.status}`}
                                      aria-live="polite"
                                    >
                                      {rateState.message ||
                                        (
                                          sourceRate
                                            ? 'Press Enter or Save'
                                            : 'Creates Ingredient Master item on save'
                                        )}
                                    </small>
                                  </div>
                                </td>

                                <td>
                                  {item.hasRate ? (
                                    <strong className="grocery-cost">
                                      {money(
                                        item.purchaseEstimatedCost,
                                      )}
                                    </strong>
                                  ) : (
                                    <span className="grocery-missing-pill">
                                      Rate missing
                                    </span>
                                  )}
                                </td>

                                <td>
                                  <div className="grocery-used-in">
                                    {item.dishes
                                      .slice(
                                        0,
                                        2,
                                      )
                                      .map(
                                        (
                                          dish,
                                        ) => (
                                          <span
                                            key={
                                              dish
                                            }
                                          >
                                            {
                                              dish
                                            }
                                          </span>
                                        ),
                                      )}

                                    {item.dishes
                                      .length >
                                    2 ? (
                                      <small>
                                        +
                                        {item
                                          .dishes
                                          .length -
                                          2}{' '}
                                        more
                                      </small>
                                    ) : null}
                                  </div>
                                </td>
                              </tr>
                            );
                          },
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="grocery-mobile-list">
                    {filteredItems.map(
                      (
                        item,
                      ) => {
                        const sourceRate =
                          rateRowForItem(
                            item,
                            rates,
                          );

                        const key =
                          groceryRateKey(
                            item,
                          );

                        const rateState =
                          rateStates[
                            key
                          ] || {
                            status:
                              'idle',
                          };

                        const saving =
                          rateState.status ===
                          'saving';

                        const displayedRate =
                          sourceRate
                            ? displayRateFromSource(
                                sourceRate.rate,
                                sourceRate.unit,
                              )
                            : item.rate;

                        const draftRate =
                          rateDrafts[
                            key
                          ] ??
                          (
                            displayedRate &&
                            displayedRate >
                              0
                              ? Number(
                                  displayedRate,
                                ).toFixed(
                                  2,
                                )
                              : ''
                          );

                        return (
                          <article
                            className={
                              !item.hasRate
                                ? 'grocery-mobile-item grocery-rate-missing'
                                : 'grocery-mobile-item'
                            }
                            key={`mobile-${item.name}::${item.unit}`}
                          >
                            <div className="grocery-mobile-head">
                              <div>
                                <b>
                                  {
                                    item.name
                                  }
                                </b>

                                <small>
                                  {inferIngredientCategory(
                                    item.name,
                                  )}
                                </small>
                              </div>

                              <strong>
                                {quantity(
                                  item.purchaseQuantity,
                                )}{' '}
                                {
                                  item.unit
                                } buy
                              </strong>
                            </div>

                            <div className="grocery-mobile-meta grocery-mobile-quantity-meta">
                              <span>
                                Recipe{' '}
                                <b>
                                  {quantity(
                                    item.recipeQuantity,
                                  )}{' '}
                                  {item.unit}
                                </b>
                              </span>

                              <span>
                                Required{' '}
                                <b>
                                  {quantity(
                                    item.requiredQuantity,
                                  )}{' '}
                                  {item.unit}
                                </b>
                              </span>

                              <span>
                                Purchase{' '}
                                <b>
                                  {quantity(
                                    item.purchaseQuantity,
                                  )}{' '}
                                  {item.unit}
                                </b>
                              </span>

                              <span>
                                Cost{' '}
                                <b>
                                  {item.hasRate
                                    ? money(
                                        item.purchaseEstimatedCost,
                                      )
                                    : '—'}
                                </b>
                              </span>
                            </div>

                            {functionFilter ===
                            'ALL' ? (
                              <div className="grocery-mobile-purchase-editor">
                                <label>
                                  <span>
                                    Event required
                                  </span>
                                  <input
                                    key={`mobile-required-${key}-${item.requiredQuantity}`}
                                    type="number"
                                    min="0"
                                    step="0.001"
                                    defaultValue={quantity(
                                      item.requiredQuantity,
                                    )}
                                    onBlur={(event) => {
                                      const value =
                                        Number(
                                          event.currentTarget
                                            .value,
                                        );

                                      updateIngredientPurchase(
                                        item,
                                        {
                                          requiredQuantityOverride:
                                            value >
                                            0
                                              ? value
                                              : undefined,
                                        },
                                      );
                                    }}
                                    onKeyDown={(event) => {
                                      if (
                                        event.key ===
                                        'Enter'
                                      ) {
                                        event.currentTarget
                                          .blur();
                                      }
                                    }}
                                  />
                                </label>

                                <label>
                                  <span>
                                    Waste %
                                  </span>
                                  <input
                                    key={`mobile-waste-${key}-${item.wastagePercent}`}
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.5"
                                    defaultValue={
                                      item.wastagePercent
                                    }
                                    onBlur={(event) =>
                                      updateIngredientPurchase(
                                        item,
                                        {
                                          wastagePercent:
                                            Math.min(
                                              100,
                                              Math.max(
                                                0,
                                                Number(
                                                  event.currentTarget
                                                    .value,
                                                ) ||
                                                  0,
                                              ),
                                            ),
                                        },
                                      )
                                    }
                                    onKeyDown={(event) => {
                                      if (
                                        event.key ===
                                        'Enter'
                                      ) {
                                        event.currentTarget
                                          .blur();
                                      }
                                    }}
                                  />
                                </label>

                                <label>
                                  <span>
                                    Round to
                                  </span>
                                  <input
                                    key={`mobile-round-${key}-${item.roundTo}`}
                                    type="number"
                                    min="0.001"
                                    step="0.001"
                                    defaultValue={
                                      item.roundTo
                                    }
                                    onBlur={(event) =>
                                      updateIngredientPurchase(
                                        item,
                                        {
                                          roundTo:
                                            Math.max(
                                              0.001,
                                              Number(
                                                event.currentTarget
                                                  .value,
                                              ) ||
                                                1,
                                            ),
                                        },
                                      )
                                    }
                                    onKeyDown={(event) => {
                                      if (
                                        event.key ===
                                        'Enter'
                                      ) {
                                        event.currentTarget
                                          .blur();
                                      }
                                    }}
                                  />
                                </label>

                                {item.manualQuantityOverride ? (
                                  <button
                                    type="button"
                                    className="ghost-button"
                                    onClick={() =>
                                      updateIngredientPurchase(
                                        item,
                                        {
                                          requiredQuantityOverride:
                                            undefined,
                                        },
                                      )
                                    }
                                  >
                                    Reset required to Recipe
                                  </button>
                                ) : null}
                              </div>
                            ) : null}

                            <div className="grocery-mobile-rate-editor">
                              <label>
                                <span>
                                  Rate /{' '}
                                  {sourceRate?.unit ||
                                    item.rateUnit ||
                                    item.unit}
                                </span>

                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={
                                    draftRate
                                  }
                                  placeholder="Enter rate"
                                  disabled={
                                    saving
                                  }
                                  aria-label={`Rate for ${item.name}`}
                                  onChange={(
                                    event,
                                  ) => {
                                    const value =
                                      event.target
                                        .value;

                                    setRateDrafts(
                                      (
                                        current,
                                      ) => ({
                                        ...current,
                                        [key]:
                                          value,
                                      }),
                                    );

                                    setRateStates(
                                      (
                                        current,
                                      ) => ({
                                        ...current,
                                        [key]: {
                                          status:
                                            'idle',
                                        },
                                      }),
                                    );

                                    setRateMessage(
                                      '',
                                    );
                                  }}
                                  onKeyDown={(
                                    event,
                                  ) => {
                                    if (
                                      event.key ===
                                      'Enter'
                                    ) {
                                      event.preventDefault();

                                      void saveIngredientRate(
                                        item,
                                        Number(
                                          event.currentTarget
                                            .value,
                                        ),
                                      );
                                    }
                                  }}
                                />
                              </label>

                              <button
                                type="button"
                                className="grocery-rate-save-button"
                                disabled={
                                  saving ||
                                  !(
                                    Number(
                                      draftRate,
                                    ) >
                                    0
                                  )
                                }
                                onClick={() =>
                                  void saveIngredientRate(
                                    item,
                                    Number(
                                      draftRate,
                                    ),
                                  )
                                }
                              >
                                {saving
                                  ? 'Saving…'
                                  : sourceRate
                                    ? 'Save'
                                    : 'Create & Save'}
                              </button>
                            </div>

                            <small
                              className={`grocery-rate-save-status ${rateState.status}`}
                              aria-live="polite"
                            >
                              {rateState.message ||
                                (
                                  sourceRate
                                    ? 'Press Enter or Save'
                                    : 'Creates Ingredient Master item on save'
                                )}
                            </small>

                            <p>
                              Used in:{' '}
                              {item.dishes.join(
                                ', ',
                              )}
                            </p>
                          </article>
                        );
                      },
                    )}
                  </div>
                </>
              )}
            </div>

            <aside className="grocery-summary-panel no-print">
              <div className="grocery-summary-head">
                <span>
                  Purchase total
                </span>

                <strong>
                  {money(
                    groceryTotal,
                  )}
                </strong>

                <small>
                  {money(
                    groceryPerCover,
                  )}{' '}
                  per function cover
                </small>
              </div>

              <div className="grocery-summary-grid">
                <div>
                  <span>
                    Ingredients
                  </span>

                  <b>
                    {
                      totalIngredientCount
                    }
                  </b>
                </div>

                <div>
                  <span>
                    Priced
                  </span>

                  <b>
                    {
                      pricedIngredientCount
                    }
                  </b>
                </div>

                <div>
                  <span>
                    Missing
                  </span>

                  <b
                    className={
                      missingIngredientCount >
                      0
                        ? 'needs-attention'
                        : ''
                    }
                  >
                    {
                      missingIngredientCount
                    }
                  </b>
                </div>

                <div>
                  <span>
                    Categories
                  </span>

                  <b>
                    {
                      categoryCount
                    }
                  </b>
                </div>
              </div>

              <div className="grocery-summary-progress">
                <div>
                  <span
                    style={{
                      width:
                        `${totalIngredientCount > 0
                          ? Math.round(
                              (
                                pricedIngredientCount /
                                totalIngredientCount
                              ) *
                                100,
                            )
                          : 0}%`,
                    }}
                  />
                </div>

                <small>
                  {totalIngredientCount >
                  0
                    ? `${Math.round(
                        (
                          pricedIngredientCount /
                          totalIngredientCount
                        ) *
                          100,
                      )}% ingredient rates ready`
                    : 'No ingredient requirements yet'}
                </small>
              </div>

              <div className="grocery-summary-list">
                <div>
                  <span>
                    Functions
                  </span>

                  <b>
                    {
                      plan?.functions
                        .length || 0
                    }
                  </b>
                </div>

                <div>
                  <span>
                    Complete recipes
                  </span>

                  <b>
                    {plan?.completeRecipeCount ||
                      0}
                  </b>
                </div>

                <div>
                  <span>
                    Incomplete recipes
                  </span>

                  <b
                    className={
                      (
                        plan
                          ?.incompleteRecipeCount ||
                        0
                      ) > 0
                        ? 'needs-attention'
                        : ''
                    }
                  >
                    {plan?.incompleteRecipeCount ||
                      0}
                  </b>
                </div>

                <div>
                  <span>
                    Missing recipes
                  </span>

                  <b
                    className={
                      (
                        plan
                          ?.missingRecipeCount ||
                        0
                      ) > 0
                        ? 'needs-attention'
                        : ''
                    }
                  >
                    {plan?.missingRecipeCount ||
                      0}
                  </b>
                </div>
              </div>

              {missingIngredientCount >
              0 ? (
                <button
                  type="button"
                  className="grocery-review-missing"
                  onClick={() => {
                    setFunctionFilter(
                      'ALL',
                    );
                    setCategoryFilter(
                      'ALL',
                    );
                    setRateFilter(
                      'MISSING',
                    );
                  }}
                >
                  Review{' '}
                  {
                    missingIngredientCount
                  }{' '}
                  missing{' '}
                  {missingIngredientCount ===
                  1
                    ? 'rate'
                    : 'rates'}
                </button>
              ) : (
                <div className="grocery-ready-note">
                  <span aria-hidden="true">
                    ✓
                  </span>
                  All ingredient rates are ready
                </div>
              )}

              <button
                className="primary-button grocery-next-button"
                type="button"
                disabled={
                  work.menu.length ===
                  0
                }
                onClick={() =>
                  router.push(
                    '/app/team',
                  )
                }
              >
                Continue to Manpower
                <span aria-hidden="true">
                  →
                </span>
              </button>

              <button
                className="grocery-back-button"
                type="button"
                onClick={() =>
                  router.push(
                    '/app/cost',
                  )
                }
              >
                Back to Dish Cost
              </button>
            </aside>
          </div>
        ) : null}

        {!loadingData &&
        work.menu.length > 0 ? (
          <div className="action-row page-actions grocery-mobile-actions">
            <button
              className="primary-button"
              type="button"
              onClick={() =>
                router.push(
                  '/app/team',
                )
              }
            >
              Next: Manpower
            </button>

            <button
              className="ghost-button"
              type="button"
              onClick={() =>
                router.push(
                  '/app/cost',
                )
              }
            >
              Back to Dish Cost
            </button>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
