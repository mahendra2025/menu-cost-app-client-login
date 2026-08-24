'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import CustomerShell from '../../components/customer/CustomerShell';
import { loadCustomerPlan, saveCustomerPlan } from '../../../lib/customerPlan';
import type { CustomerPlan, CustomerSelectedDish } from '../../../lib/types';

export default function MenuPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<CustomerPlan | null>(null);
  const [dishes, setDishes] = useState<CustomerSelectedDish[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = loadCustomerPlan();
    if (!saved.event.pax) { router.replace('/'); return; }
    setPlan(saved);
    fetch('/api/public/dishes').then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setDishes(data.items || []);
    }).catch(() => setError('The menu could not be loaded. Please try again.'));
  }, [router]);

  const categories = useMemo(() => ['All', ...Array.from(new Set(dishes.map((dish) => dish.category)))], [dishes]);
  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('en-IN');
    return dishes.filter((dish) => (category === 'All' || dish.category === category) && (!query || `${dish.name} ${dish.category}`.toLocaleLowerCase('en-IN').includes(query)));
  }, [dishes, search, category]);
  const selectedIds = new Set(plan?.selectedDishes.map((dish) => dish.id) || []);

  function toggle(dish: CustomerSelectedDish) {
    if (!plan) return;
    const selectedDishes = selectedIds.has(dish.id) ? plan.selectedDishes.filter((item) => item.id !== dish.id) : [...plan.selectedDishes, dish];
    const next = { ...plan, selectedDishes };
    setPlan(next); saveCustomerPlan(next);
  }
  function next() { if (plan?.selectedDishes.length) { saveCustomerPlan(plan); router.push('/plan/service'); } }

  return <CustomerShell step={2}>
    <section className="customer-flow-heading menu-heading"><p className="customer-kicker">Choose your menu</p><h1>What would you love to serve?</h1><p><b>{plan?.event.eventType} {plan?.event.mealType}</b><span> · </span>{plan?.event.pax.toLocaleString('en-IN')} guests</p></section>
    <section className="menu-toolbar">
      <label className="customer-search"><span aria-hidden="true">⌕</span><input type="search" inputMode="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search dishes…" aria-label="Search dishes" /></label>
      <div className="selected-counter"><b>{plan?.selectedDishes.length || 0}</b><span>dishes selected</span></div>
    </section>
    <div className="category-tabs" role="tablist" aria-label="Dish categories">{categories.map((item) => <button type="button" role="tab" aria-selected={category === item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)} key={item}>{item}</button>)}</div>
    {error ? <div className="customer-alert">{error}</div> : null}
    {!error && !dishes.length ? <div className="customer-empty">Preparing the dish menu…</div> : null}
    {Boolean(dishes.length) && !visible.length ? <div className="customer-empty">No dishes match that search.</div> : null}
    <section className="dish-grid">{visible.map((dish) => {
      const selected = selectedIds.has(dish.id);
      return <button type="button" key={dish.id} className={`dish-choice ${selected ? 'selected' : ''}`} onClick={() => toggle(dish)} aria-pressed={selected}><span className="dish-initial">{dish.name.charAt(0)}</span><span><b>{dish.name}</b><small>{dish.category}</small></span><i>{selected ? '✓' : '+'}</i></button>;
    })}</section>
    {drawerOpen ? <div className="drawer-backdrop" role="presentation" onClick={() => setDrawerOpen(false)}><section className="menu-drawer" role="dialog" aria-modal="true" aria-label="Your selected menu" onClick={(event) => event.stopPropagation()}><div className="drawer-handle" /><header><div><p className="customer-kicker">Your Menu</p><h2>{plan?.selectedDishes.length || 0} dishes selected</h2></div><button type="button" aria-label="Close selected menu" onClick={() => setDrawerOpen(false)}>×</button></header><div className="drawer-list">{plan?.selectedDishes.length ? plan.selectedDishes.map((dish) => <div key={dish.id}><span><b>{dish.name}</b><small>{dish.category}</small></span><button type="button" aria-label={`Remove ${dish.name}`} onClick={() => toggle(dish)}>×</button></div>) : <p>Your menu is empty. Add dishes to continue.</p>}</div><button type="button" className="customer-primary wide" disabled={!plan?.selectedDishes.length} onClick={next}>Next: Choose Service <span>→</span></button></section></div> : null}
    <div className="customer-sticky-action menu-sticky"><button type="button" className="selected-bar-button" onClick={() => setDrawerOpen(true)}><b>{plan?.selectedDishes.length || 0}</b> dishes selected</button><button type="button" className="customer-primary" disabled={!plan?.selectedDishes.length} onClick={next}>Continue <span>→</span></button></div>
  </CustomerShell>;
}
