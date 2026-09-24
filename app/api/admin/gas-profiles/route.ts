import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import {
  getAdminCookieName,
  isValidAdminSessionToken,
} from '../../../../lib/adminAuth';
import { prisma } from '../../../../lib/prisma';
import { suggestSweetGas } from '../../../../lib/sweetGas';

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

const realProfileWhere: Prisma.DishMasterItemWhereInput = {
  AND: [
    { gasNoGas: false },
    { gasBurnerKgPerHour: { not: null } },
    { gasCookingMinutes: { not: null } },
    { gasBurnerCount: { not: null } },
    { gasBatchPax: { not: null } },
  ],
};

const measuredOnlyWhere: Prisma.DishMasterItemWhereInput = {
  gasNoGas: false,
  gasKgPer100: { not: null },
  gasBurnerKgPerHour: null,
};

const fallbackWhere: Prisma.DishMasterItemWhereInput = {
  gasNoGas: false,
  gasKgPer100: null,
  gasBurnerKgPerHour: null,
};

const noGasWhere: Prisma.DishMasterItemWhereInput = {
  gasNoGas: true,
};

function profileFilter(
  status: string,
): Prisma.DishMasterItemWhereInput | undefined {
  if (status === 'REAL') return realProfileWhere;
  if (status === 'MEASURED') return measuredOnlyWhere;
  if (status === 'FALLBACK') return fallbackWhere;
  return undefined;
}

function optionalNumber(
  value: unknown,
) {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ''
  ) {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number)
    ? number
    : NaN;
}

function updateRecipeGasFields(
  value: unknown,
  dishName: string,
  gas: {
    gasKgPer100: number | null;
    gasBurnerKgPerHour: number | null;
    gasCookingMinutes: number | null;
    gasBurnerCount: number | null;
    gasBatchPax: number | null;
    gasNoGas: boolean;
  },
) {
  if (!Array.isArray(value)) return value;

  const key = dishName.trim().toLocaleLowerCase('en-IN');

  return value.map((dish) => {
    if (
      !dish ||
      typeof dish !== 'object' ||
      Array.isArray(dish)
    ) {
      return dish;
    }

    const row = dish as Record<string, unknown>;
    const name = String(
      row.dishName ||
      row.name ||
      '',
    )
      .trim()
      .toLocaleLowerCase('en-IN');

    if (name !== key) return dish;

    return {
      ...row,
      ...gas,
    };
  });
}

