import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

import defaultRecipesData from '../../../../lib/defaultRecipes.json';
import { requireClientTenantId } from '../../../../lib/billingAuth';
import { normalizeIngredientRate } from '../../../../lib/ingredientCatalog';
import {
  normalizeCityKey,
  normalizeCityName,
} from '../../../../lib/cityIngredientRates';

import {
  assessCostAccuracy,
  type CostBaselineSource,
} from '../../../../lib/costAccuracy';

import {
  DISH_COST_ITEMS,
} from '../../../../lib/dishCostMaster';

import {
  buildIngredientCostDrivers,
} from '../../../../lib/ingredientCostDrivers';

import { prisma } from '../../../../lib/prisma';
import {
  assessRecipeQuality,
  buildRecipeMap,
  calculateRecipeCost,
  fillRecipeIngredientRates,
  normalizeRecipeName,
  readCostableRecipe,
  type CostableRecipe,
} from '../../../../lib/recipeCosting';
import {
  requestStructuredAi,
  structuredAiProvider,
} from '../../../../lib/structuredAi';

/*
 * Permanent large-menu costing limits.
 *
 * A wedding menu may contain hundreds of dishes.
 * Never silently ignore dishes after item 80.
 */
const MAX_REQUEST_DISHES = 300;

/*
 * Generate recipes in small groups.
 * This gives structured AI much better reliability
 * than asking it for 100+ recipes in one response.
 */
const AI_GENERATION_BATCH_SIZE = 12;
const AI_GENERATION_CONCURRENCY = 2;

const WASTAGE_RATE = 0.08;

function withWastage(costPerPlate: number) {
  return Math.round(
    costPerPlate * (1 + WASTAGE_RATE) * 100,
  ) / 100;
}

type RequestedDish = {
  name: string;
  category: string;
};

function cleanDish(value: unknown): RequestedDish | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const name = String(row.name || '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
  if (!name) return null;

  return {
    name,
    category: String(row.category || 'Other').trim().slice(0, 60) || 'Other',
  };
}

