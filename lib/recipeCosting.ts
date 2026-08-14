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

export const RECIPE_WASTAGE_RATE = 0.08;
export const RECIPE_WASTAGE_PERCENT = 8;

function roundRecipeMoney(
  value: number,
) {
  return Math.round(
    Math.max(
      0,
      Number(value) || 0,
    ) * 100,
  ) / 100;
}

export function applyRecipeWastage(
  rawCostPerPlate: number,
) {
  const raw =
    roundRecipeMoney(
      rawCostPerPlate,
    );

  return roundRecipeMoney(
    raw *
      (
        1 +
        RECIPE_WASTAGE_RATE
      ),
  );
}

export function recipeCostSummary(
  rawCostPerPlate: number,
  baseGuests: number,
) {
  const guests =
    Math.max(
      1,
      Number(baseGuests) || 1,
    );

  const raw =
    roundRecipeMoney(
      rawCostPerPlate,
    );

  const finalPerPlate =
    applyRecipeWastage(
      raw,
    );

  const wastagePerPlate =
    roundRecipeMoney(
      finalPerPlate - raw,
    );

  return {
    rawCostPerPlate:
      raw,

    wastagePercent:
      RECIPE_WASTAGE_PERCENT,

    wastagePerPlate,

    costPerPlate:
      finalPerPlate,

    rawTotal:
      roundRecipeMoney(
        raw * guests,
      ),

    wastageTotal:
      roundRecipeMoney(
        wastagePerPlate *
          guests,
      ),

    totalCost:
      roundRecipeMoney(
        finalPerPlate *
          guests,
      ),
  };
}

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


export type RecipeQualityStatus =
  | 'READY'
  | 'REVIEW'
  | 'BLOCKED';

export type RecipeQualityIssue = {
  severity:
    | 'warning'
    | 'error';
  code: string;
  message: string;
  ingredient?: string;
};

export type RecipeQualityResult = {
  status: RecipeQualityStatus;
  score: number;
  ingredientCount: number;
  trustedRateCount: number;
  rateCoveragePercent: number;
  estimatedRates: number;
  missingRates: number;
  warningCount: number;
  errorCount: number;
  issues: RecipeQualityIssue[];
};

