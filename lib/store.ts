
'use client';

import {
  CATEGORY_BASE_COST,
  CATEGORIES,
  detectCategory,
  findDishesInText,
  findDishByName,
  findFuzzyDishByName,
} from './dishCostMaster';

import type { Category } from './dishCostMaster';

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

const MENU_HEADING_CATEGORIES: Record<string, Category | null> = {
  menu: null,
  breakfast: 'Breakfast',
  lunch: null,
  dinner: null,
  'hi tea': 'Beverage',
  'high tea': 'Beverage',
  starter: 'Starter',
  starters: 'Starter',
  'main course': null,
  'main courses': null,
  sweet: 'Sweet',
  sweets: 'Sweet',
  dessert: 'Sweet',
  desserts: 'Sweet',
  beverage: 'Beverage',
  beverages: 'Beverage',
  'welcome drink': 'Welcome Drink',
  'welcome drinks': 'Welcome Drink',
  mocktail: 'Mocktail',
  mocktails: 'Mocktail',
  soup: 'Soup',
  soups: 'Soup',
  salad: 'Salad',
  salads: 'Salad',
  rice: 'Rice',
  bread: 'Bread',
  breads: 'Bread',
  roti: 'Bread',
  sabji: 'Sabji',
  sabzi: 'Sabji',
  vegetable: 'Sabji',
  vegetables: 'Sabji',
  paneer: 'Paneer',
  dal: 'Dal / Kadhi',
  kadhi: 'Dal / Kadhi',
  'dal kadhi': 'Dal / Kadhi',
  'dal and kadhi': 'Dal / Kadhi',
  'ice cream': 'Ice Cream',
  farsan: 'Farsan',
  namkeen: 'Farsan',
  condiments: 'Condiments',
  chaat: 'Chaat',
  chinese: 'Chinese',
  italian: 'Italian',
  'south indian': 'South Indian',
  'north indian': 'Punjabi',
  punjabi: 'Punjabi',
  gujarati: 'Gujarati',
  rajasthani: 'Rajasthani',
  'live counter': 'Live Counter',
  'live counters': 'Live Counter',
  'swagat pey': 'Welcome Drink',
  'स्वागत पेय': 'Welcome Drink',
  'સ્વાગત પીણું': 'Welcome Drink',
  'मुख्य भोजन': null,
  'મુખ્ય ભોજન': null,
  'sabziyan': 'Sabji',
  'सब्जी': 'Sabji',
  'सब्जियां': 'Sabji',
  'શાક': 'Sabji',
  'શાકભાજી': 'Sabji',
  'पनीर': 'Paneer',
  'પનીર': 'Paneer',
  'दाल': 'Dal / Kadhi',
  'दाल कढ़ी': 'Dal / Kadhi',
  'દાળ': 'Dal / Kadhi',
  'દાળ કઢી': 'Dal / Kadhi',
  chawal: 'Rice',
  'चावल': 'Rice',
  'ચોખા': 'Rice',
  'ભાત': 'Rice',
  'रोटी': 'Bread',
  'रोटियां': 'Bread',
  'રોટલી': 'Bread',
  mithai: 'Sweet',
  'मिठाई': 'Sweet',
  'મીઠાઈ': 'Sweet',
  'आइस क्रीम': 'Ice Cream',
  'આઇસ ક્રીમ': 'Ice Cream',
  'सूप': 'Soup',
  'સૂપ': 'Soup',
  'स्टार्टर': 'Starter',
  'સ્ટાર્ટર': 'Starter',
  'सलाद': 'Salad',
  'સલાડ': 'Salad',
  'पापड़': 'Papad',
  'પાપડ': 'Papad',
  'फरसान': 'Farsan',
  'ફરસાણ': 'Farsan',
};

