'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CustomerShell from '../../components/customer/CustomerShell';
import { loadCustomerPlan } from '../../../lib/customerPlan';
import { serviceStyleLabel } from '../../../lib/serviceStaffing';
import type { CustomerEstimate } from '../../../lib/customerPricing';
import type { CustomerPlan } from '../../../lib/types';

const money = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`;

export default function ResultPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<CustomerPlan | null>(null);
  const [estimate, setEstimate] = useState<CustomerEstimate | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = loadCustomerPlan();
    if (!saved.event.pax) { router.replace('/'); return; }
    if (!saved.selectedDishes.length) { router.replace('/plan/menu'); return; }
    if (!saved.serviceStyle) { router.replace('/plan/service'); return; }
    setPlan(saved);
    fetch('/api/public/customer-estimate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pax: saved.event.pax, dishIds: saved.selectedDishes.map((dish) => dish.id), serviceStyle: saved.serviceStyle }),
    }).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error); setEstimate(data); }).catch(() => setError('We could not calculate this estimate. Please review your menu and try again.'));
  }, [router]);

  if (!plan) return <CustomerShell step={4}><div className="customer-empty">Opening your estimate…</div></CustomerShell>;
  const title = plan.event.eventName || `${plan.event.eventType} ${plan.event.mealType}`;
  const date = plan.event.eventDate ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${plan.event.eventDate}T12:00:00`)) : '—';

  return <CustomerShell step={4}>
    <section className="estimate-hero">
      <div><p className="customer-kicker">Your catering estimate</p><h1>{title}</h1><p>{plan.event.pax.toLocaleString('en-IN')} Guests · {plan.event.city} · {serviceStyleLabel(plan.serviceStyle!)}</p></div>
      {estimate ? <div className="estimate-price"><small>Estimated price</small><strong>{money(estimate.finalPricePerPlate)}</strong><span>/ person</span><hr /><b>Event total {money(estimate.estimatedEventTotal)}</b></div> : <div className="estimate-price loading">Calculating…</div>}
    </section>
    {error ? <div className="customer-alert">{error}</div> : null}
    <section className="result-grid">
      <div className="result-main">
        <article className="result-card"><div className="result-card-title"><div><p className="customer-kicker">Your selection</p><h2>Menu price breakdown</h2></div><span>{estimate?.menuItems.length || plan.selectedDishes.length} dishes</span></div>
          <div className="price-list">{estimate?.menuItems.map((item) => <div key={item.dishId}><span><b>{item.name}</b><small>{item.category}</small></span><span><b>{money(item.customerPricePerPlate)}<small>/person</small></b><small>{plan.event.pax.toLocaleString('en-IN')} guests → {money(item.totalForGuests)}</small></span></div>)}</div>
          {estimate ? <div className="price-summary"><div><span>Menu</span><b>{money(estimate.foodPricePerPlate)} / person</b></div><div><span>Service & event setup</span><b>{money(estimate.servicePricePerPlate)} / person</b></div><div className="total"><span>Estimated price</span><b>{money(estimate.finalPricePerPlate)} / person</b></div></div> : null}
        </article>
      </div>
      <aside className="result-side">
        <article className="result-card event-recap"><p className="customer-kicker">Event details</p><h2>At a glance</h2>
          <dl><div><dt>Event</dt><dd>{plan.event.eventType}</dd></div><div><dt>Date</dt><dd>{date}</dd></div><div><dt>City / Venue</dt><dd>{plan.event.city}<small>{plan.event.venue}</small></dd></div><div><dt>Guests</dt><dd>{plan.event.pax.toLocaleString('en-IN')}</dd></div><div><dt>Meal</dt><dd>{plan.event.mealType}</dd></div><div><dt>Service</dt><dd>{serviceStyleLabel(plan.serviceStyle!)}</dd></div></dl>
        </article>
        <div className="edit-actions"><Link href="/">Edit Event</Link><Link href="/plan/menu">Edit Menu</Link><Link href="/plan/service">Change Service</Link></div>
        <button className="quote-button" disabled>Request Final Quote <span>Coming soon</span></button>
      </aside>
    </section>
  </CustomerShell>;
}
