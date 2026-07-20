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
  Session,
  WorkState,
} from '../../../lib/types';

function money(value: number) {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

export default function ManpowerPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [work, setWork] = useState<WorkState | null>(null);

  useEffect(() => {
    const current = getSession();
    setSession(current);
    if (current) setWork(loadWork(current.tenantId));
  }, []);

  const manpowerTotal = useMemo(
    () =>
      (work?.manpower ?? []).reduce(
        (sum, row) =>
          sum +
          Math.max(0, Number(row.quantity) || 0) *
            Math.max(0, Number(row.rate) || 0),
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
      (sum, row) =>
        sum +
        Math.max(0, Number(row.quantity) || 0) *
          Math.max(0, Number(row.rate) || 0),
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

  function addRole() {
    if (!work) return;

    persistRows([
      ...work.manpower,
      {
        id: uid('manpower'),
        role: 'New Role',
        quantity: 0,
        rate: 0,
      },
    ]);
  }

  function resetRows() {
    persistRows(defaultManpower.map((row) => ({ ...row })));
  }

  return (
    <AppShell
      title="Manpower"
      subtitle="Step 3 of 6: plan staff quantity and rates"
    >
      <section className="content-grid">
        <div className="stat-grid">
          <StatCard
            label="Team Size"
            value={String(peopleTotal)}
            note="Total manpower"
          />
          <StatCard
            label="Staff Cost"
            value={money(manpowerTotal)}
            note="Added to wedding cost"
          />
          <StatCard
            label="Average / Person"
            value={money(peopleTotal > 0 ? manpowerTotal / peopleTotal : 0)}
            note="Across all roles"
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
              <div className="section-kicker">Staff Planning</div>
              <h2>Manpower Roles</h2>
              <p className="muted">
                Enter the required quantity and rate for every role. The total
                is saved automatically and included on the Cost page.
              </p>
            </div>
            <strong>{money(manpowerTotal)}</strong>
          </div>

          {work.manpower.length === 0 ? (
            <div className="helper-card">
              <b>No manpower roles</b>
              <p>Add a role to start planning staff costs.</p>
            </div>
          ) : null}

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Quantity</th>
                  <th>Rate</th>
                  <th>Total</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {work.manpower.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <input
                        className="input"
                        value={row.role}
                        onChange={(event) =>
                          updateRow(row.id, { role: event.target.value })
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
                    <td>
                      <b>
                        {money(
                          (Number(row.quantity) || 0) *
                            (Number(row.rate) || 0),
                        )}
                      </b>
                    </td>
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

          <div className="action-row" style={{ marginTop: 16 }}>
            <button
              className="secondary-button"
              type="button"
              onClick={addRole}
            >
              Add Role
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={resetRows}
            >
              Reset Defaults
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
