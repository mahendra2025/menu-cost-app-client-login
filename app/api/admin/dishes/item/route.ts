import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import {
  getAdminCookieName,
  isValidAdminSessionToken,
} from '../../../../../lib/adminAuth';

import { prisma } from '../../../../../lib/prisma';

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

function cleanAliases(
  value: unknown,
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Map(
      value
        .map((alias) =>
          String(alias)
            .trim()
            .replace(/\s+/g, ' '),
        )
        .filter(Boolean)
        .map((alias) => [
          alias.toLocaleLowerCase(
            'en-IN',
          ),
          alias,
        ]),
    ).values(),
  );
}

function normalizeDish(
  value: unknown,
) {
  if (
    !value ||
    typeof value !==
      'object'
  ) {
    return null;
  }

  const row =
    value as Record<
      string,
      unknown
    >;

  const id =
    String(
      row.id || '',
    ).trim();

  const originalName =
    String(
      row.originalName ||
      row.name ||
      '',
    ).trim();

  const name =
    String(
      row.name || '',
    )
      .trim()
      .replace(/\s+/g, ' ');

  const category =
    String(
      row.category || '',
    )
      .trim()
      .replace(/\s+/g, ' ');

  const subcategory =
    String(
      row.subcategory || '',
    )
      .trim()
      .replace(/\s+/g, ' ');

  const rate =
    Number(row.rate);

  const servingQuantity =
    Number(
      row.servingQuantity,
    );

  const servingUnit =
    String(
      row.servingUnit ||
      'serving',
    ).trim();

  const aliases =
    cleanAliases(
      row.aliases,
    );

  if (
    !name ||
    !category ||
    category.length > 60 ||
    subcategory.length > 60 ||
    !Number.isFinite(rate) ||
    rate <= 0 ||
    !Number.isFinite(
      servingQuantity,
    ) ||
    servingQuantity <= 0 ||
    !servingUnit
  ) {
    return null;
  }

  return {
    id,
    originalName,
    name,
    category,
    subcategory,
    rate,
    servingQuantity,
    servingUnit,
    aliases,
  };
}

