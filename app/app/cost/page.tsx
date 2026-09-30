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

  const [
    showAddDish,
    setShowAddDish,
  ] =
    useState(false);

  const [
    newDishName,
    setNewDishName,
  ] =
    useState('');

  const [quickDishNames, setQuickDishNames] = useState('');
  const [quickAddMessage, setQuickAddMessage] = useState('');

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

  const [
    newDishRate,
    setNewDishRate,
  ] =
    useState('');

  const [
    newDishServingQuantity,
    setNewDishServingQuantity,
  ] =
    useState('1');

  const [
    newDishServingUnit,
    setNewDishServingUnit,
  ] =
    useState('serving');

  const [
    newDishPieceWeight,
    setNewDishPieceWeight,
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
        const categories = Array.isArray(data.categories)
          ? Array.from(
              new Set(
                data.categories
                  .map((category: unknown) => String(category || '').trim())
                  .filter(Boolean),
              ),
            ) as string[]
          : [];
        setAvailableDishCategories(categories);
        if (categories.length) {
          setNewDishCategory((current) =>
            categories.includes(current) ? current : categories[0] as Category,
          );
        }
      })
      .catch(() => {
        if (active) setAvailableDishCategories([]);
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

  const selectedAddServiceDate =
    serviceDateByKey.get(
      selectedAddServiceKey,
    ) || '';

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

  function updateCategoryPortion(
    serviceKey: string,
    category: string,
    value: number,
  ) {
    if (!work) return;

    const targetPercent = Math.min(
      300,
      Math.max(0, Number(value) || 0),
    );

    persist({
      ...work,
      menu: work.menu.map((item) =>
        getMenuServiceKey(item) === serviceKey &&
        item.category === category
          ? {
              ...item,
              categoryPortionPercent: targetPercent,
            }
          : item,
      ),
    });
  }

  function applyAllCategoryRecommendations() {
    if (!work) return;

    persist({
      ...work,
      menu: work.menu.map((item) => ({
        ...item,
        categoryPortionPercent: recommendCategoryConsumptionPercent({
          category: item.category,
          mealLabel: item.mealLabel,
          pax: item.servicePax || work.event.pax,
        }),
      })),
    });
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

  function addNewCostDish() {
    if (!work || !result) {
      return;
    }

    const name =
      newDishName
        .replace(
          /\s+/g,
          ' ',
        )
        .trim();

    if (!name) {
      window.alert(
        'Enter dish name.',
      );

      return;
    }

    const targetServiceKey =
      selectedAddServiceKey ||
      'default';

    const targetService =
      result.serviceSummaries.find(
        (service) =>
          service.serviceKey ===
          targetServiceKey,
      );

    const targetTemplate =
      work.menu.find(
        (item) =>
          getMenuServiceKey(
            item,
          ) ===
          targetServiceKey,
      );

    const duplicate =
      work.menu.some(
        (item) =>
          getMenuServiceKey(
            item,
          ) ===
            targetServiceKey &&
          item.name
            .trim()
            .toLocaleLowerCase(
              'en-IN',
            ) ===
            name.toLocaleLowerCase(
              'en-IN',
            ),
      );

    if (duplicate) {
      window.alert(
        `${name} already exists in this meal.`,
      );

      return;
    }

    const rate =
      Math.max(
        0,
        Number(
          newDishRate,
        ) || 0,
      );

    const id =
      typeof crypto !==
        'undefined' &&
      typeof crypto.randomUUID ===
        'function'
        ? `dish_${crypto.randomUUID()}`
        : `dish_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 8)}`;

    const newItem:
      WorkState[
        'menu'
      ][number] = {
        id,

        name,

        category:
          newDishCategory,

        costPerPlate:
          rate,

        portionQuantity:
          Math.max(
            0.01,
            Number(newDishServingQuantity) || 1,
          ),

        /*
         * The quantity entered while creating the dish becomes
         * its costing baseline.
         *
         * Example:
         * 1 piece at ₹12 -> base quantity = 1.
         */
        portionBaseQuantity:
          Math.max(
            0.01,
            Number(newDishServingQuantity) || 1,
          ),

        portionUnit:
          newDishServingUnit || 'serving',

        pieceWeightGrams:
          newDishServingUnit === 'piece'
            ? Math.max(
                0,
                Number(newDishPieceWeight) || 0,
              ) || undefined
            : undefined,

        portionMode:
          'AUTO',

        serviceId:
          targetTemplate
            ?.serviceId,

        dayLabel:
          targetService
            ?.dayLabel ||
          targetTemplate
            ?.dayLabel,

        mealLabel:
          targetService
            ?.mealLabel ||
          targetTemplate
            ?.mealLabel ||
          'Event Menu',

        servicePax:
          Number(
            targetService?.pax,
          ) ||
          Number(
            targetTemplate
              ?.servicePax,
          ) ||
          Number(
            work.event.pax,
          ) ||
          0,

        costSource:
          'manual',

        coverageStatus:
          rate > 0
            ? 'COSTED'
            : 'NEW_DISH_PENDING',

        costQualityStatus:
          rate > 0
            ? 'READY'
            : undefined,

        costConfidence:
          rate > 0
            ? 100
            : 0,

        rateCoveragePercent:
          rate > 0
            ? 100
            : 0,

        coverageReason:
          rate > 0
            ? 'Manual dish and rate added on Cost page'
            : 'Manual rate required',

        costApprovalStatus:
          rate > 0
            ? 'APPROVED'
            : 'PENDING',

        costApprovedAt:
          rate > 0
            ? new Date()
                .toISOString()
            : undefined,

        costApprovalReason:
          rate > 0
            ? 'User manually entered this dish rate'
            : 'Manual rate required',

        detectionSource:
          'manual',

        detectionConfidence:
          100,

        detectionReason:
          'User manually added this dish on Cost page',
      };

    persist({
      ...work,

      menu: [
        ...work.menu,
        newItem,
      ],
    });

    /*
     * New manual dish should also be
     * available for Admin learning later.
     * Failure never blocks costing.
     */
    void fetch(
      '/api/dish-suggestions',
      {
        method:
          'POST',

        headers: {
          'Content-Type':
            'application/json',
        },

        body:
          JSON.stringify({
            sourceFileName:
              'Added from Cost page',

            candidates: [
              {
                name,

                categoryHint:
                  newDishCategory,
              },
            ],
          }),
      },
    ).catch(
      (suggestionError) =>
        console.warn(
          'New manual dish suggestion skipped:',
          suggestionError,
        ),
    );

    setDishQuery('');
    setDishServiceFilter(
      'ALL',
    );
    setDishCategoryFilter(
      'ALL',
    );

    setNewDishName('');
    setNewDishCategory(
      'Other',
    );
    setNewDishRate('');
    setNewDishServingQuantity('1');
    setNewDishServingUnit('serving');
    setNewDishPieceWeight('');
    setShowAddDish(
      false,
    );
  }

  function addMissingCostDishes() {
    if (!work || !result) return;

    const requestedNames = Array.from(new Set(
      quickDishNames
        .split(/[\n,;]+/)
        .map((name) => name.replace(/\s+/g, ' ').trim())
        .filter(Boolean),
    ));

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
        .map((item) => item.name.trim().toLocaleLowerCase('en-IN')),
    );
    const namesToAdd = requestedNames.filter(
      (name) => !existingNames.has(name.toLocaleLowerCase('en-IN')),
    );
    const skippedCount = requestedNames.length - namesToAdd.length;

    if (!namesToAdd.length) {
      setQuickAddMessage('Those dishes are already in this meal.');
      return;
    }

    const now = Date.now();
    const additions: WorkState['menu'] = namesToAdd.map((name, index) => ({
      id: `dish_${now}_${index}_${Math.random().toString(36).slice(2, 7)}`,
      name,
      category: newDishCategory,
      costPerPlate: 0,
      portionQuantity: 1,
      portionBaseQuantity: 1,
      portionUnit: 'serving',
      portionMode: 'AUTO',
      serviceId: targetTemplate?.serviceId,
      dayLabel: targetService?.dayLabel || targetTemplate?.dayLabel,
      mealLabel: targetService?.mealLabel || targetTemplate?.mealLabel || 'Event Menu',
      servicePax:
        Number(targetService?.pax) ||
        Number(targetTemplate?.servicePax) ||
        Number(work.event.pax) ||
        0,
      costSource: 'manual',
      coverageStatus: 'NEW_DISH_PENDING',
      costConfidence: 0,
      rateCoveragePercent: 0,
      coverageReason: 'Manual rate required',
      costApprovalStatus: 'PENDING',
      costApprovalReason: 'Manual rate required',
      detectionSource: 'manual',
      detectionConfidence: 100,
      detectionReason: 'User quickly added missing dish on Cost page',
    }));

    persist({ ...work, menu: [...work.menu, ...additions] });
    setQuickDishNames('');
    setDishQuery('');
    setDishServiceFilter('ALL');
    setDishCategoryFilter('ALL');
    setDishStatusFilter('MISSING');
    setQuickAddMessage(
      `${additions.length} ${additions.length === 1 ? 'dish' : 'dishes'} added${
        skippedCount ? ` · ${skippedCount} already existed` : ''
      }. Add rates below.`,
    );

    void fetch('/api/dish-suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceFileName: 'Quick added from Cost page',
        candidates: namesToAdd.map((name) => ({ name, categoryHint: newDishCategory })),
      }),
    }).catch((suggestionError) =>
      console.warn('Quick dish suggestions skipped:', suggestionError),
    );
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
    <AppShell title="Dish Cost" subtitle="Review food cost, portions and dish rates before grocery planning">
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

          <aside className="cost-command-actions" aria-label="Costing next steps">
            <div className={missingRateCount > 0 ? 'needs-attention' : 'is-ready'}>
              <span aria-hidden="true">{missingRateCount > 0 ? '!' : '✓'}</span>
              <div>
                <b>{missingRateCount > 0 ? `${missingRateCount} ${missingRateCount === 1 ? 'rate needs' : 'rates need'} attention` : 'Food rates are ready'}</b>
                <small>{missingRateCount > 0 ? 'Complete these before final pricing.' : 'Continue with team and operations.'}</small>
              </div>
            </div>
            {missingRateCount > 0 ? (
              <button type="button" className="cost-command-fix" onClick={() => {
                setDishStatusFilter('MISSING');
                document.querySelector('.dish-cost-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}>Fix missing rates</button>
            ) : null}
            <button type="button" onClick={() => router.push('/app/grocery')}>Open grocery <span aria-hidden="true">›</span></button>
            <button type="button" onClick={() => router.push('/app/team')}>Review manpower <span aria-hidden="true">›</span></button>
            <button type="button" onClick={() => router.push('/app/operations')}>Add expenses <span aria-hidden="true">›</span></button>
          </aside>
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
                    Paste a list or type dish names separated by commas. Rates can be filled in after adding.
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
                  <small className="muted">One per line, or separate with commas · Ctrl/⌘ + Enter to add</small>
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

              <div className="cost-add-dish-divider"><span>Or add one dish with serving and rate</span></div>

              <div className="cost-add-dish-grid">
                <div className="field">
                  <label>
                    Dish Name
                  </label>

                  <input
                    className="input"
                    value={
                      newDishName
                    }
                    onChange={(event) =>
                      setNewDishName(
                        event.target
                          .value,
                      )
                    }
                    placeholder="Example: Kaju Curry"
                  />
                </div>

                <div className="field">
                  <label>
                    Category
                  </label>

                  <select
                    className="select"
                    value={
                      newDishCategory
                    }
                    onChange={(event) =>
                      setNewDishCategory(
                        event.target
                          .value as Category,
                      )
                    }
                  >
                    {availableDishCategories.map(
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

                <div className="field">
                  <label>
                    Serving Quantity
                  </label>

                  <input
                    className="input"
                    type="number"
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    value={newDishServingQuantity}
                    onChange={(event) =>
                      setNewDishServingQuantity(
                        event.target.value,
                      )
                    }
                    placeholder="1"
                  />

                  <small className="muted">
                    Example: Gulab Jamun = 1 piece, Dal = 100 ml.
                  </small>
                </div>

                <div className="field">
                  <label>
                    Serving Unit
                  </label>

                  <select
                    className="select"
                    value={newDishServingUnit}
                    onChange={(event) => {
                      const unit =
                        event.target.value;

                      setNewDishServingUnit(
                        unit,
                      );

                      if (unit !== 'piece') {
                        setNewDishPieceWeight('');
                      }
                    }}
                  >
                    <option value="serving">
                      Serving
                    </option>

                    <option value="piece">
                      Piece
                    </option>

                    <option value="g">
                      Gram (g)
                    </option>

                    <option value="ml">
                      Millilitre (ml)
                    </option>
                  </select>
                </div>

                {newDishServingUnit === 'piece' ? (
                  <div className="field">
                    <label>
                      Weight / Piece
                    </label>

                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="0.1"
                      inputMode="decimal"
                      value={newDishPieceWeight}
                      onChange={(event) =>
                        setNewDishPieceWeight(
                          event.target.value,
                        )
                      }
                      placeholder="Example: 35"
                    />

                    <small className="muted">
                      {Number(newDishPieceWeight) > 0
                        ? `Approx. ${(
                            (Number(newDishServingQuantity) || 0) *
                            Number(newDishPieceWeight)
                          ).toFixed(0)} g total serving`
                        : 'Example: Gulab Jamun ≈ 35 g / piece'}
                    </small>
                  </div>
                ) : null}

                <div className="field">
                  <label>
                    Wedding Meal
                  </label>

                  <select
                    className="select"
                    value={
                      selectedAddServiceKey
                    }
                    onChange={(event) =>
                      setNewDishServiceKey(
                        event.target
                          .value,
                      )
                    }
                  >
                    {result
                      .serviceSummaries
                      .length ? (
                      result.serviceSummaries.map(
                        (service) => {
                          const date =
                            serviceDateByKey.get(
                              service.serviceKey,
                            );

                          return (
                            <option
                              key={
                                service.serviceKey
                              }
                              value={
                                service.serviceKey
                              }
                            >
                              {date
                                ? `${date} • `
                                : ''}
                              {service.dayLabel
                                ? `${service.dayLabel} • `
                                : ''}
                              {service.mealLabel ||
                                'Event Menu'}
                            </option>
                          );
                        },
                      )
                    ) : (
                      <option value="">
                        Event Menu
                      </option>
                    )}
                  </select>

                  {selectedAddServiceDate ? (
                    <small className="cost-add-date">
                      📅 {
                        selectedAddServiceDate
                      }
                    </small>
                  ) : null}
                </div>

                <div className="field">
                  <label>
                    Base Rate ₹ / serving
                  </label>

                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={
                      newDishRate
                    }
                    onChange={(event) =>
                      setNewDishRate(
                        event.target
                          .value,
                      )
                    }
                    placeholder="Enter rate or leave blank"
                  />

                  <small className="muted">
                    Enter the cost for the serving above. Example: 1 Gulab Jamun = ₹12. If quantity later becomes 2 pieces, costing becomes ₹24 before portion allocation.
                  </small>
                </div>
              </div>

              <div className="cost-add-dish-actions">
                <button
                  className="primary-button"
                  type="button"
                  onClick={
                    addNewCostDish
                  }
                >
                  Add Dish
                </button>

                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => {
                    setShowAddDish(
                      false,
                    );

                    setNewDishName(
                      '',
                    );

                    setNewDishRate(
                      '',
                    );
                  }}
                >
                  Cancel
                </button>
              </div>
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

              <div className="dish-portion-note">
                <b>Portion allocation:</b> automatic sharing is calculated separately inside every meal and category. You can also set a custom percentage for any dish: 50% charges half its base cost; 150% charges one-and-a-half times.
              </div>

              <div
                className="no-print"
                style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}
              >
                <button
                  className="ghost-button"
                  type="button"
                  onClick={applyAllCategoryRecommendations}
                >
                  Apply all recommended consumption
                </button>
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
                          <th>Dish &amp; function</th>
                          <th>Category &amp; serving</th>
                          <th>Guests</th>
                          <th>Base ₹ / plate</th>
                          <th>Portion</th>
                          <th>Calculated cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dishCategoryGroups.map((group) => {
                          const collapsed = Boolean(collapsedDishGroups[group.key]);

                          return (
                            <Fragment key={group.key}>
                              <tr className="dish-category-section-row">
                                <td colSpan={9} style={{ padding: 0 }}>
                                  <div
                                    style={{
                                      width: '100%',
                                      background: 'var(--surface-subtle, rgba(0,0,0,0.035))',
                                      padding: '10px 14px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      gap: 12,
                                    }}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => toggleDishCategoryGroup(group.key)}
                                      aria-expanded={!collapsed}
                                      style={{
                                        border: 0,
                                        background: 'transparent',
                                        padding: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        minWidth: 0,
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                      }}
                                    >
                                      <span aria-hidden="true" style={{ fontSize: 12 }}>{collapsed ? '▶' : '▼'}</span>
                                      <strong>{group.category}</strong>
                                      <small className="muted">
                                        {group.dayLabel ? `${group.dayLabel} • ` : ''}{group.mealLabel}
                                      </small>
                                    </button>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 12, whiteSpace: 'nowrap' }}>
                                      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <small>Category consumption</small>
                                        <input
                                          className="input"
                                          type="number"
                                          min="0"
                                          max="300"
                                          step="5"
                                          value={group.targetPercent}
                                          onChange={(event) =>
                                            updateCategoryPortion(
                                              group.serviceKey,
                                              group.category,
                                              Number(event.target.value),
                                            )
                                          }
                                          aria-label={`${group.category} category consumption percentage`}
                                          style={{ width: 72 }}
                                        />
                                        <small>%</small>
                                      </label>
                                      <small className="muted">Recommended {group.recommendedPercent}%</small>
                                      {group.targetPercent !== group.recommendedPercent ? (
                                        <button
                                          className="ghost-button"
                                          type="button"
                                          onClick={() =>
                                            updateCategoryPortion(
                                              group.serviceKey,
                                              group.category,
                                              group.recommendedPercent,
                                            )
                                          }
                                          style={{ padding: '6px 9px' }}
                                        >
                                          Apply
                                        </button>
                                      ) : null}
                                      <small>{group.items.length} dish{group.items.length === 1 ? '' : 'es'}</small>
                                      {group.missingCount > 0 ? (
                                        <small className="needs-attention">{group.missingCount} rate{group.missingCount === 1 ? '' : 's'} missing</small>
                                      ) : null}
                                      <strong>{money(group.subtotal)}</strong>
                                    </span>
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
                              {needsManualRate(item) ? (
                                <span className="dish-manual-rate-label">Add manual rate</span>
                              ) : null}
                              <label className="dish-rate-input">
                                <span aria-hidden="true">₹</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  inputMode="decimal"
                                  value={item.baseCostPerPlate}
                                  placeholder="0"
                                  aria-label={`Base cost per plate for ${item.name}`}
                                  onFocus={(event) => {
                                    if (needsManualRate(item)) event.currentTarget.select();
                                  }}
                                  onChange={(event) => updateDishCost(item.id, Number(event.target.value))}
                                />
                              </label>
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
                                  <option value="AUTO">Auto</option>
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
                                  <small>Per plate</small>
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
                          <div
                            style={{
                              width: '100%',
                              borderRadius: 14,
                              padding: '12px 14px',
                              marginBottom: 10,
                              background: 'var(--surface-subtle, rgba(0,0,0,0.035))',
                              display: 'grid',
                              gap: 10,
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => toggleDishCategoryGroup(group.key)}
                              aria-expanded={!collapsed}
                              style={{
                                border: 0,
                                background: 'transparent',
                                padding: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 10,
                                textAlign: 'left',
                                cursor: 'pointer',
                              }}
                            >
                              <strong>{collapsed ? '▶' : '▼'} {group.category}</strong>
                              <strong>{money(group.subtotal)}</strong>
                            </button>
                            <small className="muted">
                              {group.dayLabel ? `${group.dayLabel} • ` : ''}{group.mealLabel} · {group.items.length} dish{group.items.length === 1 ? '' : 'es'}
                              {group.missingCount > 0 ? ` · ${group.missingCount} rate${group.missingCount === 1 ? '' : 's'} missing` : ''}
                            </small>
                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                              <span>Category consumption</span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <input
                                  className="input"
                                  type="number"
                                  min="0"
                                  max="300"
                                  step="5"
                                  value={group.targetPercent}
                                  onChange={(event) =>
                                    updateCategoryPortion(
                                      group.serviceKey,
                                      group.category,
                                      Number(event.target.value),
                                    )
                                  }
                                  aria-label={`${group.category} category consumption percentage`}
                                  style={{ width: 82 }}
                                />
                                <span>%</span>
                              </span>
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                              <small className="muted">
                                Recommended {group.recommendedPercent}% · {group.pax.toLocaleString('en-IN')} guests
                              </small>
                              {group.targetPercent !== group.recommendedPercent ? (
                                <button
                                  className="ghost-button"
                                  type="button"
                                  onClick={() =>
                                    updateCategoryPortion(
                                      group.serviceKey,
                                      group.category,
                                      group.recommendedPercent,
                                    )
                                  }
                                  style={{ padding: '6px 9px' }}
                                >
                                  Apply
                                </button>
                              ) : null}
                            </div>
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
                          <div><small>Members</small><b>{item.effectivePax.toLocaleString('en-IN')}</b></div>
                          <div><small>Portion</small><b>{Math.round(item.portionPercent * 100) / 100}%</b></div>
                          <div><small>Adjusted / plate</small><b>{money(item.adjustedCostPerPlate)}</b></div>
                          <div className="dish-cost-card-total"><small>Total cost</small><b>{money(item.itemTotalCost)}</b></div>
                        </div>
                        <div className="field">
                          <label htmlFor={`mobile-portion-mode-${item.id}`}>
                            Client portion
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
                            {needsManualRate(item) ? 'Add manual rate / plate' : 'Base cost / plate'}
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

          <aside className="cost-desktop-summary no-print" aria-label="Food costing summary">
            <div className="cost-desktop-summary-head">
              <span>Food cost</span>
              <strong>{money(result.menuFoodTotal)}</strong>
              <small>{money(result.menuCostPerPlate)} average per cover</small>
            </div>

            <div className="cost-desktop-summary-grid">
              <div>
                <span>Dishes</span>
                <b>{work.menu.length}</b>
              </div>
              <div>
                <span>Costed</span>
                <b>{costedDishCount}</b>
              </div>
              <div>
                <span>Missing</span>
                <b className={missingRateCount > 0 ? 'needs-attention' : ''}>{missingRateCount}</b>
              </div>
              <div>
                <span>Covers</span>
                <b>{result.totalCovers.toLocaleString('en-IN')}</b>
              </div>
            </div>

            <div className="cost-desktop-summary-progress">
              <div>
                <span
                  style={{
                    width: `${work.menu.length > 0
                      ? Math.round((costedDishCount / work.menu.length) * 100)
                      : 0}%`,
                  }}
                />
              </div>
              <small>
                {work.menu.length > 0
                  ? `${Math.round((costedDishCount / work.menu.length) * 100)}% dish rates ready`
                  : 'Add menu dishes to begin'}
              </small>
            </div>

            <div className="cost-desktop-summary-list">
              <div>
                <span>Showing</span>
                <b>{filteredDishCosts.length} dishes</b>
              </div>
              <div>
                <span>Functions</span>
                <b>{result.serviceSummaries.length}</b>
              </div>
              <div>
                <span>Food share</span>
                <b>{Math.round(foodShare)}%</b>
              </div>
            </div>

            {missingRateCount > 0 ? (
              <button
                type="button"
                className="cost-desktop-review-rates"
                onClick={() => {
                  setDishStatusFilter('MISSING');
                  document
                    .querySelector('.dish-cost-panel')
                    ?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                    });
                }}
              >
                Review {missingRateCount} missing {missingRateCount === 1 ? 'rate' : 'rates'}
              </button>
            ) : (
              <div className="cost-desktop-ready-note">
                <span aria-hidden="true">✓</span>
                All dish rates are ready
              </div>
            )}

            <button
              className="primary-button cost-desktop-next"
              type="button"
              disabled={work.menu.length === 0}
              onClick={() => router.push('/app/grocery')}
            >
              Continue to Grocery
              <span aria-hidden="true">→</span>
            </button>

            <button
              className="cost-desktop-back"
              type="button"
              onClick={() => router.push('/app/event?resume=1')}
            >
              Back to Event & Menu
            </button>
          </aside>
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
