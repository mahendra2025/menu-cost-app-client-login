import {
  inferIngredientCategory,
  normalizeIngredientId,
  normalizeIngredientRate,
} from './ingredientCatalog';

export type CostableRecipeIngredient = {
  name: string;
  quantity: number;
  unit: string;
  rate?: number;
  rateUnit?: string;
  rateSource?: string;
};

export type CostableRecipe = {
  name: string;
  aliases: string[];
  baseGuests: number;
  ingredients: CostableRecipeIngredient[];
};

export function normalizeRecipeName(value: unknown) {
  return String(value || '')
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('en-IN')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function readCostableRecipe(value: unknown): CostableRecipe | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const row = value as Record<string, unknown>;
  const name = String(row.name || row.dishName || '').trim();
  if (!name) return null;

  const ingredients = Array.isArray(row.ingredients)
    ? row.ingredients.flatMap((value) => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
        const ingredient = value as Record<string, unknown>;
        const ingredientName = String(
          ingredient.name || ingredient.ingredientName || '',
        ).trim();
        const quantity = Math.max(
          0,
          Number(ingredient.quantity ?? ingredient.qty) || 0,
        );
        const unit = String(
          ingredient.unit || ingredient.rateUnit || '',
        ).trim();

        const rate = Math.max(
          0,
          Number(ingredient.rate ?? ingredient.marketRate) || 0,
        );
        const rateUnit = String(ingredient.rateUnit || unit).trim() || unit;
        const rateSource = String(ingredient.rateSource || '').trim();

        return ingredientName && quantity > 0 && unit
          ? [{
              name: ingredientName,
              quantity,
              unit,
              ...(rate > 0 ? { rate, rateUnit } : {}),
              ...(rateSource ? { rateSource } : {}),
            }]
          : [];
      })
    : [];

  return {
    name,
    aliases: Array.isArray(row.aliases)
      ? row.aliases.map(String).map((item) => item.trim()).filter(Boolean)
      : [],
    baseGuests: Math.max(1, Math.round(Number(row.baseGuests) || 100)),
    ingredients,
  };
}

function convertQuantity(quantity: number, unit: string, rateUnit: string) {
  if (unit === rateUnit) return quantity;
  if (unit === 'gram' && rateUnit === 'kg') return quantity / 1000;
  if (unit === 'kg' && rateUnit === 'gram') return quantity * 1000;
  if (unit === 'ml' && rateUnit === 'ltr') return quantity / 1000;
  if (unit === 'ltr' && rateUnit === 'ml') return quantity * 1000;
  return quantity;
}

function unitsCompatible(left: string, right: string) {
  if (left === right) return true;
  const mass = new Set(['kg', 'gram']);
  const volume = new Set(['ltr', 'ml']);
  return (
    (mass.has(left) && mass.has(right)) ||
    (volume.has(left) && volume.has(right))
  );
}

export function buildRecipeMap(values: unknown[]) {
  const output = new Map<string, CostableRecipe>();

  values.forEach((value) => {
    const recipe = readCostableRecipe(value);
    if (!recipe) return;
    [recipe.name, ...recipe.aliases].forEach((name) => {
      const key = normalizeRecipeName(name);
      if (key) output.set(key, recipe);
    });
  });

  return output;
}

export function calculateRecipeCost(
  recipe: CostableRecipe,
  masterRatesRaw: unknown,
  overrides = new Map<string, number>(),
) {
  const rates = Array.isArray(masterRatesRaw)
    ? masterRatesRaw
        .map(normalizeIngredientRate)
        .filter((rate): rate is NonNullable<typeof rate> => Boolean(rate))
    : [];
  const ratesById = new Map(rates.map((rate) => [rate.id, rate]));
  let total = 0;
  let missingRates = 0;

  recipe.ingredients.forEach((ingredient) => {
    const directId = normalizeIngredientId(ingredient.name, ingredient.unit);
    const direct = ratesById.get(directId);
    const sameName = direct || rates.find(
      (rate) =>
        normalizeRecipeName(rate.name) === normalizeRecipeName(ingredient.name) &&
        unitsCompatible(ingredient.unit, rate.unit),
    );
    const masterRate = sameName?.rate ?? 0;
    const rate = overrides.get(sameName?.id || directId) ??
      (masterRate > 0 ? masterRate : ingredient.rate ?? 0);
    const rateUnit = masterRate > 0
      ? sameName?.unit || ingredient.unit
      : ingredient.rateUnit || ingredient.unit;

    if (!(rate > 0)) missingRates += 1;
    total += convertQuantity(
      ingredient.quantity,
      ingredient.unit,
      rateUnit,
    ) * rate;
  });

  return {
    costPerPlate: Math.round((total / Math.max(1, recipe.baseGuests)) * 100) / 100,
    missingRates,
  };
}

