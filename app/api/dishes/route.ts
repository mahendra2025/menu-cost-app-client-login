import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

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

    const catalogItems =
      filterDishCatalogByStoredCategories(
        mergedItems,
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
