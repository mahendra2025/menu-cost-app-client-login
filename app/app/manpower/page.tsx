'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell, { LockedCard } from '../../components/AppShell';
import {
  calculate,
  defaultManpower,
  getSession,
  loadWork,
  saveWork,
  uid,
} from '../../../lib/store';
import type {
  ManpowerRow,
  MenuItem,
  Session,
  WorkState,
} from '../../../lib/types';

type FunctionOption = {
  serviceId: string;
  dayLabel: string;
  mealLabel: string;
  servicePax: number;
};

type ManpowerGroup = FunctionOption & {
  rows: ManpowerRow[];
};

function money(value: number) {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

function rowTotal(row: ManpowerRow) {
  return (
    Math.max(0, Number(row.quantity) || 0) *
    Math.max(0, Number(row.rate) || 0)
  );
}

function canAssignDishes(
  role: string,
) {
  return /cook|chef|helper|masi|counter|bartender|master|maker|halwai|tandoor/i.test(
    String(role || ''),
  );
}

function DishAssignmentControl({
  row,
  dishes,
  onChange,
}: {
  row: ManpowerRow;
  dishes: MenuItem[];
  onChange: (dishIds: string[]) => void;
}) {
  if (!canAssignDishes(row.role)) {
    return (
      <span className="manpower-dish-not-applicable">
        —
      </span>
    );
  }

  const selected =
    new Set(
      Array.isArray(row.assignedDishIds)
        ? row.assignedDishIds
        : [],
    );

  const assignedDishes =
    dishes.filter(
      (dish) =>
        selected.has(dish.id),
    );

  const selectedCount =
    assignedDishes.length;

  /*
   * Automatic specialist assignments should
   * be immediately understandable.
   * Do not hide the dish behind a dropdown.
   */
  if (row.autoDishAssignment) {
    return (
      <div className="manpower-auto-dish">
        <div className="manpower-auto-dish-top">
          <span className="manpower-auto-badge">
            AUTO
          </span>

          <small>
            1 dish → 1 specialist
          </small>
        </div>

        {assignedDishes.length ? (
          <div className="manpower-auto-dish-chips">
            {assignedDishes.map(
              (dish) => (
                <span
                  key={dish.id}
                  className="manpower-auto-dish-chip"
                >
                  <b>{dish.name}</b>
                  <small>
                    {dish.category}
                  </small>
                </span>
              ),
            )}
          </div>
        ) : (
          <span className="manpower-dish-not-applicable">
            Dish unavailable
          </span>
        )}
      </div>
    );
  }

  if (!dishes.length) {
    return (
      <span className="manpower-dish-not-applicable">
        No dishes
      </span>
    );
  }

  function toggleDish(
    dishId: string,
  ) {
    const next =
      new Set(selected);

    if (next.has(dishId)) {
      next.delete(dishId);
    } else {
      next.add(dishId);
    }

    onChange(
      Array.from(next),
    );
  }

  return (
    <details className="manpower-dish-selector">
      <summary>
        {selectedCount
          ? `${selectedCount} dish${selectedCount === 1 ? '' : 'es'}`
          : 'Select dishes'}
      </summary>

      <div className="manpower-dish-selector-panel">
        <div className="manpower-dish-selector-actions">
          <button
            type="button"
            onClick={() =>
              onChange(
                dishes.map(
                  (dish) => dish.id,
                ),
              )
            }
          >
            Select all
          </button>

          <button
            type="button"
            onClick={() =>
              onChange([])
            }
          >
            Clear
          </button>
        </div>

        <div className="manpower-dish-selector-list">
          {dishes.map((dish) => (
            <label
              key={dish.id}
              className={
                selected.has(dish.id)
                  ? 'is-selected'
                  : ''
              }
            >
              <input
                type="checkbox"
                checked={
                  selected.has(
                    dish.id,
                  )
                }
                onChange={() =>
                  toggleDish(
                    dish.id,
                  )
                }
              />

              <span>
                <b>
                  {dish.name}
                </b>

                <small>
                  {dish.category}
                </small>
              </span>
            </label>
          ))}
        </div>
      </div>
    </details>
  );
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
        value={row.quantity || ''}
        onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))}
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

