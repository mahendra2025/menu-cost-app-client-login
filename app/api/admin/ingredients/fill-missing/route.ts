import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import {
  getAdminCookieName,
  isValidAdminSessionToken,
} from '../../../../../lib/adminAuth';

import {
  INGREDIENT_CATEGORIES,
  INGREDIENT_UNITS,
  inferIngredientCategory,
  normalizeIngredientId,
  normalizeIngredientRate,
  type IngredientRate,
  type IngredientUnit,
} from '../../../../../lib/ingredientCatalog';

import defaultRecipesData from '../../../../../lib/defaultRecipes.json';
import { prisma } from '../../../../../lib/prisma';

const CATALOG_ID = 'global';

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(
    getAdminCookieName(),
  )?.value;

  if (!isValidAdminSessionToken(token)) {
    return NextResponse.json(
      { error: 'Admin login required' },
      { status: 401 },
    );
  }

  return null;
}

function cleanName(value: unknown) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeUnit(
  value: unknown,
): IngredientUnit | null {
  const unit = String(value || '')
    .trim()
    .toLowerCase();

  const aliases: Record<
    string,
    IngredientUnit
  > = {
    kg: 'kg',
    kgs: 'kg',
    kilogram: 'kg',
    kilograms: 'kg',

    g: 'gram',
    gm: 'gram',
    gms: 'gram',
    gram: 'gram',
    grams: 'gram',

    l: 'ltr',
    lt: 'ltr',
    ltr: 'ltr',
    litre: 'ltr',
    liter: 'ltr',
    litres: 'ltr',
    liters: 'ltr',

    ml: 'ml',
    millilitre: 'ml',
    milliliter: 'ml',

    pc: 'piece',
    pcs: 'piece',
    piece: 'piece',
    pieces: 'piece',

    pkt: 'packet',
    pack: 'packet',
    packet: 'packet',
    packets: 'packet',
  };

  const normalized = aliases[unit];

  if (
    normalized &&
    INGREDIENT_UNITS.includes(normalized)
  ) {
    return normalized;
  }

  return null;
}

function ingredientRate(
  ingredient: Record<string, unknown>,
) {
  const values = [
    Number(ingredient.rate),
    Number(ingredient.marketRate),
  ].filter(
    (value) =>
      Number.isFinite(value) &&
      value > 0,
  );

  return values[0] || 0;
}

