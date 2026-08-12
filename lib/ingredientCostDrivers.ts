import {
  normalizeRecipeName,
  type CostableRecipe,
  type CostableRecipeIngredient,
} from './recipeCosting';

export type IngredientCostDriver = {
  name: string;

  quantity: number;
  unit: string;

  rate: number;
  rateUnit: string;
  rateSource: string;

  batchCost: number;

  rawCostPerPlate: number;
  finalCostPerPlate: number;

  contributionPercent: number;

  previousCostPerPlate: number;
  changePerPlate: number;
  changePercent: number;

  direction:
    | 'UP'
    | 'DOWN'
    | 'FLAT'
    | 'NEW';
};

function roundMoney(
  value: number,
) {
  return Math.round(
    value * 100,
  ) / 100;
}

function roundPercent(
  value: number,
) {
  return Math.round(
    value * 10,
  ) / 10;
}

function convertQuantity(
  quantity: number,
  unit: string,
  rateUnit: string,
) {
  if (unit === rateUnit) {
    return quantity;
  }

  if (
    unit === 'gram' &&
    rateUnit === 'kg'
  ) {
    return quantity / 1000;
  }

  if (
    unit === 'kg' &&
    rateUnit === 'gram'
  ) {
    return quantity * 1000;
  }

  if (
    unit === 'ml' &&
    rateUnit === 'ltr'
  ) {
    return quantity / 1000;
  }

  if (
    unit === 'ltr' &&
    rateUnit === 'ml'
  ) {
    return quantity * 1000;
  }

  return quantity;
}

function ingredientBatchCost(
  ingredient:
    CostableRecipeIngredient,
) {
  const rate =
    Math.max(
      0,
      Number(
        ingredient.rate,
      ) || 0,
    );

  if (!(rate > 0)) {
    return 0;
  }

  const quantity =
    convertQuantity(
      ingredient.quantity,
      ingredient.unit,
      ingredient.rateUnit ||
        ingredient.unit,
    );

  return quantity * rate;
}

export function buildIngredientCostDrivers(
  recipe:
    CostableRecipe,
  previousRecipe?:
    CostableRecipe | null,
  options: {
    wastageRate?: number;
    limit?: number;
  } = {},
): IngredientCostDriver[] {
  const wastageRate =
    Math.max(
      0,
      Number(
        options.wastageRate,
      ) || 0,
    );

  const limit =
    Math.max(
      1,
      Math.min(
        20,
        Math.round(
          Number(
            options.limit,
          ) || 6,
        ),
      ),
    );

  const guests =
    Math.max(
      1,
      recipe.baseGuests,
    );

  const previousGuests =
    Math.max(
      1,
      previousRecipe
        ?.baseGuests ||
        guests,
    );

  const previousMap =
    new Map(
      (
        previousRecipe
          ?.ingredients ||
        []
      ).map(
        (ingredient) => [
          normalizeRecipeName(
            ingredient.name,
          ),
          ingredient,
        ],
      ),
    );

  const currentBatchTotal =
    recipe.ingredients.reduce(
      (
        total,
        ingredient,
      ) =>
        total +
        ingredientBatchCost(
          ingredient,
        ),
      0,
    );

  return recipe.ingredients
    .map(
      (
        ingredient,
      ): IngredientCostDriver => {
        const batchCost =
          ingredientBatchCost(
            ingredient,
          );

        const rawCostPerPlate =
          batchCost /
          guests;

        const finalCostPerPlate =
          rawCostPerPlate *
          (1 + wastageRate);

        const previous =
          previousMap.get(
            normalizeRecipeName(
              ingredient.name,
            ),
          );

        const previousBatchCost =
          previous
            ? ingredientBatchCost(
                previous,
              )
            : 0;

        const previousCostPerPlate =
          previousBatchCost /
          previousGuests *
          (1 + wastageRate);

        const changePerPlate =
          finalCostPerPlate -
          previousCostPerPlate;

        const changePercent =
          previousCostPerPlate > 0
            ? (
                changePerPlate /
                previousCostPerPlate
              ) * 100
            : 0;

        const direction =
          previousCostPerPlate <= 0
            ? 'NEW'
            : changePerPlate > 0.01
              ? 'UP'
              : changePerPlate < -0.01
                ? 'DOWN'
                : 'FLAT';

        return {
          name:
            ingredient.name,

          quantity:
            ingredient.quantity,

          unit:
            ingredient.unit,

          rate:
            roundMoney(
              Number(
                ingredient.rate,
              ) || 0,
            ),

          rateUnit:
            ingredient.rateUnit ||
            ingredient.unit,

          rateSource:
            ingredient.rateSource ||
            'unknown',

          batchCost:
            roundMoney(
              batchCost,
            ),

          rawCostPerPlate:
            roundMoney(
              rawCostPerPlate,
            ),

          finalCostPerPlate:
            roundMoney(
              finalCostPerPlate,
            ),

          contributionPercent:
            currentBatchTotal > 0
              ? roundPercent(
                  batchCost /
                    currentBatchTotal *
                    100,
                )
              : 0,

          previousCostPerPlate:
            roundMoney(
              previousCostPerPlate,
            ),

          changePerPlate:
            roundMoney(
              changePerPlate,
            ),

          changePercent:
            roundPercent(
              changePercent,
            ),

          direction,
        };
      },
    )
    .filter(
      (driver) =>
        driver.batchCost > 0,
    )
    .sort(
      (left, right) =>
        right.finalCostPerPlate -
        left.finalCostPerPlate,
    )
    .slice(
      0,
      limit,
    );
}
