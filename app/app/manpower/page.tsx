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
  const [showUnusedRoles, setShowUnusedRoles] = useState(true);

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

    setShowUnusedRoles(true);

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

  return (
    <AppShell
      title="Manpower"
      subtitle="Step 3 of 6: plan every staff role function-wise"
    >
      <section className="content-grid">
        <div className="manpower-overview">
          <div>
            <span className="page-eyebrow">Staffing plan</span>
            <h2>{plannedFunctionCount} of {manpowerGroups.length} functions planned</h2>
            <p>Assign quantities and day rates function-wise. Every change is included in Cost automatically.</p>
          </div>
          <div className="manpower-health" aria-label="Manpower planning status">
            <span><b>{activeRoleCount}</b> active roles</span>
            <span><b>{peopleTotal}</b> assignments</span>
            <span className={missingRateCount ? 'needs-attention' : 'is-complete'}><b>{missingRateCount}</b> missing rates</span>
          </div>
        </div>

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

        <div className="glass-card manpower-planner-card">
          <div className="section-head manpower-planner-heading">
            <div>
              <div className="section-kicker">Function-wise Planning</div>
              <h2>Manpower by Function</h2>
              <p className="muted">
                Open each function and enter the staff quantity and rate.
                Every function has its own complete roster.
              </p>
            </div>
            <div className="manpower-planner-controls">
              <div><small>Total manpower</small><strong>{money(manpowerTotal)}</strong></div>
              <button className="ghost-button" type="button" onClick={() => setShowUnusedRoles((current) => !current)}>
                {showUnusedRoles ? 'Hide unused roles' : 'Show all role templates'}
              </button>
            </div>
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
              const visibleRows = showUnusedRoles ? group.rows : activeRows;

              return (
                <details
                  className="manpower-function-card"
                  key={group.serviceId}
                >
                  <summary>
                    <div>
                      {group.dayLabel ? (
                        <span className="section-kicker">
                          {group.dayLabel}
                        </span>
                      ) : null}
                      <h3>{group.mealLabel}</h3>
                      <small className="manpower-function-progress">{activeRows.length} active role{activeRows.length === 1 ? '' : 's'}</small>
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

                  {visibleRows.length ? (
                    <>
                      <div className="table-wrap manpower-table-wrap">
                        <table className="manpower-table">
                          <thead>
                            <tr>
                              <th>Staff role</th>
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
                                  <input
                                    className="input manpower-role-input"
                                    value={row.role}
                                    onChange={(event) => updateRow(row.id, { role: event.target.value })}
                                    aria-label="Manpower role"
                                  />
                                </td>
                                <td>
                                  <input
                                    className="input manpower-number-input"
                                    type="number"
                                    min="0"
                                    step="1"
                                    inputMode="numeric"
                                    value={row.quantity || ''}
                                    onChange={(event) => updateRow(row.id, { quantity: Math.max(0, Number(event.target.value) || 0) })}
                                    placeholder="0"
                                    aria-label={`Quantity for ${row.role}`}
                                  />
                                </td>
                                <td>
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
                                </td>
                                <td><b className="manpower-row-total">{money(rowTotal(row))}</b></td>
                                <td><button className="manpower-remove-button" type="button" onClick={() => removeRole(row)}>Remove</button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="manpower-role-cards">
                        {visibleRows.map((row) => (
                          <article className={`manpower-role-card ${Number(row.quantity) > 0 ? 'is-active' : ''}`} key={row.id}>
                            <div className="manpower-role-card-heading">
                              <input className="input manpower-role-input" value={row.role} onChange={(event) => updateRow(row.id, { role: event.target.value })} aria-label="Manpower role" />
                              <button className="manpower-remove-button" type="button" onClick={() => removeRole(row)}>Remove</button>
                            </div>
                            <div className="manpower-role-card-fields">
                              <div className="field">
                                <label htmlFor={`quantity-${row.id}`}>People</label>
                                <input id={`quantity-${row.id}`} className="input" type="number" min="0" step="1" inputMode="numeric" value={row.quantity || ''} onChange={(event) => updateRow(row.id, { quantity: Math.max(0, Number(event.target.value) || 0) })} placeholder="0" />
                              </div>
                              <div className="field">
                                <label htmlFor={`rate-${row.id}`}>Rate / person</label>
                                <label className={`manpower-rate-input ${Number(row.quantity) > 0 && !(Number(row.rate) > 0) ? 'is-missing' : ''}`} htmlFor={`rate-${row.id}`}>
                                  <span aria-hidden="true">₹</span>
                                  <input id={`rate-${row.id}`} type="number" min="0" step="1" inputMode="decimal" value={row.rate || ''} onChange={(event) => updateRow(row.id, { rate: Math.max(0, Number(event.target.value) || 0) })} placeholder="Add rate" />
                                </label>
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
