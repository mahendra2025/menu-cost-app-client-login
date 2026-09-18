export type IngredientRateHealthStatus =
  | 'MISSING_RATE'
  | 'STALE'
  | 'HEALTHY'
  | 'RECENT';

export type IngredientRateHealthItem = {
  id: string;
  name: string;
  category: string;
  unit: string;
  rate: number;
  updatedAt: string | null;
  daysOld: number | null;
  status: IngredientRateHealthStatus;
  recipeCount: number;
  affectedRecipes: string[];
  freshnessKnown: boolean;
  priorityScore: number;
};

export type IngredientRateHealthSummary = {
  total: number;
  ready: number;
  missingRate: number;
  stale: number;
  recent: number;
  healthy: number;
  linked: number;
  rateCoveragePercent: number;
  freshCoveragePercent: number;
};

type HealthInput = {
  rates: unknown[];
  recipes: unknown[];
  now?: Date;
  staleAfterDays?: number;
  recentWithinDays?: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function cleanText(value: unknown, max = 160) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function validDate(value: unknown) {
  const text = cleanText(value, 80);
  if (!text) return null;

  const date = new Date(text);
  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function positiveRate(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0
    ? number
    : 0;
}

function normalizedKey(value: unknown) {
  return cleanText(value, 220)
    .toLocaleLowerCase('en-IN');
}

function recipeName(recipe: Record<string, unknown>, index: number) {
  return (
    cleanText(
      recipe.name ||
        recipe.dishName,
    ) ||
    `Recipe ${index + 1}`
  );
}

function buildUsage(recipes: unknown[]) {
  const usage = new Map<string, Set<string>>();

  recipes.forEach((value, recipeIndex) => {
    const recipe = asRecord(value);
    if (!recipe || !Array.isArray(recipe.ingredients)) {
      return;
    }

    const name = recipeName(recipe, recipeIndex);

    recipe.ingredients.forEach((ingredientValue) => {
      const ingredient = asRecord(ingredientValue);
      if (!ingredient) return;

      const rateKey = cleanText(ingredient.rateKey, 220);
      if (!rateKey) return;

      const key = normalizedKey(rateKey);
      const names = usage.get(key) || new Set<string>();
      names.add(name);
      usage.set(key, names);
    });
  });

  return usage;
}

function ageInDays(updatedAt: Date | null, now: Date) {
  if (!updatedAt) return null;

  return Math.max(
    0,
    Math.floor(
      (now.getTime() - updatedAt.getTime()) /
        86_400_000,
    ),
  );
}

function healthStatus(
  rate: number,
  daysOld: number | null,
  staleAfterDays: number,
  recentWithinDays: number,
): IngredientRateHealthStatus {
  if (!(rate > 0)) return 'MISSING_RATE';

  if (daysOld === null || daysOld > staleAfterDays) {
    return 'STALE';
  }

  if (daysOld <= recentWithinDays) {
    return 'RECENT';
  }

  return 'HEALTHY';
}

function statusPriority(status: IngredientRateHealthStatus) {
  if (status === 'MISSING_RATE') return 500;
  if (status === 'STALE') return 320;
  if (status === 'HEALTHY') return 80;
  return 0;
}

export function buildIngredientRateHealth(input: HealthInput) {
  const now = input.now || new Date();
  const staleAfterDays = Math.max(
    1,
    Math.round(input.staleAfterDays || 60),
  );
  const recentWithinDays = Math.max(
    0,
    Math.min(
      staleAfterDays,
      Math.round(input.recentWithinDays || 30),
    ),
  );

  const usage = buildUsage(input.recipes);

  const items: IngredientRateHealthItem[] = input.rates
    .map(asRecord)
    .filter(
      (row): row is Record<string, unknown> =>
        Boolean(row),
    )
    .flatMap((row) => {
      const id = cleanText(row.id, 220);
      const name = cleanText(row.name);
      const unit = cleanText(row.unit, 40);

      if (!id || !name || !unit) return [];

      const category =
        cleanText(row.category, 60) ||
        'Other';
      const rate = positiveRate(row.rate);
      const updatedDate = validDate(row.updatedAt);
      const daysOld = ageInDays(updatedDate, now);
      const status = healthStatus(
        rate,
        daysOld,
        staleAfterDays,
        recentWithinDays,
      );
      const affectedRecipes = Array.from(
        usage.get(normalizedKey(id)) ||
          new Set<string>(),
      ).sort((left, right) =>
        left.localeCompare(right),
      );
      const recipeCount = affectedRecipes.length;

      return [{
        id,
        name,
        category,
        unit,
        rate,
        updatedAt:
          updatedDate?.toISOString() ||
          null,
        daysOld,
        status,
        recipeCount,
        affectedRecipes,
        freshnessKnown:
          Boolean(updatedDate),
        priorityScore:
          statusPriority(status) +
          Math.min(recipeCount, 1000) * 25 +
          (
            status === 'STALE' &&
            daysOld !== null
              ? Math.min(daysOld, 365)
              : 0
          ),
      }];
    });

  const summary: IngredientRateHealthSummary = {
    total: items.length,
    ready:
      items.filter((item) => item.rate > 0).length,
    missingRate:
      items.filter(
        (item) => item.status === 'MISSING_RATE',
      ).length,
    stale:
      items.filter(
        (item) => item.status === 'STALE',
      ).length,
    recent:
      items.filter(
        (item) => item.status === 'RECENT',
      ).length,
    healthy:
      items.filter(
        (item) => item.status === 'HEALTHY',
      ).length,
    linked:
      items.filter(
        (item) => item.recipeCount > 0,
      ).length,
    rateCoveragePercent:
      items.length
        ? Math.round(
            (
              items.filter(
                (item) => item.rate > 0,
              ).length /
              items.length
            ) * 1000,
          ) / 10
        : 0,
    freshCoveragePercent:
      items.length
        ? Math.round(
            (
              items.filter(
                (item) =>
                  item.status === 'RECENT' ||
                  item.status === 'HEALTHY',
              ).length /
              items.length
            ) * 1000,
          ) / 10
        : 0,
  };

  return {
    summary,
    items,
    thresholds: {
      staleAfterDays,
      recentWithinDays,
    },
  };
}