function updateRecipeDish(
  dishes: unknown,
  originalName: string,
  next: {
    name: string;
    category: string;
    subcategory: string;
    rate: number;
    servingQuantity: number;
    servingUnit: string;
    aliases: string[];
  },
) {
  if (
    !Array.isArray(dishes)
  ) {
    return dishes;
  }

  const originalKey =
    originalName
      .trim()
      .toLowerCase();

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

      const dishName =
        String(
          row.dishName ||
          row.name ||
          '',
        )
          .trim()
          .toLowerCase();

      if (
        dishName !==
        originalKey
      ) {
        return dish;
      }

      return {
        ...row,
        name: next.name,
        dishName:
          'dishName' in row
            ? next.name
            : row.dishName,
        category:
          next.category,
        subcategory:
          next.subcategory,
        aliases:
          next.aliases,
        catalogRate:
          next.rate,
        servingSize:
          next.servingQuantity,
        servingUnit:
          next.servingUnit,
      };
    },
  );
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
      await request.json();

    const dish =
      normalizeDish(body);

    if (!dish) {
      return NextResponse.json(
        {
          error:
            'Dish name, category, rate and serving are required.',
        },
        {
          status: 400,
        },
      );
    }

    const duplicate =
      await prisma
        .dishMasterItem
        .findFirst({
          where: {
            name: {
              equals:
                dish.name,
              mode:
                'insensitive',
            },
            ...(dish.id
              ? {
                  NOT: {
                    id:
                      dish.id,
                  },
                }
              : {}),
          },
          select: {
            id: true,
          },
        });

    if (duplicate) {
      return NextResponse.json(
        {
          error:
            'A dish with this name already exists.',
        },
        {
          status: 409,
        },
      );
    }

    const existing =
      dish.id
        ? await prisma
            .dishMasterItem
            .findUnique({
              where: {
                id: dish.id,
              },
            })
        : await prisma
            .dishMasterItem
            .findFirst({
              where: {
                name: {
                  equals:
                    dish.originalName,
                  mode:
                    'insensitive',
                },
              },
            });

    const saved =
      await prisma
        .$transaction(
          async (tx) => {
            const row =
              existing
                ? await tx
                    .dishMasterItem
                    .update({
                      where: {
                        id:
                          existing.id,
                      },
                      data: {
                        name:
                          dish.name,
                        category:
                          dish.category,
                        subcategory:
                          dish.subcategory,
                        rate:
                          dish.rate,
                        servingQuantity:
                          dish.servingQuantity,
                        servingUnit:
                          dish.servingUnit,
                        aliases:
                          dish.aliases,
                      },
                    })
                : await tx
                    .dishMasterItem
                    .create({
                      data: {
                        name:
                          dish.name,
                        category:
                          dish.category,
                        subcategory:
                          dish.subcategory,
                        rate:
                          dish.rate,
                        servingQuantity:
                          dish.servingQuantity,
                        servingUnit:
                          dish.servingUnit,
                        aliases:
                          dish.aliases,
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
                    dishes:
                      true,
                  },
                });

            if (
              recipeCatalog
            ) {
              const recipes =
                updateRecipeDish(
                  recipeCatalog
                    .dishes,
                  existing?.name ||
                    dish.originalName ||
                    dish.name,
                  dish,
                );

              await tx
                .recipeCatalog
                .update({
                  where: {
                    id: 'global',
                  },
                  data: {
                    dishes:
                      recipes as Prisma.InputJsonValue,
                  },
                });
            }

            return row;
          },
        );

    return NextResponse.json({
      ok: true,
      item: saved,
    });

  } catch (error) {
    console.error(
      'Dish row PATCH failed:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Failed to save dish.',
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

    const url =
      new URL(request.url);

    const id =
      String(
        url.searchParams.get(
          'id',
        ) || '',
      ).trim();

    const name =
      String(
        url.searchParams.get(
          'name',
        ) || '',
      ).trim();

    const existing =
      id
        ? await prisma
            .dishMasterItem
            .findUnique({
              where: {
                id,
              },
            })
        : name
          ? await prisma
              .dishMasterItem
              .findFirst({
                where: {
                  name: {
                    equals:
                      name,
                    mode:
                      'insensitive',
                  },
                },
              })
          : null;

    if (!existing) {
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

    await prisma.$transaction(
      async (tx) => {
        await tx
          .dishMasterItem
          .delete({
            where: {
              id:
                existing.id,
            },
          });

        const catalog =
          await tx
            .recipeCatalog
            .findUnique({
              where: {
                id: 'global',
              },
              select: {
                dishes:
                  true,
                deletedDishIds:
                  true,
              },
            });

        if (!catalog) {
          return;
        }

        const deletedIds:
          string[] = [];

        const recipes =
          Array.isArray(
            catalog.dishes,
          )
            ? catalog.dishes.filter(
                (dish) => {
                  if (
                    !dish ||
                    typeof dish !==
                      'object' ||
                    Array.isArray(
                      dish,
                    )
                  ) {
                    return true;
                  }

                  const row =
                    dish as Record<
                      string,
                      unknown
                    >;

                  const dishName =
                    String(
                      row.dishName ||
                      row.name ||
                      '',
                    )
                      .trim()
                      .toLowerCase();

                  const remove =
                    dishName ===
                    existing.name
                      .trim()
                      .toLowerCase();

                  if (remove) {
                    const recipeId =
                      String(
                        row.id ||
                        '',
                      ).trim();

                    if (
                      recipeId
                    ) {
                      deletedIds.push(
                        recipeId,
                      );
                    }
                  }

                  return !remove;
                },
              )
            : [];

        const storedDeletedIds =
          Array.isArray(
            catalog
              .deletedDishIds,
          )
            ? catalog
                .deletedDishIds
                .map((value) =>
                  String(
                    value,
                  ).trim(),
                )
                .filter(Boolean)
            : [];

        await tx
          .recipeCatalog
          .update({
            where: {
              id: 'global',
            },
            data: {
              dishes:
                recipes as Prisma.InputJsonValue,

              deletedDishIds:
                Array.from(
                  new Set([
                    ...storedDeletedIds,
                    ...deletedIds,
                  ]),
                ),
            },
          });
      },
    );

    return NextResponse.json({
      ok: true,
      deleted:
        existing.id,
    });

  } catch (error) {
    console.error(
      'Dish row DELETE failed:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Failed to delete dish.',
      },
      {
        status: 500,
      },
    );
  }
}
