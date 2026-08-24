'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import CustomerShell from '../../components/customer/CustomerShell';
import { functionLabel, loadCustomerPlan } from '../../../lib/customerPlan';
import { serviceStyleLabel } from '../../../lib/serviceStaffing';
import type { CustomerEstimate } from '../../../lib/customerPricing';
import type { CustomerFunctionPlan, CustomerPlan } from '../../../lib/types';

type FunctionResult = { functionPlan: CustomerFunctionPlan; estimate: CustomerEstimate };
const money = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`;
const displayDate = (value: string) => value ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`)) : 'Date not set';

export default function ResultPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<CustomerPlan | null>(null);
  const [results, setResults] = useState<FunctionResult[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = loadCustomerPlan();
    if (!saved.event.eventType) { router.replace('/'); return; }
    if (saved.functions.some((item) => !item.selectedDishes.length)) { router.replace('/plan/menu'); return; }
    if (saved.functions.some((item) => !item.serviceStyle)) { router.replace('/plan/service'); return; }
    setPlan(saved);
    Promise.all(saved.functions.map(async (functionPlan) => {
      const response = await fetch('/api/public/customer-estimate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pax: functionPlan.pax, dishIds: functionPlan.selectedDishes.map((dish) => dish.id), serviceStyle: functionPlan.serviceStyle }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      return { functionPlan, estimate: data as CustomerEstimate };
    })).then(setResults).catch(() => setError('We could not calculate every function. Review your menus and try again.'));
  }, [router]);

  const totals = useMemo(() => results.reduce((output, item) => ({ total: output.total + item.estimate.estimatedEventTotal, covers: output.covers + item.functionPlan.pax }), { total: 0, covers: 0 }), [results]);
  if (!plan) return <CustomerShell step={4}><div className="customer-empty">Opening your estimate…</div></CustomerShell>;
  const title = plan.event.eventName || plan.event.eventType;

  return <CustomerShell step={4}>
    <section className="estimate-hero multi-estimate-hero">
      <div><p className="customer-kicker">Your complete catering estimate</p><h1>{title}</h1><p>{plan.functions.length} functions · {totals.covers.toLocaleString('en-IN')} total covers · {plan.event.city}</p></div>
      {results.length === plan.functions.length ? <div className="estimate-price combined-estimate"><small>Combined event total</small><strong>{money(totals.total)}</strong><span>across all functions</span></div> : <div className="estimate-price loading">Calculating every function…</div>}
    </section>
    {error ? <div className="customer-alert">{error}</div> : null}
    <section className="multi-result-layout">
      <div className="multi-result-main">{results.map(({ functionPlan, estimate }, index) => <article className="result-card function-result-card" key={functionPlan.id}>
        <header className="function-result-head"><div><p className="customer-kicker">Function {index + 1}</p><h2>{functionLabel(functionPlan, index)}</h2><span>{displayDate(functionPlan.date)} · {functionPlan.mealType} · {serviceStyleLabel(functionPlan.serviceStyle!)}</span></div><div><strong>{money(estimate.finalPricePerPlate)}</strong><small>/ person</small><b>{money(estimate.estimatedEventTotal)} total</b></div></header>
        <div className="function-facts"><span><b>{functionPlan.pax.toLocaleString('en-IN')}</b> guests</span><span><b>{functionPlan.selectedDishes.length}</b> dishes</span><span><b>{serviceStyleLabel(functionPlan.serviceStyle!)}</b> service</span></div>
        <details className="function-menu-details" open={plan.functions.length === 1}><summary>View menu price breakdown <span>{estimate.menuItems.length} dishes</span></summary>
          <div className="price-list">{estimate.menuItems.map((item) => <div key={item.id}><span><b>{item.name}</b><small>{item.category}</small></span><span><b>{money(item.customerPricePerPlate)}<small>/person</small></b><small>{functionPlan.pax.toLocaleString('en-IN')} guests · {money(item.totalForGuests)}</small></span></div>)}</div>
        </details>
        <div className="price-summary compact-summary"><div><span>Menu</span><b>{money(estimate.menuPricePerPlate)} / person</b></div><div><span>Service</span><b>{money(estimate.servicePricePerPlate)} / person</b></div><div><span>Event services</span><b>{money(estimate.operationsPricePerPlate)} / person</b></div><div className="total"><span>Function estimate</span><b>{money(estimate.estimatedEventTotal)}</b></div></div>
      </article>)}</div>
      <aside className="result-side multi-result-side"><article className="result-card event-recap"><p className="customer-kicker">Event summary</p><h2>All functions</h2><dl><div><dt>Event</dt><dd>{plan.event.eventType}</dd></div><div><dt>Location</dt><dd>{plan.event.city}<small>{plan.event.venue}</small></dd></div><div><dt>Functions</dt><dd>{plan.functions.length}</dd></div><div><dt>Total covers</dt><dd>{totals.covers.toLocaleString('en-IN')}</dd></div><div><dt>Combined estimate</dt><dd>{results.length ? money(totals.total) : 'Calculating…'}</dd></div></dl></article><div className="edit-actions"><Link href="/">Edit Event</Link><Link href="/plan/menu">Edit Menus</Link><Link href="/plan/service">Change Services</Link></div></aside>
    </section>
    {results.length === plan.functions.length ? <div className="mobile-estimate-bar combined-mobile-bar"><span><b>{plan.functions.length}</b> functions</span><span><b>{money(totals.total)}</b> combined</span></div> : null}
  </CustomerShell>;
}