function fallbackMarketRate(
  category: string,
  unit: IngredientUnit,
) {
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

function buildDefaultRateMap() {
  const values =
    Array.isArray(defaultRecipesData)
      ? defaultRecipesData
      : [];

  const rateMap =
    new Map<string, number[]>();

  values.forEach((recipe) => {
    if (
      !recipe ||
      typeof recipe !== 'object' ||
      Array.isArray(recipe)
    ) {
      return;
    }

    const row =
      recipe as Record<string, unknown>;

    if (!Array.isArray(row.ingredients)) {
      return;
    }

    row.ingredients.forEach((value) => {
      if (
        !value ||
        typeof value !== 'object' ||
        Array.isArray(value)
      ) {
        return;
      }

      const item =
        value as Record<string, unknown>;

      const name = cleanName(
        item.name ||
        item.ingredientName,
      );

      const unit = normalizeUnit(
        item.rateUnit ||
        item.unit,
      );

      const rate = ingredientRate(item);

      if (!name || !unit || !(rate > 0)) {
        return;
      }

      const key =
        normalizeIngredientId(
          name,
          unit,
        );

      rateMap.set(
        key,
        [
          ...(rateMap.get(key) || []),
          rate,
        ],
      );
    });
  });

  return rateMap;
}

function median(values: number[]) {
  if (!values.length) return 0;

  const sorted = [...values]
    .filter(
      (value) =>
        Number.isFinite(value) &&
        value > 0,
    )
    .sort((a, b) => a - b);

  if (!sorted.length) return 0;

  const middle =
    Math.floor(sorted.length / 2);

  if (sorted.length % 2) {
    return sorted[middle];
  }

  return (
    sorted[middle - 1] +
    sorted[middle]
  ) / 2;
}

function categoriesFor(
  value: unknown,
  rates: IngredientRate[],
) {
  const source =
    Array.isArray(value)
      ? value.map(String)
      : [...INGREDIENT_CATEGORIES];

  return Array.from(
    new Map(
      [
        ...source,
        ...rates.map(
          (rate) => rate.category,
        ),
        'Other',
      ]
        .map((category) =>
          String(category || '')
            .trim()
            .replace(/\s+/g, ' '),
        )
        .filter(Boolean)
        .map((category) => [
          category.toLowerCase(),
          category,
        ]),
    ).values(),
  );
}

export async function POST() {
  try {
    const authError =
      await requireAdmin();

    if (authError) return authError;

    const catalog =
      await prisma.recipeCatalog.findUnique({
        where: {
          id: CATALOG_ID,
        },
      });

    if (!catalog) {
      return NextResponse.json(
        {
          error:
            'Recipe catalog is not initialized.',
        },
        { status: 404 },
      );
    }

    const dishes =
      Array.isArray(catalog.dishes)
        ? catalog.dishes
        : [];

    const currentRates =
      Array.isArray(catalog.rates)
        ? catalog.rates
            .map(normalizeIngredientRate)
            .filter(
              (
                rate,
              ): rate is IngredientRate =>
                Boolean(rate),
            )
        : [];

    const defaultRateMap =
      buildDefaultRateMap();

    const finalRates =
      new Map<string, IngredientRate>();

    currentRates.forEach((rate) => {
      finalRates.set(
        rate.id,
        rate,
      );
    });

    let addedIngredients = 0;
    let filledRates = 0;
    let linkedIngredients = 0;
    let invalidUnitIngredients = 0;

    const builtInRecipes =
      Array.isArray(defaultRecipesData)
        ? defaultRecipesData
        : [];

    builtInRecipes.forEach((value) => {
      if (
        !value ||
        typeof value !== 'object' ||
        Array.isArray(value)
      ) {
        return;
      }

      const recipe =
        value as Record<string, unknown>;

      if (!Array.isArray(recipe.ingredients)) {
        return;
      }

      recipe.ingredients.forEach((ingredientValue) => {
        if (
          !ingredientValue ||
          typeof ingredientValue !== 'object' ||
          Array.isArray(ingredientValue)
        ) {
          return;
        }

        const ingredient =
          ingredientValue as Record<string, unknown>;

        const name = cleanName(
          ingredient.name ||
          ingredient.ingredientName,
        );

        const purchaseUnit = normalizeUnit(
          ingredient.rateUnit ||
          ingredient.unit,
        );

        if (!name || !purchaseUnit) {
          return;
        }

        const id = normalizeIngredientId(
          name,
          purchaseUnit,
        );

        const existing = finalRates.get(id);
        const category =
          existing?.category ||
          inferIngredientCategory(name);

        const recipeMarketRate =
          ingredientRate(ingredient);

        const rate =
          recipeMarketRate > 0
            ? recipeMarketRate
            : fallbackMarketRate(
                category,
                purchaseUnit,
              );

        if (!existing) {
          finalRates.set(id, {
            id,
            name,
            category,
            rate:
              Math.round(rate * 1000) /
              1000,
            unit: purchaseUnit,
          });

          addedIngredients += 1;
          filledRates += 1;
        } else if (!(existing.rate > 0)) {
          finalRates.set(id, {
            ...existing,
            rate:
              Math.round(rate * 1000) /
              1000,
          });

          filledRates += 1;
        }
      });
    });

    const updatedDishes =
      dishes.map((dish) => {
        if (
          !dish ||
          typeof dish !== 'object' ||
          Array.isArray(dish)
        ) {
          return dish;
        }

        const recipe =
          dish as Record<string, unknown>;

        if (
          !Array.isArray(
            recipe.ingredients,
          )
        ) {
          return dish;
        }

        let recipeChanged = false;

        const ingredients =
          recipe.ingredients.map(
            (value) => {
              if (
                !value ||
                typeof value !==
                  'object' ||
                Array.isArray(value)
              ) {
                return value;
              }

              const item =
                value as Record<
                  string,
                  unknown
                >;

              const name = cleanName(
                item.name ||
                item.ingredientName,
              );

              const purchaseUnit =
                normalizeUnit(
                  item.rateUnit ||
                  item.unit,
                );

              if (
                !name ||
                !purchaseUnit
              ) {
                if (name) {
                  invalidUnitIngredients += 1;
                }

                return value;
              }

              const normalizedId =
                normalizeIngredientId(
                  name,
                  purchaseUnit,
                );

              const linkedRateKey =
                cleanName(
                  item.rateKey,
                );

              let master =
                (
                  linkedRateKey
                    ? finalRates.get(
                        linkedRateKey,
                      )
                    : undefined
                ) ||
                finalRates.get(
                  normalizedId,
                );

              const recipeRate =
                ingredientRate(item);

              const referenceRate =
                median(
                  defaultRateMap.get(
                    normalizedId,
                  ) || [],
                );

              const category =
                master?.category ||
                inferIngredientCategory(
                  name,
                );

              const availableRate =
                recipeRate > 0
                  ? recipeRate
                  : referenceRate > 0
                    ? referenceRate
                    : fallbackMarketRate(
                        category,
                        purchaseUnit,
                      );

              if (!master) {
                master = {
                  id: normalizedId,
                  name,
                  category,
                  rate:
                    Math.round(
                      availableRate *
                        100,
                    ) / 100,
                  unit: purchaseUnit,
                };

                finalRates.set(
                  master.id,
                  master,
                );

                addedIngredients += 1;

                if (
                  master.rate > 0
                ) {
                  filledRates += 1;
                }
              } else if (
                !(master.rate > 0) &&
                availableRate > 0
              ) {
                master = {
                  ...master,
                  rate:
                    Math.round(
                      availableRate *
                        100,
                    ) / 100,
                };

                finalRates.set(
                  master.id,
                  master,
                );

                filledRates += 1;
              }

              linkedIngredients += 1;
              recipeChanged = true;

              return {
                ...item,

                name: master.name,

                rateKey:
                  master.id,

                rate:
                  master.rate,

                marketRate:
                  master.rate,

                rateUnit:
                  master.unit,
              };
            },
          );

        return recipeChanged
          ? {
              ...recipe,
              ingredients,
            }
          : dish;
      });

    const rates =
      Array.from(
        finalRates.values(),
      ).sort((left, right) =>
        left.name.localeCompare(
          right.name,
          undefined,
          {
            sensitivity: 'base',
          },
        ),
      );

    const stillMissing =
      rates.filter(
        (rate) =>
          !(Number(rate.rate) > 0),
      );

    const categories =
      categoriesFor(
        catalog.ingredientCategories,
        rates,
      );

    await prisma.recipeCatalog.update({
      where: {
        id: CATALOG_ID,
      },
      data: {
        rates:
          rates as unknown as Prisma.InputJsonValue,

        dishes:
          updatedDishes as Prisma.InputJsonValue,

        ingredientCategories:
          categories as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      ok: true,

      totalIngredients:
        rates.length,

      addedIngredients,

      filledRates,

      linkedIngredients,

      stillMissingRates:
        stillMissing.length,

      missingRateNames:
        stillMissing
          .slice(0, 50)
          .map((rate) => rate.name),

      invalidUnitIngredients,
    });
  } catch (error) {
    console.error(
      'Fill missing ingredient rates:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Failed to fill missing ingredient rates',
      },
      { status: 500 },
    );
  }
}