export async function GET(
  request: Request,
) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const url = new URL(request.url);
    const q = String(
      url.searchParams.get('q') || '',
    ).trim();
    const category = String(
      url.searchParams.get('category') || '',
    ).trim();
    const status = String(
      url.searchParams.get('status') || 'ALL',
    )
      .trim()
      .toUpperCase();

    const page = Math.max(
      1,
      Math.round(
        Number(
          url.searchParams.get('page'),
        ) || 1,
      ),
    );

    const limit = Math.min(
      100,
      Math.max(
        10,
        Math.round(
          Number(
            url.searchParams.get('limit'),
          ) || 36,
        ),
      ),
    );

    const filters:
      Prisma.DishMasterItemWhereInput[] = [];

    if (q) {
      filters.push({
        OR: [
          {
            name: {
              contains: q,
              mode: 'insensitive',
            },
          },
          {
            category: {
              contains: q,
              mode: 'insensitive',
            },
          },
        ],
      });
    }

    if (category && category !== 'ALL') {
      filters.push({
        category,
      });
    }

    const statusWhere =
      profileFilter(status);

    if (statusWhere) {
      filters.push(statusWhere);
    }

    const where:
      Prisma.DishMasterItemWhereInput =
      filters.length
        ? { AND: filters }
        : {};

    const [
      total,
      items,
      categoryRows,
      totalDishes,
      realCount,
      measuredCount,
      fallbackCount,
      noGasCount,
    ] = await Promise.all([
      prisma.dishMasterItem.count({
        where,
      }),
      prisma.dishMasterItem.findMany({
        where,
        orderBy: {
          name: 'asc',
        },
        skip:
          (page - 1) *
          limit,
        take: limit,
        select: {
          id: true,
          name: true,
          category: true,
          gasKgPer100: true,
          gasBurnerKgPerHour: true,
          gasCookingMinutes: true,
          gasBurnerCount: true,
          gasBatchPax: true,
          gasNoGas: true,
        },
      }),
      prisma.dishMasterItem.findMany({
        distinct: ['category'],
        orderBy: {
          category: 'asc',
        },
        select: {
          category: true,
        },
      }),
      prisma.dishMasterItem.count(),
      prisma.dishMasterItem.count({
        where: realProfileWhere,
      }),
      prisma.dishMasterItem.count({
        where: measuredOnlyWhere,
      }),
      prisma.dishMasterItem.count({
        where: fallbackWhere,
      }),
      prisma.dishMasterItem.count({
        where: noGasWhere,
      }),
    ]);

    return NextResponse.json({
      items,
      categories:
        categoryRows
          .map((row) =>
            row.category.trim(),
          )
          .filter(Boolean),
      summary: {
        total: totalDishes,
        real: realCount,
        measured: measuredCount,
        fallback: fallbackCount,
        noGas: noGasCount,
      },
      pagination: {
        page,
        limit,
        total,
        pageCount:
          Math.max(
            1,
            Math.ceil(
              total /
              limit,
            ),
          ),
      },
    });
  } catch (error) {
    console.error(
      'Admin Gas Profiles GET:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Failed to load dish gas profiles.',
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
    const authError = await requireAdmin();
    if (authError) return authError;

    const body =
      await request.json().catch(
        () => ({}),
      ) as Record<string, unknown>;

    if (
      body.action !==
      'APPLY_SWEET_DEFAULTS'
    ) {
      return NextResponse.json(
        {
          error:
            'Unsupported gas profile action.',
        },
        {
          status: 400,
        },
      );
    }

    const result =
      await prisma.$transaction(
        async (tx) => {
          const sweets =
            await tx
              .dishMasterItem
              .findMany({
                where: {
                  category: {
                    equals:
                      'Sweet',
                    mode:
                      'insensitive',
                  },
                  gasNoGas:
                    false,
                  gasKgPer100:
                    null,
                  gasBurnerKgPerHour:
                    null,
                },
                select: {
                  id: true,
                  name: true,
                },
              });

          const applied:
            Array<{
              name: string;
              gasKgPer100: number;
              gasNoGas: boolean;
            }> = [];

          for (
            const sweet
            of sweets
          ) {
            const suggestion =
              suggestSweetGas(
                sweet.name,
              );

            await tx
              .dishMasterItem
              .update({
                where: {
                  id:
                    sweet.id,
                },
                data: {
                  gasKgPer100:
                    suggestion
                      .kgPer100,
                  gasNoGas:
                    suggestion
                      .noGas,
                  gasBurnerKgPerHour:
                    null,
                  gasCookingMinutes:
                    null,
                  gasBurnerCount:
                    null,
                  gasBatchPax:
                    null,
                },
              });

            applied.push({
              name:
                sweet.name,
              gasKgPer100:
                suggestion
                  .kgPer100,
              gasNoGas:
                suggestion
                  .noGas,
            });
          }

          const recipeCatalog =
            await tx
              .recipeCatalog
              .findUnique({
                where: {
                  id: 'global',
                },
                select: {
                  dishes: true,
                },
              });

          if (
            recipeCatalog &&
            applied.length
          ) {
            let dishes:
              unknown =
              recipeCatalog.dishes;

            for (
              const sweet
              of applied
            ) {
              dishes =
                updateRecipeGasFields(
                  dishes,
                  sweet.name,
                  {
                    gasKgPer100:
                      sweet
                        .gasKgPer100,
                    gasBurnerKgPerHour:
                      null,
                    gasCookingMinutes:
                      null,
                    gasBurnerCount:
                      null,
                    gasBatchPax:
                      null,
                    gasNoGas:
                      sweet
                        .gasNoGas,
                  },
                );
            }

            await tx
              .recipeCatalog
              .update({
                where: {
                  id:
                    'global',
                },
                data: {
                  dishes:
                    dishes as
                      Prisma.InputJsonValue,
                },
              });
          }

          return {
            updated:
              applied.length,
          };
        },
      );

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    console.error(
      'Admin Sweet Gas Defaults POST:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Failed to apply Sweet gas defaults.',
      },
      {
        status: 500,
      },
    );
  }
}

