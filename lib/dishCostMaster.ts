export const CATEGORIES = [
  'Welcome Drink',
  'Mocktail',
  'Soup',
  'Starter',
  'Chaat',
  'Chinese',
  'Italian',
  'South Indian',
  'Punjabi',
  'Paneer',
  'Sabji',
  'Kathiyawadi',
  'Rajasthani',
  'Gujarati',
  'Dal / Kadhi',
  'Rice',
  'Bread',
  'Sweet',
  'Ice Cream',
  'Salad',
  'Papad',
  'Farsan',
  'Beverage',
  'Live Counter',
  'Breakfast',
  'Jain',
  'Kids',
  'Condiments',
] as const;

export type Category = (typeof CATEGORIES)[number];

export type DishCostItem = {
  name: string;
  category: Category;
  rate: number;
  aliases?: string[];
};

export const CATEGORY_BASE_COST: Record<Category, number> = {
  'Welcome Drink': 18,
  Mocktail: 35,
  Soup: 22,
  Starter: 55,
  Chaat: 38,
  Chinese: 45,
  Italian: 58,
  'South Indian': 42,
  Punjabi: 68,
  Paneer: 78,
  Sabji: 48,
  Kathiyawadi: 50,
  Rajasthani: 52,
  Gujarati: 44,
  'Dal / Kadhi': 24,
  Rice: 24,
  Bread: 18,
  Sweet: 42,
  'Ice Cream': 32,
  Salad: 10,
  Papad: 5,
  Farsan: 24,
  Beverage: 16,
  'Live Counter': 70,
  Breakfast: 55,
  Jain: 55,
  Kids: 42,
  Condiments: 6,
};

