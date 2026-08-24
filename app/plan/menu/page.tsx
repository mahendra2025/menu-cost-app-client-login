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
    <section className="customer-flow-heading"><p className="customer-kicker">Build your menu</p><h1>What would you love to serve?</h1><p>Choose as many dishes as you like. You can change them anytime.</p></section>
    <section className="menu-toolbar">
      <label className="customer-search"><span aria-hidden="true">⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search paneer, chaat, dessert…" aria-label="Search dishes" /></label>
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
    {plan?.selectedDishes.length ? <section className="selection-tray"><h2>Your menu <span>{plan.selectedDishes.length}</span></h2><div>{plan.selectedDishes.map((dish) => <button type="button" onClick={() => toggle(dish)} key={dish.id}>{dish.name} <span>×</span></button>)}</div></section> : null}
    <div className="customer-sticky-action"><span><b>{plan?.selectedDishes.length || 0}</b> selected</span><button type="button" className="customer-primary" disabled={!plan?.selectedDishes.length} onClick={next}>Next: Choose Service <span>→</span></button></div>
  </CustomerShell>;
}
