'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '../../components/AppShell';
import {
  flushDraftToServer,
  flushWorkSave,
  getSession,
  loadWork,
  saveWork,
} from '../../../lib/store';
import { menuItemIdentity } from '../../../lib/menuFunctionImport';
import { CATEGORIES } from '../../../lib/menuCategories';
import type { MenuItem } from '../../../lib/types';
import styles from './page.module.css';

type CachedDetection = {
  rawMenuText?: string;
  preview?: {
    menu?: MenuItem[];
  };
};

type MealGroup = {
  key: string;
  serviceId?: string;
  dayLabel?: string;
  mealLabel: string;
  servicePax: number;
  dishes: MenuItem[];
};

function categoryOrder(name: string) {
  const index = (CATEGORIES as readonly string[]).indexOf(name);
  return index < 0 ? CATEGORIES.length : index;
}

function buildMealGroups(
  menu: MenuItem[],
  fallbackMealLabel: string,
  defaultPax: number,
): MealGroup[] {
  const groups = new Map<string, MealGroup>();

  for (const dish of menu) {
    const serviceId = dish.serviceId?.trim() || undefined;
    const dayLabel = dish.dayLabel?.trim() || undefined;
    const mealLabel = dish.mealLabel?.trim() || fallbackMealLabel;
    const servicePax = Math.max(
      0,
      Number(dish.servicePax) || defaultPax,
    );
    const key =
      serviceId ||
      `${dayLabel || 'Event'}::${mealLabel}::${servicePax}`;

    const group = groups.get(key) ?? {
      key,
      serviceId,
      dayLabel,
      mealLabel,
      servicePax,
      dishes: [],
    };

    const duplicate = group.dishes.some(
      (item) =>
        item.category.trim().toLowerCase() ===
          dish.category.trim().toLowerCase() &&
        item.name.trim().toLowerCase() === dish.name.trim().toLowerCase(),
    );

    if (!duplicate) {
      group.dishes.push(dish);
    }

    groups.set(key, group);
  }

  return [...groups.values()];
}

function categoryGroups(dishes: MenuItem[]) {
  const groups = new Map<string, MenuItem[]>();

  for (const dish of dishes) {
    const category = dish.category.trim() || 'Other';
    const group = groups.get(category) ?? [];
    group.push(dish);
    groups.set(category, group);
  }

  const categories = [...groups.keys()].sort(
    (a, b) => categoryOrder(a) - categoryOrder(b) || a.localeCompare(b),
  );

  return { groups, categories };
}

