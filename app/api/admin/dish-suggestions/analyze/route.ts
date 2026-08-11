import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  getAdminCookieName,
  isValidAdminSessionToken,
} from '../../../../../lib/adminAuth';

import {
  CATEGORIES,
  DISH_COST_ITEMS,
} from '../../../../../lib/dishCostMaster';

import { prisma } from '../../../../../lib/prisma';

import {
  requestStructuredAi,
  structuredAiProvider,
} from '../../../../../lib/structuredAi';

const MAX_ANALYSIS_ITEMS = 30;

type CatalogDish = {
  name: string;
  category: string;
  subcategory: string;
  aliases: string[];
};

function clean(
  value: unknown,
  max = 160,
) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function normalize(
  value: unknown,
) {
  return clean(value, 160)
    .toLocaleLowerCase('en-IN');
}

function tokens(
  value: string,
) {
  return normalize(value)
    .split(/[^\p{L}\p{N}]+/gu)
    .filter(Boolean);
}

function similarity(
  leftValue: string,
  rightValue: string,
) {
  const left = normalize(leftValue);
  const right = normalize(rightValue);

  if (!left || !right) return 0;
  if (left === right) return 1;

  if (
    Math.min(left.length, right.length) >= 4 &&
    (
      left.includes(right) ||
      right.includes(left)
    )
  ) {
    return 0.92;
  }

  const leftTokens =
    new Set(tokens(left));

  const rightTokens =
    new Set(tokens(right));

  if (!leftTokens.size || !rightTokens.size) {
    return 0;
  }

  const overlap =
    [...leftTokens].filter(
      (token) =>
        rightTokens.has(token),
    ).length;

  const union =
    new Set([
      ...leftTokens,
      ...rightTokens,
    ]).size;

  const coverage =
    overlap /
    Math.max(
      Math.min(
        leftTokens.size,
        rightTokens.size,
      ),
      1,
    );

  const jaccard =
    overlap /
    Math.max(union, 1);

  return Math.min(
    0.91,
    jaccard * 0.58 +
      coverage * 0.34,
  );
}

function catalogMatches(
  name: string,
  catalog: CatalogDish[],
) {
  return catalog
    .map((dish) => {
      let score =
        similarity(
          name,
          dish.name,
        );

      for (
        const alias of dish.aliases
      ) {
        score = Math.max(
          score,
          similarity(
            name,
            alias,
          ),
        );
      }

      return {
        name: dish.name,
        category: dish.category,
        subcategory:
          dish.subcategory,
        score:
          Math.round(
            score * 100,
          ),
      };
    })
    .filter(
      (match) =>
        match.score >= 35,
    )
    .sort(
      (a, b) =>
        b.score - a.score,
    )
    .slice(0, 5);
}

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