export const DISH_COST_ITEMS: DishCostItem[] = [
  { name: 'Orange Juice', category: 'Welcome Drink', rate: 18, aliases: ['orange juice', 'juice'] },
  { name: 'Jaljeera', category: 'Welcome Drink', rate: 18, aliases: ['jaljeera'] },
  { name: 'Kokum Sharbat', category: 'Welcome Drink', rate: 20, aliases: ['kokum sharbat', 'kokum'] },
  { name: 'Aam Panna', category: 'Welcome Drink', rate: 20, aliases: ['aam panna'] },
  { name: 'Virgin Mojito', category: 'Mocktail', rate: 35, aliases: ['virgin mojito', 'mojito'] },
  { name: 'Blue Lagoon', category: 'Mocktail', rate: 38, aliases: ['blue lagoon'] },
  { name: 'Fruit Punch', category: 'Mocktail', rate: 36, aliases: ['fruit punch', 'punch'] },
  { name: 'Tomato Soup', category: 'Soup', rate: 22, aliases: ['tomato soup'] },
  { name: 'Manchow Soup', category: 'Soup', rate: 24, aliases: ['manchow soup', 'manchow'] },
  { name: 'Hot and Sour Soup', category: 'Soup', rate: 25, aliases: ['hot and sour soup'] },
  { name: 'Paneer Tikka', category: 'Starter', rate: 58, aliases: ['paneer tikka', 'tikka'] },
  { name: 'Hara Bhara Kebab', category: 'Starter', rate: 55, aliases: ['hara bhara kebab', 'kebab'] },
  { name: 'Spring Roll', category: 'Starter', rate: 52, aliases: ['spring roll'] },
  { name: 'Paneer Chilli', category: 'Starter', rate: 60, aliases: ['paneer chilli', 'paneer chili'] },
  { name: 'Pani Puri', category: 'Chaat', rate: 38, aliases: ['pani puri'] },
  { name: 'Sev Puri', category: 'Chaat', rate: 38, aliases: ['sev puri'] },
  { name: 'Dahi Puri', category: 'Chaat', rate: 40, aliases: ['dahi puri'] },
  { name: 'Bhel', category: 'Chaat', rate: 35, aliases: ['bhel', 'bhel puri'] },
  { name: 'Hakka Noodles', category: 'Chinese', rate: 45, aliases: ['hakka noodles', 'noodle', 'noodles'] },
  { name: 'Schezwan Fried Rice', category: 'Chinese', rate: 48, aliases: ['schezwan fried rice', 'fried rice', 'schezwan rice'] },
  { name: 'Veg Manchurian', category: 'Chinese', rate: 46, aliases: ['veg manchurian', 'manchurian'] },
  { name: 'White Sauce Pasta', category: 'Italian', rate: 58, aliases: ['white sauce pasta', 'pasta'] },
  { name: 'Margherita Pizza', category: 'Italian', rate: 62, aliases: ['margherita pizza', 'pizza'] },
  { name: 'Lasagna', category: 'Italian', rate: 65, aliases: ['lasagna'] },
  { name: 'Masala Dosa', category: 'South Indian', rate: 42, aliases: ['masala dosa', 'dosa'] },
  { name: 'Idli Sambhar', category: 'South Indian', rate: 38, aliases: ['idli sambhar', 'idli sambar', 'idli'] },
  { name: 'Medu Vada', category: 'South Indian', rate: 40, aliases: ['medu vada'] },
  { name: 'Paneer Butter Masala', category: 'Paneer', rate: 78, aliases: ['paneer butter masala', 'pbm'] },
  { name: 'Palak Paneer', category: 'Paneer', rate: 80, aliases: ['palak paneer'] },
  { name: 'Kadai Paneer', category: 'Paneer', rate: 82, aliases: ['kadai paneer'] },
  { name: 'Dal Makhani', category: 'Punjabi', rate: 68, aliases: ['dal makhani'] },
  { name: 'Chole Masala', category: 'Punjabi', rate: 66, aliases: ['chole masala', 'chole'] },
  { name: 'Rajma Masala', category: 'Punjabi', rate: 64, aliases: ['rajma masala', 'rajma'] },
  { name: 'Mix Veg', category: 'Sabji', rate: 48, aliases: ['mix veg', 'veg'] },
  { name: 'Aloo Gobi', category: 'Sabji', rate: 50, aliases: ['aloo gobi'] },
  { name: 'Malai Kofta', category: 'Sabji', rate: 55, aliases: ['malai kofta', 'kofta'] },
  { name: 'Sev Tameta', category: 'Kathiyawadi', rate: 50, aliases: ['sev tameta'] },
  { name: 'Lasaniya Bataka', category: 'Kathiyawadi', rate: 52, aliases: ['lasaniya bataka'] },
  { name: 'Ker Sangri', category: 'Rajasthani', rate: 52, aliases: ['ker sangri'] },
  { name: 'Gatte Ki Sabzi', category: 'Rajasthani', rate: 54, aliases: ['gatte ki sabzi'] },
  { name: 'Undhiyu', category: 'Gujarati', rate: 48, aliases: ['undhiyu'] },
  { name: 'Gujarati Dal', category: 'Gujarati', rate: 44, aliases: ['gujarati dal'] },
  { name: 'Dal Fry', category: 'Dal / Kadhi', rate: 24, aliases: ['dal fry', 'dal'] },
  { name: 'Kadhi', category: 'Dal / Kadhi', rate: 24, aliases: ['kadhi'] },
  { name: 'Steam Rice', category: 'Rice', rate: 24, aliases: ['steam rice', 'rice'] },
  { name: 'Veg Biryani', category: 'Rice', rate: 30, aliases: ['veg biryani', 'biryani'] },
  { name: 'Jeera Rice', category: 'Rice', rate: 26, aliases: ['jeera rice'] },
  { name: 'Roti', category: 'Bread', rate: 18, aliases: ['roti'] },
  { name: 'Butter Naan', category: 'Bread', rate: 22, aliases: ['butter naan', 'naan'] },
  { name: 'Puri', category: 'Bread', rate: 18, aliases: ['puri'] },
  { name: 'Gulab Jamun', category: 'Sweet', rate: 42, aliases: ['gulab jamun', 'gulab'] },
  { name: 'Jalebi', category: 'Sweet', rate: 40, aliases: ['jalebi'] },
  { name: 'Moong Dal Halwa', category: 'Sweet', rate: 48, aliases: ['moong dal halwa', 'halwa'] },
  { name: 'Vanilla Ice Cream', category: 'Ice Cream', rate: 32, aliases: ['vanilla ice cream', 'ice cream'] },
  { name: 'Kulfi', category: 'Ice Cream', rate: 34, aliases: ['kulfi'] },
  { name: 'Green Salad', category: 'Salad', rate: 10, aliases: ['green salad', 'salad'] },
  { name: 'Kachumber Salad', category: 'Salad', rate: 12, aliases: ['kachumber salad', 'kachumber'] },
  { name: 'Roasted Papad', category: 'Papad', rate: 5, aliases: ['roasted papad', 'papad'] },
  { name: 'Masala Papad', category: 'Papad', rate: 8, aliases: ['masala papad'] },
  { name: 'Khaman', category: 'Farsan', rate: 24, aliases: ['khaman'] },
  { name: 'Dhokla', category: 'Farsan', rate: 24, aliases: ['dhokla'] },
  { name: 'Samosa', category: 'Farsan', rate: 26, aliases: ['samosa'] },
  { name: 'Tea', category: 'Beverage', rate: 16, aliases: ['tea'] },
  { name: 'Coffee', category: 'Beverage', rate: 18, aliases: ['coffee'] },
  { name: 'Chaas', category: 'Beverage', rate: 16, aliases: ['chaas'] },
  { name: 'Pav Bhaji Live Counter', category: 'Live Counter', rate: 70, aliases: ['pav bhaji live counter', 'live counter', 'pav bhaji live'] },
  { name: 'Dosa Live Counter', category: 'Live Counter', rate: 72, aliases: ['dosa live counter', 'live dosa'] },
  { name: 'Poha', category: 'Breakfast', rate: 55, aliases: ['poha'] },
  { name: 'Sandwich', category: 'Breakfast', rate: 58, aliases: ['sandwich'] },
  { name: 'Jain Paneer Sabji', category: 'Jain', rate: 55, aliases: ['jain paneer sabji', 'jain paneer', 'jain'] },
  { name: 'French Fries', category: 'Kids', rate: 42, aliases: ['french fries', 'fries'] },
  { name: 'Mini Burger', category: 'Kids', rate: 45, aliases: ['mini burger', 'burger'] },
  { name: 'Green Chutney', category: 'Condiments', rate: 6, aliases: ['green chutney', 'chutney'] },
  { name: 'Pickle', category: 'Condiments', rate: 6, aliases: ['pickle'] },
];

