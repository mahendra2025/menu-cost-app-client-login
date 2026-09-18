export type RecipeCoverageStatus =
  | 'READY'
  | 'MISSING_RECIPE'
  | 'MISSING_RATE'
  | 'INCOMPLETE';

export type RecipeCoverageDish = {
  name: string;
  category: string;
  subcategory?: string | null;
  rate?: number | null;
  aliases?: unknown;
};

export type RecipeCoverageSummary = {
  total: number;
  ready: number;
  missingRecipe: number;
  missingRate: number;
  incomplete: number;
  fallbackOnly: number;
  coveragePercent: number;
};

export type RecipeCoverageItem = {
  name: string;
  category: string;
  subcategory: string;
  dishRate: number;
  recipeName: string;
  status: RecipeCoverageStatus;
  ingredientCount: number;
  missingRateCount: number;
  issues: string[];
  fallbackOnly: boolean;
  usageCount: number;
  priorityScore: number;
};

type CoverageInput = {
  dishes: RecipeCoverageDish[];
  recipes: unknown[];
  rates: unknown[];
  completedSnapshots?: unknown[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function normalizeRecipeCoverageKey(value: unknown) {
  return String(value || '')
    .normalize('NFKD')
    .toLocaleLowerCase('en-IN')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanText(value: unknown, max = 160) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function positiveNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function recipeName(recipe: Record<string, unknown>) {
  return cleanText(recipe.name || recipe.dishName);
}

function recipeAliases(recipe: Record<string, unknown>) {
  return Array.isArray(recipe.aliases)
    ? recipe.aliases.map((value) => cleanText(value)).filter(Boolean)
    : [];
}

function recipeIngredients(recipe: Record<string, unknown>) {
  return Array.isArray(recipe.ingredients)
    ? recipe.ingredients
    : [];
}

function ingredientIdentity(name: unknown, unit: unknown) {
  const normalizedName = normalizeRecipeCoverageKey(name);
  const normalizedUnit = normalizeRecipeCoverageKey(unit);

  if (!normalizedName) return '';

  return normalizedUnit
    ? `${normalizedName}::${normalizedUnit}`
    : normalizedName;
}

function buildRateMaps(rates: unknown[]) {
  const byId = new Map<string, number>();
  const byIdentity = new Map<string, number>();

  for (const value of rates) {
    const row = asRecord(value);
    if (!row) continue;

    const rate = positiveNumber(row.rate ?? row.marketRate);
    const id = cleanText(row.id || row.rateKey, 200);
    const name = cleanText(row.name || row.ingredientName);
    const unit = cleanText(row.unit || row.rateUnit, 40);

    if (id) {
      byId.set(id, rate);
    }

    const identity = ingredientIdentity(name, unit);
    if (identity) {
      byIdentity.set(identity, rate);
    }

    const nameOnly = normalizeRecipeCoverageKey(name);
    if (nameOnly && !byIdentity.has(nameOnly)) {
      byIdentity.set(nameOnly, rate);
    }
  }

  return { byId, byIdentity };
}

function effectiveIngredientRate(
  ingredient: Record<string, unknown>,
  rateMaps: ReturnType<typeof buildRateMaps>,
) {
  const rateKey = cleanText(ingredient.rateKey, 200);

  if (rateKey && rateMaps.byId.has(rateKey)) {
    return rateMaps.byId.get(rateKey) || 0;
  }

  const name = cleanText(
    ingredient.name || ingredient.ingredientName,
  );
  const rateUnit = cleanText(
    ingredient.rateUnit || ingredient.unit,
    40,
  );
  const identity = ingredientIdentity(name, rateUnit);

  if (identity && rateMaps.byIdentity.has(identity)) {
    return rateMaps.byIdentity.get(identity) || 0;
  }

  const nameOnly = normalizeRecipeCoverageKey(name);
  if (nameOnly && rateMaps.byIdentity.has(nameOnly)) {
    return rateMaps.byIdentity.get(nameOnly) || 0;
  }

  return positiveNumber(
    ingredient.marketRate ?? ingredient.rate,
  );
}

function extractMenuNames(snapshot: unknown) {
  const root = asRecord(snapshot);
  if (!root) return [];

  const possibleMenus = [
    root.menu,
    asRecord(root.work)?.menu,
    asRecord(root.workData)?.menu,
    asRecord(root.snapshot)?.menu,
  ];

  const menu = possibleMenus.find(Array.isArray);

  if (!Array.isArray(menu)) return [];

  return menu.flatMap((value) => {
    const item = asRecord(value);
    const name = cleanText(item?.name);
    return name ? [name] : [];
  });
}

function buildUsageMap(
  dishes: RecipeCoverageDish[],
  snapshots: unknown[],
) {
  const dishByKey = new Map<string, string>();

  for (const dish of dishes) {
    const canonicalKey = normalizeRecipeCoverageKey(dish.name);
    if (canonicalKey) dishByKey.set(canonicalKey, dish.name);

    if (Array.isArray(dish.aliases)) {
      dish.aliases.forEach((alias) => {
        const aliasKey = normalizeRecipeCoverageKey(alias);
        if (aliasKey && !dishByKey.has(aliasKey)) {
          dishByKey.set(aliasKey, dish.name);
        }
      });
    }
  }

  const usage = new Map<string, number>();

  for (const snapshot of snapshots) {
    for (const menuName of extractMenuNames(snapshot)) {
      const key = normalizeRecipeCoverageKey(menuName);
      const canonical = dishByKey.get(key) || menuName;
      const canonicalKey = normalizeRecipeCoverageKey(canonical);

      if (!canonicalKey) continue;

      usage.set(
        canonicalKey,
        (usage.get(canonicalKey) || 0) + 1,
      );
    }
  }

  return usage;
}

function statusWeight(status: RecipeCoverageStatus) {
  if (status === 'MISSING_RECIPE') return 300;
  if (status === 'MISSING_RATE') return 240;
  if (status === 'INCOMPLETE') return 220;
  return 0;
}

export function buildRecipeCoverage(input: CoverageInput) {
  const recipes = input.recipes
    .map(asRecord)
    .filter((row): row is Record<string, unknown> => Boolean(row));

  const recipeByKey = new Map<string, Record<string, unknown>>();

  recipes.forEach((recipe) => {
    const name = recipeName(recipe);
    const keys = [
      name,
      ...recipeAliases(recipe),
    ]
      .map(normalizeRecipeCoverageKey)
      .filter(Boolean);

    keys.forEach((key) => {
      if (!recipeByKey.has(key)) {
        recipeByKey.set(key, recipe);
      }
    });
  });

  const rateMaps = buildRateMaps(input.rates);
  const usageMap = buildUsageMap(
    input.dishes,
    input.completedSnapshots || [],
  );

  const items: RecipeCoverageItem[] = input.dishes.map((dish) => {
    const dishKey = normalizeRecipeCoverageKey(dish.name);
    const aliases = Array.isArray(dish.aliases)
      ? dish.aliases
          .map(normalizeRecipeCoverageKey)
          .filter(Boolean)
      : [];

    const recipe =
      recipeByKey.get(dishKey) ||
      aliases
        .map((alias) => recipeByKey.get(alias))
        .find(Boolean) ||
      null;

    const dishRate = Math.max(0, Number(dish.rate) || 0);
    const issues: string[] = [];

    if (!recipe) {
      const status: RecipeCoverageStatus = 'MISSING_RECIPE';
      const fallbackOnly = dishRate > 0;
      const usageCount = usageMap.get(dishKey) || 0;

      return {
        name: dish.name,
        category: cleanText(dish.category, 60) || 'Other',
        subcategory: cleanText(dish.subcategory, 60),
        dishRate,
        recipeName: '',
        status,
        ingredientCount: 0,
        missingRateCount: 0,
        issues: ['Recipe not found'],
        fallbackOnly,
        usageCount,
        priorityScore:
          statusWeight(status) +
          Math.min(usageCount, 1000) * 20,
      };
    }

    const ingredients = recipeIngredients(recipe);
    const baseGuests = positiveNumber(recipe.baseGuests) || 0;

    if (!(baseGuests > 0)) {
      issues.push('Base guests missing');
    }

    if (!ingredients.length) {
      issues.push('No ingredients');
    }

    let invalidIngredientCount = 0;
    let missingRateCount = 0;

    ingredients.forEach((value) => {
      const ingredient = asRecord(value);

      if (!ingredient) {
        invalidIngredientCount += 1;
        return;
      }

      const name = cleanText(
        ingredient.name || ingredient.ingredientName,
      );
      const quantity = positiveNumber(
        ingredient.quantity ?? ingredient.qty,
      );
      const unit = cleanText(
        ingredient.unit || ingredient.rateUnit,
        40,
      );

      if (!name || !(quantity > 0) || !unit) {
        invalidIngredientCount += 1;
        return;
      }

      if (!(effectiveIngredientRate(ingredient, rateMaps) > 0)) {
        missingRateCount += 1;
      }
    });

    if (invalidIngredientCount > 0) {
      issues.push(
        `${invalidIngredientCount} incomplete ingredient${invalidIngredientCount === 1 ? '' : 's'}`,
      );
    }

    if (missingRateCount > 0) {
      issues.push(
        `${missingRateCount} ingredient rate${missingRateCount === 1 ? '' : 's'} missing`,
      );
    }

    let status: RecipeCoverageStatus;

    if (
      !ingredients.length ||
      !(baseGuests > 0) ||
      invalidIngredientCount > 0
    ) {
      status = 'INCOMPLETE';
    } else if (missingRateCount > 0) {
      status = 'MISSING_RATE';
    } else {
      status = 'READY';
    }

    const usageCount = usageMap.get(dishKey) || 0;
    const fallbackOnly = status !== 'READY' && dishRate > 0;

    return {
      name: dish.name,
      category: cleanText(dish.category, 60) || 'Other',
      subcategory: cleanText(dish.subcategory, 60),
      dishRate,
      recipeName: recipeName(recipe),
      status,
      ingredientCount: ingredients.length,
      missingRateCount,
      issues,
      fallbackOnly,
      usageCount,
      priorityScore:
        statusWeight(status) +
        Math.min(usageCount, 1000) * 20 +
        missingRateCount * 4 +
        invalidIngredientCount * 6,
    };
  });

  const summary: RecipeCoverageSummary = {
    total: items.length,
    ready: items.filter((item) => item.status === 'READY').length,
    missingRecipe: items.filter(
      (item) => item.status === 'MISSING_RECIPE',
    ).length,
    missingRate: items.filter(
      (item) => item.status === 'MISSING_RATE',
    ).length,
    incomplete: items.filter(
      (item) => item.status === 'INCOMPLETE',
    ).length,
    fallbackOnly: items.filter((item) => item.fallbackOnly).length,
    coveragePercent: items.length
      ? Math.round(
          (items.filter((item) => item.status === 'READY').length /
            items.length) *
            1000,
        ) / 10
      : 0,
  };

  return {
    summary,
    items,
  };
}