export async function POST(
  request: Request,
) {
  try {
    const authError =
      await requireAdmin();

    if (authError) {
      return authError;
    }

    if (
      !structuredAiProvider()
    ) {
      return NextResponse.json(
        {
          error:
            'OpenAI is not configured',
        },
        {
          status: 503,
        },
      );
    }

    const body =
      await request.json() as {
        ids?: unknown;
      };

    const ids =
      Array.isArray(body.ids)
        ? Array.from(
            new Set(
              body.ids
                .map((id) =>
                  clean(id, 90),
                )
                .filter(Boolean),
            ),
          ).slice(
            0,
            MAX_ANALYSIS_ITEMS,
          )
        : [];

    const suggestions =
      await prisma
        .pendingDishSuggestion
        .findMany({
          where:
            ids.length
              ? {
                  id: {
                    in: ids,
                  },
                }
              : undefined,

          orderBy: {
            updatedAt:
              'desc',
          },

          take:
            MAX_ANALYSIS_ITEMS,
        });

    if (!suggestions.length) {
      return NextResponse.json({
        results: [],
      });
    }

    const stored =
      await prisma
        .dishMasterItem
        .findMany({
          select: {
            name: true,
            category: true,
            subcategory: true,
            aliases: true,
          },
        });

    const catalogMap =
      new Map<
        string,
        CatalogDish
      >();

    DISH_COST_ITEMS.forEach(
      (dish) => {
        catalogMap.set(
          normalize(
            dish.name,
          ),
          {
            name:
              dish.name,

            category:
              dish.category,

            subcategory:
              dish.subcategory ||
              '',

            aliases:
              dish.aliases ??
              [],
          },
        );
      },
    );

    stored.forEach(
      (dish) => {
        catalogMap.set(
          normalize(
            dish.name,
          ),
          {
            name:
              dish.name,

            category:
              dish.category,

            subcategory:
              dish.subcategory,

            aliases:
              Array.isArray(
                dish.aliases,
              )
                ? dish.aliases
                    .map(String)
                    .filter(Boolean)
                : [],
          },
        );
      },
    );

    const catalog =
      Array.from(
        catalogMap.values(),
      );

    const localContext =
      suggestions.map(
        (suggestion) => ({
          id:
            suggestion.id,

          name:
            suggestion.name,

          categoryHint:
            suggestion.categoryHint,

          occurrences:
            suggestion.occurrences,

          sourceFileName:
            suggestion.sourceFileName,

          closestCatalogMatches:
            catalogMatches(
              suggestion.name,
              catalog,
            ),
        }),
      );

    const schema = {
      type: 'object',

      additionalProperties:
        false,

      required: [
        'results',
      ],

      properties: {
        results: {
          type: 'array',

          maxItems:
            MAX_ANALYSIS_ITEMS,

          items: {
            type: 'object',

            additionalProperties:
              false,

            required: [
              'id',
              'realDish',
              'canonicalName',
              'category',
              'subcategory',
              'confidence',
              'duplicateScore',
              'matchedDishName',
              'recommendation',
              'riskLevel',
              'reason',
            ],

            properties: {
              id: {
                type: 'string',
              },

              realDish: {
                type: 'boolean',
              },

              canonicalName: {
                type: 'string',
              },

              category: {
                type: 'string',
                enum:
                  CATEGORIES,
              },

              subcategory: {
                type: 'string',
              },

              confidence: {
                type: 'number',
                minimum: 0,
                maximum: 100,
              },

              duplicateScore: {
                type: 'number',
                minimum: 0,
                maximum: 100,
              },

              matchedDishName: {
                type: 'string',
              },

              recommendation: {
                type: 'string',
                enum: [
                  'NEW_DISH',
                  'ALIAS',
                  'REJECT',
                  'REVIEW',
                ],
              },

              riskLevel: {
                type: 'string',
                enum: [
                  'LOW',
                  'MEDIUM',
                  'HIGH',
                ],
              },

              reason: {
                type: 'string',
              },
            },
          },
        },
      },
    };

    const raw =
      await requestStructuredAi({
        schemaName:
          'new_dish_admin_analysis',

        schema,

        maxOutputTokens:
          Math.min(
            9000,
            Math.max(
              1200,
              suggestions.length *
                260,
            ),
          ),

        instructions: [
          'You are an expert Indian catering menu catalog reviewer.',
          'Analyze every supplied candidate independently.',
          'Decide whether the candidate is a real food or beverage dish.',
          'OCR garbage, person names, venues, headings, event names, phone numbers and non-food phrases are not dishes.',
          'canonicalName should be a clean recognizable dish name without inventing a different dish.',
          'Use only the allowed category values from the schema.',
          'Use closestCatalogMatches as evidence for duplicate or alias decisions.',
          'Never claim ALIAS unless matchedDishName refers to one of the supplied closestCatalogMatches.',
          'Use NEW_DISH when it appears to be a genuine distinct dish.',
          'Use REVIEW when evidence is ambiguous.',
          'Use REJECT for clearly non-food text.',
          'duplicateScore measures probability that the candidate is another spelling/name for an existing catalog dish.',
          'confidence measures confidence in the overall classification.',
          'HIGH risk means the admin should inspect carefully before publishing.',
          'Do not automatically publish anything.',
        ].join('\n'),

        input:
          JSON.stringify({
            candidates:
              localContext,
          }),
      });

    const parsed =
      JSON.parse(raw) as {
        results?: Array<
          Record<
            string,
            unknown
          >
        >;
      };

    const aiResults =
      Array.isArray(
        parsed.results,
      )
        ? parsed.results
        : [];

    const results = [];

    for (
      const suggestion of
      suggestions
    ) {
      const ai =
        aiResults.find(
          (item) =>
            clean(
              item.id,
              90,
            ) ===
            suggestion.id,
        );

      if (!ai) {
        continue;
      }

      const matches =
        catalogMatches(
          suggestion.name,
          catalog,
        );

      const requestedMatch =
        clean(
          ai.matchedDishName,
          120,
        );

      const validMatch =
        matches.find(
          (match) =>
            normalize(
              match.name,
            ) ===
            normalize(
              requestedMatch,
            ),
        );

      const realDish =
        Boolean(
          ai.realDish,
        );

      let recommendation =
        clean(
          ai.recommendation,
          20,
        );

      if (!realDish) {
        recommendation =
          'REJECT';
      }

      if (
        recommendation ===
          'ALIAS' &&
        !validMatch
      ) {
        recommendation =
          'REVIEW';
      }

      if (
        ![
          'NEW_DISH',
          'ALIAS',
          'REJECT',
          'REVIEW',
        ].includes(
          recommendation,
        )
      ) {
        recommendation =
          'REVIEW';
      }

      const category =
        CATEGORIES.includes(
          clean(
            ai.category,
            60,
          ) as (
            typeof CATEGORIES
          )[number],
        )
          ? clean(
              ai.category,
              60,
            )
          : (
              CATEGORIES.includes(
                suggestion
                  .categoryHint as (
                    typeof CATEGORIES
                  )[number],
              )
                ? suggestion
                    .categoryHint
                : 'Other'
            );

      const aiDuplicate =
        Math.max(
          0,
          Math.min(
            100,
            Number(
              ai.duplicateScore,
            ) || 0,
          ),
        );

      const localDuplicate =
        matches[0]?.score ??
        0;

      const duplicateScore =
        Math.max(
          aiDuplicate,
          localDuplicate,
        );

      const confidence =
        Math.max(
          0,
          Math.min(
            100,
            Number(
              ai.confidence,
            ) || 0,
          ),
        );

      const riskRaw =
        clean(
          ai.riskLevel,
          20,
        );

      const riskLevel =
        [
          'LOW',
          'MEDIUM',
          'HIGH',
        ].includes(riskRaw)
          ? riskRaw
          : 'MEDIUM';

      const canonicalName =
        clean(
          ai.canonicalName,
          120,
        ) ||
        suggestion.name;

      const suggestedSubcategory =
        clean(
          ai.subcategory,
          60,
        );

      const matchedDishName =
        validMatch?.name ||
        '';

      const analysisReason =
        clean(
          ai.reason,
          500,
        );

      const analyzedAt =
        new Date();

      const saved =
        await prisma
          .pendingDishSuggestion
          .update({
            where: {
              id:
                suggestion.id,
            },

            data: {
              status:
                'ANALYZED',

              canonicalName,

              suggestedCategory:
                category,

              suggestedSubcategory,

              aiConfidence:
                confidence,

              duplicateScore,

              matchedDishName,

              recommendation,

              riskLevel,

              analysisReason,

              analyzedAt,
            },
          });

      results.push(saved);
    }

    return NextResponse.json({
      results,
      analyzed:
        results.length,
      source:
        'openai',
    });
  } catch (error) {
    console.error(
      'New dish AI analysis failed:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'New dish AI analysis failed',
      },
      {
        status: 502,
      },
    );
  }
}