export default function DetectedMenuPage() {
  const [meals, setMeals] = useState<MealGroup[] | null>(null);
  const [continuing, setContinuing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const session = getSession();
      if (!session) {
        setMeals([]);
        return;
      }

      const work = loadWork(session.tenantId);
      const cached = JSON.parse(
        sessionStorage.getItem(`menu-detection:${session.tenantId}`) || 'null',
      ) as CachedDetection | null;
      const menu =
        cached?.rawMenuText === work.event.rawMenuText
          ? cached?.preview?.menu
          : [];
      const filteredMenu = Array.isArray(menu)
        ? menu.filter(
            (dish): dish is MenuItem =>
              Boolean(
                dish &&
                  typeof dish.name === 'string' &&
                  dish.name.trim() &&
                  typeof dish.category === 'string' &&
                  dish.coverageStatus !== 'REJECTED',
              ),
          )
        : [];
      const fallbackMealLabel =
        work.event.functionType?.trim() || 'Event Menu';
      const defaultPax = Math.max(0, Number(work.event.pax) || 0);

      setMeals(
        buildMealGroups(
          filteredMenu,
          fallbackMealLabel,
          defaultPax,
        ),
      );
    } catch {
      setMeals([]);
    }
  }, []);

  function updateMeal(
    key: string,
    patch: Partial<Pick<MealGroup, 'mealLabel' | 'servicePax'>>,
  ) {
    setMeals((current) =>
      current?.map((meal) =>
        meal.key === key ? { ...meal, ...patch } : meal,
      ) ?? current,
    );
  }

  async function continueToManpower() {
    if (!meals?.length || continuing) return;

    setContinuing(true);
    setError('');

    try {
      const session = getSession();
      if (!session) {
        throw new Error('Your session has expired. Please sign in again.');
      }

      const work = loadWork(session.tenantId);
      const usageResponse = await fetch(
        `/api/client/free-usage?costingId=${encodeURIComponent(work.costingId)}`,
        { cache: 'no-store' },
      );

      if (!usageResponse.ok) {
        throw new Error(
          'Could not verify your costing allowance. Please try again.',
        );
      }

      const usage = (await usageResponse.json()) as {
        canUseCurrentCosting?: boolean;
      };

      if (!usage.canUseCurrentCosting) {
        throw new Error(
          'Your 5 free costings are used. Upgrade to Pro to start a new costing.',
        );
      }

      const fallbackMealLabel =
        work.event.functionType?.trim() || 'Event Menu';
      const importableDishes = meals.flatMap((meal) => {
        const mealLabel = meal.mealLabel.trim() || fallbackMealLabel;
        const servicePax = Math.max(0, Number(meal.servicePax) || 0);

        return meal.dishes.map((dish) => ({
          ...dish,
          mealLabel,
          servicePax,
        }));
      });

      const existingKeys = new Set(work.menu.map(menuItemIdentity));
      const newItems = importableDishes.filter(
        (dish) => !existingKeys.has(menuItemIdentity(dish)),
      );
      const firstMeal = meals[0];
      const nextWork = {
        ...work,
        event:
          meals.length === 1 && firstMeal
            ? {
                ...work.event,
                functionType:
                  firstMeal.mealLabel.trim() || work.event.functionType,
                pax: Math.max(0, Number(firstMeal.servicePax) || 0),
              }
            : work.event,
        menu: [...work.menu, ...newItems],
      };

      saveWork(session.tenantId, nextWork);
      flushWorkSave(session.tenantId);
      await flushDraftToServer(session.tenantId, nextWork);

      window.location.assign('/app/manpower');
    } catch (continueError) {
      setError(
        continueError instanceof Error
          ? continueError.message
          : 'The detected menu could not be saved. Please try again.',
      );
      setContinuing(false);
    }
  }

  return (
    <AppShell title="Detected menu">
      <div className={styles.menu}>
        <div className={styles.actions}>
          <Link href="/app/event">Back to menu upload / review</Link>
        </div>

        {meals === null ? (
          <p role="status">Loading dishes…</p>
        ) : meals.length === 0 ? (
          <p>
            No detected dishes to show.{' '}
            <Link href="/app/event">Upload a menu to get started.</Link>
          </p>
        ) : (
          <>
            {meals.map((meal, mealIndex) => {
              const { groups, categories } = categoryGroups(meal.dishes);

              return (
                <section
                  className={styles.mealCard}
                  key={meal.key}
                  aria-label={`Meal ${mealIndex + 1}`}
                >
                  <div className={styles.mealHeader}>
                    <div className={styles.mealHeading}>
                      <span className={styles.mealNumber}>
                        Meal {mealIndex + 1}
                      </span>
                      {meal.dayLabel ? (
                        <small>{meal.dayLabel}</small>
                      ) : null}
                    </div>

                    <div className={styles.mealFields}>
                      <label className={styles.mealField}>
                        <span>Meal name</span>
                        <input
                          type="text"
                          value={meal.mealLabel}
                          onChange={(event) =>
                            updateMeal(meal.key, {
                              mealLabel: event.target.value,
                            })
                          }
                          placeholder="Breakfast, Lunch, Dinner…"
                        />
                      </label>

                      <label className={styles.mealField}>
                        <span>Guests</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          value={meal.servicePax || ''}
                          onChange={(event) =>
                            updateMeal(meal.key, {
                              servicePax: Math.max(
                                0,
                                Number(event.target.value) || 0,
                              ),
                            })
                          }
                          placeholder="0"
                        />
                      </label>
                    </div>
                  </div>

                  <div className={styles.categoryList}>
                    {categories.map((category, categoryIndex) => (
                      <section
                        className={styles.category}
                        key={category}
                        aria-labelledby={`meal-${mealIndex}-category-${categoryIndex}`}
                      >
                        <h2
                          id={`meal-${mealIndex}-category-${categoryIndex}`}
                        >
                          {category}
                        </h2>
                        <ul>
                          {groups.get(category)!.map((dish) => (
                            <li key={dish.id}>{dish.name}</li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                </section>
              );
            })}

            {error ? (
              <p className={styles.error} role="alert">
                {error}
              </p>
            ) : null}

            <div className={styles.footerActions}>
              <Link className={styles.backButton} href="/app/event">
                Back
              </Link>
              <button
                className="primary-button"
                type="button"
                onClick={() => void continueToManpower()}
                disabled={continuing}
              >
                {continuing ? 'Saving menu…' : 'Next: Manpower'}
              </button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
