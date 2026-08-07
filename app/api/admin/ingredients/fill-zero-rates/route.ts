import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import {
  getAdminCookieName,
  isValidAdminSessionToken,
} from '../../../../../lib/adminAuth';

import {
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
  const token = cookieStore.get(getAdminCookieName())?.value;

  if (!isValidAdminSessionToken(token)) {
    return NextResponse.json(
      { error: 'Admin login required' },
      { status: 401 },
    );
  }

  return null;
}

function clean(value: unknown) {
  return String(value || '')
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('en-IN')
    .replace(/\s+/g, ' ');
}

function normalizeUnit(value: unknown): IngredientUnit | null {
  const unit = clean(value);

  const aliases: Record<string, IngredientUnit> = {
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

    pc: 'piece',
    pcs: 'piece',
    piece: 'piece',
    pieces: 'piece',

    pkt: 'packet',
    pack: 'packet',
    packet: 'packet',
    packets: 'packet',
  };

  return aliases[unit] || null;
}

function median(values: number[]) {
  const valid = values
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b);

  if (!valid.length) return 0;

  const middle = Math.floor(valid.length / 2);

  return valid.length % 2
    ? valid[middle]
    : (valid[middle - 1] + valid[middle]) / 2;
}

function readIngredientRate(item: Record<string, unknown>) {
  const candidates = [
    Number(item.marketRate),
    Number(item.rate),
  ].filter((value) => Number.isFinite(value) && value > 0);

  return candidates[0] || 0;
}

/*
 * Reference catering purchase rates.
 * These are FALLBACK estimates only.
 * Existing positive Ingredient Master rates are never overwritten.
 */
const REFERENCE_KG_RATES: Record<string, number> = {
  'atta': 45,
  'wheat flour': 45,
  'maida': 45,
  'besan': 90,
  'rava': 55,
  'suji': 55,

  'rice': 60,
  'basmati rice': 110,
  'poha': 60,

  'toor dal': 150,
  'tur dal': 150,
  'moong dal': 130,
  'chana dal': 95,
  'urad dal': 130,
  'masoor dal': 100,

  'paneer': 280,
  'curd': 70,
  'dahi': 70,
  'cheese': 420,
  'cream': 220,
  'fresh cream': 220,
  'butter': 520,
  'ghee': 620,
  'khoya': 320,
  'mawa': 320,

  'onion': 30,
  'tomato': 35,
  'potato': 28,
  'capsicum': 80,
  'cauliflower': 60,
  'cabbage': 40,
  'carrot': 50,
  'beetroot': 60,
  'cucumber': 50,
  'ginger': 120,
  'garlic': 180,
  'green chilli': 100,
  'coriander leaves': 120,
  'mint leaves': 100,
  'spinach': 50,
  'green peas': 120,
  'mushroom': 200,
  'broccoli': 250,
  'sweet corn': 100,
  'lemon': 80,

  'sugar': 45,
  'jaggery': 60,
  'salt': 20,

  'red chilli powder': 280,
  'turmeric powder': 180,
  'turmeric': 180,
  'cumin': 420,
  'cumin seeds': 420,
  'jeera': 420,
  'coriander powder': 180,
  'black pepper': 650,
  'cardamom': 2200,
  'green cardamom': 2200,
  'cinnamon': 450,
  'clove': 900,
  'ajwain': 350,
  'hing': 2500,

  'cashew': 800,
  'kaju': 800,
  'almond': 850,
  'badam': 850,
  'raisin': 320,
  'kishmish': 320,
  'pistachio': 1200,

  'noodles': 120,
  'pasta': 140,

  'apple': 180,
  'banana': 60,
  'orange': 80,
  'mango': 150,
  'pineapple': 80,
  'watermelon': 35,
  'pomegranate': 180,
  'grapes': 120,
  'papaya': 50,
  'guava': 70,

  'ice': 10,
};

const REFERENCE_LTR_RATES: Record<string, number> = {
  'milk': 60,
  'cooking oil': 150,
  'oil': 150,
  'sunflower oil': 150,
  'soybean oil': 140,
  'mustard oil': 170,
  'soy sauce': 110,
  'vinegar': 80,
  'water': 2,
  'juice': 100,
};

function exactReferenceRate(
  name: string,
  unit: IngredientUnit,
) {
  const key = clean(name);

  if (unit === 'kg') {
    return REFERENCE_KG_RATES[key] || 0;
  }

  if (unit === 'gram') {
    const perKg = REFERENCE_KG_RATES[key] || 0;
    return perKg ? perKg / 1000 : 0;
  }

  if (unit === 'ltr') {
    return REFERENCE_LTR_RATES[key] || 0;
  }

  if (unit === 'ml') {
    const perLitre = REFERENCE_LTR_RATES[key] || 0;
    return perLitre ? perLitre / 1000 : 0;
  }

  return 0;
}

function fallbackBaseRate(
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

  if (unit === 'kg') {
    return perKg[category] || 100;
  }

  if (unit === 'gram') {
    return (perKg[category] || 100) / 1000;
  }

  if (unit === 'ltr') {
    return perLitre[category] || perKg[category] || 100;
  }

  if (unit === 'ml') {
    return (perLitre[category] || perKg[category] || 100) / 1000;
  }

  if (unit === 'piece') {
    return category === 'Bakery & Packaged' ? 10 : 5;
  }

  if (unit === 'packet') {
    return category === 'Bakery & Packaged' ? 20 : 10;
  }

  return 1;
}