export async function PATCH(
  request: Request,
) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const body =
      await request.json() as
        Record<string, unknown>;

    const id =
      String(
        body.id || '',
      ).trim();

    if (!id) {
      return NextResponse.json(
        {
          error:
            'Dish ID is required.',
        },
        {
          status: 400,
        },
      );
    }

    const gasKgPer100 =
      optionalNumber(
        body.gasKgPer100,
      );
    const gasBurnerKgPerHour =
      optionalNumber(
        body.gasBurnerKgPerHour,
      );
    const gasCookingMinutes =
      optionalNumber(
        body.gasCookingMinutes,
      );
    const gasBurnerCountRaw =
      optionalNumber(
        body.gasBurnerCount,
      );
    const gasBatchPaxRaw =
      optionalNumber(
        body.gasBatchPax,
      );

    const gasNoGas =
      body.gasNoGas ===
      true;

    const submitted = [
      gasKgPer100,
      gasBurnerKgPerHour,
      gasCookingMinutes,
      gasBurnerCountRaw,
      gasBatchPaxRaw,
    ];

    if (
      submitted.some(
        (value) =>
          value !== null &&
          (
            !Number.isFinite(value) ||
            value < 0
          ),
      )
    ) {
      return NextResponse.json(
        {
          error:
            'Gas values must be valid numbers of 0 or more.',
        },
        {
          status: 400,
        },
      );
    }

    const realValues = [
      gasBurnerKgPerHour,
      gasCookingMinutes,
      gasBurnerCountRaw,
      gasBatchPaxRaw,
    ];

    const hasAnyReal =
      realValues.some(
        (value) =>
          value !== null,
      );

    const hasCompleteReal =
      realValues.every(
        (value) =>
          value !== null &&
          Number.isFinite(value) &&
          value > 0,
      );

    if (
      hasAnyReal &&
      !hasCompleteReal
    ) {
      return NextResponse.json(
        {
          error:
            'Real profile needs burner kg/hour, cooking minutes, burner count and batch guests — all greater than 0.',
        },
        {
          status: 400,
        },
      );
    }

    const gas = gasNoGas
      ? {
          gasKgPer100: 0,
          gasBurnerKgPerHour: null,
          gasCookingMinutes: null,
          gasBurnerCount: null,
          gasBatchPax: null,
          gasNoGas: true,
        }
      : {
          gasKgPer100:
            gasKgPer100 === null
              ? null
              : Math.max(
                  0,
                  gasKgPer100,
                ),
          gasBurnerKgPerHour:
            hasCompleteReal
              ? Math.max(
                  0,
                  Number(
                    gasBurnerKgPerHour,
                  ),
                )
              : null,
          gasCookingMinutes:
            hasCompleteReal
              ? Math.max(
                  0,
                  Number(
                    gasCookingMinutes,
                  ),
                )
              : null,
          gasBurnerCount:
            hasCompleteReal
              ? Math.max(
                  1,
                  Math.round(
                    Number(
                      gasBurnerCountRaw,
                    ),
                  ),
                )
              : null,
          gasBatchPax:
            hasCompleteReal
              ? Math.max(
                  1,
                  Math.round(
                    Number(
                      gasBatchPaxRaw,
                    ),
                  ),
                )
              : null,
          gasNoGas: false,
        };

    const saved =
      await prisma.$transaction(
        async (tx) => {
          const existing =
            await tx
              .dishMasterItem
              .findUnique({
                where: {
                  id,
                },
                select: {
                  id: true,
                  name: true,
                },
              });

          if (!existing) {
            return null;
          }

          const row =
            await tx
              .dishMasterItem
              .update({
                where: {
                  id,
                },
                data: gas,
                select: {
                  id: true,
                  name: true,
                  category: true,
                  gasKgPer100: true,
                  gasBurnerKgPerHour: true,
                  gasCookingMinutes: true,
                  gasBurnerCount: true,
                  gasBatchPax: true,
                  gasNoGas: true,
                },
              });

          const recipeCatalog =
            await tx
              .recipeCatalog
              .findUnique({
                where: {
                  id: 'global',
                },
                select: {
                  dishes: true,
                },
              });

          if (recipeCatalog) {
            const dishes =
              updateRecipeGasFields(
                recipeCatalog.dishes,
                existing.name,
                gas,
              );

            await tx
              .recipeCatalog
              .update({
                where: {
                  id: 'global',
                },
                data: {
                  dishes:
                    dishes as
                      Prisma.InputJsonValue,
                },
              });
          }

          return row;
        },
      );

    if (!saved) {
      return NextResponse.json(
        {
          error:
            'Dish not found.',
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      ok: true,
      item: saved,
    });
  } catch (error) {
    console.error(
      'Admin Gas Profiles PATCH:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Failed to save gas profile.',
      },
      {
        status: 500,
      },
    );
  }
}
