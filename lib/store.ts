'use client';

import { CATEGORY_BASE_COST, CATEGORIES, detectCategory, detectCost } from './dishCostMaster';
import type { ClientUser, EventDetails, ExtraCost, MenuItem, Session, WorkState } from './types';

const CLIENTS_KEY = 'menu_cost_clients_v1';
export const SESSION_KEY = 'menu_cost_session';

export const emptyEvent: EventDetails = {
  clientName: '',
  eventName: '',
  eventDate: '',
  functionType: '',
  city: '',
  venue: '',
  pax: 0,
  uploadFileName: '',
  rawMenuText: '',
};

export const emptyExtras: ExtraCost = {
  staff: 0,
  transport: 0,
  gasFuel: 0,
  disposable: 0,
  other: 0,
};

export function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
}

function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function getClients(): ClientUser[] {
  if (typeof window === 'undefined') return [];
  return safeJsonParse<ClientUser[]>(window.localStorage.getItem(CLIENTS_KEY), []);
}

export function saveClients(clients: ClientUser[]) {
  window.localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
}

export function upsertClient(client: ClientUser) {
  const clients = getClients();
  const index = clients.findIndex((item) => item.id === client.id);
  if (index >= 0) clients[index] = client;
  else clients.push(client);
  saveClients(clients);
  return client;
}

export function deleteClient(id: string) {
  saveClients(getClients().filter((client) => client.id !== id));
}

export function logout() {
  window.localStorage.removeItem(SESSION_KEY);
}

export function getSession(): Session | null {
  if (typeof window === 'undefined') return null;
  return safeJsonParse<Session | null>(window.localStorage.getItem(SESSION_KEY), null);
}

export function refreshSessionFromClient() {
  const session = getSession();
  if (!session || session.role !== 'CLIENT') return session;
  const client = getClients().find((item) => item.id === session.tenantId);
  if (!client) return session;
  const next: Session = {
    ...session,
    businessName: client.businessName,
    status: client.status,
  };
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(next));
  return next;
}

function workKey(tenantId: string) {
  return `menu_cost_work_${tenantId}_v1`;
}

export function createEmptyWorkState(session?: Session | null): WorkState {
  return {
    event: { ...emptyEvent },
    menu: [],
    extras: { ...emptyExtras },
    sellingPricePerPlate: 0,
    profile: {
      businessName: session?.businessName ?? '',
      ownerName: '',
      phone: '',
      city: '',
      logoText: session?.businessName?.slice(0, 2).toUpperCase() ?? 'MC',
    },
    updatedAt: new Date().toISOString(),
  };
}

export function loadWork(tenantId: string): WorkState {
  const session = getSession();
  return safeJsonParse<WorkState>(window.localStorage.getItem(workKey(tenantId)), createEmptyWorkState(session));
}

export function saveWork(tenantId: string, work: WorkState) {
  window.localStorage.setItem(workKey(tenantId), JSON.stringify({ ...work, updatedAt: new Date().toISOString() }));
}

export function clearWork(tenantId: string) {
  window.localStorage.removeItem(workKey(tenantId));
}

export function parseMenuText(text: string): MenuItem[] {
  const cleaned = text
    .replace(/\r/g, '\n')
    .replace(/[•*]/g, '\n')
    .replace(/\s+\/\s+/g, '\n')
    .replace(/\s+\|\s+/g, '\n')
    .replace(/\s{2,}/g, ' ');

  const blockedWords = ['pax', 'time', 'date', 'venue', 'event', 'client', 'morning', 'evening', 'lunch', 'dinner', 'breakfast'];

  const names = cleaned
    .split(/[\n,;]+/)
    .map((line) => line.trim().replace(/^[-–—\d.\s]+/, '').trim())
    .filter((line) => line.length > 2)
    .filter((line) => !/^\d+$/.test(line))
    .filter((line) => !blockedWords.some((word) => line.toLowerCase() === word))
    .filter((line) => !/\d{1,2}:\d{2}/.test(line));

  const unique = Array.from(new Set(names));
  return unique.map((name) => {
    const category = detectCategory(name);
    return {
      id: uid('dish'),
      name,
      category,
      costPerPlate: detectCost(name, category),
    };
  });
}

export function buildMenuCostBreakdown(menu: MenuItem[]) {
  const getCategoryBaseCost = (category: string) => {
    return CATEGORIES.includes(category as (typeof CATEGORIES)[number])
      ? CATEGORY_BASE_COST[category as (typeof CATEGORIES)[number]]
      : 0;
  };

  const categoryCounts = menu.reduce<Record<string, number>>((counts, item) => {
    counts[item.category] = (counts[item.category] ?? 0) + 1;
    return counts;
  }, {});

  return menu.map((item) => {
    const categoryCount = categoryCounts[item.category] ?? 1;
    const baseCost = Number(item.costPerPlate) || getCategoryBaseCost(item.category);
    const portionFactor = categoryCount > 1 ? 1 / categoryCount : 1;
    const adjustedCostPerPlate = baseCost * portionFactor;

    return {
      ...item,
      baseCostPerPlate: baseCost,
      categoryCount,
      portionFactor,
      adjustedCostPerPlate,
    };
  });
}

export function calculate(work: WorkState) {
  const pax = Math.max(Number(work.event.pax) || 0, 0);
  const menuBreakdown = buildMenuCostBreakdown(work.menu);
  const menuCostPerPlate = menuBreakdown.reduce((sum, item) => sum + item.adjustedCostPerPlate, 0);
  const extrasTotal = Object.values(work.extras).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const extraPerPlate = pax > 0 ? extrasTotal / pax : 0;
  const finalCostPerPlate = menuCostPerPlate + extraPerPlate;
  const sellingPricePerPlate = Number(work.sellingPricePerPlate) || 0;
  const profitPerPlate = sellingPricePerPlate > 0 ? sellingPricePerPlate - finalCostPerPlate : 0;
  const totalCost = finalCostPerPlate * pax;
  const totalSelling = sellingPricePerPlate * pax;
  const totalProfit = profitPerPlate * pax;

  return {
    pax,
    menuBreakdown,
    menuCostPerPlate,
    extrasTotal,
    extraPerPlate,
    finalCostPerPlate,
    sellingPricePerPlate,
    profitPerPlate,
    totalCost,
    totalSelling,
    totalProfit,
  };
}
