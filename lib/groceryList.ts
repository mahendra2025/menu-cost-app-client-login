import defaultRecipesData from './defaultRecipes.json';
import { findDishByName } from './dishCostMaster';
import type { WorkState } from './types';

type RecipeIngredient = {
  name: string;
  qty: number;
  unit: string;
};

type RecipeDish = {
  name: string;
  baseGuests: number;
  ingredients: RecipeIngredient[];
};

export type GroceryItem = {
  name: string;
  quantity: number;
  unit: string;
  dishes: string[];
};

export type GroceryList = {
  items: GroceryItem[];
  matchedDishes: string[];
  unmatchedDishes: string[];
};

const LOCAL_RECIPE_KEY = 'catereros_polished_dishes_v1';

function normalize(value: string) {
  return value.trim().toLocaleLowerCase('en-IN').replace(/\s+/g, ' ');
}

function isRecipeDish(value: unknown): value is RecipeDish {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return Boolean(
    String(row.name || '').trim() &&
    Number(row.baseGuests) > 0 &&
    Array.isArray(row.ingredients),
  );
}

function recipeCatalog() {
  const recipes = new Map<string, RecipeDish>();
  (defaultRecipesData as RecipeDish[]).forEach((recipe) => recipes.set(normalize(recipe.name), recipe));

  if (typeof window !== 'undefined') {
    try {
      const localRecipes = JSON.parse(window.localStorage.getItem(LOCAL_RECIPE_KEY) || '[]') as unknown[];
      localRecipes.filter(isRecipeDish).forEach((recipe) => recipes.set(normalize(recipe.name), recipe));
    } catch {
      // Built-in recipes remain available if local recipe data is invalid.
    }
  }

  return recipes;
}

function standardQuantity(quantity: number, unit: string) {
  const normalizedUnit = normalize(unit);
  if (normalizedUnit === 'gram' || normalizedUnit === 'grams' || normalizedUnit === 'g') {
    return { quantity: quantity / 1000, unit: 'kg' };
  }
  if (normalizedUnit === 'ml') {
    return { quantity: quantity / 1000, unit: 'ltr' };
  }
  return { quantity, unit: unit.trim() || 'unit' };
}

export function buildGroceryList(work: WorkState): GroceryList {
  const pax = Math.max(0, Number(work.event.pax) || 0);
  const catalog = recipeCatalog();
  const groceries = new Map<string, { name: string; quantity: number; unit: string; dishes: Set<string> }>();
  const matchedDishes: string[] = [];
  const unmatchedDishes: string[] = [];
  const processedDishes = new Set<string>();

  work.menu.forEach((menuItem) => {
    const canonicalName = findDishByName(menuItem.name)?.name || menuItem.name.trim();
    const dishKey = normalize(canonicalName);
    if (!dishKey || processedDishes.has(dishKey)) return;
    processedDishes.add(dishKey);

    const recipe = catalog.get(dishKey) || catalog.get(normalize(menuItem.name));
    if (!recipe || !recipe.ingredients.length) {
      unmatchedDishes.push(canonicalName);
      return;
    }

    matchedDishes.push(recipe.name);
    const multiplier = pax / Math.max(1, Number(recipe.baseGuests) || 100);
    recipe.ingredients.forEach((ingredient) => {
      const scaled = standardQuantity((Math.max(0, Number(ingredient.qty) || 0)) * multiplier, ingredient.unit);
      const key = `${normalize(ingredient.name)}__${normalize(scaled.unit)}`;
      const current = groceries.get(key) || {
        name: ingredient.name.trim(),
        quantity: 0,
        unit: scaled.unit,
        dishes: new Set<string>(),
      };
      current.quantity += scaled.quantity;
      current.dishes.add(recipe.name);
      groceries.set(key, current);
    });
  });

  const items = Array.from(groceries.values())
    .map((item) => ({ ...item, quantity: Math.round(item.quantity * 1000) / 1000, dishes: Array.from(item.dishes).sort() }))
    .sort((left, right) => left.name.localeCompare(right.name));

  return {
    items,
    matchedDishes: matchedDishes.sort(),
    unmatchedDishes: unmatchedDishes.sort(),
  };
}

function csvCell(value: string | number) {
  let text = String(value);
  if (/^[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function displayQuantity(value: number) {
  return value.toFixed(3).replace(/\.?0+$/, '');
}

function safeFilePart(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
}

export function downloadGroceryListCsv(work: WorkState, groceryList: GroceryList) {
  const rows: Array<Array<string | number>> = [
    ['Grocery List'],
    ['Event', work.event.eventName || '-'],
    ['Client', work.event.clientName || '-'],
    ['Event Date', work.event.eventDate || '-'],
    ['Guests', Math.max(0, Number(work.event.pax) || 0)],
    [],
    ['Ingredient', 'Quantity', 'Unit', 'Used In Dishes'],
    ...groceryList.items.map((item) => [item.name, displayQuantity(item.quantity), item.unit, item.dishes.join(', ')]),
  ];

  if (groceryList.unmatchedDishes.length) {
    rows.push([], ['Dishes Without Saved Recipes'], ...groceryList.unmatchedDishes.map((dish) => [dish]));
  }

  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const namePart = safeFilePart(work.event.eventName || work.event.clientName || work.event.eventDate || 'menu');
  link.href = url;
  link.download = `grocery-list-${namePart || 'menu'}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
