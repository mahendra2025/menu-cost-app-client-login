'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '../../components/AppShell';
import {
  flushDraftToServer,
  flushWorkSave,
  getSession,
  loadWork,
  parseMenuText,
  saveWork,
} from '../../../lib/store';
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

const FUNCTION_WORDS =
  /\b(?:breakfast|brunch|lunch|dinner|hi[ -]?tea|high[ -]?tea|haldi|mehendi|mehandi|sangeet|reception|barat|baraat|vidai|wedding|cocktail|ceremony|function|engagement|welcome|packing|phera|pheras)\b/i;

function normalizePart(value: unknown) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('en-IN')
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function categoryOrder(name: string) {
  const index = (CATEGORIES as readonly string[]).indexOf(name);
  return index < 0 ? CATEGORIES.length : index;
}

function normalizeFunctionHeading(line: string) {
  const cleaned = line
    .replace(/^[\s•●▪◦◆◇■□✓✔*]+/u, '')
    .replace(/\s+/g, ' ')
    .trim();

  const bareGuestCount = cleaned.match(
    /^(.*?\b(?:breakfast|brunch|lunch|dinner|hi[ -]?tea|high[ -]?tea|haldi|mehendi|mehandi|sangeet|reception|barat|baraat|vidai|wedding|cocktail|ceremony|function|engagement|welcome|packing|phera|pheras)\b.*?)\s+(\d{2,6})\s*$/i,
  );

  if (bareGuestCount) {
    return `${bareGuestCount[1].trim()} - ${bareGuestCount[2]} members`;
  }

  return cleaned;
}

/**
 * Older menu PDFs often use headings such as:
 *   28.11 Dinner 80
 *   29/11 Lunch - 150
 *   Day 2 Breakfast 120
 *
 * The core parser already understands Day + Meal + Pax well. This normalizer
 * converts date-prefixed / compact headings into that stable shape without
 * changing ordinary dish lines.
 */
function normalizeMultiFunctionSource(text: string) {
  const dateToDay = new Map<string, number>();

  return String(text || '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .flatMap((rawLine) => {
      let line = rawLine.trim();
      if (!line) return [''];

      const combinedDay = line.match(
        /^day\s*[-:]?\s*(\d+)\s*(?:[|•–—-]\s*)?(.+)$/i,
      );

      if (combinedDay && FUNCTION_WORDS.test(combinedDay[2])) {
        return [
          `Day ${combinedDay[1]}`,
          normalizeFunctionHeading(combinedDay[2]),
        ];
      }

      const ordinalDay = line.match(
        /^(\d+)(?:st|nd|rd|th)\s+day\s*(?:[|•–—-]\s*)?(.+)$/i,
      );

      if (ordinalDay && FUNCTION_WORDS.test(ordinalDay[2])) {
        return [
          `Day ${ordinalDay[1]}`,
          normalizeFunctionHeading(ordinalDay[2]),
        ];
      }

      const datePrefix = line.match(
        /^(\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?)\s*(?:[|•–—:-]\s*)?(.+)$/,
      );

      if (datePrefix && FUNCTION_WORDS.test(datePrefix[2])) {
        const dateKey = datePrefix[1];
        let dayNumber = dateToDay.get(dateKey);

        if (!dayNumber) {
          dayNumber = dateToDay.size + 1;
          dateToDay.set(dateKey, dayNumber);
        }

        return [
          `Day ${dayNumber}`,
          normalizeFunctionHeading(datePrefix[2]),
        ];
      }

      line = normalizeFunctionHeading(line);
      return [line];
    })
    .join('\n');
}

function visiblePlacementKey(
  item: Pick<MenuItem, 'dayLabel' | 'mealLabel'>,
) {
  const day = normalizePart(item.dayLabel);
  const meal = normalizePart(item.mealLabel);
  return day || meal ? `${day || 'event'}::${meal || 'event menu'}` : '';
}

function placementKey(item: Pick<MenuItem, 'serviceId' | 'dayLabel' | 'mealLabel'>) {
  const serviceId = item.serviceId?.trim();
  const visible = visiblePlacementKey(item);

  if (serviceId) return `service:${serviceId}`;
  if (visible) return `visible:${visible}`;
  return 'event:default';
}

function serviceDishKey(item: MenuItem) {
  return [
    placementKey(item),
    normalizePart(item.name),
    normalizePart(item.category),
  ].join('::');
}

