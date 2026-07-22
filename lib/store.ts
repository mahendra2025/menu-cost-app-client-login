
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
  ManpowerRow,
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

export const defaultManpower: ManpowerRow[] = [
  { id: 'manpower_manager', role: 'Event Manager', quantity: 0, rate: 3500 },
  { id: 'manpower_supervisor', role: 'Supervisor', quantity: 0, rate: 2000 },
  { id: 'manpower_captain', role: 'Captain', quantity: 0, rate: 1500 },
  { id: 'manpower_waiter', role: 'Waiter', quantity: 0, rate: 750 },
  { id: 'manpower_cook', role: 'Cook', quantity: 0, rate: 2500 },
  { id: 'manpower_assistant_cook', role: 'Assistant Cook', quantity: 0, rate: 1400 },
  { id: 'manpower_helper', role: 'Helper / Masi', quantity: 0, rate: 700 },
  { id: 'manpower_bartender', role: 'Bartender', quantity: 0, rate: 1600 },
  { id: 'manpower_counter', role: 'Counter Attendant', quantity: 0, rate: 900 },
  { id: 'manpower_dishwasher', role: 'Dishwasher', quantity: 0, rate: 700 },
  { id: 'manpower_cleaning', role: 'Cleaning', quantity: 0, rate: 600 },
  { id: 'manpower_security', role: 'Security', quantity: 0, rate: 900 },
  { id: 'manpower_driver', role: 'Driver', quantity: 0, rate: 1000 },
];

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

    manpower: defaultManpower.map((row) => ({ ...row })),

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

  const savedWork = safeJsonParse<Partial<WorkState> | null>(
    window.localStorage.getItem(
      workKey(tenantId),
    ),
    null,
  );

  if (!savedWork) return fallback;

  const savedStaffCost = Math.max(
    0,
    Number(savedWork.extras?.staff) || 0,
  );
  const manpower = Array.isArray(savedWork.manpower)
    ? savedWork.manpower
    : savedStaffCost > 0
      ? [
          {
            id: 'manpower_existing',
            role: 'Existing Staff Cost',
            quantity: 1,
            rate: savedStaffCost,
          },
        ]
      : defaultManpower.map((row) => ({ ...row }));

  return {
    ...fallback,
    ...savedWork,
    event: {
      ...fallback.event,
      ...savedWork.event,
    },
    menu: Array.isArray(savedWork.menu) ? savedWork.menu : [],
    manpower,
    extras: {
      ...fallback.extras,
      ...savedWork.extras,
    },
    profile: {
      ...fallback.profile,
      ...savedWork.profile,
    },
  };
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
  'dish',
  'dishes',
  'menu item',
  'menu items',
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
  'snack',
  'snacks',
  'accompaniment',
  'accompaniments',
  'papad pickle',
]);

