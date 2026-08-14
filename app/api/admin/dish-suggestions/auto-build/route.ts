import { Prisma } from '@prisma/client';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import defaultRecipesData from '../../../../../lib/defaultRecipes.json';
import {
  getAdminCookieName,
  isValidAdminSessionToken,
} from '../../../../../lib/adminAuth';
import {
  normalizeIngredientRate,
} from '../../../../../lib/ingredientCatalog';
import { prisma } from '../../../../../lib/prisma';
import {
  assessRecipeQuality,
  buildRecipeMap,
  calculateRecipeCost,
  fillRecipeIngredientRates,
  recipeCostSummary,
  normalizeRecipeName,
  readCostableRecipe,
  type CostableRecipe,
} from '../../../../../lib/recipeCosting';
import {
  requestStructuredAi,
  structuredAiProvider,
} from '../../../../../lib/structuredAi';
import {
  recipeServingStandard,
  servingStandardInstruction,
} from '../../../../../lib/recipeServingStandards';

function clean(
  value: unknown,
  max = 120,
) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

async function requireAdmin() {
  const cookieStore =
    await cookies();

  const token =
    cookieStore.get(
      getAdminCookieName(),
    )?.value;

  if (
    !isValidAdminSessionToken(
      token,
    )
  ) {
    return NextResponse.json(
      {
        error:
          'Admin login required',
      },
      {
        status: 401,
      },
    );
  }

  return null;
}

async function generateRecipe(
  name: string,
  category: string,
  availableIngredients:
    Array<{
      name: string;
      unit: string;
    }>,
) {
  if (!structuredAiProvider()) {
    return null;
  }

  const servingStandard =
    recipeServingStandard(
      category,
      name,
    );

  const servingInstruction =
    servingStandardInstruction(
      servingStandard,
    );

  const schema:
    Record<string, unknown> = {
    type: 'object',
    additionalProperties:
      false,

    required: [
      'recipe',
    ],

    properties: {
      recipe: {
        type: 'object',
        additionalProperties:
          false,

        required: [
          'name',
          'baseGuests',
          'ingredients',
        ],

        properties: {
          name: {
            type: 'string',
          },

          baseGuests: {
            type: 'integer',
            const: 100,
          },

          ingredients: {
            type: 'array',
            minItems: 4,
            maxItems: 15,

            items: {
              type: 'object',
              additionalProperties:
                false,

              required: [
                'name',
                'quantity',
                'unit',
              ],

              properties: {
                name: {
                  type: 'string',
                },

                quantity: {
                  type: 'number',
                  exclusiveMinimum: 0,
                },

                unit: {
                  type: 'string',

                  enum: [
                    'kg',
                    'gram',
                    'ltr',
                    'ml',
                    'piece',
                    'packet',
                  ],
                },
              },
            },
          },
        },
      },
    },
  };

  const raw =
    await requestStructuredAi({
      schemaName:
        'approved_dish_auto_recipe',

      schema,

      maxOutputTokens:
        1400,

      instructions: [
        'Create one practical Indian catering production recipe for exactly 100 guests.',
        'Return the requested dish only.',
        'Use realistic bulk catering quantities.',
        'Prefer supplied Ingredient Master names and units.',
        'Include the important material cost drivers.',
        'Use 6 to 12 ingredients when appropriate.',
        'Do not include optional garnish unless it materially affects cost.',
        'Use kg, gram, ltr, ml, piece, or packet only.',
        servingInstruction
          ? servingInstruction
          : 'Use realistic Indian catering production quantities for the dish and category.',
        'Size cost-driving ingredients consistently with the final serving target.',
        'Do not invent water or another zero-cost ingredient only to satisfy a serving-volume target.',
        'Do not apply wastage inside ingredient quantities; the costing system applies exactly 8% wastage separately.',
      ].join('\n'),

      input:
        JSON.stringify({
          dish: {
            name,
            category,
          },

          servingStandard,

          availableIngredients,
        }),
    });

  const parsed =
    JSON.parse(raw) as {
      recipe?: unknown;
    };

  return readCostableRecipe(
    parsed.recipe,
  );
}

