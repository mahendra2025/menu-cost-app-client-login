'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '../../components/AppShell';
import {
  applyManpowerRateMaster,
  deleteCustomManpowerRole,
  getSession,
  loadCustomManpowerRoles,
  loadWork,
  saveCustomManpowerRole,
  saveWork,
  syncCustomManpowerRoles,
  uid,
} from '../../../lib/store';
import type { CustomManpowerRole } from '../../../lib/store';
import {
  buildManpowerBillingSummary,
  calculateManpowerCost,
  getManpowerRateMode,
  inferManpowerShift,
  manpowerBillableCost,
  manpowerIncludedInSharedRate,
  manpowerRateModeLabel,
  manpowerRawCost,
} from '../../../lib/manpowerCost';
import {
  buildCategoryManpowerRecommendations,
  generateMealManpowerRows,
} from '../../../lib/manpowerEngine';
import {
  MANPOWER_ROLE_MASTER,
} from '../../../lib/manpowerMaster';
import {
  sortMenuItemsByCategoryPriority,
} from '../../../lib/menuCategoryPriority';
import type {
  ManpowerDepartment,
  ManpowerRow,
  MenuItem,
  Session,
  WorkState,
} from '../../../lib/types';

type NewRoleDraft = {
  role: string;
  category: Exclude<
    ManpowerFilterGroup,
    'ALL'
  >;
  rate: string;
};

type ManpowerFilterGroup =
  | 'ALL'
  | 'SERVICE'
  | 'KITCHEN'
  | 'COUNTER'
  | 'UTILITY'
  | 'LOGISTICS'
  | 'MANAGEMENT';

const STAFF_ROLE_CATEGORIES: Array<{
  value: Exclude<
    ManpowerFilterGroup,
    'ALL'
  >;
  label: string;
}> = [
  { value: 'SERVICE', label: 'Service' },
  { value: 'KITCHEN', label: 'Kitchen' },
  { value: 'COUNTER', label: 'Counter' },
  { value: 'UTILITY', label: 'Utility' },
  { value: 'LOGISTICS', label: 'Logistics' },
  { value: 'MANAGEMENT', label: 'Management' },
];

const MANPOWER_FILTERS: Array<{
  key: ManpowerFilterGroup;
  label: string;
}> = [
  { key: 'ALL', label: 'All' },
  { key: 'SERVICE', label: 'Service' },
  { key: 'KITCHEN', label: 'Kitchen' },
  { key: 'COUNTER', label: 'Counter' },
  { key: 'UTILITY', label: 'Utility' },
  { key: 'LOGISTICS', label: 'Logistics' },
  { key: 'MANAGEMENT', label: 'Management' },
];

type MealPlan = {
  key: string;
  serviceId?: string;
  dayLabel: string;
  mealLabel: string;
  pax: number;
  dishIds: string[];
};

const CATEGORY_PRODUCTION_ROLE_IDS = new Set([
  'juice_mocktail',
  'live_counter_cook',
  'chaat_cook',
  'chinese_cook',
  'south_indian_cook',
  'italian_cook',
  'starter_cook',
  'soup_cook',
  'bread_cook',
  'main_course_cook',
  'farsan_cook',
  'sweet_halwai',
]);

function categoryStationKey(value: unknown) {
  return String(value || 'Other')
    .trim()
    .toLocaleLowerCase('en-IN')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'other';
}

function categoryProductionSpec(categoryRaw: string) {
  const category = normalizePart(categoryRaw);
  let roleId = 'main_course_cook';
  let role = `${categoryRaw || 'Other'} Cook`;

  if (
    category.includes('welcome drink') ||
    category.includes('mocktail') ||
    category.includes('beverage') ||
    category.includes('juice')
  ) {
    roleId = 'juice_mocktail';
    role = `${categoryRaw || 'Beverage'} Staff`;
  } else if (category.includes('starter')) {
    roleId = 'starter_cook';
    role = 'Starter Cook';
  } else if (category.includes('soup')) {
    roleId = 'soup_cook';
    role = 'Soup Cook';
  } else if (category.includes('sweet') || category.includes('dessert')) {
    roleId = 'sweet_halwai';
    role = 'Sweet / Halwai Cook';
  } else if (category.includes('farsan')) {
    roleId = 'farsan_cook';
    role = 'Farsan Cook';
  } else if (category.includes('bread') || category.includes('tandoor')) {
    roleId = 'bread_cook';
    role = 'Bread / Tandoor Cook';
  } else if (category.includes('chaat')) {
    roleId = 'chaat_cook';
    role = 'Chaat Cook';
  } else if (category.includes('chinese')) {
    roleId = 'chinese_cook';
    role = 'Chinese Cook';
  } else if (category.includes('south indian')) {
    roleId = 'south_indian_cook';
    role = 'South Indian Cook';
  } else if (
    category.includes('italian') ||
    category.includes('pasta') ||
    category.includes('pizza')
  ) {
    roleId = 'italian_cook';
    role = 'Italian / Pasta Cook';
  } else if (
    category.includes('live') ||
    category.includes('street food') ||
    category.includes('sizzler')
  ) {
    roleId = 'live_counter_cook';
    role = `${categoryRaw || 'Live Counter'} Cook`;
  } else if (category.includes('dal') || category.includes('kadhi')) {
    role = `${categoryRaw || 'Dal'} Cook`;
  } else if (category.includes('rice')) {
    role = `${categoryRaw || 'Rice'} Cook`;
  } else if (
    category.includes('sabji') ||
    category.includes('vegetable') ||
    category.includes('paneer') ||
    category.includes('main course') ||
    category.includes('punjabi') ||
    category.includes('gujarati') ||
    category.includes('rajasthani') ||
    category.includes('kathiyawadi')
  ) {
    role = `${categoryRaw || 'Main Course'} Cook`;
  } else if (
    category.includes('salad') ||
    category.includes('fruit') ||
    category.includes('raita')
  ) {
    roleId = 'main_course_cook';
    role = `${categoryRaw || 'Preparation'} Prep`;
  } else if (
    category.includes('ice cream') ||
    category.includes('bakery')
  ) {
    roleId = 'juice_mocktail';
    role = `${categoryRaw || 'Dessert'} Staff`;
  } else if (
    category.includes('papad') ||
    category.includes('pickle') ||
    category.includes('achar') ||
    category.includes('condiment') ||
    category.includes('chutney') ||
    category.includes('mukhwas') ||
    category.includes('paan') ||
    category.includes('pan') ||
    category.includes('water')
  ) {
    roleId = 'juice_mocktail';
    role = `${categoryRaw || 'Service'} Staff`;
  }

  const master =
    MANPOWER_ROLE_MASTER.find(
      (item) => item.id === roleId,
    );

  return {
    roleId,
    role,
    rate: Math.max(0, Number(master?.rate) || 0),
  };
}

