import {
  normalizeIngredientId,
  normalizeIngredientRate,
} from './ingredientCatalog';

export type CostableRecipeIngredient = {
  name: string;
  quantity: number;
  unit: string;
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

        return ingredientName && quantity > 0 && unit
          ? [{ name: ingredientName, quantity, unit }]
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
      (rate) => normalizeRecipeName(rate.name) === normalizeRecipeName(ingredient.name),
    );
    const rate = overrides.get(sameName?.id || directId) ?? sameName?.rate ?? 0;

    if (!(rate > 0)) missingRates += 1;
    total += convertQuantity(
      ingredient.quantity,
      ingredient.unit,
      sameName?.unit || ingredient.unit,
    ) * rate;
  });

  return {
    costPerPlate: Math.round((total / Math.max(1, recipe.baseGuests)) * 100) / 100,
    missingRates,
  };
}
