import {
  NextResponse,
} from 'next/server';

import {
  requireClientTenantId,
} from '../../../../lib/billingAuth';

import {
  prisma,
} from '../../../../lib/prisma';

import {
  buildAdminReviewedAliasRules,
  mergeLearnedDishAliasRules,
  type LearnedDishAliasRule,
} from '../../../../lib/dishAliasLearning';

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

    const [
      tenantAliases,
      reviewedAliases,
    ] = await Promise.all([
      prisma
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
        }),

      prisma
        .pendingDishSuggestion
        .findMany({
          where: {
            status: {
              in: [
                'MATCHED',
                'APPROVED',
              ],
            },
          },

          orderBy: [
            {
              analyzedAt:
                'desc',
            },
            {
              updatedAt:
                'desc',
            },
          ],

          take: 2500,

          select: {
            name:
              true,

            canonicalName:
              true,

            matchedDishName:
              true,

            suggestedCategory:
              true,

            categoryHint:
              true,

            occurrences:
              true,

            status:
              true,
          },
        }),
    ]);

    const tenantRules:
      LearnedDishAliasRule[] =
        tenantAliases.map(
          (alias) => ({
            aliasName:
              alias.aliasName,

            canonicalName:
              alias.canonicalName,

            category:
              alias.category,

            action:
              alias.action ===
              'REJECT'
                ? 'REJECT'
                : 'MAP',

            usageCount:
              alias.usageCount,

            scope:
              'TENANT',
          }),
        );

    const globalRules =
      buildAdminReviewedAliasRules(
        reviewedAliases,
      );

    /*
     * Tenant-specific learning wins over
     * global admin learning for the same
     * normalized alias.
     *
     * This keeps a caterer's explicit
     * correction authoritative while making
     * admin-reviewed aliases available to all
     * other clients automatically.
     */
    const aliases =
      mergeLearnedDishAliasRules(
        tenantRules,
        globalRules,
      );

    return NextResponse.json({
      aliases,

      learningSummary: {
        tenant:
          tenantRules.length,

        global:
          globalRules.length,

        effective:
          aliases.length,
      },
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
