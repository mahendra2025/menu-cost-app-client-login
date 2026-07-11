'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell, { LockedCard } from '../../components/AppShell';
import { CATEGORIES, detectCost } from '../../../lib/dishCostMaster';
import { getSession, loadWork, saveWork, uid } from '../../../lib/store';
import type { MenuItem, Session, WorkState } from '../../../lib/types';

export default function MenuPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [work, setWork] = useState<WorkState | null>(null);
  const [newDish, setNewDish] = useState('');
  const [newCategory, setNewCategory] = useState('Sabji');

  useEffect(() => {
    const current = getSession();
    setSession(current);
    if (current) setWork(loadWork(current.tenantId));
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    (work?.menu ?? []).forEach((item) => {
      map.set(item.category, [...(map.get(item.category) ?? []), item]);
    });
    return Array.from(map.entries());
  }, [work]);

  if (!work || !session) return <AppShell title="Menu"><div className="content-grid"><div className="glass-card">Loading...</div></div></AppShell>;
  if (session.status === 'EXPIRED') return <AppShell title="Menu"><LockedCard /></AppShell>;

  function persist(next: WorkState) {
    if (!session) return;
    setWork(next);
    saveWork(session.tenantId, next);
  }

  function updateItem(id: string, patch: Partial<MenuItem>) {
    if (!work) return;
    const next = {
      ...work,
      menu: work.menu.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...patch };
        if (patch.category && !patch.costPerPlate) updated.costPerPlate = detectCost(updated.name, updated.category);
        return updated;
      }),
    };
    persist(next);
  }

  function addDish() {
    if (!newDish.trim() || !work) return;
    const item: MenuItem = {
      id: uid('dish'),
      name: newDish.trim(),
      category: newCategory,
      costPerPlate: detectCost(newDish.trim(), newCategory),
    };
    persist({ ...work, menu: [...work.menu, item] });
    setNewDish('');
  }

  function removeDish(id: string) {
    if (!work) return;
    persist({ ...work, menu: work.menu.filter((item) => item.id !== id) });
  }

  return (
    <AppShell title="Menu" subtitle="Second page: check detected dishes category-wise">
      <section className="content-grid">
        <div className="stat-grid">
          <div className="stat-card"><small>Step</small><strong>2/5</strong><span>Menu check</span></div>
          <div className="stat-card"><small>Dishes</small><strong>{work.menu.length}</strong><span>Total selected</span></div>
          <div className="stat-card"><small>Categories</small><strong>{grouped.length}</strong><span>Auto grouped</span></div>
          <div className="stat-card"><small>Next</small><strong>Cost</strong><span>Per plate</span></div>
        </div>

        <div className="glass-card">
          <div className="section-kicker">Quick Add</div>
          <h2>Add Dish</h2>
          <div className="helper-card" style={{ marginBottom: 16 }}>
            <b>Adjust before pricing</b>
            <p>Rename dishes, fix categories, or add missing items here. This is the easiest place to clean up the menu on mobile.</p>
          </div>
          <div className="three-grid">
            <div className="field"><label>Dish Name</label><input className="input input-large" value={newDish} onChange={(e) => setNewDish(e.target.value)} placeholder="Paneer Butter Masala" /></div>
            <div className="field"><label>Category</label><select className="select select-large" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></div>
            <div className="field"><label>&nbsp;</label><button className="primary-button full" onClick={addDish}>Add Dish</button></div>
          </div>
        </div>

        <div className="glass-card">
          <div className="section-kicker">Review Items</div>
          <h2>Menu Items</h2>
          {work.menu.length === 0 ? <p className="muted">No dishes yet. Go to Event page, paste menu text, then click “Next: Check Menu”, or add manually here.</p> : null}
          <div className="menu-list">
            {work.menu.map((item) => (
              <div className="menu-row" key={item.id}>
                <div className="menu-cell">
                  <span className="mobile-field-label">Dish</span>
                  <input className="input input-large" value={item.name} onChange={(e) => updateItem(item.id, { name: e.target.value })} />
                </div>
                <div className="menu-cell">
                  <span className="mobile-field-label">Category</span>
                  <select className="select select-large" value={item.category} onChange={(e) => updateItem(item.id, { category: e.target.value })}>
                    {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
                  </select>
                </div>
                <div className="menu-cell">
                  <span className="mobile-field-label">Cost / Plate</span>
                  <input className="input input-large" type="number" value={item.costPerPlate} onChange={(e) => updateItem(item.id, { costPerPlate: Number(e.target.value) })} />
                </div>
                <button className="danger-button" onClick={() => removeDish(item.id)}>Remove</button>
              </div>
            ))}
          </div>
          <div className="action-row page-actions">
            <button className="primary-button" onClick={() => router.push('/app/cost')}>Next: Calculate Cost</button>
            <button className="ghost-button" onClick={() => router.push('/app/event')}>Back to Event</button>
          </div>
        </div>

        {grouped.length ? (
          <div className="glass-card">
            <h2>Category Summary</h2>
            <div className="action-row">
              {grouped.map(([category, items]) => <span className="badge" key={category}>{category}: {items.length}</span>)}
            </div>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
