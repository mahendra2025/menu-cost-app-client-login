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

import { prisma } from '../../../../../lib/prisma';

const CATALOG_ID =
  'global';

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

function readRates(
  value: unknown,
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(
      normalizeIngredientRate,
    )
    .filter(
      (
        rate,
      ): rate is IngredientRate =>
        Boolean(rate),
    );
}

function replaceRecipeRate(
  dishes: unknown,
  originalId: string,
  next: IngredientRate,
) {
  if (!Array.isArray(dishes)) {
    return dishes;
  }

  return dishes.map(
    (dish) => {
      if (
        !dish ||
        typeof dish !==
          'object' ||
        Array.isArray(dish)
      ) {
        return dish;
      }

      const row =
        dish as Record<
          string,
          unknown
        >;

      if (
        !Array.isArray(
          row.ingredients,
        )
      ) {
        return dish;
      }

      return {
        ...row,

        ingredients:
          row.ingredients.map(
            (ingredient) => {
              if (
                !ingredient ||
                typeof ingredient !==
                  'object' ||
                Array.isArray(
                  ingredient,
                )
              ) {
                return ingredient;
              }

              const item =
                ingredient as Record<
                  string,
                  unknown
                >;

              if (
                String(
                  item.rateKey ||
                  '',
                ) !==
                originalId
              ) {
                return ingredient;
              }

              return {
                ...item,
                name:
                  next.name,
                rateKey:
                  next.id,
                rate:
                  next.rate,
                rateUnit:
                  next.unit,
              };
            },
          ),
      };
    },
  );
}

function ingredientUsageCount(
  dishes: unknown,
  ingredientId: string,
) {
  if (!Array.isArray(dishes)) {
    return 0;
  }

  let count = 0;

  dishes.forEach(
    (dish) => {
      if (
        !dish ||
        typeof dish !==
          'object'
      ) {
        return;
      }

      const row =
        dish as Record<
          string,
          unknown
        >;

      if (
        !Array.isArray(
          row.ingredients,
        )
      ) {
        return;
      }

      if (
        row.ingredients.some(
          (ingredient) =>
            ingredient &&
            typeof ingredient ===
              'object' &&
            String(
              (
                ingredient as Record<
                  string,
                  unknown
                >
              ).rateKey ||
              '',
            ) ===
              ingredientId,
        )
      ) {
        count += 1;
      }
    },
  );

  return count;
}

export async function PATCH(
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

    const originalId =
      String(
        body.originalId ||
        body.id ||
        '',
      ).trim();

    const normalized =
      normalizeIngredientRate(
        body,
      );

    if (
      !normalized ||
      !(
        Number(
          normalized.rate,
        ) > 0
      )
    ) {
      return NextResponse.json(
        {
          error:
            'Ingredient needs a valid name, category, unit and rate greater than ₹0.',
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
        });

    if (!catalog) {
      return NextResponse.json(
        {
          error:
            'Ingredient catalog is not initialized.',
        },
        {
          status: 404,
        },
      );
    }

    const rates =
      readRates(
        catalog.rates,
      );

    const existingIndex =
      rates.findIndex(
        (rate) =>
          rate.id ===
          originalId,
      );

    const duplicate =
      rates.find(
        (rate, index) =>
          rate.id ===
            normalized.id &&
          index !==
            existingIndex,
      );

    if (duplicate) {
      return NextResponse.json(
        {
          error:
            'Ingredient name and unit combination already exists.',
        },
        {
          status: 409,
        },
      );
    }

    const nextRates =
      [...rates];

    if (
      existingIndex >= 0
    ) {
      nextRates[
        existingIndex
      ] = normalized;
    } else {
      nextRates.push(
        normalized,
      );
    }

    const dishes =
      replaceRecipeRate(
        catalog.dishes,
        originalId ||
          normalized.id,
        normalized,
      );

    await prisma
      .recipeCatalog
      .update({
        where: {
          id: CATALOG_ID,
        },
        data: {
          rates:
            nextRates as Prisma.InputJsonValue,

          dishes:
            dishes as Prisma.InputJsonValue,
        },
      });

    return NextResponse.json({
      ok: true,
      rate:
        normalized,
    });

  } catch (error) {
    console.error(
      'Ingredient PATCH failed:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Failed to save ingredient.',
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(
  request: Request,
) {
  try {
    const authError =
      await requireAdmin();

    if (authError) {
      return authError;
    }

    const id =
      String(
        new URL(
          request.url,
        ).searchParams.get(
          'id',
        ) || '',
      ).trim();

    if (!id) {
      return NextResponse.json(
        {
          error:
            'Ingredient id is required.',
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
        });

    if (!catalog) {
      return NextResponse.json(
        {
          error:
            'Ingredient catalog not found.',
        },
        {
          status: 404,
        },
      );
    }

    const usedBy =
      ingredientUsageCount(
        catalog.dishes,
        id,
      );

    if (usedBy > 0) {
      return NextResponse.json(
        {
          error:
            `Ingredient is used by ${usedBy} recipe${usedBy === 1 ? '' : 's'} and cannot be deleted.`,
        },
        {
          status: 409,
        },
      );
    }

    const rates =
      readRates(
        catalog.rates,
      );

    const nextRates =
      rates.filter(
        (rate) =>
          rate.id !== id,
      );

    if (
      nextRates.length ===
      rates.length
    ) {
      return NextResponse.json(
        {
          error:
            'Ingredient not found.',
        },
        {
          status: 404,
        },
      );
    }

    await prisma
      .recipeCatalog
      .update({
        where: {
          id: CATALOG_ID,
        },
        data: {
          rates:
            nextRates as Prisma.InputJsonValue,
        },
      });

    return NextResponse.json({
      ok: true,
      deleted: id,
    });

  } catch (error) {
    console.error(
      'Ingredient DELETE failed:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Failed to delete ingredient.',
      },
      {
        status: 500,
      },
    );
  }
}