const categoryAliases: Record<Category, string[]> = {
  'Welcome Drink': ['welcome drink', 'juice', 'sharbat', 'jaljeera', 'thandai', 'kokum', 'aam panna'],
  Mocktail: ['mocktail', 'mojito', 'blue lagoon', 'pina', 'punch'],
  Soup: ['soup', 'shorba', 'manchow'],
  Starter: ['starter', 'tikka', 'kebab', 'spring roll', 'manchurian', 'paneer chilli', 'baby corn'],
  Chaat: ['chaat', 'pani puri', 'sev puri', 'bhel', 'dahi puri', 'ragda'],
  Chinese: ['chinese', 'noodle', 'noodles', 'fried rice', 'schezwan', 'hakka', 'chilli garlic'],
  Italian: ['italian', 'pasta', 'pizza', 'lasagna', 'risotto'],
  'South Indian': ['south indian', 'dosa', 'idli', 'uttapam', 'sambar', 'upma', 'medu vada'],
  Punjabi: ['punjabi', 'dal makhani', 'chole', 'rajma', 'butter masala'],
  Paneer: ['paneer', 'pbm', 'palak paneer', 'kadai paneer'],
  Sabji: ['sabji', 'sabzi', 'bhaji', 'veg', 'aloo', 'gobi', 'matar', 'kofta'],
  Kathiyawadi: ['kathiyawadi', 'sev tameta', 'lasaniya bataka'],
  Rajasthani: ['rajasthani', 'ker sangri', 'gatte'],
  Gujarati: ['gujarati', 'undhiyu'],
  'Dal / Kadhi': ['dal', 'kadhi', 'kadhi khichdi'],
  Rice: ['rice', 'biryani', 'pulao', 'khichdi'],
  Bread: ['roti', 'naan', 'puri', 'paratha', 'kulcha', 'bread'],
  Sweet: ['sweet', 'jalebi', 'gulab', 'rasgulla', 'halwa', 'kheer', 'mohanthal', 'ladoo', 'laddu', 'barfi', 'katli'],
  'Ice Cream': ['ice cream', 'icecream', 'kulfi'],
  Salad: ['salad', 'kachumber', 'cucumber', 'onion salad'],
  Papad: ['papad'],
  Farsan: ['farsan', 'dhokla', 'khaman', 'khandvi', 'samosa', 'kachori'],
  Beverage: ['tea', 'coffee', 'milk', 'chaas', 'lassi'],
  'Live Counter': ['live counter', 'live'],
  Breakfast: ['breakfast', 'poha', 'toast', 'sandwich', 'bakery'],
  Jain: ['jain'],
  Kids: ['kids', 'fries', 'burger', 'pasta kids'],
  Condiments: ['condiments', 'chutney', 'pickle', 'salad dressing'],
};