function median(values: number[]) {
  const valid = values
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((left, right) => left - right);
  if (!valid.length) return 0;
  const middle = Math.floor(valid.length / 2);
  return valid.length % 2
    ? valid[middle]
    : (valid[middle - 1] + valid[middle]) / 2;
}

function categoryEstimate(name: string, unit: string) {
  const category = inferIngredientCategory(name);
  const perKg: Record<string, number> = {
    'Vegetables & Herbs': 80,
    Fruits: 120,
    Dairy: 280,
    'Grains & Flour': 80,
    'Pulses & Legumes': 130,
    'Spices & Seasonings': 300,
    'Oils & Fats': 180,
    'Sauces & Condiments': 180,
    Beverages: 100,
    Sweeteners: 70,
    'Bakery & Packaged': 120,
    Other: 100,
  };
  const perLitre: Record<string, number> = {
    Dairy: 80,
    'Oils & Fats': 160,
    'Sauces & Condiments': 180,
    Beverages: 100,
    Other: 100,
  };

  if (unit === 'kg') return perKg[category] || 100;
  if (unit === 'gram') return (perKg[category] || 100) / 1000;
  if (unit === 'ltr') return perLitre[category] || perKg[category] || 100;
  if (unit === 'ml') return (perLitre[category] || perKg[category] || 100) / 1000;
  if (unit === 'piece') return category === 'Bakery & Packaged' ? 10 : 5;
  if (unit === 'packet') return category === 'Bakery & Packaged' ? 20 : 10;
  return 1;
}

export function fillRecipeIngredientRates(
  recipe: CostableRecipe,
  masterRatesRaw: unknown,
  historicalRecipes: unknown[],
  overrides = new Map<string, number>(),
) {
  const masterRates = Array.isArray(masterRatesRaw)
    ? masterRatesRaw
        .map(normalizeIngredientRate)
        .filter((rate): rate is NonNullable<typeof rate> => Boolean(rate))
    : [];
  const masterById = new Map(masterRates.map((rate) => [rate.id, rate]));
  const historical = new Map<string, number[]>();

  historicalRecipes.forEach((value) => {
    const historicalRecipe = readCostableRecipe(value);
    historicalRecipe?.ingredients.forEach((ingredient) => {
      if (!(Number(ingredient.rate) > 0)) return;
      const id = normalizeIngredientId(
        ingredient.name,
        ingredient.rateUnit || ingredient.unit,
      );
      historical.set(id, [
        ...(historical.get(id) || []),
        Number(ingredient.rate),
      ]);
    });
  });

  let estimatedRates = 0;
  const ingredients = recipe.ingredients.map((ingredient) => {
    const directId = normalizeIngredientId(ingredient.name, ingredient.unit);
    const master = masterById.get(directId) || masterRates.find(
      (rate) =>
        normalizeRecipeName(rate.name) === normalizeRecipeName(ingredient.name) &&
        unitsCompatible(ingredient.unit, rate.unit),
    );
    const customRate = overrides.get(master?.id || directId);
    const masterRate = customRate ?? master?.rate ?? 0;

    if (masterRate > 0) {
      return {
        ...ingredient,
        rate: masterRate,
        rateUnit: master?.unit || ingredient.unit,
        rateSource: customRate !== undefined ? 'tenant' : 'ingredient_master',
      };
    }

    const historicalId = normalizeIngredientId(
      ingredient.name,
      master?.unit || ingredient.unit,
    );
    const recipeRate = median(historical.get(historicalId) || []);
    if (recipeRate > 0) {
      return {
        ...ingredient,
        rate: recipeRate,
        rateUnit: master?.unit || ingredient.unit,
        rateSource: 'recipe_history',
      };
    }

    estimatedRates += 1;
    return {
      ...ingredient,
      rate: Math.max(0.001, categoryEstimate(ingredient.name, ingredient.unit)),
      rateUnit: ingredient.unit,
      rateSource: 'category_estimate',
    };
  });

  return {
    recipe: { ...recipe, ingredients },
    estimatedRates,
  };
}
