import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  getAdminCookieName,
  isValidAdminSessionToken,
} from '../../../../../lib/adminAuth';

import {
  normalizeIngredientRate,
} from '../../../../../lib/ingredientCatalog';

import { prisma } from '../../../../../lib/prisma';

import {
  applyRecipeWastage,
  assessRecipeQuality,
  calculateRecipeCost,
  fillRecipeIngredientRates,
  readCostableRecipe,
  type CostableRecipe,
} from '../../../../../lib/recipeCosting';

import {
  requestStructuredAi,
  structuredAiProvider,
} from '../../../../../lib/structuredAi';

import {
  readMenuDishModifiers,
  type MenuDishModifiers,
} from '../../../../../lib/menuDishModifiers';

const MAX_DISHES = 30;
const BATCH_SIZE = 8;

type RequestedDish = {
  name: string;
  category: string;
  modifiers?: MenuDishModifiers;
};

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

function cleanDish(
  value: unknown,
): RequestedDish | null {
  if (
    !value ||
    typeof value !==
      'object' ||
    Array.isArray(value)
  ) {
    return null;
  }

  const row =
    value as Record<
      string,
      unknown
    >;

  const name =
    String(
      row.name ||
      row.dishName ||
      '',
    )
      .normalize('NFKC')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120);

  if (!name) {
    return null;
  }

  const category =
    String(
      row.category ||
      'Other',
    )
      .normalize('NFKC')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 60) ||
    'Other';

  return {
    name,
    category,
    modifiers:
      readMenuDishModifiers(
        row.modifiers,
      ),
  };
}

