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

export const CATEGORY_BASE_COST: Record<string, number> = {
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

const categoryRules: Array<{ category: string; words: string[] }> = [
  { category: 'Welcome Drink', words: ['juice', 'sharbat', 'jaljeera', 'welcome', 'thandai', 'kokum', 'aam panna'] },
  { category: 'Mocktail', words: ['mocktail', 'mojito', 'blue lagoon', 'pina', 'punch'] },
  { category: 'Soup', words: ['soup', 'shorba', 'manchow', 'tomato soup'] },
  { category: 'Starter', words: ['tikka', 'kebab', 'manchurian', 'spring roll', 'starter', 'paneer chilli', 'baby corn'] },
  { category: 'Chaat', words: ['chaat', 'pani puri', 'sev puri', 'bhel', 'dahi puri', 'ragda'] },
  { category: 'Chinese', words: ['noodle', 'fried rice', 'schezwan', 'chinese', 'hakka', 'chilli garlic'] },
  { category: 'Italian', words: ['pasta', 'pizza', 'italian', 'lasagna', 'risotto'] },
  { category: 'South Indian', words: ['dosa', 'idli', 'uttapam', 'sambar', 'upma', 'medu vada'] },
  { category: 'Paneer', words: ['paneer', 'pbm', 'palak paneer'] },
  { category: 'Punjabi', words: ['punjabi', 'dal makhani', 'chole', 'rajma', 'butter masala'] },
  { category: 'Sabji', words: ['sabji', 'sabzi', 'bhaji', 'veg', 'aloo', 'gobi', 'matar', 'kofta'] },
  { category: 'Dal / Kadhi', words: ['dal', 'kadhi', 'kadhi khichdi'] },
  { category: 'Rice', words: ['rice', 'biryani', 'pulao', 'khichdi'] },
  { category: 'Bread', words: ['roti', 'naan', 'puri', 'paratha', 'kulcha', 'bread'] },
  { category: 'Sweet', words: ['sweet', 'jalebi', 'gulab', 'rasgulla', 'halwa', 'kheer', 'mohanthal', 'ladoo', 'laddu', 'barfi', 'katli'] },
  { category: 'Ice Cream', words: ['ice cream', 'icecream', 'kulfi'] },
  { category: 'Salad', words: ['salad', 'kachumber', 'cucumber', 'onion salad'] },
  { category: 'Papad', words: ['papad'] },
  { category: 'Farsan', words: ['farsan', 'dhokla', 'khaman', 'khandvi', 'samosa', 'kachori'] },
  { category: 'Beverage', words: ['tea', 'coffee', 'milk', 'chaas', 'lassi'] },
  { category: 'Live Counter', words: ['live', 'counter'] },
  { category: 'Breakfast', words: ['poha', 'breakfast', 'toast', 'sandwich', 'bakery'] },
  { category: 'Jain', words: ['jain'] },
];

export function detectCategory(name: string) {
  const lower = name.toLowerCase();
  const match = categoryRules.find((rule) => rule.words.some((word) => lower.includes(word)));
  return match?.category ?? 'Sabji';
}

export function detectCost(name: string, category: string) {
  const lower = name.toLowerCase();
  if (lower.includes('kaju') || lower.includes('dry fruit')) return Math.max(CATEGORY_BASE_COST[category] ?? 45, 75);
  if (lower.includes('paneer')) return Math.max(CATEGORY_BASE_COST[category] ?? 45, 78);
  if (lower.includes('live')) return Math.max(CATEGORY_BASE_COST[category] ?? 45, 70);
  return CATEGORY_BASE_COST[category] ?? 45;
}
