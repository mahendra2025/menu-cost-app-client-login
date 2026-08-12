import {
  NextResponse,
} from 'next/server';

import {
  requireClientTenantId,
} from '../../../../lib/billingAuth';

import {
  prisma,
} from '../../../../lib/prisma';

function normalizeAliasKey(
  value: string,
) {
  return String(value || '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(
      /\p{Diacritic}/gu,
      '',
    )
    .replace(
      /[^\p{L}\p{N}]+/gu,
      ' ',
    )
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanName(
  value: unknown,
  max = 120,
) {
  return String(
    value || '',
  )
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

export async function GET() {
  try {
    const tenantId =
      await requireClientTenantId();

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

    const aliases =
      await prisma
        .tenantDishAlias
        .findMany({
          where: {
            tenantId,
          },

          orderBy: {
            updatedAt:
              'desc',
          },

          take: 1500,

          select: {
            aliasName:
              true,

            canonicalName:
              true,

            category:
              true,

            action:
              true,

            usageCount:
              true,
          },
        });

    return NextResponse.json({
      aliases,
    });

  } catch (error) {
    console.error(
      'Dish alias GET failed:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Failed to load learned dish aliases.',
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
      await requireClientTenantId();

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
      await request.json() as
        Record<
          string,
          unknown
        >;

    const aliasName =
      cleanName(
        body.aliasName,
      );

    const canonicalName =
      cleanName(
        body.canonicalName,
      );

    const category =
      cleanName(
        body.category,
        60,
      ) || 'Other';

    const action =
      String(
        body.action ||
        'MAP',
      )
        .trim()
        .toUpperCase();

    if (
      !aliasName ||
      ![
        'MAP',
        'REJECT',
      ].includes(action)
    ) {
      return NextResponse.json(
        {
          error:
            'Valid alias and action are required.',
        },
        {
          status: 400,
        },
      );
    }

    if (
      action === 'MAP' &&
      !canonicalName
    ) {
      return NextResponse.json(
        {
          error:
            'Canonical dish name is required.',
        },
        {
          status: 400,
        },
      );
    }

    const aliasKey =
      normalizeAliasKey(
        aliasName,
      );

    if (!aliasKey) {
      return NextResponse.json(
        {
          error:
            'Invalid alias.',
        },
        {
          status: 400,
        },
      );
    }

    const saved =
      await prisma
        .tenantDishAlias
        .upsert({
          where: {
            tenantId_aliasKey: {
              tenantId,
              aliasKey,
            },
          },

          create: {
            tenantId,
            aliasKey,
            aliasName,

            canonicalName:
              action ===
              'MAP'
                ? canonicalName
                : '',

            category,

            action,
          },

          update: {
            aliasName,

            canonicalName:
              action ===
              'MAP'
                ? canonicalName
                : '',

            category,

            action,

            usageCount: {
              increment: 1,
            },
          },
        });

    return NextResponse.json({
      ok: true,

      alias: {
        aliasName:
          saved.aliasName,

        canonicalName:
          saved.canonicalName,

        category:
          saved.category,

        action:
          saved.action,

        usageCount:
          saved.usageCount,
      },
    });

  } catch (error) {
    console.error(
      'Dish alias POST failed:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Failed to learn dish correction.',
      },
      {
        status: 500,
      },
    );
  }
}
