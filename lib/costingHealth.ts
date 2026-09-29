import type { WorkState } from './types';
import type { WorkWithOperations } from './operationsCost';

export type CostingHealthStatus =
  | 'INCOMPLETE'
  | 'REVIEW_NEEDED'
  | 'COST_VERIFIED'
  | 'READY_FOR_QUOTATION';

export type CostingHealthSeverity = 'BLOCKER' | 'WARNING';

export type CostingHealthIssue = {
  code:
    | 'MISSING_DISH_RATE'
    | 'UNRESOLVED_DISH'
    | 'ZERO_DISPOSABLE_RATE'
    | 'TRANSPORT_RATE_MISSING'
    | 'TRANSPORT_NOT_SET'
    | 'DUPLICATE_DISH'
    | 'CATEGORY_REVIEW'
    | 'ZERO_GAS_OVERRIDE'
    | 'UNASSIGNED_SPECIALIST';
  severity: CostingHealthSeverity;
  count: number;
  title: string;
  detail: string;
  actionPath?: string;
};

export type CostingHealthResult = {
  status: CostingHealthStatus;
  issues: CostingHealthIssue[];
  blockerCount: number;
  warningCount: number;
  canPrice: boolean;
  canQuote: boolean;
};

function safeNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function normalize(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase('en-IN')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function serviceKey(item: WorkState['menu'][number]) {
  const id = String(item.serviceId ?? '').trim();
  if (id) return `id:${id}`;

  const day = normalize(item.dayLabel);
  const meal = normalize(item.mealLabel);
  return `label:${day}|${meal}`;
}

function hasMissingConfiguredTransportRate(work: WorkState) {
  const operations = (work as WorkWithOperations).operations;
  if (!operations) return false;

  const rows =
    operations.transportMode === 'FUNCTION_WISE'
      ? operations.functions.map((row) => row.transport)
      : [operations.sharedTransport];

  return rows.some(
    (row) =>
      safeNumber(row.vehicles) > 0 &&
      safeNumber(row.tripsPerVehicle) > 0 &&
      !(safeNumber(row.ratePerTrip) > 0),
  );
}

function duplicateDishCount(work: WorkState) {
  const counts = new Map<string, number>();

  work.menu
    .filter((item) => item.coverageStatus !== 'REJECTED')
    .forEach((item) => {
      const dish = normalize(item.name);
      if (!dish) return;
      const key = `${serviceKey(item)}::${dish}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

  return Array.from(counts.values()).reduce(
    (sum, count) => sum + (count > 1 ? count - 1 : 0),
    0,
  );
}

function needsGasReviewCategory(category: unknown) {
  const value = normalize(category);
  if (!value) return true;

  return ![
    'welcome drink',
    'mocktail',
    'beverage',
    'juice',
    'salad',
    'fruit',
    'ice cream',
    'mukhwas',
    'water',
  ].some((cold) => value.includes(cold));
}

function specialistWithoutAssignmentCount(work: WorkState) {
  return work.manpower.filter((row) => {
    if (!(safeNumber(row.quantity) > 0)) return false;
    const role = normalize(row.role);

    if (!/(cook|chef)/.test(role)) return false;
    if (/(head chef|assistant cook|helper|supervisor)/.test(role)) return false;

    return !(row.assignedDishIds?.length);
  }).length;
}

export function assessCostingHealth(
  work: WorkState,
  options?: {
    totalCovers?: number;
    sellingPricePerCover?: number;
  },
): CostingHealthResult {
  const issues: CostingHealthIssue[] = [];
  const activeMenu = work.menu.filter(
    (item) => item.coverageStatus !== 'REJECTED',
  );

  const missingDishRateCount = activeMenu.filter(
    (item) => !(safeNumber(item.costPerPlate) > 0),
  ).length;

  if (missingDishRateCount > 0) {
    issues.push({
      code: 'MISSING_DISH_RATE',
      severity: 'BLOCKER',
      count: missingDishRateCount,
      title: 'Dish rates missing',
      detail: `${missingDishRateCount} menu item(s) still have no usable cost per plate.`,
      actionPath: '/app/cost',
    });
  }

  const unresolvedDishCount = activeMenu.filter((item) =>
    ['NEW_DISH_PENDING', 'UNRESOLVED'].includes(
      String(item.coverageStatus ?? ''),
    ) || item.costQualityStatus === 'BLOCKED',
  ).length;

  if (unresolvedDishCount > 0) {
    issues.push({
      code: 'UNRESOLVED_DISH',
      severity: 'BLOCKER',
      count: unresolvedDishCount,
      title: 'Dishes need costing',
      detail: `${unresolvedDishCount} dish(es) are unresolved, new, or blocked from costing.`,
      actionPath: '/app/cost',
    });
  }

  const zeroDisposableRateCount = (work.disposableItems ?? []).filter(
    (item) =>
      safeNumber(item.quantity) > 0 &&
      !(safeNumber(item.unitCost) > 0),
  ).length;

  if (zeroDisposableRateCount > 0) {
    issues.push({
      code: 'ZERO_DISPOSABLE_RATE',
      severity: 'BLOCKER',
      count: zeroDisposableRateCount,
      title: 'Disposable rates missing',
      detail: `${zeroDisposableRateCount} disposable item(s) have quantity but a ₹0 rate.`,
      actionPath: '/app/disposable',
    });
  }

  if (hasMissingConfiguredTransportRate(work)) {
    issues.push({
      code: 'TRANSPORT_RATE_MISSING',
      severity: 'BLOCKER',
      count: 1,
      title: 'Transport rate missing',
      detail: 'A configured vehicle/trip has a ₹0 rate. Add the trip rate before pricing.',
      actionPath: '/app/operations',
    });
  } else if (
    safeNumber(options?.totalCovers ?? work.event.pax) > 0 &&
    !(safeNumber(work.extras.transport) > 0)
  ) {
    issues.push({
      code: 'TRANSPORT_NOT_SET',
      severity: 'WARNING',
      count: 1,
      title: 'Transport is ₹0',
      detail: 'Confirm that transport is genuinely not chargeable for this event.',
      actionPath: '/app/operations',
    });
  }

  const duplicates = duplicateDishCount(work);
  if (duplicates > 0) {
    issues.push({
      code: 'DUPLICATE_DISH',
      severity: 'WARNING',
      count: duplicates,
      title: 'Possible duplicate dishes',
      detail: `${duplicates} repeated dish row(s) were found inside the same function/meal.`,
      actionPath: '/app/event',
    });
  }

  const categoryReviewCount = activeMenu.filter((item) =>
    ['other', 'uncategorized', 'unknown', ''].includes(normalize(item.category)),
  ).length;

  if (categoryReviewCount > 0) {
    issues.push({
      code: 'CATEGORY_REVIEW',
      severity: 'WARNING',
      count: categoryReviewCount,
      title: 'Categories need review',
      detail: `${categoryReviewCount} dish(es) are in Other/Unknown instead of a specific costing category.`,
      actionPath: '/app/event',
    });
  }

  const menuById = new Map(activeMenu.map((item) => [item.id, item]));
  const zeroGasOverrides = (work.gasEventOverrides ?? []).filter((override) => {
    if (override.noGas) return false;
    if (safeNumber(override.gasKgPer100) > 0) return false;

    const item = override.dishId ? menuById.get(override.dishId) : undefined;
    return needsGasReviewCategory(item?.category);
  }).length;

  if (zeroGasOverrides > 0) {
    issues.push({
      code: 'ZERO_GAS_OVERRIDE',
      severity: 'WARNING',
      count: zeroGasOverrides,
      title: 'Zero-LPG overrides to confirm',
      detail: `${zeroGasOverrides} cooked dish override(s) are set to 0 kg LPG per 100 guests.`,
      actionPath: '/app/operations',
    });
  }

  const unassignedSpecialists = specialistWithoutAssignmentCount(work);
  if (unassignedSpecialists > 0) {
    issues.push({
      code: 'UNASSIGNED_SPECIALIST',
      severity: 'WARNING',
      count: unassignedSpecialists,
      title: 'Specialist cooks not mapped',
      detail: `${unassignedSpecialists} specialist cook/chef row(s) have no assigned dishes.`,
      actionPath: '/app/manpower',
    });
  }

  const blockerCount = issues.filter(
    (issue) => issue.severity === 'BLOCKER',
  ).length;
  const warningCount = issues.filter(
    (issue) => issue.severity === 'WARNING',
  ).length;

  const canPrice = blockerCount === 0;
  const hasSellingPrice =
    safeNumber(
      options?.sellingPricePerCover ?? work.sellingPricePerPlate,
    ) > 0;

  const status: CostingHealthStatus =
    blockerCount > 0
      ? 'INCOMPLETE'
      : warningCount > 0
        ? 'REVIEW_NEEDED'
        : hasSellingPrice
          ? 'READY_FOR_QUOTATION'
          : 'COST_VERIFIED';

  return {
    status,
    issues,
    blockerCount,
    warningCount,
    canPrice,
    canQuote: canPrice && hasSellingPrice,
  };
}
