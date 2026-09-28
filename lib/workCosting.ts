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
  const categoryCounts =
    menu.reduce<
      Record<string, number>
    >(
      (counts, item) => {
        const serviceKey = getMenuServiceKey(item);
        const categoryKey = `${serviceKey}::${item.category}`;

        counts[categoryKey] =
          (
            counts[
              categoryKey
            ] ?? 0
          ) + 1;

        return counts;
      },
      {},
    );

  const breakdown = menu.map((item) => {
    const serviceKey = getMenuServiceKey(item);
    const categoryKey = `${serviceKey}::${item.category}`;
    const categoryCount =
      categoryCounts[
        categoryKey
      ] ?? 1;

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

    const automaticPortionFactor =
      categoryCount > 1 ? 1 / categoryCount : 1;
    const customPortion =
      item.portionMode === 'CUSTOM'
        ? Math.min(300, Math.max(0, Number(item.portionPercent) || 0))
        : null;
    const portionFactor =
      customPortion === null
        ? automaticPortionFactor
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
      portionFactor,
      portionMode: customPortion === null ? 'AUTO' as const : 'CUSTOM' as const,
      portionPercent:
        customPortion === null
          ? automaticPortionFactor * 100
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
