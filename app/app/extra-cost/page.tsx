'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell, { LockedCard } from '../../components/AppShell';
import StatCard from '../../components/StatCard';
import { defaultDisposableItems, getSession, loadWork, saveWork, uid } from '../../../lib/store';
import type { DisposableCostItem, Session, WorkState } from '../../../lib/types';

function money(value: number) {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

const defaultDisposableIds = new Set(
  defaultDisposableItems.map((item) => item.id),
);

export default function ExtraCostPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [work, setWork] = useState<WorkState | null>(null);

  useEffect(() => {
    const current = getSession();
    setSession(current);
    if (current) setWork(loadWork(current.tenantId));
  }, []);

  const disposableTotal = useMemo(
    () =>
      (work?.disposableItems ?? []).reduce(
        (sum, item) =>
          sum +
          Math.max(0, Number(item.quantity) || 0) *
            Math.max(0, Number(item.unitCost) || 0),
        0,
      ),
    [work?.disposableItems],
  );

  if (!work || !session) {
    return <AppShell title="Extra Cost"><div className="content-grid"><div className="glass-card">Loading...</div></div></AppShell>;
  }

  if (session.status === 'EXPIRED') {
    return <AppShell title="Extra Cost"><LockedCard /></AppShell>;
  }

  const extraTotal =
    Math.max(0, Number(work.extras.staff) || 0) +
    Math.max(0, Number(work.extras.transport) || 0) +
    Math.max(0, Number(work.extras.gasFuel) || 0) +
    disposableTotal +
    Math.max(0, Number(work.extras.other) || 0);

  function persist(next: WorkState) {
    if (!session) return;
    setWork(next);
    saveWork(session.tenantId, next);
  }

  function updateExtra(key: 'transport' | 'gasFuel' | 'other', value: number) {
    if (!work) return;
    persist({
      ...work,
      extras: {
        ...work.extras,
        [key]: Math.max(0, value),
        disposable: disposableTotal,
      },
    });
  }

  function persistDisposableItems(items: DisposableCostItem[]) {
    if (!work) return;
    const nextDisposableTotal = items.reduce(
      (sum, item) =>
        sum +
        Math.max(0, Number(item.quantity) || 0) *
          Math.max(0, Number(item.unitCost) || 0),
      0,
    );

    persist({
      ...work,
      disposableItems: items,
      extras: {
        ...work.extras,
        disposable: nextDisposableTotal,
      },
    });
  }

  function updateDisposableItem(id: string, patch: Partial<DisposableCostItem>) {
    if (!work) return;
    persistDisposableItems(
      work.disposableItems.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    );
  }

  function addDisposableItem() {
    if (!work) return;
    persistDisposableItems([
      ...work.disposableItems,
      {
        id: uid('disposable'),
        name: '',
        quantity: 0,
        unitCost: 0,
      },
    ]);
  }

  function removeDisposableItem(item: DisposableCostItem) {
    if (!work) return;
    if (!window.confirm(`Remove ${item.name || 'this item'}?`)) return;
    persistDisposableItems(
      work.disposableItems.filter((candidate) => candidate.id !== item.id),
    );
  }

  return (
    <AppShell
      title="Extra Cost"
      subtitle="Step 3 of 6: add transport, gas/fuel and disposable supply costs"
    >
      <section className="content-grid">
        <div className="extra-cost-overview">
          <div>
            <span className="page-eyebrow">Event expenses</span>
            <h2>Plan costs beyond food and manpower</h2>
            <p>Enter each supply quantity and unit cost. Totals save automatically and flow into final costing.</p>
          </div>
          <div className="extra-cost-overview-total">
            <span>Total extra cost</span>
            <b>{money(extraTotal)}</b>
          </div>
        </div>

        <div className="stat-grid">
          <StatCard label="Manpower" value={money(work.extras.staff)} note="From Manpower" />
          <StatCard label="Transport" value={money(work.extras.transport)} />
          <StatCard label="Gas / Fuel" value={money(work.extras.gasFuel)} />
          <StatCard label="Disposables" value={money(disposableTotal)} note={`${work.disposableItems.length} items`} />
        </div>

        <div className="glass-card">
          <div className="extra-cost-section-heading">
            <div>
              <span className="section-kicker">Travel &amp; operations</span>
              <h2>Transport and fuel costs</h2>
              <p>Enter the complete event amount for each cost.</p>
            </div>
          </div>
          <div className="three-grid">
            <div className="field">
              <label htmlFor="transportCost">Transport cost</label>
              <input id="transportCost" className="input" type="number" min="0" inputMode="decimal" value={work.extras.transport || ''} onChange={(event) => updateExtra('transport', Number(event.target.value))} placeholder="0" />
            </div>
            <div className="field">
              <label htmlFor="gasFuelCost">Gas / fuel cost</label>
              <input id="gasFuelCost" className="input" type="number" min="0" inputMode="decimal" value={work.extras.gasFuel || ''} onChange={(event) => updateExtra('gasFuel', Number(event.target.value))} placeholder="0" />
            </div>
            <div className="field">
              <label htmlFor="otherCost">Other extra cost</label>
              <input id="otherCost" className="input" type="number" min="0" inputMode="decimal" value={work.extras.other || ''} onChange={(event) => updateExtra('other', Number(event.target.value))} placeholder="0" />
            </div>
          </div>
        </div>

        <div className="glass-card disposable-cost-card">
          <div className="extra-cost-section-heading">
            <div>
              <span className="section-kicker">Disposable supplies</span>
              <h2>Items, quantities and cost</h2>
              <p>Add quantities and unit costs for every disposable item used at the event.</p>
            </div>
            <div className="disposable-total-chip">
              <span>Disposable total</span>
              <b>{money(disposableTotal)}</b>
            </div>
          </div>

          <div className="disposable-cost-list">
            <div className="disposable-cost-row disposable-cost-labels" aria-hidden="true">
              <span>Item</span>
              <span>Quantity</span>
              <span>Unit cost</span>
              <span>Total</span>
              <span>Action</span>
            </div>
            {work.disposableItems.map((item) => {
              const itemTotal =
                Math.max(0, Number(item.quantity) || 0) *
                Math.max(0, Number(item.unitCost) || 0);

              return (
                <div className="disposable-cost-row" key={item.id}>
                  {defaultDisposableIds.has(item.id) ? (
                    <div className="disposable-item-name">
                      <span>Item</span>
                      <strong>{item.name}</strong>
                    </div>
                  ) : (
                    <div className="field">
                      <label className="mobile-field-label" htmlFor={`item-name-${item.id}`}>Item</label>
                      <input id={`item-name-${item.id}`} className="input" value={item.name} onChange={(event) => updateDisposableItem(item.id, { name: event.target.value })} placeholder="Item name" />
                    </div>
                  )}
                  <div className="field">
                    <label className="mobile-field-label" htmlFor={`item-qty-${item.id}`}>Quantity</label>
                    <input id={`item-qty-${item.id}`} className="input" type="number" min="0" step="1" inputMode="numeric" value={item.quantity || ''} onChange={(event) => updateDisposableItem(item.id, { quantity: Math.max(0, Number(event.target.value)) })} placeholder="0" />
                  </div>
                  <div className="field">
                    <label className="mobile-field-label" htmlFor={`item-cost-${item.id}`}>Unit cost</label>
                    <input id={`item-cost-${item.id}`} className="input" type="number" min="0" step="0.01" inputMode="decimal" value={item.unitCost || ''} onChange={(event) => updateDisposableItem(item.id, { unitCost: Math.max(0, Number(event.target.value)) })} placeholder="₹0" />
                  </div>
                  <strong className="disposable-row-total">{money(itemTotal)}</strong>
                  {defaultDisposableIds.has(item.id) ? (
                    <span className="disposable-included-label">Included</span>
                  ) : (
                    <button className="dish-remove-button" type="button" onClick={() => removeDisposableItem(item)}>Remove</button>
                  )}
                </div>
              );
            })}
          </div>

          <button className="extra-cost-add-button" type="button" onClick={addDisposableItem}>
            <span aria-hidden="true">+</span>
            Add more item
          </button>
        </div>

        <div className="action-row page-actions">
          <button className="primary-button" type="button" onClick={() => router.push('/app/cost')}>Next: Calculate Cost</button>
          <button className="ghost-button" type="button" onClick={() => router.push('/app/manpower')}>Back to Manpower</button>
        </div>
      </section>
    </AppShell>
  );
}