async function generateBatch(
  dishes: RequestedDish[],
  availableIngredients:
    Array<{
      name: string;
      unit: string;
    }>,
) {
  const schema:
    Record<string, unknown> = {
      type: 'object',
      additionalProperties:
        false,
      required: [
        'recipes',
      ],
      properties: {
        recipes: {
          type: 'array',
          minItems: 1,
          maxItems:
            BATCH_SIZE,
          items: {
            type: 'object',
            additionalProperties:
              false,
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
      },
    };

  const raw =
    await requestStructuredAi({
      schemaName:
        'admin_smart_recipe_drafts',
      schema,
      maxOutputTokens:
        Math.min(
          6000,
          Math.max(
            900,
            dishes.length *
              500,
          ),
        ),
      instructions: [
        'Create editable Indian catering production recipe drafts for exactly 100 guests.',
        'Return one recipe for every requested dish, in the same order, and do not add extra dishes.',
        'Copy each original dish name exactly into requestedName.',
        'Use the supplied dish category as context, but never change requestedName.',
        'Prefer ingredient names and purchase units from the supplied Ingredient Master.',
        'Use realistic bulk catering quantities for 100 guests, not per-person quantities.',
        'Use only kg, gram, ltr, ml, piece, or packet.',
        'Include 6 to 12 meaningful cost-driving ingredients where practical.',
        'Do not include water, garnish, optional decoration, or tiny seasoning quantities unless they materially affect cost.',
        'For paneer, rice, dal, chana and similar core dishes, include the obvious core ingredient at a realistic 100-pax quantity.',
        'Respect dish modifiers exactly. JAIN means exclude onion, garlic and root vegetables. NO_ONION_GARLIC means exclude onion and garlic. SATVIK means exclude onion and garlic and keep the recipe sattvik. VEGAN means exclude dairy, ghee and other animal-derived ingredients. LIVE means the dish is prepared/finished at a live counter; keep the recipe practical for live service.',
        'If a portionQuantity/portionUnit modifier is supplied, treat it as the intended serving size per guest, while ingredient quantities must still be for the full 100-guest batch.',
        'This is a draft for human review. Do not claim the quantities are final.',
      ].join('\n'),
      input:
        JSON.stringify({
          dishes,
          availableIngredients,
        }),
    });

  const parsed =
    JSON.parse(
      raw,
    ) as {
      recipes?: unknown[];
    };

  return (
    Array.isArray(
      parsed.recipes,
    )
      ? parsed.recipes
      : []
  )
    .map(
      (
        value,
        index,
      ) => {
        if (
          !value ||
          typeof value !==
            'object' ||
          Array.isArray(
            value,
          )
        ) {
          return null;
        }

        const row =
          value as Record<
            string,
            unknown
          >;

        const requested =
          dishes[index];

        if (!requested) {
          return null;
        }

        const recipe =
          readCostableRecipe({
            ...row,
            name:
              requested.name,
            baseGuests: 100,
          });

        return recipe
          ? {
              requested,
              recipe,
            }
          : null;
      },
    )
    .filter(
      (
        value,
      ): value is {
        requested:
          RequestedDish;
        recipe:
          CostableRecipe;
      } =>
        Boolean(value),
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

    if (
      !structuredAiProvider()
    ) {
      return NextResponse.json(
        {
          error:
            'Smart Recipe Draft generation is not configured.',
        },
        {
          status: 503,
        },
      );
    }

    const body =
      await request.json() as
        Record<
          string,
          unknown
        >;

    const unique =
      new Map<
        string,
        RequestedDish
      >();

    (
      Array.isArray(
        body.dishes,
      )
        ? body.dishes.slice(
            0,
            MAX_DISHES,
          )
        : []
    )
      .map(cleanDish)
      .forEach(
        (dish) => {
          if (!dish) {
            return;
          }

          const key =
            dish.name
              .toLocaleLowerCase(
                'en-IN',
              );

          if (!unique.has(key)) {
            unique.set(
              key,
              dish,
            );
          }
        },
      );

    const dishes =
      Array.from(
        unique.values(),
      );

    if (!dishes.length) {
      return NextResponse.json(
        {
          error:
            'At least one dish is required.',
        },
        {
          status: 400,
        },
      );
    }

    const catalog =
      await prisma
        .recipeCatalog
        .findUnique({
          where: {
            id: 'global',
          },
          select: {
            dishes: true,
            rates: true,
          },
        });

    const masterRates =
      Array.isArray(
        catalog?.rates,
      )
        ? catalog.rates
        : [];

    const normalizedRates =
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
        );

    if (
      !normalizedRates.length
    ) {
      return NextResponse.json(
        {
          error:
            'Ingredient Master has no usable ingredients.',
        },
        {
          status: 422,
        },
      );
    }

    const availableIngredients =
      normalizedRates
        .filter(
          (rate) =>
            Number(
              rate.rate,
            ) > 0,
        )
        .slice(
          0,
          220,
        )
        .map(
          (rate) => ({
            name:
              rate.name,
            unit:
              rate.unit,
          }),
        );

    const batches =
      Array.from(
        {
          length:
            Math.ceil(
              dishes.length /
                BATCH_SIZE,
            ),
        },
        (
          _,
          index,
        ) =>
          dishes.slice(
            index *
              BATCH_SIZE,
            (
              index + 1
            ) *
              BATCH_SIZE,
          ),
      );

    const generated:
      Array<{
        requested:
          RequestedDish;
        recipe:
          CostableRecipe;
      }> = [];

    for (
      const batch
      of batches
    ) {
      generated.push(
        ...await generateBatch(
          batch,
          availableIngredients,
        ),
      );
    }

    const historicalRecipes =
      Array.isArray(
        catalog?.dishes,
      )
        ? catalog.dishes
        : [];

    const results =
      generated.map(
        ({
          requested,
          recipe,
        }) => {
          const priced =
            fillRecipeIngredientRates(
              recipe,
              masterRates,
              historicalRecipes,
            );

          const cost =
            calculateRecipeCost(
              priced.recipe,
              masterRates,
            );

          const finalCostPerPlate =
            applyRecipeWastage(
              cost.costPerPlate,
            );

          const quality =
            assessRecipeQuality(
              priced.recipe,
              {
                missingRates:
                  cost.missingRates,
                estimatedRates:
                  priced
                    .estimatedRates,
                costPerPlate:
                  finalCostPerPlate,
              },
            );

          return {
            requestedName:
              requested.name,
            category:
              requested.category,
            recipe: {
              dishName:
                requested.name,
              name:
                requested.name,
              category:
                requested.category,
              baseGuests: 100,
              servingSize:
                requested.modifiers?.portionQuantity ||
                1,
              servingUnit:
                requested.modifiers?.portionUnit ||
                'serving',
              pieceWeightGrams:
                requested.modifiers?.pieceWeightGrams ||
                0,
              dishModifiers:
                requested.modifiers,
              dishRate:
                finalCostPerPlate,
              ingredients:
                priced.recipe
                  .ingredients,
              generatedRecipe:
                true,
            },
            costPerPlate:
              finalCostPerPlate,
            estimatedRates:
              priced
                .estimatedRates,
            missingRates:
              cost.missingRates,
            quality,
          };
        },
      );

    return NextResponse.json({
      ok: true,
      requested:
        dishes.length,
      generated:
        results.length,
      results,
    });
  } catch (error) {
    console.error(
      'Smart Recipe Draft generation failed:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Smart Recipe Draft generation failed.',
      },
      {
        status: 500,
      },
    );
  }
}
