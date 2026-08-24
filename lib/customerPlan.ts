'use client';

import type { CustomerPlan } from './types';

export const CUSTOMER_PLAN_KEY = 'menu_cost_customer_plan_v1';

export const emptyCustomerPlan: CustomerPlan = {
  event: {
    eventType: '', eventName: '', eventDate: '', city: '', venue: '', pax: 0, mealType: '',
  },
  selectedDishes: [],
  serviceStyle: null,
};

export function loadCustomerPlan(): CustomerPlan {
  if (typeof window === 'undefined') return emptyCustomerPlan;
  try {
    const saved = window.localStorage.getItem(CUSTOMER_PLAN_KEY);
    if (!saved) return emptyCustomerPlan;
    const parsed = JSON.parse(saved) as Partial<CustomerPlan>;
    return {
      event: { ...emptyCustomerPlan.event, ...(parsed.event || {}) },
      selectedDishes: Array.isArray(parsed.selectedDishes) ? parsed.selectedDishes : [],
      serviceStyle: parsed.serviceStyle || null,
    };
  } catch {
    return emptyCustomerPlan;
  }
}

export function saveCustomerPlan(plan: CustomerPlan) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(CUSTOMER_PLAN_KEY, JSON.stringify(plan));
  }
}
