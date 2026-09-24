'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '../../components/AppShell';
import {
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
  calculateManpowerCost,
  manpowerRawCost,
} from '../../../lib/manpowerCost';
import { generateMealManpowerRows } from '../../../lib/manpowerEngine';
import {
  MANPOWER_ROLE_MASTER,
} from '../../../lib/manpowerMaster';
import type {
  ManpowerRow,
  MenuItem,
  Session,
  WorkState,
} from '../../../lib/types';

type NewRoleDraft = {
  role: string;
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

type DishCoverageFilter =
  | 'ALL'
  | 'UNASSIGNED'
  | 'NEEDS_QTY';

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

const QUICK_MANPOWER_ROLES = [
  { label: 'Waiter', role: 'Waiter' },
  { label: 'Captain', role: 'Captain' },
  { label: 'Cook', role: 'Main Course Cook' },
  { label: 'Helper', role: 'Preparation Helper' },
] as const;

type MealPlan = {
  key: string;
  serviceId?: string;
  dayLabel: string;
  mealLabel: string;
  pax: number;
  dishIds: string[];
};

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
  return Boolean(row.customRole) || !BUILT_IN_ROLE_NAMES.has(normalizeRole(row.role));
}

function manpowerFilterGroup(
  row: ManpowerRow,
): Exclude<ManpowerFilterGroup, 'ALL'> | 'CUSTOM' {
  if (isCustomRole(row)) {
    return 'CUSTOM';
  }

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

  return (
    row.department ||
    'CUSTOM'
  );
}

const DISH_ASSIGNABLE_DEPARTMENTS = new Set([
  'LIVE_COUNTER',
  'BREAD',
  'KITCHEN',
  'PREPARATION',
]);