function normalizeMenuHeading(value: string): string {
  const text = String(value || '');

  if (/[\u0900-\u097f\u0a80-\u0aff]/u.test(text)) {
    return text
      .normalize('NFC')
      .toLowerCase()
      .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return normalizeText(text);
}

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
    .replace(
      /\s+(?:@|[-–—])\s*(?:₹|rs\.?|inr)?\s*\d+(?:\.\d+)?\s*(?:\/-)?\s*$/i,
      ' ',
    )
    .replace(
      /\s+(?:₹|rs\.?|inr)\s*\d+(?:\.\d+)?\s*$/i,
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
      /^\s*\d+(?:\.\d+)?\s*[x×]\s*/i,
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

type ParsedMenuLine = {
  text: string;
  categoryHint?: Category;
};

function splitMenuText(
  text: string,
): ParsedMenuLine[] {
  const rawSegments = text
    .replace(/\r/g, '\n')
    .replace(
      /\bdal\s*\/\s*kadhi\b/gi,
      'dal and kadhi',
    )
    .replace(
      /[•▪●◦◆◇■□✓✔*]/g,
      '\n',
    )
    .replace(/\|/g, '\n')
    .replace(
      /\s+(?=(?:item\s*)?\d+\s*[.)\-:]\s*\S)/gi,
      '\n',
    )
    .replace(
      /\s+\/\s+/g,
      '\n',
    )
    .replace(/\t+/g, '\n')
    .split(/[\n,;]+/);

  const menuLines: ParsedMenuLine[] = [];
  let activeCategory: Category | undefined;

  for (const rawSegment of rawSegments) {
    let segment = rawSegment.trim();
    if (!segment) continue;

    const headingWithItems = segment.match(
      /^([^:–—-]{2,32})\s*[:–—-]\s*(.+)$/,
    );

    if (headingWithItems) {
      const headingKey = normalizeMenuHeading(headingWithItems[1]);

      if (headingKey in MENU_HEADING_CATEGORIES) {
        activeCategory =
          MENU_HEADING_CATEGORIES[headingKey] ?? undefined;
        segment = headingWithItems[2].trim();
      }
    }

    const wholeSegmentKey = normalizeMenuHeading(segment);

    if (wholeSegmentKey in MENU_HEADING_CATEGORIES) {
      activeCategory =
        MENU_HEADING_CATEGORIES[wholeSegmentKey] ?? undefined;
      continue;
    }

    const line = cleanMenuLine(segment);
    if (!line) continue;

    {
      const normalized =
        normalizeText(line);

      if (!normalized) {
        continue;
      }

      if (
        MENU_HEADINGS.has(
          normalized,
        )
      ) {
        continue;
      }

      if (/^\d+$/.test(normalized)) {
        continue;
      }

      if (
        /\b\d{1,2}:\d{2}\s*(?:am|pm)?\b/i.test(
          line,
        )
      ) {
        continue;
      }

      if (
        /^(?:date|time|venue|client|event|function|occasion|pax|guests?|persons?)\s*:/i.test(
          line,
        )
      ) {
        continue;
      }

      if (normalized.length <= 1) continue;
    }

    menuLines.push({
      text: line,
      categoryHint: activeCategory,
    });
  }

  return menuLines;
}

function detectDishesFromLine(
  menuLine: string,
  categoryHint?: Category,
): NonNullable<
  ReturnType<typeof findDishByName>
>[] {
  const candidates =
    createDishCandidates(menuLine);

  for (const candidate of candidates) {
    const matchedDishes =
      findDishesInText(candidate);

    if (matchedDishes.length) {
      return matchedDishes;
    }

    const fuzzyMatch =
      findFuzzyDishByName(
        candidate,
        categoryHint,
      );

    if (fuzzyMatch) {
      return [fuzzyMatch];
    }
  }

  return [];
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

  for (const menuLine of menuLines) {
    const line = menuLine.text;
    const matchedDishes =
      detectDishesFromLine(
        line,
        menuLine.categoryHint,
      );

    if (matchedDishes.length) {
      matchedDishes.forEach(
        (matchedDish) => {
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

        portionQuantity:
          matchedDish.servingQuantity ??
          1,
        portionUnit:
          matchedDish.servingUnit ??
          'serving',
      });
        },
      );

      continue;
    }

    /*
     * Dish was not found in catalog.
     *
     * Keep it in the menu instead
     * of deleting it.
     */
    const fallbackCategory =
      menuLine.categoryHint ||
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
      portionQuantity: 1,
      portionUnit: 'serving',
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