function normalizeDishName(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeDishName(value: string) {
  return normalizeDishName(value).split(' ').filter(Boolean);
}

function isExactAliasMatch(input: string, candidate: string) {
  return normalizeDishName(input) === normalizeDishName(candidate);
}

function isAliasContained(input: string, candidate: string) {
  const normalizedInput = normalizeDishName(input);
  const normalizedCandidate = normalizeDishName(candidate);
  return normalizedInput.includes(normalizedCandidate);
}

export function findDishByName(name: string): DishCostItem | null {
  const exactMatch = DISH_COST_ITEMS.find((dish) =>
    isExactAliasMatch(name, dish.name) || (dish.aliases ?? []).some((alias) => isExactAliasMatch(name, alias)),
  );
  if (exactMatch) return exactMatch;

  const tokenizedInput = tokenizeDishName(name);
  return DISH_COST_ITEMS.find((dish) => {
    const candidates = [dish.name, ...(dish.aliases ?? [])];
    return candidates.some((candidate) => {
      if (!isAliasContained(name, candidate)) return false;
      const candidateTokens = tokenizeDishName(candidate);
      return candidateTokens.every((token) => tokenizedInput.includes(token));
    });
  }) ?? null;
}

export function detectDish(name: string): DishCostItem | null {
  return findDishByName(name);
}

export function suggestDishesByName(name: string, limit = 5): DishCostItem[] {
  const normalizedInput = normalizeDishName(name);
  if (!normalizedInput) return [];

  const inputTokens = tokenizeDishName(name);

  return DISH_COST_ITEMS
    .map((dish) => {
      const candidates = [dish.name, ...(dish.aliases ?? [])];
      const score = Math.max(
        ...candidates.map((candidate) => {
          const normalizedCandidate = normalizeDishName(candidate);
          const candidateTokens = tokenizeDishName(candidate);
          let value = 0;

          if (normalizedCandidate.startsWith(normalizedInput) || normalizedInput.startsWith(normalizedCandidate)) value += 6;
          if (normalizedCandidate.includes(normalizedInput) || normalizedInput.includes(normalizedCandidate)) value += 4;

          const sharedTokens = candidateTokens.filter((token) => inputTokens.includes(token)).length;
          value += sharedTokens * 2;

          return value;
        }),
      );

      return { dish, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.dish.name.localeCompare(b.dish.name))
    .slice(0, limit)
    .map((entry) => entry.dish);
}

export function detectCategory(name: string): Category {
  const dish = detectDish(name);
  if (dish) return dish.category;

  const normalized = normalizeDishName(name);
  const matchedCategory = CATEGORIES.find((category) =>
    categoryAliases[category].some((alias) => normalized.includes(normalizeDishName(alias))),
  );

  return matchedCategory ?? 'Sabji';
}

export function detectCost(name: string, category?: string) {
  const dish = detectDish(name);
  if (dish) return dish.rate;

  const detectedCategory = (category && CATEGORIES.includes(category as Category) ? category : detectCategory(name)) as Category;
  return CATEGORY_BASE_COST[detectedCategory] ?? 45;
}
