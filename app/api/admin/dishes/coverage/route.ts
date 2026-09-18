import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  getAdminCookieName,
  isValidAdminSessionToken,
} from '../../../../../lib/adminAuth';
import { prisma } from '../../../../../lib/prisma';
import {
  buildRecipeCoverage,
} from '../../../../../lib/recipeCoverage';

const USAGE_WINDOW = 250;

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

    const [
      dishes,
      catalog,
      completedCostings,
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
          aliases: true,
        },
      }),

      prisma.recipeCatalog.findUnique({
        where: {
          id: 'global',
        },
        select: {
          dishes: true,
          rates: true,
          updatedAt: true,
        },
      }),

      prisma.tenantCostingHistory.findMany({
        orderBy: {
          completedAt: 'desc',
        },
        take: USAGE_WINDOW,
        select: {
          snapshot: true,
        },
      }),
    ]);

    const analysis = buildRecipeCoverage({
      dishes,
      recipes:
        Array.isArray(catalog?.dishes)
          ? catalog.dishes
          : [],
      rates:
        Array.isArray(catalog?.rates)
          ? catalog.rates
          : [],
      completedSnapshots:
        completedCostings.map(
          (costing) => costing.snapshot,
        ),
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
      usageWindow: {
        completedCostings:
          completedCostings.length,
        maximum:
          USAGE_WINDOW,
      },
      recipeCatalogUpdatedAt:
        catalog?.updatedAt || null,
    });
  } catch (error) {
    console.error(
      'Recipe coverage dashboard failed:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Failed to load recipe coverage.',
      },
      {
        status: 500,
      },
    );
  }
}
