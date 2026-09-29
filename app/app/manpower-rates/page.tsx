'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import AppShell from '../../components/AppShell';
import {
  getSession,
  loadManpowerRateMaster,
  saveManpowerRateMaster,
  type ManpowerRateMasterItem,
} from '../../../lib/store';
import type { Session } from '../../../lib/types';

function money(value: number) {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

function safeRate(value: string) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

export default function ManpowerRateMasterPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [items, setItems] = useState<ManpowerRateMasterItem[]>([]);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('ALL');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const current = getSession();
    if (!current) {
      router.replace('/login');
      return;
    }

    setSession(current);
    setItems(loadManpowerRateMaster(current.tenantId));
  }, [router]);

  const departments = useMemo(
    () =>
      Array.from(
        new Set(items.map((item) => item.department || 'CUSTOM')),
      ),
    [items],
  );

  const filteredItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('en-IN');

    return items.filter((item) => {
      const matchesSearch =
        !query ||
        item.role.toLocaleLowerCase('en-IN').includes(query) ||
        item.department.toLocaleLowerCase('en-IN').includes(query);
      const matchesDepartment =
        department === 'ALL' || item.department === department;

      return matchesSearch && matchesDepartment;
    });
  }, [items, search, department]);

  const pricedCount = items.filter((item) => item.rate > 0).length;
  const missingRateCount = items.length - pricedCount;

  function updateRate(id: string, value: string) {
    const rate = safeRate(value);
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, rate } : item,
      ),
    );
    setMessage('');
  }

  function saveRates() {
    if (!session) return;
    const saved = saveManpowerRateMaster(session.tenantId, items);
    setItems(saved);
    setMessage('Manpower Rate Master saved. New event manpower will reuse these rates.');
  }

  if (!session) {
    return (
      <AppShell title="Manpower Rate Master">
        <div className="loader-card">Loading manpower rates…</div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Manpower Rate Master"
      subtitle="Maintain reusable staff rates for all events"
    >
      <section className="content-grid">
        <div className="final-costing-overview is-ready">
          <div>
            <span className="page-eyebrow">Cost Master · Manpower</span>
            <h2>Set staff rates once</h2>
            <p>
              Maintain your standard Waiter, Captain, Cook, Helper and other manpower rates here. Event-specific overrides remain separate.
            </p>
          </div>
          <div className="final-costing-overview-total">
            <span>Rate coverage</span>
            <b>{pricedCount}/{items.length}</b>
            <small>{missingRateCount} role{missingRateCount === 1 ? '' : 's'} missing rate</small>
            <button className="primary-button" type="button" onClick={saveRates}>
              Save Rate Master
            </button>
          </div>
        </div>

        <div className="glass-card">
          <div className="final-costing-section-heading">
            <div>
              <span className="section-kicker">Reusable manpower rates</span>
              <h2>Role rate master</h2>
              <p>
                These are your normal purchase/contract rates per person. You can still override any rate inside an individual event.
              </p>
            </div>
            <button
              className="secondary-button"
              type="button"
              onClick={() => router.push('/app/team')}
            >
              Back to Manpower
            </button>
          </div>

          <div
            className="no-print"
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(220px, 1fr) 220px auto',
              gap: 10,
              alignItems: 'end',
              marginBottom: 14,
            }}
          >
            <label className="field">
              <span>Find role</span>
              <input
                className="input"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search waiter, cook, helper..."
              />
            </label>

            <label className="field">
              <span>Department</span>
              <select
                className="input"
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
              >
                <option value="ALL">All departments</option>
                {departments.map((item) => (
                  <option value={item} key={item}>
                    {item.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </label>

            <span className={missingRateCount > 0 ? 'needs-attention' : 'muted'}>
              {missingRateCount > 0 ? `${missingRateCount} missing rates` : 'All rates ready'}
            </span>
          </div>

          <div className="table-wrap">
            <table className="manpower-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Rate / person</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, index) => (
                  <tr key={item.id} className={item.rate > 0 ? 'is-active' : ''}>
                    <td><b>{index + 1}</b></td>
                    <td>
                      <strong>{item.role}</strong>
                      {item.customRole ? (
                        <small className="muted" style={{ display: 'block' }}>Custom role</small>
                      ) : null}
                    </td>
                    <td>
                      <span className="muted">{item.department.replace(/_/g, ' ')}</span>
                    </td>
                    <td>
                      <label className="manpower-rate-input">
                        <span aria-hidden="true">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          inputMode="decimal"
                          value={item.rate || ''}
                          placeholder="0"
                          onChange={(event) => updateRate(item.id, event.target.value)}
                          aria-label={`Rate for ${item.role}`}
                        />
                      </label>
                    </td>
                    <td>
                      <span className={item.rate > 0 ? 'account-status active' : 'needs-attention'}>
                        {item.rate > 0 ? `${money(item.rate)} / person` : 'Add rate'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredItems.length === 0 ? (
            <div className="empty-state">
              <div>
                <h3>No matching manpower roles</h3>
                <p>Clear search or department filter to show all roles.</p>
              </div>
              <button
                className="ghost-button"
                type="button"
                onClick={() => {
                  setSearch('');
                  setDepartment('ALL');
                }}
              >
                Clear filters
              </button>
            </div>
          ) : null}

          {message ? (
            <div className="admin-message" style={{ marginTop: 14 }}>
              {message}
            </div>
          ) : null}
        </div>

        <div className="action-row page-actions">
          <button className="primary-button" type="button" onClick={saveRates}>
            Save Manpower Rates
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={() => router.push('/app/team')}
          >
            Back to Manpower
          </button>
        </div>
      </section>
    </AppShell>
  );
}
