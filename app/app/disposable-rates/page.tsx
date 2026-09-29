'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import AppShell from '../../components/AppShell';
import {
  getSession,
  loadDisposableRateMaster,
  saveDisposableRateMaster,
  type DisposableRateMasterItem,
} from '../../../lib/store';
import type { Session } from '../../../lib/types';

const UNITS = [
  'pcs',
  'pair',
  'pack',
  'box',
  'roll',
  'kg',
  'g',
  'litre',
  'ml',
  'set',
  'dozen',
  'bundle',
  'event',
];

function money(value: number) {
  return `₹${Math.round(value * 100) / 100}`;
}

function safeNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function categoryFor(name: string) {
  const value = name.toLocaleLowerCase('en-IN');
  if (/plate|spoon|fork|bowl/.test(value)) return 'Serviceware';
  if (/cup|glass|straw/.test(value)) return 'Beverage';
  if (/box|packing|silver roll|foil|wrap/.test(value)) return 'Packing';
  if (/tissue|napkin|cap|glove|toothpick/.test(value)) return 'Hygiene';
  if (/garbage|waste/.test(value)) return 'Waste';
  return 'Other';
}

export default function DisposableRateMasterPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [items, setItems] = useState<DisposableRateMasterItem[]>([]);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const current = getSession();
    if (!current) {
      router.replace('/login');
      return;
    }

    setSession(current);
    setItems(loadDisposableRateMaster(current.tenantId));
  }, [router]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('en-IN');

    if (!query) return items;

    return items.filter((item) =>
      item.name.toLocaleLowerCase('en-IN').includes(query) ||
      categoryFor(item.name).toLocaleLowerCase('en-IN').includes(query),
    );
  }, [items, search]);

  const pricedCount = items.filter((item) => item.unitCost > 0).length;
  const missingCount = items.length - pricedCount;

  function updateItem(
    id: string,
    patch: Partial<DisposableRateMasterItem>,
  ) {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    );
    setMessage('');
  }

  function saveRates() {
    if (!session) return;
    const saved = saveDisposableRateMaster(session.tenantId, items);
    setItems(saved);
    setMessage('Plastic rates saved. New event costings can reuse these rates.');
  }

  if (!session) {
    return (
      <AppShell title="Plastic Rate Master">
        <div className="loader-card">Loading plastic rates…</div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Plastic Rate Master"
      subtitle="Maintain reusable purchase rates for plastic and disposable items"
    >
      <section className="content-grid">
        <div className="final-costing-overview is-ready">
          <div>
            <span className="page-eyebrow">Cost Master · Plastic & Disposable</span>
            <h2>One rate master for every event</h2>
            <p>
              Set the purchase unit and standard rate once. The Plastic & Disposable costing page can reuse these rates automatically.
            </p>
          </div>

          <div className="final-costing-overview-total">
            <span>Rate coverage</span>
            <b>{pricedCount}/{items.length}</b>
            <small>{missingCount} item{missingCount === 1 ? '' : 's'} missing rate</small>
            <button
              className="primary-button"
              type="button"
              onClick={saveRates}
            >
              Save Rate Master
            </button>
          </div>
        </div>

        <div className="glass-card">
          <div className="final-costing-section-heading">
            <div>
              <span className="section-kicker">Reusable master rates</span>
              <h2>Plastic purchase rates</h2>
              <p>
                Enter your real vendor purchase rate. Example: Cup ₹1.20 / pcs, Garbage Bag ₹8 / pcs, Packing Roll ₹95 / roll.
              </p>
            </div>
            <button
              className="secondary-button"
              type="button"
              onClick={() => router.push('/app/disposable')}
            >
              Back to Event Plastic Cost
            </button>
          </div>

          <div
            className="no-print"
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(220px, 1fr) auto',
              gap: 10,
              alignItems: 'end',
              marginBottom: 14,
            }}
          >
            <label className="field">
              <span>Find item</span>
              <input
                className="input"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search cup, box, tissue..."
              />
            </label>
            <span className={missingCount > 0 ? 'needs-attention' : 'muted'}>
              {missingCount > 0 ? `${missingCount} missing rates` : 'All rates ready'}
            </span>
          </div>

          <datalist id="plastic-rate-unit-options">
            {UNITS.map((unit) => (
              <option key={unit} value={unit} />
            ))}
          </datalist>

          <div className="table-wrap">
            <table className="disposable-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th>Purchase unit</th>
                  <th>Rate / unit</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id} className={item.unitCost > 0 ? 'is-active' : ''}>
                    <td>
                      <strong>{item.name}</strong>
                    </td>
                    <td>
                      <span className="muted">{categoryFor(item.name)}</span>
                    </td>
                    <td>
                      <input
                        className="input"
                        list="plastic-rate-unit-options"
                        value={item.unit}
                        onChange={(event) =>
                          updateItem(item.id, { unit: event.target.value })
                        }
                      />
                    </td>
                    <td>
                      <label className="manpower-rate-input">
                        <span aria-hidden="true">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          value={item.unitCost || ''}
                          placeholder="0"
                          onChange={(event) =>
                            updateItem(item.id, {
                              unitCost: safeNumber(event.target.value),
                            })
                          }
                          aria-label={`Rate for ${item.name}`}
                        />
                      </label>
                    </td>
                    <td>
                      <span className={item.unitCost > 0 ? 'account-status active' : 'needs-attention'}>
                        {item.unitCost > 0 ? `${money(item.unitCost)} / ${item.unit}` : 'Add rate'}
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
                <h3>No matching items</h3>
                <p>Clear the search to show all plastic rate master items.</p>
              </div>
              <button
                className="ghost-button"
                type="button"
                onClick={() => setSearch('')}
              >
                Clear search
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
            Save Plastic Rates
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={() => router.push('/app/disposable')}
          >
            Back to Plastic Costing
          </button>
        </div>
      </section>
    </AppShell>
  );
}
