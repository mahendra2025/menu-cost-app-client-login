import type { MenuItem, WorkState } from './types';
import { calculateManpowerCost } from './manpowerCost';

export function getMenuServiceKey(
  item: Pick<MenuItem, 'serviceId' | 'dayLabel' | 'mealLabel'>,
): string {
  const normalizePart = (value: string | undefined, fallback: string) =>
    String(value || fallback)
      .trim()
      .toLocaleLowerCase('en-IN')
      .replace(/\s+/g, ' ');

  const serviceId = normalizePart(item.serviceId, 'default');
  const dayLabel = normalizePart(item.dayLabel, 'event');
  const mealLabel = normalizePart(item.mealLabel, 'event menu');

  return `${serviceId}::${dayLabel}::${mealLabel}`;
}

export function buildMenuCostBreakdown(
  menu: MenuItem[],
  fallbackPax = 0,
) {
  const categoryStats =
    menu.reduce<
      Record<
        string,
        {
          count: number;
          autoCount: number;
          customTotal: number;
          targetPercent: number;
        }
      >
    >(
      (stats, item) => {
        const serviceKey = getMenuServiceKey(item);
        const categoryKey = `${serviceKey}::${item.category}`;
        const current = stats[categoryKey] ?? {
          count: 0,
          autoCount: 0,
          customTotal: 0,
          targetPercent: 100,
        };

        current.count += 1;

        if (item.portionMode === 'CUSTOM') {
          current.customTotal += Math.min(
            300,
            Math.max(0, Number(item.portionPercent) || 0),
          );
        } else {
          current.autoCount += 1;
        }

        if (Number.isFinite(Number(item.categoryPortionPercent))) {
          current.targetPercent = Math.min(
            300,
            Math.max(0, Number(item.categoryPortionPercent) || 0),
          );
        }

        stats[categoryKey] = current;
        return stats;
      },
      {},
    );

  const breakdown = menu.map((item) => {
    const serviceKey = getMenuServiceKey(item);
    const categoryKey = `${serviceKey}::${item.category}`;
    const categoryStat =
      categoryStats[
        categoryKey
      ] ?? {
        count: 1,
        autoCount: 1,
        customTotal: 0,
        targetPercent: 100,
      };
    const categoryCount = categoryStat.count;

    /*
     * Manual rate remains zero until
     * the user enters a value.
     *
     * Do not replace zero with a
     * category rate here.
     */
    const baseCostPerPlate =
      Math.max(
        0,
        Number(
          item.costPerPlate,
        ) || 0,
      );

    const customPortion =
      item.portionMode === 'CUSTOM'
        ? Math.min(300, Math.max(0, Number(item.portionPercent) || 0))
        : null;

    /*
     * Category target applies to the whole meal/category.
     * Existing custom dish portions are preserved first, then the
     * remaining target is shared equally across AUTO dishes.
     *
     * Example:
     * Sweet target = 100%
     * Malpua custom = 35%
     * 2 AUTO sweets -> remaining 65% -> 32.5% each.
     */
    /*
     * Dish Cost default = full 100% portion per dish.
     * AUTO no longer divides one category target across multiple dishes.
     * Users can still choose CUSTOM when a dish should cost at a lower
     * or higher consumption percentage for a specific event.
     */
    const automaticPortionPercent = 100;
    const portionFactor =
      customPortion === null
        ? automaticPortionPercent / 100
        : customPortion / 100;

    /*
     * Serving quantity adjustment.
     *
     * New/edited dishes can remember their original serving
     * quantity as portionBaseQuantity.
     *
     * Example:
     * 1 Gulab Jamun = ₹12
     * quantity changed to 2
     * servingFactor = 2 / 1 = 2
     * servingCostPerPlate = ₹24
     *
     * Legacy dishes without a base quantity deliberately use
     * factor 1 so existing saved costings do not suddenly change.
     */
    const currentServingQuantity =
      Math.max(
        0,
        Number(item.portionQuantity) || 0,
      );

    const storedBaseServingQuantity =
      Math.max(
        0,
        Number(item.portionBaseQuantity) || 0,
      );

    const servingFactor =
      storedBaseServingQuantity > 0
        ? currentServingQuantity /
          storedBaseServingQuantity
        : 1;

    const servingCostPerPlate =
      baseCostPerPlate *
      servingFactor;

    const adjustedCostPerPlate =
      servingCostPerPlate *
      portionFactor;

    const effectivePax = Math.max(
      0,
      Number(item.servicePax) || Number(fallbackPax) || 0,
    );
    const itemTotalCost =
      adjustedCostPerPlate * effectivePax;

    return {
      ...item,
      serviceKey,
      baseCostPerPlate,
      categoryCount,
      categoryPortionPercent: categoryStat.targetPercent,
      portionFactor,
      portionMode: customPortion === null ? 'AUTO' as const : 'CUSTOM' as const,
      portionPercent:
        customPortion === null
          ? automaticPortionPercent
          : customPortion,
      adjustedCostPerPlate,
      effectivePax,
      itemTotalCost,
    };
  });

  const portionTotals = breakdown.reduce<Record<string, number>>(
    (totals, item) => {
      const categoryKey = `${item.serviceKey}::${item.category}`;
      totals[categoryKey] = (totals[categoryKey] ?? 0) + item.portionPercent;
      return totals;
    },
    {},
  );

  return breakdown.map((item) => {
    const categoryKey = `${item.serviceKey}::${item.category}`;
    return {
      ...item,
      portionGroupTotalPercent: portionTotals[categoryKey] ?? item.portionPercent,
    };
  });
}