async function repairDetectedStructure(
  rawMenuText: string,
  detectedMenu: MenuItem[],
): Promise<MenuItem[]> {
  if (!detectedMenu.length || !rawMenuText.trim()) return detectedMenu;

  try {
    const structuralMenu = await parseMenuText(
      normalizeMultiFunctionSource(rawMenuText),
    );

    if (!structuralMenu.length) return detectedMenu;

    const structuralByDish = new Map<string, MenuItem[]>();
    const serviceByVisiblePlacement = new Map<string, string>();
    const servicesByMealLabel = new Map<string, Set<string>>();

    for (const item of structuralMenu) {
      const key = normalizePart(item.name);
      if (key) {
        const rows = structuralByDish.get(key) ?? [];
        rows.push(item);
        structuralByDish.set(key, rows);
      }

      const serviceId = item.serviceId?.trim();
      const visible = visiblePlacementKey(item);
      const meal = normalizePart(item.mealLabel);

      if (serviceId && visible) {
        serviceByVisiblePlacement.set(visible, serviceId);
      }

      if (serviceId && meal) {
        const serviceIds = servicesByMealLabel.get(meal) ?? new Set<string>();
        serviceIds.add(serviceId);
        servicesByMealLabel.set(meal, serviceIds);
      }
    }

    const expanded = detectedMenu.flatMap((item) => {
      const matches = structuralByDish.get(normalizePart(item.name)) ?? [];

      if (!matches.length) return [item];

      const uniquePlacements = new Map<string, MenuItem>();
      for (const match of matches) {
        uniquePlacements.set(placementKey(match), match);
      }

      return [...uniquePlacements.values()].map((match) => ({
        ...item,
        serviceId: match.serviceId || item.serviceId,
        dayLabel: match.dayLabel || item.dayLabel,
        mealLabel: match.mealLabel || item.mealLabel,
        servicePax:
          Math.max(0, Number(match.servicePax) || 0) ||
          Math.max(0, Number(item.servicePax) || 0) ||
          undefined,
      }));
    });

    // AI-only / unknown dishes can still carry ai_service_* while catalog
    // dishes carry service_*. If their visible day + meal matches a parsed
    // service, put them onto the same structural service id.
    const unified = expanded.map((item) => {
      const visible = visiblePlacementKey(item);
      const meal = normalizePart(item.mealLabel);
      const directServiceId = visible
        ? serviceByVisiblePlacement.get(visible)
        : undefined;
      const mealServices = meal ? servicesByMealLabel.get(meal) : undefined;
      const uniqueMealServiceId =
        !directServiceId && mealServices?.size === 1
          ? [...mealServices][0]
          : undefined;

      return directServiceId || uniqueMealServiceId
        ? {
            ...item,
            serviceId: directServiceId || uniqueMealServiceId,
          }
        : item;
    });

    // Local catalog parsing can recover a known dish that AI missed entirely.
    const existing = new Set(unified.map(serviceDishKey));
    for (const structuralItem of structuralMenu) {
      const key = serviceDishKey(structuralItem);
      if (!existing.has(key)) {
        unified.push(structuralItem);
        existing.add(key);
      }
    }

    return Array.from(
      new Map(unified.map((item) => [serviceDishKey(item), item])).values(),
    );
  } catch (structureError) {
    console.warn('Menu function structure repair skipped:', structureError);
    return detectedMenu;
  }
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
    const visible = `${normalizePart(dayLabel) || 'event'}::${normalizePart(mealLabel) || 'event menu'}`;
    // Visible function identity is authoritative. serviceId is only a fallback
    // when detection supplied no day/meal label at all.
    const key =
      dayLabel || dish.mealLabel?.trim()
        ? `visible:${visible}`
        : serviceId
          ? `service:${serviceId}`
          : 'event:default';

    const group = groups.get(key) ?? {
      key,
      serviceId,
      dayLabel,
      mealLabel,
      servicePax,
      dishes: [],
    };

    group.servicePax = Math.max(group.servicePax, servicePax);
    group.serviceId = group.serviceId || serviceId;

    const duplicate = group.dishes.some(
      (item) =>
        normalizePart(item.category) === normalizePart(dish.category) &&
        normalizePart(item.name) === normalizePart(dish.name),
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
    let cancelled = false;

    void (async () => {
      try {
        const session = getSession();
        if (!session) {
          if (!cancelled) setMeals([]);
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
        const repairedMenu = await repairDetectedStructure(
          work.event.rawMenuText,
          filteredMenu,
        );
        const fallbackMealLabel =
          work.event.functionType?.trim() || 'Event Menu';
        const defaultPax = Math.max(0, Number(work.event.pax) || 0);

        if (!cancelled) {
          setMeals(
            buildMealGroups(
              repairedMenu,
              fallbackMealLabel,
              defaultPax,
            ),
          );
        }
      } catch {
        if (!cancelled) setMeals([]);
      }
    })();

    return () => {
      cancelled = true;
    };
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
      const importableDishes = meals.flatMap((meal, mealIndex) => {
        const mealLabel = meal.mealLabel.trim() || fallbackMealLabel;
        const servicePax = Math.max(0, Number(meal.servicePax) || 0);
        // One canonical id per visible function prevents AI/local source ids
        // from splitting the same meal later in costing or manpower.
        const serviceId = `menu_service_${mealIndex + 1}`;

        return meal.dishes.map((dish) => ({
          ...dish,
          serviceId,
          dayLabel: meal.dayLabel,
          mealLabel,
          servicePax,
        }));
      });

      const canonicalMenu = Array.from(
        new Map(importableDishes.map((dish) => [serviceDishKey(dish), dish])).values(),
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
        // This page represents the current upload. Replace old menu rows rather
        // than appending stale dishes/functions from an earlier detection.
        menu: canonicalMenu,
        // Keep saved rates but clear old function assignments/quantities so
        // Manpower rebuilds cleanly from the new canonical meal structure.
        manpower: work.manpower.map((row) => ({
          ...row,
          quantity: 0,
          serviceId: undefined,
          dayLabel: undefined,
          mealLabel: undefined,
          servicePax: undefined,
          assignedDishIds: undefined,
        })),
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
          <p role="status">Separating functions and dishes…</p>
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
                  aria-label={`Function ${mealIndex + 1}`}
                >
                  <div className={styles.mealHeader}>
                    <div className={styles.mealHeading}>
                      <span className={styles.mealNumber}>
                        Function / Meal {mealIndex + 1}
                      </span>
                      {meal.dayLabel ? (
                        <small>{meal.dayLabel}</small>
                      ) : null}
                    </div>

                    <div className={styles.mealFields}>
                      <label className={styles.mealField}>
                        <span>Function / Meal name</span>
                        <input
                          type="text"
                          value={meal.mealLabel}
                          onChange={(event) =>
                            updateMeal(meal.key, {
                              mealLabel: event.target.value,
                            })
                          }
                          placeholder="Breakfast, Haldi, Lunch, Dinner…"
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
                            <li key={`${meal.key}-${dish.id}`}>{dish.name}</li>
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
