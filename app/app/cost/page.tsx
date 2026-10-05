'use client';

import {
  Fragment,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import AppShell, { LockedCard } from '../../components/AppShell';
import { calculate, getMenuServiceKey, getSession, loadWork, saveWork } from '../../../lib/store';
import type { MenuItem, Session, WorkState } from '../../../lib/types';
import { calculateManpowerCost } from '../../../lib/manpowerCost';
import type { Category } from '../../../lib/menuCategories';
import {
  compareMenuCategoryPriority,
  sortMenuItemsByCategoryPriority,
} from '../../../lib/menuCategoryPriority';
import { recommendCategoryConsumptionPercent } from '../../../lib/categoryConsumption';
import {
  getCostingAnalyticsKey,
  trackProductEvent,
} from '../../../lib/productAnalytics';

function money(value: number) {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

function needsManualRate(
  item: Pick<
    MenuItem,
    | 'costPerPlate'
    | 'costSource'
    | 'coverageStatus'
    | 'detectionSource'
  >,
) {
  if (
    item.costSource === 'manual' &&
    Number(item.costPerPlate) > 0
  ) {
    return false;
  }

  return (
    !(Number(item.costPerPlate) > 0) ||
    item.detectionSource === 'ai' ||
    item.detectionSource === 'rules' ||
    item.detectionSource === 'consensus' ||
    item.costSource === 'category_estimate' ||
    item.coverageStatus === 'NEW_DISH_PENDING' ||
    item.coverageStatus === 'UNRESOLVED'
  );
}

type AvailableDish = {
  name: string;
  category: string;
  rate: number;
  servingQuantity?: number;
  servingUnit?: string;
  pieceWeightGrams?: number;
  gasKgPer100?: number;
  aliases?: string[];
};

function normalizeDishName(value: string) {
  return value.trim().toLocaleLowerCase('en-IN').replace(/\s+/g, ' ');
}


function formatMenuDate(
  value: string,
) {
  const text =
    String(
      value || '',
    ).trim();

  if (!text) {
    return '';
  }

  const iso =
    text.match(
      /\b(\d{4})-(\d{2})-(\d{2})\b/,
    );

  if (iso) {
    return (
      `${iso[3]}/` +
      `${iso[2]}/` +
      `${iso[1]}`
    );
  }

  const common =
    text.match(
      /\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/,
    );

  if (!common) {
    return '';
  }

  const day =
    common[1].padStart(
      2,
      '0',
    );

  const month =
    common[2].padStart(
      2,
      '0',
    );

  const year =
    common[3].length === 2
      ? `20${common[3]}`
      : common[3];

  return (
    `${day}/${month}/${year}`
  );
}

function extractMenuDates(
  value: string,
) {
  const matches =
    String(
      value || '',
    ).match(
      /\b(?:\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/g,
    ) || [];

  return Array.from(
    new Set(
      matches
        .map(
          formatMenuDate,
        )
        .filter(
          Boolean,
        ),
    ),
  );
}

export default function CostPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [work, setWork] = useState<WorkState | null>(null);
  const [dishQuery, setDishQuery] = useState('');
  const [dishServiceFilter, setDishServiceFilter] = useState('ALL');
  const [dishCategoryFilter, setDishCategoryFilter] = useState('ALL');
  const [dishStatusFilter, setDishStatusFilter] = useState<'ALL' | 'MISSING' | 'COSTED'>('ALL');
  const [collapsedDishGroups, setCollapsedDishGroups] = useState<Record<string, boolean>>({});
  const deferredDishQuery = useDeferredValue(dishQuery);
  const [availableDishCategories, setAvailableDishCategories] =
    useState<string[]>([]);
  const [availableDishes, setAvailableDishes] = useState<AvailableDish[]>([]);

  const [
    showAddDish,
    setShowAddDish,
  ] =
    useState(false);

  const [quickDishNames, setQuickDishNames] = useState('');
  const [quickAddMessage, setQuickAddMessage] = useState('');
  const [showDishBrowser, setShowDishBrowser] = useState(false);
  const [dishBrowserQuery, setDishBrowserQuery] = useState('');
  const [dishBrowserCategory, setDishBrowserCategory] = useState('ALL');

  const [
    newDishCategory,
    setNewDishCategory,
  ] =
    useState<Category>(
      'Other',
    );

  const [
    newDishServiceKey,
    setNewDishServiceKey,
  ] =
    useState('');

  useEffect(() => {
    const current = getSession();
    setSession(current);
    if (current) setWork(loadWork(current.tenantId));
  }, []);

  useEffect(() => {
    let active = true;

    void fetch('/api/dishes', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => {
        if (!active) return;
        const dishes = Array.isArray(data.items)
          ? data.items.filter(
              (item: unknown): item is AvailableDish =>
                Boolean(
                  item &&
                  typeof item === 'object' &&
                  String((item as AvailableDish).name || '').trim(),
                ),
            )
          : [];
        const categories = Array.isArray(data.categories)
          ? Array.from(
              new Set(
                data.categories
                  .map((category: unknown) => String(category || '').trim())
                  .filter(Boolean),
              ),
            ) as string[]
          : [];
        setAvailableDishes(dishes);
        setAvailableDishCategories(categories);
        if (categories.length) {
          setNewDishCategory((current) =>
            categories.includes(current) ? current : categories[0] as Category,
          );
        }
      })
      .catch(() => {
        if (active) {
          setAvailableDishes([]);
          setAvailableDishCategories([]);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const result = useMemo(
    () => work ? calculate(work) : null,
    [work],
  );

  useEffect(() => {
    if (
      !work ||
      !session ||
      !result ||
      session.status === 'EXPIRED' ||
      work.menu.length === 0
    ) {
      return;
    }

    const costingKey =
      getCostingAnalyticsKey(
        work,
      );

    void trackProductEvent(
      'cost_reviewed',
      {
        costingKey,
        dishCount:
          work.menu.length,
        totalCovers:
          result.totalCovers,
        totalCost:
          Math.round(
            result.totalCost,
          ),
      },
      {
        onceKey:
          `cost_reviewed:${costingKey}`,
      },
    );
  }, [work, session, result]);

  if (!work || !session || !result) return <AppShell title="Cost"><div className="content-grid"><div className="glass-card">Loading...</div></div></AppShell>;
  if (session.status === 'EXPIRED') return <AppShell title="Cost"><LockedCard /></AppShell>;

  const dishCategories = Array.from(
    new Set(
      result.menuBreakdown
        .map((item) => item.category)
        .filter((category) => availableDishCategories.includes(category)),
    ),
  ).sort((a, b) =>
    compareMenuCategoryPriority(
      { name: '', category: a },
      { name: '', category: b },
    ),
  );
  const dishServices = Array.from(
    new Map(
      result.menuBreakdown.map((item) => {
        const label = item.mealLabel
          ? `${item.dayLabel ? `${item.dayLabel} • ` : ''}${item.mealLabel}`
          : 'Event Menu';
        return [item.serviceKey, label];
      }),
    ).entries(),
  );
  const rawMenuDates =
    extractMenuDates(
      work.event.rawMenuText ||
      '',
    );

  const serviceDayKeys =
    Array.from(
      new Set(
        result.serviceSummaries.map(
          (service) =>
            String(
              service.dayLabel ||
              'Event',
            ).trim() ||
            'Event',
        ),
      ),
    );

  function serviceDate(
    service: {
      serviceKey: string;
      dayLabel?: string;
      mealLabel?: string;
    },
  ) {
    const explicit =
      formatMenuDate(
        service.dayLabel ||
        '',
      ) ||
      formatMenuDate(
        service.mealLabel ||
        '',
      );

    if (explicit) {
      return explicit;
    }

    const dayKey =
      String(
        service.dayLabel ||
        'Event',
      ).trim() ||
      'Event';

    const dayIndex =
      serviceDayKeys.indexOf(
        dayKey,
      );

    if (
      dayIndex >= 0 &&
      rawMenuDates[
        dayIndex
      ]
    ) {
      return rawMenuDates[
        dayIndex
      ];
    }

    if (
      serviceDayKeys.length <=
      1
    ) {
      return (
        formatMenuDate(
          work?.event.eventDate ||
          '',
        ) ||
        rawMenuDates[0] ||
        ''
      );
    }

    return '';
  }

  const serviceDateByKey =
    new Map(
      result.serviceSummaries.map(
        (service) => [
          service.serviceKey,
          serviceDate(
            service,
          ),
        ],
      ),
    );

  const selectedAddServiceKey =
    newDishServiceKey ||
    result.serviceSummaries[
      0
    ]?.serviceKey ||
    '';

  const quickCatalogByName = new Map<string, AvailableDish>();
  availableDishes.forEach((dish) => {
    quickCatalogByName.set(normalizeDishName(dish.name), dish);
    (dish.aliases || []).forEach((alias) => {
      const key = normalizeDishName(alias);
      if (key && !quickCatalogByName.has(key)) quickCatalogByName.set(key, dish);
    });
  });

  const quickRequestedNames = Array.from(
    new Map(
      quickDishNames
        .split(/[\n,;]+/)
        .map((name) => name.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .map((name) => [normalizeDishName(name), name]),
    ).values(),
  );
  const quickExistingNames = new Set(
    work.menu
      .filter((item) => getMenuServiceKey(item) === selectedAddServiceKey)
      .map((item) => normalizeDishName(item.name)),
  );
  const quickPreview = quickRequestedNames.map((requestedName) => {
    const catalogDish = quickCatalogByName.get(normalizeDishName(requestedName));
    const canonicalName = catalogDish?.name || requestedName;
    return {
      requestedName,
      canonicalName,
      category: catalogDish?.category || newDishCategory,
      rate: Math.max(0, Number(catalogDish?.rate) || 0),
      status: quickExistingNames.has(normalizeDishName(canonicalName))
        ? 'duplicate' as const
        : catalogDish
          ? 'saved' as const
          : 'new' as const,
    };
  });
  const quickPreviewCounts = quickPreview.reduce(
    (counts, item) => ({ ...counts, [item.status]: counts[item.status] + 1 }),
    { saved: 0, new: 0, duplicate: 0 },
  );
  const quickActiveQuery = normalizeDishName(
    quickDishNames.split(/[\n,;]+/).at(-1) || '',
  );
  const quickSuggestions = quickActiveQuery.length >= 2
    ? availableDishes
        .filter((dish) => {
          const names = [dish.name, ...(dish.aliases || [])].map(normalizeDishName);
          return names.some((name) => name.includes(quickActiveQuery)) &&
            !names.some((name) => name === quickActiveQuery) &&
            !quickExistingNames.has(normalizeDishName(dish.name));
        })
        .sort((left, right) => {
          const leftStarts = normalizeDishName(left.name).startsWith(quickActiveQuery) ? 0 : 1;
          const rightStarts = normalizeDishName(right.name).startsWith(quickActiveQuery) ? 0 : 1;
          return leftStarts - rightStarts || left.name.localeCompare(right.name);
        })
        .slice(0, 6)
    : [];
  const normalizedBrowserQuery = normalizeDishName(dishBrowserQuery);
  const browsableDishes = availableDishes
    .filter((dish) =>
      (dishBrowserCategory === 'ALL' || dish.category === dishBrowserCategory) &&
      (!normalizedBrowserQuery ||
        [dish.name, ...(dish.aliases || [])]
          .some((name) => normalizeDishName(name).includes(normalizedBrowserQuery))) &&
      !quickExistingNames.has(normalizeDishName(dish.name)),
    )
    .sort((left, right) => left.name.localeCompare(right.name))
    .slice(0, 60);

  const missingRateCount = work.menu.filter(
    needsManualRate,
  ).length;
  const manualRateFilterActive =
    dishStatusFilter === 'MISSING' &&
    missingRateCount > 0;

  const costedDishCount =
    Math.max(
      0,
      work.menu.length -
        missingRateCount,
    );
  const normalizedDishQuery = deferredDishQuery.trim().toLocaleLowerCase('en-IN');
  const filteredDishCosts = sortMenuItemsByCategoryPriority(
    result.menuBreakdown.filter((item) => {
      const matchesSearch = !normalizedDishQuery ||
        item.name.toLocaleLowerCase('en-IN').includes(normalizedDishQuery) ||
        item.category.toLocaleLowerCase('en-IN').includes(normalizedDishQuery);
      const matchesService = dishServiceFilter === 'ALL' || item.serviceKey === dishServiceFilter;
      const matchesCategory = dishCategoryFilter === 'ALL' || item.category === dishCategoryFilter;
      const matchesRateStatus =
        dishStatusFilter === 'ALL'
          ? true
          : dishStatusFilter === 'MISSING'
            ? needsManualRate(item)
            : !needsManualRate(item);
      return matchesSearch && matchesService && matchesCategory && matchesRateStatus;
    }),
  );
  const dishCategoryGroups = filteredDishCosts.reduce<
    Array<{
      key: string;
      category: string;
      serviceKey: string;
      mealLabel: string;
      dayLabel: string;
      items: (typeof filteredDishCosts)[number][];
      subtotal: number;
      missingCount: number;
      targetPercent: number;
      recommendedPercent: number;
      pax: number;
    }>
  >((groups, item) => {
    const key = `${item.serviceKey}::${item.category}`;
    const current = groups[groups.length - 1];

    if (current?.key === key) {
      current.items.push(item);
      current.subtotal += Number(item.itemTotalCost) || 0;
      if (needsManualRate(item)) current.missingCount += 1;
      return groups;
    }

    groups.push({
      key,
      category: item.category,
      serviceKey: item.serviceKey,
      mealLabel: item.mealLabel || 'Event Menu',
      dayLabel: item.dayLabel || '',
      items: [item],
      subtotal: Number(item.itemTotalCost) || 0,
      missingCount: needsManualRate(item) ? 1 : 0,
      targetPercent: Number.isFinite(Number(item.categoryPortionPercent))
        ? Math.min(
            300,
            Math.max(0, Number(item.categoryPortionPercent)),
          )
        : 100,
      recommendedPercent: recommendCategoryConsumptionPercent({
        category: item.category,
        mealLabel: item.mealLabel,
        pax: item.effectivePax,
      }),
      pax: item.effectivePax,
    });

    return groups;
  }, []);

  function toggleDishCategoryGroup(key: string) {
    setCollapsedDishGroups((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  const hasWeddingServices =
    result.serviceSummaries.length > 1 ||
    result.serviceSummaries.some(
      (service) => service.serviceId !== 'default',
    );

  function persist(next: WorkState) {
    if (!session) return;
    setWork(next);
    saveWork(session.tenantId, next);
  }

  function chooseQuickDish(dish: AvailableDish) {
    const match = quickDishNames.match(/^([\s\S]*?[\n,;]\s*)?([^\n,;]*)$/);
    const prefix = match?.[1] || '';
    setQuickDishNames(`${prefix}${dish.name}\n`);
    setQuickAddMessage('');
  }

  function appendBrowsedDish(dish: AvailableDish) {
    const selected = new Set(quickRequestedNames.map(normalizeDishName));
    if (selected.has(normalizeDishName(dish.name))) return;
    setQuickDishNames((current) => `${current.trimEnd()}${current.trim() ? '\n' : ''}${dish.name}\n`);
    setQuickAddMessage('');
  }

  function addMissingCostDishes() {
    if (!work || !result) return;

    const requestedNames = quickRequestedNames;

    if (!requestedNames.length) {
      setQuickAddMessage('Type at least one dish name.');
      return;
    }

    const targetServiceKey = selectedAddServiceKey || 'default';
    const targetService = result.serviceSummaries.find(
      (service) => service.serviceKey === targetServiceKey,
    );
    const targetTemplate = work.menu.find(
      (item) => getMenuServiceKey(item) === targetServiceKey,
    );
    const existingNames = new Set(
      work.menu
        .filter((item) => getMenuServiceKey(item) === targetServiceKey)
        .map((item) => normalizeDishName(item.name)),
    );
    const namesToAdd = requestedNames.filter(
      (name) => {
        const catalogDish = quickCatalogByName.get(normalizeDishName(name));
        return !existingNames.has(normalizeDishName(catalogDish?.name || name));
      },
    );
    const skippedCount = requestedNames.length - namesToAdd.length;

    if (!namesToAdd.length) {
      setQuickAddMessage('Those dishes are already in this meal.');
      return;
    }

    const matchedDishes = namesToAdd.map((requestedName) => ({
      requestedName,
      catalogDish: quickCatalogByName.get(normalizeDishName(requestedName)),
    }));
    const now = Date.now();
    const additions: WorkState['menu'] = matchedDishes.map(
      ({ requestedName, catalogDish }, index) => {
        const savedRate = Math.max(0, Number(catalogDish?.rate) || 0);
        const servingQuantity = Math.max(
          0.01,
          Number(catalogDish?.servingQuantity) || 1,
        );
        const hasSavedRate = savedRate > 0;

        return {
          id: `dish_${now}_${index}_${Math.random().toString(36).slice(2, 7)}`,
          name: catalogDish?.name || requestedName,
          category: catalogDish?.category || newDishCategory,
          costPerPlate: savedRate,
          portionQuantity: servingQuantity,
          portionBaseQuantity: servingQuantity,
          portionUnit: catalogDish?.servingUnit || 'serving',
          pieceWeightGrams: catalogDish?.pieceWeightGrams,
          gasKgPer100: catalogDish?.gasKgPer100,
          portionMode: 'AUTO',
          serviceId: targetTemplate?.serviceId,
          dayLabel: targetService?.dayLabel || targetTemplate?.dayLabel,
          mealLabel: targetService?.mealLabel || targetTemplate?.mealLabel || 'Event Menu',
          servicePax:
            Number(targetService?.pax) ||
            Number(targetTemplate?.servicePax) ||
            Number(work.event.pax) ||
            0,
          costSource: catalogDish ? 'catalog' : 'manual',
          coverageStatus: hasSavedRate ? 'COSTED' : 'NEW_DISH_PENDING',
          costQualityStatus: hasSavedRate ? 'READY' : undefined,
          costConfidence: hasSavedRate ? 100 : 0,
          rateCoveragePercent: hasSavedRate ? 100 : 0,
          coverageReason: hasSavedRate
            ? 'Matched saved Dish Master rate during quick add'
            : 'Manual rate required',
          costApprovalStatus: hasSavedRate ? 'NOT_REQUIRED' : 'PENDING',
          costApprovalReason: hasSavedRate
            ? 'Saved Dish Master rate'
            : 'Manual rate required',
          detectionSource: catalogDish ? 'catalog' : 'manual',
          detectionConfidence: 100,
          detectionReason: catalogDish
            ? 'Matched existing Dish Master item during quick add'
            : 'User quickly added missing dish on Cost page',
        };
      },
    );

    persist({ ...work, menu: [...work.menu, ...additions] });
    setQuickDishNames('');
    setDishQuery('');
    setDishServiceFilter('ALL');
    setDishCategoryFilter('ALL');
    const databaseMatchCount = matchedDishes.filter(({ catalogDish }) => catalogDish).length;
    const newDishCount = additions.length - databaseMatchCount;
    setDishStatusFilter(newDishCount > 0 ? 'MISSING' : 'ALL');
    setQuickAddMessage(
      `${additions.length} ${additions.length === 1 ? 'dish' : 'dishes'} added${
        databaseMatchCount ? ` · ${databaseMatchCount} matched Dish Master` : ''
      }${skippedCount ? ` · ${skippedCount} already existed` : ''}${
        newDishCount ? ` · add rates for ${newDishCount} new` : ''
      }.`,
    );

    const genuinelyNewNames = matchedDishes
      .filter(({ catalogDish }) => !catalogDish)
      .map(({ requestedName }) => requestedName);

    if (genuinelyNewNames.length) {
      void fetch('/api/dish-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceFileName: 'Quick added from Cost page',
          candidates: genuinelyNewNames.map((name) => ({
            name,
            categoryHint: newDishCategory,
          })),
        }),
      }).catch((suggestionError) =>
        console.warn('Quick dish suggestions skipped:', suggestionError),
      );
    }
  }

  function updateDishCost(id: string, value: number) {
    if (!work) return;
    const rate = Math.max(0, value);

    persist({
      ...work,
      menu: work.menu.map((item) =>
        item.id === id
          ? {
              ...item,
              costPerPlate: rate,
              costSource: 'manual',
              coverageStatus: rate > 0 ? 'COSTED' : 'UNRESOLVED',
              costQualityStatus: rate > 0 ? 'READY' : undefined,
              costConfidence: rate > 0 ? 100 : 0,
              rateCoveragePercent: rate > 0 ? 100 : 0,
              coverageReason:
                rate > 0
                  ? 'Manual rate added on Cost page'
                  : 'Manual rate required',
              costApprovalStatus: rate > 0 ? 'APPROVED' : 'PENDING',
              costApprovedAt: rate > 0 ? new Date().toISOString() : undefined,
              costApprovalReason:
                rate > 0
                  ? 'User manually entered this dish rate'
                  : 'Manual rate required',
            }
          : item,
      ),
    });
  }

  function updateDishServing(
    id: string,
    patch: {
      portionQuantity?: number;
      portionUnit?: string;
      pieceWeightGrams?: number;
    },
  ) {
    if (!work) return;

    persist({
      ...work,

      menu: work.menu.map((item) => {
        if (item.id !== id) {
          return item;
        }

        /*
         * The first time quantity is edited, remember the
         * original quantity. Future quantity changes then
         * scale cost from this baseline.
         */
        const baseQuantity =
          Number(item.portionBaseQuantity) > 0
            ? Number(item.portionBaseQuantity)
            : Math.max(
                0.01,
                Number(item.portionQuantity) || 1,
              );

        const nextUnit =
          patch.portionUnit ??
          item.portionUnit ??
          'serving';

        return {
          ...item,

          ...patch,

          portionBaseQuantity:
            baseQuantity,

          portionQuantity:
            patch.portionQuantity !== undefined
              ? Math.max(
                  0.01,
                  Number(patch.portionQuantity) || 0.01,
                )
              : item.portionQuantity,

          portionUnit:
            nextUnit,

          pieceWeightGrams:
            nextUnit === 'piece'
              ? (
                  patch.pieceWeightGrams !== undefined
                    ? Math.max(
                        0,
                        Number(patch.pieceWeightGrams) || 0,
                      )
                    : item.pieceWeightGrams
                )
              : undefined,

          portionManuallyEdited:
            true,
        };
      }),
    });
  }

  function updateDishCategory(
    id: string,
    category: Category,
  ) {
    if (!work) return;

    persist({
      ...work,
      menu: work.menu.map((item) =>
        item.id === id
          ? {
              ...item,
              category,
              categoryPortionPercent: undefined,
            }
          : item,
      ),
    });
  }

  function updateMealDetails(
    serviceKey: string,
    patch: Pick<WorkState['menu'][number], 'dayLabel' | 'mealLabel' | 'servicePax'>,
  ) {
    if (!work) return;

    persist({
      ...work,
      menu: work.menu.map((item) =>
        getMenuServiceKey(item) === serviceKey
          ? { ...item, ...patch }
          : item,
      ),
      manpower: work.manpower.map((row) =>
        row.serviceId && getMenuServiceKey(row) === serviceKey
          ? { ...row, ...patch }
          : row,
      ),
    });
  }

  function updateDishPortion(
    id: string,
    patch: Pick<WorkState['menu'][number], 'portionMode' | 'portionPercent'>,
  ) {
    if (!work) return;
    persist({
      ...work,
      menu: work.menu.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    });
  }

  function removeDish(id: string) {
    if (!work) return;
    const selectedDish = work.menu.find((item) => item.id === id);

    if (
      selectedDish &&
      !window.confirm(`Remove ${selectedDish.name} from this menu?`)
    ) {
      return;
    }

    persist({
      ...work,
      menu: work.menu.filter((item) => item.id !== id),
    });
  }

  const manpowerTotal =
    calculateManpowerCost(
      work.manpower,
    );
  const gasTotal =
    Math.max(
      0,
      Number(work.extras.gasFuel) || 0,
    );
  const transportTotal =
    Math.max(
      0,
      Number(work.extras.transport) || 0,
    );
  const disposableTotal =
    Math.max(
      0,
      Number(work.extras.disposable) || 0,
    );
  const otherTotal =
    Math.max(
      0,
      Number(work.extras.other) || 0,
    );
  const operationsTotal =
    gasTotal +
    transportTotal +
    disposableTotal +
    otherTotal;
  const foodShare =
    result.totalCost > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (result.menuFoodTotal /
              result.totalCost) *
              100,
          ),
        )
      : 0;

  return (
    <AppShell
      title="Dish Cost"
      subtitle="Review food cost, portions and dish rates before grocery planning"
      hidePageTitle
    >
      <section className="content-grid cost-command-page">
        <section className="cost-command-sheet" aria-labelledby="cost-command-title">
          <div className="cost-command-main">
            <div className="cost-command-heading">
              <span className="cost-command-step"><i aria-hidden="true">1</i> Event cost</span>
              <h2 id="cost-command-title">{work.event.eventName || 'Event cost summary'}</h2>
              <p>
                {work.event.clientName ? `${work.event.clientName} · ` : ''}
                {result.serviceSummaries.length} {result.serviceSummaries.length === 1 ? 'function' : 'functions'} · {result.totalCovers.toLocaleString('en-IN')} meal covers
              </p>

              <div className="cost-command-meta">
                <span>
                  {work.menu.length} dishes
                </span>
                <span className={missingRateCount > 0 ? 'attention' : 'ready'}>
                  {missingRateCount > 0
                    ? `${missingRateCount} rates missing`
                    : 'All rates ready'}
                </span>
                <span>
                  {money(result.menuCostPerPlate)} food / cover
                </span>
              </div>
            </div>

            <div className="cost-command-total">
              <span>Current event cost</span>
              <strong>{money(result.totalCost)}</strong>
              <small>{money(result.finalCostPerPlate)} average per cover</small>
            </div>

            <div className="cost-command-split" aria-label="Food and operating cost split">
              <div className="cost-command-split-bar">
                <span style={{ width: `${foodShare}%` }} />
              </div>
              <div>
                <span><i className="food" aria-hidden="true" /> Food <b>{money(result.menuFoodTotal)}</b></span>
                <span><i className="operations" aria-hidden="true" /> Team &amp; operations <b>{money(result.extrasTotal)}</b></span>
              </div>
            </div>

            <div className="cost-command-breakdown">
              <div><span>Food</span><b>{money(result.menuFoodTotal)}</b><small>{money(result.menuCostPerPlate)} / cover</small></div>
              <div><span>Manpower</span><b>{money(manpowerTotal)}</b><small>{work.manpower.filter((row) => Number(row.quantity) > 0).length} active roles</small></div>
              <div><span>Gas</span><b>{money(gasTotal)}</b><small>Automatic LPG costing</small></div>
              <div><span>Other operations</span><b>{money(operationsTotal - gasTotal)}</b><small>Transport, disposables &amp; other</small></div>
            </div>
          </div>

        </section>

        <section className="cost-function-sheet" aria-labelledby="function-cost-title">
          <div className="cost-function-heading">
            <div>
              <h2 id="function-cost-title">Function-wise food cost</h2>
              <p>Each function uses its own guest count and menu.</p>
            </div>
            <button type="button" onClick={() => router.push('/app/event?resume=1')}>Edit event menu</button>
          </div>

          <div className="cost-function-list">
            {result.serviceSummaries.map((service) => (
              <article className="cost-function-row" key={service.serviceKey}>
                <div className="cost-function-name">
                  <span>{service.dayLabel || serviceDateByKey.get(service.serviceKey) || 'Event'}</span>
                  <input
                    defaultValue={service.mealLabel}
                    placeholder="Function name"
                    aria-label={`Function name for ${service.dayLabel || 'event'}`}
                    onBlur={(event) => updateMealDetails(service.serviceKey, {
                      mealLabel: event.currentTarget.value.trim() || 'Event Menu',
                    })}
                    onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
                  />
                  {serviceDateByKey.get(service.serviceKey) ? <small>{serviceDateByKey.get(service.serviceKey)}</small> : null}
                </div>
                <label>
                  <span>Guests</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    defaultValue={service.pax}
                    aria-label={`Guests for ${service.mealLabel}`}
                    onBlur={(event) => updateMealDetails(service.serviceKey, {
                      servicePax: Math.max(0, Math.round(Number(event.currentTarget.value) || 0)),
                    })}
                    onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
                  />
                </label>
                <div><span>Dishes</span><b>{service.dishCount}</b></div>
                <div><span>Food / cover</span><b>{money(service.menuCostPerPlate)}</b></div>
                <div className="cost-function-total"><span>Food total</span><b>{money(service.totalCost)}</b></div>
              </article>
            ))}
          </div>
        </section>

        <div className="cost-desktop-workspace">
          <div className="glass-card dish-cost-panel">
          <div className="dish-cost-heading">
            <div>
              <span className="page-eyebrow">Food costing</span>
              <h2>Dish Cost Table</h2>
              <p className="muted">Review every dish and correct its base cost without leaving this page.</p>
            </div>
            <div className="dish-cost-heading-actions">
              <button
                className="ghost-button"
                type="button"
                onClick={() =>
                  router.push('/app/event?resume=1')
                }
              >
                + Import Function
              </button>
              <button
                className="primary-button"
                type="button"
                onClick={() =>
                  setShowAddDish(
                    (current) =>
                      !current,
                  )
                }
              >
                + Add missing dishes
              </button>
            </div>

            <div className="dish-cost-summary" aria-label="Dish cost summary">
              <span><b>{work.menu.length}</b> dishes</span>
              <span className={missingRateCount > 0 ? 'needs-attention' : 'is-complete'}>
                <b>{missingRateCount}</b> manual rates needed
              </span>
              <span><b>{money(result.menuFoodTotal)}</b> food total</span>
            </div>
          </div>
          {showAddDish ? (
            <div className="cost-add-dish-form">
              <div className="cost-add-dish-head">
                <div>
                  <span className="page-eyebrow">
                    Quick add
                  </span>

                  <h3>
                    Add missing dishes
                  </h3>

                  <p className="muted">
                    Paste a list or type dish names separated by commas. Saved Dish Master details fill automatically.
                  </p>
                </div>

                <button
                  className="ghost-button"
                  type="button"
                  onClick={() =>
                    setShowAddDish(
                      false,
                    )
                  }
                >
                  Close
                </button>
              </div>

              <div className="cost-browser-bar">
                <div>
                  <b>Select from Dish Master</b>
                  <span>Search and tap dishes to build the list faster.</span>
                </div>
                <button
                  className="ghost-button"
                  type="button"
                  aria-expanded={showDishBrowser}
                  onClick={() => setShowDishBrowser((current) => !current)}
                >
                  {showDishBrowser ? 'Hide dishes' : 'Browse saved dishes'}
                </button>
              </div>

              {showDishBrowser ? (
                <div className="cost-dish-browser">
                  <div className="cost-dish-browser-tools">
                    <label>
                      <span>Search Dish Master</span>
                      <input
                        className="input"
                        type="search"
                        value={dishBrowserQuery}
                        onChange={(event) => setDishBrowserQuery(event.target.value)}
                        placeholder="Search paneer, sweet, soup…"
                        autoFocus
                      />
                    </label>
                    <label>
                      <span>Category</span>
                      <select
                        className="select"
                        value={dishBrowserCategory}
                        onChange={(event) => setDishBrowserCategory(event.target.value)}
                      >
                        <option value="ALL">All categories</option>
                        {availableDishCategories.map((category) => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="cost-dish-browser-results" aria-live="polite">
                    {browsableDishes.map((dish) => {
                      const selected = quickRequestedNames.some(
                        (name) => normalizeDishName(name) === normalizeDishName(dish.name),
                      );
                      return (
                        <button
                          type="button"
                          className={selected ? 'selected' : ''}
                          key={dish.name}
                          onClick={() => appendBrowsedDish(dish)}
                          disabled={selected}
                        >
                          <span><b>{dish.name}</b><small>{dish.category}</small></span>
                          <span><strong>{money(dish.rate)}</strong><i aria-hidden="true">{selected ? '✓' : '+'}</i></span>
                        </button>
                      );
                    })}
                    {!browsableDishes.length ? (
                      <p>No saved dishes match this search.</p>
                    ) : null}
                  </div>
                  {browsableDishes.length === 60 ? (
                    <small className="muted">Showing the first 60 matches. Search to narrow the list.</small>
                  ) : null}
                </div>
              ) : null}

              <div className="cost-quick-add">
                <div className="field cost-quick-add-names">
                  <label htmlFor="quickDishNames">Dish names</label>
                  <textarea
                    id="quickDishNames"
                    className="input"
                    value={quickDishNames}
                    onChange={(event) => {
                      setQuickDishNames(event.target.value);
                      setQuickAddMessage('');
                    }}
                    onKeyDown={(event) => {
                      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                        event.preventDefault();
                        addMissingCostDishes();
                      }
                    }}
                    placeholder={'Kaju Curry\nPaneer Tikka\nFruit Custard'}
                    rows={4}
                    autoFocus
                  />
                  {quickSuggestions.length ? (
                    <div className="cost-quick-suggestions" role="listbox" aria-label="Dish Master suggestions">
                      {quickSuggestions.map((dish) => (
                        <button
                          key={dish.name}
                          type="button"
                          role="option"
                          aria-selected="false"
                          onClick={() => chooseQuickDish(dish)}
                        >
                          <span><b>{dish.name}</b><small>{dish.category}</small></span>
                          <strong>{money(dish.rate)}</strong>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <small className="muted">One per line, or separate with commas · Ctrl/⌘ + Enter to add</small>

                  {quickPreview.length ? (
                    <div className="cost-quick-preview" aria-live="polite">
                      <div className="cost-quick-preview-summary">
                        <span className="saved"><b>{quickPreviewCounts.saved}</b> saved</span>
                        <span className="new"><b>{quickPreviewCounts.new}</b> new</span>
                        <span className="duplicate"><b>{quickPreviewCounts.duplicate}</b> already added</span>
                      </div>
                      <div className="cost-quick-preview-list">
                        {quickPreview.slice(0, 8).map((item) => (
                          <span className={item.status} key={normalizeDishName(item.requestedName)}>
                            <b>{item.canonicalName}</b>
                            <small>
                              {item.status === 'saved'
                                ? `${item.category} · ${money(item.rate)}`
                                : item.status === 'duplicate'
                                  ? 'Already in this meal'
                                  : `${item.category} · rate needed`}
                            </small>
                          </span>
                        ))}
                        {quickPreview.length > 8 ? <em>+{quickPreview.length - 8} more</em> : null}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="cost-quick-add-options">
                  <div className="field">
                    <label htmlFor="quickDishMeal">Add to meal</label>
                    <select
                      id="quickDishMeal"
                      className="select"
                      value={selectedAddServiceKey}
                      onChange={(event) => setNewDishServiceKey(event.target.value)}
                    >
                      {result.serviceSummaries.map((service) => (
                        <option key={service.serviceKey} value={service.serviceKey}>
                          {service.dayLabel ? `${service.dayLabel} · ` : ''}{service.mealLabel}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="quickDishCategory">Category</label>
                    <select
                      id="quickDishCategory"
                      className="select"
                      value={newDishCategory}
                      onChange={(event) => setNewDishCategory(event.target.value as Category)}
                    >
                      {availableDishCategories.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    className="primary-button cost-quick-add-button"
                    type="button"
                    onClick={addMissingCostDishes}
                  >
                    Add all dishes
                  </button>
                </div>
              </div>

              {quickAddMessage ? (
                <p className="cost-quick-add-message" role="status">{quickAddMessage}</p>
              ) : null}

            </div>
          ) : null}

          {missingRateCount > 0 ? (
            <div className="dish-manual-rate-alert" role="status">
              <div>
                <b>{missingRateCount} detected dish{missingRateCount === 1 ? '' : 'es'} need manual rates</b>
                <span>These dishes were not found in Dish Master or do not have a trusted rate. Review any estimate and enter your rate.</span>
              </div>
              <button
                className="ghost-button"
                type="button"
                aria-pressed={manualRateFilterActive}
                onClick={() => setDishStatusFilter(manualRateFilterActive ? 'ALL' : 'MISSING')}
              >
                {manualRateFilterActive ? 'Show all dishes' : 'Add manual rates'}
              </button>
            </div>
          ) : null}

          {work.menu.length > 0 ? (
            <div className="dish-cost-status-tabs no-print" aria-label="Dish cost status filters">
              <button
                type="button"
                className={dishStatusFilter === 'ALL' ? 'active' : ''}
                aria-pressed={dishStatusFilter === 'ALL'}
                onClick={() => setDishStatusFilter('ALL')}
              >
                <span>All dishes</span>
                <b>{work.menu.length}</b>
              </button>
              <button
                type="button"
                className={dishStatusFilter === 'MISSING' ? 'active attention' : 'attention'}
                aria-pressed={dishStatusFilter === 'MISSING'}
                onClick={() => setDishStatusFilter('MISSING')}
              >
                <span>Missing rate</span>
                <b>{missingRateCount}</b>
              </button>
              <button
                type="button"
                className={dishStatusFilter === 'COSTED' ? 'active ready' : 'ready'}
                aria-pressed={dishStatusFilter === 'COSTED'}
                onClick={() => setDishStatusFilter('COSTED')}
              >
                <span>Costed</span>
                <b>{costedDishCount}</b>
              </button>
            </div>
          ) : null}

          {work.menu.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon" aria-hidden="true">🍽️</div>
              <div>
                <h3>Add dishes to calculate food cost</h3>
                <p>Paste or type the event menu, review the detected dishes, then return here for the complete cost.</p>
              </div>
              <button className="primary-button" type="button" onClick={() => router.push('/app/event?resume=1')}>Open Event</button>
            </div>
          ) : (
            <>
              <div className="dish-cost-toolbar">
                <div className="field">
                  <label htmlFor="dishCostSearch">Find a dish</label>
                  <input
                    id="dishCostSearch"
                    className="input"
                    type="search"
                    value={dishQuery}
                    onChange={(event) => setDishQuery(event.target.value)}
                    placeholder="Search dish or category"
                  />
                </div>
                <div className="field">
                  <label htmlFor="dishCostService">Meal</label>
                  <select id="dishCostService" className="select" value={dishServiceFilter} onChange={(event) => setDishServiceFilter(event.target.value)}>
                    <option value="ALL">All meals</option>
                    {dishServices.map(([serviceId, label]) => <option key={serviceId} value={serviceId}>{label}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="dishCostCategory">Category</label>
                  <select id="dishCostCategory" className="select" value={dishCategoryFilter} onChange={(event) => setDishCategoryFilter(event.target.value)}>
                    <option value="ALL">All categories</option>
                    {dishCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </div>
                <button className="ghost-button" type="button" onClick={() => router.push('/app/event?resume=1')}>Edit menu</button>
              </div>

              <div className="dish-portion-note dish-cost-index-guide">
                <div>
                  <b>How this index works</b>
                  <span>Dish allocation adjusts the base rate to the final per-plate cost for this event.</span>
                </div>
                <div className="dish-cost-index-formula" aria-label="Dish costing formula">
                  <span>Base rate</span>
                  <i>×</i>
                  <span>Allocation</span>
                  <i>=</i>
                  <strong>Final / plate</strong>
                  <i>×</i>
                  <span>Guests</span>
                  <i>=</i>
                  <strong>Event total</strong>
                </div>
              </div>

              {filteredDishCosts.length === 0 ? (
                <div className="dish-cost-empty">
                  <b>No matching dishes</b>
                  <span>Try a different search, meal, or category.</span>
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => {
                      setDishQuery('');
                      setDishServiceFilter('ALL');
                      setDishCategoryFilter('ALL');
                      setDishStatusFilter('ALL');
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <>
                  <div className="table-wrap dish-cost-table-wrap">
                    <table className="dish-cost-table">
                      <colgroup>
                        <col className="dish-cost-col-name" />
                        <col className="dish-cost-col-setup" />
                        <col className="dish-cost-col-members" />
                        <col className="dish-cost-col-rate" />
                        <col className="dish-cost-col-portion" />
                        <col className="dish-cost-col-result" />
                      </colgroup>
                      <thead>
                        <tr>
                          <th>Dish</th>
                          <th>Serving</th>
                          <th>Guests</th>
                          <th>Manual rate / plate</th>
                          <th>Allocation</th>
                          <th>Final cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dishCategoryGroups.map((group) => {
                          const collapsed = Boolean(collapsedDishGroups[group.key]);

                          return (
                            <Fragment key={group.key}>
                              <tr className="dish-category-section-row">
                                <td colSpan={6}>
                                  <div className="dish-category-section">
                                    <button
                                      className="dish-category-toggle"
                                      type="button"
                                      onClick={() => toggleDishCategoryGroup(group.key)}
                                      aria-expanded={!collapsed}
                                    >
                                      <span className="dish-category-chevron" aria-hidden="true">{collapsed ? '›' : '⌄'}</span>
                                      <span>
                                        <strong>{group.category}</strong>
                                        <small>{group.dayLabel ? `${group.dayLabel} · ` : ''}{group.mealLabel}</small>
                                      </span>
                                    </button>
                                    <div className="dish-category-total">
                                      <span>{group.pax.toLocaleString('en-IN')} guests · {group.items.length} dish{group.items.length === 1 ? '' : 'es'}</span>
                                      <strong>{money(group.subtotal)}</strong>
                                      <small>
                                        {group.pax > 0
                                          ? `${money(group.subtotal / group.pax)} / guest`
                                          : 'Category total'}
                                        {group.missingCount > 0
                                          ? ` · ${group.missingCount} rate${group.missingCount === 1 ? '' : 's'} missing`
                                          : ''}
                                      </small>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                              {!collapsed ? group.items.map((item) => (
                          <tr key={item.id} className={needsManualRate(item) ? 'dish-rate-missing' : ''}>
                            <td>
                              <div className="dish-cost-name">
                                <b>{item.name}</b>
                                <small>
                                  {item.mealLabel ? `${item.dayLabel ? `${item.dayLabel} • ` : ''}${item.mealLabel}` : 'Event Menu'}
                                  {serviceDateByKey.get(item.serviceKey)
                                    ? ` • ${serviceDateByKey.get(item.serviceKey)}`
                                    : ''}
                                  {item.costSource === 'ai_recipe'
                                    ? ' • AI recipe estimate'
                                    : item.costSource === 'category_estimate'
                                      ? ' • Category estimate — review recommended'
                                      : ''}
                                </small>
                                <button
                                  className="dish-cost-inline-remove"
                                  type="button"
                                  onClick={() => removeDish(item.id)}
                                  aria-label={`Remove ${item.name} from menu`}
                                >
                                  Remove dish
                                </button>
                              </div>
                            </td>
                            <td>
                              <div className="dish-cost-setup">
                                <label>
                                  <span>Category</span>
                                  <select
                                    className="select dish-category-select"
                                    value={item.category}
                                    aria-label={`Category for ${item.name}`}
                                    onChange={(event) =>
                                      updateDishCategory(
                                        item.id,
                                        event.target.value as Category,
                                      )
                                    }
                                  >
                                    {availableDishCategories.map((category) => (
                                      <option key={category} value={category}>{category}</option>
                                    ))}
                                  </select>
                                </label>

                                <label>
                                  <span>Serving</span>
                                  <div className="dish-cost-serving-fields">
                                  <input
                                    className="input"
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    inputMode="decimal"
                                    aria-label={`Serving quantity for ${item.name}`}
                                    value={
                                      item.portionQuantity ??
                                      1
                                    }
                                    onChange={(event) =>
                                      updateDishServing(
                                        item.id,
                                        {
                                          portionQuantity:
                                            Math.max(
                                              0.01,
                                              Number(
                                                event.target.value,
                                              ) || 0.01,
                                            ),
                                        },
                                      )
                                    }
                                  />

                                  <select
                                    className="select"
                                    aria-label={`Serving unit for ${item.name}`}
                                    value={
                                      item.portionUnit ||
                                      'serving'
                                    }
                                    onChange={(event) =>
                                      updateDishServing(
                                        item.id,
                                        {
                                          portionUnit:
                                            event.target.value,
                                        },
                                      )
                                    }
                                  >
                                    <option value="serving">
                                      serving
                                    </option>

                                    <option value="piece">
                                      piece
                                    </option>

                                    <option value="g">
                                      g
                                    </option>

                                    <option value="ml">
                                      ml
                                    </option>
                                  </select>
                                  </div>
                                </label>

                                {(item.portionUnit || '').toLowerCase() ===
                                'piece' ? (
                                  <>
                                    <label
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        fontSize: 10,
                                      }}
                                    >
                                      <input
                                        className="input"
                                        style={{
                                          width: 76,
                                        }}
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        inputMode="decimal"
                                        value={
                                          item.pieceWeightGrams ??
                                          ''
                                        }
                                        onChange={(event) =>
                                          updateDishServing(
                                            item.id,
                                            {
                                              pieceWeightGrams:
                                                Math.max(
                                                  0,
                                                  Number(
                                                    event.target.value,
                                                  ) || 0,
                                                ),
                                            },
                                          )
                                        }
                                        placeholder="35"
                                        aria-label={`Weight per piece for ${item.name}`}
                                      />

                                      <span>g / pc</span>
                                    </label>

                                    {Number(
                                      item.pieceWeightGrams,
                                    ) > 0 ? (
                                      <small className="muted">
                                        ≈{' '}
                                        {(
                                          Number(
                                            item.portionQuantity,
                                          ) *
                                          Number(
                                            item.pieceWeightGrams,
                                          )
                                        ).toFixed(0)}{' '}
                                        g total
                                      </small>
                                    ) : null}
                                  </>
                                ) : null}
                              </div>
                            </td>
                            <td className="dish-cost-number">{item.effectivePax.toLocaleString('en-IN')}</td>
                            <td>
                              <span className="dish-manual-rate-label">
                                Manual rate / plate
                              </span>
                              <label className="dish-rate-input">
                                <span aria-hidden="true">₹</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  inputMode="decimal"
                                  value={item.baseCostPerPlate}
                                  placeholder="0"
                                  aria-label={`Manual rate per plate for ${item.name}`}
                                  onFocus={(event) => {
                                    if (needsManualRate(item)) event.currentTarget.select();
                                  }}
                                  onChange={(event) => updateDishCost(item.id, Number(event.target.value))}
                                />
                              </label>
                              <small className="muted">
                                {item.costSource === 'manual'
                                  ? 'Manual rate active'
                                  : 'Edit to override calculated / saved rate'}
                              </small>
                            </td>
                            <td>
                              <div className="cost-portion-control">
                                <select
                                  className="select"
                                  aria-label={`Cost portion allocation for ${item.name}`}
                                  value={item.portionMode}
                                  onChange={(event) => {
                                    const mode = event.target.value as 'AUTO' | 'CUSTOM';
                                    updateDishPortion(item.id, {
                                      portionMode: mode,
                                      portionPercent:
                                        mode === 'CUSTOM'
                                          ? item.portionPercent
                                          : undefined,
                                    });
                                  }}
                                >
                                  <option value="AUTO">Auto split</option>
                                  <option value="CUSTOM">Custom</option>
                                </select>
                                {item.portionMode === 'CUSTOM' ? (
                                  <label className="portion-percent-input compact">
                                    <input
                                      type="number"
                                      min="0"
                                      max="300"
                                      step="1"
                                      value={item.portionPercent}
                                      onChange={(event) =>
                                        updateDishPortion(item.id, {
                                          portionMode: 'CUSTOM',
                                          portionPercent: Math.min(
                                            300,
                                            Math.max(0, Number(event.target.value) || 0),
                                          ),
                                        })
                                      }
                                    />
                                    <span>%</span>
                                  </label>
                                ) : (
                                  <span className="portion-chip">{Math.round(item.portionPercent * 100) / 100}%</span>
                                )}
                              </div>
                            </td>
                            <td className="dish-cost-number">
                              <div className="dish-cost-result">
                                <span>
                                  <small>Final / plate</small>
                                  <b>{money(item.adjustedCostPerPlate)}</b>
                                </span>
                                <span>
                                  <small>Event total</small>
                                  <strong className="dish-total-cost">{money(item.itemTotalCost)}</strong>
                                </span>
                              </div>
                            </td>
                          </tr>
                              )) : null}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="dish-cost-cards">
                    {dishCategoryGroups.map((group) => {
                      const collapsed = Boolean(collapsedDishGroups[group.key]);

                      return (
                        <section key={group.key} className="dish-cost-category-group">
                          <div className="dish-cost-category-card-head">
                            <button
                              className="dish-cost-category-card-toggle"
                              type="button"
                              onClick={() => toggleDishCategoryGroup(group.key)}
                              aria-expanded={!collapsed}
                            >
                              <span className="dish-category-chevron" aria-hidden="true">{collapsed ? '›' : '⌄'}</span>
                              <strong>{group.category}</strong>
                              <strong>{money(group.subtotal)}</strong>
                            </button>
                            <small className="dish-cost-category-card-meta">
                              {group.dayLabel ? `${group.dayLabel} • ` : ''}{group.mealLabel} · {group.items.length} dish{group.items.length === 1 ? '' : 'es'}
                              {group.missingCount > 0 ? ` · ${group.missingCount} rate${group.missingCount === 1 ? '' : 's'} missing` : ''}
                            </small>
                            <small className="dish-cost-category-card-meta">
                              {group.pax.toLocaleString('en-IN')} guests
                            </small>
                          </div>
                          {!collapsed ? group.items.map((item) => (
                      <article className={`dish-cost-card ${needsManualRate(item) ? 'dish-rate-missing' : ''}`} key={item.id}>
                        <div className="dish-cost-card-heading">
                          <div className="dish-cost-name">
                            <b>{item.name}</b>
                            <small>{item.mealLabel ? `${item.dayLabel ? `${item.dayLabel} • ` : ''}${item.mealLabel}` : 'Event Menu'}
                                  {serviceDateByKey.get(item.serviceKey)
                                    ? ` • ${serviceDateByKey.get(item.serviceKey)}`
                                    : ''}</small>
                          </div>
                          <select
                            className="select dish-category-select"
                            value={item.category}
                            aria-label={`Category for ${item.name}`}
                            onChange={(event) =>
                              updateDishCategory(
                                item.id,
                                event.target.value as Category,
                              )
                            }
                          >
                            {availableDishCategories.map((category) => (
                              <option key={category} value={category}>{category}</option>
                            ))}
                          </select>
                        </div>
                        <div className="dish-cost-card-serving">
                          <span>Serving quantity</span>
                          <div>
                            <input
                              className="input"
                              type="number"
                              min="0.01"
                              step="0.01"
                              inputMode="decimal"
                              aria-label={`Serving quantity for ${item.name}`}
                              value={item.portionQuantity ?? 1}
                              onChange={(event) =>
                                updateDishServing(item.id, {
                                  portionQuantity: Math.max(
                                    0.01,
                                    Number(event.target.value) || 0.01,
                                  ),
                                })
                              }
                            />
                            <select
                              className="select"
                              aria-label={`Serving unit for ${item.name}`}
                              value={item.portionUnit || 'serving'}
                              onChange={(event) =>
                                updateDishServing(item.id, {
                                  portionUnit: event.target.value,
                                })
                              }
                            >
                              <option value="serving">serving</option>
                              <option value="piece">piece</option>
                              <option value="g">g</option>
                              <option value="ml">ml</option>
                            </select>
                          </div>
                          {(item.portionUnit || '').toLowerCase() === 'piece' ? (
                            <label>
                              <input
                                className="input"
                                type="number"
                                min="0"
                                step="0.1"
                                inputMode="decimal"
                                value={item.pieceWeightGrams ?? ''}
                                onChange={(event) =>
                                  updateDishServing(item.id, {
                                    pieceWeightGrams: Math.max(
                                      0,
                                      Number(event.target.value) || 0,
                                    ),
                                  })
                                }
                                placeholder="35"
                                aria-label={`Weight per piece for ${item.name}`}
                              />
                              <span>grams per piece</span>
                            </label>
                          ) : null}
                        </div>
                        <div className="dish-cost-card-grid">
                          <div><small>Guests</small><b>{item.effectivePax.toLocaleString('en-IN')}</b></div>
                          <div><small>Allocation</small><b>{Math.round(item.portionPercent * 100) / 100}%</b></div>
                          <div><small>Final / plate</small><b>{money(item.adjustedCostPerPlate)}</b></div>
                          <div className="dish-cost-card-total"><small>Event total</small><b>{money(item.itemTotalCost)}</b></div>
                        </div>
                        <div className="field">
                          <label htmlFor={`mobile-portion-mode-${item.id}`}>
                            Allocation mode
                          </label>

                          <div className="cost-portion-control">
                            <select
                              id={`mobile-portion-mode-${item.id}`}
                              className="select"
                              value={item.portionMode}
                              aria-label={`Portion allocation for ${item.name}`}
                              onChange={(event) => {
                                const mode = event.target.value as
                                  | 'AUTO'
                                  | 'CUSTOM';

                                updateDishPortion(item.id, {
                                  portionMode: mode,
                                  portionPercent:
                                    mode === 'CUSTOM'
                                      ? item.portionPercent
                                      : undefined,
                                });
                              }}
                            >
                              <option value="AUTO">
                                Automatic portion
                              </option>
                              <option value="CUSTOM">
                                Custom portion
                              </option>
                            </select>

                            {item.portionMode === 'CUSTOM' ? (
                              <label className="portion-percent-input compact">
                                <input
                                  type="number"
                                  min="0"
                                  max="300"
                                  step="1"
                                  inputMode="decimal"
                                  value={item.portionPercent}
                                  aria-label={`Custom portion percentage for ${item.name}`}
                                  onChange={(event) =>
                                    updateDishPortion(item.id, {
                                      portionMode: 'CUSTOM',
                                      portionPercent: Math.min(
                                        300,
                                        Math.max(
                                          0,
                                          Number(event.target.value) || 0,
                                        ),
                                      ),
                                    })
                                  }
                                />
                                <span>%</span>
                              </label>
                            ) : (
                              <span className="portion-chip">
                                {item.categoryCount > 1
                                  ? `1/${item.categoryCount}`
                                  : 'Full'}
                              </span>
                            )}
                          </div>

                          <small className="muted">
                            50% charges half cost. 100% charges full cost.
                          </small>
                        </div>

                        <div className="field dish-cost-card-rate">
                          <label htmlFor={`mobile-rate-${item.id}`}>
                            Manual rate / plate
                          </label>
                          <label className="dish-rate-input" htmlFor={`mobile-rate-${item.id}`}>
                            <span aria-hidden="true">₹</span>
                            <input
                              id={`mobile-rate-${item.id}`}
                              type="number"
                              min="0"
                              step="0.01"
                              inputMode="decimal"
                              value={item.baseCostPerPlate}
                              placeholder="0"
                              onFocus={(event) => {
                                if (needsManualRate(item)) event.currentTarget.select();
                              }}
                              onChange={(event) => updateDishCost(item.id, Number(event.target.value))}
                            />
                          </label>
                          <small className="muted">
                            {item.costSource === 'manual'
                              ? 'Manual rate active for this event'
                              : 'Enter any rate to override the calculated / saved dish cost'}
                          </small>
                        </div>
                        <button
                          className="dish-remove-button dish-remove-button-mobile"
                          type="button"
                          onClick={() => removeDish(item.id)}
                        >
                          Remove dish
                        </button>
                      </article>
                          )) : null}
                        </section>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        </div>

        <div className="action-row page-actions">
          <button
            className="primary-button"
            type="button"
            onClick={() => window.location.assign('/app/grocery')}
          >
            Next: Grocery
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={() => router.push('/app/event?resume=1')}
          >
            Back to Event & Menu
          </button>
        </div>
      </section>
    </AppShell>
  );
}
