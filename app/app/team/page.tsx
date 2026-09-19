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
import type {
  ManpowerRow,
  Session,
  WorkState,
} from '../../../lib/types';

type RoleTemplate = {
  id: string;
  role: string;
  rate: number;
  aliases: string[];
};

type MealPlan = {
  key: string;
  serviceId?: string;
  dayLabel: string;
  mealLabel: string;
  pax: number;
  dishIds: string[];
};

const MANPOWER_ROLES: RoleTemplate[] = [
  { id: 'simple_chef', role: 'Chef / Cook', rate: 2500, aliases: ['chef / cook', 'chef', 'cook'] },
  { id: 'simple_helper', role: 'Helper', rate: 700, aliases: ['helper', 'helper / masi', 'masi'] },
  { id: 'simple_juice', role: 'Juice / Mocktail', rate: 1600, aliases: ['juice / mocktail', 'juice / mocktail maker', 'bartender'] },
  { id: 'simple_soup', role: 'Soup', rate: 2500, aliases: ['soup', 'soup cook'] },
  { id: 'simple_chaat', role: 'Chaat', rate: 2500, aliases: ['chaat', 'chaat master'] },
  { id: 'simple_live_counter', role: 'Live Counter', rate: 2500, aliases: ['live counter', 'live counter cook'] },
  { id: 'simple_starter', role: 'Starter', rate: 2500, aliases: ['starter', 'starter cook'] },
  { id: 'simple_chinese', role: 'Chinese', rate: 2500, aliases: ['chinese', 'chinese cook'] },
  { id: 'simple_italian', role: 'Italian', rate: 2500, aliases: ['italian', 'italian cook'] },
  { id: 'simple_indian_bread', role: 'Indian Bread', rate: 2500, aliases: ['indian bread', 'indian bread / tandoor cook', 'tandoor cook'] },
  { id: 'simple_paan', role: 'Paan Counter', rate: 900, aliases: ['paan counter', 'pan counter', 'paan', 'pan'] },
  { id: 'simple_waiter', role: 'Waiter', rate: 750, aliases: ['waiter'] },
  { id: 'simple_tie_waiter', role: 'Tie Waiter', rate: 900, aliases: ['tie waiter'] },
  { id: 'simple_model', role: 'Model', rate: 1500, aliases: ['model', 'models'] },
  { id: 'simple_pyaro', role: 'Pyaro', rate: 1000, aliases: ['pyaro'] },
  { id: 'simple_girls', role: 'Girls', rate: 900, aliases: ['girls', 'girl'] },
  { id: 'simple_cleaning', role: 'Cleaning', rate: 600, aliases: ['cleaning', 'cleaner'] },
  { id: 'simple_ghati', role: 'Ghati', rate: 900, aliases: ['ghati'] },
  { id: 'simple_cc_boys', role: 'CC Boys', rate: 900, aliases: ['cc boy', 'cc boys'] },
];

type NewRoleDraft = {
  role: string;
  rate: string;
};

