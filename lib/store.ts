'use client';

import { CATEGORY_BASE_COST, detectCategory, detectCost } from './dishCostMaster';
import type { ClientUser, EventDetails, ExtraCost, MenuItem, Session, WorkState } from './types';

const CLIENTS_KEY = 'menu_cost_clients_v1';
const SESSION_KEY = 'menu_cost_session_v1';
const ADMIN_USER_ID = 'admin';
const ADMIN_PASSWORD = 'admin123';

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

export function login(userId: string, password: string): { ok: true; session: Session } | { ok: false; message: string } {
  const cleanUser = userId.trim();
  if (cleanUser === ADMIN_USER_ID && password === ADMIN_PASSWORD) {
    const session: Session = {
      role: 'ADMIN',
      tenantId: 'admin',
      userId: ADMIN_USER_ID,
      businessName: 'Super Admin',
      status: 'ACTIVE',
    };
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { ok: true, session };
  }

  const client = getClients().find((item) => item.userId === cleanUser && item.password === password);
  if (!client) return { ok: false, message: 'Wrong user ID or password.' };

  const session: Session = {
    role: 'CLIENT',
    tenantId: client.id,
    userId: client.userId,
    businessName: client.businessName,
    status: client.status,
  };
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return { ok: true, session };
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

export function calculate(work: WorkState) {
  const pax = Math.max(Number(work.event.pax) || 0, 0);
  const menuCostPerPlate = work.menu.reduce((sum, item) => sum + (Number(item.costPerPlate) || CATEGORY_BASE_COST[item.category] || 0), 0);
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