function getFunctions(menu: MenuItem[]): FunctionOption[] {
  const functions = new Map<string, FunctionOption>();

  menu.forEach((item) => {
    if (!item.serviceId || functions.has(item.serviceId)) return;

    functions.set(item.serviceId, {
      serviceId: item.serviceId,
      dayLabel: item.dayLabel ?? '',
      mealLabel: item.mealLabel ?? 'Event Function',
      servicePax: Math.max(0, Number(item.servicePax) || 0),
    });
  });

  return Array.from(functions.values());
}

function specialistForDish(
  dish: MenuItem,
): {
  role: string;
  rateRole: string;
} | null {
  const category =
    String(
      dish.category || '',
    )
      .trim()
      .toLowerCase();

  const name =
    String(
      dish.name || '',
    )
      .trim()
      .toLowerCase();

  if (
    category === 'farsan'
  ) {
    return {
      role: 'Farsan Cook',
      rateRole: 'Cook',
    };
  }

  if (
    category === 'starter'
  ) {
    return {
      role: 'Starter Cook',
      rateRole: 'Cook',
    };
  }

  /*
   * Juice may be stored under
   * Welcome Drink, Mocktail or Beverage.
   */
  if (
    category === 'welcome drink' ||
    category === 'mocktail' ||
    category === 'beverage' ||
    name.includes('juice')
  ) {
    return {
      role: 'Juice Maker',
      rateRole: 'Bartender',
    };
  }

  if (
    category === 'chinese'
  ) {
    return {
      role: 'Chinese Cook',
      rateRole: 'Cook',
    };
  }

  if (
    category === 'chaat'
  ) {
    return {
      role: 'Chaat Master',
      rateRole: 'Cook',
    };
  }

  if (
    category === 'italian' ||
    category === 'pizza' ||
    category === 'pasta'
  ) {
    return {
      role: 'Italian Cook',
      rateRole: 'Cook',
    };
  }

  /*
   * App category for Indian breads
   * is currently "Bread".
   */
  if (
    category === 'bread'
  ) {
    return {
      role: 'Bread / Tandoor Cook',
      rateRole: 'Cook',
    };
  }

  return null;
}

function specialistRate(
  rateRole: string,
) {
  return (
    defaultManpower.find(
      (row) =>
        row.role ===
        rateRole,
    )?.rate || 0
  );
}

function autoAssignDishCooks(
  work: WorkState,
  rows: ManpowerRow[],
) {
  const currentDishIds =
    new Set(
      work.menu.map(
        (dish) => dish.id,
      ),
    );

  /*
   * Remove automatic rows if their
   * dish was later removed from menu.
   */
  const nextRows =
    rows.filter(
      (row) =>
        !row.autoDishAssignment ||
        (
          Array.isArray(
            row.assignedDishIds,
          ) &&
          row.assignedDishIds.some(
            (dishId) =>
              currentDishIds.has(
                dishId,
              ),
          )
        ),
    );

  work.menu.forEach(
    (dish) => {
      const specialist =
        specialistForDish(
          dish,
        );

      if (!specialist) {
        return;
      }

      /*
       * Do not duplicate a dish that
       * already has its automatic cook.
       */
      const alreadyAssigned =
        nextRows.some(
          (row) =>
            row.autoDishAssignment &&
            Array.isArray(
              row.assignedDishIds,
            ) &&
            row.assignedDishIds.includes(
              dish.id,
            ),
        );

      if (alreadyAssigned) {
        return;
      }

      nextRows.push({
        id:
          `manpower_dish_${dish.id}`,

        role:
          specialist.role,

        /*
         * Core rule:
         * ONE DISH = ONE SPECIALIST.
         */
        quantity: 1,

        rate:
          specialistRate(
            specialist.rateRole,
          ),

        assignedDishIds: [
          dish.id,
        ],

        autoDishAssignment:
          true,

        serviceId:
          dish.serviceId,

        dayLabel:
          dish.dayLabel,

        mealLabel:
          dish.mealLabel,

        servicePax:
          Math.max(
            0,
            Number(
              dish.servicePax,
            ) || 0,
          ),
      });
    },
  );

  return nextRows;
}