function canAssignDishes(row: ManpowerRow) {
  const kitchenRole = /\b(cook|chef|halwai|helper|masi)\b/.test(
    normalizeRole(row.role),
  );

  if (!kitchenRole) return false;
  if (isCustomRole(row)) return true;

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
        rateMode: 'PER_MEAL' as const,
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

    return [...builtInRows, ...eventCustomRows, ...permanentCustomRows];
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
  onChange,
}: {
  row: ManpowerRow;
  dishes: MenuItem[];
  onChange: (dishIds: string[]) => void;
}) {
  const assignedIds =
    new Set(
      row.assignedDishIds ??
      [],
    );

  const assignedCount =
    dishes.filter(
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
              dishes.length === 0 ||
              assignedCount ===
                dishes.length
            }
            onClick={() =>
              onChange(
                dishes.map(
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
          {dishes.map(
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

function DishManpowerBoard({
  dishes,
  rows,
  onToggle,
}: {
  dishes: MenuItem[];
  rows: ManpowerRow[];
  onToggle: (row: ManpowerRow, dishId: string, assigned: boolean) => void;
}) {
  if (dishes.length === 0) {
    return (
      <div className="manpower-menu-empty">
        <b>No menu dishes found</b>
        <span>Add dishes to this meal before assigning cooks and helpers.</span>
      </div>
    );
  }

  const kitchenRows = rows.filter(canAssignDishes);
  const staffedDishCount = dishes.filter((dish) =>
    kitchenRows.some(
      (row) =>
        Math.max(0, Number(row.quantity) || 0) > 0 &&
        (row.assignedDishIds ?? []).includes(dish.id),
    ),
  ).length;

  return (
    <section className="manpower-menu-board" aria-label="Dish-wise kitchen manpower">
      <div className="manpower-menu-board-heading">
        <div>
          <h3>Menu &amp; kitchen manpower</h3>
          <p>One cook or helper can cover multiple dishes. Set quantity once, then assign as many dishes as needed.</p>
        </div>
        <span className={staffedDishCount === dishes.length ? 'is-complete' : ''}>
          {staffedDishCount}/{dishes.length} staffed
        </span>
      </div>

      <div className="manpower-dish-grid">
        {dishes.map((dish, dishIndex) => {
          const assignedRows = kitchenRows.filter(
            (row) =>
              (row.assignedDishIds ?? []).includes(dish.id),
          );

          return (
            <article className="manpower-dish-card" key={dish.id}>
              <div className="manpower-dish-card-head">
                <span className="manpower-dish-number">{dishIndex + 1}</span>
                <div>
                  <small>{dish.category || 'Uncategorised'}</small>
                  <h4>{dish.name}</h4>
                </div>
              </div>

              <div className="manpower-dish-team">
                {assignedRows.length > 0 ? (
                  assignedRows.map((row) => (
                    <span key={row.id}>
                      {Math.max(0, Number(row.quantity) || 0) > 0 ? (
                        <>
                          <b>{row.quantity}</b> {row.role}
                        </>
                      ) : (
                        <>
                          {row.role} · <small>set qty</small>
                        </>
                      )}
                    </span>
                  ))
                ) : (
                  <span className="is-empty">No kitchen manpower assigned</span>
                )}
              </div>

              <details className="manpower-dish-add">
                <summary>Assign manpower</summary>
                <div className="manpower-dish-add-panel">
                  {kitchenRows.map((row) => {
                    const quantity = Math.max(0, Number(row.quantity) || 0);
                    const assigned =
                      (row.assignedDishIds ?? []).includes(dish.id);

                    return (
                      <div
                        className={`manpower-dish-role ${assigned ? 'is-assigned' : ''}`}
                        key={row.id}
                      >
                        <label>
                          <input
                            type="checkbox"
                            checked={assigned}
                            onChange={(event) =>
                              onToggle(row, dish.id, event.target.checked)
                            }
                          />
                          <span>
                            <b>{row.role}</b>
                            <small>
                              Manual selection
                            </small>
                          </span>
                        </label>

                        <div className="manpower-dish-role-quantity">
                          <small>Meal qty</small>
                          <b>{quantity}</b>
                          <span>
                            Set once in Meal team &amp; rates
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </details>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default function ManpowerPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [work, setWork] = useState<WorkState | null>(null);
  const [selectedMealKey, setSelectedMealKey] = useState('');
  const [departmentFilter, setDepartmentFilter] =
    useState<ManpowerFilterGroup>('ALL');
  const [dishCoverageFilter, setDishCoverageFilter] =
    useState<DishCoverageFilter>('ALL');
  const [newRoleDrafts, setNewRoleDrafts] = useState<Record<string, NewRoleDraft>>({});
  const [roleErrors, setRoleErrors] = useState<Record<string, string>>({});

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

    const manpower = buildMealManpowerRows(
      savedWork.manpower,
      meals,
      savedWork,
      customRoles,
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
        const syncedManpower = buildMealManpowerRows(
          latestWork.manpower,
          latestMeals,
          latestWork,
          syncedRoles,
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
      saveCustomManpowerRole(session.tenantId, currentRow.role, patch.rate);
    }

    persistRows(
      work.manpower.map((row) =>
        row.id === id ? { ...row, ...patch } : row,
      ),
    );
  }

  function toggleDishManpower(
    row: ManpowerRow,
    dishId: string,
    assigned: boolean,
  ) {
    const currentIds = new Set(row.assignedDishIds ?? []);

    if (assigned) {
      currentIds.add(dishId);
    } else {
      currentIds.delete(dishId);
    }

    updateRow(row.id, {
      assignedDishIds: Array.from(currentIds),
      manualOverride: true,
      calculationSource: 'MANUAL',
    });
  }

  function setRowDishAssignments(
    row: ManpowerRow,
    dishIds: string[],
  ) {
    updateRow(row.id, {
      assignedDishIds: dishIds,
      manualOverride: true,
      calculationSource: 'MANUAL',
    });
  }

  function updateNewRoleDraft(mealKey: string, patch: Partial<NewRoleDraft>) {
    setNewRoleDrafts((current) => ({
      ...current,
      [mealKey]: {
        ...(current[mealKey] || { role: '', rate: '' }),
        ...patch,
      },
    }));
    setRoleErrors((current) => ({ ...current, [mealKey]: '' }));
  }

  function addQuickRole(
    meal: MealPlan,
    roleName: string,
  ) {
    const row =
      rowsForMeal(
        meal,
      ).find(
        (item) =>
          normalizeRole(
            item.role,
          ) ===
          normalizeRole(
            roleName,
          ),
      );

    if (!row) {
      setDepartmentFilter(
        'ALL',
      );
      document
        .getElementById(
          `manpower-add-role-${meal.key}`,
        )
        ?.scrollIntoView({
          behavior:
            'smooth',
          block:
            'center',
        });
      return;
    }

    updateRow(
      row.id,
      {
        quantity:
          Math.max(
            0,
            Number(
              row.quantity,
            ) || 0,
          ) + 1,
        manualOverride:
          true,
        calculationSource:
          'MANUAL',
      },
    );
  }

  function addStaffRole(meal: MealPlan) {
    if (!work || !session) return;

    const draft = newRoleDrafts[meal.key] || { role: '', rate: '' };
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

    saveCustomManpowerRole(session.tenantId, role, newRow.rate);
    persistRows([...work.manpower, newRow]);
    setNewRoleDrafts((current) => ({
      ...current,
      [meal.key]: { role: '', rate: '' },
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
    >
      <section className="content-grid manpower-page">
        <div className="manpower-overview manpower-overview-v2">
          <div className="manpower-overview-copy">
            <span className="page-eyebrow">Meal-wise manpower costing</span>
            <h2>Build the team from the menu</h2>
            <p>
              Add the cooks, helpers, service and utility manpower you actually need for each meal. Nothing is selected automatically.
            </p>
          </div>

          <div className="manpower-overview-total">
            <span>Total manpower cost</span>
            <b>{money(manpowerTotal)}</b>
            <small>
              {meals.length} meal{meals.length === 1 ? '' : 's'} · {totalPeople} manpower assignments
            </small>
            <button
              className="primary-button workflow-overview-button"
              type="button"
              onClick={continueToExpenses}
            >
              Continue to Operations
            </button>
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
                      setDishCoverageFilter('ALL');
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
          const filteredMealRows =
            departmentFilter === 'ALL'
              ? mealRows
              : mealRows.filter(
                  (row) =>
                    manpowerFilterGroup(row) ===
                    departmentFilter,
                );
          const mealDishes = work.menu.filter((dish) =>
            meal.dishIds.includes(dish.id),
          );
          const newRoleDraft = newRoleDrafts[meal.key] || { role: '', rate: '' };
          const mealTotal = calculateManpowerCost(mealRows);
          const mealPeople = mealRows.reduce(
            (sum, row) => sum + Math.max(0, Number(row.quantity) || 0),
            0,
          );
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
                    people
                  </span>
                  <span>
                    <b>{money(mealTotal)}</b>
                    meal cost
                  </span>
                </div>
              </div>

              <section className="manpower-quick-add no-print" aria-label="Quick manual manpower add">
                <div className="manpower-quick-add-copy">
                  <span>Quick add</span>
                  <b>Add one person manually</b>
                  <small>Each click increases that role by 1 for this meal.</small>
                </div>

                <div className="manpower-quick-add-actions">
                  {QUICK_MANPOWER_ROLES.map((quickRole) => (
                    <button
                      key={quickRole.role}
                      type="button"
                      onClick={() =>
                        addQuickRole(
                          meal,
                          quickRole.role,
                        )
                      }
                    >
                      <span aria-hidden="true">＋</span>
                      {quickRole.label}
                    </button>
                  ))}

                  <button
                    type="button"
                    className="is-custom"
                    onClick={() =>
                      document
                        .getElementById(
                          `manpower-add-role-${meal.key}`,
                        )
                        ?.scrollIntoView({
                          behavior: 'smooth',
                          block: 'center',
                        })
                    }
                  >
                    <span aria-hidden="true">＋</span>
                    Custom role
                  </button>
                </div>
              </section>

              <DishManpowerBoard
                dishes={mealDishes}
                rows={mealRows}
                onToggle={toggleDishManpower}
              />

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

              <div className="table-wrap manpower-table-wrap">
                <table className="manpower-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Manpower</th>
                      <th>Dishes</th>
                      <th>Quantity</th>
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
                              {!isCustomRole(row) && row.department ? (
                                <small className="muted" style={{ display: 'block', marginTop: 3 }}>
                                  {row.department.replace(/_/g, ' ')}
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
                        </td>
                        <td>
                          {canAssignDishes(row) ? (
                            <ManpowerMultiDishSelector
                              row={row}
                              dishes={mealDishes}
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
                                })
                              }
                              aria-label={`Rate for ${row.role} in ${meal.mealLabel}`}
                            />
                          </label>
                        </td>
                        <td><strong>{money(manpowerRawCost(row))}</strong></td>
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
                          {!isCustomRole(row) && row.department ? ` · ${row.department.replace(/_/g, ' ')}` : ''}
                        </small>
                        <b>{row.role}</b>

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
                              })
                            }
                          />
                        </label>
                      </div>
                    </div>

                    <div className="manpower-role-card-total">
                      <span>Total</span>
                      <strong>{money(manpowerRawCost(row))}</strong>
                    </div>
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
                  <small>Saved for this event and future events.</small>
                </div>
                <label className="field">
                  <span>Role name</span>
                  <input
                    className="input"
                    value={newRoleDraft.role}
                    onChange={(event) => updateNewRoleDraft(meal.key, { role: event.target.value })}
                    placeholder="e.g. Security"
                  />
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
            </div>

            <div className="manpower-desktop-team-split">
              <div>
                <span>Service</span>
                <b>{servicePeople}</b>
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