function normalizeRole(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

const BUILT_IN_ROLE_NAMES = new Set(
  MANPOWER_ROLES.flatMap((template) => template.aliases).map(normalizeRole),
);

function isCustomRole(row: ManpowerRow) {
  return Boolean(row.customRole) || !BUILT_IN_ROLE_NAMES.has(normalizeRole(row.role));
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
  savedCustomRoles: CustomManpowerRole[] = [],
): ManpowerRow[] {
  const safeRows =
    Array.isArray(
      savedRows,
    )
      ? savedRows
      : [];

  return meals.flatMap((meal, mealIndex) => {
    const builtInRows = MANPOWER_ROLES.map((template) => {
      const aliases = new Set(template.aliases.map(normalizeRole));
      const roleMatches = safeRows.filter((row) =>
        aliases.has(normalizeRole(row.role)),
      );
      const scopedMatches = roleMatches.filter((row) =>
        rowBelongsToMeal(row, meal),
      );
      const legacyMatches = roleMatches.filter(isLegacyGlobalRow);
      const quantitySource =
        scopedMatches.length > 0
          ? scopedMatches
          : mealIndex === 0
            ? legacyMatches
            : [];
      const quantity = quantitySource.reduce(
        (sum, row) => sum + Math.max(0, Number(row.quantity) || 0),
        0,
      );
      const savedRate = [
        ...scopedMatches,
        ...roleMatches,
      ]
        .map((row) => Math.max(0, Number(row.rate) || 0))
        .find((rate) => rate > 0);

      return {
        id: `${meal.key}::${template.id}`,
        role: template.role,
        quantity,
        rate: savedRate ?? template.rate,
        rateMode: 'PER_MEAL',
        serviceId: meal.serviceId,
        dayLabel: meal.dayLabel || undefined,
        mealLabel: meal.mealLabel,
        servicePax: meal.pax,
        assignedDishIds: meal.dishIds,
      } satisfies ManpowerRow;
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
        rateMode: 'PER_MEAL' as const,
        serviceId: meal.serviceId,
        dayLabel: meal.dayLabel || undefined,
        mealLabel: meal.mealLabel,
        servicePax: meal.pax,
        assignedDishIds: row.assignedDishIds || meal.dishIds,
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
        rateMode: 'PER_MEAL' as const,
        serviceId: meal.serviceId,
        dayLabel: meal.dayLabel || undefined,
        mealLabel: meal.mealLabel,
        servicePax: meal.pax,
        assignedDishIds: meal.dishIds,
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

export default function ManpowerPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [work, setWork] = useState<WorkState | null>(null);
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

    const manpower = buildMealManpowerRows(savedWork.manpower, meals, customRoles);
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

    void syncCustomManpowerRoles(current.tenantId).then((syncedRoles) => {
      setWork((latestWork) => {
        if (!latestWork) return latestWork;

        const latestMeals = buildMealPlans(latestWork);
        const syncedManpower = buildMealManpowerRows(
          latestWork.manpower,
          latestMeals,
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
      assignedDishIds: meal.dishIds,
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
      <AppShell title="Manpower" subtitle="Set manpower for each meal">
        <div className="loader-card">Loading manpower…</div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Manpower"
      subtitle="Set meal-wise manpower, then continue to gas, transport and disposable costs"
    >
      <section className="content-grid manpower-page">
        <div className="manpower-overview manpower-overview-v2">
          <div className="manpower-overview-copy">
            <span className="page-eyebrow">Meal-wise manpower costing</span>
            <h2>Manpower by Meal</h2>
            <p>
              Set Chef, Helper, Waiter and specialist manpower separately for every meal. Each meal is costed independently.
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
              Next: Gas & Transport
            </button>
          </div>
        </div>

        {meals.map((meal, mealIndex) => {
          const mealRows = rowsForMeal(meal);
          const newRoleDraft = newRoleDrafts[meal.key] || { role: '', rate: '' };
          const mealTotal = calculateManpowerCost(mealRows);
          const mealPeople = mealRows.reduce(
            (sum, row) => sum + Math.max(0, Number(row.quantity) || 0),
            0,
          );
          const mealTitle = [meal.dayLabel, meal.mealLabel]
            .filter(Boolean)
            .join(' · ');

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
              </div>

              <div className="table-wrap manpower-table-wrap">
                <table className="manpower-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Manpower</th>
                      <th>Quantity</th>
                      <th>Rate / person</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mealRows.map((row, index) => (
                      <tr
                        key={row.id}
                        className={Number(row.quantity) > 0 ? 'is-active' : ''}
                      >
                        <td><b>{index + 1}</b></td>
                        <td>
                          <div className="manpower-role-name-cell">
                            <b>{row.role}</b>
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
                          <QuantityControl
                            row={row}
                            onChange={(quantity) => updateRow(row.id, { quantity })}
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
                {mealRows.map((row, index) => (
                  <article
                    key={row.id}
                    className={`manpower-role-card ${Number(row.quantity) > 0 ? 'is-active' : ''}`}
                  >
                    <div className="manpower-role-card-heading">
                      <div>
                        <small>#{index + 1}</small>
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

                    <div className="manpower-role-card-fields">
                      <div className="field">
                        <label>Quantity</label>
                        <QuantityControl
                          row={row}
                          onChange={(quantity) => updateRow(row.id, { quantity })}
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

        <div className="action-row page-actions">
          <button
            className="primary-button"
            type="button"
            onClick={continueToExpenses}
          >
            Save & Continue to Gas & Transport
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={() => window.location.assign('/app/cost')}
          >
            Back to Food Cost
          </button>
        </div>
      </section>
    </AppShell>
  );
}
