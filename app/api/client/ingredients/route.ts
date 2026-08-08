import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  getClientCookieName,
  readClientSessionToken,
} from '../../../../lib/clientAuth';

import {
  normalizeIngredientRate,
} from '../../../../lib/ingredientCatalog';

import { prisma } from '../../../../lib/prisma';

const CATALOG_ID = 'global';

function recipeIngredientUsage(dishes: unknown) {
  const usage = new Map<
    string,
    Array<{ id: string; name: string }>
  >();

  if (!Array.isArray(dishes)) return usage;

  dishes.forEach((dish, index) => {
    if (
      !dish ||
      typeof dish !== 'object' ||
      Array.isArray(dish)
    ) return;

    const recipe =
      dish as Record<string, unknown>;

    if (!Array.isArray(recipe.ingredients)) {
      return;
    }

    const recipeName = String(
      recipe.name ||
      recipe.dishName ||
      `Recipe ${index + 1}`,
    ).trim();

    const recipeId = String(
      recipe.id ||
      `recipe_${index + 1}`,
    ).trim();

    const seen = new Set<string>();

    recipe.ingredients.forEach((value) => {
      if (
        !value ||
        typeof value !== 'object' ||
        Array.isArray(value)
      ) return;

      const ingredient =
        value as Record<string, unknown>;

      const rateKey =
        String(
          ingredient.rateKey || '',
        ).trim();

      if (
        !rateKey ||
        seen.has(rateKey)
      ) return;

      seen.add(rateKey);

      usage.set(
        rateKey,
        [
          ...(usage.get(rateKey) || []),
          {
            id: recipeId,
            name: recipeName,
          },
        ],
      );
    });
  });

  return usage;
}

export async function GET() {
  try {
    const cookieStore = await cookies();

    const token =
      cookieStore.get(
        getClientCookieName(),
      )?.value;

    const tenantId =
      readClientSessionToken(token);

    if (!tenantId) {
      return NextResponse.json(
        {
          error:
            'Client login required',
        },
        { status: 401 },
      );
    }

    const catalog =
      await prisma.recipeCatalog.findUnique({
        where: {
          id: CATALOG_ID,
        },

        select: {
          rates: true,
          dishes: true,
          updatedAt: true,
        },
      });

    if (!catalog) {
      return NextResponse.json({
        rates: [],
        usage: {},
        updatedAt: null,
      });
    }

    const rates =
      Array.isArray(catalog.rates)
        ? catalog.rates
            .map(normalizeIngredientRate)
            .filter(
              (
                rate,
              ): rate is NonNullable<
                typeof rate
              > => Boolean(rate),
            )
        : [];

    return NextResponse.json({
      rates,

      usage: Object.fromEntries(
        recipeIngredientUsage(
          catalog.dishes,
        ),
      ),

      updatedAt:
        catalog.updatedAt,
    });
  } catch {
    return NextResponse.json(
      {
        error:
          'Failed to load Ingredient Index',
      },
      { status: 500 },
    );
  }
}
