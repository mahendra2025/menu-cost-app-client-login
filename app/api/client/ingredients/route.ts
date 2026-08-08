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

async function getTenantId() {
  const cookieStore = await cookies();

  return readClientSessionToken(
    cookieStore.get(
      getClientCookieName(),
    )?.value,
  );
}

function recipeIngredientUsage(dishes: unknown) {
  const usage = new Map<
    string,
    Array<{
      id: string;
      name: string;
    }>
  >();

  if (!Array.isArray(dishes)) {
    return usage;
  }

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
    );

    const seen =
      new Set<string>();

    recipe.ingredients.forEach(
      (value) => {
        if (
          !value ||
          typeof value !== 'object' ||
          Array.isArray(value)
        ) return;

        const ingredient =
          value as Record<
            string,
            unknown
          >;

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
      },
    );
  });

  return usage;
}

export async function GET() {
  try {
    const tenantId =
      await getTenantId();

    if (!tenantId) {
      return NextResponse.json(
        {
          error:
            'Client login required',
        },
        { status: 401 },
      );
    }

    const [catalog, overrides] =
      await Promise.all([
        prisma.recipeCatalog.findUnique({
          where: {
            id: CATALOG_ID,
          },
          select: {
            rates: true,
            dishes: true,
            updatedAt: true,
          },
        }),

        prisma.tenantIngredientRate.findMany({
          where: {
            tenantId,
          },
          select: {
            ingredientId: true,
            rate: true,
            updatedAt: true,
          },
        }),
      ]);

    if (!catalog) {
      return NextResponse.json({
        rates: [],
        usage: {},
      });
    }

    const overrideMap =
      new Map(
        overrides.map(
          (item) => [
            item.ingredientId,
            item,
          ],
        ),
      );

    const masterRates =
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

    const rates =
      masterRates.map((master) => {
        const custom =
          overrideMap.get(master.id);

        return {
          ...master,

          defaultRate:
            master.rate,

          rate:
            custom?.rate ??
            master.rate,

          isCustomRate:
            Boolean(custom),

          customUpdatedAt:
            custom?.updatedAt ??
            null,
        };
      });

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
  } catch (error) {
    console.error(
      'Client Ingredient Index GET:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Failed to load Ingredient Index',
      },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
) {
  try {
    const tenantId =
      await getTenantId();

    if (!tenantId) {
      return NextResponse.json(
        {
          error:
            'Client login required',
        },
        { status: 401 },
      );
    }

    const body =
      await request.json() as {
        rates?: Array<{
          ingredientId?: string;
          rate?: number;
        }>;

        resetIngredientIds?: string[];
      };

    const submitted =
      Array.isArray(body.rates)
        ? body.rates
        : [];

    const resetIds =
      Array.isArray(
        body.resetIngredientIds,
      )
        ? Array.from(
            new Set(
              body.resetIngredientIds
                .map(String)
                .map(
                  (value) =>
                    value.trim(),
                )
                .filter(Boolean),
            ),
          )
        : [];

    const catalog =
      await prisma.recipeCatalog.findUnique({
        where: {
          id: CATALOG_ID,
        },
        select: {
          rates: true,
        },
      });

    if (!catalog) {
      return NextResponse.json(
        {
          error:
            'Ingredient Master not available',
        },
        { status: 404 },
      );
    }

    const masterRates =
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

    const validIds =
      new Set(
        masterRates.map(
          (rate) => rate.id,
        ),
      );

    for (const item of submitted) {
      const ingredientId =
        String(
          item.ingredientId || '',
        ).trim();

      const rate =
        Number(item.rate);

      if (
        !validIds.has(
          ingredientId,
        )
      ) {
        return NextResponse.json(
          {
            error:
              'Invalid ingredient',
          },
          { status: 400 },
        );
      }

      if (
        !Number.isFinite(rate) ||
        rate <= 0
      ) {
        return NextResponse.json(
          {
            error:
              'Ingredient rate must be greater than ₹0',
          },
          { status: 400 },
        );
      }
    }

    for (const id of resetIds) {
      if (!validIds.has(id)) {
        return NextResponse.json(
          {
            error:
              'Invalid ingredient reset request',
          },
          { status: 400 },
        );
      }
    }

    await prisma.$transaction(
      async (tx) => {
        if (resetIds.length) {
          await tx.tenantIngredientRate.deleteMany({
            where: {
              tenantId,
              ingredientId: {
                in: resetIds,
              },
            },
          });
        }

        for (const item of submitted) {
          const ingredientId =
            String(
              item.ingredientId,
            ).trim();

          const rate =
            Number(item.rate);

          await tx.tenantIngredientRate.upsert({
            where: {
              tenantId_ingredientId: {
                tenantId,
                ingredientId,
              },
            },

            create: {
              tenantId,
              ingredientId,
              rate,
            },

            update: {
              rate,
            },
          });
        }
      },
    );

    return NextResponse.json({
      ok: true,
      updated:
        submitted.length,
      reset:
        resetIds.length,
    });
  } catch (error) {
    console.error(
      'Client Ingredient Index PUT:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Failed to save personal ingredient rates',
      },
      { status: 500 },
    );
  }
}