const MENU_HEADING_CATEGORIES: Record<string, Category | null> = {
  menu: null,
  dish: null,
  dishes: null,
  'menu item': null,
  'menu items': null,
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
  snack: 'Starter',
  snacks: 'Starter',
  accompaniment: 'Condiments',
  accompaniments: 'Condiments',
  'papad pickle': 'Condiments',
  juice: 'Welcome Drink',
  juices: 'Welcome Drink',
  'indian bread': 'Bread',
  'indian breads': 'Bread',
  'dal and rice': null,
  sides: 'Condiments',
  'side items': 'Condiments',
  'snacks counter': 'Starter',
  'snack counter': 'Starter',
  'special counter': 'Live Counter',
  'special counters': 'Live Counter',
  'bihari counter': 'Live Counter',
  'chaat counter': 'Chaat',
  'south indian counter': 'South Indian',
  'italian counter': 'Italian',
  'fruit counter': 'Salad',
  'wedding dinner': null,
  'dj night': null,
  'dj night dinner snacks': null,
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

const MEAL_SERVICE_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  brunch: 'Brunch',
  lunch: 'Lunch',
  dinner: 'Dinner',
  'hi tea': 'Hi Tea',
  'high tea': 'High Tea',
  snacks: 'Snacks',
  'evening snacks': 'Evening Snacks',
  'morning snacks': 'Morning Snacks',
  reception: 'Reception',
  sangeet: 'Sangeet',
  mehendi: 'Mehendi',
  haldi: 'Haldi',
  'wedding dinner': 'Wedding Dinner',
  'dj night': 'DJ Night',
  'cocktail dinner': 'Cocktail Dinner',
  'स्वागत': 'स्वागत',
  'नाश्ता': 'नाश्ता',
  'दोपहर का भोजन': 'दोपहर का भोजन',
  'रात्रि भोजन': 'रात्रि भोजन',
  'સવારનો નાસ્તો': 'સવારનો નાસ્તો',
  'બપોરનું ભોજન': 'બપોરનું ભોજન',
  'રાત્રિ ભોજન': 'રાત્રિ ભોજન',
};

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
      /\b\d+(?:\.\d+)?\s*(?:pax|members?|plates?|persons?|people|guests?|pcs?|pieces?|kg|kgs|gram|grams|gm|gms|ml|ltr|litre|litres|packet|packets)\b/gi,
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
    .replace(
      /^\s*(?:o|○|◯)\s+/i,
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
  serviceId?: string;
  dayLabel?: string;
  mealLabel?: string;
  servicePax?: number;
  explicitItem?: boolean;
};

const NON_DISH_TEXT_PATTERN =
  /^(?:days?\s*\d+|members?|as\s+per\s+(?:selection|choice)|menu\s+for|wedding\s+menu|party\s+menu|client|customer|event|function|occasion|venue|date|time|pax|guests?|persons?|contact|phone|mobile|address|location|package|price|rate|total|amount|notes?|instructions?|services?|staff|transport|decoration|photography|music|dj|tables?|chairs?|tax|gst|terms?|ग्राहक|कार्यक्रम|स्थान|तारीख|समय|मेहमान|संपर्क|मोबाइल|पता|कुल|नोट|ગ્રાહક|કાર્યક્રમ|સ્થળ|તારીખ|સમય|મહેમાન|સંપર્ક|મોબાઇલ|સરનામું|કુલ|નોંધ)(?:\b|[\s:()–—-]|$)/i;

const PROSE_WORD_PATTERN =
  /\b(?:please|kindly|include|included|excluding|available|required|arrange|arrangement|welcome|thank|thanks|regards|booking|advance|payment|starts?|scheduled|break|will|served|कृपया|धन्यवाद|शामिल|कुल|કૃપા|આભાર|સમાવેશ)\b/i;

const EXPLICIT_MENU_ITEM_MARKER = '__menu_item__';

function isClearlyNonDishText(value: string): boolean {
  const normalized = normalizeMenuHeading(value);

  if (!normalized) return true;
  if (NON_DISH_TEXT_PATTERN.test(normalized)) return true;
  if (PROSE_WORD_PATTERN.test(normalized)) return true;
  if (/https?:\/\/|www\.|@\w+\.\w+/.test(value)) return true;
  if (/^\+?\d[\d\s()-]{7,}$/.test(value.trim())) return true;
  if (
    /^(?:starter|starters|sweet|sweets|juice|juices|item|items)\s+\d+\s+items?$/i.test(
      normalized,
    )
  ) {
    return true;
  }

  return false;
}

function isLikelyUnknownDish(
  value: string,
  categoryHint?: Category,
  explicitItem = false,
): boolean {
  if (isClearlyNonDishText(value)) return false;
  if (!explicitItem && /[!?]|\.(?:\s|$)/.test(value)) return false;

  const words = normalizeMenuHeading(value)
    .split(' ')
    .filter(Boolean);

  if (!words.length || words.length > (explicitItem ? 14 : 7)) return false;

  if (categoryHint) return true;

  return words.some((word) =>
    /[\p{L}]/u.test(word),
  );
}