function createFunctionDefaults(
  service: FunctionOption,
): ManpowerRow[] {
  return defaultManpower.map((template) => ({
    ...template,
    id: `${template.id}_${service.serviceId}`,
    serviceId: service.serviceId,
    dayLabel: service.dayLabel,
    mealLabel: service.mealLabel,
    servicePax: service.servicePax,
  }));
}

function initializeFunctionManpower(work: WorkState): WorkState {
  const functions = getFunctions(work.menu);
  if (!functions.length) return work;

  const functionIds = new Set(
    functions.map((service) => service.serviceId),
  );
  let rows = work.manpower.map((row) => {
    if (!row.serviceId || functionIds.has(row.serviceId)) return row;

    const matchingFunction = functions.find(
      (service) =>
        service.dayLabel === (row.dayLabel ?? '') &&
        service.mealLabel === (row.mealLabel ?? '') &&
        service.servicePax === Math.max(0, Number(row.servicePax) || 0),
    );

    return matchingFunction
      ? {
          ...row,
          serviceId: matchingFunction.serviceId,
        }
      : row;
  });

  const defaultIds = new Set(
    defaultManpower.map((row) => row.id),
  );
  rows = rows.filter(
    (row) =>
      row.serviceId ||
      row.quantity > 0 ||
      !defaultIds.has(row.id),
  );

  functions.forEach((service) => {
    const functionDefaults = createFunctionDefaults(service);
    functionDefaults.forEach((template) => {
      if (!rows.some((row) => row.id === template.id)) {
        rows.push(template);
      }
    });
  });

  /*
   * Automatically create one specialist
   * manpower row for every specialist dish.
   */
  rows = autoAssignDishCooks(
    work,
    rows,
  );

  const staff = rows.reduce(
    (sum, row) => sum + rowTotal(row),
    0,
  );

  if (
    JSON.stringify(rows) === JSON.stringify(work.manpower) &&
    staff === work.extras.staff
  ) {
    return work;
  }

  return {
    ...work,
    manpower: rows,
    extras: {
      ...work.extras,
      staff,
    },
  };
}

