import type { RowInput } from 'jspdf-autotable';

type BreakdownItem = {
  name: string;
  effectivePax: number;
  portionPercent: number;
  dayLabel?: string;
  mealLabel?: string;
};

type PdfRecipe = {
  name: string;
  aliases: string[];
  baseGuests: number;
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
  }>;
};

function normalize(value: unknown) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('en-IN')
    .replace(/\s+/g, ' ');
}

function readRecipe(value: unknown): PdfRecipe | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const row = value as Record<string, unknown>;
  const name = String(row.name || row.dishName || '').trim();

  if (!name) return null;

  return {
    name,
    aliases: Array.isArray(row.aliases)
      ? row.aliases.map(String).map((item) => item.trim()).filter(Boolean)
      : [],
    baseGuests: Math.max(1, Number(row.baseGuests) || 100),
    ingredients: Array.isArray(row.ingredients)
      ? row.ingredients.flatMap((value) => {
          if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return [];
          }

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

          if (!ingredientName || !(quantity > 0) || !unit) return [];

          return [{
            name: ingredientName,
            quantity,
            unit,
          }];
        })
      : [],
  };
}

export function buildIngredientRequirementRows(
  breakdown: BreakdownItem[],
  recipes: unknown[],
): RowInput[] {
  const recipeMap = new Map<string, PdfRecipe>();

  recipes.forEach((value) => {
    const recipe = readRecipe(value);
    if (!recipe) return;

    [recipe.name, ...recipe.aliases].forEach((name) => {
      recipeMap.set(normalize(name), recipe);
    });
  });

  const totals = new Map<string, {
    name: string;
    quantity: number;
    unit: string;
    usedIn: Set<string>;
  }>();

  breakdown.forEach((dish) => {
    const recipe = recipeMap.get(normalize(dish.name));
    if (!recipe) return;

    const scale =
      (Math.max(0, Number(dish.effectivePax) || 0) / recipe.baseGuests) *
      (Math.max(0, Number(dish.portionPercent) || 0) / 100);

    recipe.ingredients.forEach((ingredient) => {
      const key = `${normalize(ingredient.name)}__${normalize(ingredient.unit)}`;
      const quantity = ingredient.quantity * scale;
      const usedIn = [
        dish.dayLabel,
        dish.mealLabel,
        dish.name,
      ].filter(Boolean).join(' - ');

      const existing = totals.get(key);

      if (existing) {
        existing.quantity += quantity;
        existing.usedIn.add(usedIn || dish.name);
      } else {
        totals.set(key, {
          name: ingredient.name,
          quantity,
          unit: ingredient.unit,
          usedIn: new Set([usedIn || dish.name]),
        });
      }
    });
  });

  return Array.from(totals.values())
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((item) => [
      item.name,
      item.quantity.toLocaleString('en-IN', {
        maximumFractionDigits: 3,
      }),
      item.unit,
      Array.from(item.usedIn).join(', '),
    ]);
}
