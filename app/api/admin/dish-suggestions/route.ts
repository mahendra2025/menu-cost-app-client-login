import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import {
  getAdminCookieName,
  isValidAdminSessionToken,
} from '../../../../lib/adminAuth';
import {
  CATEGORIES,
  DISH_COST_ITEMS,
  readDeletedDishCategories,
} from '../../../../lib/dishCostMaster';
import { prisma } from '../../../../lib/prisma';

const CATEGORY_CATALOG_ID = 'global';

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(
    getAdminCookieName(),
  )?.value;

  if (
    !isValidAdminSessionToken(token)
  ) {
    return NextResponse.json(
      { error: 'Admin login required' },
      { status: 401 },
    );
  }

  return null;
}

function cleanText(
  value: unknown,
  maxLength: number,
) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function normalizeDishName(value: unknown) {
  return cleanText(value, 120).toLocaleLowerCase('en-IN');
}

function readAliases(value: unknown) {
  return Array.isArray(value)
    ? value.map((alias) => cleanText(alias, 120)).filter(Boolean)
    : [];
}

export async function GET() {
  try {
    const authError =
      await requireAdmin();
    if (authError) return authError;

    const suggestions =
      await prisma
        .pendingDishSuggestion
        .findMany({
          orderBy: {
            updatedAt: 'desc',
          },
        });

    return NextResponse.json({
      suggestions,
    });
  } catch {
    return NextResponse.json(
      {
        error:
          'Failed to load new dishes',
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
) {
  try {
    const authError =
      await requireAdmin();
    if (authError) return authError;

    const body =
      (await request.json()) as Record<
        string,
        unknown
      >;
    const id = cleanText(body.id, 80);
    const name = cleanText(
      body.name,
      120,
    );
    const category = cleanText(
      body.category,
      60,
    );
    const subcategory = cleanText(
      body.subcategory,
      60,
    );
    const rate = Math.max(
      0,
      Number(body.rate) || 0,
    );
    const mode = cleanText(body.mode, 20) === 'alias'
      ? 'alias'
      : 'new';
    const aliasOf = cleanText(body.aliasOf, 120);

    if (
      !id ||
      !name ||
      (mode === 'new' && !category) ||
      (mode === 'alias' && !aliasOf)
    ) {
      return NextResponse.json(
        {
          error:
            mode === 'alias'
              ? 'Alias name and an existing dish are required'
              : 'Name and category are required',
        },
        { status: 400 },
      );
    }

    if (
      mode === 'new' &&
      !(rate > 0)
    ) {
      return NextResponse.json(
        {
          error:
            'Positive dish rate required. Enter a rate or use Auto Build.',
        },
        {
          status: 400,
        },
      );
    }

    await prisma.$transaction(
      async (tx) => {
        const suggestion =
          await tx
            .pendingDishSuggestion
            .findUnique({
              where: { id },
            });

        if (!suggestion) {
          throw new Error(
            'SUGGESTION_NOT_FOUND',
          );
        }

        if (mode === 'alias') {
          const normalizedAlias = normalizeDishName(name);
          const normalizedTarget = normalizeDishName(aliasOf);
          const storedDishes = await tx.dishMasterItem.findMany({
            select: {
              id: true,
              name: true,
              aliases: true,
            },
          });
          const storedTarget = storedDishes.find(
            (dish) => normalizeDishName(dish.name) === normalizedTarget,
          );
          const defaultTarget = DISH_COST_ITEMS.find(
            (dish) => normalizeDishName(dish.name) === normalizedTarget,
          );

          if (!storedTarget && !defaultTarget) {
            throw new Error('ALIAS_TARGET_NOT_FOUND');
          }

          const allKnownDishes = [
            ...DISH_COST_ITEMS.map((dish) => ({
              name: dish.name,
              aliases: dish.aliases ?? [],
            })),
            ...storedDishes.map((dish) => ({
              name: dish.name,
              aliases: readAliases(dish.aliases),
            })),
          ];
          const conflict = allKnownDishes.find((dish) => {
            if (normalizeDishName(dish.name) === normalizedTarget) return false;
            return normalizeDishName(dish.name) === normalizedAlias ||
              dish.aliases.some((alias) => normalizeDishName(alias) === normalizedAlias);
          });

          if (conflict) {
            throw new Error(`ALIAS_CONFLICT:${conflict.name}`);
          }

          if (storedTarget) {
            const aliases = readAliases(storedTarget.aliases);
            if (
              normalizedAlias !== normalizedTarget &&
              !aliases.some((alias) => normalizeDishName(alias) === normalizedAlias)
            ) {
              aliases.push(name);
            }
            await tx.dishMasterItem.update({
              where: { id: storedTarget.id },
              data: { aliases },
            });
          } else if (defaultTarget) {
            const aliases = readAliases(defaultTarget.aliases);
            if (
              normalizedAlias !== normalizedTarget &&
              !aliases.some((alias) => normalizeDishName(alias) === normalizedAlias)
            ) {
              aliases.push(name);
            }
            await tx.dishMasterItem.create({
              data: {
                name: defaultTarget.name,
                category: defaultTarget.category,
                subcategory: defaultTarget.subcategory ?? '',
                rate: defaultTarget.rate,
                servingQuantity: defaultTarget.servingQuantity ?? 1,
                servingUnit: defaultTarget.servingUnit ?? 'serving',
                aliases,
              },
            });
          }
        } else {
          const existing =
            await tx.dishMasterItem
              .findFirst({
                where: {
                  name: {
                    equals: name,
                    mode: 'insensitive',
                  },
                },
                select: { id: true },
              });

          if (existing) {
            await tx.dishMasterItem
              .update({
                where: {
                  id: existing.id,
                },
                data: {
                  name,
                  category,
                  subcategory,
                  rate,
                },
              });
          } else {
            await tx.dishMasterItem
              .create({
                data: {
                  name,
                  category,
                  subcategory,
                  rate,
                  aliases: [],
                },
              });
          }
        }

        if (mode === 'new') {
        const categoryCatalog =
          await tx
            .dishCategoryCatalog
            .findUnique({
              where: {
                id: CATEGORY_CATALOG_ID,
              },
            });
        const sourceCategories =
          Array.isArray(
            categoryCatalog?.categories,
          )
            ? categoryCatalog.categories
            : CATEGORIES;
        const categories =
          Array.from(
            new Map(
              [
                ...sourceCategories.map(
                  String,
                ),
                category,
                'Other',
              ]
                .map((value) =>
                  value
                    .trim()
                    .replace(
                      /\s+/g,
                      ' ',
                    ),
                )
                .filter(Boolean)
                .map((value) => [
                  value.toLowerCase(),
                  value,
                ]),
            ).values(),
          );
        const storedSubcategories =
          categoryCatalog
            ?.subcategories &&
          typeof categoryCatalog
            .subcategories === 'object' &&
          !Array.isArray(
            categoryCatalog.subcategories,
          )
            ? {
                ...(categoryCatalog.subcategories as Record<
                  string,
                  unknown
                >),
              }
            : {};
        const categorySubs =
          Array.isArray(
            storedSubcategories[
              category
            ],
          )
            ? (
                storedSubcategories[
                  category
                ] as unknown[]
              ).map(String)
            : [];

        if (
          subcategory &&
          !categorySubs.some(
            (value) =>
              value.toLowerCase() ===
              subcategory.toLowerCase(),
          )
        ) {
          categorySubs.push(
            subcategory,
          );
        }

        storedSubcategories[
          category
        ] = categorySubs;

        const deleted =
          readDeletedDishCategories(
            storedSubcategories,
          ).filter(
            (value) =>
              value.toLowerCase() !==
              category.toLowerCase(),
          );

        if (deleted.length) {
          storedSubcategories[
            '__deletedCategories'
          ] = deleted;
        } else {
          delete storedSubcategories[
            '__deletedCategories'
          ];
        }

        await tx
          .dishCategoryCatalog
          .upsert({
            where: {
              id: CATEGORY_CATALOG_ID,
            },
            create: {
              id: CATEGORY_CATALOG_ID,
              categories,
              subcategories:
                storedSubcategories as Prisma.InputJsonValue,
            },
            update: {
              categories,
              subcategories:
                storedSubcategories as Prisma.InputJsonValue,
            },
          });
        }

        await tx
          .pendingDishSuggestion
          .delete({
            where: { id },
          });
      },
    );

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        'SUGGESTION_NOT_FOUND'
    ) {
      return NextResponse.json(
        {
          error:
            'This suggestion no longer exists',
        },
        { status: 404 },
      );
    }

    if (
      error instanceof Error &&
      error.message === 'ALIAS_TARGET_NOT_FOUND'
    ) {
      return NextResponse.json(
        { error: 'The selected catalog dish no longer exists' },
        { status: 404 },
      );
    }

    if (
      error instanceof Error &&
      error.message.startsWith('ALIAS_CONFLICT:')
    ) {
      return NextResponse.json(
        {
          error: `This name is already used by ${error.message.slice('ALIAS_CONFLICT:'.length)}`,
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        error:
          'Failed to add the dish',
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
) {
  try {
    const authError =
      await requireAdmin();
    if (authError) return authError;

    const id = cleanText(
      new URL(request.url)
        .searchParams.get('id'),
      80,
    );

    if (!id) {
      return NextResponse.json(
        {
          error:
            'Suggestion ID is required',
        },
        { status: 400 },
      );
    }

    await prisma
      .pendingDishSuggestion
      .deleteMany({
        where: { id },
      });

    return NextResponse.json({
      ok: true,
    });
  } catch {
    return NextResponse.json(
      {
        error:
          'Failed to remove the suggestion',
      },
      { status: 500 },
    );
  }
}