export default function ManpowerPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [work, setWork] = useState<WorkState | null>(null);
  const [showUnusedRoles, setShowUnusedRoles] = useState(false);
  const [expandedFunctionIds, setExpandedFunctionIds] = useState<string[]>([]);
  const [hasInitializedFunctions, setHasInitializedFunctions] = useState(false);

  useEffect(() => {
    const current = getSession();

    if (!current) {
      router.replace('/login');
      return;
    }

    setSession(current);

    const savedWork = loadWork(current.tenantId);
    const initializedWork = initializeFunctionManpower(savedWork);

    setWork(initializedWork);
    if (initializedWork !== savedWork) {
      saveWork(current.tenantId, initializedWork);
    }
  }, [router]);

  const manpowerGroups = useMemo<ManpowerGroup[]>(() => {
    if (!work) return [];

    const functions = getFunctions(work.menu);
    const groups = functions.map((service) => ({
      ...service,
      rows: work.manpower.filter(
        (row) => row.serviceId === service.serviceId,
      ),
    }));
    const knownIds = new Set(
      functions.map((service) => service.serviceId),
    );
    const orphanedFunctionRows = work.manpower.filter(
      (row) => row.serviceId && !knownIds.has(row.serviceId),
    );
    const orphanedIds = Array.from(
      new Set(orphanedFunctionRows.map((row) => row.serviceId!)),
    );

    orphanedIds.forEach((serviceId) => {
      const rows = orphanedFunctionRows.filter(
        (row) => row.serviceId === serviceId,
      );
      const first = rows[0];
      groups.push({
        serviceId,
        dayLabel: first?.dayLabel ?? '',
        mealLabel: first?.mealLabel ?? 'Previous Function',
        servicePax: Math.max(0, Number(first?.servicePax) || 0),
        rows,
      });
    });

    const generalRows = work.manpower.filter((row) => !row.serviceId);
    if (generalRows.length || !groups.length) {
      groups.unshift({
        serviceId: 'general',
        dayLabel: '',
        mealLabel: 'General Event Staff',
        servicePax: Math.max(0, Number(work.event.pax) || 0),
        rows: generalRows.length
          ? generalRows
          : defaultManpower.map((row) => ({ ...row })),
      });
    }

    return groups;
  }, [work]);

  const manpowerTotal = useMemo(
    () =>
      (work?.manpower ?? []).reduce(
        (sum, row) => sum + rowTotal(row),
        0,
      ),
    [work],
  );

  useEffect(() => {
    if (hasInitializedFunctions || !manpowerGroups.length) return;

    const functionsNeedingAttention = manpowerGroups
      .filter((group) => group.rows.some(
        (row) => Number(row.quantity) > 0 && !(Number(row.rate) > 0),
      ))
      .map((group) => group.serviceId);

    setExpandedFunctionIds(
      functionsNeedingAttention.length
        ? functionsNeedingAttention
        : [manpowerGroups[0].serviceId],
    );
    setHasInitializedFunctions(true);
  }, [hasInitializedFunctions, manpowerGroups]);

  const peopleTotal = useMemo(
    () =>
      (work?.manpower ?? []).reduce(
        (sum, row) =>
          sum + Math.max(0, Number(row.quantity) || 0),
        0,
      ),
    [work],
  );

  const activeRoleCount = useMemo(
    () => (work?.manpower ?? []).filter((row) => Number(row.quantity) > 0).length,
    [work],
  );

  const missingRateCount = useMemo(
    () => (work?.manpower ?? []).filter(
      (row) => Number(row.quantity) > 0 && !(Number(row.rate) > 0),
    ).length,
    [work],
  );

  const plannedFunctionCount = useMemo(
    () => manpowerGroups.filter(
      (group) => group.rows.some((row) => Number(row.quantity) > 0),
    ).length,
    [manpowerGroups],
  );

  const result = useMemo(
    () => work ? calculate(work) : null,
    [work],
  );

  if (!work || !session || !result) {
    return (
      <AppShell title="Manpower">
        <div className="content-grid">
          <div className="glass-card">Loading...</div>
        </div>
      </AppShell>
    );
  }

  if (session.status === 'EXPIRED') {
    return (
      <AppShell title="Manpower">
        <LockedCard />
      </AppShell>
    );
  }

  function persistRows(rows: ManpowerRow[]) {
    if (!session || !work) return;

    const staff = rows.reduce(
      (sum, row) => sum + rowTotal(row),
      0,
    );
    const nextWork: WorkState = {
      ...work,
      manpower: rows,
      extras: {
        ...work.extras,
        staff,
      },
    };

    setWork(nextWork);
    saveWork(session.tenantId, nextWork);
  }

  function updateRow(
    id: string,
    patch: Partial<ManpowerRow>,
  ) {
    if (!work) return;

    persistRows(
      work.manpower.map((row) =>
        row.id === id ? { ...row, ...patch } : row,
      ),
    );
  }

  function addRole(group: ManpowerGroup) {
    if (!work) return;

    setShowUnusedRoles(true);
    setExpandedFunctionIds((current) => (
      current.includes(group.serviceId)
        ? current
        : [...current, group.serviceId]
    ));

    persistRows([
      ...work.manpower,
      {
        id: uid('manpower'),
        role: 'New Role',
        quantity: 0,
        rate: 0,
        ...(group.serviceId !== 'general'
          ? {
              serviceId: group.serviceId,
              dayLabel: group.dayLabel,
              mealLabel: group.mealLabel,
              servicePax: group.servicePax,
            }
          : {}),
      },
    ]);
  }

  function removeRole(row: ManpowerRow) {
    if (!work) return;
    if (
      (Number(row.quantity) > 0 || Number(row.rate) > 0) &&
      !window.confirm(`Remove ${row.role || 'this role'} from the manpower plan?`)
    ) {
      return;
    }

    persistRows(work.manpower.filter((item) => item.id !== row.id));
  }

  function clearFunction(group: ManpowerGroup) {
    if (!work || !group.rows.some((row) => Number(row.quantity) > 0)) return;
    if (!window.confirm(`Clear all staff quantities for ${group.mealLabel}?`)) return;

    persistRows(
      work.manpower.map((row) =>
        group.rows.some((groupRow) => groupRow.id === row.id)
          ? { ...row, quantity: 0 }
          : row,
      ),
    );
  }

  function resetRows() {
    if (!work) return;

    if (
      !confirm(
        'Reset all function-wise manpower quantities and rates to defaults?',
      )
    ) {
      return;
    }

    const functions = getFunctions(work.menu);
    persistRows(
      functions.length
        ? functions.flatMap(createFunctionDefaults)
        : defaultManpower.map((row) => ({ ...row })),
    );
  }

  function continueToExtraCost() {
    if (!missingRateCount) {
      router.push('/app/extra-cost');
      return;
    }

    const firstMissingRate = document.querySelector<HTMLInputElement>(
      '.manpower-rate-input.is-missing input',
    );
    const functionCard = firstMissingRate?.closest('details');
    const serviceId = functionCard?.dataset.functionId;
    if (serviceId) {
      setExpandedFunctionIds((current) => (
        current.includes(serviceId) ? current : [...current, serviceId]
      ));
    }
    window.requestAnimationFrame(() => {
      firstMissingRate?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstMissingRate?.focus({ preventScroll: true });
    });
  }

  return (
    <AppShell
      title="Manpower"
      subtitle="Step 2 of 6: plan every staff role function-wise"
    >
      <section className="content-grid manpower-page">
        <div className="manpower-overview manpower-overview-v2">
          <div className="manpower-overview-copy">
            <span className="page-eyebrow">Staffing plan</span>
            <h2>Build the right team for every function</h2>
            <p>Choose the number of people for each role, then add their per-person rate. Your costing updates automatically.</p>
            <div className="manpower-progress-row">
              <div className="manpower-progress-track" aria-hidden="true">
                <i style={{ width: `${manpowerGroups.length ? (plannedFunctionCount / manpowerGroups.length) * 100 : 0}%` }} />
              </div>
              <span>{plannedFunctionCount} of {manpowerGroups.length} functions started</span>
            </div>
          </div>
          <div className="manpower-overview-total">
            <span>Total manpower cost</span>
            <b>{money(manpowerTotal)}</b>
            <small>Included in final costing</small>
          </div>
          <div className="manpower-health" aria-label="Manpower planning status">
            <span><b>{peopleTotal}</b> staff assignments</span>
            <span><b>{activeRoleCount}</b> active roles</span>
            <span><b>{result.totalCovers}</b> meal covers</span>
            <span className={missingRateCount ? 'needs-attention' : 'is-complete'}>
              <b>{missingRateCount}</b> {missingRateCount === 1 ? 'rate needs attention' : 'rates need attention'}
            </span>
          </div>
        </div>

        <div className="glass-card manpower-planner-card">
          <div className="section-head manpower-planner-heading">
            <div>
              <div className="section-kicker">Function-wise Planning</div>
              <h2>Manpower by Function</h2>
              <p className="muted">
                Specialist cooks are assigned automatically from the menu.
                Review people and rates, then add service staff as needed.
              </p>
            </div>
            <div className="manpower-planner-controls">
              <button className="ghost-button" type="button" onClick={() => setShowUnusedRoles((current) => !current)}>
                {showUnusedRoles ? 'Show active roles only' : 'Show all role templates'}
              </button>
            </div>
          </div>

          <div className="manpower-auto-guide">
            <div className="manpower-auto-guide-icon">
              ⚡
            </div>

            <div>
              <b>
                Automatic specialist assignment
              </b>

              <span>
                Farsan · Starter · Juice · Chinese · Chaat · Italian · Indian Bread
              </span>
            </div>

            <small>
              1 dish = 1 specialist
            </small>
          </div>

          <div className="manpower-groups">
            {manpowerGroups.map((group) => {
              const groupPeople = group.rows.reduce(
                (sum, row) =>
                  sum + Math.max(0, Number(row.quantity) || 0),
                0,
              );
              const groupCost = group.rows.reduce(
                (sum, row) => sum + rowTotal(row),
                0,
              );
              const activeRows = group.rows.filter((row) => Number(row.quantity) > 0);
              const groupMissingRates = activeRows.filter((row) => !(Number(row.rate) > 0)).length;
              const autoAssignedRows =
                activeRows.filter(
                  (row) =>
                    row.autoDishAssignment,
                );

              const visibleRows =
                (
                  showUnusedRoles
                    ? group.rows
                    : activeRows
                )
                  .slice()
                  .sort(
                    (a, b) => {
                      const autoDifference =
                        Number(
                          Boolean(
                            b.autoDishAssignment,
                          ),
                        ) -
                        Number(
                          Boolean(
                            a.autoDishAssignment,
                          ),
                        );

                      if (autoDifference) {
                        return autoDifference;
                      }

                      const activeDifference =
                        Number(b.quantity > 0) -
                        Number(a.quantity > 0);

                      if (activeDifference) {
                        return activeDifference;
                      }

                      return a.role.localeCompare(
                        b.role,
                      );
                    },
                  );

              /*
               * A cook should only see dishes belonging
               * to the same function.
               */
              const groupDishes =
                group.serviceId === 'general'
                  ? work.menu
                  : work.menu.filter(
                      (dish) =>
                        dish.serviceId ===
                        group.serviceId,
                    );

              return (
                <details
                  className="manpower-function-card"
                  key={group.serviceId}
                  data-function-id={group.serviceId}
                  open={expandedFunctionIds.includes(group.serviceId)}
                  onToggle={(event) => {
                    const isOpen = event.currentTarget.open;
                    setExpandedFunctionIds((current) => (
                      isOpen
                        ? current.includes(group.serviceId)
                          ? current
                          : [...current, group.serviceId]
                        : current.filter((serviceId) => serviceId !== group.serviceId)
                    ));
                  }}
                >
                  <summary>
                    <div className="manpower-function-title">
                      {group.dayLabel ? (
                        <span className="section-kicker">
                          {group.dayLabel}
                        </span>
                      ) : null}
                      <h3>{group.mealLabel}</h3>
                      <small className="manpower-function-progress">
                        {activeRows.length
                          ? `${activeRows.length} active role${activeRows.length === 1 ? '' : 's'} · ${groupPeople} staff${autoAssignedRows.length ? ` · ${autoAssignedRows.length} auto specialist${autoAssignedRows.length === 1 ? '' : 's'}` : ''}`
                          : 'Not started · choose a role below'}
                      </small>
                    </div>
                    <div className="manpower-function-meta">
                      {group.servicePax > 0 ? (
                        <span className="badge green">
                          {group.servicePax} members
                        </span>
                      ) : null}
                      {groupMissingRates ? (
                        <span className="manpower-function-status needs-attention">{groupMissingRates} missing {groupMissingRates === 1 ? 'rate' : 'rates'}</span>
                      ) : activeRows.length ? (
                        <span className="manpower-function-status is-complete">Ready</span>
                      ) : (
                        <span className="manpower-function-status">Not started</span>
                      )}
                      <span className="manpower-function-cost">{money(groupCost)}</span>
                    </div>
                  </summary>

                  <div className={`manpower-function-guidance ${groupMissingRates ? 'needs-attention' : ''}`}>
                    {groupMissingRates
                      ? `Add a rate for ${groupMissingRates} active ${groupMissingRates === 1 ? 'role' : 'roles'} to complete this function.`
                      : activeRows.length
                        ? 'This function is costed. You can still adjust people or rates below.'
                        : 'Start with a role below. Use + to add people, then enter the rate per person.'}
                  </div>

                  {visibleRows.length ? (
                    <>
                      <div className="table-wrap manpower-table-wrap">
                        <table className="manpower-table">
                          <thead>
                            <tr>
                              <th>Staff role</th>
                              <th>Dish responsibility</th>
                              <th>People</th>
                              <th>Rate / person</th>
                              <th>Role total</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {visibleRows.map((row) => (
                              <tr key={row.id} className={Number(row.quantity) > 0 ? 'is-active' : ''}>
                                <td>
                                  {row.autoDishAssignment ? (
                                    <div className="manpower-auto-role">
                                      <span className="manpower-auto-role-icon">
                                        👨‍🍳
                                      </span>

                                      <div>
                                        <b>
                                          {row.role}
                                        </b>

                                        <small>
                                          Auto specialist
                                        </small>
                                      </div>
                                    </div>
                                  ) : (
                                    <input
                                      className="input manpower-role-input"
                                      value={row.role}
                                      onChange={(event) =>
                                        updateRow(
                                          row.id,
                                          {
                                            role:
                                              event.target.value,
                                          },
                                        )
                                      }
                                      aria-label="Manpower role"
                                    />
                                  )}
                                </td>

                                <td>
                                  <DishAssignmentControl
                                    row={row}
                                    dishes={groupDishes}
                                    onChange={(assignedDishIds) =>
                                      updateRow(
                                        row.id,
                                        {
                                          assignedDishIds,
                                        },
                                      )
                                    }
                                  />
                                </td>

                                <td>
                                  <QuantityControl row={row} onChange={(quantity) => updateRow(row.id, { quantity })} />
                                </td>
                                <td>
                                  <div className="manpower-rate-field">
                                    <label className={`manpower-rate-input ${Number(row.quantity) > 0 && !(Number(row.rate) > 0) ? 'is-missing' : ''}`}>
                                      <span aria-hidden="true">₹</span>
                                      <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        inputMode="decimal"
                                        value={row.rate || ''}
                                        onChange={(event) => updateRow(row.id, { rate: Math.max(0, Number(event.target.value) || 0) })}
                                        placeholder="Add rate"
                                        aria-label={`Rate for ${row.role}`}
                                      />
                                    </label>
                                    {Number(row.quantity) > 0 && !(Number(row.rate) > 0) ? <small>Rate required</small> : null}
                                  </div>
                                </td>
                                <td><b className="manpower-row-total">{money(rowTotal(row))}</b></td>
                                <td>
                                  {row.autoDishAssignment ? (
                                    <span className="manpower-auto-status">
                                      Automatic
                                    </span>
                                  ) : (
                                    <button
                                      className="manpower-remove-button"
                                      type="button"
                                      onClick={() =>
                                        removeRole(row)
                                      }
                                    >
                                      Remove
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="manpower-role-cards">
                        {visibleRows.map((row) => (
                          <article className={`manpower-role-card ${Number(row.quantity) > 0 ? 'is-active' : ''}`} key={row.id}>
                            <div className="manpower-role-card-heading">
                              {row.autoDishAssignment ? (
                                <div className="manpower-auto-role">
                                  <span className="manpower-auto-role-icon">
                                    👨‍🍳
                                  </span>

                                  <div>
                                    <b>{row.role}</b>
                                    <small>
                                      Auto specialist
                                    </small>
                                  </div>
                                </div>
                              ) : (
                                <input
                                  className="input manpower-role-input"
                                  value={row.role}
                                  onChange={(event) =>
                                    updateRow(
                                      row.id,
                                      {
                                        role:
                                          event.target.value,
                                      },
                                    )
                                  }
                                  aria-label="Manpower role"
                                />
                              )}

                              {row.autoDishAssignment ? (
                                <span className="manpower-auto-status">
                                  AUTO
                                </span>
                              ) : (
                                <button
                                  className="manpower-remove-button"
                                  type="button"
                                  onClick={() =>
                                    removeRole(row)
                                  }
                                >
                                  Remove
                                </button>
                              )}
                            </div>

                            {canAssignDishes(row.role) ? (
                              <div className="field manpower-mobile-dish-field">
                                <label>
                                  Assigned dishes
                                </label>

                                <DishAssignmentControl
                                  row={row}
                                  dishes={groupDishes}
                                  onChange={(assignedDishIds) =>
                                    updateRow(
                                      row.id,
                                      {
                                        assignedDishIds,
                                      },
                                    )
                                  }
                                />
                              </div>
                            ) : null}

                            <div className="manpower-role-card-fields">
                              <div className="field">
                                <label htmlFor={`quantity-${row.id}`}>People</label>
                                <QuantityControl row={row} onChange={(quantity) => updateRow(row.id, { quantity })} />
                              </div>
                              <div className="field">
                                <label htmlFor={`rate-${row.id}`}>Rate / person</label>
                                <label className={`manpower-rate-input ${Number(row.quantity) > 0 && !(Number(row.rate) > 0) ? 'is-missing' : ''}`} htmlFor={`rate-${row.id}`}>
                                  <span aria-hidden="true">₹</span>
                                  <input id={`rate-${row.id}`} type="number" min="0" step="1" inputMode="decimal" value={row.rate || ''} onChange={(event) => updateRow(row.id, { rate: Math.max(0, Number(event.target.value) || 0) })} placeholder="Add rate" />
                                </label>
                                {Number(row.quantity) > 0 && !(Number(row.rate) > 0) ? <small className="manpower-rate-error">Rate required</small> : null}
                              </div>
                            </div>
                            <div className="manpower-role-card-total"><span>Role total</span><b>{money(rowTotal(row))}</b></div>
                          </article>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="manpower-empty-roster">
                      <b>No active staff roles</b>
                      <span>Show the role templates to start planning this function.</span>
                      <button className="ghost-button" type="button" onClick={() => setShowUnusedRoles(true)}>Show role templates</button>
                    </div>
                  )}

                  <div className="manpower-function-actions">
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => addRole(group)}
                    >
                      Add custom role
                    </button>
                    {groupPeople > 0 ? <button className="ghost-button" type="button" onClick={() => clearFunction(group)}>Clear function quantities</button> : null}
                  </div>
                </details>
              );
            })}
          </div>

          <div className="manpower-reset-row">
            <span>Need a clean slate? This restores the standard role templates.</span>
            <button
              className="ghost-button"
              type="button"
              onClick={resetRows}
            >
              Reset All Function Staff
            </button>
          </div>
        </div>

        <div className="action-row page-actions manpower-page-actions">
          <div className={`manpower-save-state ${missingRateCount ? 'needs-attention' : ''}`}>
            <i aria-hidden="true" />
            <span>{missingRateCount ? `${missingRateCount} missing ${missingRateCount === 1 ? 'rate' : 'rates'} before you continue` : 'All changes saved automatically'}</span>
          </div>
          <button
            className="primary-button"
            type="button"
            onClick={continueToExtraCost}
          >
            {missingRateCount ? `Review ${missingRateCount} missing ${missingRateCount === 1 ? 'rate' : 'rates'}` : 'Continue to Extra Cost'}
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={() => router.push('/app/event')}
          >
            Back to Event
          </button>
        </div>
      </section>
    </AppShell>
  );
}
