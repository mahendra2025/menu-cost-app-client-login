'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell, { LockedCard } from '../../components/AppShell';
import StatCard from '../../components/StatCard';
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
    const hasRows = rows.some(
      (row) => row.serviceId === service.serviceId,
    );

    if (!hasRows) {
      rows.push(...createFunctionDefaults(service));
    }
  });

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

  useEffect(() => {
    const current = getSession();
    setSession(current);
    if (!current) return;

    const savedWork = loadWork(current.tenantId);
    const initializedWork = initializeFunctionManpower(savedWork);

    setWork(initializedWork);
    if (initializedWork !== savedWork) {
      saveWork(current.tenantId, initializedWork);
    }
  }, []);

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

  const peopleTotal = useMemo(
    () =>
      (work?.manpower ?? []).reduce(
        (sum, row) =>
          sum + Math.max(0, Number(row.quantity) || 0),
        0,
      ),
    [work],
  );

  if (!work || !session) {
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

  const result = calculate(work);

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

  return (
    <AppShell
      title="Manpower"
      subtitle="Step 3 of 6: plan every staff role function-wise"
    >
      <section className="content-grid">
        <div className="stat-grid">
          <StatCard
            label="Functions"
            value={String(manpowerGroups.length)}
            note="Separate staff plans"
          />
          <StatCard
            label="Team Assignments"
            value={String(peopleTotal)}
            note="Across all functions"
          />
          <StatCard
            label="Manpower Cost"
            value={money(manpowerTotal)}
            note="Added to wedding cost"
          />
          <StatCard
            label="Meal Covers"
            value={String(result.totalCovers)}
            note="From detected functions"
          />
        </div>

        <div className="glass-card">
          <div className="section-head">
            <div>
              <div className="section-kicker">Function-wise Planning</div>
              <h2>Manpower by Function</h2>
              <p className="muted">
                Open each function and enter the staff quantity and rate.
                Every function has its own complete roster.
              </p>
            </div>
            <strong>{money(manpowerTotal)}</strong>
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

              return (
                <details
                  className="manpower-function-card"
                  key={group.serviceId}
                  open
                >
                  <summary>
                    <div>
                      {group.dayLabel ? (
                        <span className="section-kicker">
                          {group.dayLabel}
                        </span>
                      ) : null}
                      <h3>{group.mealLabel}</h3>
                    </div>
                    <div className="manpower-function-meta">
                      {group.servicePax > 0 ? (
                        <span className="badge green">
                          {group.servicePax} members
                        </span>
                      ) : null}
                      <span className="badge">{groupPeople} staff</span>
                      <span className="badge orange">
                        {money(groupCost)}
                      </span>
                    </div>
                  </summary>

                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Staff Role</th>
                          <th>Quantity</th>
                          <th>Rate</th>
                          <th>Total</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.rows.map((row) => (
                          <tr key={row.id}>
                            <td>
                              <input
                                className="input"
                                value={row.role}
                                onChange={(event) =>
                                  updateRow(row.id, {
                                    role: event.target.value,
                                  })
                                }
                                aria-label="Manpower role"
                              />
                            </td>
                            <td>
                              <input
                                className="input"
                                type="number"
                                min="0"
                                step="1"
                                inputMode="numeric"
                                value={row.quantity || ''}
                                onChange={(event) =>
                                  updateRow(row.id, {
                                    quantity: Math.max(
                                      0,
                                      Number(event.target.value) || 0,
                                    ),
                                  })
                                }
                                placeholder="0"
                                aria-label={`Quantity for ${row.role}`}
                              />
                            </td>
                            <td>
                              <input
                                className="input"
                                type="number"
                                min="0"
                                step="1"
                                inputMode="decimal"
                                value={row.rate || ''}
                                onChange={(event) =>
                                  updateRow(row.id, {
                                    rate: Math.max(
                                      0,
                                      Number(event.target.value) || 0,
                                    ),
                                  })
                                }
                                placeholder="0"
                                aria-label={`Rate for ${row.role}`}
                              />
                            </td>
                            <td><b>{money(rowTotal(row))}</b></td>
                            <td>
                              <button
                                className="danger-button"
                                type="button"
                                onClick={() =>
                                  persistRows(
                                    work.manpower.filter(
                                      (item) => item.id !== row.id,
                                    ),
                                  )
                                }
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="action-row">
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => addRole(group)}
                    >
                      Add Role to {group.mealLabel}
                    </button>
                  </div>
                </details>
              );
            })}
          </div>

          <div className="action-row" style={{ marginTop: 16 }}>
            <button
              className="ghost-button"
              type="button"
              onClick={resetRows}
            >
              Reset All Function Staff
            </button>
          </div>
        </div>

        <div className="action-row page-actions">
          <button
            className="primary-button"
            type="button"
            onClick={() => router.push('/app/cost')}
          >
            Next: Calculate Cost
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={() => router.push('/app/menu')}
          >
            Back to Menu
          </button>
        </div>
      </section>
    </AppShell>
  );
}
