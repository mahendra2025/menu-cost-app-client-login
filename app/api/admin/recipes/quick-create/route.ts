import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import {
  getAdminCookieName,
  isValidAdminSessionToken,
} from '../../../../../lib/adminAuth';

import {
  normalizeIngredientRate,
  type IngredientRate,
} from '../../../../../lib/ingredientCatalog';

import {
  CATEGORIES,
  readDeletedDishCategories,
} from '../../../../../lib/dishCostMaster';

import {
  assessRecipeQuality,
  calculateRecipeCost,
  readCostableRecipe,
  recipeCostSummary,
} from '../../../../../lib/recipeCosting';

import {
  prisma,
} from '../../../../../lib/prisma';

const CATALOG_ID = 'global';
const CATEGORY_CATALOG_ID =
  'global';

function clean(
  value: unknown,
  max = 120,
) {
  return String(
    value || '',
  )
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

export async function GET() {
  try {
    const authError =
      await requireAdmin();

    if (authError) {
      return authError;
    }

    const catalog =
      await prisma
        .recipeCatalog
        .findUnique({
          where: {
            id: CATALOG_ID,
          },

          select: {
            rates: true,
          },
        });

    const rates =
      (
        Array.isArray(
          catalog?.rates,
        )
          ? catalog.rates
          : []
      )
        .map(
          normalizeIngredientRate,
        )
        .filter(
          (
            rate,
          ): rate is
            IngredientRate =>
            Boolean(rate),
        )
        .sort(
          (
            left,
            right,
          ) =>
            left.name.localeCompare(
              right.name,
            ),
        );

    return NextResponse.json({
      rates,
    });
  } catch (error) {
    console.error(
      'Quick recipe rates failed:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Could not load Ingredient Master rates',
      },
      {
        status: 500,
      },
    );
  }
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

    const name =
      clean(
        body.name,
      );

    const category =
      clean(
        body.category,
        60,
      ) ||
      'Other';

    const subcategory =
      clean(
        body.subcategory,
        60,
      );

    const baseGuests =
      Math.max(
        1,
        Math.round(
          Number(
            body.baseGuests,
          ) || 100,
        ),
      );

    const publishDish =
      Boolean(
        body.publishDish,
      );

    if (!name) {
      return NextResponse.json(
        {
          error:
            'Dish name is required',
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
            id: CATALOG_ID,
          },

          select: {
            dishes: true,
            rates: true,
            deletedDishIds:
              true,
            catalogVersion:
              true,
          },
        });

    const rawMasterRates =
      Array.isArray(
        catalog?.rates,
      )
        ? catalog.rates
        : [];

    const masterRates =
      rawMasterRates
        .map(
          normalizeIngredientRate,
        )
        .filter(
          (
            rate,
          ): rate is
            IngredientRate =>
            Boolean(rate),
        );

    const masterById =
      new Map(
        masterRates.map(
          (rate) => [
            rate.id,
            rate,
          ],
        ),
      );

    const rawIngredients =
      Array.isArray(
        body.ingredients,
      )
        ? body.ingredients
        : [];

    const ingredients =
      rawIngredients
        .flatMap(
          (value) => {
            if (
              !value ||
              typeof value !==
                'object' ||
              Array.isArray(
                value,
              )
            ) {
              return [];
            }

            const item =
              value as
                Record<
                  string,
                  unknown
                >;

            const rateKey =
              clean(
                item.rateKey,
                180,
              );

            const master =
              masterById.get(
                rateKey,
              );

            const ingredientName =
              master?.name ||
              clean(
                item.name,
                120,
              );

            const quantity =
              Math.max(
                0,
                Number(
                  item.quantity ??
                    item.qty,
                ) || 0,
              );

            const unit =
              clean(
                item.unit,
                30,
              ) ||
              master?.unit ||
              'kg';

            const rate =
              master?.rate ??
              Math.max(
                0,
                Number(
                  item.rate,
                ) || 0,
              );

            const rateUnit =
              master?.unit ||
              clean(
                item.rateUnit,
                30,
              ) ||
              unit;

            if (
              !ingredientName ||
              !(quantity > 0)
            ) {
              return [];
            }

            return [
              {
                name:
                  ingredientName,

                quantity,
                qty:
                  quantity,

                unit,

                rateKey:
                  master?.id ||
                  rateKey,

                rate,

                marketRate:
                  rate,

                rateUnit,

                rateSource:
                  master
                    ? 'ingredient_master'
                    : 'manual',
              },
            ];
          },
        );

    const existingRecipes =
      Array.isArray(
        catalog?.dishes,
      )
        ? catalog.dishes
        : [];

    const existingRecipe =
      existingRecipes.find(
        (value) => {
          if (
            !value ||
            typeof value !==
              'object' ||
            Array.isArray(
              value,
            )
          ) {
            return false;
          }

          const row =
            value as Record<
              string,
              unknown
            >;

          return (
            clean(
              row.name ||
                row.dishName,
            ).toLocaleLowerCase(
              'en-IN',
            ) ===
            name.toLocaleLowerCase(
              'en-IN',
            )
          );
        },
      );

    const existingAliases =
      existingRecipe &&
      typeof existingRecipe ===
        'object' &&
      !Array.isArray(
        existingRecipe,
      ) &&
      Array.isArray(
        (
          existingRecipe as
            Record<
              string,
              unknown
            >
        ).aliases,
      )
        ? (
            (
              existingRecipe as
                Record<
                  string,
                  unknown
                >
            ).aliases as
              unknown[]
          )
            .map(String)
            .map(
              (value) =>
                value.trim(),
            )
            .filter(Boolean)
        : [];

    const recipe = {
      dishName:
        name,

      name,

      category,

      subcategory,

      aliases:
        existingAliases,

      baseGuests,

      servingSize: 1,

      servingUnit:
        'serving',

      ingredients,
    };

    const costable =
      readCostableRecipe(
        recipe,
      );

    if (!costable) {
      return NextResponse.json(
        {
          error:
            'Recipe is not usable',
        },
        {
          status: 400,
        },
      );
    }

    const rawCost =
      calculateRecipeCost(
        costable,
        rawMasterRates,
      );

    const cost =
      recipeCostSummary(
        rawCost.costPerPlate,
        baseGuests,
      );

    const quality =
      assessRecipeQuality(
        costable,
        {
          missingRates:
            rawCost.missingRates,

          estimatedRates: 0,

          costPerPlate:
            cost.costPerPlate,
        },
      );

    if (
      quality.status !==
      'READY'
    ) {
      return NextResponse.json(
        {
          error:
            quality.issues[0]
              ?.message ||
            'Recipe needs review before saving.',

          quality,
          cost,
        },
        {
          status: 422,
        },
      );
    }

    const storedRecipe = {
      ...recipe,

      dishRate:
        cost.costPerPlate,
    };

    const nextRecipes = [
      ...existingRecipes.filter(
        (value) => {
          if (
            !value ||
            typeof value !==
              'object' ||
            Array.isArray(
              value,
            )
          ) {
            return true;
          }

          const row =
            value as Record<
              string,
              unknown
            >;

          return (
            clean(
              row.name ||
                row.dishName,
            ).toLocaleLowerCase(
              'en-IN',
            ) !==
            name.toLocaleLowerCase(
              'en-IN',
            )
          );
        },
      ),

      storedRecipe,
    ];

    const saved =
      await prisma
        .$transaction(
          async (tx) => {
            const recipeCatalog =
              await tx
                .recipeCatalog
                .upsert({
                  where: {
                    id:
                      CATALOG_ID,
                  },

                  create: {
                    id:
                      CATALOG_ID,

                    dishes:
                      nextRecipes as
                        Prisma.InputJsonValue,

                    rates:
                      rawMasterRates as
                        Prisma.InputJsonValue,

                    deletedDishIds:
                      (
                        Array.isArray(
                          catalog
                            ?.deletedDishIds,
                        )
                          ? catalog
                              .deletedDishIds
                          : []
                      ) as
                        Prisma.InputJsonValue,

                    catalogVersion:
                      Math.max(
                        1,
                        Number(
                          catalog
                            ?.catalogVersion,
                        ) || 1,
                      ),
                  },

                  update: {
                    dishes:
                      nextRecipes as
                        Prisma.InputJsonValue,

                    catalogVersion: {
                      increment: 1,
                    },
                  },

                  select: {
                    updatedAt:
                      true,
                  },
                });

            if (
              publishDish
            ) {
              const existingDish =
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

              if (
                existingDish
              ) {
                await tx
                  .dishMasterItem
                  .update({
                    where: {
                      id:
                        existingDish.id,
                    },

                    data: {
                      name,
                      category,
                      subcategory,

                      rate:
                        cost.costPerPlate,

                      servingQuantity:
                        1,

                      servingUnit:
                        'serving',
                    },
                  });
              } else {
                await tx
                  .dishMasterItem
                  .create({
                    data: {
                      name,
                      category,
                      subcategory,

                      rate:
                        cost.costPerPlate,

                      servingQuantity:
                        1,

                      servingUnit:
                        'serving',

                      aliases: [],
                    },
                  });
              }
            }

            const categoryCatalog =
              await tx
                .dishCategoryCatalog
                .findUnique({
                  where: {
                    id:
                      CATEGORY_CATALOG_ID,
                  },

                  select: {
                    categories:
                      true,

                    subcategories:
                      true,
                  },
                });

            const sourceCategories =
              Array.isArray(
                categoryCatalog
                  ?.categories,
              )
                ? categoryCatalog
                    .categories
                    .map(String)
                : [
                    ...CATEGORIES,
                  ];

            const categories =
              Array.from(
                new Map(
                  [
                    ...sourceCategories,
                    category,
                    'Other',
                  ]
                    .map(
                      (value) =>
                        clean(
                          value,
                          60,
                        ),
                    )
                    .filter(Boolean)
                    .map(
                      (value) => [
                        value
                          .toLowerCase(),
                        value,
                      ],
                    ),
                ).values(),
              );

            const storedSubcategories =
              categoryCatalog
                ?.subcategories &&
              typeof categoryCatalog
                .subcategories ===
                'object' &&
              !Array.isArray(
                categoryCatalog
                  .subcategories,
              )
                ? {
                    ...(
                      categoryCatalog
                        .subcategories as
                        Record<
                          string,
                          unknown
                        >
                    ),
                  }
                : {};

            const categorySubs =
              Array.isArray(
                storedSubcategories[
                  category
                ],
              )
                ? (
                    storedSubcategories[
                      category
                    ] as
                      unknown[]
                  )
                    .map(String)
                    .map(
                      (value) =>
                        clean(
                          value,
                          60,
                        ),
                    )
                    .filter(Boolean)
                : [];

            if (
              subcategory &&
              !categorySubs.some(
                (value) =>
                  value.toLowerCase() ===
                  subcategory
                    .toLowerCase(),
              )
            ) {
              categorySubs.push(
                subcategory,
              );
            }

            storedSubcategories[
              category
            ] =
              categorySubs;

            const deleted =
              readDeletedDishCategories(
                storedSubcategories,
              ).filter(
                (value) =>
                  value
                    .toLowerCase() !==
                  category
                    .toLowerCase(),
              );

            if (
              deleted.length
            ) {
              storedSubcategories[
                '__deletedCategories'
              ] =
                deleted;
            } else {
              delete storedSubcategories[
                '__deletedCategories'
              ];
            }

            await tx
              .dishCategoryCatalog
              .upsert({
                where: {
                  id:
                    CATEGORY_CATALOG_ID,
                },

                create: {
                  id:
                    CATEGORY_CATALOG_ID,

                  categories,

                  subcategories:
                    storedSubcategories as
                      Prisma.InputJsonValue,
                },

                update: {
                  categories,

                  subcategories:
                    storedSubcategories as
                      Prisma.InputJsonValue,
                },
              });

            return {
              updatedAt:
                recipeCatalog
                  .updatedAt,
            };
          },
        );

    return NextResponse.json({
      ok: true,

      name,

      category,

      subcategory,

      baseGuests,

      ingredientCount:
        ingredients.length,

      publishedDish:
        publishDish,

      cost,

      quality,

      updatedAt:
        saved.updatedAt,
    });
  } catch (error) {
    console.error(
      'Quick recipe save failed:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Could not save the recipe',
      },
      {
        status: 500,
      },
    );
  }
}
