'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';

import AppShell from '../../components/AppShell';
import {
  getSession,
  loadWork,
} from '../../../lib/store';
import {
  buildFunctionGroceryPlan,
  downloadFunctionGroceryCsv,
  type FunctionGroceryPlan,
  type GroceryIngredientRate,
  type GroceryRecipe,
} from '../../../lib/functionGrocery';
import type {
  Session,
  WorkState,
} from '../../../lib/types';

function money(value: number) {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

function quantity(value: number) {
  return value
    .toFixed(3)
    .replace(/\.?0+$/, '');
}

function sectionTitle(
  dayLabel: string,
  mealLabel: string,
) {
  return [dayLabel, mealLabel]
    .filter(Boolean)
    .join(' · ') ||
    'Event Menu';
}

export default function GroceryPage() {
  const router = useRouter();
  const [session, setSession] =
    useState<Session | null>(null);
  const [work, setWork] =
    useState<WorkState | null>(null);
  const [recipes, setRecipes] =
    useState<GroceryRecipe[]>([]);
  const [rates, setRates] =
    useState<GroceryIngredientRate[]>([]);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState('');

  useEffect(() => {
    const current = getSession();

    if (!current) {
      router.replace('/login');
      return;
    }

    const savedWork =
      loadWork(current.tenantId);

    if (!savedWork.menu.length) {
      router.replace('/app/event?resume=1#menuInput');
      return;
    }

    setSession(current);
    setWork(savedWork);

    void loadGroceryInputs(savedWork);
  }, [router]);

  async function loadGroceryInputs(
    savedWork: WorkState,
  ) {
    setLoading(true);
    setError('');

    try {
      const [
        recipeResponse,
        ingredientResponse,
      ] = await Promise.all([
        fetch(
          '/api/recipe-ingredients',
          {
            method: 'POST',
            cache: 'no-store',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              dishNames:
                savedWork.menu.map(
                  (item) => item.name,
                ),
            }),
          },
        ),
        fetch(
          '/api/client/ingredients',
          {
            cache: 'no-store',
          },
        ),
      ]);

      const recipeData =
        await recipeResponse.json();
      const ingredientData =
        await ingredientResponse.json();

      if (!recipeResponse.ok) {
        throw new Error(
          recipeData.error ||
          'Could not load saved recipes.',
        );
      }

      if (!ingredientResponse.ok) {
        throw new Error(
          ingredientData.error ||
          'Could not load ingredient rates.',
        );
      }

      setRecipes(
        Array.isArray(
          recipeData.recipes,
        )
          ? recipeData.recipes
          : [],
      );

      setRates(
        Array.isArray(
          ingredientData.rates,
        )
          ? ingredientData.rates
          : [],
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not calculate grocery requirements.',
      );
    } finally {
      setLoading(false);
    }
  }

  const plan = useMemo<
    FunctionGroceryPlan | null
  >(
    () =>
      work
        ? buildFunctionGroceryPlan(
            work,
            recipes,
            rates,
          )
        : null,
    [work, recipes, rates],
  );

  if (!work || !session) {
    return (
      <AppShell
        title="Grocery & Ingredients"
        subtitle="Step 2 of 3: calculate function-wise ingredient requirements"
      >
        <div className="loader-card">
          Loading grocery requirements…
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Grocery & Ingredients"
      subtitle="Step 2 of 3: review function-wise ingredients, combined grocery and purchase cost"
    >
      <section className="content-grid">
        <div className="glass-card">
          <div className="dish-list-heading">
            <div>
              <span className="section-kicker">
                Function-wise grocery
              </span>
              <h2>
                Ingredient Requirements
              </h2>
              <p className="muted">
                Recipe quantities are scaled by each function&apos;s guest count. Ingredient cost uses your personal ingredient rate when available, otherwise the Admin master rate.
              </p>
            </div>

            <div className="action-row">
              <button
                type="button"
                className="ghost-button"
                onClick={() =>
                  router.push(
                    '/app/event?resume=1#menuDetectionPreview',
                  )
                }
              >
                Back to Menu
              </button>

              <button
                type="button"
                className="primary-button"
                disabled={
                  loading ||
                  !plan
                }
                onClick={() =>
                  router.push(
                    '/app/manpower?afterGrocery=1',
                  )
                }
              >
                Continue to Manpower
              </button>
            </div>
          </div>

          {error ? (
            <div className="admin-message">
              {error}
            </div>
          ) : null}
        </div>

        {loading || !plan ? (
          <div className="loader-card">
            Calculating recipes and ingredient quantities…
          </div>
        ) : (
          <>
            <div className="stat-grid">
              <div className="stat-card">
                <small>
                  Functions
                </small>
                <strong>
                  {plan.functions.length}
                </strong>
                <span>
                  Separate meal lists
                </span>
              </div>

              <div className="stat-card">
                <small>
                  Total covers
                </small>
                <strong>
                  {plan.totalFunctionCovers.toLocaleString('en-IN')}
                </strong>
                <span>
                  Sum of function guests
                </span>
              </div>

              <div className="stat-card">
                <small>
                  Recipes matched
                </small>
                <strong>
                  {plan.matchedDishes.length}
                </strong>
                <span>
                  Dishes with ingredient recipes
                </span>
              </div>

              <div className="stat-card">
                <small>
                  Ingredient purchase cost
                </small>
                <strong>
                  {money(
                    plan.combinedIngredientCost,
                  )}
                </strong>
                <span>
                  {plan.unpricedIngredientCount
                    ? `${plan.unpricedIngredientCount} ingredient rate${plan.unpricedIngredientCount === 1 ? '' : 's'} missing`
                    : 'All grocery rates available'}
                </span>
              </div>
            </div>

            {plan.unmatchedDishes.length ? (
              <div className="glass-card">
                <div className="section-head">
                  <div>
                    <span className="section-kicker">
                      Recipe attention
                    </span>
                    <h2>
                      {plan.unmatchedDishes.length} dish{plan.unmatchedDishes.length === 1 ? '' : 'es'} without a saved recipe
                    </h2>
                    <p className="muted">
                      These dishes stay in the menu, but their grocery quantities cannot be generated until a recipe is saved.
                    </p>
                  </div>
                </div>

                <div className="action-row">
                  {plan.unmatchedDishes.map(
                    (dish) => (
                      <span
                        className="badge"
                        key={dish}
                      >
                        {dish}
                      </span>
                    ),
                  )}
                </div>
              </div>
            ) : null}

            {plan.functions.map(
              (section, index) => (
                <details
                  className="glass-card"
                  key={section.key}
                  open
                >
                  <summary>
                    <div className="dish-list-heading">
                      <div>
                        <span className="section-kicker">
                          Function {index + 1} · {section.pax.toLocaleString('en-IN')} guests
                        </span>
                        <h2>
                          {sectionTitle(
                            section.dayLabel,
                            section.mealLabel,
                          )}
                        </h2>
                        <p className="muted">
                          {section.dishCount} dish{section.dishCount === 1 ? '' : 'es'} · {section.items.length} grocery item{section.items.length === 1 ? '' : 's'} · {money(section.estimatedIngredientCost)} estimated ingredient cost
                        </p>
                      </div>

                      <span className="badge">
                        {section.matchedDishes.length} recipes matched
                      </span>
                    </div>
                  </summary>

                  {section.unmatchedDishes.length ? (
                    <div className="admin-message">
                      Missing recipe: {section.unmatchedDishes.join(', ')}
                    </div>
                  ) : null}

                  {!section.items.length ? (
                    <div className="admin-empty">
                      No recipe ingredients are available for this function yet.
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
                              Required Qty
                            </th>
                            <th>
                              Rate
                            </th>
                            <th>
                              Cost
                            </th>
                            <th>
                              Used In
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {section.items.map(
                            (item) => (
                              <tr
                                key={`${section.key}-${item.name}-${item.unit}`}
                              >
                                <td>
                                  <strong>
                                    {item.name}
                                  </strong>
                                  {!item.hasRate ? (
                                    <small>
                                      Rate missing
                                    </small>
                                  ) : null}
                                </td>
                                <td>
                                  <b>
                                    {quantity(item.quantity)} {item.unit}
                                  </b>
                                </td>
                                <td>
                                  {item.hasRate
                                    ? `₹${Number(item.rate).toLocaleString('en-IN')} / ${item.rateUnit}`
                                    : '—'}
                                </td>
                                <td>
                                  <strong>
                                    {item.hasRate
                                      ? money(item.estimatedCost)
                                      : '—'}
                                  </strong>
                                </td>
                                <td>
                                  {item.dishes.join(', ')}
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </details>
              ),
            )}

            <div className="glass-card">
              <div className="dish-list-heading">
                <div>
                  <span className="section-kicker">
                    Full event
                  </span>
                  <h2>
                    Combined Grocery List
                  </h2>
                  <p className="muted">
                    Breakfast, Lunch, Hi-Tea, Dinner and every other detected function are combined here for purchasing.
                  </p>
                </div>

                <div className="action-row">
                  <span className="badge">
                    {plan.combinedItems.length} ingredients
                  </span>

                  <button
                    type="button"
                    className="ghost-button"
                    disabled={
                      !plan.combinedItems.length
                    }
                    onClick={() =>
                      downloadFunctionGroceryCsv(
                        work,
                        plan,
                      )
                    }
                  >
                    Download Grocery CSV
                  </button>
                </div>
              </div>

              <div className="stat-grid">
                <div className="stat-card">
                  <small>
                    Priced ingredients
                  </small>
                  <strong>
                    {plan.pricedIngredientCount}
                  </strong>
                  <span>
                    Included in estimate
                  </span>
                </div>

                <div className="stat-card">
                  <small>
                    Missing rates
                  </small>
                  <strong>
                    {plan.unpricedIngredientCount}
                  </strong>
                  <span>
                    Add rate in Ingredient Index
                  </span>
                </div>

                <div className="stat-card">
                  <small>
                    Purchase estimate
                  </small>
                  <strong>
                    {money(
                      plan.combinedIngredientCost,
                    )}
                  </strong>
                  <span>
                    Based on available rates
                  </span>
                </div>
              </div>

              {!plan.combinedItems.length ? (
                <div className="admin-empty">
                  Add recipes to generate the combined grocery list.
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
                          Total Qty
                        </th>
                        <th>
                          Rate
                        </th>
                        <th>
                          Estimated Cost
                        </th>
                        <th>
                          Used In Dishes
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.combinedItems.map(
                        (item) => (
                          <tr
                            key={`combined-${item.name}-${item.unit}`}
                          >
                            <td>
                              <strong>
                                {item.name}
                              </strong>
                            </td>
                            <td>
                              <b>
                                {quantity(item.quantity)} {item.unit}
                              </b>
                            </td>
                            <td>
                              {item.hasRate
                                ? `₹${Number(item.rate).toLocaleString('en-IN')} / ${item.rateUnit}`
                                : '—'}
                            </td>
                            <td>
                              <strong>
                                {item.hasRate
                                  ? money(item.estimatedCost)
                                  : '—'}
                              </strong>
                            </td>
                            <td>
                              {item.dishes.join(', ')}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="action-row">
                <button
                  type="button"
                  className="primary-button"
                  onClick={() =>
                    router.push(
                      '/app/manpower?afterGrocery=1',
                    )
                  }
                >
                  Continue to Manpower
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </AppShell>
  );
}