function normalizeRole(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

const BUILT_IN_ROLE_NAMES = new Set(
  MANPOWER_ROLE_MASTER
    .flatMap((template) => [template.role, ...template.aliases])
    .map(normalizeRole),
);

function isCustomRole(row: ManpowerRow) {
  if (row.autoDishAssignment) {
    return false;
  }

  return Boolean(row.customRole) || !BUILT_IN_ROLE_NAMES.has(normalizeRole(row.role));
}

function manpowerFilterGroup(
  row: ManpowerRow,
): Exclude<ManpowerFilterGroup, 'ALL'> | 'CUSTOM' {
  if (
    row.department === 'KITCHEN' ||
    row.department === 'BREAD' ||
    row.department === 'PREPARATION'
  ) {
    return 'KITCHEN';
  }

  if (
    row.department === 'COUNTER' ||
    row.department === 'LIVE_COUNTER'
  ) {
    return 'COUNTER';
  }

  if (
    row.department === 'SERVICE' ||
    row.department === 'UTILITY' ||
    row.department === 'LOGISTICS' ||
    row.department === 'MANAGEMENT'
  ) {
    return row.department;
  }

  return 'CUSTOM';
}

const DISH_ASSIGNABLE_DEPARTMENTS = new Set([
  'LIVE_COUNTER',
  'BREAD',
  'KITCHEN',
  'PREPARATION',
]);

function canAssignDishes(row: ManpowerRow) {
  if (row.autoDishAssignment) {
    return true;
  }

  // Every user-created role can optionally handle one or more menu dishes.
  // This keeps dish responsibility manual and works for custom cooks,
  // helpers, counter staff or any other role the caterer creates.
  if (isCustomRole(row)) {
    return true;
  }

  const kitchenRole = /\b(cook|chef|halwai|helper|masi)\b/.test(
    normalizeRole(row.role),
  );

  if (!kitchenRole) return false;

  return Boolean(
    row.department && DISH_ASSIGNABLE_DEPARTMENTS.has(row.department),
  );
}

function normalizePart(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function buildMealPlans(work: WorkState): MealPlan[] {
  const meals = new Map<string, MealPlan>();
  const fallbackMealLabel =
    String(
      work.event.functionType ||
      '',
    ).trim() ||
    'Event Menu';
  const fallbackPax = Math.max(0, Number(work.event.pax) || 0);
  const menu = Array.isArray(work.menu) ? work.menu : [];

  menu.forEach((dish) => {
    const rawServiceId =
      String(
        dish.serviceId || '',
      ).trim();
    const serviceId =
      rawServiceId || undefined;
    const dayLabel =
      String(
        dish.dayLabel || '',
      ).trim();
    const mealLabel =
      String(
        dish.mealLabel ||
        fallbackMealLabel,
      ).trim() ||
      'Event Menu';
    const pax = Math.max(0, Number(dish.servicePax) || fallbackPax);
    const key = serviceId
      ? `service:${serviceId}`
      : `meal:${normalizePart(dayLabel)}::${normalizePart(mealLabel)}`;
    const existing = meals.get(key);

    if (existing) {
      existing.pax = Math.max(existing.pax, pax);
      if (!existing.dishIds.includes(dish.id)) {
        existing.dishIds.push(dish.id);
      }
      return;
    }

    meals.set(key, {
      key,
      serviceId,
      dayLabel,
      mealLabel,
      pax,
      dishIds: [dish.id],
    });
  });

  if (meals.size === 0) {
    meals.set('event:default', {
      key: 'event:default',
      dayLabel: '',
      mealLabel: fallbackMealLabel,
      pax: fallbackPax,
      dishIds: [],
    });
  }

  return Array.from(meals.values());
}

function rowBelongsToMeal(row: ManpowerRow, meal: MealPlan) {
  const rowServiceId =
    normalizePart(
      row.serviceId,
    );
  const mealServiceId =
    normalizePart(
      meal.serviceId,
    );

  if (rowServiceId && mealServiceId) {
    return rowServiceId === mealServiceId;
  }

  return (
    normalizePart(row.dayLabel) === normalizePart(meal.dayLabel) &&
    normalizePart(row.mealLabel) === normalizePart(meal.mealLabel)
  );
}

function manpowerRowsShareMeal(
  left: ManpowerRow,
  right: ManpowerRow,
) {
  const leftServiceId =
    normalizePart(
      left.serviceId,
    );
  const rightServiceId =
    normalizePart(
      right.serviceId,
    );

  if (
    leftServiceId &&
    rightServiceId
  ) {
    return (
      leftServiceId ===
      rightServiceId
    );
  }

  return (
    normalizePart(
      left.dayLabel,
    ) ===
      normalizePart(
        right.dayLabel,
      ) &&
    normalizePart(
      left.mealLabel,
    ) ===
      normalizePart(
        right.mealLabel,
      )
  );
}

function isLegacyGlobalRow(row: ManpowerRow) {
  return !(
    normalizePart(
      row.serviceId,
    ) ||
    normalizePart(
      row.dayLabel,
    ) ||
    normalizePart(
      row.mealLabel,
    )
  );
}

function buildMealManpowerRows(
  savedRows: ManpowerRow[],
  meals: MealPlan[],
  work: WorkState,
  savedCustomRoles: CustomManpowerRole[] = [],
): ManpowerRow[] {
  const safeRows = Array.isArray(savedRows) ? savedRows : [];

  return meals.flatMap((meal, mealIndex) => {
    const mealMenu = work.menu.filter((dish) => meal.dishIds.includes(dish.id));
    const inHouseMealMenu = mealMenu.filter(
      (dish) =>
        !(
          dish.vendorId &&
          dish.groceryResponsibility === 'VENDOR'
        ),
    );
    const builtInRows = generateMealManpowerRows({
      mealKey: meal.key,
      menu: mealMenu,
      guests: meal.pax,
      serviceStyle: mealMenu.find((dish) => dish.serviceStyle)?.serviceStyle,
      inputs: work.manpowerInputs,
      existingRows: safeRows,
      serviceId: meal.serviceId,
      dayLabel: meal.dayLabel,
      mealLabel: meal.mealLabel,
      allowLegacyRows: mealIndex === 0,
    });

    const eventCustomRows = safeRows
      .filter(isCustomRole)
      .filter(
        (row) =>
          rowBelongsToMeal(row, meal) ||
          (mealIndex === 0 && isLegacyGlobalRow(row)),
      )
      .map((row) => ({
        ...row,
        customRole: true,
        manualOverride: true,
        calculationSource: 'MANUAL' as const,
        rateMode: row.rateMode ?? 'PER_MEAL',
        shiftLabel: row.shiftLabel,
        serviceId: meal.serviceId,
        dayLabel: meal.dayLabel || undefined,
        mealLabel: meal.mealLabel,
        servicePax: meal.pax,
        assignedDishIds: row.assignedDishIds ?? [],
      }));

    const eventCustomNames = new Set(
      eventCustomRows.map((row) => normalizeRole(row.role)),
    );

    const permanentCustomRows = savedCustomRoles
      .filter((template) => !eventCustomNames.has(normalizeRole(template.role)))
      .map((template) => ({
        id: `${meal.key}::${template.id}`,
        role: template.role,
        quantity: 0,
        rate: template.rate,
        department:
          template.department,
        customRole: true,
        manualOverride: true,
        calculationSource: 'MANUAL' as const,
        rateMode: 'PER_MEAL' as const,
        serviceId: meal.serviceId,
        dayLabel: meal.dayLabel || undefined,
        mealLabel: meal.mealLabel,
        servicePax: meal.pax,
        assignedDishIds: [],
      } satisfies ManpowerRow));

    const categoryRecommendations =
      buildCategoryManpowerRecommendations(
        inHouseMealMenu,
        meal.pax,
      );

    const recommendationByCategory =
      new Map(
        categoryRecommendations.map(
          (item) => [
            normalizePart(
              item.category,
            ),
            item,
          ],
        ),
      );

    const groupedMenu =
      new Map<
        string,
        {
          category: string;
          dishes: MenuItem[];
        }
      >();

    sortMenuItemsByCategoryPriority(
      inHouseMealMenu,
    ).forEach((dish) => {
      const category =
        String(
          dish.category ||
          'Other',
        ).trim() ||
        'Other';
      const key =
        normalizePart(
          category,
        ) ||
        'other';
      const current =
        groupedMenu.get(
          key,
        );

      if (current) {
        current.dishes.push(
          dish,
        );
      } else {
        groupedMenu.set(
          key,
          {
            category,
            dishes: [
              dish,
            ],
          },
        );
      }
    });

    const categoryRows:
      ManpowerRow[] =
      Array.from(
        groupedMenu.entries(),
      ).map(
        ([categoryKey, group]) => {
          const spec =
            categoryProductionSpec(
              group.category,
            );

          const id =
            `${meal.key}::kitchen-category::${categoryStationKey(group.category)}`;

          const existing =
            safeRows.find(
              (row) =>
                row.id === id ||
                (
                  row.autoDishAssignment ===
                    true &&
                  rowBelongsToMeal(
                    row,
                    meal,
                  ) &&
                  normalizePart(
                    row.stationLabel,
                  ) ===
                    categoryKey
                ),
            );

          const recommendation =
            recommendationByCategory.get(
              categoryKey,
            );

          const suggestedQuantity =
            Math.max(
              1,
              Number(
                recommendation
                  ?.recommendedCooks,
              ) || 1,
            );

          return {
            id,
            role:
              spec.role,
            department:
              'KITCHEN',
            quantity:
              Math.max(
                0,
                Number(
                  existing
                    ?.quantity,
                ) || 0,
              ),
            recommendedQuantity:
              suggestedQuantity,
            rate:
              Math.max(
                0,
                Number(
                  existing?.rate,
                ) ||
                  spec.rate,
              ),
            calculationSource:
              'MANUAL',
            calculationReason:
              recommendation
                ?.reason ||
              `${group.dishes.length} dish${group.dishes.length === 1 ? '' : 'es'} in ${group.category}`,
            manualOverride:
              true,
            rateMode:
              existing
                ?.rateMode ??
              'PER_MEAL',
            serviceId:
              meal.serviceId,
            dayLabel:
              meal.dayLabel ||
              undefined,
            mealLabel:
              meal.mealLabel,
            servicePax:
              meal.pax,
            assignedDishIds:
              group.dishes.map(
                (dish) =>
                  dish.id,
              ),
            autoDishAssignment:
              true,
            autoStationHelper:
              false,
            stationLabel:
              group.category,
          } satisfies ManpowerRow;
        },
      );

    const nonCategoryBuiltInRows =
      builtInRows.filter(
        (row) =>
          !Array.from(
            CATEGORY_PRODUCTION_ROLE_IDS,
          ).some(
            (roleId) =>
              row.id.endsWith(
                `::${roleId}`,
              ),
          ),
      );

    return [
      ...categoryRows,
      ...nonCategoryBuiltInRows,
      ...eventCustomRows,
      ...permanentCustomRows,
    ];
  });
}

function money(value: number) {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

function QuantityControl({
  row,
  onChange,
}: {
  row: ManpowerRow;
  onChange: (quantity: number) => void;
}) {
  const quantity = Math.max(0, Number(row.quantity) || 0);

  return (
    <div className="manpower-quantity-control">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, quantity - 1))}
        disabled={quantity === 0}
        aria-label={`Remove one ${row.role}`}
      >
        −
      </button>
      <input
        type="number"
        min="0"
        step="1"
        inputMode="numeric"
        value={quantity || ''}
        onChange={(event) =>
          onChange(Math.max(0, Number(event.target.value) || 0))
        }
        placeholder="0"
        aria-label={`Quantity for ${row.role}`}
      />
      <button
        type="button"
        onClick={() => onChange(quantity + 1)}
        aria-label={`Add one ${row.role}`}
      >
        +
      </button>
    </div>
  );
}

