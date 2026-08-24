'use client';

import type { CustomerFunctionPlan, CustomerPlan } from './types';

export const CUSTOMER_PLAN_KEY = 'menu_cost_customer_plan_v1';

export function createCustomerFunction(index = 0): CustomerFunctionPlan {
  return {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `function_${Date.now()}_${index}`,
    name: '',
    date: '',
    pax: 0,
    mealType: '',
    selectedDishes: [],
    serviceStyle: null,
  };
}

const firstFunction: CustomerFunctionPlan = {
  id: 'function_1', name: '', date: '', pax: 0, mealType: '', selectedDishes: [], serviceStyle: null,
};

export const emptyCustomerPlan: CustomerPlan = {
  event: { eventType: '', eventName: '', eventDate: '', city: '', venue: '', pax: 0, mealType: '' },
  selectedDishes: [],
  serviceStyle: null,
  functions: [firstFunction],
};

function normalizeFunction(value: Partial<CustomerFunctionPlan>, index: number): CustomerFunctionPlan {
  return {
    id: String(value.id || `function_${index + 1}`),
    name: String(value.name || ''),
    date: String(value.date || ''),
    pax: Math.max(0, Number(value.pax) || 0),
    mealType: String(value.mealType || ''),
    selectedDishes: Array.isArray(value.selectedDishes) ? value.selectedDishes : [],
    serviceStyle: value.serviceStyle || null,
  };
}

export function functionLabel(item: CustomerFunctionPlan, index: number) {
  return item.name.trim() || item.mealType || `Function ${index + 1}`;
}

export function loadCustomerPlan(): CustomerPlan {
  if (typeof window === 'undefined') return emptyCustomerPlan;
  try {
    const saved = window.localStorage.getItem(CUSTOMER_PLAN_KEY);
    if (!saved) return emptyCustomerPlan;
    const parsed = JSON.parse(saved) as Partial<CustomerPlan>;
    const event = { ...emptyCustomerPlan.event, ...(parsed.event || {}) };
    const functions = Array.isArray(parsed.functions) && parsed.functions.length
      ? parsed.functions.map(normalizeFunction)
      : [normalizeFunction({
          id: 'function_1',
          date: event.eventDate,
          pax: event.pax,
          mealType: event.mealType,
          selectedDishes: Array.isArray(parsed.selectedDishes) ? parsed.selectedDishes : [],
          serviceStyle: parsed.serviceStyle || null,
        }, 0)];
    return {
      event,
      selectedDishes: functions[0].selectedDishes,
      serviceStyle: functions[0].serviceStyle,
      functions,
    };
  } catch {
    return emptyCustomerPlan;
  }
}

export function saveCustomerPlan(plan: CustomerPlan) {
  if (typeof window === 'undefined') return;
  const first = plan.functions[0];
  window.localStorage.setItem(CUSTOMER_PLAN_KEY, JSON.stringify({
    ...plan,
    event: { ...plan.event, eventDate: first?.date || '', pax: first?.pax || 0, mealType: first?.mealType || '' },
    selectedDishes: first?.selectedDishes || [],
    serviceStyle: first?.serviceStyle || null,
  }));
}
