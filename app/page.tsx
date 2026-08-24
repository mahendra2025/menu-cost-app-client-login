'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CustomerShell from './components/customer/CustomerShell';
import { emptyCustomerPlan, loadCustomerPlan, saveCustomerPlan } from '../lib/customerPlan';
import type { CustomerPlan } from '../lib/types';

export default function HomePage() {
  const router = useRouter();
  const [plan, setPlan] = useState<CustomerPlan>(emptyCustomerPlan);
  useEffect(() => { setPlan(loadCustomerPlan()); }, []);
  function update(key: keyof CustomerPlan['event'], value: string | number) {
    setPlan((current) => ({ ...current, event: { ...current.event, [key]: value } }));
  }
  function submit(event: FormEvent) { event.preventDefault(); saveCustomerPlan(plan); router.push('/plan/menu'); }

  return <CustomerShell step={1}>
    <section className="customer-hero customer-event-layout">
      <div className="customer-hero-copy">
        <p className="customer-kicker">Plan your celebration</p>
        <h1>A menu your guests remember. A price you can plan around.</h1>
        <p>Tell us about your event, choose the dishes you love, and get an instant catering estimate.</p>
        <div className="invitation-note" aria-hidden="true"><span>आपका स्वागत है</span><b>Good food begins<br />with a good plan.</b></div>
      </div>
      <form className="customer-card event-form" onSubmit={submit}>
        <div className="customer-card-heading"><span>01</span><div><h2>Event details</h2><p>Start with the essentials.</p></div></div>
        <div className="customer-form-grid">
          <label><span>Event type</span><select required value={plan.event.eventType} onChange={(e) => update('eventType', e.target.value)}><option value="">Select event</option><option>Wedding</option><option>Reception</option><option>Engagement</option><option>Birthday</option><option>Corporate Event</option><option>House Party</option><option>Other</option></select></label>
          <label><span>Event name <em>Optional</em></span><input value={plan.event.eventName} onChange={(e) => update('eventName', e.target.value)} placeholder="Mehta family wedding" /></label>
          <label><span>Event date</span><input required type="date" value={plan.event.eventDate} onChange={(e) => update('eventDate', e.target.value)} /></label>
          <label><span>City</span><input required value={plan.event.city} onChange={(e) => update('city', e.target.value)} placeholder="Silvassa" /></label>
          <label className="span-two"><span>Venue</span><input required value={plan.event.venue} onChange={(e) => update('venue', e.target.value)} placeholder="Venue or area" /></label>
          <label><span>Number of guests</span><input required min="1" max="100000" inputMode="numeric" type="number" value={plan.event.pax || ''} onChange={(e) => update('pax', Number(e.target.value))} placeholder="300" /></label>
          <label><span>Meal type</span><select required value={plan.event.mealType} onChange={(e) => update('mealType', e.target.value)}><option value="">Select meal</option><option>Breakfast</option><option>Lunch</option><option>Hi Tea</option><option>Dinner</option></select></label>
        </div>
        <button className="customer-primary" type="submit">Next: Select Menu <span>→</span></button>
      </form>
    </section>
  </CustomerShell>;
}