async function generateRecipes(
  dishes: RequestedDish[],
  availableIngredients: Array<{ name: string; unit: string }>,
) {
  if (!structuredAiProvider() || !dishes.length) return [];

  const schema: Record<string, unknown> = {
    type: 'object',
    additionalProperties: false,
    required: ['recipes'],
    properties: {
      recipes: {
        type: 'array',
        maxItems: AI_GENERATION_BATCH_SIZE,
        items: {
          type: 'object',
          additionalProperties: false,
          required: [
            'requestedName',
            'name',
            'baseGuests',
            'ingredients',
          ],
          properties: {
            requestedName: {
              type: 'string',
            },
            name: {
              type: 'string',
            },
            baseGuests: { type: 'integer', const: 100 },
            ingredients: {
              type: 'array',
              minItems: 1,
              maxItems: 15,
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['name', 'quantity', 'unit'],
                properties: {
                  name: { type: 'string' },
                  quantity: { type: 'number', exclusiveMinimum: 0 },
                  unit: {
                    type: 'string',
                    enum: ['kg', 'gram', 'ltr', 'ml', 'piece', 'packet'],
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  try {
    const raw = await requestStructuredAi({
      schemaName: 'generated_catering_recipes',
      schema,
      maxOutputTokens: Math.min(6_000, Math.max(450, dishes.length * 420)),
      instructions: [
        'Create practical Indian catering production recipes for exactly 100 guests.',
        'Return one recipe for every requested dish and do not add extra dishes.',
        'Return recipes in exactly the same order as the requested dishes.',
        'Copy the original requested dish name exactly into requestedName. Never translate, correct, shorten, normalize, or rename requestedName.',
        'Prefer ingredient names and purchase units from the supplied ingredient catalog.',
        'If an essential ingredient is missing from the catalog, include its standard market name and the most appropriate supported purchase unit.',
        'Quantities must be realistic production quantities, not per-person quantities.',
        'Use kg, gram, ltr, ml, piece, or packet exactly as supplied.',
        'This is an editable costing estimate. Return 6 to 12 material cost drivers per dish, never minor garnishes or optional ingredients.',
      ].join('\n'),
      input: JSON.stringify({ dishes, availableIngredients }),
    });

    const parsed =
      JSON.parse(raw) as {
        recipes?: unknown[];
      };

    const requestedByName =
      new Map(
        dishes.map(
          (dish) => [
            normalizeRecipeName(
              dish.name,
            ),
            dish,
          ],
        ),
      );

    return (
      parsed.recipes ?? []
    )
      .map(
        (
          value,
          index,
        ) => {
          if (
            !value ||
            typeof value !== 'object' ||
            Array.isArray(value)
          ) {
            return null;
          }

          const row =
            value as Record<
              string,
              unknown
            >;

          const returnedRequestedName =
            String(
              row.requestedName ||
              row.name ||
              '',
            )
              .replace(/\s+/g, ' ')
              .trim();

          /*
           * Prefer requestedName.
           *
           * If AI changed spelling anyway,
           * fall back to the original input
           * at the same array position.
           */
          const requested =
            requestedByName.get(
              normalizeRecipeName(
                returnedRequestedName,
              ),
            ) ||
            dishes[index];

          if (!requested) {
            return null;
          }

          return readCostableRecipe({
            ...row,

            /*
             * Store the generated recipe under
             * the exact original menu dish.
             */
            name:
              requested.name,
          });
        },
      )
      .filter(
        (
          item,
        ): item is CostableRecipe =>
          Boolean(item),
      );
  } catch (error) {
    console.error('Automatic recipe generation failed:', error);
    return [];
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = await requireClientTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'Client login required' }, { status: 401 });
    }

    const body = await request.json() as Record<string, unknown>;
    const requestedCity =
      normalizeCityName(
        body.city,
      );

    const unique = new Map<string, RequestedDish>();
    (
      Array.isArray(body.dishes)
        ? body.dishes.slice(
            0,
            MAX_REQUEST_DISHES,
          )
        : []
    )
      .map(cleanDish)
      .forEach((dish) => {
        if (!dish) return;
        const key = normalizeRecipeName(dish.name);
        if (key) unique.set(key, dish);
      });

    if (!unique.size) {
      return NextResponse.json({ results: [], generated: 0 });
    }

    const [
      catalog,
      overrides,
      savedRecipes,
      masterDishes,
      tenant,
    ] = await Promise.all([
      prisma.recipeCatalog.findUnique({
        where: { id: 'global' },
        select: { dishes: true, rates: true },
      }),

      prisma.tenantIngredientRate.findMany({
        where: { tenantId },
        select: { ingredientId: true, rate: true },
      }),

      prisma.tenantAutoRecipe.findMany({
        where: { tenantId },
      }),

      prisma.dishMasterItem.findMany({
        select: {
          name: true,
          rate: true,
        },
      }),

      prisma.tenant.findUnique({
        where: {
          id: tenantId,
        },
        select: {
          city: true,
        },
      }),
    ]);

    const effectiveCity =
      requestedCity ||
      normalizeCityName(
        tenant?.city,
      );

    const cityKey =
      normalizeCityKey(
        effectiveCity,
      );

    const cityRates =
      cityKey
        ? await prisma.ingredientCityRate.findMany({
            where: {
              cityKey,
            },
            select: {
              ingredientId: true,
              rate: true,
            },
          })
        : [];

    let tenantDishMaster:
      Array<{
        normalizedName: string;
        rate: number;
      }> = [];

    try {
      tenantDishMaster =
        await prisma
          .tenantDishMasterItem
          .findMany({
            where: {
              tenantId,
            },
            select: {
              normalizedName: true,
              rate: true,
            },
          });
    } catch (privateCatalogError) {
      /*
       * Private saved rates are an optional override.
       * Global/recipe costing must continue to work if
       * an additive migration has not reached production.
       */
      console.warn(
        'Tenant Dish Master unavailable during auto costing; continuing without private overrides:',
        privateCatalogError,
      );
    }

    const previousTenantCostMap =
      new Map(
        savedRecipes.map(
          (saved) => [
            saved.normalizedName,
            Math.max(
              0,
              Number(
                saved.costPerPlate,
              ) || 0,
            ),
          ],
        ),
      );

    const previousSavedRecipeMap =
      new Map(
        savedRecipes.flatMap(
          (saved) => {
            const recipe =
              readCostableRecipe({
                name:
                  saved.name,

                baseGuests:
                  saved.baseGuests,

                ingredients:
                  saved.ingredients,
              });

            return recipe
              ? [[
                  saved.normalizedName,
                  recipe,
                ] as const]
              : [];
          },
        ),
      );

    const tenantDishRateMap =
      new Map(
        tenantDishMaster.map(
          (dish) => [
            dish.normalizedName,
            Math.max(
              0,
              Number(
                dish.rate,
              ) || 0,
            ),
          ],
        ),
      );

    const dishMasterCostMap =
      new Map(
        masterDishes.map(
          (dish) => [
            normalizeRecipeName(
              dish.name,
            ),
            Math.max(
              0,
              Number(
                dish.rate,
              ) || 0,
            ),
          ],
        ),
      );

    const builtInCostMap =
      new Map(
        DISH_COST_ITEMS.map(
          (dish) => [
            normalizeRecipeName(
              dish.name,
            ),
            Math.max(
              0,
              Number(
                dish.rate,
              ) || 0,
            ),
          ],
        ),
      );

    const masterRates = Array.isArray(catalog?.rates) ? catalog.rates : [];
    const overrideMap = new Map(
      overrides.map((item) => [item.ingredientId, item.rate]),
    );
    const cityRateMap =
      new Map(
        cityRates.map(
          (item) => [
            item.ingredientId,
            item.rate,
          ],
        ),
      );
    const effectiveRateMap =
      new Map<string, number>();
    const effectiveRateSourceMap =
      new Map<string, string>();

    for (const rate of masterRates
      .map(normalizeIngredientRate)
      .filter(
        (
          item,
        ): item is NonNullable<
          typeof item
        > => Boolean(item),
      )) {
      const businessRate =
        overrideMap.get(
          rate.id,
        );

      if (
        Number(
          businessRate,
        ) > 0
      ) {
        effectiveRateMap.set(
          rate.id,
          Number(
            businessRate,
          ),
        );
        effectiveRateSourceMap.set(
          rate.id,
          'business',
        );
        continue;
      }

      const cityRate =
        cityRateMap.get(
          rate.id,
        );

      if (
        Number(
          cityRate,
        ) > 0
      ) {
        effectiveRateMap.set(
          rate.id,
          Number(
            cityRate,
          ),
        );
        effectiveRateSourceMap.set(
          rate.id,
          effectiveCity
            ? `${effectiveCity} city`
            : 'city',
        );
      }
    }
    const catalogMap = buildRecipeMap([
      ...(Array.isArray(defaultRecipesData) ? defaultRecipesData : []),
      ...(Array.isArray(catalog?.dishes) ? catalog.dishes : []),
    ]);
    const historicalRecipes = [
      ...(Array.isArray(defaultRecipesData) ? defaultRecipesData : []),
      ...(Array.isArray(catalog?.dishes) ? catalog.dishes : []),
    ];
    const savedMap = new Map(
      savedRecipes.flatMap((saved) => {
        const recipe = readCostableRecipe({
          name: saved.name,
          baseGuests: saved.baseGuests,
          ingredients: saved.ingredients,
        });
        return recipe ? [[saved.normalizedName, recipe] as const] : [];
      }),
    );

    const missing = Array.from(unique.entries())
      .filter(
        ([key]) =>
          !tenantDishRateMap.has(key) &&
          !catalogMap.has(key) &&
          !savedMap.has(key),
      )
      .map(([, dish]) => dish);
    const ingredientCatalog = masterRates
      .map(normalizeIngredientRate)
      .filter((rate): rate is NonNullable<typeof rate> => Boolean(rate))
      .filter((rate) => (effectiveRateMap.get(rate.id) ?? rate.rate) > 0)
      .slice(0, 120)
      .map((rate) => ({ name: rate.name, unit: rate.unit }));
    /*
     * Process every missing dish.
     *
     * Example:
     * 152 new dishes
     * -> 13 small AI batches
     * -> two batches processed together.
     */
    const generationBatches =
      Array.from(
        {
          length:
            Math.ceil(
              missing.length /
              AI_GENERATION_BATCH_SIZE,
            ),
        },
        (_, index) =>
          missing.slice(
            index *
              AI_GENERATION_BATCH_SIZE,

            (
              index + 1
            ) *
              AI_GENERATION_BATCH_SIZE,
          ),
      );

    const generated:
      CostableRecipe[] = [];

    for (
      let batchIndex = 0;
      batchIndex <
        generationBatches.length;
      batchIndex +=
        AI_GENERATION_CONCURRENCY
    ) {
      const wave =
        generationBatches.slice(
          batchIndex,
          batchIndex +
            AI_GENERATION_CONCURRENCY,
        );

      const waveResults =
        await Promise.all(
          wave.map(
            (batch) =>
              generateRecipes(
                batch,
                ingredientCatalog,
              ),
          ),
        );

      generated.push(
        ...waveResults.flat(),
      );
    }

    for (const recipe of generated) {
      const key = normalizeRecipeName(recipe.name);
      const requested = unique.get(key);
      if (!requested) continue;
      const priced = fillRecipeIngredientRates(
        recipe,
        masterRates,
        historicalRecipes,
        effectiveRateMap,
        effectiveRateSourceMap,
      );
      const costing = calculateRecipeCost(
        priced.recipe,
        masterRates,
        effectiveRateMap,
      );
      await prisma.tenantAutoRecipe.upsert({
        where: { tenantId_normalizedName: { tenantId, normalizedName: key } },
        create: {
          tenantId,
          normalizedName: key,
          name: requested.name,
          category: requested.category,
          baseGuests: priced.recipe.baseGuests,
          ingredients: priced.recipe.ingredients as Prisma.InputJsonValue,
          costPerPlate: withWastage(costing.costPerPlate),
        },
        update: {
          name: requested.name,
          category: requested.category,
          baseGuests: priced.recipe.baseGuests,
          ingredients: priced.recipe.ingredients as Prisma.InputJsonValue,
          costPerPlate: withWastage(costing.costPerPlate),
        },
      });
      savedMap.set(key, { ...priced.recipe, name: requested.name });
    }

    const results = Array.from(unique.entries()).map(([key, dish]) => {
      const catalogRecipe = catalogMap.get(key);
      const storedRecipe = catalogRecipe || savedMap.get(key);
      const priced = storedRecipe
        ? fillRecipeIngredientRates(
            storedRecipe,
            masterRates,
            historicalRecipes,
            effectiveRateMap,
            effectiveRateSourceMap,
          )
        : null;
      const recipe = priced?.recipe;
      const costing = recipe
        ? calculateRecipeCost(
            recipe,
            masterRates,
            effectiveRateMap,
          )
        : { costPerPlate: 0, missingRates: 0 };

      const previousTenantCost =
        previousTenantCostMap.get(
          key,
        ) || 0;

      const savedTenantRate =
        tenantDishRateMap.get(
          key,
        ) || 0;

      const finalCostPerPlate =
        savedTenantRate > 0
          ? savedTenantRate
          : withWastage(
              costing.costPerPlate,
            );

      const quality =
        savedTenantRate > 0
          ? {
              status:
                'READY' as const,
              score:
                100,
              ingredientCount:
                0,
              trustedRateCount:
                0,
              rateCoveragePercent:
                100,
              estimatedRates:
                0,
              missingRates:
                0,
              warningCount:
                0,
              errorCount:
                0,
              issues:
                [],
            }
          : assessRecipeQuality(
              recipe,
              {
                missingRates:
                  costing.missingRates,

                estimatedRates:
                  priced?.estimatedRates ||
                  0,

                costPerPlate:
                  finalCostPerPlate,
              },
            );

      const dishMasterCost =
        dishMasterCostMap.get(
          key,
        ) || 0;

      const builtInCost =
        builtInCostMap.get(
          key,
        ) || 0;

      let baselineCost = 0;

      let baselineSource:
        CostBaselineSource =
          'none';

      if (
        previousTenantCost > 0
      ) {
        baselineCost =
          previousTenantCost;

        baselineSource =
          'previous_tenant_recipe';
      } else if (
        dishMasterCost > 0
      ) {
        baselineCost =
          dishMasterCost;

        baselineSource =
          'dish_master';
      } else if (
        builtInCost > 0
      ) {
        baselineCost =
          builtInCost;

        baselineSource =
          'built_in_catalog';
      }

      const accuracy =
        assessCostAccuracy(
          finalCostPerPlate,
          baselineCost,
          baselineSource,
        );

      const costDrivers =
        savedTenantRate > 0
          ? []
          : recipe
          ? buildIngredientCostDrivers(
              recipe,
              previousSavedRecipeMap.get(
                key,
              ),
              {
                wastageRate:
                  WASTAGE_RATE,

                limit: 20,
              },
            )
          : [];

      return {
        requestedName: dish.name,
        matchedName: recipe?.name || dish.name,
        costPerPlate:
          finalCostPerPlate,
        rawCostPerPlate:
          savedTenantRate > 0
            ? savedTenantRate
            : costing.costPerPlate,
        wastagePercent:
          savedTenantRate > 0
            ? 0
            : 8,
        missingRates:
          costing.missingRates,
        quality,
        accuracy,
        costDrivers,
        estimatedIngredientRates:
          savedTenantRate > 0
            ? 0
            : priced?.estimatedRates || 0,
        recipeAvailable:
          savedTenantRate > 0
            ? false
            : Boolean(recipe),
        source:
          savedTenantRate > 0
            ? 'tenant_saved_rate'
            : catalogRecipe
              ? 'catalog_recipe'
              : recipe
                ? 'ai_recipe'
                : 'unresolved',
      };
    });

    return NextResponse.json({
      results,
      generated: generated.length,
      city:
        effectiveCity || '',
      ratePriority: [
        'BUSINESS',
        'CITY',
        'GLOBAL',
      ],
    });
  } catch (error) {
    console.error('Automatic recipe costing failed:', error);
    return NextResponse.json(
      { error: 'Automatic recipe costing is temporarily unavailable' },
      { status: 500 },
    );
  }
}
