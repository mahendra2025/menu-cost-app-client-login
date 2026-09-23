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
} from '../../../lib/store';

import type {
  Session,
  WorkState,
} from '../../../lib/types';

import {
  buildFunctionGroceryPlan,
  downloadFunctionGroceryCsv,
  type FunctionGroceryItem,
  type GroceryIngredientRate,
  type GroceryRecipe,
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
    savingRateKey,
    setSavingRateKey,
  ] =
    useState('');

  const [
    rateMessage,
    setRateMessage,
  ] =
    useState('');

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
        '/api/client/ingredients',
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
    plan?.combinedIngredientCost ||
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

  async function saveIngredientRate(
    item: FunctionGroceryItem,
    displayRate: number,
  ) {
    const safeDisplayRate =
      Math.max(
        0,
        Number(displayRate) || 0,
      );

    if (
      !(safeDisplayRate > 0)
    ) {
      setRateMessage(
        'Ingredient rate must be greater than ₹0.',
      );

      return;
    }

    const source =
      rateRowForItem(
        item,
        rates,
      );

    if (!source) {
      setRateMessage(
        `${item.name} is not in the Ingredient Master yet. Open My Ingredients to add or correct its rate.`,
      );

      return;
    }

    const sourceRate =
      sourceRateFromDisplay(
        safeDisplayRate,
        source.unit,
      );

    setSavingRateKey(
      `${item.name}::${item.unit}`,
    );

    setRateMessage(
      '',
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
                    ingredientId:
                      source.id,
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

      setRates(
        (current) =>
          current.map(
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
          ),
      );

      setRateMessage(
        `${item.name} rate saved.`,
      );
    } catch (
      error
    ) {
      setRateMessage(
        error instanceof
        Error
          ? error.message
          : 'Ingredient rate could not be saved.',
      );
    } finally {
      setSavingRateKey(
        '',
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
                  className="grocery-rate-message"
                  role="status"
                >
                  {rateMessage}
                </div>
              ) : null}

              {plan &&
              plan.unmatchedDishes
                .length > 0 ? (
                <div className="grocery-recipe-warning">
                  <div>
                    <b>
                      {
                        plan
                          .unmatchedDishes
                          .length
                      }{' '}
                      {plan
                        .unmatchedDishes
                        .length ===
                      1
                        ? 'dish has'
                        : 'dishes have'}{' '}
                      no linked recipe
                    </b>

                    <span>
                      These dishes cannot contribute ingredient quantities until a recipe is available.
                    </span>
                  </div>

                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() =>
                      router.push(
                        '/app/cost',
                      )
                    }
                  >
                    Review dishes
                  </button>
                </div>
              ) : null}

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
                            Required Qty
                          </th>
                          <th>
                            Rate
                          </th>
                          <th>
                            Est. Cost
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

                            const saving =
                              savingRateKey ===
                              `${item.name}::${item.unit}`;

                            const displayedRate =
                              sourceRate
                                ? displayRateFromSource(
                                    sourceRate.rate,
                                    sourceRate.unit,
                                  )
                                : item.rate;

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
                                  <strong className="grocery-quantity">
                                    {quantity(
                                      item.quantity,
                                    )}{' '}
                                    {
                                      item.unit
                                    }
                                  </strong>
                                </td>

                                <td>
                                  {sourceRate ? (
                                    <label className="grocery-rate-input">
                                      <span>
                                        ₹
                                      </span>

                                      <input
                                        key={`${sourceRate.id}::${displayedRate}`}
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        defaultValue={
                                          displayedRate &&
                                          displayedRate >
                                            0
                                            ? Number(
                                                displayedRate,
                                              ).toFixed(
                                                2,
                                              )
                                            : ''
                                        }
                                        placeholder="Rate"
                                        disabled={
                                          saving
                                        }
                                        aria-label={`Rate for ${item.name}`}
                                        onBlur={(
                                          event,
                                        ) => {
                                          const next =
                                            Number(
                                              event.currentTarget
                                                .value,
                                            );

                                          if (
                                            next >
                                              0 &&
                                            Math.abs(
                                              next -
                                                Number(
                                                  displayedRate ||
                                                    0,
                                                ),
                                            ) >
                                              0.0001
                                          ) {
                                            void saveIngredientRate(
                                              item,
                                              next,
                                            );
                                          }
                                        }}
                                      />

                                      <small>
                                        /{' '}
                                        {item.rateUnit ||
                                          item.unit}
                                      </small>
                                    </label>
                                  ) : (
                                    <button
                                      className="grocery-manage-rate"
                                      type="button"
                                      onClick={() =>
                                        router.push(
                                          '/app/ingredients',
                                        )
                                      }
                                    >
                                      Set rate
                                    </button>
                                  )}
                                </td>

                                <td>
                                  {item.hasRate ? (
                                    <strong className="grocery-cost">
                                      {money(
                                        item.estimatedCost,
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
                      ) => (
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
                                item.quantity,
                              )}{' '}
                              {
                                item.unit
                              }
                            </strong>
                          </div>

                          <div className="grocery-mobile-meta">
                            <span>
                              Rate{' '}
                              <b>
                                {item.hasRate
                                  ? `${money(
                                      item.rate ||
                                        0,
                                    )} / ${item.rateUnit ||
                                      item.unit}`
                                  : 'Missing'}
                              </b>
                            </span>

                            <span>
                              Cost{' '}
                              <b>
                                {item.hasRate
                                  ? money(
                                      item.estimatedCost,
                                    )
                                  : '—'}
                              </b>
                            </span>
                          </div>

                          <p>
                            Used in:{' '}
                            {item.dishes.join(
                              ', ',
                            )}
                          </p>
                        </article>
                      ),
                    )}
                  </div>
                </>
              )}
            </div>

            <aside className="grocery-summary-panel no-print">
              <div className="grocery-summary-head">
                <span>
                  Grocery total
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
                    Matched dishes
                  </span>

                  <b>
                    {
                      plan
                        ?.matchedDishes
                        .length || 0
                    }
                  </b>
                </div>

                <div>
                  <span>
                    Missing recipes
                  </span>

                  <b>
                    {
                      plan
                        ?.unmatchedDishes
                        .length || 0
                    }
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
