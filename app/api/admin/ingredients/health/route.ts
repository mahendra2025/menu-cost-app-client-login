import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  getAdminCookieName,
  isValidAdminSessionToken,
} from '../../../../../lib/adminAuth';
import {
  normalizeIngredientRate,
} from '../../../../../lib/ingredientCatalog';
import {
  buildIngredientRateHealth,
} from '../../../../../lib/ingredientRateHealth';
import { prisma } from '../../../../../lib/prisma';

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

export async function GET() {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const catalog = await prisma.recipeCatalog.findUnique({
      where: {
        id: 'global',
      },
      select: {
        rates: true,
        dishes: true,
        updatedAt: true,
      },
    });

    const rates = Array.isArray(catalog?.rates)
      ? catalog.rates
          .map(normalizeIngredientRate)
          .filter(
            (rate): rate is NonNullable<typeof rate> =>
              Boolean(rate),
          )
      : [];

    const analysis = buildIngredientRateHealth({
      rates,
      recipes:
        Array.isArray(catalog?.dishes)
          ? catalog.dishes
          : [],
      staleAfterDays: 60,
      recentWithinDays: 30,
    });

    const categories = Array.from(
      new Set(
        analysis.items
          .map((item) => item.category)
          .filter(Boolean),
      ),
    ).sort((left, right) =>
      left.localeCompare(right),
    );

    return NextResponse.json({
      ...analysis,
      categories,
      catalogUpdatedAt:
        catalog?.updatedAt || null,
    });
  } catch (error) {
    console.error(
      'Ingredient rate health failed:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Failed to load ingredient rate health.',
      },
      {
        status: 500,
      },
    );
  }
}
