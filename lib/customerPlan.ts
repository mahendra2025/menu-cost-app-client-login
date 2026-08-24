'use client';

import type { CustomerFunctionPlan, CustomerPlan } from './types';

export const CUSTOMER_PLAN_KEY = 'menu_cost_customer_plan_v1';
let activeCustomerPlan: CustomerPlan | null = null;

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
    selectedDishes: Array.isArray(value.selectedDishes) ? value.selectedDishes.map((dish) => ({ ...dish })) : [],
    serviceStyle: value.serviceStyle || null,
  };
}

export function functionLabel(item: CustomerFunctionPlan, index: number) {
  return item.name.trim() || item.mealType || `Function ${index + 1}`;
}

function normalizePlan(value: Partial<CustomerPlan>): CustomerPlan {
  const event = { ...emptyCustomerPlan.event, ...(value.event || {}) };
  const functions = Array.isArray(value.functions) && value.functions.length
    ? value.functions.map(normalizeFunction)
    : [normalizeFunction({}, 0)];
  return {
    event,
    selectedDishes: functions[0].selectedDishes,
    serviceStyle: functions[0].serviceStyle,
    functions,
  };
}

function removePersistedCustomerPlan() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(CUSTOMER_PLAN_KEY);
  } catch {
    // The in-memory flow still works when storage is unavailable.
  }
}

export function loadCustomerPlan(): CustomerPlan {
  removePersistedCustomerPlan();
  return normalizePlan(activeCustomerPlan || emptyCustomerPlan);
}

export function saveCustomerPlan(plan: CustomerPlan) {
  const first = plan.functions[0];
  activeCustomerPlan = normalizePlan({
    ...plan,
    event: { ...plan.event, eventDate: first?.date || '', pax: first?.pax || 0, mealType: first?.mealType || '' },
    selectedDishes: first?.selectedDishes || [],
    serviceStyle: first?.serviceStyle || null,
  });
  removePersistedCustomerPlan();
}
