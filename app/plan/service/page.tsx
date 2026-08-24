'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CustomerShell from '../../components/customer/CustomerShell';
import { functionLabel, loadCustomerPlan, saveCustomerPlan } from '../../../lib/customerPlan';
import { serviceStyleLabel } from '../../../lib/serviceStaffing';
import type { CustomerPlan, ServiceStyle } from '../../../lib/types';

const services: Array<{ id: ServiceStyle; icon: string; title: string; copy: string; note: string }> = [
  { id: 'BUFFET', icon: '🍽', title: 'Buffet', copy: 'Guests choose food from arranged buffet counters.', note: 'Most popular' },
  { id: 'TABLE_SERVICE', icon: '◇', title: 'Table Service', copy: 'Food is served directly to guest tables.', note: 'Formal hosting' },
  { id: 'LIVE_COUNTER', icon: '◉', title: 'Live Counter', copy: 'Selected dishes are served fresh at live stations.', note: 'Freshly served' },
  { id: 'PACKED_MEAL', icon: '▣', title: 'Packed Meal', copy: 'Individual packed meals for easy distribution.', note: 'Simple distribution' },
];

export default function ServicePage() {
  const router = useRouter();
  const [plan, setPlan] = useState<CustomerPlan | null>(null);
  const [activeId, setActiveId] = useState('');
  useEffect(() => {
    const saved = loadCustomerPlan();
    if (!saved.functions.length || saved.functions.some((item) => !item.selectedDishes.length)) { router.replace('/plan/menu'); return; }
    setPlan(saved); setActiveId(saved.functions[0].id);
  }, [router]);
  const activeIndex = Math.max(0, plan?.functions.findIndex((item) => item.id === activeId) ?? 0);
  const activeFunction = plan?.functions[activeIndex];
  function choose(serviceStyle: ServiceStyle) {
    if (!plan || !activeFunction) return;
    const next = { ...plan, functions: plan.functions.map((item) => item.id === activeFunction.id ? { ...item, serviceStyle } : item) };
    setPlan(next); saveCustomerPlan(next);
  }
  function next() {
    if (!plan || !activeFunction?.serviceStyle) return;
    if (activeIndex < plan.functions.length - 1) { setActiveId(plan.functions[activeIndex + 1].id); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    const missing = plan.functions.find((item) => !item.serviceStyle);
    if (missing) { setActiveId(missing.id); return; }
    saveCustomerPlan(plan); router.push('/plan/result');
  }
  const actionLabel = activeIndex < (plan?.functions.length || 1) - 1 ? 'Next Function' : 'Calculate Full Event Cost';

  return <CustomerShell step={3}>
    <section className="customer-flow-heading centered"><p className="customer-kicker">Choose each experience</p><h1>How should guests be served?</h1><p>Select a service style for every function.</p></section>
    <nav className="function-switcher service-function-switcher" aria-label="Event functions">{plan?.functions.map((item, index) => <button type="button" className={item.id === activeFunction?.id ? 'active' : ''} onClick={() => setActiveId(item.id)} key={item.id}><span>{item.serviceStyle ? '✓' : index + 1}</span><b>{functionLabel(item, index)}</b><small>{item.serviceStyle ? serviceStyleLabel(item.serviceStyle) : 'Choose service'}</small></button>)}</nav>
    {activeFunction ? <div className="service-function-title"><span>Function {activeIndex + 1} of {plan?.functions.length}</span><h2>{functionLabel(activeFunction, activeIndex)}</h2><p>{activeFunction.mealType} · {activeFunction.pax.toLocaleString('en-IN')} guests · {activeFunction.selectedDishes.length} dishes</p></div> : null}
    <section className="service-grid">{services.map((service) => { const selected = activeFunction?.serviceStyle === service.id; return <button type="button" onClick={() => choose(service.id)} className={`service-choice ${selected ? 'selected' : ''}`} aria-pressed={selected} key={service.id}><span className="service-icon">{service.icon}</span><span className="service-copy"><small>{service.note}</small><b>{service.title}</b><p>{service.copy}</p></span><i>{selected ? '✓' : '○'}</i></button>; })}</section>
    {activeFunction ? <div className="service-summary"><span>{activeFunction.pax.toLocaleString('en-IN')} guests</span><i>·</i><span>{activeFunction.selectedDishes.length} dishes</span>{activeFunction.serviceStyle ? <><i>·</i><b>{serviceStyleLabel(activeFunction.serviceStyle)}</b></> : null}</div> : null}
    <div className="customer-sticky-action"><span><b>{plan?.functions.filter((item) => item.serviceStyle).length || 0}</b> of {plan?.functions.length || 1}</span><button type="button" className="customer-primary" disabled={!activeFunction?.serviceStyle} onClick={next}>{actionLabel} <span>→</span></button></div>
  </CustomerShell>;
}
