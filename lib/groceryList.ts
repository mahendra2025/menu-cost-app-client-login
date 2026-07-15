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

type GroceryAccumulator = {
  name: string;
  quantity: number;
  unit: string;
  dishes: Set<string>;
};

const LOCAL_RECIPE_KEY = 'catereros_polished_dishes_v1';
const DEFAULT_BASE_GUESTS = 100;

function normalize(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('en-IN')
    .replace(/\s+/g, ' ');
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readPositiveNumber(value: unknown): number | null {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    return null;
  }

  return number;
}

function readNonNegativeNumber(value: unknown): number | null {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return null;
  }

  return number;
}

/**
 * Supports both recipe formats:
 *
 * Built-in JSON:
 * {
 *   dishName: string,
 *   baseGuests: number,
 *   ingredients: [
 *     {
 *       name: string,
 *       quantity: number,
 *       unit: string
 *     }
 *   ]
 * }
 *
 * Local-storage recipe:
 * {
 *   name: string,
 *   baseGuests: number,
 *   ingredients: [
 *     {
 *       name: string,
 *       qty: number,
 *       unit: string
 *     }
 *   ]
 * }
 */
function toRecipeIngredient(value: unknown): RecipeIngredient | null {
  if (!isObject(value)) {
    return null;
  }

  const name = String(value.name ?? '').trim();
  const qty = readNonNegativeNumber(value.qty ?? value.quantity);
  const unit = String(value.unit ?? '').trim();

  if (!name || qty === null || !unit) {
    return null;
  }

  return {
    name,
    qty,
    unit,
  };
}

function toRecipeDish(value: unknown): RecipeDish | null {
  if (!isObject(value)) {
    return null;
  }

  const name = String(value.name ?? value.dishName ?? '').trim();
  const baseGuests = readPositiveNumber(value.baseGuests);

  if (!name || baseGuests === null || !Array.isArray(value.ingredients)) {
    return null;
  }

  const ingredients = value.ingredients
    .map(toRecipeIngredient)
    .filter(
      (ingredient): ingredient is RecipeIngredient =>
        ingredient !== null,
    );

  return {
    name,
    baseGuests,
    ingredients,
  };
}

function addRecipesToCatalog(
  catalog: Map<string, RecipeDish>,
  values: unknown[],
): void {
  values.forEach((value) => {
    const recipe = toRecipeDish(value);

    if (!recipe) {
      return;
    }

    catalog.set(normalize(recipe.name), recipe);
  });
}

function readLocalRecipes(): unknown[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const storedValue = window.localStorage.getItem(LOCAL_RECIPE_KEY);

    if (!storedValue) {
      return [];
    }

    const parsedValue: unknown = JSON.parse(storedValue);

    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
}

function createRecipeCatalog(): Map<string, RecipeDish> {
  const catalog = new Map<string, RecipeDish>();

  const builtInRecipes: unknown[] = Array.isArray(defaultRecipesData)
    ? defaultRecipesData
    : [];

  addRecipesToCatalog(catalog, builtInRecipes);
  addRecipesToCatalog(catalog, readLocalRecipes());

  return catalog;
}

function standardizeQuantity(
  quantity: number,
  unit: string,
): {
  quantity: number;
  unit: string;
} {
  const normalizedUnit = normalize(unit);

  const gramUnits = new Set([
    'g',
    'gm',
    'gram',
    'grams',
  ]);

  const millilitreUnits = new Set([
    'ml',
    'millilitre',
    'millilitres',
    'milliliter',
    'milliliters',
  ]);

  if (gramUnits.has(normalizedUnit)) {
    return {
      quantity: quantity / 1000,
      unit: 'kg',
    };
  }

  if (millilitreUnits.has(normalizedUnit)) {
    return {
      quantity: quantity / 1000,
      unit: 'ltr',
    };
  }

  return {
    quantity,
    unit: unit.trim() || 'unit',
  };
}

function findRecipe(
  catalog: Map<string, RecipeDish>,
  menuItemName: string,
  canonicalName: string,
): RecipeDish | undefined {
  return (
    catalog.get(normalize(canonicalName)) ??
    catalog.get(normalize(menuItemName))
  );
}