export async function POST(
  request: Request,
) {
  try {
    const authError =
      await requireAdmin();

    if (authError) {
      return authError;
    }

    const body =
      await request.json() as
        Record<
          string,
          unknown
        >;

    const previewOnly =
      Boolean(
        body.previewOnly,
      );

    const forceAi =
      Boolean(
        body.forceAi,
      );

    const tenantId =
      clean(
        body.tenantId,
        90,
      );

    const name =
      clean(
        body.name,
        120,
      );

    const category =
      clean(
        body.category,
        60,
      ) || 'Other';

    const subcategory =
      clean(
        body.subcategory,
        60,
      );

    if (
      !tenantId ||
      !name
    ) {
      return NextResponse.json(
        {
          error:
            'Tenant and dish name are required',
        },
        {
          status: 400,
        },
      );
    }

    const tenant =
      await prisma
        .tenant
        .findUnique({
          where: {
            id: tenantId,
          },

          select: {
            id: true,
          },
        });

    if (!tenant) {
      return NextResponse.json(
        {
          error:
            'Source tenant no longer exists',
        },
        {
          status: 404,
        },
      );
    }

    const normalizedName =
      normalizeRecipeName(
        name,
      );

    const [
      catalog,
      overrides,
      saved,
    ] =
      await Promise.all([
        prisma.recipeCatalog
          .findUnique({
            where: {
              id: 'global',
            },

            select: {
              dishes: true,
              rates: true,
              deletedDishIds: true,
            },
          }),

        prisma.tenantIngredientRate
          .findMany({
            where: {
              tenantId,
            },

            select: {
              ingredientId:
                true,
              rate: true,
            },
          }),

        prisma.tenantAutoRecipe
          .findUnique({
            where: {
              tenantId_normalizedName:
                {
                  tenantId,
                  normalizedName,
                },
            },
          }),
      ]);

    const masterRates =
      Array.isArray(
        catalog?.rates,
      )
        ? catalog.rates
        : [];

    const historicalRecipes = [
      ...(
        Array.isArray(
          defaultRecipesData,
        )
          ? defaultRecipesData
          : []
      ),

      ...(
        Array.isArray(
          catalog?.dishes,
        )
          ? catalog.dishes
          : []
      ),
    ];

    const catalogMap =
      buildRecipeMap(
        historicalRecipes,
      );

    const overrideMap =
      new Map(
        overrides.map(
          (item) => [
            item.ingredientId,
            item.rate,
          ],
        ),
      );

    let recipe:
      CostableRecipe | null =
        forceAi
          ? null
          : catalogMap.get(
              normalizedName,
            ) || null;

    let source =
      recipe
        ? 'catalog_recipe'
        : '';

    if (
      !forceAi &&
      !recipe &&
      saved
    ) {
      recipe =
        readCostableRecipe({
          name:
            saved.name,

          baseGuests:
            saved.baseGuests,

          ingredients:
            saved.ingredients,
        });

      source =
        recipe
          ? 'saved_recipe'
          : '';
    }

    if (!recipe) {
      const availableIngredients =
        masterRates
          .map(
            normalizeIngredientRate,
          )
          .filter(
            (
              rate,
            ): rate is
              NonNullable<
                typeof rate
              > =>
                Boolean(rate),
          )
          .filter(
            (rate) =>
              rate.rate > 0,
          )
          .slice(
            0,
            180,
          )
          .map(
            (rate) => ({
              name:
                rate.name,
              unit:
                rate.unit,
            }),
          );

      recipe =
        await generateRecipe(
          name,
          category,
          availableIngredients,
        );

      source =
        recipe
          ? 'ai_recipe'
          : '';
    }

    if (!recipe) {
      return NextResponse.json(
        {
          error:
            structuredAiProvider()
              ? 'Recipe generation returned no usable recipe'
              : 'OpenAI is not configured and no existing recipe was found',
        },
        {
          status: 503,
        },
      );
    }

    /*
     * Tenant-specific costing uses that tenant's ingredient overrides.
     */
    const tenantPriced =
      fillRecipeIngredientRates(
        recipe,
        masterRates,
        historicalRecipes,
        overrideMap,
      );

    const tenantRaw =
      calculateRecipeCost(
        tenantPriced.recipe,
        masterRates,
        overrideMap,
      );

    const tenantCost =
      recipeCostSummary(
        tenantRaw.costPerPlate,
        tenantPriced
          .recipe
          .baseGuests,
      );

    const quality =
      assessRecipeQuality(
        tenantPriced.recipe,
        {
          missingRates:
            tenantRaw
              .missingRates,

          estimatedRates:
            tenantPriced
              .estimatedRates,

          costPerPlate:
            tenantCost
              .costPerPlate,
        },
      );

    /*
     * Standard master rate uses Ingredient Master values only.
     * This prevents one client's custom rates from becoming the
     * global Dish Master rate.
     */
    const standardPriced =
      fillRecipeIngredientRates(
        recipe,
        masterRates,
        historicalRecipes,
        new Map(),
      );

    const standardRaw =
      calculateRecipeCost(
        standardPriced.recipe,
        masterRates,
        new Map(),
      );

    const standardCost =
      recipeCostSummary(
        standardRaw.costPerPlate,
        standardPriced
          .recipe
          .baseGuests,
      );

    const standardQuality =
      assessRecipeQuality(
        standardPriced.recipe,
        {
          missingRates:
            standardRaw
              .missingRates,

          estimatedRates:
            standardPriced
              .estimatedRates,

          costPerPlate:
            standardCost
              .costPerPlate,
        },
      );

    if (previewOnly) {
      return NextResponse.json({
        ok: true,
        previewOnly: true,
        name,
        tenantId,
        source,

        servingStandard:
          recipeServingStandard(
            category,
            name,
          ),

        baseGuests:
          standardPriced
            .recipe
            .baseGuests,

        ingredientCount:
          standardPriced
            .recipe
            .ingredients
            .length,

        estimatedIngredientRates:
          standardPriced
            .estimatedRates,

        missingRates:
          standardRaw
            .missingRates,

        recipe:
          standardPriced
            .recipe,

        cost:
          standardCost,

        quality:
          standardQuality,

        standardCostPerPlate:
          standardCost
            .costPerPlate,
      });
    }

    const existingGlobalRecipes =
      Array.isArray(
        catalog?.dishes,
      )
        ? catalog.dishes
        : [];

    const globalRecipe = {
      dishName:
        name,

      name,

      category,

      subcategory,

      aliases: [],

      baseGuests:
        standardPriced
          .recipe
          .baseGuests,

      dishRate:
        standardCost
          .costPerPlate,

      ingredients:
        standardPriced
          .recipe
          .ingredients,
    };

    const nextGlobalRecipes =
      [
        ...existingGlobalRecipes
          .filter(
            (item) => {
              if (
                !item ||
                typeof item !==
                  'object' ||
                Array.isArray(item)
              ) {
                return true;
              }

              const record =
                item as
                  Record<
                    string,
                    unknown
                  >;

              return (
                normalizeRecipeName(
                  record.name ||
                  record.dishName,
                ) !==
                normalizedName
              );
            },
          ),

        globalRecipe,
      ];

    await prisma
      .$transaction(
        async (tx) => {

          await tx
            .recipeCatalog
            .upsert({
              where: {
                id:
                  'global',
              },

              create: {
                id:
                  'global',

                dishes:
                  nextGlobalRecipes as Prisma.InputJsonValue,

                rates:
                  masterRates as Prisma.InputJsonValue,

                deletedDishIds:
                  (
                    catalog
                      ?.deletedDishIds ||
                    []
                  ) as Prisma.InputJsonValue,
              },

              update: {
                dishes:
                  nextGlobalRecipes as Prisma.InputJsonValue,

                catalogVersion: {
                  increment: 1,
                },
              },
            });

          await tx
            .tenantAutoRecipe
            .upsert({
              where: {
                tenantId_normalizedName:
                  {
                    tenantId,
                    normalizedName,
                  },
              },

              create: {
                tenantId,
                normalizedName,
                name,
                category,

                baseGuests:
                  tenantPriced
                    .recipe
                    .baseGuests,

                ingredients:
                  tenantPriced
                    .recipe
                    .ingredients as Prisma.InputJsonValue,

                costPerPlate:
                  tenantCost
                    .costPerPlate,
              },

              update: {
                name,
                category,

                baseGuests:
                  tenantPriced
                    .recipe
                    .baseGuests,

                ingredients:
                  tenantPriced
                    .recipe
                    .ingredients as Prisma.InputJsonValue,

                costPerPlate:
                  tenantCost
                    .costPerPlate,
              },
            });

          const masterDish =
            await tx
              .dishMasterItem
              .findFirst({
                where: {
                  name: {
                    equals:
                      name,

                    mode:
                      'insensitive',
                  },
                },

                select: {
                  id: true,
                },
              });

          if (masterDish) {
            await tx
              .dishMasterItem
              .update({
                where: {
                  id:
                    masterDish.id,
                },

                data: {
                  rate:
                    standardCost
                      .costPerPlate,
                },
              });
          }
        },
      );

    return NextResponse.json({
      ok: true,
      name,
      tenantId,
      source,

      servingStandard:
        recipeServingStandard(
          category,
          name,
        ),

      baseGuests:
        tenantPriced
          .recipe
          .baseGuests,

      ingredientCount:
        tenantPriced
          .recipe
          .ingredients
          .length,

      estimatedIngredientRates:
        tenantPriced
          .estimatedRates,

      missingRates:
        tenantRaw
          .missingRates,

      cost:
        tenantCost,

      quality,

      standardCostPerPlate:
        standardCost
          .costPerPlate,
    });
  } catch (error) {
    console.error(
      'Admin auto recipe build failed:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Could not automatically build and cost the recipe',
      },
      {
        status: 500,
      },
    );
  }
}
