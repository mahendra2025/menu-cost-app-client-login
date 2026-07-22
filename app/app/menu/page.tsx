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
  CATEGORIES,
  detectCategory,
  findDishByName,
  findDishByNameInItems,
  suggestDishesByName,
  syncDishCostItemsFromServer,
} from '../../../lib/dishCostMaster';

import {
  getSession,
  loadWork,
  saveWork,
  uid,
} from '../../../lib/store';

import type {
  MenuItem,
  Session,
  WorkState,
} from '../../../lib/types';

type PageMessage = {
  type: 'success' | 'error';
  text: string;
} | null;

type MenuFunctionGroup = {
  groupKey: string;
  serviceId: string;
  dayLabel: string;
  mealLabel: string;
  servicePax: number;
  items: MenuItem[];
};

function normalizeDishKey(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatRate(value: number): string {
  return Number(value || 0).toFixed(2);
}

function proportionalRate(
  currentRate: number,
  currentQuantity: number,
  nextQuantity: number,
) {
  if (!(currentQuantity > 0) || !(nextQuantity > 0)) return currentRate;
  return Math.round((currentRate * nextQuantity / currentQuantity) * 100) / 100;
}

function formatServingQuantity(value: number | undefined) {
  const quantity = Number(value ?? 1);
  return Number.isInteger(quantity)
    ? String(quantity)
    : String(Math.round(quantity * 100) / 100);
}

export default function MenuPage() {
  const router = useRouter();

  const [session, setSession] =
    useState<Session | null>(null);

  const [work, setWork] =
    useState<WorkState | null>(null);

  const [newDish, setNewDish] =
    useState('');

  const [newCategory, setNewCategory] =
    useState('Sabji');

  /*
   * String is used so the rate input
   * can remain completely empty.
   */
  const [newRate, setNewRate] =
    useState('');

  const [newServiceId, setNewServiceId] =
    useState('');

  const [pageMessage, setPageMessage] =
    useState<PageMessage>(null);

  const [menuQuery, setMenuQuery] =
    useState('');

  const [showMissingOnly, setShowMissingOnly] =
    useState(false);

  const [selectedFunctionId, setSelectedFunctionId] =
    useState('');

  const [selectedMenuCategory, setSelectedMenuCategory] =
    useState('');

  const [isQuickAddOpen, setIsQuickAddOpen] =
    useState(false);

  const [catalogCategories, setCatalogCategories] =
    useState<string[]>([]);

  useEffect(() => {
    const currentSession = getSession();

    setSession(currentSession);

    if (!currentSession) return;

    const tenantId =
      currentSession.tenantId;
    const currentWork =
      loadWork(tenantId);

    setWork(currentWork);

    let cancelled = false;

    async function refreshAdminServings() {
      const adminDishes =
        await syncDishCostItemsFromServer();
      if (cancelled) return;

      setCatalogCategories(
        Array.from(new Set(adminDishes.map((dish) => dish.category))),
      );

      setWork((latestWork) => {
        if (!latestWork) return latestWork;

        let changed = false;
        const refreshedMenu =
          latestWork.menu.map((item) => {
            const hasPlaceholderServing =
              Number(
                item.portionQuantity ??
                1,
              ) === 1 &&
              String(
                item.portionUnit ??
                'serving',
              ).trim().toLowerCase() ===
                'serving';

            if (
              item.portionManuallyEdited &&
              !hasPlaceholderServing
            ) {
              return item;
            }

            const adminDish =
              findDishByNameInItems(
                item.name,
                adminDishes,
              );

            if (!adminDish) return item;

            const portionQuantity =
              adminDish.servingQuantity ??
              1;
            const portionUnit =
              adminDish.servingUnit ??
              'serving';

            if (
              item.portionQuantity ===
                portionQuantity &&
              item.portionUnit ===
                portionUnit
            ) {
              return item;
            }

            changed = true;
            return {
              ...item,
              portionQuantity,
              portionUnit,
              portionManuallyEdited:
                false,
            };
          });

        if (!changed) return latestWork;

        const refreshedWork = {
          ...latestWork,
          menu: refreshedMenu,
        };

        saveWork(
          tenantId,
          refreshedWork,
        );

        return refreshedWork;
      });
    }

    void refreshAdminServings();

    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = useMemo(() => {
    const categoryMap =
      new Map<string, MenuItem[]>();

    for (const item of work?.menu ?? []) {
      const categoryItems =
        categoryMap.get(item.category) ?? [];

      categoryMap.set(
        item.category,
        [...categoryItems, item],
      );
    }

    return Array.from(
      categoryMap.entries(),
    ).sort(
      ([firstCategory], [secondCategory]) =>
        firstCategory.localeCompare(
          secondCategory,
        ),
    );
  }, [work]);

  const availableCategories = useMemo(
    () => Array.from(new Set([
      ...CATEGORIES,
      ...catalogCategories,
      ...(work?.menu ?? []).map((item) => item.category),
    ].map((category) => category.trim()).filter(Boolean))),
    [catalogCategories, work],
  );

  const manualRateCount = useMemo(
    () =>
      (work?.menu ?? []).filter(
        (item) =>
          !(Number(item.costPerPlate) > 0),
      ).length,
    [work],
  );

  const hasFunctionMetadata = useMemo(
    () =>
      (work?.menu ?? []).some(
        (item) =>
          Boolean(
            item.serviceId ||
              item.dayLabel ||
              item.mealLabel,
          ),
      ),
    [work],
  );

  /*
   * Group detected dishes function-wise.
   * serviceId is preferred. Older saved items
   * without serviceId are grouped by day + meal.
   */
  const menuFunctionGroups = useMemo(() => {
    const functions =
      new Map<string, MenuFunctionGroup>();

    for (const item of work?.menu ?? []) {
      const dayLabel =
        item.dayLabel?.trim() || '';
      const mealLabel =
        item.mealLabel?.trim() ||
        'Event Menu';

      const fallbackGroupKey = [
        normalizeDishKey(
          dayLabel || 'event',
        ),
        normalizeDishKey(mealLabel),
      ].join('::');

      const groupKey =
        item.serviceId?.trim() ||
        fallbackGroupKey;

      const existing =
        functions.get(groupKey);

      if (existing) {
        existing.items.push(item);
        existing.servicePax = Math.max(
          existing.servicePax,
          Number(item.servicePax) || 0,
        );
        continue;
      }

      functions.set(groupKey, {
        groupKey,
        serviceId:
          item.serviceId?.trim() ||
          groupKey,
        dayLabel,
        mealLabel,
        servicePax: Math.max(
          0,
          Number(item.servicePax) ||
            Number(work?.event.pax) ||
            0,
        ),
        items: [item],
      });
    }

    return Array.from(functions.values());
  }, [work]);

  const visibleFunctionGroups = useMemo(() => {
    const query = normalizeDishKey(menuQuery);
    const activeFunctionId = menuFunctionGroups.some(
      (functionGroup) => functionGroup.groupKey === selectedFunctionId,
    )
      ? selectedFunctionId
      : '';
    const activeCategory = menuFunctionGroups.some(
      (functionGroup) =>
        functionGroup.items.some(
          (item) => item.category === selectedMenuCategory,
        ),
    )
      ? selectedMenuCategory
      : '';

    return menuFunctionGroups
      .filter(
        (functionGroup) =>
          !activeFunctionId ||
          functionGroup.groupKey === activeFunctionId,
      )
      .map((functionGroup) => ({
        ...functionGroup,
        items: functionGroup.items.filter((item) => {
          const matchesQuery =
            !query ||
            normalizeDishKey(
              `${item.name} ${item.category} ${item.dayLabel ?? ''} ${item.mealLabel ?? ''}`,
            ).includes(query);
          const matchesRate =
            !showMissingOnly ||
            !(Number(item.costPerPlate) > 0);
          const matchesCategory =
            !activeCategory ||
            item.category === activeCategory;

          return matchesQuery && matchesRate && matchesCategory;
        }),
      }))
      .filter((functionGroup) => functionGroup.items.length > 0);
  }, [menuFunctionGroups, menuQuery, selectedFunctionId, selectedMenuCategory, showMissingOnly]);

  const menuReady =
    Boolean(work?.menu.length) &&
    manualRateCount === 0;

  /*
   * Only show the meal selector when Event Page
   * supplied function metadata.
   */
  const weddingServices = useMemo(
    () =>
      hasFunctionMetadata
        ? menuFunctionGroups.map(
            (functionGroup) => ({
              serviceId:
                functionGroup.serviceId,
              dayLabel:
                functionGroup.dayLabel,
              mealLabel:
                functionGroup.mealLabel,
              servicePax:
                functionGroup.servicePax,
            }),
          )
        : [],
    [
      hasFunctionMetadata,
      menuFunctionGroups,
    ],
  );

  const selectedNewDishService =
    weddingServices.find(
      (service) =>
        service.serviceId ===
        newServiceId,
    ) ?? weddingServices[0];

  const matchedNewDish = useMemo(() => {
    const trimmedName = newDish.trim();

    if (!trimmedName) {
      return null;
    }

    return findDishByName(trimmedName);
  }, [newDish]);

  const newDishPreview = useMemo(() => {
    const trimmedName = newDish.trim();

    if (!trimmedName) {
      return null;
    }

    if (matchedNewDish) {
      return {
        mode: 'matched' as const,
        dishName: matchedNewDish.name,
        category: matchedNewDish.category,
        detectedRate:
          Number(matchedNewDish.rate) || 0,
      };
    }

    const category =
      newCategory ||
      detectCategory(trimmedName) ||
      'Sabji';

    return {
      mode: 'fallback' as const,
      dishName: trimmedName,
      category,
      detectedRate: 0,
    };
  }, [
    newDish,
    newCategory,
    matchedNewDish,
  ]);

  const newDishSuggestions = useMemo(() => {
    const trimmedName = newDish.trim();

    if (!trimmedName || matchedNewDish) {
      return [];
    }

    return suggestDishesByName(
      trimmedName,
      5,
    );
  }, [newDish, matchedNewDish]);

  const isNewDishMatched =
    newDishPreview?.mode === 'matched';

  const finalPreviewRate =
    newRate === ''
      ? newDishPreview?.detectedRate ?? 0
      : Math.max(0, Number(newRate) || 0);

  function focusQuickAdd() {
    setIsQuickAddOpen(true);
    setPageMessage(null);

    window.setTimeout(() => {
      document
        .getElementById('menuQuickAdd')
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });

      document
        .getElementById('newDish')
        ?.focus({ preventScroll: true });
    }, 80);
  }

  function persist(next: WorkState) {
    if (!session) return;

    setWork(next);
    saveWork(session.tenantId, next);
  }

  function handleNewDishChange(
    value: string,
  ) {
    setNewDish(value);
    setPageMessage(null);

    const trimmedName = value.trim();

    if (!trimmedName) {
      setNewCategory('Sabji');
      setNewRate('');
      return;
    }

    const matchedDish =
      findDishByName(trimmedName);

    if (matchedDish) {
      setNewCategory(
        matchedDish.category,
      );

      setNewRate(
        String(
          Number(matchedDish.rate) || 0,
        ),
      );

      return;
    }

    const detectedCategory =
      detectCategory(trimmedName) ||
      'Sabji';

    setNewCategory(detectedCategory);
    setNewRate('');
  }

  function updateItem(
    id: string,
    patch: Partial<MenuItem>,
  ) {
    if (!work) return;

    const nextMenu = work.menu.map(
      (item) => {
        if (item.id !== id) {
          return item;
        }

        const updated: MenuItem = {
          ...item,
          ...patch,
        };

        /*
         * When the dish name changes,
         * try matching the master again.
         */
        if (
          typeof patch.name === 'string'
        ) {
          const trimmedName =
            patch.name.trim();

          const matchedDish =
            findDishByName(trimmedName);

          if (matchedDish) {
            updated.name =
              patch.name;

            updated.category =
              matchedDish.category;
            updated.portionQuantity =
              matchedDish.servingQuantity ??
              1;
            updated.portionUnit =
              matchedDish.servingUnit ??
              'serving';
            updated.portionManuallyEdited =
              false;

            /*
             * Only update the rate when
             * a manual rate was not included
             * in the same update.
             */
            if (
              patch.costPerPlate ===
              undefined
            ) {
              updated.costPerPlate =
                Number(
                  matchedDish.rate,
                ) || 0;
            }
          } else {
            const detectedCategory =
              detectCategory(trimmedName) ||
              updated.category ||
              'Sabji';

            updated.category =
              detectedCategory;

            if (
              patch.costPerPlate ===
              undefined
            ) {
              updated.costPerPlate = 0;
            }
          }
        }

        return updated;
      },
    );

    persist({
      ...work,
      menu: nextMenu,
    });
  }

  function updateServingQuantity(
    item: MenuItem,
    nextQuantity: number,
  ) {
    updateItem(
      item.id,
      {
        portionQuantity:
          nextQuantity,
        portionManuallyEdited:
          true,
        costPerPlate:
          proportionalRate(
            Number(
              item.costPerPlate,
            ) || 0,
            Number(
              item.portionQuantity ??
              1,
            ) || 0,
            nextQuantity,
          ),
      },
    );
  }

  function addDish() {
    if (!work) return;

    const trimmedName =
      newDish.trim();

    if (!trimmedName) {
      setPageMessage({
        type: 'error',
        text: 'Enter a dish name first.',
      });

      return;
    }

    const matchedDish =
      findDishByName(trimmedName);

    const finalName =
      matchedDish?.name ||
      trimmedName;

    const finalCategory =
      matchedDish?.category ||
      newCategory ||
      detectCategory(trimmedName) ||
      'Sabji';

    const detectedRate =
      Number(matchedDish?.rate) || 0;

    /*
     * Manual rate takes priority.
     * Empty input uses the detected rate.
     */
    const finalRate =
      newRate === ''
        ? detectedRate
        : Math.max(
            0,
            Number(newRate) || 0,
          );

    const duplicateExists =
      work.menu.some((item) => {
        const sameName =
          normalizeDishKey(item.name) ===
          normalizeDishKey(finalName);

        const sameCategory =
          normalizeDishKey(
            item.category,
          ) ===
          normalizeDishKey(
            finalCategory,
          );

        const sameService =
          (item.serviceId ?? '') ===
          (selectedNewDishService?.serviceId ?? '');

        return sameName && sameCategory && sameService;
      });

    if (duplicateExists) {
      setPageMessage({
        type: 'error',
        text: `${finalName} is already in the menu.`,
      });

      return;
    }

    const item: MenuItem = {
      id: uid('dish'),
      name: finalName,
      category: finalCategory,
      costPerPlate: finalRate,
      portionQuantity:
        matchedDish?.servingQuantity ??
        1,
      portionUnit:
        matchedDish?.servingUnit ??
        'serving',
      serviceId:
        selectedNewDishService?.serviceId,
      dayLabel:
        selectedNewDishService?.dayLabel,
      mealLabel:
        selectedNewDishService?.mealLabel,
      servicePax:
        selectedNewDishService?.servicePax,
    };

    persist({
      ...work,
      menu: [
        ...work.menu,
        item,
      ],
    });

    setNewDish('');
    setNewCategory('Sabji');
    setNewRate('');

    setPageMessage({
      type: 'success',
      text:
        finalRate > 0
          ? `${finalName} added at ₹${formatRate(
              finalRate,
            )} per plate.`
          : `${finalName} added without a catalog rate. Enter its manual rate below.`,
    });
  }

  function selectSuggestedDish(
    dish: {
      name: string;
      category: string;
      rate: number;
    },
  ) {
    setNewDish(dish.name);
    setNewCategory(dish.category);
    setNewRate(
      String(Number(dish.rate) || 0),
    );

    setPageMessage(null);
  }

  function removeDish(id: string) {
    if (!work) return;

    const selectedDish =
      work.menu.find(
        (item) => item.id === id,
      );

    if (
      selectedDish &&
      !window.confirm(
        `Remove ${selectedDish.name} from this menu?`,
      )
    ) {
      return;
    }

    persist({
      ...work,
      menu: work.menu.filter(
        (item) => item.id !== id,
      ),
    });

    setPageMessage({
      type: 'success',
      text: selectedDish
        ? `${selectedDish.name} removed.`
        : 'Dish removed.',
    });
  }

  function goToCostPage() {
    if (!work) return;

    if (!work.menu.length) {
      setPageMessage({
        type: 'error',
        text: 'Add at least one dish before calculating cost.',
      });

      return;
    }

    const dishesWithoutRate =
      work.menu.filter(
        (item) =>
          !(Number(item.costPerPlate) > 0),
      );

    if (dishesWithoutRate.length) {
      setPageMessage({
        type: 'error',
        text: `Add a manual rate for ${dishesWithoutRate.length} dish${
          dishesWithoutRate.length === 1 ? '' : 'es'
        }: ${dishesWithoutRate
          .map((item) => item.name)
          .join(', ')}.`,
      });

      return;
    }

    router.push('/app/manpower');
  }

  if (!work || !session) {
    return (
      <AppShell title="Menu">
        <div className="content-grid">
          <div className="glass-card">
            Loading...
          </div>
        </div>
      </AppShell>
    );
  }

  if (
    session.status === 'EXPIRED'
  ) {
    return (
      <AppShell title="Menu">
        <LockedCard />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Menu"
      subtitle="Review dishes, serving sizes and rates before manpower planning"
    >
      <section className="content-grid">
        <div className={`menu-overview ${menuReady ? 'is-ready' : 'needs-review'}`}>
          <div>
            <span className="section-kicker">Menu readiness</span>
            <h2>
              {menuReady
                ? 'Your menu is ready'
                : manualRateCount > 0
                  ? `${manualRateCount} rate${manualRateCount === 1 ? '' : 's'} need attention`
                  : 'Build your event menu'}
            </h2>
            <p>
              {menuReady
                ? 'All dishes have a rate. Continue to plan the service team.'
                : manualRateCount > 0
                  ? 'Enter the highlighted rates to unlock the next step.'
                  : 'Add dishes manually or return to Event to detect them from your menu text.'}
            </p>
          </div>

          <div className="menu-overview-side">
            <button
              className="menu-add-dish-button"
              type="button"
              onClick={focusQuickAdd}
              aria-label="Add a dish"
            >
              <span aria-hidden="true">+</span>
              Add dish
            </button>

            <div className="menu-overview-metrics" aria-label="Menu summary">
              <span><b>{work.menu.length}</b> dishes</span>
              <span><b>{menuFunctionGroups.length}</b> functions</span>
              <span className={manualRateCount > 0 ? 'needs-attention' : 'is-complete'}>
                <b>{manualRateCount}</b> rates missing
              </span>
            </div>
          </div>
        </div>

        <div className="stat-grid">
          <div className="stat-card">
            <small>Step</small>
            <strong>2/6</strong>
            <span>Menu check</span>
          </div>

          <div className="stat-card">
            <small>Dishes</small>

            <strong>
              {work.menu.length}
            </strong>

            <span>
              Total selected
            </span>
          </div>

          <div className="stat-card">
            <small>
              {weddingServices.length > 0
                ? 'Functions'
                : 'Categories'}
            </small>

            <strong>
              {weddingServices.length > 0
                ? menuFunctionGroups.length
                : grouped.length}
            </strong>

            <span>
              {weddingServices.length > 0
                ? 'Meal-wise'
                : 'Auto grouped'}
            </span>
          </div>

          <div className="stat-card">
            <small>Status</small>
            <strong>{menuReady ? 'Ready' : 'Review'}</strong>
            <span>{menuReady ? 'Continue to manpower' : 'Complete missing details'}</span>
          </div>
        </div>

        {pageMessage ? (
          <div
            className={`menu-page-message ${pageMessage.type}`}
            role="alert"
          >
            <b>
              {pageMessage.type ===
              'error'
                ? 'Check this'
                : 'Done'}
            </b>

            <p>
              {pageMessage.text}
            </p>
          </div>
        ) : null}

        {isQuickAddOpen ? (
        <div id="menuQuickAdd" className="glass-card menu-quick-add-card">
          <div className="menu-section-heading">
            <div>
              <div className="section-kicker">Quick Add</div>
              <h2>Add a missing dish</h2>
              <p>Catalog matches fill the category, serving size and rate automatically.</p>
            </div>

            <div className="menu-quick-add-heading-actions">
              <span className="badge green">Saved instantly</span>
              <button
                className="menu-quick-add-close"
                type="button"
                onClick={() => setIsQuickAddOpen(false)}
                aria-label="Hide Quick Add"
                title="Hide Quick Add"
              >
                ×
              </button>
            </div>
          </div>

          <div
            className="form-grid menu-quick-add-grid"
          >
            {weddingServices.length > 0 ? (
              <div className="field">
                <label htmlFor="newService">
                  Function / Meal
                </label>

                <select
                  id="newService"
                  className="select select-large"
                  value={selectedNewDishService?.serviceId ?? ''}
                  onChange={(event) => {
                    setNewServiceId(event.target.value);
                    setPageMessage(null);
                  }}
                >
                  {weddingServices.map((service) => (
                    <option
                      key={service.serviceId}
                      value={service.serviceId}
                    >
                      {[service.dayLabel, service.mealLabel]
                        .filter(Boolean)
                        .join(' • ')}
                      {service.servicePax
                        ? ` • ${service.servicePax} members`
                        : ''}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="field">
              <label htmlFor="newDish">
                Dish Name
              </label>

              <input
                id="newDish"
                className="input input-large"
                value={newDish}
                onChange={(event) =>
                  handleNewDishChange(
                    event.target.value,
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter'
                  ) {
                    event.preventDefault();
                    addDish();
                  }
                }}
                placeholder="Paneer Butter Masala"
              />
            </div>

            <div className="field">
              <label htmlFor="newCategory">
                Category
              </label>

              <select
                id="newCategory"
                className={`select select-large ${
                  isNewDishMatched
                    ? 'select-locked'
                    : ''
                }`}
                value={newCategory}
                onChange={(event) => {
                  const category =
                    event.target.value;

                  setNewCategory(category);

                  if (isNewDishMatched) {
                    setNewRate(
                      String(
                        Number(
                          matchedNewDish?.rate,
                        ) || 0,
                      ),
                    );
                  }

                  setPageMessage(null);
                }}
                disabled={
                  isNewDishMatched
                }
              >
                {availableCategories.map(
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
              <label htmlFor="newRate">
                Manual Rate / Plate
              </label>

              <input
                id="newRate"
                className="input input-large"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={newRate}
                onChange={(event) => {
                  const value =
                    event.target.value;

                  if (value === '') {
                    setNewRate('');
                  } else {
                    setNewRate(
                      String(
                        Math.max(
                          0,
                          Number(value) || 0,
                        ),
                      ),
                    );
                  }

                  setPageMessage(null);
                }}
                placeholder="0.00"
              />

              <small className="muted">
                {isNewDishMatched
                  ? 'Detected automatically, but editable.'
                  : 'Not in catalog — enter the rate manually.'}
              </small>
            </div>

            <div className="field">
              <label>&nbsp;</label>

              <button
                className="primary-button full"
                type="button"
                onClick={addDish}
                disabled={!newDish.trim()}
              >
                Add Dish
              </button>
            </div>
          </div>

          {newDishPreview ? (
            <div
              className={`dish-preview ${
                newDishPreview.mode ===
                'matched'
                  ? 'matched'
                  : 'fallback'
              }`}
            >
              <strong>
                {newDishPreview.mode ===
                'matched'
                  ? 'Catalog match'
                  : 'Estimated category'}
              </strong>

              <span>
                {
                  newDishPreview.dishName
                }
              </span>

              <small>
                {
                  newDishPreview.category
                }
                {newDishPreview.mode === 'matched' ? (
                  <>
                    {' • Detected ₹'}
                    {formatRate(newDishPreview.detectedRate)}
                    {' • Final ₹'}
                    {formatRate(finalPreviewRate)}
                  </>
                ) : (
                  <>
                    {' • No catalog rate'}
                    {newRate !== ''
                      ? ` • Manual ₹${formatRate(finalPreviewRate)}`
                      : ' • Manual rate required'}
                  </>
                )}
              </small>
            </div>
          ) : null}

          {isNewDishMatched ? (
            <p
              className="muted"
              style={{
                marginTop: 10,
              }}
            >
              The category is locked
              because this dish matched
              the catalog. Its rate can
              still be changed manually.
            </p>
          ) : null}

          {newDishSuggestions.length >
          0 ? (
            <div className="dish-suggestions">
              <strong>
                Did you mean?
              </strong>

              <div className="action-row">
                {newDishSuggestions.map(
                  (dish) => (
                    <button
                      key={`${dish.name}-${dish.category}`}
                      className="ghost-button"
                      type="button"
                      onClick={() =>
                        selectSuggestedDish(
                          dish,
                        )
                      }
                    >
                      {dish.name}
                      {' • '}
                      {dish.category}
                      {' • ₹'}
                      {formatRate(
                        Number(
                          dish.rate,
                        ),
                      )}
                    </button>
                  ),
                )}
              </div>
            </div>
          ) : null}
        </div>
        ) : null}

        <div className="glass-card menu-review-card">
          <div className="menu-section-heading">
            <div>
              <div className="section-kicker">Review Items</div>
              <h2>Check menu details</h2>
              <p>Update dish names, categories, serving sizes and per-plate rates.</p>
            </div>

            <span className={`badge ${menuReady ? 'green' : 'orange'}`}>
              {menuReady
                ? 'Ready for manpower'
                : work.menu.length === 0
                  ? 'No dishes yet'
                  : `${manualRateCount} missing rates`}
            </span>
          </div>

          {manualRateCount > 0 ? (
            <div className="menu-rate-alert" role="alert">
              <b>
                {manualRateCount}{' '}
                {manualRateCount === 1
                  ? 'dish needs'
                  : 'dishes need'}{' '}
                a manual rate
              </b>

              <p>
                These dishes were not found in the catalog. Enter each rate before calculating cost.
              </p>
            </div>
          ) : null}

          {work.menu.length > 0 ? (
            <div className="menu-review-toolbar">
              <div className="menu-function-filter">
                <label htmlFor="functionFilter">Function</label>
                <select
                  id="functionFilter"
                  className="select input-large"
                  value={selectedFunctionId}
                  onChange={(event) => setSelectedFunctionId(event.target.value)}
                >
                  <option value="">All functions</option>
                  {menuFunctionGroups.map((functionGroup) => (
                    <option
                      key={functionGroup.groupKey}
                      value={functionGroup.groupKey}
                    >
                      {[functionGroup.dayLabel, functionGroup.mealLabel]
                        .filter(Boolean)
                        .join(' • ')}
                      {functionGroup.servicePax > 0
                        ? ` • ${functionGroup.servicePax} members`
                        : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="menu-category-filter">
                <label htmlFor="categoryFilter">Category</label>
                <select
                  id="categoryFilter"
                  className="select input-large"
                  value={selectedMenuCategory}
                  onChange={(event) => setSelectedMenuCategory(event.target.value)}
                >
                  <option value="">All categories</option>
                  {grouped.map(([category, items]) => (
                    <option key={category} value={category}>
                      {category} • {items.length} {items.length === 1 ? 'dish' : 'dishes'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="menu-search-field">
                <label htmlFor="menuSearch">Find a dish</label>
                <input
                  id="menuSearch"
                  className="input input-large"
                  type="search"
                  value={menuQuery}
                  onChange={(event) => setMenuQuery(event.target.value)}
                  placeholder="Search dish, category or function"
                />
              </div>

              <button
                className={`menu-filter-toggle ${showMissingOnly ? 'is-active' : ''}`}
                type="button"
                aria-pressed={showMissingOnly}
                onClick={() => setShowMissingOnly((current) => !current)}
              >
                <span aria-hidden="true">{showMissingOnly ? '✓' : '○'}</span>
                Missing rates only
                {manualRateCount > 0 ? <b>{manualRateCount}</b> : null}
              </button>

              {(menuQuery || showMissingOnly || selectedFunctionId || selectedMenuCategory) ? (
                <button
                  className="ghost-button menu-clear-filter"
                  type="button"
                  onClick={() => {
                    setMenuQuery('');
                    setShowMissingOnly(false);
                    setSelectedFunctionId('');
                    setSelectedMenuCategory('');
                  }}
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          ) : null}

          {work.menu.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon" aria-hidden="true">🥘</div>
              <div>
                <h3>No dishes added yet</h3>
                <p>Paste a full wedding menu on the Event page for automatic detection, or use Quick Add above.</p>
              </div>
              <button
                className="primary-button"
                type="button"
                onClick={() => router.push('/app/event')}
              >
                Paste Wedding Menu
              </button>
            </div>
          ) : null}

          <div className="menu-service-groups">
            {visibleFunctionGroups.map((service) => (
              <section
                className="menu-service-group"
                key={service.groupKey}
              >
                <div className="menu-service-heading">
                  <div>
                    {service.dayLabel ? (
                      <span className="section-kicker">
                        {service.dayLabel}
                      </span>
                    ) : null}
                    <h3>{service.mealLabel}</h3>
                  </div>

                  <div className="menu-service-meta">
                    {service.servicePax > 0 ? (
                      <span className="badge green">
                        {service.servicePax} members
                      </span>
                    ) : null}
                    <span className="badge">
                      {service.items.length}{' '}
                      {service.items.length === 1 ? 'dish' : 'dishes'}
                    </span>
                    {service.items.some(
                      (item) => !(Number(item.costPerPlate) > 0),
                    ) ? (
                      <span className="badge orange">
                        {
                          service.items.filter(
                            (item) =>
                              !(Number(item.costPerPlate) > 0),
                          ).length
                        }{' '}
                        rates missing
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="menu-list">
                  {service.items.map(
                    (item) => (
                <div
                  className={`menu-row ${Number(item.costPerPlate) > 0 ? '' : 'menu-row-missing'}`}
                  key={item.id}
                >
                  <div className="menu-cell">
                    <span className="mobile-field-label">
                      Dish
                    </span>

                    <input
                      className="input input-large"
                      value={item.name}
                      onChange={(event) =>
                        updateItem(
                          item.id,
                          {
                            name:
                              event
                                .target
                                .value,
                          },
                        )
                      }
                    />
                    <small className="menu-serving-summary">
                      Serving:{' '}
                      {formatServingQuantity(
                        item.portionQuantity,
                      )}{' '}
                      {item.portionUnit ??
                        'serving'}
                    </small>
                    {item.mealLabel ? (
                      <small className="menu-serving-summary">
                        {[item.dayLabel, item.mealLabel]
                          .filter(Boolean)
                          .join(' • ')}
                        {item.servicePax
                          ? ` • ${item.servicePax} members`
                          : ''}
                      </small>
                    ) : null}
                  </div>

                  <div className="menu-cell">
                    <span className="mobile-field-label">
                      Category
                    </span>

                    <select
                      className="select select-large"
                      value={
                        item.category
                      }
                      onChange={(event) =>
                        updateItem(
                          item.id,
                          {
                            category:
                              event
                                .target
                                .value,
                          },
                        )
                      }
                    >
                      {availableCategories.map(
                        (category) => (
                          <option
                            key={
                              category
                            }
                            value={
                              category
                            }
                          >
                            {category}
                          </option>
                        ),
                      )}
                    </select>
                  </div>

                  <div className="menu-cell">
                    <span className="mobile-field-label">
                      Serving Quantity
                    </span>

                    <div className="serving-fields">
                      <input
                        className="input input-large"
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        aria-label={`Serving quantity for ${item.name}`}
                        value={
                          item.portionQuantity ??
                          1
                        }
                        onChange={(event) =>
                          updateServingQuantity(
                            item,
                            Math.max(
                              0,
                              Number(
                                event
                                  .target
                                  .value,
                              ) || 0,
                            ),
                          )
                        }
                      />

                      <input
                        className="input input-large serving-unit-input"
                        aria-label={`Serving unit for ${item.name}`}
                        value={
                          item.portionUnit ??
                          'serving'
                        }
                        onChange={(event) =>
                          updateItem(
                            item.id,
                            {
                              portionUnit:
                                event
                                  .target
                                  .value,
                              portionManuallyEdited:
                                true,
                            },
                          )
                        }
                        placeholder="serving"
                      />
                    </div>
                  </div>

                  <div className="menu-cell">
                    <span className="mobile-field-label">
                      Rate / Plate
                    </span>

                    <div className="menu-rate-input">
                      <span aria-hidden="true">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        aria-label={`Rate per plate for ${item.name}`}
                        value={
                          Number(item.costPerPlate) > 0
                            ? item.costPerPlate
                            : ''
                        }
                        onChange={(event) =>
                          updateItem(
                            item.id,
                            {
                              costPerPlate:
                                Math.max(
                                  0,
                                  Number(event.target.value) || 0,
                                ),
                            },
                          )
                        }
                        placeholder="Enter rate"
                      />
                    </div>

                    {Number(item.costPerPlate) <= 0 ? (
                      <small className="field-error">
                        Dish not found — manual rate required
                      </small>
                    ) : null}
                  </div>

                  <button
                    className="menu-remove-button"
                    type="button"
                    onClick={() =>
                      removeDish(item.id)
                    }
                  >
                    Remove
                  </button>
                </div>
                    ),
                  )}
                </div>
              </section>
            ))}
          </div>

          {work.menu.length > 0 && visibleFunctionGroups.length === 0 ? (
            <div className="menu-review-empty">
              <span aria-hidden="true">⌕</span>
              <h3>No matching dishes</h3>
              <p>Try another search or clear the active filters.</p>
              <button
                className="ghost-button"
                type="button"
                onClick={() => {
                  setMenuQuery('');
                  setShowMissingOnly(false);
                  setSelectedFunctionId('');
                  setSelectedMenuCategory('');
                }}
              >
                Clear filters
              </button>
            </div>
          ) : null}

          <div className={`menu-next-step ${menuReady ? 'is-ready' : ''}`}>
            <div>
              <strong>{menuReady ? 'Menu review complete' : 'Complete your menu review'}</strong>
              <span>
                {menuReady
                  ? 'Next, plan the manpower required for each function.'
                  : work.menu.length === 0
                    ? 'Add at least one dish before continuing.'
                    : `${manualRateCount} dish rate${manualRateCount === 1 ? '' : 's'} must be added before continuing.`}
              </span>
            </div>

            <div className="action-row page-actions">
            <button
              className="primary-button"
              type="button"
              onClick={goToCostPage}
            >
              Next: Manpower
            </button>

            <button
              className="ghost-button"
              type="button"
              onClick={() =>
                router.push(
                  '/app/event',
                )
              }
            >
              Back to Event
            </button>
            </div>
          </div>
        </div>

        {grouped.length > 0 &&
        weddingServices.length === 0 ? (
          <div className="glass-card">
            <div className="section-kicker">
              Costing Rules
            </div>

            <h2>
              Category Summary
            </h2>

            <p className="muted">
              When one category contains
              multiple dishes, the
              category cost is shared
              between those dishes on
              the Cost page.
            </p>

            <div className="action-row">
              {grouped.map(
                ([
                  category,
                  items,
                ]) => (
                  <span
                    className={`badge ${
                      items.length > 1
                        ? 'orange'
                        : 'green'
                    }`}
                    key={category}
                  >
                    {category}
                    {': '}
                    {items.length}

                    {items.length > 1
                      ? ' • Shared Portion'
                      : ' • Full Portion'}
                  </span>
                ),
              )}
            </div>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
