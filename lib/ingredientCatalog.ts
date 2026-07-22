export const INGREDIENT_CATEGORIES = [
  'Vegetables & Herbs',
  'Fruits',
  'Dairy',
  'Grains & Flour',
  'Pulses & Legumes',
  'Spices & Seasonings',
  'Oils & Fats',
  'Sauces & Condiments',
  'Beverages',
  'Sweeteners',
  'Bakery & Packaged',
  'Other',
] as const;

export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number];

export const INGREDIENT_UNITS = ['kg', 'gram', 'ltr', 'ml', 'piece', 'packet'] as const;
export type IngredientUnit = (typeof INGREDIENT_UNITS)[number];

export type IngredientRate = {
  id: string;
  name: string;
  category: IngredientCategory;
  rate: number;
  unit: IngredientUnit;
};

function includesAny(value: string, words: string[]) {
  return words.some((word) => value.includes(word));
}

export function inferIngredientCategory(name: string): IngredientCategory {
  const value = name.trim().toLowerCase();
  if (includesAny(value, ['milk', 'cream', 'curd', 'paneer', 'cheese', 'butter', 'ghee', 'khoya'])) return 'Dairy';
  if (includesAny(value, ['oil', 'shortening'])) return 'Oils & Fats';
  if (includesAny(value, ['sugar', 'jaggery', 'honey', 'syrup'])) return 'Sweeteners';
  if (includesAny(value, ['sauce', 'chutney', 'ketchup', 'pickle', 'vinegar', 'mayonnaise', 'pesto'])) return 'Sauces & Condiments';
  if (includesAny(value, ['juice', 'water', 'soda', 'cola', 'tea', 'coffee', 'ale'])) return 'Beverages';
  if (includesAny(value, ['flour', 'rice', 'rava', 'poha', 'oats', 'barley', 'quinoa', 'pasta', 'noodle', 'vermicelli'])) return 'Grains & Flour';
  if (includesAny(value, ['dal', 'lentil', 'chana', 'rajma', 'pea', 'bean', 'gram'])) return 'Pulses & Legumes';
  if (includesAny(value, ['masala', 'salt', 'pepper', 'chilli', 'cumin', 'coriander powder', 'turmeric', 'cardamom', 'cinnamon', 'saffron', 'kesar', 'seasoning', 'ajwain', 'asafoetida'])) return 'Spices & Seasonings';
  if (includesAny(value, ['bread', 'bun', 'base', 'sheet', 'wrapper', 'papad', 'chips', 'nachos', 'biscuit', 'cup', 'spoon', 'packet'])) return 'Bakery & Packaged';
  if (includesAny(value, ['apple', 'banana', 'orange', 'mango', 'lemon', 'lime', 'pineapple', 'berry', 'grape', 'guava', 'lychee', 'peach', 'kiwi', 'watermelon', 'pomegranate', 'coconut'])) return 'Fruits';
  if (includesAny(value, ['onion', 'tomato', 'potato', 'carrot', 'cabbage', 'capsicum', 'spinach', 'mint', 'garlic', 'ginger', 'leaves', 'vegetable', 'mushroom', 'broccoli', 'gourd', 'beetroot', 'pumpkin', 'corn', 'bhindi'])) return 'Vegetables & Herbs';
  return 'Other';
}

export function normalizeIngredientId(name: string, unit: string) {
  return `${name.trim().toLowerCase()}__${unit}`;
}

export function normalizeIngredientRate(value: unknown): IngredientRate | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const name = String(row.name || '').trim();
  const unit = String(row.unit || '').trim() as IngredientUnit;
  if (!name || !INGREDIENT_UNITS.includes(unit)) return null;
  const suppliedCategory = String(row.category || '').trim() as IngredientCategory;
  return {
    id: normalizeIngredientId(name, unit),
    name,
    category: INGREDIENT_CATEGORIES.includes(suppliedCategory) ? suppliedCategory : inferIngredientCategory(name),
    rate: Math.max(0, Number(row.rate) || 0),
    unit,
  };
}