function addIngredientToGroceries(
  groceries: Map<string, GroceryAccumulator>,
  ingredient: RecipeIngredient,
  recipeName: string,
  multiplier: number,
): void {
  const ingredientQuantity = Math.max(
    0,
    Number(ingredient.qty) || 0,
  );

  const scaledQuantity = standardizeQuantity(
    ingredientQuantity * multiplier,
    ingredient.unit,
  );

  const groceryKey = [
    normalize(ingredient.name),
    normalize(scaledQuantity.unit),
  ].join('__');

  const currentItem = groceries.get(groceryKey) ?? {
    name: ingredient.name.trim(),
    quantity: 0,
    unit: scaledQuantity.unit,
    dishes: new Set<string>(),
  };

  currentItem.quantity += scaledQuantity.quantity;
  currentItem.dishes.add(recipeName);

  groceries.set(groceryKey, currentItem);
}

export function buildGroceryList(work: WorkState): GroceryList {
  const pax = Math.max(0, Number(work.event.pax) || 0);
  const recipeCatalog = createRecipeCatalog();

  const groceries = new Map<string, GroceryAccumulator>();
  const matchedDishes = new Set<string>();
  const unmatchedDishes = new Set<string>();
  const processedDishes = new Set<string>();

  work.menu.forEach((menuItem) => {
    const menuItemName = menuItem.name.trim();

    if (!menuItemName) {
      return;
    }

    const canonicalName =
      findDishByName(menuItemName)?.name ?? menuItemName;

    const dishKey = normalize(canonicalName);

    if (!dishKey || processedDishes.has(dishKey)) {
      return;
    }

    processedDishes.add(dishKey);

    const recipe = findRecipe(
      recipeCatalog,
      menuItemName,
      canonicalName,
    );

    if (!recipe || recipe.ingredients.length === 0) {
      unmatchedDishes.add(canonicalName);
      return;
    }

    matchedDishes.add(recipe.name);

    const baseGuests =
      readPositiveNumber(recipe.baseGuests) ??
      DEFAULT_BASE_GUESTS;

    const multiplier = pax / baseGuests;

    recipe.ingredients.forEach((ingredient) => {
      addIngredientToGroceries(
        groceries,
        ingredient,
        recipe.name,
        multiplier,
      );
    });
  });

  const items: GroceryItem[] = Array.from(groceries.values())
    .map((item) => ({
      name: item.name,
      quantity: Math.round(item.quantity * 1000) / 1000,
      unit: item.unit,
      dishes: Array.from(item.dishes).sort((left, right) =>
        left.localeCompare(right),
      ),
    }))
    .sort((left, right) =>
      left.name.localeCompare(right.name),
    );

  return {
    items,
    matchedDishes: Array.from(matchedDishes).sort((left, right) =>
      left.localeCompare(right),
    ),
    unmatchedDishes: Array.from(unmatchedDishes).sort(
      (left, right) => left.localeCompare(right),
    ),
  };
}

function csvCell(value: string | number): string {
  let text = String(value);

  // Protect CSV files against spreadsheet formula injection.
  if (/^[=+@-]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

function displayQuantity(value: number): string {
  return value
    .toFixed(3)
    .replace(/\.?0+$/, '');
}

function safeFilePart(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('en-IN')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

function createCsvRows(
  work: WorkState,
  groceryList: GroceryList,
): Array<Array<string | number>> {
  const rows: Array<Array<string | number>> = [
    ['Grocery List'],
    ['Event', work.event.eventName || '-'],
    ['Client', work.event.clientName || '-'],
    ['Event Date', work.event.eventDate || '-'],
    ['Guests', Math.max(0, Number(work.event.pax) || 0)],
    [],
    ['Ingredient', 'Quantity', 'Unit', 'Used In Dishes'],
    ...groceryList.items.map((item) => [
      item.name,
      displayQuantity(item.quantity),
      item.unit,
      item.dishes.join(', '),
    ]),
  ];

  if (groceryList.unmatchedDishes.length > 0) {
    rows.push(
      [],
      ['Dishes Without Saved Recipes'],
      ...groceryList.unmatchedDishes.map((dish) => [dish]),
    );
  }

  return rows;
}

export function downloadGroceryListCsv(
  work: WorkState,
  groceryList: GroceryList,
): void {
  if (typeof document === 'undefined') {
    return;
  }

  const rows = createCsvRows(work, groceryList);

  const csv = `\uFEFF${rows
    .map((row) => row.map(csvCell).join(','))
    .join('\r\n')}`;

  const blob = new Blob([csv], {
    type: 'text/csv;charset=utf-8',
  });

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const fileNameSource =
    work.event.eventName ||
    work.event.clientName ||
    work.event.eventDate ||
    'menu';

  const fileNamePart = safeFilePart(fileNameSource) || 'menu';

  link.href = objectUrl;
  link.download = `grocery-list-${fileNamePart}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(objectUrl);
}