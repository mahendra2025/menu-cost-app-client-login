import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  getClientCookieName,
  readClientSessionToken,
} from '../../../lib/clientAuth';

import { prisma } from '../../../lib/prisma';

function cleanCategoryName(
  value: unknown,
) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

function normalizeCategoryName(
  value: unknown,
) {
  return cleanCategoryName(
    value,
  ).toLocaleLowerCase(
    'en-IN',
  );
}

async function readTenantId() {
  const cookieStore =
    await cookies();

  return readClientSessionToken(
    cookieStore.get(
      getClientCookieName(),
    )?.value,
  );
}

export async function GET() {
  try {
    const tenantId =
      await readTenantId();

    if (!tenantId) {
      return NextResponse.json(
        {
          error:
            'Client login required',
        },
        {
          status: 401,
        },
      );
    }

    const categories =
      await prisma
        .tenantDishCategory
        .findMany({
          where: {
            tenantId,
          },
          orderBy: {
            name: 'asc',
          },
          select: {
            name: true,
          },
        });

    return NextResponse.json({
      categories:
        categories.map(
          (category) =>
            category.name,
        ),
    });
  } catch (error) {
    console.error(
      'Tenant dish categories GET:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Could not load your saved categories.',
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
    const tenantId =
      await readTenantId();

    if (!tenantId) {
      return NextResponse.json(
        {
          error:
            'Client login required',
        },
        {
          status: 401,
        },
      );
    }

    const body =
      await request.json() as Record<
        string,
        unknown
      >;

    const name =
      cleanCategoryName(
        body.name,
      );

    if (!name) {
      return NextResponse.json(
        {
          error:
            'Category name is required.',
        },
        {
          status: 400,
        },
      );
    }

    const normalizedName =
      normalizeCategoryName(
        name,
      );

    const previousName =
      cleanCategoryName(
        body.previousName,
      );

    const previousNormalizedName =
      normalizeCategoryName(
        previousName,
      );

    const saved =
      await prisma.$transaction(
        async (tx) => {
          const nextCategory =
            await tx
              .tenantDishCategory
              .upsert({
                where: {
                  tenantId_normalizedName: {
                    tenantId,
                    normalizedName,
                  },
                },
                create: {
                  tenantId,
                  normalizedName,
                  name,
                },
                update: {
                  name,
                },
                select: {
                  name: true,
                },
              });

          if (previousName) {
            await tx
              .tenantDishMasterItem
              .updateMany({
                where: {
                  tenantId,
                  category:
                    previousName,
                },
                data: {
                  category:
                    nextCategory.name,
                },
              });

            await tx
              .tenantDishAlias
              .updateMany({
                where: {
                  tenantId,
                  category:
                    previousName,
                },
                data: {
                  category:
                    nextCategory.name,
                },
              });
          }

          if (
            previousNormalizedName &&
            previousNormalizedName !==
              normalizedName
          ) {
            await tx
              .tenantDishCategory
              .deleteMany({
                where: {
                  tenantId,
                  normalizedName:
                    previousNormalizedName,
                },
              });
          }

          return nextCategory;
        },
      );

    return NextResponse.json({
      ok: true,
      category:
        saved.name,
      previousCategory:
        previousName ||
        undefined,
    });
  } catch (error) {
    console.error(
      'Tenant dish categories POST:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Could not save your category.',
      },
      {
        status: 500,
      },
    );
  }
}
