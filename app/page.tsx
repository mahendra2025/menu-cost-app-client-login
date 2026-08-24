'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CustomerShell from './components/customer/CustomerShell';
import { emptyCustomerPlan, loadCustomerPlan, saveCustomerPlan } from '../lib/customerPlan';
import type { CustomerPlan } from '../lib/types';

export default function HomePage() {
  const router = useRouter();
  const [plan, setPlan] = useState<CustomerPlan>(emptyCustomerPlan);
  const [error, setError] = useState('');
  useEffect(() => { setPlan(loadCustomerPlan()); }, []);
  function update(key: keyof CustomerPlan['event'], value: string | number) {
    setPlan((current) => ({ ...current, event: { ...current.event, [key]: value } }));
  }
  function continueToMenu() {
    if (!plan.event.eventType || !plan.event.mealType || !plan.event.city.trim() || plan.event.pax < 1) {
      setError('Choose an event, meal and city, and enter at least one guest.');
      return;
    }
    setError(''); saveCustomerPlan(plan); router.push('/plan/menu');
  }
  function submit(event: FormEvent) { event.preventDefault(); continueToMenu(); }
  const eventTypes = ['Wedding', 'Birthday', 'Corporate', 'House Party', 'Other'];
  const mealTypes = ['Breakfast', 'Lunch', 'Hi Tea', 'Dinner'];

  return <CustomerShell step={1}>
    <section className="customer-hero customer-event-layout">
      <div className="customer-hero-copy">
        <p className="customer-kicker">Plan your celebration</p>
        <h1>A menu your guests remember. A price you can plan around.</h1>
        <p>Tell us about your event, choose the dishes you love, and get an instant catering estimate.</p>
        <div className="invitation-note" aria-hidden="true"><span>आपका स्वागत है</span><b>Good food begins<br />with a good plan.</b></div>
      </div>
      <form id="customer-event-form" className="customer-card event-form" onSubmit={submit}>
        <div className="customer-card-heading"><span>01</span><div><h2>Event details</h2><p>Start with the essentials.</p></div></div>
        <div className="choice-field span-two"><span>What are you celebrating?</span><div className="event-choice-grid">{eventTypes.map((type) => <button type="button" className={plan.event.eventType === type ? 'selected' : ''} aria-pressed={plan.event.eventType === type} onClick={() => update('eventType', type)} key={type}>{type}</button>)}</div></div>
        <div className="customer-form-grid event-fields">
          <label><span>Event name <em>Optional</em></span><input value={plan.event.eventName} onChange={(e) => update('eventName', e.target.value)} placeholder="Mehta family wedding" /></label>
          <label><span>Event date</span><input type="date" value={plan.event.eventDate} onChange={(e) => update('eventDate', e.target.value)} /></label>
          <label><span>City</span><input required value={plan.event.city} onChange={(e) => update('city', e.target.value)} placeholder="Silvassa" /></label>
          <label><span>Venue <em>Optional</em></span><input value={plan.event.venue} onChange={(e) => update('venue', e.target.value)} placeholder="Venue or area" /></label>
        </div>
        <div className="guest-field"><span>How many guests?</span><div><button type="button" aria-label="Remove 25 guests" onClick={() => update('pax', Math.max(0, plan.event.pax - 25))}>−</button><input aria-label="Number of guests" min="1" max="100000" inputMode="numeric" pattern="[0-9]*" type="number" value={plan.event.pax || ''} onChange={(e) => update('pax', Number(e.target.value))} placeholder="300" /><button type="button" aria-label="Add 25 guests" onClick={() => update('pax', plan.event.pax + 25)}>+</button></div><small>Use the buttons or type the exact number.</small></div>
        <div className="choice-field meal-field"><span>Which meal?</span><div className="meal-choice-grid">{mealTypes.map((meal) => <button type="button" className={plan.event.mealType === meal ? 'selected' : ''} aria-pressed={plan.event.mealType === meal} onClick={() => update('mealType', meal)} key={meal}>{meal}</button>)}</div></div>
        {error ? <div className="customer-inline-error" role="alert">{error}</div> : null}
      </form>
    </section>
    <div className="customer-sticky-action event-sticky"><button className="customer-primary wide" type="button" onClick={continueToMenu}>Next: Select Menu <span>→</span></button></div>
  </CustomerShell>;
}