function ManpowerMultiDishSelector({
  row,
  dishes,
  unavailableDishIds,
  onChange,
}: {
  row: ManpowerRow;
  dishes: MenuItem[];
  unavailableDishIds: Set<string>;
  onChange: (dishIds: string[]) => void;
}) {
  const assignedIds =
    new Set(
      row.assignedDishIds ??
      [],
    );

  const visibleDishes =
    dishes
      .filter(
        (dish) =>
          !(
            dish.vendorId &&
            dish.groceryResponsibility === 'VENDOR'
          ),
      )
      .filter(
        (dish) =>
          assignedIds.has(
            dish.id,
          ) ||
          !unavailableDishIds.has(
            dish.id,
          ),
      );

  const assignedCount =
    visibleDishes.filter(
      (dish) =>
        assignedIds.has(
          dish.id,
        ),
    ).length;

  if (!canAssignDishes(row)) {
    return (
      <span className="manpower-dish-not-applicable">
        Not applicable
      </span>
    );
  }

  return (
    <details className="manpower-dish-selector">
      <summary>
        <span>
          {assignedCount > 0
            ? `${assignedCount} dish${assignedCount === 1 ? '' : 'es'}`
            : 'Assign dishes'}
        </span>
        <small>
          Multi-dish
        </small>
      </summary>

      <div className="manpower-dish-selector-panel">
        <div className="manpower-dish-selector-note">
          <b>
            One person can cover multiple dishes
          </b>
          <small>
            Dish assignment does not change this role&apos;s quantity or cost.
          </small>
        </div>

        <div className="manpower-dish-selector-actions">
          <button
            type="button"
            disabled={
              visibleDishes.length === 0 ||
              assignedCount ===
                visibleDishes.length
            }
            onClick={() =>
              onChange(
                visibleDishes.map(
                  (dish) =>
                    dish.id,
                ),
              )
            }
          >
            Select all
          </button>

          <button
            type="button"
            disabled={
              assignedCount === 0
            }
            onClick={() =>
              onChange(
                [],
              )
            }
          >
            Clear
          </button>
        </div>

        <div className="manpower-dish-selector-list">
          {visibleDishes.map(
            (dish) => {
              const checked =
                assignedIds.has(
                  dish.id,
                );

              return (
                <label
                  key={
                    dish.id
                  }
                  className={
                    checked
                      ? 'is-selected'
                      : ''
                  }
                >
                  <input
                    type="checkbox"
                    checked={
                      checked
                    }
                    onChange={(
                      event,
                    ) => {
                      const next =
                        new Set(
                          assignedIds,
                        );

                      if (
                        event.target
                          .checked
                      ) {
                        next.add(
                          dish.id,
                        );
                      } else {
                        next.delete(
                          dish.id,
                        );
                      }

                      onChange(
                        Array.from(
                          next,
                        ),
                      );
                    }}
                  />

                  <span>
                    <b>
                      {
                        dish.name
                      }
                    </b>
                    <small>
                      {
                        dish.category ||
                        'Other'
                      }
                    </small>
                  </span>
                </label>
              );
            },
          )}
        </div>
      </div>
    </details>
  );
}

