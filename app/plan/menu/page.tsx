'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import CustomerShell from '../../components/customer/CustomerShell';
import { functionLabel, loadCustomerPlan, saveCustomerPlan } from '../../../lib/customerPlan';
import type { CustomerPlan, CustomerSelectedDish } from '../../../lib/types';

export default function MenuPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<CustomerPlan | null>(null);
  const [activeId, setActiveId] = useState('');
  const [dishes, setDishes] = useState<CustomerSelectedDish[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = loadCustomerPlan();
    if (!saved.event.eventType || !saved.functions.length || saved.functions.some((item) => item.pax < 1 || !item.mealType)) { router.replace('/'); return; }
    setPlan(saved); setActiveId(saved.functions[0].id);
    fetch('/api/public/dishes').then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error); setDishes(data.items || []); }).catch(() => setError('The menu could not be loaded. Please try again.'));
  }, [router]);

  const activeIndex = Math.max(0, plan?.functions.findIndex((item) => item.id === activeId) ?? 0);
  const activeFunction = plan?.functions[activeIndex];
  const categories = useMemo(() => ['All', ...Array.from(new Set(dishes.map((dish) => dish.category)))], [dishes]);
  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('en-IN');
    return dishes.filter((dish) => (category === 'All' || dish.category === category) && (!query || `${dish.name} ${dish.category}`.toLocaleLowerCase('en-IN').includes(query)));
  }, [dishes, search, category]);
  const selectedIds = new Set(activeFunction?.selectedDishes.map((dish) => dish.id) || []);

  function toggle(dish: CustomerSelectedDish) {
    if (!plan || !activeFunction) return;
    const selectedDishes = selectedIds.has(dish.id) ? activeFunction.selectedDishes.filter((item) => item.id !== dish.id) : [...activeFunction.selectedDishes, dish];
    const next = { ...plan, functions: plan.functions.map((item) => item.id === activeFunction.id ? { ...item, selectedDishes } : item) };
    setPlan(next); saveCustomerPlan(next);
  }
  function next() {
    if (!plan || !activeFunction?.selectedDishes.length) return;
    if (activeIndex < plan.functions.length - 1) { setActiveId(plan.functions[activeIndex + 1].id); setDrawerOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    const missing = plan.functions.find((item) => !item.selectedDishes.length);
    if (missing) { setActiveId(missing.id); setDrawerOpen(false); return; }
    saveCustomerPlan(plan); router.push('/plan/service');
  }
  const actionLabel = activeIndex < (plan?.functions.length || 1) - 1 ? 'Next Function' : 'Next: Choose Service';

  return <CustomerShell step={2}>
    <section className="customer-flow-heading menu-heading"><p className="customer-kicker">Choose your menus</p><h1>Build each function’s menu.</h1><p>{plan?.event.eventName || plan?.event.eventType} · {plan?.functions.length || 1} function{plan?.functions.length === 1 ? '' : 's'}</p></section>
    <nav className="function-switcher" aria-label="Event functions">{plan?.functions.map((item, index) => <button type="button" className={item.id === activeFunction?.id ? 'active' : ''} onClick={() => { setActiveId(item.id); setDrawerOpen(false); }} key={item.id}><span>{index + 1}</span><b>{functionLabel(item, index)}</b><small>{item.pax.toLocaleString('en-IN')} guests · {item.selectedDishes.length} dishes</small></button>)}</nav>
    {activeFunction ? <section className="active-function-banner"><span>Function {activeIndex + 1} of {plan?.functions.length}</span><b>{functionLabel(activeFunction, activeIndex)}</b><small>{activeFunction.mealType} · {activeFunction.pax.toLocaleString('en-IN')} guests</small></section> : null}
    <section className="menu-toolbar"><label className="customer-search"><span aria-hidden="true">⌕</span><input type="search" inputMode="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search dishes…" aria-label="Search dishes" /></label><div className="selected-counter"><b>{activeFunction?.selectedDishes.length || 0}</b><span>dishes selected</span></div></section>
    <div className="category-tabs" role="tablist" aria-label="Dish categories">{categories.map((item) => <button type="button" role="tab" aria-selected={category === item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)} key={item}>{item}</button>)}</div>
    {error ? <div className="customer-alert">{error}</div> : null}
    {!error && !dishes.length ? <div className="customer-empty">Preparing the dish menu…</div> : null}
    {Boolean(dishes.length) && !visible.length ? <div className="customer-empty">No dishes match that search.</div> : null}
    <section className="dish-grid">{visible.map((dish) => { const selected = selectedIds.has(dish.id); return <button type="button" key={dish.id} className={`dish-choice ${selected ? 'selected' : ''}`} onClick={() => toggle(dish)} aria-pressed={selected}><span className="dish-initial">{dish.name.charAt(0)}</span><span><b>{dish.name}</b><small>{dish.category}</small></span><i>{selected ? '✓' : '+'}</i></button>; })}</section>
    {drawerOpen ? <div className="drawer-backdrop" role="presentation" onClick={() => setDrawerOpen(false)}><section className="menu-drawer" role="dialog" aria-modal="true" aria-label="Your selected menu" onClick={(event) => event.stopPropagation()}><div className="drawer-handle" /><header><div><p className="customer-kicker">{activeFunction ? functionLabel(activeFunction, activeIndex) : 'Your menu'}</p><h2>{activeFunction?.selectedDishes.length || 0} dishes selected</h2></div><button type="button" aria-label="Close selected menu" onClick={() => setDrawerOpen(false)}>×</button></header><div className="drawer-list">{activeFunction?.selectedDishes.length ? activeFunction.selectedDishes.map((dish) => <div key={dish.id}><span><b>{dish.name}</b><small>{dish.category}</small></span><button type="button" aria-label={`Remove ${dish.name}`} onClick={() => toggle(dish)}>×</button></div>) : <p>Your menu is empty. Add dishes to continue.</p>}</div><button type="button" className="customer-primary wide" disabled={!activeFunction?.selectedDishes.length} onClick={next}>{actionLabel} <span>→</span></button></section></div> : null}
    <div className="customer-sticky-action menu-sticky"><button type="button" className="selected-bar-button" onClick={() => setDrawerOpen(true)}><b>{activeFunction?.selectedDishes.length || 0}</b> dishes selected</button><button type="button" className="customer-primary" disabled={!activeFunction?.selectedDishes.length} onClick={next}>{actionLabel} <span>→</span></button></div>
  </CustomerShell>;
}
