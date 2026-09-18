'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import AppShell, { LockedCard } from '../../components/AppShell';
import {
  calculate,
  getSession,
  loadWork,
  saveWork,
  uid,
} from '../../../lib/store';
import {
  calculateDisposableCost,
  disposableCostPerCover,
} from '../../../lib/disposableCost';
import type {
  DisposableCostItem,
  Session,
  WorkState,
} from '../../../lib/types';

function money(value: number) {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

function numberValue(value: string) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

export default function DisposableCostPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [work, setWork] = useState<WorkState | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const current = getSession();

    if (!current) {
      router.replace('/login');
      return;
    }

    setSession(current);
    const saved = loadWork(current.tenantId);
    const disposable = calculateDisposableCost(saved.disposableItems);

    if (Math.abs(disposable.total - Number(saved.extras.disposable || 0)) > 0.01) {
      const normalized: WorkState = {
        ...saved,
        extras: {
          ...saved.extras,
          disposable: disposable.total,
        },
        sellingPricePerPlate: 0,
        updatedAt: new Date().toISOString(),
      };
      setWork(normalized);
      saveWork(current.tenantId, normalized);
      return;
    }

    setWork(saved);
  }, [router]);

  const summary = useMemo(
    () => calculateDisposableCost(work?.disposableItems ?? []),
    [work?.disposableItems],
  );

  const totalCovers = useMemo(
    () => (work ? calculate(work).totalCovers : 0),
    [work],
  );

  const perCover = disposableCostPerCover(summary.total, totalCovers);

  function persistItems(items: DisposableCostItem[], nextMessage = '') {
    if (!work || !session) return;

    const nextSummary = calculateDisposableCost(items);
    const nextWork: WorkState = {
      ...work,
      disposableItems: items,
      extras: {
        ...work.extras,
        disposable: nextSummary.total,
      },
      // Cost basis changed, so an old selling rate should not stay silently.
      sellingPricePerPlate: 0,
      updatedAt: new Date().toISOString(),
    };

    setWork(nextWork);
    saveWork(session.tenantId, nextWork);
    setMessage(nextMessage);
  }

  function updateItem(id: string, patch: Partial<DisposableCostItem>) {
    if (!work) return;

    persistItems(
      work.disposableItems.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    );
  }

  function addItem() {
    if (!work) return;

    persistItems([
      ...work.disposableItems,
      {
        id: uid('disposable_custom'),
        name: 'Custom item',
        quantity: 0,
        unitCost: 0,
      },
    ]);
  }

  function removeCustomItem(id: string) {
    if (!work) return;
    persistItems(work.disposableItems.filter((item) => item.id !== id));
  }

  function continueToPricing() {
    if (!work) return;
    persistItems(work.disposableItems, 'Plastic and disposable costs saved.');
    router.push('/app/final-costing');
  }

  if (!work || !session) {
    return (
      <AppShell title="Plastic & Disposable">
        <div className="loader-card">Loading disposable cost…</div>
      </AppShell>
    );
  }

  if (session.status === 'EXPIRED') {
    return (
      <AppShell title="Plastic & Disposable">
        <LockedCard />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Plastic & Disposable"
      subtitle="Add plates, bowls, cups, spoons, packing and other single-use event items"
    >
      <section className="content-grid disposable-page">
        <div className="final-costing-overview is-ready">
          <div>
            <span className="page-eyebrow">Disposable event cost</span>
            <h2>Quantity × purchase rate</h2>
            <p>
              Enter the actual quantity you expect to use and your purchase rate. The total becomes part of the real event cost before markup or margin.
            </p>
          </div>
          <div className="final-costing-overview-total">
            <span>Disposable total</span>
            <b>{money(summary.total)}</b>
            <small>
              {summary.activeItemCount} active item{summary.activeItemCount === 1 ? '' : 's'}
              {totalCovers > 0 ? ` · ${money(perCover)} / cover` : ''}
            </small>
            <button className="primary-button" type="button" onClick={continueToPricing}>
              Next: Pricing
            </button>
          </div>

          <div className="disposable-card-list">
            {summary.items.map((item) => {
              const custom =
                item.id.startsWith('disposable_custom');
              const legacyFuel =
                item.name.trim().toLowerCase() === 'fuel';

              return (
                <article
                  key={`mobile-${item.id}`}
                  className={
                    item.lineTotal > 0
                      ? 'disposable-mobile-card is-active'
                      : 'disposable-mobile-card'
                  }
                >
                  <div className="disposable-mobile-card-heading">
                    <div>
                      {custom ? (
                        <label className="field">
                          <span>Item</span>
                          <input
                            className="input"
                            value={item.name}
                            placeholder="Item name"
                            onChange={(event) =>
                              updateItem(item.id, {
                                name: event.target.value,
                              })
                            }
                          />
                        </label>
                      ) : (
                        <>
                          <strong>{item.name}</strong>
                          {legacyFuel ? (
                            <small>
                              Use Gas & Transport instead
                            </small>
                          ) : null}
                        </>
                      )}
                    </div>

                    <b>{money(item.lineTotal)}</b>
                  </div>

                  <div className="disposable-mobile-fields">
                    <label className="field">
                      <span>Quantity</span>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="1"
                        inputMode="decimal"
                        value={item.quantity || ''}
                        placeholder="0"
                        onChange={(event) =>
                          updateItem(item.id, {
                            quantity:
                              numberValue(event.target.value),
                          })
                        }
                      />
                    </label>

                    <label className="field">
                      <span>Rate / item</span>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={item.unitCost || ''}
                        placeholder="₹0"
                        onChange={(event) =>
                          updateItem(item.id, {
                            unitCost:
                              numberValue(event.target.value),
                          })
                        }
                      />
                    </label>
                  </div>

                  <div className="disposable-mobile-total">
                    <span>
                      {item.quantity || 0}
                      {' × '}
                      {money(item.unitCost || 0)}
                    </span>
                    <strong>{money(item.lineTotal)}</strong>
                  </div>

                  {custom ? (
                    <button
                      type="button"
                      className="ghost-button disposable-remove"
                      onClick={() => removeCustomItem(item.id)}
                    >
                      Remove Item
                    </button>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>

        <div className="glass-card">
          <div className="final-costing-section-heading">
            <div>
              <span className="section-kicker">Plastic / disposable items</span>
              <h2>Enter quantity and rate</h2>
              <p>
                Example: 330 plates × ₹6 = ₹1,980. Keep the legacy Fuel row at zero and use Gas & Transport for LPG/fuel.
              </p>
            </div>
            <button className="secondary-button" type="button" onClick={addItem}>
              + Add Item
            </button>
          </div>

          <div className="table-wrap disposable-table-wrap">
            <table className="disposable-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Rate / item</th>
                  <th>Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {summary.items.map((item) => {
                  const custom = item.id.startsWith('disposable_custom');
                  const legacyFuel = item.name.trim().toLowerCase() === 'fuel';

                  return (
                    <tr key={item.id} className={item.lineTotal > 0 ? 'is-active' : ''}>
                      <td>
                        {custom ? (
                          <input
                            className="input"
                            value={item.name}
                            onChange={(event) => updateItem(item.id, { name: event.target.value })}
                          />
                        ) : (
                          <div className="disposable-name">
                            <strong>{item.name}</strong>
                            {legacyFuel ? <small>Use Gas & Transport instead</small> : null}
                          </div>
                        )}
                      </td>
                      <td>
                        <input
                          className="input disposable-number"
                          type="number"
                          min="0"
                          step="1"
                          inputMode="decimal"
                          value={item.quantity || ''}
                          placeholder="0"
                          onChange={(event) =>
                            updateItem(item.id, { quantity: numberValue(event.target.value) })
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="input disposable-number"
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          value={item.unitCost || ''}
                          placeholder="₹0"
                          onChange={(event) =>
                            updateItem(item.id, { unitCost: numberValue(event.target.value) })
                          }
                        />
                      </td>
                      <td><b>{money(item.lineTotal)}</b></td>
                      <td>
                        {custom ? (
                          <button
                            type="button"
                            className="ghost-button disposable-remove"
                            onClick={() => removeCustomItem(item.id)}
                          >
                            Remove
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card">
          <div className="final-costing-section-heading">
            <div>
              <span className="section-kicker">Cost summary</span>
              <h2>Plastic & disposable cost added to the event</h2>
            </div>
          </div>

          <div className="final-profit-strip is-positive">
            <div>
              <span>Disposable total</span>
              <b>{money(summary.total)}</b>
            </div>
            <div>
              <span>Meal covers</span>
              <b>{totalCovers.toLocaleString('en-IN')}</b>
            </div>
            <div>
              <span>Cost / cover</span>
              <b>{money(perCover)}</b>
            </div>
            <div>
              <span>Active items</span>
              <b>{summary.activeItemCount}</b>
            </div>
          </div>

          {message ? <div className="admin-message" style={{ marginTop: 14 }}>{message}</div> : null}
        </div>

        <div className="action-row page-actions">
          <button className="primary-button" type="button" onClick={continueToPricing}>
            Save & Continue to Pricing
          </button>
          <button className="ghost-button" type="button" onClick={() => router.push('/app/operations')}>
            Back to Gas & Transport
          </button>
        </div>

        <style>{`
          .disposable-page{padding-bottom:28px}.disposable-table{width:100%;border-collapse:collapse}.disposable-table th,.disposable-table td{padding:11px 10px;border-bottom:1px solid rgba(148,163,184,.14);text-align:left;vertical-align:middle}.disposable-table th{color:var(--muted);font-size:11px;font-weight:700}.disposable-table td:nth-child(2),.disposable-table td:nth-child(3),.disposable-table td:nth-child(4){width:150px}.disposable-number{min-width:110px}.disposable-name{display:grid;gap:2px}.disposable-name small{color:#f59e0b;font-size:10px}.disposable-remove{padding:7px 10px}.disposable-table tr.is-active{background:rgba(59,130,246,.04)}.disposable-card-list{display:none}@media(max-width:720px){.disposable-table-wrap{display:none}.disposable-card-list{display:grid;gap:10px;margin-top:14px}.disposable-mobile-card{display:grid;gap:12px;padding:14px;border:1px solid rgba(148,163,184,.16);border-radius:16px;background:rgba(148,163,184,.025)}.disposable-mobile-card.is-active{border-color:rgba(59,130,246,.28);background:rgba(59,130,246,.055)}.disposable-mobile-card-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.disposable-mobile-card-heading>div{display:grid;gap:3px;min-width:0}.disposable-mobile-card-heading strong{font-size:14px}.disposable-mobile-card-heading small{color:#f59e0b;font-size:10px}.disposable-mobile-card-heading>b{font-size:16px;white-space:nowrap}.disposable-mobile-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px}.disposable-mobile-total{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:10px;border-top:1px solid rgba(148,163,184,.12)}.disposable-mobile-total span{color:var(--muted);font-size:11px}.disposable-mobile-total strong{font-size:15px}.disposable-page .final-costing-section-heading{align-items:flex-start;gap:14px}}@media(max-width:420px){.disposable-mobile-fields{grid-template-columns:1fr}}
        `}</style>
      </section>
    </AppShell>
  );
}
