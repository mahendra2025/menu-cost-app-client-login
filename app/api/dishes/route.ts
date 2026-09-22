import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import {
  getClientCookieName,
  readClientSessionToken,
} from '../../../lib/clientAuth';

import {
  normalizeIngredientId,
  normalizeIngredientRate,
} from '../../../lib/ingredientCatalog';

import { prisma } from '../../../lib/prisma';

import {
  filterDishCatalogByStoredCategories,
  readDeletedDishCategories,
} from '../../../lib/dishCostMaster';

function normalizeName(value: unknown) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('en-IN')
    .replace(/\s+/g, ' ');
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

function buildPersonalDishRates(
  dishes: unknown,
  masterRatesRaw: unknown,
  overrides: Map<string, number>,
) {
  const output =
    new Map<string, number>();

  if (!Array.isArray(dishes)) {
    return output;
  }

  const masterRates =
    Array.isArray(masterRatesRaw)
      ? masterRatesRaw
          .map(normalizeIngredientRate)
          .filter(
            (
              rate,
            ): rate is NonNullable<
              typeof rate
            > => Boolean(rate),
          )
      : [];

  const ratesById =
    new Map(
      masterRates.map(
        (rate) => [
          rate.id,
          rate,
        ],
      ),
    );

  dishes.forEach((value) => {
    if (
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value)
    ) return;

    const dish =
      value as Record<
        string,
        unknown
      >;

    const dishName =
      String(
        dish.name ||
        dish.dishName ||
        '',
      ).trim();

    if (
      !dishName ||
      !Array.isArray(
        dish.ingredients,
      )
    ) return;

    const baseGuests =
      Math.max(
        1,
        Number(
          dish.baseGuests,
        ) || 100,
      );

    let totalCost = 0;

    dish.ingredients.forEach(
      (value) => {
        if (
          !value ||
          typeof value !==
            'object' ||
          Array.isArray(value)
        ) return;

        const ingredient =
          value as Record<
            string,
            unknown
          >;

        const quantity =
          Math.max(
            0,
            Number(
              ingredient.qty ??
              ingredient.quantity,
            ) || 0,
          );

        const unit =
          String(
            ingredient.unit || 'kg',
          ).trim();

        const ingredientName =
          String(
            ingredient.name ||
            ingredient.ingredientName ||
            '',
          ).trim();

        const suppliedRateKey =
          String(
            ingredient.rateKey || '',
          ).trim();

        const fallbackRateUnit =
          String(
            ingredient.rateUnit ||
            unit,
          ).trim();

        const fallbackId =
          ingredientName
            ? normalizeIngredientId(
                ingredientName,
                fallbackRateUnit,
              )
            : '';

        const rateKey =
          suppliedRateKey ||
          fallbackId;

        const master =
          ratesById.get(rateKey) ||
          (
            fallbackId
              ? ratesById.get(
                  fallbackId,
                )
              : undefined
          );

        const rate =
          overrides.get(
            master?.id ||
            rateKey,
          ) ??
          master?.rate ??
          Math.max(
            0,
            Number(
              ingredient.rate ??
              ingredient.marketRate,
            ) || 0,
          );

        const rateUnit =
          master?.unit ||
          fallbackRateUnit ||
          unit;

        totalCost +=
          convertQuantity(
            quantity,
            unit,
            rateUnit,
          ) * rate;
      },
    );

    if (totalCost > 0) {
      output.set(
        normalizeName(
          dishName,
        ),
        Math.round(
          (
            totalCost /
            baseGuests
          ) * 100,
        ) / 100,
      );
    }
  });

  return output;
}