export default function ManpowerPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [work, setWork] = useState<WorkState | null>(null);
  const [selectedMealKey, setSelectedMealKey] = useState('');
  const [departmentFilter, setDepartmentFilter] =
    useState<ManpowerFilterGroup>('ALL');
  const [newRoleDrafts, setNewRoleDrafts] = useState<Record<string, NewRoleDraft>>({});
  const [roleErrors, setRoleErrors] = useState<Record<string, string>>({});
  const [roleSearch, setRoleSearch] = useState('');
  const [roleStatus, setRoleStatus] = useState<'ALL' | 'ACTIVE' | 'NEEDS_REVIEW'>('ALL');

  useEffect(() => {
    const current = getSession();

    if (!current) {
      router.replace('/login');
      return;
    }

    setSession(current);

    const savedWork = loadWork(current.tenantId);
    const meals = buildMealPlans(savedWork);
    let customRoles = loadCustomManpowerRoles(current.tenantId);

    savedWork.manpower
      .filter((row) => row.customRole)
      .forEach((row) => {
        customRoles = saveCustomManpowerRole(
          current.tenantId,
          row.role,
          row.rate,
        );
      });

    const manpower = applyManpowerRateMaster(
      current.tenantId,
      buildMealManpowerRows(
        savedWork.manpower,
        meals,
        savedWork,
        customRoles,
      ),
    );
    const nextWork: WorkState = {
      ...savedWork,
      manpower,
      extras: {
        ...savedWork.extras,
        staff: calculateManpowerCost(manpower),
      },
      updatedAt: new Date().toISOString(),
    };

    setWork(nextWork);
    saveWork(current.tenantId, nextWork);

    void syncCustomManpowerRoles(
      current.tenantId,
    ).then((syncedRoles) => {
      setWork((latestWork) => {
        if (!latestWork) return latestWork;

        const latestMeals = buildMealPlans(latestWork);
        const syncedManpower = applyManpowerRateMaster(
          current.tenantId,
          buildMealManpowerRows(
            latestWork.manpower,
            latestMeals,
            latestWork,
            syncedRoles,
          ),
        );
        const syncedWork: WorkState = {
          ...latestWork,
          manpower: syncedManpower,
          extras: {
            ...latestWork.extras,
            staff: calculateManpowerCost(syncedManpower),
          },
          updatedAt: new Date().toISOString(),
        };

        saveWork(current.tenantId, syncedWork);
        return syncedWork;
      });
    });
  }, [router]);

  const meals = useMemo(
    () => (work ? buildMealPlans(work) : []),
    [work],
  );

  const manpowerTotal = useMemo(
    () => (work ? calculateManpowerCost(work.manpower) : 0),
    [work],
  );

  const billingSummary = useMemo(
    () =>
      work
        ? buildManpowerBillingSummary(work.manpower)
        : {
            groups: [],
            rawCost: 0,
            billableCost: 0,
            savings: 0,
            sharedGroupCount: 0,
          },
    [work],
  );

  const totalPeople = useMemo(
    () =>
      work?.manpower.reduce(
        (sum, row) => sum + Math.max(0, Number(row.quantity) || 0),
        0,
      ) ?? 0,
    [work],
  );

  const activeMealKey =
    meals.some((meal) => meal.key === selectedMealKey)
      ? selectedMealKey
      : meals[0]?.key || '';

  const totalMealCovers =
    meals.reduce(
      (sum, meal) =>
        sum +
        Math.max(
          0,
          Number(meal.pax) || 0,
        ),
      0,
    );

  const manpowerPerCover =
    totalMealCovers > 0
      ? manpowerTotal /
        totalMealCovers
      : 0;

  const activeManpowerRows =
    work?.manpower.filter(
      (row) =>
        Math.max(
          0,
          Number(row.quantity) || 0,
        ) > 0,
    ) ?? [];

  function peopleForGroup(
    group:
      | 'SERVICE'
      | 'KITCHEN'
      | 'COUNTER'
      | 'UTILITY'
      | 'LOGISTICS'
      | 'MANAGEMENT',
  ) {
    return activeManpowerRows
      .filter(
        (row) =>
          manpowerFilterGroup(
            row,
          ) === group,
      )
      .reduce(
        (sum, row) =>
          sum +
          Math.max(
            0,
            Number(row.quantity) || 0,
          ),
        0,
      );
  }

  const servicePeople =
    peopleForGroup(
      'SERVICE',
    );

  const kitchenPeople =
    peopleForGroup(
      'KITCHEN',
    );

  const counterPeople =
    peopleForGroup(
      'COUNTER',
    );

  const utilityPeople =
    peopleForGroup(
      'UTILITY',
    );

  const staffedMenuDishCount =
    work?.menu.filter(
      (dish) =>
        activeManpowerRows.some(
          (row) =>
            canAssignDishes(
              row,
            ) &&
            (
              row.assignedDishIds ??
              []
            ).includes(
              dish.id,
            ),
        ),
    ).length ?? 0;

  const assignedMenuDishIds =
    new Set(
      (work?.manpower ?? [])
        .filter(
          canAssignDishes,
        )
        .flatMap(
          (row) =>
            row.assignedDishIds ??
            [],
        ),
    );

  const unassignedMenuDishCount =
    work?.menu.filter(
      (dish) =>
        !assignedMenuDishIds.has(
          dish.id,
        ),
    ).length ?? 0;

  const zeroQuantityAssignedRoleCount =
    (work?.manpower ?? []).filter(
      (row) =>
        canAssignDishes(row) &&
        Math.max(
          0,
          Number(row.quantity) || 0,
        ) === 0 &&
        (
          row.assignedDishIds ??
          []
        ).length > 0,
    ).length;

  const missingRateRoleCount =
    activeManpowerRows.filter(
      (row) =>
        !(Math.max(0, Number(row.rate) || 0) > 0),
    ).length;

  const recommendationGapCount =
    (work?.manpower ?? []).filter(
      (row) =>
        !isCustomRole(row) &&
        manpowerGap(row) !== 0,
    ).length;

  const dishCoveragePercent =
    (work?.menu.length ?? 0) > 0
      ? Math.round(
          (staffedMenuDishCount /
            Math.max(1, work?.menu.length ?? 1)) *
            100,
        )
      : 100;

  const manpowerAttentionCount =
    unassignedMenuDishCount +
    zeroQuantityAssignedRoleCount +
    missingRateRoleCount +
    recommendationGapCount;


  const rateReadyRoleCount =
    activeManpowerRows.filter(
      (row) =>
        Math.max(
          0,
          Number(row.rate) || 0,
        ) > 0,
    ).length;

  const manpowerRateCoveragePercent =
    activeManpowerRows.length > 0
      ? Math.round(
          (
            rateReadyRoleCount /
            activeManpowerRows.length
          ) *
            100,
        )
      : (work?.menu.length ?? 0) > 0
        ? 0
        : 100;

  const dishAssignedRows =
    (work?.manpower ?? []).filter(
      (row) =>
        canAssignDishes(row) &&
        (
          row.assignedDishIds ??
          []
        ).length > 0,
    );

  const positiveDishAssignedRows =
    dishAssignedRows.filter(
      (row) =>
        Math.max(
          0,
          Number(row.quantity) || 0,
        ) > 0,
    ).length;

  const manpowerQuantityCoveragePercent =
    dishAssignedRows.length > 0
      ? Math.round(
          (
            positiveDishAssignedRows /
            dishAssignedRows.length
          ) *
            100,
        )
      : (work?.menu.length ?? 0) > 0
        ? 0
        : 100;

  const manpowerReadinessPercent =
    Math.round(
      (
        dishCoveragePercent +
        manpowerRateCoveragePercent +
        manpowerQuantityCoveragePercent
      ) /
        3,
    );

  function rowsForMeal(meal: MealPlan) {
    return work?.manpower.filter((row) => rowBelongsToMeal(row, meal)) ?? [];
  }

  function persistRows(rows: ManpowerRow[]) {
    if (!work || !session) return;

    const nextWork: WorkState = {
      ...work,
      manpower: rows,
      extras: {
        ...work.extras,
        staff: calculateManpowerCost(rows),
      },
      sellingPricePerPlate: 0,
      updatedAt: new Date().toISOString(),
    };

    setWork(nextWork);
    saveWork(session.tenantId, nextWork);
  }

  function updateRow(id: string, patch: Partial<ManpowerRow>) {
    if (!work) return;

    const currentRow = work.manpower.find((row) => row.id === id);
    if (
      session &&
      currentRow &&
      isCustomRole(currentRow) &&
      patch.rate !== undefined
    ) {
      saveCustomManpowerRole(
        session.tenantId,
        currentRow.role,
        patch.rate,
        currentRow.department,
      );
    }

    persistRows(
      work.manpower.map((row) =>
        row.id === id ? { ...row, ...patch } : row,
      ),
    );
  }

  function setRowDishAssignments(
    row: ManpowerRow,
    dishIds: string[],
  ) {
    if (!work) return;

    const assignedElsewhere =
      new Set(
        work.manpower
          .filter(
            (otherRow) =>
              otherRow.id !==
                row.id &&
              canAssignDishes(
                otherRow,
              ) &&
              manpowerRowsShareMeal(
                row,
                otherRow,
              ),
          )
          .flatMap(
            (otherRow) =>
              otherRow.assignedDishIds ??
              [],
          ),
      );

    const uniqueDishIds =
      dishIds.filter(
        (dishId) =>
          !assignedElsewhere.has(
            dishId,
          ),
      );

    updateRow(row.id, {
      assignedDishIds:
        uniqueDishIds,
      manualOverride: true,
      calculationSource: 'MANUAL',
    });
  }

  function updateNewRoleDraft(mealKey: string, patch: Partial<NewRoleDraft>) {
    setNewRoleDrafts((current) => ({
      ...current,
      [mealKey]: {
        ...(current[mealKey] || { role: '', category: 'SERVICE', rate: '' }),
        ...patch,
      },
    }));
    setRoleErrors((current) => ({ ...current, [mealKey]: '' }));
  }

  function addStaffRole(meal: MealPlan) {
    if (!work || !session) return;

    const draft = newRoleDrafts[meal.key] || { role: '', category: 'SERVICE', rate: '' };
    const role = draft.role.trim().replace(/\s+/g, ' ');
    const mealRows = rowsForMeal(meal);

    if (!role) {
      setRoleErrors((current) => ({ ...current, [meal.key]: 'Enter a staff role name.' }));
      return;
    }

    if (mealRows.some((row) => normalizeRole(row.role) === normalizeRole(role))) {
      setRoleErrors((current) => ({ ...current, [meal.key]: 'This role is already in the meal.' }));
      return;
    }

    const newRow: ManpowerRow = {
      id: uid('manpower_custom'),
      role,
      quantity: 1,
      rate: Math.max(0, Number(draft.rate) || 0),
      department:
        draft.category as
          ManpowerDepartment,
      customRole: true,
      rateMode: 'PER_MEAL',
      serviceId: meal.serviceId,
      dayLabel: meal.dayLabel || undefined,
      mealLabel: meal.mealLabel,
      servicePax: meal.pax,
      assignedDishIds: [],
      manualOverride: true,
      calculationSource: 'MANUAL',
    };

    saveCustomManpowerRole(
      session.tenantId,
      role,
      newRow.rate,
      newRow.department,
    );
    persistRows([...work.manpower, newRow]);

    // Keep the newly added role visible so the next action can be
    // assigning one or multiple dishes from the Dishes column.
    setDepartmentFilter(
      draft.category,
    );
    setRoleStatus(
      'ACTIVE',
    );

    setNewRoleDrafts((current) => ({
      ...current,
      [meal.key]: { role: '', category: 'SERVICE', rate: '' },
    }));
    setRoleErrors((current) => ({ ...current, [meal.key]: '' }));
  }

  function removeStaffRole(rowToRemove: ManpowerRow) {
    if (!work || !session) return;

    deleteCustomManpowerRole(session.tenantId, rowToRemove.role);
    const normalizedRole = normalizeRole(rowToRemove.role);
    persistRows(
      work.manpower.filter(
        (row) => !(isCustomRole(row) && normalizeRole(row.role) === normalizedRole),
      ),
    );
  }

  function applyMasterRates() {
    if (!work || !session) return;

    const rows = applyManpowerRateMaster(
      session.tenantId,
      work.manpower,
      true,
    );

    persistRows(rows);
  }

  function updateRateMode(
    row: ManpowerRow,
    rateMode: 'PER_MEAL' | 'PER_SHIFT' | 'PER_DAY',
  ) {
    updateRow(row.id, {
      rateMode,
      shiftLabel:
        rateMode === 'PER_SHIFT'
          ? row.shiftLabel || inferManpowerShift(row)
          : row.shiftLabel,
      manualOverride: true,
      calculationSource: 'MANUAL',
    });
  }

  function continueToExpenses() {
    if (!work || !session) return;

    saveWork(session.tenantId, {
      ...work,
      extras: {
        ...work.extras,
        staff: calculateManpowerCost(work.manpower),
      },
      updatedAt: new Date().toISOString(),
    });

    window.location.assign('/app/operations');
  }
  function manpowerGap(row: ManpowerRow) {
    const selected = Math.max(0, Number(row.quantity) || 0);
    const recommended = Math.max(0, Number(row.recommendedQuantity) || 0);
    return selected - recommended;
  }

  function applyRoleRecommendation(row: ManpowerRow) {
    updateRow(row.id, {
      quantity: Math.max(0, Number(row.recommendedQuantity) || 0),
      manualOverride: true,
      calculationSource: 'MANUAL',
    });
  }

  if (!work) {
    return (
      <AppShell title="Manpower" subtitle="Set manpower manually for each meal">
        <div className="loader-card">Loading manpower…</div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Manpower"
      subtitle="Select manpower manually for each meal. Nothing is added automatically."
      hidePageTitle
    >
      <section className="content-grid manpower-page manpower-page-modern">
        <div className="manpower-overview manpower-overview-v2">
          <div className="manpower-overview-copy">
            <span className="page-eyebrow">Manpower control center</span>
            <h2>Plan every person, role and kitchen responsibility</h2>
            <p>
              Build each function team manually, assign kitchen dishes, verify rates and see staffing gaps before the event moves to Operations.
            </p>
          </div>

          <div className="manpower-overview-total">
            <div className="manpower-overview-metric-row">
              <div
                className="manpower-readiness-ring"
                style={{
                  background:
                    `conic-gradient(${manpowerReadinessPercent === 100 ? '#55d98f' : '#4a9cff'} ${manpowerReadinessPercent * 3.6}deg, #25303d 0deg)`,
                }}
                aria-label={`Manpower readiness ${manpowerReadinessPercent}%`}
              >
                <span>
                  <b>
                    {manpowerReadinessPercent}%
                  </b>
                  <small>
                    Ready
                  </small>
                </span>
              </div>

              <div className="manpower-overview-cost">
                <span>Total manpower cost</span>
                <b>{money(manpowerTotal)}</b>
                <small>
                  {meals.length} meal{meals.length === 1 ? '' : 's'} · {totalPeople} people · {money(manpowerPerCover)} / cover
                  {billingSummary.savings > 0 ? ` · ${money(billingSummary.savings)} saved` : ''}
                </small>
              </div>
            </div>

            <div className="manpower-overview-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => router.push('/app/manpower-rates')}
              >
                Rate Master
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => router.push('/app/uniforms')}
              >
                Dress & Uniform
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => router.push('/app/event-planning')}
              >
                Assign Agency
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={applyMasterRates}
              >
                Apply Master Rates
              </button>
              <button
                className="primary-button workflow-overview-button"
                type="button"
                onClick={continueToExpenses}
              >
                Continue to Operations
              </button>
            </div>
          </div>
        </div>

        <section className="manpower-meal-selector" aria-label="Choose a meal to staff">
          <div className="manpower-meal-selector-head">
            <div>
              <div className="section-kicker">Plan one meal at a time</div>
              <h3>Choose a meal</h3>
            </div>
            <span className="manpower-meal-selector-count">
              {meals.length} meal{meals.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="manpower-meal-tabs">
            {meals.map((meal, index) => {
              const tabRows = rowsForMeal(meal);
              const staffedDishes = meal.dishIds.filter((dishId) =>
                tabRows.some(
                  (row) =>
                    canAssignDishes(row) &&
                    Math.max(0, Number(row.quantity) || 0) > 0 &&
                    (row.assignedDishIds ?? []).includes(dishId),
                ),
              ).length;

              return (
                <button
                  className={`manpower-meal-tab ${meal.key === activeMealKey ? 'is-active' : ''}`}
                  type="button"
                  key={meal.key}
                  onClick={() => {
                    setSelectedMealKey(meal.key);
                  }}
                  aria-pressed={meal.key === activeMealKey}
                >
                  <span className="manpower-meal-tab-icon">{index + 1}</span>
                  <span className="manpower-meal-tab-copy">
                    <small>{meal.dayLabel || `Meal ${index + 1}`}</small>
                    <b>{meal.mealLabel}</b>
                    <em>
                      {meal.pax.toLocaleString('en-IN')} guests · {staffedDishes}/{meal.dishIds.length} dishes staffed
                    </em>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <div className="manpower-desktop-workspace">
        {meals.filter((meal) => meal.key === activeMealKey).map((meal) => {
          const mealIndex = meals.findIndex((item) => item.key === meal.key);
          const mealRows = rowsForMeal(meal);
          const departmentRows =
            departmentFilter === 'ALL'
              ? mealRows
              : mealRows.filter(
                  (row) =>
                    manpowerFilterGroup(row) ===
                    departmentFilter,
                );
          const roleQuery = roleSearch.trim().toLocaleLowerCase('en-IN');
          const filteredMealRows = departmentRows.filter((row) => {
            const matchesSearch =
              !roleQuery ||
              row.role.toLocaleLowerCase('en-IN').includes(roleQuery) ||
              String(row.department || '').toLocaleLowerCase('en-IN').includes(roleQuery);

            const gap = manpowerGap(row);
            const matchesStatus =
              roleStatus === 'ALL'
                ? true
                : roleStatus === 'ACTIVE'
                  ? Math.max(0, Number(row.quantity) || 0) > 0
                  : gap !== 0 ||
                    (
                      canAssignDishes(row) &&
                      (row.assignedDishIds ?? []).length > 0 &&
                      Math.max(0, Number(row.quantity) || 0) === 0
                    );

            return matchesSearch && matchesStatus;
          });
          const mealDishes = work.menu.filter((dish) =>
            meal.dishIds.includes(dish.id),
          );
          const newRoleDraft = newRoleDrafts[meal.key] || { role: '', category: 'SERVICE', rate: '' };
          const mealTotal = calculateManpowerCost(mealRows);
          const mealPeople = mealRows.reduce(
            (sum, row) => sum + Math.max(0, Number(row.quantity) || 0),
            0,
          );
          const mealActiveRows = mealRows.filter(
            (row) => Math.max(0, Number(row.quantity) || 0) > 0,
          );
          const mealMissingRateCount = mealActiveRows.filter(
            (row) => !(Math.max(0, Number(row.rate) || 0) > 0),
          ).length;
          const mealServicePeople = mealActiveRows
            .filter((row) => manpowerFilterGroup(row) === 'SERVICE')
            .reduce((sum, row) => sum + Math.max(0, Number(row.quantity) || 0), 0);
          const mealKitchenPeople = mealActiveRows
            .filter((row) => manpowerFilterGroup(row) === 'KITCHEN')
            .reduce((sum, row) => sum + Math.max(0, Number(row.quantity) || 0), 0);
          const mealUtilityPeople = mealActiveRows
            .filter((row) => manpowerFilterGroup(row) === 'UTILITY')
            .reduce((sum, row) => sum + Math.max(0, Number(row.quantity) || 0), 0);
          const sharedRateRows = mealRows.filter(
            (row) =>
              getManpowerRateMode(row) !== 'PER_MEAL' &&
              Math.max(0, Number(row.quantity) || 0) > 0,
          );
          const sharedRateCount = sharedRateRows.length;
          const mealRecommendedPeople = mealRows.reduce(
            (sum, row) => sum + Math.max(0, Number(row.recommendedQuantity) || 0),
            0,
          );
          const reviewRoleCount = mealRows.filter(
            (row) =>
              !isCustomRole(row) &&
              manpowerGap(row) !== 0,
          ).length;
          const mealTitle = [meal.dayLabel, meal.mealLabel]
            .filter(Boolean)
            .join(' · ');
          const staffedDishCount = mealDishes.filter((dish) =>
            mealRows.some(
              (row) =>
                canAssignDishes(row) &&
                Math.max(0, Number(row.quantity) || 0) > 0 &&
                (row.assignedDishIds ?? []).includes(dish.id),
            ),
          ).length;

          return (
            <div className="glass-card manpower-planner-card" key={meal.key}>
              <div className="section-head manpower-planner-heading">
                <div>
                  <div className="section-kicker">
                    Meal {mealIndex + 1} · {meal.pax.toLocaleString('en-IN')} guests
                  </div>
                  <h2>{mealTitle || `Meal ${mealIndex + 1}`}</h2>
                  <p className="muted">
                    Enter manpower only for this meal. Meal manpower total: {money(mealTotal)} · {mealPeople} people
                  </p>
                </div>
                <div className="manpower-meal-health">
                  <span className={mealDishes.length > 0 && staffedDishCount === mealDishes.length ? 'is-complete' : ''}>
                    <b>{staffedDishCount}/{mealDishes.length}</b>
                    dishes staffed
                  </span>
                  <span>
                    <b>{mealPeople}</b>
                    selected people
                  </span>
                  <span className={reviewRoleCount > 0 ? 'needs-attention' : 'is-complete'}>
                    <b>{mealRecommendedPeople}</b>
                    recommended people
                  </span>
                  <span className={reviewRoleCount > 0 ? 'needs-attention' : ''}>
                    <b>{reviewRoleCount}</b>
                    roles differ
                  </span>
                  <span>
                    <b>{sharedRateCount}</b>
                    shared-rate roles
                  </span>
                  <span>
                    <b>{money(mealTotal)}</b>
                    meal cost
                  </span>
                </div>
              </div>

              <section className="manpower-meal-control-strip no-print" aria-label="Selected meal manpower summary">
                <div>
                  <span>Selected</span>
                  <b>{mealPeople}</b>
                  <small>people</small>
                </div>
                <div>
                  <span>Service</span>
                  <b>{mealServicePeople}</b>
                  <small>people</small>
                </div>
                <div>
                  <span>Kitchen</span>
                  <b>{mealKitchenPeople}</b>
                  <small>people</small>
                </div>
                <div>
                  <span>Utility</span>
                  <b>{mealUtilityPeople}</b>
                  <small>people</small>
                </div>
                <div>
                  <span>Dish coverage</span>
                  <b className={staffedDishCount === mealDishes.length ? 'is-ready' : 'needs-attention'}>
                    {staffedDishCount}/{mealDishes.length}
                  </b>
                  <small>staffed</small>
                </div>
                <div>
                  <span>Missing rate</span>
                  <b className={mealMissingRateCount > 0 ? 'needs-attention' : 'is-ready'}>
                    {mealMissingRateCount}
                  </b>
                  <small>active roles</small>
                </div>
                <div>
                  <span>Meal cost</span>
                  <b>{money(mealTotal)}</b>
                  <small>{meal.pax > 0 ? `${money(mealTotal / meal.pax)} / guest` : 'No guests'}</small>
                </div>
              </section>

              <div className="manpower-roster-heading">
                <div>
                  <h3>Meal team &amp; rates</h3>
                  <p>Review service, kitchen and utility quantities for this meal.</p>
                </div>
                <span>{mealRows.filter((row) => Number(row.quantity) > 0).length} active roles</span>
              </div>

              <div className="manpower-department-filters no-print" aria-label="Filter manpower departments">
                {MANPOWER_FILTERS.map((filter) => {
                  const count =
                    filter.key === 'ALL'
                      ? mealRows.length
                      : mealRows.filter(
                          (row) =>
                            manpowerFilterGroup(row) ===
                            filter.key,
                        ).length;

                  return (
                    <button
                      key={filter.key}
                      type="button"
                      className={departmentFilter === filter.key ? 'active' : ''}
                      aria-pressed={departmentFilter === filter.key}
                      onClick={() =>
                        setDepartmentFilter(
                          filter.key,
                        )
                      }
                    >
                      <span>{filter.label}</span>
                      <b>{count}</b>
                    </button>
                  );
                })}
              </div>

              <div
                className="no-print manpower-role-toolbar"
              >
                <label className="field">
                  <span>Find manpower role</span>
                  <input
                    className="input"
                    type="search"
                    value={roleSearch}
                    placeholder="Search waiter, cook, helper..."
                    onChange={(event) => setRoleSearch(event.target.value)}
                  />
                </label>
                <button
                  className={roleStatus === 'ACTIVE' ? 'primary-button' : 'secondary-button'}
                  type="button"
                  onClick={() => setRoleStatus(roleStatus === 'ACTIVE' ? 'ALL' : 'ACTIVE')}
                >
                  Active roles
                </button>
                <button
                  className={roleStatus === 'NEEDS_REVIEW' ? 'primary-button' : 'secondary-button'}
                  type="button"
                  onClick={() => setRoleStatus(roleStatus === 'NEEDS_REVIEW' ? 'ALL' : 'NEEDS_REVIEW')}
                >
                  Needs review {reviewRoleCount}
                </button>
              </div>

              {filteredMealRows.length === 0 ? (
                <div className="manpower-menu-empty" style={{ marginBottom: 12 }}>
                  <b>No matching manpower roles</b>
                  <span>Clear filters or search to show all roles for this meal.</span>
                </div>
              ) : null}

              <div className="table-wrap manpower-table-wrap">
                <table className="manpower-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Manpower</th>
                      <th>Dishes</th>
                      <th>Quantity</th>
                      <th>Status</th>
                      <th>Billing</th>
                      <th>Rate / person</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMealRows.map((row, index) => (
                      <tr
                        key={row.id}
                        className={Number(row.quantity) > 0 ? 'is-active' : ''}
                      >
                        <td><b>{index + 1}</b></td>
                        <td>
                          <div className="manpower-role-name-cell">
                            <div>
                              <b>{row.role}</b>
                              {!isCustomRole(row) && Number(row.recommendedQuantity) >= 0 ? (
                                <small className="muted" style={{ display: 'block', marginTop: 3 }}>
                                  Recommended: {Math.max(0, Number(row.recommendedQuantity) || 0)}
                                  {row.calculationReason ? ` · ${row.calculationReason}` : ''}
                                </small>
                              ) : null}
                              {row.department ? (
                                <span className="manpower-department-badge">
                                  {row.department.replace(/_/g, ' ')}
                                </span>
                              ) : (
                                <span className="manpower-department-badge custom">
                                  Custom
                                </span>
                              )}
                            </div>
                            {isCustomRole(row) ? (
                              <button
                                className="manpower-remove-button"
                                type="button"
                                onClick={() => removeStaffRole(row)}
                                aria-label={`Remove ${row.role}`}
                              >
                                Delete
                              </button>
                            ) : null}
                          </div>
                        </td>
                        <td>
                          {canAssignDishes(row) ? (
                            <ManpowerMultiDishSelector
                              row={row}
                              dishes={mealDishes}
                              unavailableDishIds={
                                new Set(
                                  mealRows
                                    .filter(
                                      (otherRow) =>
                                        otherRow.id !==
                                          row.id &&
                                        canAssignDishes(
                                          otherRow,
                                        ),
                                    )
                                    .flatMap(
                                      (otherRow) =>
                                        otherRow.assignedDishIds ??
                                        [],
                                    ),
                                )
                              }
                              onChange={(dishIds) =>
                                setRowDishAssignments(
                                  row,
                                  dishIds,
                                )
                              }
                            />
                          ) : (
                            <span className="manpower-dish-not-applicable">
                              —
                            </span>
                          )}
                        </td>
                        <td>
                          <QuantityControl
                            row={row}
                            onChange={(quantity) => updateRow(row.id, { quantity, manualOverride: true, calculationSource: 'MANUAL' })}
                          />
                        </td>
                        <td>
                          {isCustomRole(row) ? (
                            <span className="muted">Manual</span>
                          ) : manpowerGap(row) === 0 ? (
                            <span className="manpower-role-status ready">Ready</span>
                          ) : (
                            <div style={{ display: 'grid', gap: 6 }}>
                              <span className="manpower-role-status attention">
                                {manpowerGap(row) > 0
                                  ? `+${manpowerGap(row)} above plan`
                                  : `${Math.abs(manpowerGap(row))} below plan`}
                              </span>
                              <button
                                className="ghost-button"
                                type="button"
                                onClick={() => applyRoleRecommendation(row)}
                                style={{ padding: '6px 8px' }}
                              >
                                Use {Math.max(0, Number(row.recommendedQuantity) || 0)}
                              </button>
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'grid', gap: 6, minWidth: 150 }}>
                            <select
                              className="input"
                              value={getManpowerRateMode(row)}
                              onChange={(event) =>
                                updateRateMode(
                                  row,
                                  event.target.value as 'PER_MEAL' | 'PER_SHIFT' | 'PER_DAY',
                                )
                              }
                              aria-label={`Billing mode for ${row.role}`}
                            >
                              <option value="PER_MEAL">Per Meal</option>
                              <option value="PER_SHIFT">Per Shift</option>
                              <option value="PER_DAY">Per Day</option>
                            </select>
                            {getManpowerRateMode(row) === 'PER_SHIFT' ? (
                              <input
                                className="input"
                                value={row.shiftLabel || inferManpowerShift(row)}
                                placeholder="Morning / Afternoon / Evening"
                                onChange={(event) =>
                                  updateRow(row.id, {
                                    shiftLabel: event.target.value,
                                    manualOverride: true,
                                    calculationSource: 'MANUAL',
                                  })
                                }
                                aria-label={`Shift label for ${row.role}`}
                              />
                            ) : null}
                            <small className="muted">
                              {manpowerRateModeLabel(row)}
                            </small>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'grid', gap: 4 }}>
                            <small className="muted">
                              {row.rateManualOverride ? 'Event rate' : 'Master rate'}
                            </small>
                            <label className="manpower-rate-input">
                            <span aria-hidden="true">₹</span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              inputMode="decimal"
                              value={row.rate || ''}
                              onChange={(event) =>
                                updateRow(row.id, {
                                  rate: Math.max(0, Number(event.target.value) || 0),
                                  rateManualOverride: true,
                                })
                              }
                              aria-label={`Rate for ${row.role} in ${meal.mealLabel}`}
                            />
                            </label>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'grid', gap: 3 }}>
                            <strong>{money(manpowerBillableCost(row, work.manpower))}</strong>
                            {manpowerIncludedInSharedRate(row, work.manpower) ? (
                              <small className="muted">Included in shared {getManpowerRateMode(row) === 'PER_DAY' ? 'day' : 'shift'} team</small>
                            ) : getManpowerRateMode(row) !== 'PER_MEAL' ? (
                              <small className="muted">Shared billing leader · raw {money(manpowerRawCost(row))}</small>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="manpower-role-cards">
                {filteredMealRows.map((row, index) => (
                  <article
                    key={row.id}
                    className={`manpower-role-card ${Number(row.quantity) > 0 ? 'is-active' : ''}`}
                  >
                    <div className="manpower-role-card-heading">
                      <div>
                        <small>
                          #{index + 1}
                          {row.department ? ` · ${row.department.replace(/_/g, ' ')}` : ''}
                        </small>
                        <b>{row.role}</b>
                        {!isCustomRole(row) ? (
                          <small className={manpowerGap(row) === 0 ? 'muted' : 'needs-attention'}>
                            Recommended {Math.max(0, Number(row.recommendedQuantity) || 0)}
                            {manpowerGap(row) === 0
                              ? ' · matched'
                              : manpowerGap(row) > 0
                                ? ` · +${manpowerGap(row)} above`
                                : ` · ${Math.abs(manpowerGap(row))} below`}
                          </small>
                        ) : null}

                      </div>
                      {isCustomRole(row) ? (
                        <button
                          className="manpower-remove-button"
                          type="button"
                          onClick={() => removeStaffRole(row)}
                          aria-label={`Remove ${row.role}`}
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>

                    {canAssignDishes(row) ? (
                      <div className="manpower-mobile-dish-field">
                        <label>
                          Dishes handled
                        </label>
                        <ManpowerMultiDishSelector
                          row={row}
                          dishes={mealDishes}
                          unavailableDishIds={
                            new Set(
                              mealRows
                                .filter(
                                  (otherRow) =>
                                    otherRow.id !==
                                      row.id &&
                                    canAssignDishes(
                                      otherRow,
                                    ),
                                )
                                .flatMap(
                                  (otherRow) =>
                                    otherRow.assignedDishIds ??
                                    [],
                                ),
                            )
                          }
                          onChange={(dishIds) =>
                            setRowDishAssignments(
                              row,
                              dishIds,
                            )
                          }
                        />
                      </div>
                    ) : null}

                    <div className="manpower-role-card-fields">
                      <div className="field">
                        <label>Quantity</label>
                        <QuantityControl
                          row={row}
                          onChange={(quantity) => updateRow(row.id, { quantity, manualOverride: true, calculationSource: 'MANUAL' })}
                        />
                      </div>

                      <div className="field">
                        <label htmlFor={`rate-${row.id}`}>Rate / person</label>
                        <label className="manpower-rate-input" htmlFor={`rate-${row.id}`}>
                          <span aria-hidden="true">₹</span>
                          <input
                            id={`rate-${row.id}`}
                            type="number"
                            min="0"
                            step="1"
                            inputMode="decimal"
                            value={row.rate || ''}
                            onChange={(event) =>
                              updateRow(row.id, {
                                rate: Math.max(0, Number(event.target.value) || 0),
                                rateManualOverride: true,
                              })
                            }
                          />
                        </label>
                      </div>
                    </div>

                    {!isCustomRole(row) && manpowerGap(row) !== 0 ? (
                      <button
                        className="ghost-button"
                        type="button"
                        onClick={() => applyRoleRecommendation(row)}
                      >
                        Use recommended quantity {Math.max(0, Number(row.recommendedQuantity) || 0)}
                      </button>
                    ) : null}

                    <div className="field">
                      <label>Billing mode</label>
                      <select
                        className="input"
                        value={getManpowerRateMode(row)}
                        onChange={(event) =>
                          updateRateMode(
                            row,
                            event.target.value as 'PER_MEAL' | 'PER_SHIFT' | 'PER_DAY',
                          )
                        }
                      >
                        <option value="PER_MEAL">Per Meal</option>
                        <option value="PER_SHIFT">Per Shift</option>
                        <option value="PER_DAY">Per Day</option>
                      </select>
                    </div>

                    {getManpowerRateMode(row) === 'PER_SHIFT' ? (
                      <label className="field">
                        <span>Shift</span>
                        <input
                          className="input"
                          value={row.shiftLabel || inferManpowerShift(row)}
                          placeholder="Morning / Afternoon / Evening"
                          onChange={(event) =>
                            updateRow(row.id, {
                              shiftLabel: event.target.value,
                              manualOverride: true,
                              calculationSource: 'MANUAL',
                            })
                          }
                        />
                      </label>
                    ) : null}

                    <div className="manpower-role-card-total">
                      <span>Total</span>
                      <strong>{money(manpowerBillableCost(row, work.manpower))}</strong>
                    </div>
                    {manpowerIncludedInSharedRate(row, work.manpower) ? (
                      <small className="muted">
                        Included in shared {getManpowerRateMode(row) === 'PER_DAY' ? 'day' : 'shift'} team
                      </small>
                    ) : getManpowerRateMode(row) !== 'PER_MEAL' ? (
                      <small className="muted">
                        {manpowerRateModeLabel(row)} · raw {money(manpowerRawCost(row))}
                      </small>
                    ) : null}
                  </article>
                ))}
              </div>

              <form
                id={`manpower-add-role-${meal.key}`}
                className="manpower-add-role"
                onSubmit={(event) => {
                  event.preventDefault();
                  addStaffRole(meal);
                }}
              >
                <div className="manpower-add-role-copy">
                  <b>Add staff role</b>
                  <small>Add the role, then assign one or multiple dishes from the Dishes column.</small>
                </div>
                <label className="field">
                  <span>Role name</span>
                  <input
                    className="input"
                    value={newRoleDraft.role}
                    onChange={(event) => updateNewRoleDraft(meal.key, { role: event.target.value })}
                    placeholder="e.g. Dessert Helper"
                  />
                </label>
                <label className="field">
                  <span>Category</span>
                  <select
                    className="input"
                    value={newRoleDraft.category}
                    onChange={(event) =>
                      updateNewRoleDraft(
                        meal.key,
                        {
                          category:
                            event.target.value as
                              Exclude<
                                ManpowerFilterGroup,
                                'ALL'
                              >,
                        },
                      )
                    }
                  >
                    {STAFF_ROLE_CATEGORIES.map(
                      (category) => (
                        <option
                          key={category.value}
                          value={category.value}
                        >
                          {category.label}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <label className="field">
                  <span>Rate / person</span>
                  <div className="manpower-rate-input">
                    <span aria-hidden="true">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      inputMode="decimal"
                      value={newRoleDraft.rate}
                      onChange={(event) => updateNewRoleDraft(meal.key, { rate: event.target.value })}
                      placeholder="0"
                      aria-label="Rate for new staff role"
                    />
                  </div>
                </label>
                <button className="secondary-button" type="submit">
                  + Add role
                </button>
                {roleErrors[meal.key] ? (
                  <p className="manpower-add-role-error" role="alert">{roleErrors[meal.key]}</p>
                ) : null}
              </form>
            </div>
          );
        })}

          <aside className="manpower-desktop-summary no-print" aria-label="Manpower costing summary">
            <div className="manpower-desktop-summary-head">
              <span>Total manpower cost</span>
              <strong>{money(manpowerTotal)}</strong>
              <small>{money(manpowerPerCover)} per function cover</small>
              {billingSummary.savings > 0 ? (
                <small style={{ display: 'block', marginTop: 4 }}>
                  Raw per-meal {money(billingSummary.rawCost)} · saved {money(billingSummary.savings)}
                </small>
              ) : null}
            </div>

            <div className="manpower-desktop-readiness">
              <div>
                <span>Overall readiness</span>
                <b>{manpowerReadinessPercent}%</b>
              </div>
              <div>
                <span>Rate coverage</span>
                <b>{manpowerRateCoveragePercent}%</b>
              </div>
            </div>

            <div className="manpower-desktop-summary-grid">
              <div>
                <span>People</span>
                <b>{totalPeople}</b>
              </div>
              <div>
                <span>Meals</span>
                <b>{meals.length}</b>
              </div>
              <div>
                <span>Active roles</span>
                <b>{activeManpowerRows.length}</b>
              </div>
              <div>
                <span>Dishes staffed</span>
                <b>{staffedMenuDishCount}/{work.menu.length}</b>
              </div>
              <div>
                <span>Unassigned dishes</span>
                <b className={unassignedMenuDishCount > 0 ? 'needs-attention' : ''}>
                  {unassignedMenuDishCount}
                </b>
              </div>
              <div>
                <span>Roles need qty</span>
                <b className={zeroQuantityAssignedRoleCount > 0 ? 'needs-attention' : ''}>
                  {zeroQuantityAssignedRoleCount}
                </b>
              </div>
              <div>
                <span>Recommendation gaps</span>
                <b className={work.manpower.filter((row) => !isCustomRole(row) && manpowerGap(row) !== 0).length > 0 ? 'needs-attention' : ''}>
                  {work.manpower.filter((row) => !isCustomRole(row) && manpowerGap(row) !== 0).length}
                </b>
              </div>
              <div>
                <span>Shared shift/day roles</span>
                <b>
                  {work.manpower.filter(
                    (row) =>
                      getManpowerRateMode(row) !== 'PER_MEAL' &&
                      Math.max(0, Number(row.quantity) || 0) > 0,
                  ).length}
                </b>
              </div>
            </div>

            <div className="manpower-desktop-team-split">
              <div>
                <span>Service</span>
                <b>{servicePeople}</b>
              </div>
              <div>
                <span>Counter</span>
                <b>{counterPeople}</b>
              </div>
              <div>
                <span>Kitchen</span>
                <b>{kitchenPeople}</b>
              </div>
              <div>
                <span>Utility</span>
                <b>{utilityPeople}</b>
              </div>
            </div>

            <div className="manpower-manual-note">
              <span aria-hidden="true">✓</span>
              <div>
                <b>Manual-only manpower</b>
                <small>No role quantity is selected automatically.</small>
              </div>
            </div>

            {billingSummary.groups.some((group) => group.mode !== 'PER_MEAL') ? (
              <div className="manpower-review-ready">
                <div>
                  <b>Shared billing groups</b>
                  <small>
                    {billingSummary.sharedGroupCount} shared group{billingSummary.sharedGroupCount === 1 ? '' : 's'} · {money(billingSummary.savings)} saved
                  </small>
                </div>
              </div>
            ) : null}

            {unassignedMenuDishCount > 0 ||
            zeroQuantityAssignedRoleCount > 0 ? (
              <div className="manpower-review-warning">
                <b>Review before Operations</b>
                <small>
                  {unassignedMenuDishCount > 0
                    ? `${unassignedMenuDishCount} dish${unassignedMenuDishCount === 1 ? '' : 'es'} unassigned`
                    : 'All dishes assigned'}
                  {' · '}
                  {zeroQuantityAssignedRoleCount > 0
                    ? `${zeroQuantityAssignedRoleCount} role${zeroQuantityAssignedRoleCount === 1 ? '' : 's'} need quantity`
                    : 'All assigned roles have quantity'}
                </small>
              </div>
            ) : (
              <div className="manpower-review-ready">
                <span aria-hidden="true">✓</span>
                <div>
                  <b>Coverage ready</b>
                  <small>All dishes are assigned and every assigned role has quantity.</small>
                </div>
              </div>
            )}

            <button
              className="primary-button manpower-desktop-next"
              type="button"
              onClick={continueToExpenses}
            >
              Continue to Operations
              <span aria-hidden="true">→</span>
            </button>

            <button
              className="manpower-desktop-back"
              type="button"
              onClick={() =>
                router.push(
                  '/app/grocery',
                )
              }
            >
              Back to Grocery
            </button>
          </aside>
        </div>

        <div className="action-row page-actions">
          <button
            className="primary-button"
            type="button"
            onClick={continueToExpenses}
          >
            Save & Continue to Operations
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={() => window.location.assign('/app/grocery')}
          >
            Back to Grocery
          </button>
        </div>
      </section>
    </AppShell>
  );
}
