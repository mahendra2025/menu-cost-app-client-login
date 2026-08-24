'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CustomerShell from './components/customer/CustomerShell';
import { createCustomerFunction, emptyCustomerPlan, functionLabel, loadCustomerPlan, saveCustomerPlan } from '../lib/customerPlan';
import type { CustomerFunctionPlan, CustomerPlan } from '../lib/types';

const EVENT_TYPES = ['Wedding', 'Birthday', 'Corporate', 'House Party', 'Other'];
const MEAL_TYPES = ['Breakfast', 'Lunch', 'Hi Tea', 'Dinner'];

export default function HomePage() {
  const router = useRouter();
  const [plan, setPlan] = useState<CustomerPlan>(emptyCustomerPlan);
  const [customMealIds, setCustomMealIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    const saved = loadCustomerPlan();
    setPlan(saved);
    setCustomMealIds(saved.functions.filter((item) => item.mealType && !MEAL_TYPES.includes(item.mealType)).map((item) => item.id));
  }, []);

  function updateEvent(key: keyof CustomerPlan['event'], value: string) {
    setPlan((current) => ({ ...current, event: { ...current.event, [key]: value } }));
  }
  function updateFunction(id: string, patch: Partial<CustomerFunctionPlan>) {
    setPlan((current) => ({ ...current, functions: current.functions.map((item) => item.id === id ? { ...item, ...patch } : item) }));
  }
  function addFunction() {
    setPlan((current) => ({ ...current, functions: [...current.functions, createCustomerFunction(current.functions.length)] }));
  }
  function removeFunction(id: string) {
    setPlan((current) => current.functions.length === 1 ? current : { ...current, functions: current.functions.filter((item) => item.id !== id) });
    setCustomMealIds((current) => current.filter((itemId) => itemId !== id));
  }
  function selectMeal(id: string, mealType: string) {
    setCustomMealIds((current) => current.filter((itemId) => itemId !== id));
    updateFunction(id, { mealType });
  }
  function selectCustomMeal(item: CustomerFunctionPlan) {
    setCustomMealIds((current) => current.includes(item.id) ? current : [...current, item.id]);
    if (MEAL_TYPES.includes(item.mealType)) updateFunction(item.id, { mealType: '' });
  }
  function continueToMenu() {
    const incomplete = plan.functions.find((item) => item.pax < 1 || !item.mealType.trim());
    if (!plan.event.eventType || !plan.event.city.trim() || incomplete) {
      setError('Choose the event and city, then add a meal and guest count for every function.');
      return;
    }
    setError(''); saveCustomerPlan(plan); router.push('/plan/menu');
  }
  function submit(event: FormEvent) { event.preventDefault(); continueToMenu(); }

  return <CustomerShell step={1}>
    <section className="customer-hero customer-event-layout multi-event-layout">
      <div className="customer-hero-copy">
        <p className="customer-kicker">Plan the whole celebration</p>
        <h1>One event. Every function. One clear estimate.</h1>
        <p>Plan breakfast, mehendi, sangeet, wedding dinner and more—each with its own guests, menu and service.</p>
        <div className="itinerary-preview" aria-hidden="true"><span>DAY 01</span><b>Mehendi Lunch</b><i>→</i><span>DAY 02</span><b>Wedding Dinner</b></div>
      </div>
      <form id="customer-event-form" className="customer-card event-form multi-event-form" onSubmit={submit}>
        <div className="customer-card-heading"><span>01</span><div><h2>Event details</h2><p>Start with the celebration.</p></div></div>
        <div className="choice-field"><span>What are you celebrating?</span><div className="event-choice-grid">{EVENT_TYPES.map((type) => <button type="button" className={plan.event.eventType === type ? 'selected' : ''} aria-pressed={plan.event.eventType === type} onClick={() => updateEvent('eventType', type)} key={type}>{type}</button>)}</div></div>
        <div className="customer-form-grid event-fields">
          <label><span>Event name <em>Optional</em></span><input value={plan.event.eventName} onChange={(e) => updateEvent('eventName', e.target.value)} placeholder="Mehta family wedding" /></label>
          <label><span>City</span><input required value={plan.event.city} onChange={(e) => updateEvent('city', e.target.value)} placeholder="Silvassa" /></label>
          <label className="span-two"><span>Venue <em>Optional</em></span><input value={plan.event.venue} onChange={(e) => updateEvent('venue', e.target.value)} placeholder="Venue or area" /></label>
        </div>

        <section className="function-planner">
          <header><div><p className="customer-kicker">Event itinerary</p><h3>Functions</h3></div><button type="button" onClick={addFunction}>＋ Add function</button></header>
          <div className="function-editor-list">{plan.functions.map((item, index) => <article className="function-editor-card" key={item.id}>
            <div className="function-editor-head"><span>{String(index + 1).padStart(2, '0')}</span><div><b>{functionLabel(item, index)}</b><small>{item.pax ? `${item.pax.toLocaleString('en-IN')} guests` : 'Add function details'}</small></div>{plan.functions.length > 1 ? <button type="button" aria-label={`Remove ${functionLabel(item, index)}`} onClick={() => removeFunction(item.id)}>×</button> : null}</div>
            <div className="function-fields">
              <label><span>Function name <em>Optional</em></span><input value={item.name} onChange={(e) => updateFunction(item.id, { name: e.target.value })} placeholder="Mehendi, Sangeet…" /></label>
              <label><span>Date <em>Optional</em></span><input type="date" value={item.date} onChange={(e) => updateFunction(item.id, { date: e.target.value })} /></label>
            </div>
            <div className="guest-field compact"><span>Guests</span><div><button type="button" aria-label={`Remove 25 guests from ${functionLabel(item, index)}`} onClick={() => updateFunction(item.id, { pax: Math.max(0, item.pax - 25) })}>−</button><input aria-label={`Guests for ${functionLabel(item, index)}`} min="1" max="100000" inputMode="numeric" pattern="[0-9]*" type="number" value={item.pax || ''} onChange={(e) => updateFunction(item.id, { pax: Number(e.target.value) })} placeholder="300" /><button type="button" aria-label={`Add 25 guests to ${functionLabel(item, index)}`} onClick={() => updateFunction(item.id, { pax: item.pax + 25 })}>+</button></div></div>
            <div className="choice-field compact-meal">
              <span>Meal</span>
              <div className="meal-choice-grid">
                {MEAL_TYPES.map((meal) => <button type="button" className={item.mealType === meal && !customMealIds.includes(item.id) ? 'selected' : ''} aria-pressed={item.mealType === meal && !customMealIds.includes(item.id)} onClick={() => selectMeal(item.id, meal)} key={meal}>{meal}</button>)}
                <button type="button" className={`custom-meal-trigger ${customMealIds.includes(item.id) ? 'selected' : ''}`} aria-pressed={customMealIds.includes(item.id)} aria-expanded={customMealIds.includes(item.id)} onClick={() => selectCustomMeal(item)}>＋ Custom</button>
              </div>
              {customMealIds.includes(item.id) ? <label className="custom-meal-field"><span>Custom meal name</span><input required value={item.mealType} onChange={(event) => updateFunction(item.id, { mealType: event.target.value })} placeholder="Brunch, supper, midnight snacks…" /></label> : null}
            </div>
          </article>)}</div>
        </section>
        {error ? <div className="customer-inline-error" role="alert">{error}</div> : null}
      </form>
    </section>
    <div className="customer-sticky-action event-sticky"><span><b>{plan.functions.length}</b> function{plan.functions.length === 1 ? '' : 's'}</span><button className="customer-primary" type="button" onClick={continueToMenu}>Next: Select Menus <span>→</span></button></div>
  </CustomerShell>;
}
