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
  DEFAULT_MANPOWER_INPUTS,
  MANPOWER_ROLE_MASTER,
} from '../../../lib/manpowerMaster';
import type {
  ManpowerInputs,
  ManpowerRow,
  Session,
  WorkState,
} from '../../../lib/types';

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
  MANPOWER_ROLE_MASTER
    .flatMap((template) => [template.role, ...template.aliases])
    .map(normalizeRole),
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
        manualOverride: true,
        calculationSource: 'MANUAL' as const,
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

    const manpower = buildMealManpowerRows(savedWork.manpower, meals, savedWork, customRoles);
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

  function updateManpowerInputs(patch: Partial<ManpowerInputs>) {
    if (!work || !session) return;

    const baseWork: WorkState = {
      ...work,
      manpowerInputs: {
        ...DEFAULT_MANPOWER_INPUTS,
        ...work.manpowerInputs,
        ...patch,
      },
    };

    const nextMeals = buildMealPlans(baseWork);
    const customRoles = loadCustomManpowerRoles(session.tenantId);
    const manpower = buildMealManpowerRows(
      baseWork.manpower,
      nextMeals,
      baseWork,
      customRoles,
    );

    const nextWork: WorkState = {
      ...baseWork,
      manpower,
      extras: {
        ...baseWork.extras,
        staff: calculateManpowerCost(manpower),
      },
      sellingPricePerPlate: 0,
      updatedAt: new Date().toISOString(),
    };

    setWork(nextWork);
    saveWork(session.tenantId, nextWork);
  }

  function resetRowToAuto(row: ManpowerRow) {
    updateRow(row.id, {
      quantity: Math.max(0, Number(row.recommendedQuantity) || 0),
      manualOverride: false,
      calculationSource: 'AUTO',
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
              Manpower is recommended automatically from guests, service style and detected menu stations. You can override any quantity.
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

        <div className="glass-card">
          <div className="section-head">
            <div>
              <div className="section-kicker">Automatic manpower settings</div>
              <h2>Service & Utility Rules</h2>
              <p className="muted">
                These settings recalculate only Auto rows. Manual overrides stay unchanged.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <label className="field">
              <span>Service Level</span>
              <select
                className="input"
                value={work.manpowerInputs?.serviceLevel ?? DEFAULT_MANPOWER_INPUTS.serviceLevel}
                onChange={(event) => updateManpowerInputs({ serviceLevel: event.target.value as NonNullable<ManpowerInputs['serviceLevel']> })}
              >
                <option value="STANDARD">Standard</option>
                <option value="PREMIUM">Premium</option>
                <option value="VIP">VIP</option>
              </select>
            </label>

            <label className="field">
              <span>Venue</span>
              <select
                className="input"
                value={work.manpowerInputs?.venueType ?? DEFAULT_MANPOWER_INPUTS.venueType}
                onChange={(event) => updateManpowerInputs({ venueType: event.target.value as NonNullable<ManpowerInputs['venueType']> })}
              >
                <option value="INDOOR">Indoor</option>
                <option value="OUTDOOR">Outdoor</option>
              </select>
            </label>

            <label className="field">
              <span>Water Service</span>
              <select
                className="input"
                value={work.manpowerInputs?.waterService ?? DEFAULT_MANPOWER_INPUTS.waterService}
                onChange={(event) => updateManpowerInputs({ waterService: event.target.value as NonNullable<ManpowerInputs['waterService']> })}
              >
                <option value="BOTTLE_COUNTER">Bottle Counter</option>
                <option value="BOTTLE_TABLE">Bottle on Table</option>
                <option value="GLASS_SERVICE">Glass Service</option>
                <option value="TABLE_SERVICE">Table Water Service</option>
              </select>
            </label>

            <label className="field">
              <span>Crockery</span>
              <select
                className="input"
                value={work.manpowerInputs?.crockeryType ?? DEFAULT_MANPOWER_INPUTS.crockeryType}
                onChange={(event) => updateManpowerInputs({ crockeryType: event.target.value as NonNullable<ManpowerInputs['crockeryType']> })}
              >
                <option value="DISPOSABLE">Disposable</option>
                <option value="STANDARD">Standard Crockery</option>
                <option value="PREMIUM">Premium Crockery</option>
              </select>
            </label>
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
                            <div>
                              <b>{row.role}</b>
                              {!isCustomRole(row) ? (
                                <small className="muted" style={{ display: 'block', marginTop: 3 }}>
                                  {(row.department || 'MANPOWER').replace(/_/g, ' ')} · Auto {row.recommendedQuantity ?? 0}
                                </small>
                              ) : null}
                              {!isCustomRole(row) && row.calculationReason ? (
                                <small className="muted" style={{ display: 'block', marginTop: 3 }}>
                                  {row.calculationReason}
                                </small>
                              ) : null}
                            </div>
                            {row.manualOverride && !isCustomRole(row) ? (
                              <button
                                className="manpower-remove-button"
                                type="button"
                                onClick={() => resetRowToAuto(row)}
                              >
                                Reset Auto
                              </button>
                            ) : isCustomRole(row) ? (
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
                {mealRows.map((row, index) => (
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
                        {!isCustomRole(row) && row.calculationReason ? (
                          <small className="muted" style={{ display: 'block', marginTop: 4 }}>
                            Auto {row.recommendedQuantity ?? 0} · {row.calculationReason}
                          </small>
                        ) : null}
                      </div>
                      {row.manualOverride && !isCustomRole(row) ? (
                        <button
                          className="manpower-remove-button"
                          type="button"
                          onClick={() => resetRowToAuto(row)}
                        >
                          Reset Auto
                        </button>
                      ) : isCustomRole(row) ? (
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
