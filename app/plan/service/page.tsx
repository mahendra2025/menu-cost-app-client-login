'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CustomerShell from '../../components/customer/CustomerShell';
import { loadCustomerPlan, saveCustomerPlan } from '../../../lib/customerPlan';
import { serviceStyleLabel } from '../../../lib/serviceStaffing';
import type { CustomerPlan, ServiceStyle } from '../../../lib/types';

const services: Array<{ id: ServiceStyle; icon: string; title: string; copy: string; note: string }> = [
  { id: 'BUFFET', icon: '🍽', title: 'Buffet', copy: 'Guests choose food from arranged buffet counters.', note: 'Most popular' },
  { id: 'TABLE_SERVICE', icon: '◇', title: 'Table Service', copy: 'Food is served directly to guest tables.', note: 'Formal hosting' },
  { id: 'LIVE_COUNTER', icon: '◉', title: 'Live Counter', copy: 'Selected dishes are prepared or served fresh at live stations.', note: 'Freshly served' },
  { id: 'PACKED_MEAL', icon: '▣', title: 'Packed Meal', copy: 'Individual packed meals for easy distribution.', note: 'Simple distribution' },
];

export default function ServicePage() {
  const router = useRouter();
  const [plan, setPlan] = useState<CustomerPlan | null>(null);
  useEffect(() => { const saved = loadCustomerPlan(); if (!saved.event.pax) router.replace('/'); else if (!saved.selectedDishes.length) router.replace('/plan/menu'); else setPlan(saved); }, [router]);
  function choose(serviceStyle: ServiceStyle) { if (!plan) return; const next = { ...plan, serviceStyle }; setPlan(next); saveCustomerPlan(next); }
  function calculate() { if (plan?.serviceStyle) { saveCustomerPlan(plan); router.push('/plan/result'); } }

  return <CustomerShell step={3}>
    <section className="customer-flow-heading centered"><p className="customer-kicker">Choose the experience</p><h1>How should your guests be served?</h1><p>Your choice adjusts the service team and setup in the estimate.</p></section>
    <section className="service-grid">{services.map((service) => {
      const selected = plan?.serviceStyle === service.id;
      return <button type="button" onClick={() => choose(service.id)} className={`service-choice ${selected ? 'selected' : ''}`} aria-pressed={selected} key={service.id}><span className="service-icon">{service.icon}</span><span className="service-copy"><small>{service.note}</small><b>{service.title}</b><p>{service.copy}</p></span><i>{selected ? '✓' : '○'}</i></button>;
    })}</section>
    {plan ? <div className="service-summary"><span>{plan.event.pax.toLocaleString('en-IN')} guests</span><i>·</i><span>{plan.selectedDishes.length} dishes</span>{plan.serviceStyle ? <><i>·</i><b>{serviceStyleLabel(plan.serviceStyle)}</b></> : null}</div> : null}
    <div className="customer-sticky-action"><button type="button" className="customer-primary wide" disabled={!plan?.serviceStyle} onClick={calculate}>Calculate Catering Cost <span>→</span></button></div>
  </CustomerShell>;
}
