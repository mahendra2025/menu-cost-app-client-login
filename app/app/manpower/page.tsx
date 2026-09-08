'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '../../components/AppShell';
import {
  getSession,
  loadWork,
  saveWork,
} from '../../../lib/store';
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

function normalizeRole(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizePart(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function buildMealPlans(work: WorkState): MealPlan[] {
  const meals = new Map<string, MealPlan>();
  const fallbackMealLabel = work.event.functionType?.trim() || 'Event Menu';
  const fallbackPax = Math.max(0, Number(work.event.pax) || 0);

  work.menu.forEach((dish) => {
    const serviceId = dish.serviceId?.trim() || undefined;
    const dayLabel = dish.dayLabel?.trim() || '';
    const mealLabel = dish.mealLabel?.trim() || fallbackMealLabel;
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
  const rowServiceId = row.serviceId?.trim();

  if (rowServiceId && meal.serviceId) {
    return rowServiceId === meal.serviceId;
  }

  return (
    normalizePart(row.dayLabel) === normalizePart(meal.dayLabel) &&
    normalizePart(row.mealLabel) === normalizePart(meal.mealLabel)
  );
}

function isLegacyGlobalRow(row: ManpowerRow) {
  return !(
    row.serviceId?.trim() ||
    row.dayLabel?.trim() ||
    row.mealLabel?.trim()
  );
}

function buildMealManpowerRows(
  savedRows: ManpowerRow[],
  meals: MealPlan[],
): ManpowerRow[] {
  return meals.flatMap((meal, mealIndex) =>
    MANPOWER_ROLES.map((template) => {
      const aliases = new Set(template.aliases.map(normalizeRole));
      const roleMatches = savedRows.filter((row) =>
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
    }),
  );
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
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    const current = getSession();

    if (!current) {
      router.replace('/login');
      return;
    }

    setSession(current);

    const savedWork = loadWork(current.tenantId);
    const meals = buildMealPlans(savedWork);
    const manpower = buildMealManpowerRows(savedWork.manpower, meals);
    const nextWork: WorkState = {
      ...savedWork,
      manpower,
      extras: {
        ...savedWork.extras,
        staff: calculateManpowerCost(manpower),
        transport: 0,
        gasFuel: 0,
        disposable: 0,
        other: 0,
      },
      updatedAt: new Date().toISOString(),
    };

    setWork(nextWork);
    saveWork(current.tenantId, nextWork);
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
        transport: 0,
        gasFuel: 0,
        disposable: 0,
        other: 0,
      },
      updatedAt: new Date().toISOString(),
    };

    setWork(nextWork);
    saveWork(session.tenantId, nextWork);
  }

  function updateRow(id: string, patch: Partial<ManpowerRow>) {
    if (!work) return;

    persistRows(
      work.manpower.map((row) =>
        row.id === id ? { ...row, ...patch } : row,
      ),
    );
  }

  async function downloadPdf() {
    if (!work || pdfBusy) return;

    setPdfBusy(true);

    try {
      const { downloadFinalCostingPdf } = await import(
        '../../../lib/finalCostingPdf'
      );

      let recipes: unknown[] = [];

      try {
        const response = await fetch('/api/recipe-ingredients', {
          method: 'POST',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dishNames: work.menu.map((item) => item.name),
          }),
        });

        if (response.ok) {
          const data = (await response.json()) as {
            recipes?: unknown[];
          };

          recipes = Array.isArray(data.recipes) ? data.recipes : [];
        }
      } catch (recipeError) {
        console.warn(
          'Ingredient list could not be loaded:',
          recipeError,
        );
      }

      downloadFinalCostingPdf(work, recipes);
    } finally {
      setPdfBusy(false);
    }
  }

  if (!work) {
    return (
      <AppShell title="Manpower" subtitle="Step 2 of 2: set manpower for each meal">
        <div className="loader-card">Loading manpower…</div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Manpower"
      subtitle="Step 2 of 2: set meal-wise manpower, then download the costing PDF"
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
              onClick={() => void downloadPdf()}
              disabled={pdfBusy}
            >
              {pdfBusy ? 'Preparing PDF…' : 'Next: Download PDF'}
            </button>
          </div>
        </div>

        {meals.map((meal, mealIndex) => {
          const mealRows = rowsForMeal(meal);
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
                        <td><b>{row.role}</b></td>
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
            </div>
          );
        })}

        <div className="action-row page-actions">
          <button
            className="primary-button"
            type="button"
            onClick={() => void downloadPdf()}
            disabled={pdfBusy}
          >
            {pdfBusy ? 'Preparing PDF…' : 'Next: Download PDF'}
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={() => router.push('/app/menu')}
          >
            Back to Detected Menu
          </button>
        </div>
      </section>
    </AppShell>
  );
}
