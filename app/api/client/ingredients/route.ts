import { Prisma } from '@prisma/client';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  getClientCookieName,
  readClientSessionToken,
} from '../../../../lib/clientAuth';

import {
  canonicalIngredientName,
  inferIngredientCategory,
  INGREDIENT_UNITS,
  normalizeIngredientId,
  normalizeIngredientRate,
  type IngredientRate,
  type IngredientUnit,
} from '../../../../lib/ingredientCatalog';
import {
  normalizeCityKey,
  normalizeCityName,
  resolveIngredientRate,
} from '../../../../lib/cityIngredientRates';

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

export async function GET(
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

    const [
      catalog,
      overrides,
      tenant,
    ] =
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

        prisma.tenant.findUnique({
          where: {
            id: tenantId,
          },
          select: {
            city: true,
          },
        }),
      ]);

    // Client users are always scoped to the city saved on their
    // caterer account. Ignore any ?city= query parameter so a client
    // cannot browse another market's ingredient rates.
    const effectiveCity =
      normalizeCityName(
        tenant?.city,
      );

    if (!effectiveCity) {
      return NextResponse.json(
        {
          error:
            'Your business city is not set. Ask Super Admin to update the caterer account.',
        },
        { status: 400 },
      );
    }

    const cityKey =
      normalizeCityKey(
        effectiveCity,
      );

    const cityRates =
      cityKey
        ? await prisma.ingredientCityRate.findMany({
            where: {
              cityKey,
            },
            select: {
              ingredientId: true,
              city: true,
              rate: true,
              source: true,
              effectiveDate: true,
              updatedAt: true,
            },
          })
        : [];

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

    const cityRateMap =
      new Map(
        cityRates.map(
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

        const cityRate =
          cityRateMap.get(
            master.id,
          );

        const resolved =
          resolveIngredientRate({
            tenantRate:
              custom?.rate,
            cityRate:
              cityRate?.rate,
            globalRate:
              master.rate,
          });

        const fallback =
          resolveIngredientRate({
            cityRate:
              cityRate?.rate,
            globalRate:
              master.rate,
          });

        return {
          ...master,

          globalRate:
            master.rate,

          cityRate:
            cityRate?.rate ??
            null,

          city:
            cityRate?.city ||
            effectiveCity ||
            '',

          cityRateSource:
            cityRate?.source ||
            '',

          cityRateEffectiveDate:
            cityRate?.effectiveDate ??
            null,

          cityRateUpdatedAt:
            cityRate?.updatedAt ??
            null,

          // Resetting a personal rate should fall back to
          // the event/tenant city rate before the global master.
          defaultRate:
            fallback.rate,

          rate:
            resolved.rate,

          rateSource:
            resolved.source,

          isCustomRate:
            Boolean(custom),

          isCityRate:
            !custom &&
            Boolean(cityRate),

          customUpdatedAt:
            custom?.updatedAt ??
            null,
        };
      });

    return NextResponse.json({
      rates,
      city:
        effectiveCity || '',
      ratePriority: [
        'TENANT',
        'CITY',
        'GLOBAL',
      ],

      // Client UI receives only its own city. City-master
      // browsing and editing stays on Super Admin pages.
      cities: [
        {
          city: effectiveCity,
          cityKey,
        },
      ],

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
          name?: string;
          category?: string;
          unit?: string;
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
          ingredientCategories: true,
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

    const masterById =
      new Map(
        masterRates.map(
          (rate) => [
            rate.id,
            rate,
          ] as const,
        ),
      );

    const createdMasterRates:
      IngredientRate[] = [];

    const effectiveSubmitted:
      Array<{
        ingredientId: string;
        rate: number;
      }> = [];

    const now =
      new Date().toISOString();

    for (const item of submitted) {
      const rate =
        Number(item.rate);

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

      let ingredientId =
        String(
          item.ingredientId || '',
        ).trim();

      if (ingredientId) {
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
      } else {
        const name =
          canonicalIngredientName(
            String(
              item.name || '',
            ),
          );

        const unit =
          String(
            item.unit || '',
          ).trim() as IngredientUnit;

        if (
          !name ||
          !INGREDIENT_UNITS.includes(
            unit,
          )
        ) {
          return NextResponse.json(
            {
              error:
                'Missing ingredients need a valid name and purchase unit',
            },
            { status: 400 },
          );
        }

        ingredientId =
          normalizeIngredientId(
            name,
            unit,
          );

        if (
          !validIds.has(
            ingredientId,
          )
        ) {
          const suppliedCategory =
            String(
              item.category || '',
            )
              .trim()
              .replace(
                /\s+/g,
                ' ',
              );

          const created:
            IngredientRate = {
              id: ingredientId,
              name,
              category:
                suppliedCategory &&
                suppliedCategory.length <=
                  60
                  ? suppliedCategory
                  : inferIngredientCategory(
                      name,
                    ),
              rate:
                Math.round(
                  rate * 100,
                ) / 100,
              unit,
              updatedAt: now,
            };

          createdMasterRates.push(
            created,
          );

          masterById.set(
            ingredientId,
            created,
          );

          validIds.add(
            ingredientId,
          );
        }
      }

      effectiveSubmitted.push({
        ingredientId,
        rate,
      });
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
        if (
          createdMasterRates.length
        ) {
          const rawRates =
            Array.isArray(
              catalog.rates,
            )
              ? catalog.rates
              : [];

          const existingCategories =
            Array.isArray(
              catalog.ingredientCategories,
            )
              ? catalog.ingredientCategories
                  .map((value) =>
                    String(
                      value || '',
                    )
                      .trim()
                      .replace(
                        /\s+/g,
                        ' ',
                      ),
                  )
                  .filter(Boolean)
              : [];

          const categories =
            Array.from(
              new Map(
                [
                  ...existingCategories,
                  ...createdMasterRates.map(
                    (rate) =>
                      rate.category,
                  ),
                ].map(
                  (category) => [
                    category.toLowerCase(),
                    category,
                  ],
                ),
              ).values(),
            );

          await tx.recipeCatalog.update({
            where: {
              id: CATALOG_ID,
            },

            data: {
              rates: [
                ...rawRates,
                ...createdMasterRates,
              ] as Prisma.InputJsonValue,

              ingredientCategories:
                categories as Prisma.InputJsonValue,
            },
          });
        }

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

        for (const item of effectiveSubmitted) {
          const ingredientId =
            item.ingredientId;

          const rate =
            item.rate;

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

    const savedRates =
      effectiveSubmitted.flatMap(
        (item) => {
          const master =
            masterById.get(
              item.ingredientId,
            );

          return master
            ? [
                {
                  ...master,
                  rate: item.rate,
                  defaultRate:
                    master.rate,
                  isCustomRate: true,
                },
              ]
            : [];
        },
      );

    return NextResponse.json({
      ok: true,
      updated:
        effectiveSubmitted.length,
      reset:
        resetIds.length,
      created:
        createdMasterRates.length,
      createdIngredients:
        createdMasterRates,
      savedRates,
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
