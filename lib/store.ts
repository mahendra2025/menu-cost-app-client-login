
'use client';

import {
  CATEGORY_BASE_COST,
  CATEGORIES,
  detectCategory,
  findDishByName,
} from './dishCostMaster';

import type {
  ClientUser,
  EventDetails,
  ExtraCost,
  MenuItem,
  Session,
  WorkState,
} from './types';

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

/* -------------------------------------------------------------------------- */
/*                               Basic helpers                                */
/* -------------------------------------------------------------------------- */

export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random()
    .toString(36)
    .slice(2, 9)}_${Date.now().toString(36)}`;
}

function safeJsonParse<T>(
  value: string | null,
  fallback: T,
): T {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn(
      'Failed to parse localStorage value:',
      error,
    );

    return fallback;
  }
}

function normalizeText(value: string): string {
  return String(value || '')
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[–—]/g, ' ')
    .replace(/\bicecream\b/g, 'ice cream')
    .replace(/\bpanner\b/g, 'paneer')
    .replace(/\bmashala\b/g, 'masala')
    .replace(/\bjira\b/g, 'jeera')
    .replace(/\bjamoon\b/g, 'jamun')
    .replace(/\bnan\b/g, 'naan')
    .replace(/\bkabab\b/g, 'kebab')
    .replace(/\bmanchau\b/g, 'manchow')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* -------------------------------------------------------------------------- */
/*                                  Clients                                   */
/* -------------------------------------------------------------------------- */

export function getClients(): ClientUser[] {
  if (typeof window === 'undefined') {
    return [];
  }

  return safeJsonParse<ClientUser[]>(
    window.localStorage.getItem(CLIENTS_KEY),
    [],
  );
}

export function saveClients(
  clients: ClientUser[],
): void {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(
    CLIENTS_KEY,
    JSON.stringify(clients),
  );
}

export function upsertClient(
  client: ClientUser,
): ClientUser {
  const clients = getClients();

  const index = clients.findIndex(
    (item) => item.id === client.id,
  );

  if (index >= 0) {
    clients[index] = client;
  } else {
    clients.push(client);
  }

  saveClients(clients);

  return client;
}

export function deleteClient(id: string): void {
  const clients = getClients().filter(
    (client) => client.id !== id,
  );

  saveClients(clients);
}

/* -------------------------------------------------------------------------- */
/*                                  Session                                   */
/* -------------------------------------------------------------------------- */

export function logout(): void {
  if (typeof window === 'undefined') return;

  window.localStorage.removeItem(SESSION_KEY);
}

export function getSession(): Session | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return safeJsonParse<Session | null>(
    window.localStorage.getItem(SESSION_KEY),
    null,
  );
}

export function refreshSessionFromClient():
  | Session
  | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const session = getSession();

  if (
    !session ||
    session.role !== 'CLIENT'
  ) {
    return session;
  }

  const client = getClients().find(
    (item) =>
      item.id === session.tenantId,
  );

  if (!client) {
    return session;
  }

  const nextSession: Session = {
    ...session,
    businessName: client.businessName,
    status: client.status,
  };

  window.localStorage.setItem(
    SESSION_KEY,
    JSON.stringify(nextSession),
  );

  return nextSession;
}

/* -------------------------------------------------------------------------- */
/*                                 Work state                                 */
/* -------------------------------------------------------------------------- */

function workKey(tenantId: string): string {
  return `menu_cost_work_${tenantId}_v1`;
}

export function createEmptyWorkState(
  session?: Session | null,
): WorkState {
  return {
    event: {
      ...emptyEvent,
    },

    menu: [],

    extras: {
      ...emptyExtras,
    },

    sellingPricePerPlate: 0,

    profile: {
      businessName:
        session?.businessName ?? '',

      ownerName: '',
      phone: '',
      city: '',

      logoText:
        session?.businessName
          ?.slice(0, 2)
          .toUpperCase() ?? 'MC',
    },

    updatedAt:
      new Date().toISOString(),
  };
}

export function loadWork(
  tenantId: string,
): WorkState {
  const session = getSession();

  const fallback =
    createEmptyWorkState(session);

  if (typeof window === 'undefined') {
    return fallback;
  }

  return safeJsonParse<WorkState>(
    window.localStorage.getItem(
      workKey(tenantId),
    ),
    fallback,
  );
}

export function saveWork(
  tenantId: string,
  work: WorkState,
): void {
  if (typeof window === 'undefined') return;

  const nextWork: WorkState = {
    ...work,
    updatedAt:
      new Date().toISOString(),
  };

  window.localStorage.setItem(
    workKey(tenantId),
    JSON.stringify(nextWork),
  );
}

export function clearWork(
  tenantId: string,
): void {
  if (typeof window === 'undefined') return;

  window.localStorage.removeItem(
    workKey(tenantId),
  );
}

/* -------------------------------------------------------------------------- */
/*                              Menu detection                                */
/* -------------------------------------------------------------------------- */

const MENU_HEADINGS = new Set([
  'menu',
  'breakfast',
  'lunch',
  'dinner',
  'hi tea',
  'high tea',
  'starter',
  'starters',
  'main course',
  'main courses',
  'sweet',
  'sweets',
  'dessert',
  'desserts',
  'beverage',
  'beverages',
  'welcome drink',
  'welcome drinks',
  'mocktail',
  'mocktails',
  'soup',
  'soups',
  'salad',
  'salads',
  'rice',
  'bread',
  'breads',
  'roti',
  'sabji',
  'sabzi',
  'vegetable',
  'vegetables',
  'paneer',
  'dal',
  'kadhi',
  'dal kadhi',
  'dal and kadhi',
  'ice cream',
  'farsan',
  'namkeen',
  'condiments',
  'chaat',
  'chinese',
  'italian',
  'south indian',
  'north indian',
  'punjabi',
  'gujarati',
  'rajasthani',
  'live counter',
  'live counters',
]);

const COMMON_DISH_ALIASES: Record<
  string,
  string
> = {
  pbm: 'paneer butter masala',

  'paneer bm':
    'paneer butter masala',

  'paneer butter mashala':
    'paneer butter masala',

  'panner butter masala':
    'paneer butter masala',

  'panner tikka':
    'paneer tikka',

  'manchau soup':
    'manchow soup',

  'manchow sup':
    'manchow soup',

  'veg manchow':
    'veg manchow soup',

  icecream:
    'ice cream',

  'gulab jamoon':
    'gulab jamun',

  'gulab jamun sweet':
    'gulab jamun',

  'jira rice':
    'jeera rice',

  'jeera pulao':
    'jeera rice',

  'dal fry tadka':
    'dal fry',

  'butter nan':
    'butter naan',

  'plain nan':
    'plain naan',

  'hara bhara kabab':
    'hara bhara kebab',

  'dahi ke kabab':
    'dahi ke kebab',

  'veg hakka noodle':
    'veg hakka noodles',

  'hakka noodle':
    'hakka noodles',

  'kesar pista icecream':
    'kesar pista ice cream',
};

function removePriceAndQuantity(
  value: string,
): string {
  return value
    .replace(
      /₹\s*\d+(?:\.\d+)?/g,
      ' ',
    )
    .replace(
      /\b(?:rs|inr)\.?\s*\d+(?:\.\d+)?\b/gi,
      ' ',
    )
    .replace(
      /\b\d+(?:\.\d+)?\s*(?:pax|plates?|persons?|people|guests?|pcs?|pieces?|kg|kgs|gram|grams|gm|gms|ml|ltr|litre|litres|packet|packets)\b/gi,
      ' ',
    )
    .replace(/\s+/g, ' ')
    .trim();
}

function removeLeadingNumbering(
  value: string,
): string {
  return value
    .replace(
      /^\s*(?:item\s*)?\d+\s*[.)\-:]*\s*/i,
      '',
    )
    .replace(
      /^\s*[-–—*]+\s*/,
      '',
    )
    .trim();
}

function cleanMenuLine(
  inputLine: string,
): string {
  let line =
    removeLeadingNumbering(
      inputLine,
    );

  line =
    removePriceAndQuantity(line);

  const colonIndex =
    line.indexOf(':');

  if (colonIndex >= 0) {
    const possibleHeading =
      normalizeText(
        line.slice(0, colonIndex),
      );

    if (
      MENU_HEADINGS.has(
        possibleHeading,
      )
    ) {
      line =
        line.slice(colonIndex + 1);
    }
  }

  return line
    .replace(/\s+/g, ' ')
    .trim();
}

function applyCommonAlias(
  value: string,
): string {
  const normalized =
    normalizeText(value);

  return (
    COMMON_DISH_ALIASES[
      normalized
    ] ?? normalized
  );
}

function createDishCandidates(
  value: string,
): string[] {
  const cleaned =
    cleanMenuLine(value);

  if (!cleaned) {
    return [];
  }

  const candidates =
    new Set<string>();

  candidates.add(cleaned);

  candidates.add(
    cleaned
      .replace(/\([^)]*\)/g, ' ')
      .replace(/\[[^\]]*\]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );

  candidates.add(
    cleaned
      .split('—')[0]
      .trim(),
  );

  candidates.add(
    cleaned
      .replace(
        /\s+-\s+(?:starter|main course|sweet|dessert|breakfast|lunch|dinner|counter|live counter)$/i,
        '',
      )
      .trim(),
  );

  candidates.add(
    cleaned
      .replace(
        /\b(?:special|premium|regular|fresh|hot|cold|live|counter|station|stall|item)\b/gi,
        ' ',
      )
      .replace(/\s+/g, ' ')
      .trim(),
  );

  candidates.add(
    normalizeText(cleaned),
  );

  candidates.add(
    applyCommonAlias(cleaned),
  );

  return Array.from(candidates)
    .map((candidate) =>
      candidate.trim(),
    )
    .filter(
      (candidate) =>
        candidate.length > 1,
    );
}

function splitMenuText(
  text: string,
): string[] {
  return text
    .replace(/\r/g, '\n')
    .replace(
      /[•▪●◦*]/g,
      '\n',
    )
    .replace(/\|/g, '\n')
    .replace(
      /\s+\/\s+/g,
      '\n',
    )
    .replace(/\t/g, ' ')
    .split(/[\n,;]+/)
    .map(cleanMenuLine)
    .filter(Boolean)
    .filter((line) => {
      const normalized =
        normalizeText(line);

      if (!normalized) {
        return false;
      }

      if (
        MENU_HEADINGS.has(
          normalized,
        )
      ) {
        return false;
      }

      if (/^\d+$/.test(normalized)) {
        return false;
      }

      if (
        /\b\d{1,2}:\d{2}\s*(?:am|pm)?\b/i.test(
          line,
        )
      ) {
        return false;
      }

      if (
        /^(?:date|time|venue|client|event|pax|guests?)\s*:/i.test(
          line,
        )
      ) {
        return false;
      }

      return normalized.length > 1;
    });
}

function detectDishFromLine(
  menuLine: string,
) {
  const candidates =
    createDishCandidates(menuLine);

  for (const candidate of candidates) {
    const matchedDish =
      findDishByName(candidate);

    if (matchedDish) {
      return matchedDish;
    }
  }

  return null;
}

export function parseMenuText(
  text: string,
): MenuItem[] {
  const menuLines =
    splitMenuText(text);

  if (!menuLines.length) {
    console.warn(
      'Menu detection: no valid menu lines found.',
    );

    return [];
  }

  const menuItems: MenuItem[] = [];

  for (const line of menuLines) {
    const matchedDish =
      detectDishFromLine(line);

    if (matchedDish) {
      menuItems.push({
        id: uid('dish'),

        name:
          matchedDish.name,

        category:
          matchedDish.category,

        costPerPlate:
          Number(
            matchedDish.rate,
          ) ||
          getCategoryBaseCost(
            matchedDish.category,
          ),
      });

      continue;
    }

    /*
     * Dish was not found in catalog.
     *
     * Keep it in the menu instead
     * of deleting it.
     */
    const fallbackCategory =
      detectCategory(line) ||
      'Sabji';

    menuItems.push({
      id: uid('dish'),
      name: line,
      category:
        fallbackCategory,

      /*
       * Zero means the user must
       * enter a manual rate.
       */
      costPerPlate: 0,
    });

    console.warn(
      'Dish not found in catalog. Added for manual review:',
      line,
    );
  }

  /*
   * Remove duplicate menu items.
   */
  const uniqueItems =
    Array.from(
      new Map(
        menuItems.map((item) => [
          `${normalizeText(
            item.name,
          )}-${normalizeText(
            item.category,
          )}`,
          item,
        ]),
      ).values(),
    );

  const unmatchedCount =
    uniqueItems.filter(
      (item) =>
        Number(
          item.costPerPlate,
        ) === 0,
    ).length;

  console.info(
    `Menu detection completed: ${uniqueItems.length} item(s), ${unmatchedCount} requiring manual rates.`,
  );

  return uniqueItems;
}

/* -------------------------------------------------------------------------- */
/*                               Cost helpers                                 */
/* -------------------------------------------------------------------------- */

function getCategoryBaseCost(
  category: string,
): number {
  if (
    CATEGORIES.includes(
      category as (
        typeof CATEGORIES
      )[number],
    )
  ) {
    return (
      CATEGORY_BASE_COST[
        category as (
          typeof CATEGORIES
        )[number]
      ] ?? 0
    );
  }

  return 0;
}

export function buildMenuCostBreakdown(
  menu: MenuItem[],
) {
  const categoryCounts =
    menu.reduce<
      Record<string, number>
    >(
      (counts, item) => {
        counts[item.category] =
          (
            counts[
              item.category
            ] ?? 0
          ) + 1;

        return counts;
      },
      {},
    );

  return menu.map((item) => {
    const categoryCount =
      categoryCounts[
        item.category
      ] ?? 1;

    /*
     * Manual rate remains zero until
     * the user enters a value.
     *
     * Do not replace zero with a
     * category rate here.
     */
    const baseCostPerPlate =
      Math.max(
        0,
        Number(
          item.costPerPlate,
        ) || 0,
      );

    const portionFactor =
      categoryCount > 1
        ? 1 / categoryCount
        : 1;

    const adjustedCostPerPlate =
      baseCostPerPlate *
      portionFactor;

    return {
      ...item,
      baseCostPerPlate,
      categoryCount,
      portionFactor,
      adjustedCostPerPlate,
    };
  });
}

/* -------------------------------------------------------------------------- */
/*                              Final costing                                 */
/* -------------------------------------------------------------------------- */

export function calculate(
  work: WorkState,
) {
  const pax = Math.max(
    Number(work.event.pax) || 0,
    0,
  );

  const menuBreakdown =
    buildMenuCostBreakdown(
      work.menu,
    );

  const menuCostPerPlate =
    menuBreakdown.reduce(
      (sum, item) =>
        sum +
        item.adjustedCostPerPlate,
      0,
    );

  const extrasTotal =
    Object.values(
      work.extras,
    ).reduce(
      (sum, value) =>
        sum +
        (Number(value) || 0),
      0,
    );

  const extraPerPlate =
    pax > 0
      ? extrasTotal / pax
      : 0;

  const finalCostPerPlate =
    menuCostPerPlate +
    extraPerPlate;

  const sellingPricePerPlate =
    Math.max(
      0,
      Number(
        work.sellingPricePerPlate,
      ) || 0,
    );

  const profitPerPlate =
    sellingPricePerPlate > 0
      ? sellingPricePerPlate -
        finalCostPerPlate
      : 0;

  const totalCost =
    finalCostPerPlate * pax;

  const totalSelling =
    sellingPricePerPlate * pax;

  const totalProfit =
    profitPerPlate * pax;

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