function recipeRateMap(dishes: unknown[]) {
  const map = new Map<string, number[]>();

  const allRecipes = [
    ...(Array.isArray(defaultRecipesData)
      ? defaultRecipesData
      : []),
    ...dishes,
  ];

  allRecipes.forEach((value) => {
    if (
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value)
    ) {
      return;
    }

    const recipe = value as Record<string, unknown>;

    if (!Array.isArray(recipe.ingredients)) return;

    recipe.ingredients.forEach((value) => {
      if (
        !value ||
        typeof value !== 'object' ||
        Array.isArray(value)
      ) {
        return;
      }

      const ingredient = value as Record<string, unknown>;

      const name = String(
        ingredient.name ||
        ingredient.ingredientName ||
        '',
      ).trim();

      const unit = normalizeUnit(
        ingredient.rateUnit ||
        ingredient.unit,
      );

      const rate = readIngredientRate(ingredient);

      if (!name || !unit || !(rate > 0)) return;

      const id = normalizeIngredientId(name, unit);

      map.set(id, [
        ...(map.get(id) || []),
        rate,
      ]);
    });
  });

  return map;
}

export async function POST() {
  try {
    const authError = await requireAdmin();

    if (authError) return authError;

    const catalog = await prisma.recipeCatalog.findUnique({
      where: { id: CATALOG_ID },
    });

    if (!catalog) {
      return NextResponse.json(
        { error: 'Recipe catalog is not initialized.' },
        { status: 404 },
      );
    }

    const dishes = Array.isArray(catalog.dishes)
      ? catalog.dishes
      : [];

    const rates = Array.isArray(catalog.rates)
      ? catalog.rates
          .map(normalizeIngredientRate)
          .filter(
            (rate): rate is IngredientRate =>
              Boolean(rate),
          )
      : [];

    const recipeRates = recipeRateMap(dishes);

    let fromRecipeData = 0;
    let fromExactReference = 0;
    let fromCategoryEstimate = 0;

    const updatedRates = rates.map((rate) => {
      /*
       * NEVER overwrite an existing positive rate.
       */
      if (Number(rate.rate) > 0) {
        return rate;
      }

      const id = normalizeIngredientId(
        rate.name,
        rate.unit,
      );

      /*
       * Priority 1:
       * Existing recipe/defaultRecipe rate.
       */
      const recipeRate = median(
        recipeRates.get(id) || [],
      );

      if (recipeRate > 0) {
        fromRecipeData += 1;

        return {
          ...rate,
          rate:
            Math.round(recipeRate * 1000) /
            1000,
        };
      }

      /*
       * Priority 2:
       * Known ingredient reference rate.
       */
      const referenceRate =
        exactReferenceRate(
          rate.name,
          rate.unit,
        );

      if (referenceRate > 0) {
        fromExactReference += 1;

        return {
          ...rate,
          rate:
            Math.round(referenceRate * 1000) /
            1000,
        };
      }

      /*
       * Priority 3:
       * Category reference estimate.
       * This guarantees no ₹0 ingredient remains.
       */
      const category =
        rate.category ||
        inferIngredientCategory(rate.name);

      const estimatedRate =
        fallbackBaseRate(
          category,
          rate.unit,
        );

      fromCategoryEstimate += 1;

      return {
        ...rate,
        category,
        rate:
          Math.max(
            0.001,
            Math.round(
              estimatedRate * 1000,
            ) / 1000,
          ),
      };
    });

    const ratesById = new Map(
      updatedRates.map((rate) => [
        rate.id,
        rate,
      ]),
    );

    /*
     * Push the newly filled rates into linked recipes too.
     */
    const updatedDishes = dishes.map((value) => {
      if (
        !value ||
        typeof value !== 'object' ||
        Array.isArray(value)
      ) {
        return value;
      }

      const recipe = value as Record<string, unknown>;

      if (!Array.isArray(recipe.ingredients)) {
        return value;
      }

      return {
        ...recipe,

        ingredients: recipe.ingredients.map((value) => {
          if (
            !value ||
            typeof value !== 'object' ||
            Array.isArray(value)
          ) {
            return value;
          }

          const ingredient =
            value as Record<string, unknown>;

          const name = String(
            ingredient.name ||
            ingredient.ingredientName ||
            '',
          ).trim();

          const unit = normalizeUnit(
            ingredient.rateUnit ||
            ingredient.unit,
          );

          if (!name || !unit) return value;

          const existingRateKey =
            String(
              ingredient.rateKey || '',
            ).trim();

          const id =
            existingRateKey ||
            normalizeIngredientId(
              name,
              unit,
            );

          const masterRate =
            ratesById.get(id) ||
            ratesById.get(
              normalizeIngredientId(
                name,
                unit,
              ),
            );

          if (!masterRate) return value;

          return {
            ...ingredient,
            name: masterRate.name,
            rateKey: masterRate.id,
            rate: masterRate.rate,
            marketRate: masterRate.rate,
            rateUnit: masterRate.unit,
          };
        }),
      };
    });

    await prisma.recipeCatalog.update({
      where: { id: CATALOG_ID },

      data: {
        rates:
          updatedRates as unknown as Prisma.InputJsonValue,

        dishes:
          updatedDishes as Prisma.InputJsonValue,
      },
    });

    const stillZero = updatedRates.filter(
      (rate) => !(Number(rate.rate) > 0),
    ).length;

    return NextResponse.json({
      ok: true,
      updated:
        fromRecipeData +
        fromExactReference +
        fromCategoryEstimate,

      fromRecipeData,
      fromExactReference,
      fromCategoryEstimate,

      stillZero,
      totalIngredients:
        updatedRates.length,
    });
  } catch (error) {
    console.error(
      'Fill zero ingredient rates failed:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Failed to fill zero ingredient rates',
      },
      { status: 500 },
    );
  }
}
