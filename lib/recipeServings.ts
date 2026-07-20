import defaultRecipesData from './defaultRecipes.json';

export type RecipeServing = {
  quantity: number;
  unit: string;
};

const LOCAL_RECIPE_KEY = 'catereros_polished_dishes_v1';
const LEGACY_RECIPE_SERVINGS: Array<{
  name: string;
  quantity: number;
  unit: string;
}> = [
  { name: 'Dal Fry', quantity: 150, unit: 'ml' },
];

function normalizeDishName(value: string) {
  return value.trim().toLocaleLowerCase('en-IN').replace(/\s+/g, ' ');
}

function readRecipeServing(value: unknown): { name: string; serving: RecipeServing } | null {
  if (!value || typeof value !== 'object') return null;

  const recipe = value as Record<string, unknown>;
  const name = String(recipe.dishName ?? recipe.name ?? '').trim();
  const quantity = Number(recipe.servingSize);
  const unit = String(recipe.servingUnit ?? '').trim();

  if (!name || !Number.isFinite(quantity) || quantity <= 0 || !unit) return null;

  return {
    name,
    serving: { quantity, unit },
  };
}

function addRecipeServings(catalog: Map<string, RecipeServing>, values: unknown[]) {
  values.forEach((value) => {
    const recipe = readRecipeServing(value);
    if (recipe) catalog.set(normalizeDishName(recipe.name), recipe.serving);
  });
}

function readLocalRecipes(): unknown[] {
  if (typeof window === 'undefined') return [];

  try {
    const storedValue = window.localStorage.getItem(LOCAL_RECIPE_KEY);
    if (!storedValue) return [];

    const parsedValue: unknown = JSON.parse(storedValue);
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
}

export function createRecipeServingCatalog() {
  const catalog = new Map<string, RecipeServing>();
  const builtInRecipes: unknown[] = Array.isArray(defaultRecipesData)
    ? defaultRecipesData
    : [];

  LEGACY_RECIPE_SERVINGS.forEach((recipe) => {
    catalog.set(normalizeDishName(recipe.name), {
      quantity: recipe.quantity,
      unit: recipe.unit,
    });
  });
  addRecipeServings(catalog, builtInRecipes);
  addRecipeServings(catalog, readLocalRecipes());

  return catalog;
}

export function findRecipeServing(
  dishName: string,
  catalog = createRecipeServingCatalog(),
) {
  return catalog.get(normalizeDishName(dishName));
}