/* -------------------------------------------------------------------------- */
/*                              Final costing                                 */
/* -------------------------------------------------------------------------- */

export function calculate(
  work: WorkState,
) {
  const pax = Math.max(
    Number(work.event.pax) || 0,
    0,
  );

  const menuBreakdown =
    buildMenuCostBreakdown(
      work.menu,
      pax,
    );

  const serviceSummaryMap = new Map<
    string,
    {
      serviceKey: string;
      serviceId: string;
      dayLabel: string;
      mealLabel: string;
      pax: number;
      dishCount: number;
      menuCostPerPlate: number;
      totalCost: number;
    }
  >();

  menuBreakdown.forEach((item) => {
    const serviceKey = item.serviceKey;
    const current = serviceSummaryMap.get(serviceKey) ?? {
      serviceKey,
      serviceId: item.serviceId ?? 'default',
      dayLabel: item.dayLabel ?? '',
      mealLabel: item.mealLabel ?? 'Event Menu',
      pax: item.effectivePax,
      dishCount: 0,
      menuCostPerPlate: 0,
      totalCost: 0,
    };

    current.dishCount += 1;
    current.menuCostPerPlate += item.adjustedCostPerPlate;
    current.totalCost += item.itemTotalCost;
    serviceSummaryMap.set(serviceKey, current);
  });

  const serviceSummaries = Array.from(serviceSummaryMap.values());
  const totalCovers = serviceSummaries.reduce(
    (sum, service) => sum + service.pax,
    0,
  );
  const menuFoodTotal = menuBreakdown.reduce(
    (sum, item) => sum + item.itemTotalCost,
    0,
  );

  const menuCostPerPlate =
    totalCovers > 0 ? menuFoodTotal / totalCovers : 0;

  const manpowerTotal =
    calculateManpowerCost(
      work.manpower,
    );

  const extrasTotal =
    manpowerTotal +
    Math.max(
      0,
      Number(
        work.extras.transport,
      ) || 0,
    ) +
    Math.max(
      0,
      Number(
        work.extras.gasFuel,
      ) || 0,
    ) +
    Math.max(
      0,
      Number(
        work.extras.disposable,
      ) || 0,
    ) +
    Math.max(
      0,
      Number(
        work.extras.other,
      ) || 0,
    );

  const extraPerPlate =
    totalCovers > 0
      ? extrasTotal / totalCovers
      : 0;

  const finalCostPerPlate =
    menuCostPerPlate +
    extraPerPlate;

  const sellingPricePerPlate =
    Math.max(
      0,
      Number(
        work.sellingPricePerPlate,
      ) || 0,
    );

  const profitPerPlate =
    sellingPricePerPlate > 0
      ? sellingPricePerPlate -
        finalCostPerPlate
      : 0;

  const totalCost =
    menuFoodTotal + extrasTotal;

  const totalSelling =
    sellingPricePerPlate * totalCovers;

  const totalProfit = totalSelling - totalCost;

  return {
    pax: totalCovers,
    eventPax: pax,
    totalCovers,
    menuBreakdown,
    serviceSummaries,
    menuFoodTotal,
    menuCostPerPlate,
    extrasTotal,
    extraPerPlate,
    finalCostPerPlate,
    sellingPricePerPlate,
    profitPerPlate,
    totalCost,
    totalSelling,
    totalProfit,
  };
}
