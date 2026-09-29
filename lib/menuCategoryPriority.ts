import type { MenuItem } from './types';

const NORMALIZED_CATEGORY_PRIORITY = [
  'welcome drink',
  'mocktail',
  'starter',
  'soup',
  'sweet',
  'farsan',
  'paneer',
  'sabji',
  'main course',
  'punjabi',
  'north indian',
  'kathiyawadi',
  'rajasthani',
  'gujarati',
  'mughlai',
  'awadhi',
  'kashmiri',
  'bengali',
  'maharashtrian',
  'sindhi',
  'bihari',
  'odia',
  'hyderabadi',
  'andhra',
  'kerala',
  'goan',
  'bread',
  'dal / kadhi',
  'rice',
  'salad',
  'raita',
  'papad',
  'pickle',
  'condiments',
  'live counter',
  'chaat',
  'italian',
  'pizza',
  'pasta',
  'continental',
  'chinese',
  'south indian',
  'thai',
  'mexican',
  'lebanese',
  'sizzler',
  'street food',
  'tandoor',
  'fusion',
  'snacks',
  'sandwich',
  'fruit',
  'ice cream',
  'bakery',
  'dry fruit',
  'paan',
  'mukhwas',
  'beverage',
  'other',
] as const;

const CATEGORY_PRIORITY = new Map(
  NORMALIZED_CATEGORY_PRIORITY.map((category, index) => [category, index]),
);

function normalizeCategory(value: string) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('en-IN')
    .replace(/\s+/g, ' ');
}

function serviceKey(item: Pick<MenuItem, 'serviceId' | 'dayLabel' | 'mealLabel'>) {
  return (
    item.serviceId ||
    `${String(item.dayLabel || 'Event').trim()}::${String(
      item.mealLabel || 'Event Menu',
    ).trim()}`
  );
}

function dishPriority(item: Pick<MenuItem, 'name' | 'category'>) {
  const name = String(item.name || '').toLocaleLowerCase('en-IN');

  // Water is intentionally shown at the end of a meal even when the master
  // category is Beverage.
  if (/\b(?:water|mineral water|water bottle|bottled water)\b/.test(name)) {
    return NORMALIZED_CATEGORY_PRIORITY.length + 50;
  }

  const category = normalizeCategory(item.category);
  return CATEGORY_PRIORITY.get(category) ?? NORMALIZED_CATEGORY_PRIORITY.length;
}

/**
 * Keep wedding functions/meals in their original order, but show dishes inside
 * each meal in the caterer's operational category priority.
 */
export function sortMenuItemsByCategoryPriority<T extends MenuItem>(
  items: readonly T[],
): T[] {
  const groupRank = new Map<string, number>();

  items.forEach((item) => {
    const key = serviceKey(item);
    if (!groupRank.has(key)) groupRank.set(key, groupRank.size);
  });

  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const groupDifference =
        (groupRank.get(serviceKey(a.item)) ?? Number.MAX_SAFE_INTEGER) -
        (groupRank.get(serviceKey(b.item)) ?? Number.MAX_SAFE_INTEGER);

      if (groupDifference !== 0) return groupDifference;

      const categoryDifference = dishPriority(a.item) - dishPriority(b.item);
      if (categoryDifference !== 0) return categoryDifference;

      return a.index - b.index;
    })
    .map(({ item }) => item);
}

export function compareMenuCategoryPriority(
  a: Pick<MenuItem, 'name' | 'category'>,
  b: Pick<MenuItem, 'name' | 'category'>,
) {
  return dishPriority(a) - dishPriority(b);
}