export function assessRecipeQuality(
  recipe:
    | CostableRecipe
    | null
    | undefined,
  options: {
    missingRates?: number;
    estimatedRates?: number;
    costPerPlate?: number;
  } = {},
): RecipeQualityResult {
  const issues:
    RecipeQualityIssue[] = [];

  if (!recipe) {
    return {
      status: 'BLOCKED',
      score: 0,
      ingredientCount: 0,
      trustedRateCount: 0,
      rateCoveragePercent: 0,
      estimatedRates: 0,
      missingRates: 0,
      warningCount: 0,
      errorCount: 1,
      issues: [
        {
          severity: 'error',
          code: 'NO_RECIPE',
          message:
            'No usable recipe is available.',
        },
      ],
    };
  }

  let score = 100;

  const ingredientCount =
    recipe.ingredients.length;

  const missingRates =
    Math.max(
      0,
      Math.round(
        Number(
          options.missingRates,
        ) || 0,
      ),
    );

  const estimatedRates =
    Math.max(
      0,
      Math.round(
        Number(
          options.estimatedRates,
        ) || 0,
      ),
    );

  const costPerPlate =
    Math.max(
      0,
      Number(
        options.costPerPlate,
      ) || 0,
    );

  if (recipe.baseGuests !== 100) {
    score -= 6;

    issues.push({
      severity: 'warning',
      code: 'NON_STANDARD_BATCH',
      message:
        `Recipe batch is ${recipe.baseGuests} guests instead of the 100-pax standard.`,
    });
  }

  if (ingredientCount < 4) {
    score -= 25;

    issues.push({
      severity: 'error',
      code: 'TOO_FEW_INGREDIENTS',
      message:
        'Recipe has too few ingredients for reliable costing.',
    });
  }

  if (ingredientCount > 15) {
    score -= 8;

    issues.push({
      severity: 'warning',
      code: 'TOO_MANY_INGREDIENTS',
      message:
        'Recipe contains more than 15 costing ingredients and should be reviewed.',
    });
  }

  const supportedUnits =
    new Set([
      'kg',
      'gram',
      'ltr',
      'ml',
      'piece',
      'packet',
    ]);

  const seenIngredients =
    new Set<string>();

  recipe.ingredients.forEach(
    (ingredient) => {
      const normalizedName =
        normalizeRecipeName(
          ingredient.name,
        );

      if (
        seenIngredients.has(
          normalizedName,
        )
      ) {
        score -= 8;

        issues.push({
          severity: 'warning',
          code:
            'DUPLICATE_INGREDIENT',
          message:
            `${ingredient.name} appears more than once in the recipe.`,
          ingredient:
            ingredient.name,
        });
      }

      seenIngredients.add(
        normalizedName,
      );

      if (
        !supportedUnits.has(
          ingredient.unit,
        )
      ) {
        score -= 18;

        issues.push({
          severity: 'error',
          code:
            'UNSUPPORTED_UNIT',
          message:
            `${ingredient.name} uses unsupported unit "${ingredient.unit}".`,
          ingredient:
            ingredient.name,
        });
      }

      const quantity =
        Number(
          ingredient.quantity,
        ) || 0;

      if (!(quantity > 0)) {
        score -= 20;

        issues.push({
          severity: 'error',
          code:
            'INVALID_QUANTITY',
          message:
            `${ingredient.name} has an invalid quantity.`,
          ingredient:
            ingredient.name,
        });

        return;
      }

      const suspicious =
        (
          ingredient.unit ===
            'kg' &&
          quantity > 40
        ) ||
        (
          ingredient.unit ===
            'gram' &&
          quantity > 40000
        ) ||
        (
          ingredient.unit ===
            'ltr' &&
          quantity > 40
        ) ||
        (
          ingredient.unit ===
            'ml' &&
          quantity > 40000
        ) ||
        (
          ingredient.unit ===
            'piece' &&
          quantity > 1000
        ) ||
        (
          ingredient.unit ===
            'packet' &&
          quantity > 500
        );

      if (suspicious) {
        score -= 6;

        issues.push({
          severity: 'warning',
          code:
            'HIGH_QUANTITY',
          message:
            `${ingredient.name} quantity ${quantity} ${ingredient.unit} looks unusually high for 100 guests.`,
          ingredient:
            ingredient.name,
        });
      }
    },
  );

  if (missingRates > 0) {
    score -= Math.min(
      40,
      missingRates * 12,
    );

    issues.push({
      severity: 'error',
      code: 'MISSING_RATES',
      message:
        `${missingRates} ingredient rate${missingRates === 1 ? ' is' : 's are'} missing.`,
    });
  }

  if (estimatedRates > 0) {
    score -= Math.min(
      25,
      estimatedRates * 5,
    );

    issues.push({
      severity: 'warning',
      code: 'ESTIMATED_RATES',
      message:
        `${estimatedRates} ingredient rate${estimatedRates === 1 ? ' is' : 's are'} estimated instead of coming from Ingredient Master.`,
    });
  }

  if (!(costPerPlate > 0)) {
    score -= 35;

    issues.push({
      severity: 'error',
      code: 'ZERO_COST',
      message:
        'Calculated dish cost is zero.',
    });
  } else if (costPerPlate < 2) {
    score -= 10;

    issues.push({
      severity: 'warning',
      code: 'VERY_LOW_COST',
      message:
        `₹${costPerPlate.toFixed(2)} per plate looks unusually low.`,
    });
  } else if (costPerPlate > 300) {
    score -= 10;

    issues.push({
      severity: 'warning',
      code: 'VERY_HIGH_COST',
      message:
        `₹${costPerPlate.toFixed(2)} per plate looks unusually high and should be checked.`,
    });
  }

  score =
    Math.max(
      0,
      Math.min(
        100,
        Math.round(score),
      ),
    );

  const errorCount =
    issues.filter(
      (issue) =>
        issue.severity ===
        'error',
    ).length;

  const warningCount =
    issues.filter(
      (issue) =>
        issue.severity ===
        'warning',
    ).length;

  const trustedRateCount =
    Math.max(
      0,
      ingredientCount -
        missingRates -
        estimatedRates,
    );

  const rateCoveragePercent =
    ingredientCount
      ? Math.round(
          trustedRateCount /
            ingredientCount *
            100,
        )
      : 0;

  const status:
    RecipeQualityStatus =
      errorCount > 0
        ? 'BLOCKED'
        : warningCount > 0 ||
            score < 90
          ? 'REVIEW'
          : 'READY';

  return {
    status,
    score,
    ingredientCount,
    trustedRateCount,
    rateCoveragePercent,
    estimatedRates,
    missingRates,
    warningCount,
    errorCount,
    issues,
  };
}