function protectParentheticalSlashes(value: string): string {
  let depth = 0;
  let result = '';

  for (const character of value) {
    if (character === '(' || character === '[') depth += 1;
    if (character === ')' || character === ']') {
      depth = Math.max(0, depth - 1);
    }

    result += character === '/' && depth > 0 ? '⁄' : character;
  }

  return result;
}

function cleanServiceLabel(value: string): string {
  return value
    .replace(/^[^\p{L}\p{N}]+/u, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeOcrMenuText(value: string): string {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[¦‖]/g, '|')
    .replace(/[·∙]/g, '•')
    .replace(/([\p{L}\p{M}])-\s*\n\s*([\p{Ll}\p{M}])/gu, '$1$2')
    .replace(/[ \t]{3,}/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseDayHeading(value: string): string | undefined {
  const normalized = normalizeMenuHeading(value)
    .replace(/\b(?:date|menu)\b.*$/i, '')
    .trim();
  const match = normalized.match(
    /^(?:day\s*[-:]?\s*(\d+)|(\d+)(?:st|nd|rd|th)?\s*day)$/i,
  );
  const dayNumber = match?.[1] || match?.[2];
  return dayNumber ? `Day ${dayNumber}` : undefined;
}

function parseServiceHeading(value: string): {
  mealLabel: string;
  servicePax?: number;
} | null {
  const cleaned = cleanServiceLabel(value)
    .replace(/^(?:function|meal|service)\s*[:\-]\s*/i, '')
    .trim();
  const normalized = normalizeMenuHeading(cleaned);
  const plainMeal = MEAL_SERVICE_LABELS[normalized];

  if (plainMeal) return { mealLabel: plainMeal };

  const trailingPax = cleaned.match(
    /^(.*?)\s*(?:[-–—|:]|\()\s*(?:(?:pax|members?|guests?|persons?|people)\s*[:\-]?\s*)?(\d+(?:\.\d+)?)\s*(?:pax|members?|guests?|persons?|people)?\s*\)?\s*$/i,
  );
  const leadingPax = cleaned.match(
    /^(?:pax|members?|guests?|persons?|people)?\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(?:pax|members?|guests?|persons?|people)\s*[-–—|:]?\s*(.+)$/i,
  );
  const simpleTrailingPax = cleaned.match(
    /^(.*?)\s+(\d+(?:\.\d+)?)\s*(?:pax|members?|guests?|persons?|people)\s*$/i,
  );
  const labelSource = trailingPax?.[1] || leadingPax?.[2] || simpleTrailingPax?.[1] || '';
  const paxSource = trailingPax?.[2] || leadingPax?.[1] || simpleTrailingPax?.[2] || '';
  const mealKey = normalizeMenuHeading(labelSource);
  const knownMeal = MEAL_SERVICE_LABELS[mealKey];
  const servicePax = Math.max(0, Number(paxSource) || 0);
  const customMealLabel = cleanServiceLabel(labelSource);
  const customMealWords = normalizeMenuHeading(customMealLabel)
    .split(' ')
    .filter(Boolean);

  if (
    !knownMeal &&
    (!(servicePax > 0) || !customMealWords.length || customMealWords.length > 7)
  ) return null;

  return {
    mealLabel: knownMeal || customMealLabel,
    servicePax: servicePax > 0 ? servicePax : undefined,
  };
}

function inferFallbackCategory(
  value: string,
  categoryHint?: Category,
): Category {
  const normalized = normalizeMenuHeading(value);

  if (
    /\b(?:milk cake|cake|halwa|jalebi|rasmalai|mithai|sweet|gewar|ghevar|rabdi)\b/i.test(
      normalized,
    )
  ) {
    return 'Sweet';
  }

  if (
    /\b(?:curd|raita|chutney|pickle|sauce)\b/i.test(normalized)
  ) {
    return 'Condiments';
  }

  if (
    /\b(?:chapati|roti|puri|paratha|naan|bread|pav)\b/i.test(
      normalized,
    )
  ) {
    return 'Bread';
  }

  if (
    /\b(?:tea|coffee|juice|soft drink|biscuit|rusk)\b/i.test(
      normalized,
    )
  ) {
    return 'Beverage';
  }

  if (
    /\b(?:idli|upma|dosa|sambhar|sambar|medu vada)\b/i.test(
      normalized,
    )
  ) {
    return 'South Indian';
  }

  if (
    /\b(?:fruit|papaya|banana)\b/i.test(normalized)
  ) {
    return 'Salad';
  }

  if (
    /\b(?:puff|kachori|namkeen|sev roll)\b/i.test(normalized)
  ) {
    return 'Farsan';
  }

  if (categoryHint) return categoryHint;

  if (/\b(?:mocktail|mojito|blue lagoon|fruit punch)\b/i.test(normalized)) {
    return 'Mocktail';
  }

  if (/\b(?:soup|shorba|manchow)\b/i.test(normalized)) {
    return 'Soup';
  }

  if (/\b(?:chaat|pani puri|bhel|sev puri|dahi puri)\b/i.test(normalized)) {
    return 'Chaat';
  }

  if (/\b(?:rice|pulao|biryani|khichdi)\b/i.test(normalized)) {
    return 'Rice';
  }

  if (/\b(?:dal|daal|kadhi)\b/i.test(normalized)) {
    return 'Dal / Kadhi';
  }

  if (/\b(?:ice cream|kulfi)\b/i.test(normalized)) {
    return 'Ice Cream';
  }

  if (/\b(?:papad|papadum)\b/i.test(normalized)) {
    return 'Papad';
  }

  const detectedCategory = detectCategory(value);
  const hasSpecificDetectedCategory =
    detectedCategory !== 'Sabji' ||
    /\b(?:sabji|sabzi|vegetable|veg|शाक|सब्जी)\b/i.test(
      normalized,
    );

  return hasSpecificDetectedCategory
    ? detectedCategory
    : categoryHint || 'Sabji';
}

function splitMenuText(
  text: string,
): ParsedMenuLine[] {
  const normalizedText = normalizeOcrMenuText(text);
  const normalizedServiceHeadings = normalizedText
    .replace(
      /(?:^|\n)\s*(?:function|meal|service)\s*:\s*([^\n|,]+?)\s*[|,]\s*(?:members?|pax|guests?|persons?|people)\s*:\s*(\d+(?:\.\d+)?)\s*(?=\n|$)/gi,
      (_match, mealLabel: string, memberCount: string) =>
        `\n${cleanServiceLabel(mealLabel)} - ${memberCount} members\n`,
    )
    .replace(
      /(?:^|\n)\s*day\s*[-:]?\s*(\d+)\s*[•▪●◦|–—-]\s*([^\n•▪●◦|–—]+?)\s*[•▪●◦|–—-]\s*(\d+(?:\.\d+)?)\s*(?:members?|pax|guests?|persons?|people)\s*(?=\n|$)/gi,
      (_match, dayNumber: string, mealLabel: string, memberCount: string) =>
        `\nDay ${dayNumber}\n${cleanServiceLabel(mealLabel)} - ${memberCount} members\n`,
    );

  const rawSegments = protectParentheticalSlashes(normalizedServiceHeadings)
    .replace(/\r/g, '\n')
    .replace(
      /\bdal\s*\/\s*kadhi\b/gi,
      'dal and kadhi',
    )
    .replace(
      /[•▪●◦◆◇■□✓✔*]/g,
      `\n${EXPLICIT_MENU_ITEM_MARKER} `,
    )
    .replace(
      /(^|\n)\s*(?:o|○|◯)\s+/gi,
      `$1${EXPLICIT_MENU_ITEM_MARKER} `,
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
  let activeDayLabel: string | undefined;
  let activeMealLabel: string | undefined;
  let activeServicePax: number | undefined;
  let activeServiceId: string | undefined;
  let serviceIndex = 0;

  for (const rawSegment of rawSegments) {
    let segment = rawSegment
      .replace(/⁄/g, '/')
      .trim();
    if (!segment) continue;

    const isExplicitMenuItem =
      segment.startsWith(EXPLICIT_MENU_ITEM_MARKER);

    if (isExplicitMenuItem) {
      segment = segment
        .slice(EXPLICIT_MENU_ITEM_MARKER.length)
        .trim();
    }

    const dayLabel = parseDayHeading(segment);

    if (dayLabel) {
      activeCategory = undefined;
      activeDayLabel = dayLabel;
      activeMealLabel = undefined;
      activeServicePax = undefined;
      activeServiceId = undefined;
      continue;
    }

    const paxOnlyMatch = segment.match(
      /^(?:pax|members?|guests?|persons?|people)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*$/i,
    ) || segment.match(
      /^(\d+(?:\.\d+)?)\s*(?:pax|members?|guests?|persons?|people)\s*$/i,
    );

    if (paxOnlyMatch && activeMealLabel) {
      activeServicePax = Math.max(0, Number(paxOnlyMatch[1]) || 0) || undefined;
      continue;
    }

    const serviceHeading = parseServiceHeading(segment);

    if (serviceHeading) {
      serviceIndex += 1;
      activeCategory = undefined;
      activeMealLabel = serviceHeading.mealLabel;
      activeServicePax = serviceHeading.servicePax;
      activeServiceId = `service_${serviceIndex}`;
      continue;
    }

    let lineCategory = activeCategory;
    const headingWithItems = segment.match(
      /^([^:–—-]{2,32})\s*[:–—-]\s*(.+)$/,
    );

    if (headingWithItems) {
      const headingKey = normalizeMenuHeading(headingWithItems[1]);

      if (headingKey in MENU_HEADING_CATEGORIES) {
        lineCategory =
          MENU_HEADING_CATEGORIES[headingKey] ?? undefined;
        activeCategory = lineCategory;
        segment = headingWithItems[2].trim();

        if (!cleanMenuLine(segment)) {
          activeCategory = lineCategory;
          continue;
        }
      }
    }

    const wholeSegmentKey = normalizeMenuHeading(segment);

    if (
      wholeSegmentKey in MENU_HEADING_CATEGORIES
    ) {
      activeCategory =
        MENU_HEADING_CATEGORIES[wholeSegmentKey] ?? undefined;
      continue;
    }

    const line = cleanMenuLine(segment);
    if (!line) continue;

    const cleanedHeadingKey = normalizeMenuHeading(line);

    if (
      cleanedHeadingKey in MENU_HEADING_CATEGORIES
    ) {
      activeCategory =
        MENU_HEADING_CATEGORIES[cleanedHeadingKey] ?? undefined;
      continue;
    }

    if (isClearlyNonDishText(line)) continue;

    {
      const normalized =
        normalizeText(line);

      if (!normalized) {
        continue;
      }

      if (
        MENU_HEADINGS.has(
          normalized,
        ) &&
        !isExplicitMenuItem
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
      categoryHint: lineCategory,
      serviceId: activeServiceId,
      dayLabel: activeDayLabel,
      mealLabel: activeMealLabel,
      servicePax: activeServicePax,
      explicitItem: isExplicitMenuItem,
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

  /*
   * OCR and copied PDFs often merge headings or adjacent columns into
   * a dish line. At this point splitMenuText has already removed prose,
   * so search all safe variants in one indexed catalog pass.
   */
  const matchedDishes = findDishesInText(
    candidates.join(' | '),
    true,
  );

  if (matchedDishes.length) {
    return matchedDishes;
  }

  const fuzzyCandidates = Array.from(
    new Set([
      candidates[0],
      candidates[1],
      candidates[candidates.length - 1],
    ].filter((candidate): candidate is string => Boolean(candidate))),
  );

  for (const candidate of fuzzyCandidates) {
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
        serviceId: menuLine.serviceId,
        dayLabel: menuLine.dayLabel,
        mealLabel: menuLine.mealLabel,
        servicePax: menuLine.servicePax,
      });
        },
      );

      continue;
    }

    if (
      !isLikelyUnknownDish(
        line,
        menuLine.categoryHint,
        menuLine.explicitItem,
      )
    ) {
      console.info(
        'Menu detection: ignored non-dish text:',
        line,
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
      inferFallbackCategory(
        line,
        menuLine.categoryHint,
      );

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
      serviceId: menuLine.serviceId,
      dayLabel: menuLine.dayLabel,
      mealLabel: menuLine.mealLabel,
      servicePax: menuLine.servicePax,
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
          )}-${item.serviceId ?? 'default'}`,
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
  fallbackPax = 0,
) {
  const categoryCounts =
    menu.reduce<
      Record<string, number>
    >(
      (counts, item) => {
        const serviceKey = item.serviceId ?? 'default';
        const categoryKey = `${serviceKey}::${item.category}`;

        counts[categoryKey] =
          (
            counts[
              categoryKey
            ] ?? 0
          ) + 1;

        return counts;
      },
      {},
    );

  return menu.map((item) => {
    const serviceKey = item.serviceId ?? 'default';
    const categoryKey = `${serviceKey}::${item.category}`;
    const categoryCount =
      categoryCounts[
        categoryKey
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
    const effectivePax = Math.max(
      0,
      Number(item.servicePax) || Number(fallbackPax) || 0,
    );
    const itemTotalCost =
      adjustedCostPerPlate * effectivePax;

    return {
      ...item,
      baseCostPerPlate,
      categoryCount,
      portionFactor,
      adjustedCostPerPlate,
      effectivePax,
      itemTotalCost,
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
      pax,
    );

  const serviceSummaryMap = new Map<
    string,
    {
      serviceId: string;
      dayLabel: string;
      mealLabel: string;
      pax: number;
      dishCount: number;
      menuCostPerPlate: number;
      totalCost: number;
    }
  >();

  menuBreakdown.forEach((item) => {
    const serviceId = item.serviceId ?? 'default';
    const current = serviceSummaryMap.get(serviceId) ?? {
      serviceId,
      dayLabel: item.dayLabel ?? '',
      mealLabel: item.mealLabel ?? 'Event Menu',
      pax: item.effectivePax,
      dishCount: 0,
      menuCostPerPlate: 0,
      totalCost: 0,
    };

    current.dishCount += 1;
    current.menuCostPerPlate += item.adjustedCostPerPlate;
    current.totalCost += item.itemTotalCost;
    serviceSummaryMap.set(serviceId, current);
  });

  const serviceSummaries = Array.from(serviceSummaryMap.values());
  const totalCovers = serviceSummaries.reduce(
    (sum, service) => sum + service.pax,
    0,
  );
  const menuFoodTotal = menuBreakdown.reduce(
    (sum, item) => sum + item.itemTotalCost,
    0,
  );

  const menuCostPerPlate =
    totalCovers > 0 ? menuFoodTotal / totalCovers : 0;

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
    totalCovers > 0
      ? extrasTotal / totalCovers
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
    menuFoodTotal + extrasTotal;

  const totalSelling =
    sellingPricePerPlate * totalCovers;

  const totalProfit = totalSelling - totalCost;

  return {
    pax: totalCovers,
    eventPax: pax,
    totalCovers,
    menuBreakdown,
    serviceSummaries,
    menuFoodTotal,
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