export async function GET() {
  try {
    const cookieStore =
      await cookies();

    const tenantId =
      readClientSessionToken(
        cookieStore.get(
          getClientCookieName(),
        )?.value,
      );

    const [
      items,
      categoryCatalog,
      recipeCatalog,
      tenantSavedDishes,
    ] = await Promise.all([
      prisma.dishMasterItem.findMany({
        orderBy: {
          name: 'asc',
        },

        select: {
          name: true,
          category: true,
          subcategory: true,
          rate: true,
          servingQuantity: true,
          servingUnit: true,
          gasKgPer100: true,
          aliases: true,
        },
      }),

      prisma.dishCategoryCatalog.findUnique({
        where: {
          id: 'global',
        },
        select: {
          categories: true,
          subcategories: true,
        },
      }),

      prisma.recipeCatalog.findUnique({
        where: {
          id: 'global',
        },
        select: {
          dishes: true,
          rates: true,
        },
      }),

      tenantId
        ? prisma.tenantAutoRecipe.findMany({
            where: {
              tenantId,
            },
            select: {
              name: true,
              category: true,
              costPerPlate: true,
            },
          })
        : Promise.resolve([]),
    ]);

    let personalDishRates =
      new Map<
        string,
        number
      >();

    if (
      tenantId &&
      recipeCatalog
    ) {
      const overrides =
        await prisma.tenantIngredientRate.findMany({
          where: {
            tenantId,
          },

          select: {
            ingredientId: true,
            rate: true,
          },
        });

      personalDishRates =
        buildPersonalDishRates(
          recipeCatalog.dishes,
          recipeCatalog.rates,
          new Map(
            overrides.map(
              (item) => [
                item.ingredientId,
                item.rate,
              ],
            ),
          ),
        );
    }

    /*
     * Piece weight belongs to Recipe Master.
     *
     * Join recipe metadata by dish name so the user-side
     * catalog automatically receives Weight / Piece without
     * duplicating that value in another database column.
     */
    const recipePieceWeightByName =
      new Map<string, number>();

    if (
      Array.isArray(
        recipeCatalog?.dishes,
      )
    ) {
      recipeCatalog.dishes.forEach(
        (value) => {
          if (
            !value ||
            typeof value !==
              'object' ||
            Array.isArray(value)
          ) {
            return;
          }

          const row =
            value as Record<
              string,
              unknown
            >;

          const name =
            String(
              row.dishName ||
              row.name ||
              '',
            ).trim();

          const weight =
            Math.max(
              0,
              Number(
                row.pieceWeightGrams,
              ) || 0,
            );

          if (
            name &&
            weight > 0
          ) {
            recipePieceWeightByName.set(
              normalizeName(
                name,
              ),
              weight,
            );
          }
        },
      );
    }

    /*
     * PostgreSQL Dish Master is authoritative.
     *
     * IMPORTANT:
     * Do not merge the built-in DISH_COST_ITEMS here.
     *
     * If Admin deletes one dish, that dish must disappear from
     * user-side detection.
     *
     * If Admin deletes every dish, this must stay [].
     */
    const mergedItems =
      items.map(
        (item) => ({
          name:
            item.name,

          category:
            item.category,

          subcategory:
            item.subcategory,

          rate:
            personalDishRates.get(
              normalizeName(
                item.name,
              ),
            ) ??
            item.rate,

          servingQuantity:
            item.servingQuantity,

          servingUnit:
            item.servingUnit,

          gasKgPer100:
            item.gasKgPer100 ??
            undefined,

          pieceWeightGrams:
            recipePieceWeightByName.get(
              normalizeName(
                item.name,
              ),
            ),

          aliases:
            Array.isArray(
              item.aliases,
            )
              ? item.aliases
                  .map(
                    (alias) =>
                      String(
                        alias,
                      ).trim(),
                  )
                  .filter(
                    Boolean,
                  )
              : [],
        }),
      );

    const tenantSavedByName =
      new Map(
        tenantSavedDishes
          .filter(
            (item) =>
              item.name.trim() &&
              Number(item.costPerPlate) > 0,
          )
          .map(
            (item) => [
              normalizeName(
                item.name,
              ),
              item,
            ],
          ),
      );

    const personalizedItems =
      mergedItems.map(
        (item) => {
          const saved =
            tenantSavedByName.get(
              normalizeName(
                item.name,
              ),
            );

          if (!saved) {
            return {
              ...item,
              source:
                'global' as const,
            };
          }

          tenantSavedByName.delete(
            normalizeName(
              item.name,
            ),
          );

          return {
            ...item,
            category:
              saved.category ||
              item.category,
            rate:
              Math.max(
                0,
                Number(
                  saved.costPerPlate,
                ) || 0,
              ) ||
              item.rate,
            source:
              'tenant' as const,
          };
        },
      );

    tenantSavedByName.forEach(
      (saved) => {
        personalizedItems.push({
          name:
            saved.name,
          category:
            saved.category ||
            'Other',
          subcategory:
            '',
          rate:
            Math.max(
              0,
              Number(
                saved.costPerPlate,
              ) || 0,
            ),
          servingQuantity:
            1,
          servingUnit:
            'serving',
          gasKgPer100:
            undefined,
          pieceWeightGrams:
            undefined,
          aliases:
            [],
          source:
            'tenant' as const,
        });
      },
    );

    const catalogItems =
      filterDishCatalogByStoredCategories(
        personalizedItems,
        categoryCatalog?.categories,
        readDeletedDishCategories(
          categoryCatalog
            ?.subcategories,
        ),
      );

    return NextResponse.json({
      items:
        catalogItems,
      personalized:
        Boolean(tenantId),
    });
  } catch (error) {
    console.error(
      'Dish catalog GET:',
      error,
    );

    /*
     * Never resurrect built-in dishes when the database
     * cannot be read.
     */
    return NextResponse.json(
      {
        items: [],
        error:
          'Dish catalog unavailable.',
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
    const cookieStore =
      await cookies();

    const tenantId =
      readClientSessionToken(
        cookieStore.get(
          getClientCookieName(),
        )?.value,
      );

    if (!tenantId) {
      return NextResponse.json(
        {
          error:
            'Client login required',
        },
        {
          status: 401,
        },
      );
    }

    const body =
      await request.json() as Record<
        string,
        unknown
      >;

    const name =
      String(
        body.name || '',
      )
        .normalize('NFKC')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 120);

    const category =
      String(
        body.category ||
        'Other',
      )
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 60) ||
      'Other';

    const rate =
      Math.max(
        0,
        Number(
          body.rate,
        ) || 0,
      );

    if (
      !name ||
      !(rate > 0)
    ) {
      return NextResponse.json(
        {
          error:
            'Dish name and a valid rate are required.',
        },
        {
          status: 400,
        },
      );
    }

    const normalizedName =
      normalizeName(
        name,
      );

    const existing =
      await prisma
        .tenantAutoRecipe
        .findUnique({
          where: {
            tenantId_normalizedName: {
              tenantId,
              normalizedName,
            },
          },
          select: {
            ingredients:
              true,
            baseGuests:
              true,
          },
        });

    const saved =
      await prisma
        .tenantAutoRecipe
        .upsert({
          where: {
            tenantId_normalizedName: {
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
              100,
            ingredients:
              [] as Prisma.InputJsonValue,
            costPerPlate:
              rate,
          },
          update: {
            name,
            category,
            baseGuests:
              existing
                ?.baseGuests ||
              100,
            ingredients:
              (
                existing
                  ?.ingredients ??
                []
              ) as Prisma.InputJsonValue,
            costPerPlate:
              rate,
          },
          select: {
            name: true,
            category: true,
            costPerPlate: true,
          },
        });

    return NextResponse.json({
      ok: true,
      item: {
        name:
          saved.name,
        category:
          saved.category,
        subcategory:
          '',
        rate:
          saved.costPerPlate,
        servingQuantity:
          1,
        servingUnit:
          'serving',
        source:
          'tenant',
      },
    });

  } catch (error) {
    console.error(
      'Dish catalog POST:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Could not save dish to your Dish Master.',
      },
      {
        status: 500,
      },
    );
  }
}
