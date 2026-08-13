'use client';

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react';

import dynamic from 'next/dynamic';

import AppShell from '../../components/AppShell';

import {
  CATEGORIES,
} from '../../../lib/dishCostMaster';

import type {
  RecipeStudioDishRequest,
} from '../dishes/RecipeStudioPanel';

const RecipeStudioPanel = dynamic(
  () =>
    import('../dishes/RecipeStudioPanel'),
  {
    ssr: false,
    loading: () => (
      <div className="admin-lazy-loading">
        Opening Recipe Studio…
      </div>
    ),
  },
);

type Suggestion = {
  id: string;
  name: string;
  categoryHint: string;
  tenantId: string;
  sourceFileName: string;
  occurrences: number;

  status?: string;
  canonicalName?: string;
  suggestedCategory?: string;
  suggestedSubcategory?: string;
  aiConfidence?: number;
  duplicateScore?: number;
  matchedDishName?: string;
  recommendation?: string;
  riskLevel?: string;
  analysisReason?: string;
  adminNotes?: string;
  analyzedAt?: string | null;

  createdAt: string;
  updatedAt: string;
};

type EditableSuggestion =
  Suggestion & {
    dishName: string;
    category: string;
    subcategory: string;
    rate: string;
    saveAs: 'new' | 'alias';
    aliasCategory: string;
    aliasTarget: string;
  };

type CatalogDish = {
  name: string;
  category: string;
  rate: number;
  aliases: string[];
};

type GoogleDishResult = {
  title: string;
  link: string;
  snippet: string;
};

type DishVerification = {
  loading: boolean;
  searched: boolean;
  confirmed: boolean;
  automatic: boolean;
  searchUrl: string;
  results: GoogleDishResult[];
  error: string;
};

type ReviewFilter =
  | 'ALL'
  | 'HIGH_PRIORITY'
  | 'LIKELY_DUPLICATE'
  | 'VERIFIED'
  | 'UNVERIFIED';

type QueueSort =
  | 'PRIORITY'
  | 'MOST_SEEN'
  | 'NEWEST'
  | 'OLDEST'
  | 'NAME';

type CatalogMatch = {
  dish: CatalogDish;
  score: number;
  reason: string;
};

type CatalogSearchDish = {
  dish: CatalogDish;
  names: Array<{
    normalized: string;
    alias: boolean;
  }>;
};

type AutoBuildResult = {
  name: string;
  tenantId: string;
  source: string;
  baseGuests: number;
  ingredientCount: number;
  estimatedIngredientRates: number;
  missingRates: number;
  standardCostPerPlate: number;

  quality: {
    status:
      | 'READY'
      | 'REVIEW'
      | 'BLOCKED';

    score: number;
    ingredientCount: number;
    trustedRateCount: number;
    rateCoveragePercent: number;
    estimatedRates: number;
    missingRates: number;
    warningCount: number;
    errorCount: number;

    issues: Array<{
      severity:
        | 'warning'
        | 'error';

      code: string;
      message: string;
      ingredient?: string;
    }>;
  };

  cost: {
    rawCostPerPlate: number;
    wastagePercent: number;
    wastagePerPlate: number;
    costPerPlate: number;
    rawTotal: number;
    wastageTotal: number;
    totalCost: number;
  };
};

function normalizeReviewText(
  value: string,
) {
  return String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase('en-IN')
    .replace(
      /[^\p{L}\p{N}]+/gu,
      ' ',
    )
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreNormalizedCatalogCandidate(
  left: string,
  right: string,
) {
  if (!left || !right) {
    return 0;
  }

  if (left === right) {
    return 1;
  }

  if (
    Math.min(
      left.length,
      right.length,
    ) >= 4 &&
    (
      left.includes(right) ||
      right.includes(left)
    )
  ) {
    return 0.9;
  }

  const leftTokens =
    new Set(
      left.split(' ').filter(Boolean),
    );

  const rightTokens =
    new Set(
      right.split(' ').filter(Boolean),
    );

  if (
    !leftTokens.size ||
    !rightTokens.size
  ) {
    return 0;
  }

  const intersection =
    [...leftTokens].filter(
      (token) =>
        rightTokens.has(token),
    ).length;

  const union =
    new Set([
      ...leftTokens,
      ...rightTokens,
    ]).size;

  const jaccard =
    intersection /
    Math.max(union, 1);

  const coverage =
    intersection /
    Math.max(
      Math.min(
        leftTokens.size,
        rightTokens.size,
      ),
      1,
    );

  return Math.min(
    0.89,
    (
      jaccard * 0.58 +
      coverage * 0.32
    ),
  );
}

function findCatalogMatches(
  dishName: string,
  catalog: CatalogSearchDish[],
): CatalogMatch[] {
  const input =
    normalizeReviewText(
      dishName,
    );

  if (!input) return [];

  return catalog
    .map((entry) => {
      let bestScore = 0;
      let matchedAlias = false;

      entry.names.forEach((candidate) => {
        const score = scoreNormalizedCatalogCandidate(
          input,
          candidate.normalized,
        );

        if (score > bestScore) {
          bestScore = score;
          matchedAlias = candidate.alias;
        }
      });

      const reason = matchedAlias
        ? bestScore === 1
          ? 'Exact alias'
          : bestScore >= 0.9
            ? 'Very similar alias'
            : 'Similar alias'
        : bestScore === 1
          ? 'Exact dish name'
          : bestScore >= 0.9
            ? 'Very similar name'
            : 'Similar words';

      return {
        dish: entry.dish,
        score:
          bestScore,
        reason,
      };
    })
    .filter(
      (match) =>
        match.score >= 0.42,
    )
    .sort(
      (left, right) =>
        right.score -
        left.score,
    )
    .slice(0, 3);
}

function formatReviewDate(
  value: string,
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return 'Unknown';
  }

  return date.toLocaleDateString(
    'en-IN',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    },
  );
}

export default function NewDishesPage() {
  const [rows, setRows] =
    useState<EditableSuggestion[]>(
      [],
    );
  const [categories, setCategories] =
    useState<string[]>([
      ...CATEGORIES,
    ]);
  const [catalogDishes, setCatalogDishes] =
    useState<CatalogDish[]>([]);
  const [loading, setLoading] =
    useState(true);
  const [workingId, setWorkingId] =
    useState('');

  const [
    analyzingId,
    setAnalyzingId,
  ] =
    useState('');

  const [
    analyzingAll,
    setAnalyzingAll,
  ] =
    useState(false);

  const [message, setMessage] =
    useState('');
  const [rowErrors, setRowErrors] =
    useState<Record<string, string>>({});
  const [messageType, setMessageType] =
    useState<'success' | 'error'>(
      'success',
    );
  const [query, setQuery] =
    useState('');

  const deferredQuery =
    useDeferredValue(query);

  const [
    reviewFilter,
    setReviewFilter,
  ] =
    useState<ReviewFilter>(
      'ALL',
    );

  const [
    categoryFilter,
    setCategoryFilter,
  ] =
    useState('ALL');

  const [
    queueSort,
    setQueueSort,
  ] =
    useState<QueueSort>(
      'PRIORITY',
    );
  const [visibleLimit, setVisibleLimit] =
    useState(40);

  const [verifications, setVerifications] =
    useState<Record<string, DishVerification>>({});
  const [recipeStudioOpened, setRecipeStudioOpened] =
    useState(false);
  const [requestedRecipeDish, setRequestedRecipeDish] =
    useState<RecipeStudioDishRequest | null>(null);

  const [
    lastAutoBuild,
    setLastAutoBuild,
  ] =
    useState<AutoBuildResult | null>(
      null,
    );

  async function loadQueue() {
    setLoading(true);
    setMessage('');

    try {
      const queueResponse = await fetch(
        '/api/admin/dish-suggestions?context=1',
        { cache: 'no-store' },
      );
      const queueData =
        await queueResponse.json();

      if (!queueResponse.ok) {
        throw new Error(
          queueData.error ||
            'Could not load new dishes',
        );
      }

      const availableCategories =
        Array.from(
          new Map(
            [
              ...CATEGORIES,
              ...(Array.isArray(
                queueData.categories,
              )
                ? queueData.categories
                : []),
              'Other',
            ]
              .map((category) =>
                String(category)
                  .trim()
                  .replace(/\s+/g, ' '),
              )
              .filter(Boolean)
              .map((category) => [
                category.toLowerCase(),
                category,
              ]),
          ).values(),
        );

      setCategories(
        availableCategories,
      );
      const catalogRows:
          CatalogDish[] =
          Array.isArray(
            queueData.items,
          )
            ? queueData.items
                .map(
                  (
                    item:
                      Record<
                        string,
                        unknown
                      >,
                  ) => ({
                    name:
                      String(
                        item.name ||
                        '',
                      ).trim(),

                    category:
                      String(
                        item.category ||
                        '',
                      ).trim(),

                    rate:
                      Math.max(
                        Number(
                          item.rate,
                        ) || 0,
                        0,
                      ),

                    aliases:
                      Array.isArray(
                        item.aliases,
                      )
                        ? item.aliases
                            .map(String)
                            .filter(Boolean)
                        : [],
                  }),
                )
                .filter(
                  (
                    item:
                      CatalogDish,
                  ) =>
                    Boolean(
                      item.name,
                    ),
                )
            : [];

      setCatalogDishes(
        catalogRows,
      );

      setRows(
        (
          queueData.suggestions ||
          []
        ).map(
          (
            suggestion: Suggestion,
          ): EditableSuggestion => {
            const aliasMatch =
              suggestion
                .recommendation ===
                'ALIAS'
                ? catalogRows.find(
                    (dish) =>
                      dish.name
                        .toLowerCase() ===
                      String(
                        suggestion
                          .matchedDishName ||
                          '',
                      ).toLowerCase(),
                  )
                : undefined;

            return {
              ...suggestion,
              dishName:
                aliasMatch
                  ? suggestion.name
                  : suggestion
                      .canonicalName ||
                    suggestion.name,
              category:
                availableCategories.includes(
                  suggestion.suggestedCategory ||
                    '',
                )
                  ? (
                      suggestion.suggestedCategory ||
                      'Other'
                    )
                  : availableCategories.includes(
                      suggestion.categoryHint,
                    )
                    ? suggestion.categoryHint
                    : 'Other',

              subcategory:
                suggestion.suggestedSubcategory ||
                '',
              rate: '',

              saveAs:
                aliasMatch
                  ? 'alias'
                  : 'new',

              aliasCategory:
                aliasMatch?.category ||
                '',

              aliasTarget:
                aliasMatch?.name || '',
            };
          },
        ),
      );
      setVerifications({});
    } catch (error) {
      setMessageType('error');
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not load new dishes',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadQueue();
  }, []);

  function updateRow(
    id: string,
    changes: Partial<
      EditableSuggestion
    >,
  ) {
    setRows((current) =>
      current.map((row) =>
        row.id === id
          ? { ...row, ...changes }
          : row,
      ),
    );

    if (changes.dishName !== undefined) {
      setVerifications((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    }
  }

  async function analyzeSuggestions(
    ids?: string[],
  ) {
    const targetIds =
      (
        ids?.length
          ? ids
          : rows
              .slice(0, 30)
              .map(
                (row) =>
                  row.id,
              )
      ).filter(Boolean);

    if (!targetIds.length) {
      return;
    }

    const single =
      targetIds.length === 1;

    if (single) {
      setAnalyzingId(
        targetIds[0],
      );
    } else {
      setAnalyzingAll(
        true,
      );
    }

    setMessage('');

    try {
      const response =
        await fetch(
          '/api/admin/dish-suggestions/analyze',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                ids:
                  targetIds,
              }),
          },
        );

      const data =
        await response.json() as {
          results?: Suggestion[];
          analyzed?: number;
          error?: string;
        };

      if (!response.ok) {
        throw new Error(
          data.error ||
            'AI analysis failed',
        );
      }

      const analysisMap =
        new Map(
          (
            data.results ||
            []
          ).map(
            (result) => [
              result.id,
              result,
            ],
          ),
        );

      setRows(
        (current) =>
          current.map(
            (row) => {
              const analysis =
                analysisMap.get(
                  row.id,
                );

              if (!analysis) {
                return row;
              }

              const suggestedCategory =
                analysis
                  .suggestedCategory &&
                categories.includes(
                  analysis
                    .suggestedCategory,
                )
                  ? analysis
                      .suggestedCategory
                  : row.category;

              const matched =
                catalogDishes.find(
                  (dish) =>
                    dish.name
                      .toLowerCase() ===
                    String(
                      analysis
                        .matchedDishName ||
                        '',
                    )
                      .toLowerCase(),
                );

              const saveAsAlias =
                analysis.recommendation ===
                  'ALIAS' &&
                Boolean(matched);

              return {
                ...row,
                ...analysis,

                dishName:
                  saveAsAlias
                    ? analysis.name
                    : analysis.canonicalName ||
                      row.dishName,

                category:
                  suggestedCategory,

                subcategory:
                  analysis
                    .suggestedSubcategory ||
                  row.subcategory,

                saveAs:
                  analysis
                    .recommendation ===
                    'ALIAS' &&
                  matched
                    ? 'alias'
                    : analysis
                          .recommendation ===
                        'NEW_DISH'
                      ? 'new'
                      : row.saveAs,

                aliasCategory:
                  analysis
                    .recommendation ===
                    'ALIAS' &&
                  matched
                    ? matched.category
                    : row
                        .aliasCategory,

                aliasTarget:
                  analysis
                    .recommendation ===
                    'ALIAS' &&
                  matched
                    ? matched.name
                    : row
                        .aliasTarget,
              };
            },
          ),
      );

      setMessageType(
        'success',
      );

      setMessage(
        `${Number(data.analyzed) || 0} dish${Number(data.analyzed) === 1 ? '' : 'es'} analyzed and saved.`,
      );
    } catch (error) {
      setMessageType(
        'error',
      );

      setMessage(
        error instanceof Error
          ? error.message
          : 'AI analysis failed',
      );
    } finally {
      setAnalyzingId('');
      setAnalyzingAll(false);
    }
  }

  async function verifyOnGoogle(
    row: EditableSuggestion,
  ) {
    const dishName =
      row.dishName.trim();

    if (!dishName) {
      setMessageType('error');
      setMessage(
        'Enter the dish name before searching Google.',
      );
      return;
    }

    // Open Google directly from the click event. Opening a tab after the
    // API request completes is treated as a popup and is blocked by many
    // browsers, which made the verification flow appear to do nothing.
    const googleSearchUrl =
      `https://www.google.com/search?q=${encodeURIComponent(`${dishName} dish recipe food`)}`;
    window.open(
      googleSearchUrl,
      '_blank',
      'noopener,noreferrer',
    );

    setVerifications((current) => ({
      ...current,
      [row.id]: {
        loading: true,
        searched: false,
        confirmed: false,
        automatic: false,
        searchUrl: '',
        results: [],
        error: '',
      },
    }));

    try {
      const response = await fetch(
        `/api/admin/dish-suggestions/google-search?q=${encodeURIComponent(dishName)}`,
        { cache: 'no-store' },
      );
      const data = await response.json() as {
        configured?: boolean;
        searchUrl?: string;
        results?: GoogleDishResult[];
        error?: string;
      };
      const searchUrl =
        String(data.searchUrl || '');

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Google search failed',
        );
      }

      const results =
        Array.isArray(data.results)
          ? data.results
          : [];

      setVerifications((current) => ({
        ...current,
        [row.id]: {
          loading: false,
          searched: true,
          confirmed: false,
          automatic:
            Boolean(data.configured),
          searchUrl,
          results,
          error: '',
        },
      }));

    } catch (error) {
      setVerifications((current) => ({
        ...current,
        [row.id]: {
          loading: false,
          searched: false,
          confirmed: false,
          automatic: false,
          searchUrl: '',
          results: [],
          error:
            error instanceof Error
              ? error.message
              : 'Google search failed',
        },
      }));
    }
  }

  function confirmGoogleDish(id: string) {
    setVerifications((current) => ({
      ...current,
      [id]: {
        ...current[id],
        confirmed: true,
      },
    }));
  }

  async function approve(
    row: EditableSuggestion,
    buildRecipe = false,
  ) {
    const showRowError = (error: string) => {
      setMessageType('error');
      setMessage(error);
      setRowErrors((current) => ({
        ...current,
        [row.id]: error,
      }));
    };

    setRowErrors((current) => {
      const next = { ...current };
      delete next[row.id];
      return next;
    });

    const verification =
      verifications[row.id];

    const aliasTarget =
      catalogDishes.find(
        (dish) =>
          dish.name
            .toLowerCase() ===
            row.aliasTarget
              .trim()
              .toLowerCase() &&
          dish.category
            .toLowerCase() ===
            row.aliasCategory
              .trim()
              .toLowerCase(),
      );

    const manualRate =
      Math.max(
        0,
        Number(row.rate) || 0,
      );

    if (!row.dishName.trim()) {
      showRowError(
        'Enter a dish name.',
      );
      return;
    }

    if (
      row.saveAs === 'new' &&
      !row.category
    ) {
      showRowError(
        'Choose a category.',
      );
      return;
    }

    if (
      row.saveAs === 'alias' &&
      (
        !row.aliasCategory ||
        !aliasTarget
      )
    ) {
      showRowError(
        'Choose the existing Dish Master item for this alias.',
      );
      return;
    }

    setWorkingId(row.id);
    setMessage('');

    try {
      let autoBuildResult:
        AutoBuildResult | null =
          null;

      let finalRate =
        manualRate;

      /*
       * Build FIRST.
       *
       * If recipe generation fails the
       * pending suggestion stays in DB.
       */
      if (
        buildRecipe &&
        row.saveAs === 'new'
      ) {
        const buildResponse =
          await fetch(
            '/api/admin/dish-suggestions/auto-build',
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body:
                JSON.stringify({
                  tenantId:
                    row.tenantId,

                  name:
                    row.dishName
                      .trim(),

                  category:
                    row.category
                      .trim() ||
                    'Other',

                  subcategory:
                    row.subcategory
                      .trim(),
                }),
            },
          );

        const buildData =
          await buildResponse
            .json() as
              AutoBuildResult & {
                error?: string;
              };

        if (!buildResponse.ok) {
          throw new Error(
            buildData.error ||
              'Auto Build failed. Suggestion was kept for retry.',
          );
        }

        finalRate =
          Math.max(
            Number(
              buildData
                .standardCostPerPlate,
            ) || 0,
            0,
          );

        if (!(finalRate > 0)) {
          throw new Error(
            'Auto Build created no usable cost. Suggestion was kept.',
          );
        }

        autoBuildResult =
          buildData;
      }

      /*
       * Publish only AFTER preparation
       * succeeds.
       */
      const response =
        await fetch(
          '/api/admin/dish-suggestions',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                id:
                  row.id,

                name:
                  row.dishName,

                category:
                  row.category,

                subcategory:
                  row.subcategory,

                rate:
                  finalRate,

                mode:
                  row.saveAs,

                aliasOf:
                  aliasTarget
                    ?.name ||
                  '',

                googleVerified:
                  Boolean(
                    verification
                      ?.confirmed,
                  ),
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Could not publish the dish',
        );
      }

      if (autoBuildResult) {
        setLastAutoBuild(
          autoBuildResult,
        );

        setRequestedRecipeDish({
          requestId:
            `approved_${row.id}_${Date.now()}`,

          name:
            row.dishName
              .trim(),

          category:
            row.category
              .trim() ||
            'Other',

          subcategory:
            row.subcategory
              .trim(),
        });
      }

      /*
       * Update local catalog immediately.
       */
      setCatalogDishes(
        (current) => {
          if (
            row.saveAs === 'alias' &&
            aliasTarget
          ) {
            return current.map(
              (dish) =>
                dish.name ===
                  aliasTarget.name
                  ? {
                      ...dish,

                      aliases:
                        Array.from(
                          new Set([
                            ...dish.aliases,
                            row.dishName
                              .trim(),
                          ]),
                        ),
                    }
                  : dish,
            );
          }

          const nextDish:
            CatalogDish = {
              name:
                row.dishName
                  .trim(),

              category:
                row.category
                  .trim() ||
                'Other',

              rate:
                finalRate,

              aliases: [],
            };

          const exists =
            current.some(
              (dish) =>
                dish.name
                  .toLowerCase() ===
                nextDish.name
                  .toLowerCase(),
            );

          if (!exists) {
            return [
              ...current,
              nextDish,
            ];
          }

          return current.map(
            (dish) =>
              dish.name
                .toLowerCase() ===
              nextDish.name
                .toLowerCase()
                ? {
                    ...dish,
                    ...nextDish,
                  }
                : dish,
          );
        },
      );

      setRows(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              row.id,
          ),
      );

      if (autoBuildResult) {
        setMessageType(
          'success',
        );

        setMessage(
          `${row.dishName.trim()} approved. Recipe built and standard cost ₹${finalRate.toFixed(2)}/plate.`,
        );
      } else if (
        row.saveAs === 'alias'
      ) {
        setMessageType(
          'success',
        );

        setMessage(
          `${row.dishName.trim()} added as alias of ${aliasTarget?.name}.`,
        );
      } else {
        setMessageType(
          'success',
        );

        setMessage(
          finalRate > 0
            ? `${row.dishName.trim()} added to Dish Master at ₹${finalRate.toFixed(2)}/plate.`
            : `${row.dishName.trim()} added to Dish Master. Rate can be added later.`,
        );
      }

    } catch (error) {
      showRowError(
        error instanceof Error
          ? error.message
          : 'Could not process this dish',
      );
    } finally {
      setWorkingId('');
    }
  }

  async function reject(
    row: EditableSuggestion,
  ) {
    setWorkingId(row.id);
    setMessage('');

    try {
      const response = await fetch(
        `/api/admin/dish-suggestions?id=${encodeURIComponent(row.id)}`,
        { method: 'DELETE' },
      );
      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Could not remove the suggestion',
        );
      }

      setRows((current) =>
        current.filter(
          (item) =>
            item.id !== row.id,
        ),
      );
      setMessageType('success');
      setMessage(
        `${row.name} was removed from the review queue.`,
      );
    } catch (error) {
      setMessageType('error');
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not remove the suggestion',
      );
    } finally {
      setWorkingId('');
    }
  }

  const catalogSearchIndex =
    useMemo<CatalogSearchDish[]>(
      () =>
        catalogDishes.map((dish) => ({
          dish,
          names: [
            {
              normalized: normalizeReviewText(dish.name),
              alias: false,
            },
            ...(dish.aliases ?? []).map((alias) => ({
              normalized: normalizeReviewText(alias),
              alias: true,
            })),
          ].filter((candidate) => candidate.normalized),
        })),
      [catalogDishes],
    );

  const catalogMatchIdentity = rows
    .map((row) => `${row.id}:${row.dishName || row.name}`)
    .join('\u0000');

  const catalogMatchMap =
    useMemo(
      () =>
        new Map(
          rows.map(
            (row) => [
              row.id,
              findCatalogMatches(
                row.dishName ||
                  row.name,
                catalogSearchIndex,
              ),
            ],
          ),
        ),
      [
        catalogMatchIdentity,
        catalogSearchIndex,
      ],
    );

  function catalogMatchesFor(
    row: EditableSuggestion,
  ) {
    return (
      catalogMatchMap.get(
        row.id,
      ) ?? []
    );
  }

  function bestMatchFor(
    row: EditableSuggestion,
  ) {
    return catalogMatchesFor(
      row,
    )[0];
  }

  function isLikelyDuplicate(
    row: EditableSuggestion,
  ) {
    return (
      (
        bestMatchFor(row)
          ?.score ?? 0
      ) >= 0.72
    );
  }

  function applyCatalogMatch(
    row: EditableSuggestion,
    match: CatalogMatch,
  ) {
    updateRow(
      row.id,
      {
        saveAs: 'alias',
        dishName: row.name,
        aliasCategory:
          match.dish.category,
        aliasTarget:
          match.dish.name,
      },
    );

    setMessageType(
      'success',
    );

    setMessage(
      `${row.dishName} linked for review as an alias of ${match.dish.name}.`,
    );
  }

  const queueStats =
    useMemo(
      () => ({
        total:
          rows.length,

        highPriority:
          rows.filter(
            (row) =>
              row.occurrences >= 3,
          ).length,

        likelyDuplicate:
          rows.filter(
            (row) =>
              (
                catalogMatchMap.get(
                  row.id,
                )?.[0]
                  ?.score ?? 0
              ) >= 0.72,
          ).length,

        verified:
          rows.filter(
            (row) =>
              Boolean(
                verifications[
                  row.id
                ]?.confirmed,
              ),
          ).length,
      }),
      [
        rows,
        catalogMatchMap,
        verifications,
      ],
    );

  const filteredRows =
    useMemo(() => {
      const search =
        deferredQuery
          .trim()
          .toLowerCase();

      const filtered =
        rows.filter(
          (row) => {
            const matchesSearch =
              !search ||
              [
                row.name,
                row.dishName,
                row.aliasCategory,
                row.aliasTarget,
                row.categoryHint,
                row.category,
                row.sourceFileName,
              ].some(
                (value) =>
                  String(
                    value || '',
                  )
                    .toLowerCase()
                    .includes(
                      search,
                    ),
              );

            if (
              !matchesSearch
            ) {
              return false;
            }

            if (
              categoryFilter !==
                'ALL' &&
              row.category !==
                categoryFilter &&
              row.categoryHint !==
                categoryFilter
            ) {
              return false;
            }

            const bestMatch =
              catalogMatchMap.get(
                row.id,
              )?.[0];

            const verified =
              Boolean(
                verifications[
                  row.id
                ]?.confirmed,
              );

            if (
              reviewFilter ===
                'HIGH_PRIORITY' &&
              row.occurrences < 3
            ) {
              return false;
            }

            if (
              reviewFilter ===
                'LIKELY_DUPLICATE' &&
              (
                bestMatch
                  ?.score ?? 0
              ) < 0.72
            ) {
              return false;
            }

            if (
              reviewFilter ===
                'VERIFIED' &&
              !verified
            ) {
              return false;
            }

            if (
              reviewFilter ===
                'UNVERIFIED' &&
              verified
            ) {
              return false;
            }

            return true;
          },
        );

      return [
        ...filtered,
      ].sort(
        (left, right) => {
          if (
            queueSort ===
            'MOST_SEEN'
          ) {
            return (
              right.occurrences -
              left.occurrences
            );
          }

          if (
            queueSort ===
            'NEWEST'
          ) {
            return (
              new Date(
                right.updatedAt,
              ).getTime() -
              new Date(
                left.updatedAt,
              ).getTime()
            );
          }

          if (
            queueSort ===
            'OLDEST'
          ) {
            return (
              new Date(
                left.createdAt,
              ).getTime() -
              new Date(
                right.createdAt,
              ).getTime()
            );
          }

          if (
            queueSort ===
            'NAME'
          ) {
            return left.dishName
              .localeCompare(
                right.dishName,
              );
          }

          const leftMatch =
            catalogMatchMap.get(
              left.id,
            )?.[0]?.score ?? 0;

          const rightMatch =
            catalogMatchMap.get(
              right.id,
            )?.[0]?.score ?? 0;

          const leftScore =
            left.occurrences * 10 +
            leftMatch * 40 +
            (
              verifications[
                left.id
              ]?.confirmed
                ? 0
                : 5
            );

          const rightScore =
            right.occurrences * 10 +
            rightMatch * 40 +
            (
              verifications[
                right.id
              ]?.confirmed
                ? 0
                : 5
            );

          return (
            rightScore -
            leftScore
          );
        },
      );
    }, [
      rows,
      deferredQuery,
      categoryFilter,
      reviewFilter,
      queueSort,
      catalogMatchMap,
      verifications,
    ]);

  useEffect(() => {
    setVisibleLimit(40);
  }, [
    deferredQuery,
    categoryFilter,
    reviewFilter,
    queueSort,
  ]);

  const visibleRows = useMemo(
    () => filteredRows.slice(0, visibleLimit),
    [filteredRows, visibleLimit],
  );

  return (
    <AppShell
      title="New Dish Intelligence"
      subtitle="Review, match, verify and publish dishes detected from client menus"
    >
      <section className="content-grid">
        <div className="new-dish-overview">
          <div>
            <span className="section-kicker">
              Review queue
            </span>
            <h2>
              {rows.length
                ? `${rows.length} possible new ${rows.length === 1 ? 'dish' : 'dishes'}`
                : 'No dishes waiting'}
            </h2>
            <p>
              Client menus contain only
              approved catalog dishes.
              Review each suggestion here
              before publishing it.
            </p>
          </div>
          <div className="new-dish-overview-actions">
            <button
              className="primary-button"
              type="button"
              onClick={() =>
                void analyzeSuggestions()
              }
              disabled={
                loading ||
                analyzingAll ||
                !rows.length
              }
            >
              {analyzingAll
                ? 'AI analyzing…'
                : `AI Analyze ${Math.min(rows.length, 30)}`
              }
            </button>

            <button
              className="ghost-button"
              type="button"
              onClick={() => void loadQueue()}
              disabled={loading}
            >
              {loading ? 'Refreshing…' : 'Refresh queue'}
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                setRecipeStudioOpened(true);
                window.requestAnimationFrame(() => {
                  document
                    .getElementById('new-dish-recipe-studio')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
              }}
            >
              Open Recipe Studio
            </button>
          </div>
        </div>

        <div
          className="new-dish-smart-summary"
          aria-label="New dish queue summary"
        >
          <button
            type="button"
            className={
              reviewFilter ===
              'ALL'
                ? 'is-active'
                : ''
            }
            onClick={() =>
              setReviewFilter(
                'ALL',
              )
            }
          >
            <span>
              Queue
            </span>
            <strong>
              {queueStats.total}
            </strong>
            <small>
              Total candidates
            </small>
          </button>

          <button
            type="button"
            className={
              reviewFilter ===
              'HIGH_PRIORITY'
                ? 'is-active'
                : ''
            }
            onClick={() =>
              setReviewFilter(
                'HIGH_PRIORITY',
              )
            }
          >
            <span>
              Priority
            </span>
            <strong>
              {
                queueStats.highPriority
              }
            </strong>
            <small>
              Seen 3+ times
            </small>
          </button>

          <button
            type="button"
            className={
              reviewFilter ===
              'LIKELY_DUPLICATE'
                ? 'is-active'
                : ''
            }
            onClick={() =>
              setReviewFilter(
                'LIKELY_DUPLICATE',
              )
            }
          >
            <span>
              Matches
            </span>
            <strong>
              {
                queueStats.likelyDuplicate
              }
            </strong>
            <small>
              Likely aliases
            </small>
          </button>

          <button
            type="button"
            className={
              reviewFilter ===
              'VERIFIED'
                ? 'is-active'
                : ''
            }
            onClick={() =>
              setReviewFilter(
                'VERIFIED',
              )
            }
          >
            <span>
              Verified
            </span>
            <strong>
              {queueStats.verified}
            </strong>
            <small>
              Confirmed dishes
            </small>
          </button>
        </div>

        {message ? (
          <div
            className={`admin-message ${messageType}`}
            role="status"
          >
            {message}
          </div>
        ) : null}

        <div className="glass-card new-dish-queue">
          <div className="new-dish-toolbar">
            <div>
              <h2>Uploaded suggestions</h2>
              <p>
                For each incoming dish,
                choose one of two options:
                create a new available dish
                or link the name as an alias.
              </p>
            </div>
            <div className="new-dish-smart-controls">
              <input
                className="input"
                value={query}
                onChange={(event) =>
                  setQuery(
                    event.target.value,
                  )
                }
                placeholder="Search dish, category or source…"
                aria-label="Search new dish suggestions"
              />

              <select
                className="select"
                value={
                  categoryFilter
                }
                onChange={(event) =>
                  setCategoryFilter(
                    event.target
                      .value,
                  )
                }
                aria-label="Filter by category"
              >
                <option value="ALL">
                  All categories
                </option>

                {categories.map(
                  (category) => (
                    <option
                      key={
                        category
                      }
                      value={
                        category
                      }
                    >
                      {category}
                    </option>
                  ),
                )}
              </select>

              <select
                className="select"
                value={
                  reviewFilter
                }
                onChange={(event) =>
                  setReviewFilter(
                    event.target
                      .value as ReviewFilter,
                  )
                }
                aria-label="Review status"
              >
                <option value="ALL">
                  All review states
                </option>

                <option value="HIGH_PRIORITY">
                  High priority
                </option>

                <option value="LIKELY_DUPLICATE">
                  Likely duplicate
                </option>

                <option value="VERIFIED">
                  Verified
                </option>

                <option value="UNVERIFIED">
                  Unverified
                </option>
              </select>

              <select
                className="select"
                value={queueSort}
                onChange={(event) =>
                  setQueueSort(
                    event.target
                      .value as QueueSort,
                  )
                }
                aria-label="Sort review queue"
              >
                <option value="PRIORITY">
                  Smart priority
                </option>

                <option value="MOST_SEEN">
                  Most detected
                </option>

                <option value="NEWEST">
                  Newest
                </option>

                <option value="OLDEST">
                  Oldest
                </option>

                <option value="NAME">
                  Dish name A–Z
                </option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="admin-empty">
              <strong>
                Loading new dishes…
              </strong>
            </div>
          ) : null}

          {!loading &&
          !visibleRows.length ? (
            <div className="admin-empty">
              <strong>
                {rows.length
                  ? 'No matching suggestions'
                  : 'The review queue is clear'}
              </strong>
              <span>
                New candidates from client
                menu uploads will appear
                here.
              </span>
            </div>
          ) : null}

          <div className="new-dish-list">
            {visibleRows.map((row) => (
              <article
                className="new-dish-card"
                key={row.id}
              >
                <div className="new-dish-source">
                  <div>
                    <span>
                      Detected text
                    </span>
                    <strong>
                      {row.name}
                    </strong>
                  </div>
                  <div>
                    <b>
                      Seen{' '}
                      {row.occurrences}{' '}
                      {row.occurrences === 1
                        ? 'time'
                        : 'times'}
                    </b>
                    <small>
                      {row.sourceFileName ||
                        'Pasted menu'}
                    </small>
                  </div>
                </div>

                <div className="new-dish-signal-bar">
                  <span
                    className={
                      row.occurrences >= 3
                        ? 'new-dish-signal priority'
                        : 'new-dish-signal'
                    }
                  >
                    {row.occurrences >= 3
                      ? '⚡ High priority'
                      : 'Normal priority'}
                  </span>

                  <span
                    className={
                      isLikelyDuplicate(
                        row,
                      )
                        ? 'new-dish-signal duplicate'
                        : 'new-dish-signal new'
                    }
                  >
                    {isLikelyDuplicate(
                      row,
                    )
                      ? `↔ Likely alias ${Math.round((bestMatchFor(row)?.score ?? 0) * 100)}%`
                      : '＋ Likely new dish'}
                  </span>

                  {verifications[
                    row.id
                  ]?.confirmed ? (
                    <span className="new-dish-signal verified">
                      ✓ Verified
                    </span>
                  ) : (
                    <span className="new-dish-signal pending">
                      Verification pending
                    </span>
                  )}

                  <span className="new-dish-signal date">
                    Updated{' '}
                    {formatReviewDate(
                      row.updatedAt,
                    )}
                  </span>
                </div>

                <div
                  className={`new-dish-ai-panel ${
                    row.riskLevel
                      ? `risk-${row.riskLevel.toLowerCase()}`
                      : ''
                  }`}
                >
                  <div className="new-dish-ai-heading">
                    <div>
                      <span className="section-kicker">
                        AI decision intelligence
                      </span>

                      <strong>
                        {row.analyzedAt
                          ? (
                              row.canonicalName ||
                              row.dishName
                            )
                          : 'Not analyzed yet'}
                      </strong>
                    </div>

                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() =>
                        void analyzeSuggestions([
                          row.id,
                        ])
                      }
                      disabled={
                        analyzingAll ||
                        analyzingId ===
                          row.id ||
                        Boolean(
                          workingId,
                        )
                      }
                    >
                      {analyzingId ===
                      row.id
                        ? 'Analyzing…'
                        : row.analyzedAt
                          ? 'Re-analyze'
                          : 'Analyze dish'}
                    </button>
                  </div>

                  {row.analyzedAt ? (
                    <>
                      <div className="new-dish-ai-metrics">
                        <div>
                          <span>
                            AI confidence
                          </span>
                          <strong>
                            {Math.round(
                              Number(
                                row.aiConfidence,
                              ) || 0,
                            )}
                            %
                          </strong>
                        </div>

                        <div>
                          <span>
                            Duplicate
                          </span>
                          <strong>
                            {Math.round(
                              Number(
                                row.duplicateScore,
                              ) || 0,
                            )}
                            %
                          </strong>
                        </div>

                        <div>
                          <span>
                            Decision
                          </span>
                          <strong>
                            {row.recommendation ||
                              'REVIEW'}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Risk
                          </span>
                          <strong>
                            {row.riskLevel ||
                              'MEDIUM'}
                          </strong>
                        </div>
                      </div>

                      <div className="new-dish-ai-details">
                        <div>
                          <span>
                            Canonical name
                          </span>
                          <b>
                            {row.canonicalName ||
                              row.dishName}
                          </b>
                        </div>

                        <div>
                          <span>
                            Suggested classification
                          </span>
                          <b>
                            {row.suggestedCategory ||
                              row.category}
                            {row.suggestedSubcategory
                              ? ` → ${row.suggestedSubcategory}`
                              : ''}
                          </b>
                        </div>

                        {row.matchedDishName ? (
                          <div>
                            <span>
                              Existing match
                            </span>
                            <b>
                              {row.matchedDishName}
                            </b>
                          </div>
                        ) : null}
                      </div>

                      {row.analysisReason ? (
                        <p className="new-dish-ai-reason">
                          {row.analysisReason}
                        </p>
                      ) : null}

                      <div className="new-dish-readiness">
                        <span className={
                          Number(row.aiConfidence) >= 80
                            ? 'ready'
                            : ''
                        }>
                          {Number(row.aiConfidence) >= 80
                            ? '✓'
                            : '○'} Identity
                        </span>

                        <span className={
                          row.suggestedCategory
                            ? 'ready'
                            : ''
                        }>
                          {row.suggestedCategory
                            ? '✓'
                            : '○'} Category
                        </span>

                        <span className={
                          row.recommendation &&
                          row.recommendation !==
                            'REVIEW'
                            ? 'ready'
                            : ''
                        }>
                          {row.recommendation &&
                          row.recommendation !==
                            'REVIEW'
                            ? '✓'
                            : '○'} Decision
                        </span>

                        <span className={
                          row.riskLevel === 'LOW'
                            ? 'ready'
                            : ''
                        }>
                          {row.riskLevel === 'LOW'
                            ? '✓'
                            : '○'} Low risk
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="new-dish-ai-empty">
                      <strong>
                        Run AI analysis
                      </strong>
                      <span>
                        Classify the dish, clean its name, estimate duplicate risk and recommend New Dish, Alias, Review or Reject.
                      </span>
                    </div>
                  )}
                </div>

                <div className="new-dish-match-panel">
                  <div className="new-dish-match-heading">
                    <div>
                      <span className="section-kicker">
                        Catalog intelligence
                      </span>

                      <strong>
                        {isLikelyDuplicate(
                          row,
                        )
                          ? 'Existing dish match found'
                          : 'Checking against Dish Master'}
                      </strong>
                    </div>

                    <span
                      className={
                        isLikelyDuplicate(
                          row,
                        )
                          ? 'new-dish-recommendation alias'
                          : 'new-dish-recommendation new'
                      }
                    >
                      {isLikelyDuplicate(
                        row,
                      )
                        ? 'Recommended: Alias'
                        : 'Recommended: New Dish'}
                    </span>
                  </div>

                  {catalogMatchesFor(
                    row,
                  ).length ? (
                    <div className="new-dish-match-list">
                      {catalogMatchesFor(
                        row,
                      ).map(
                        (
                          match,
                          index,
                        ) => (
                          <div
                            className="new-dish-match"
                            key={`${row.id}-${match.dish.category}-${match.dish.name}`}
                          >
                            <div className="new-dish-match-score">
                              <strong>
                                {Math.round(
                                  match.score *
                                    100,
                                )}
                                %
                              </strong>

                              <span>
                                match
                              </span>
                            </div>

                            <div className="new-dish-match-copy">
                              <strong>
                                {
                                  match
                                    .dish
                                    .name
                                }
                              </strong>

                              <span>
                                {
                                  match
                                    .dish
                                    .category
                                }
                                {' · ₹'}
                                {
                                  match
                                    .dish
                                    .rate
                                }
                                {' · '}
                                {
                                  match.reason
                                }
                              </span>
                            </div>

                            <button
                              type="button"
                              className={
                                index === 0
                                  ? 'primary-button'
                                  : 'ghost-button'
                              }
                              onClick={() =>
                                applyCatalogMatch(
                                  row,
                                  match,
                                )
                              }
                              disabled={
                                Boolean(
                                  workingId,
                                )
                              }
                            >
                              Use as Alias
                            </button>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <div className="new-dish-no-match">
                      <strong>
                        No strong catalog match
                      </strong>

                      <span>
                        This candidate appears different from your current Dish Master and is more likely to be a genuine new dish.
                      </span>
                    </div>
                  )}
                </div>

                <div className="new-dish-verification">
                  <div className="new-dish-verification-heading">
                    <div>
                      <b>Google dish verification</b>
                      <span>
                        Search for food or recipe evidence, review it, then confirm manually.
                      </span>
                    </div>
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() =>
                        void verifyOnGoogle(row)
                      }
                      disabled={
                        Boolean(workingId) ||
                        verifications[row.id]
                          ?.loading
                      }
                    >
                      {verifications[row.id]
                        ?.loading
                        ? 'Searching…'
                        : 'Search Google'}
                    </button>
                  </div>

                  {verifications[row.id]
                    ?.error ? (
                    <p className="new-dish-verification-error">
                      {verifications[row.id].error}
                    </p>
                  ) : null}

                  {verifications[row.id]
                    ?.searched ? (
                    <div className="new-dish-search-results">
                      {verifications[row.id]
                        .results.length ? (
                        verifications[row.id]
                          .results.map(
                            (result) => (
                              <a
                                href={result.link}
                                key={result.link}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <b>{result.title}</b>
                                <span>{result.snippet}</span>
                              </a>
                            ),
                          )
                      ) : (
                        <p>
                          Review the Google results in the opened tab. Automatic in-app results require the optional Google API configuration.
                        </p>
                      )}

                      <div className="new-dish-verification-confirm">
                        {verifications[row.id]
                          .searchUrl ? (
                          <a
                            href={verifications[row.id].searchUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open full Google search
                          </a>
                        ) : null}
                        <button
                          type="button"
                          onClick={() =>
                            confirmGoogleDish(
                              row.id,
                            )
                          }
                          disabled={
                            verifications[row.id]
                              .confirmed
                          }
                        >
                          {verifications[row.id]
                            .confirmed
                            ? '✓ Dish confirmed'
                            : 'Confirm this is a dish'}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="new-dish-save-choice">
                  <span>Add to Available Dishes as</span>
                  <div role="group" aria-label={`How to add ${row.dishName}`}>
                    <button
                      type="button"
                      className={row.saveAs === 'new' ? 'active' : ''}
                      aria-pressed={row.saveAs === 'new'}
                      onClick={() => updateRow(row.id, {
                        saveAs: 'new',
                        dishName:
                          row.canonicalName ||
                          row.dishName,
                        aliasCategory: '',
                        aliasTarget: '',
                      })}
                    >
                      New Dish
                    </button>
                    <button
                      type="button"
                      className={row.saveAs === 'alias' ? 'active' : ''}
                      aria-pressed={row.saveAs === 'alias'}
                      onClick={() => updateRow(row.id, {
                        saveAs: 'alias',
                        dishName: row.name,
                      })}
                    >
                      Alias of Available Dish
                    </button>
                  </div>
                </div>

                <div className="new-dish-fields">
                  <div className="field">
                    <label>
                      {row.saveAs === 'alias' ? 'Alias name' : 'Dish name'}
                    </label>
                    <input
                      className="input"
                      value={
                        row.dishName
                      }
                      onChange={(event) =>
                        updateRow(row.id, {
                          dishName:
                            event.target
                              .value,
                        })
                      }
                    />
                  </div>
                  {row.saveAs === 'alias' ? (
                    <>
                    <div className="field">
                      <label>Present dish category</label>
                      <select
                        className="select"
                        value={row.aliasCategory}
                        onChange={(event) =>
                          updateRow(row.id, {
                            aliasCategory: event.target.value,
                            aliasTarget: '',
                          })
                        }
                      >
                        <option value="">Select category…</option>
                        {Array.from(new Set(
                          catalogDishes.map((dish) => dish.category).filter(Boolean),
                        )).sort((left, right) => left.localeCompare(right)).map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label>Present catalog dish</label>
                      <select
                        className="select"
                        value={row.aliasTarget}
                        onChange={(event) =>
                          updateRow(row.id, {
                            aliasTarget: event.target.value,
                          })
                        }
                        disabled={!row.aliasCategory}
                      >
                        <option value="">
                          {row.aliasCategory
                            ? 'Select present dish…'
                            : 'Select category first…'}
                        </option>
                        {catalogDishes
                          .filter((dish) => dish.category === row.aliasCategory)
                          .map((dish) => (
                            <option key={dish.name} value={dish.name}>
                              {dish.name} · ₹{dish.rate}
                            </option>
                          ))}
                      </select>
                    </div>
                    </>
                  ) : (
                  <><div className="field">
                    <label>
                      Category
                    </label>
                    <select
                      className="select"
                      value={row.category}
                      onChange={(event) =>
                        updateRow(row.id, {
                          category:
                            event.target
                              .value,
                        })
                      }
                    >
                      {categories.map(
                        (category) => (
                          <option
                            key={category}
                            value={category}
                          >
                            {category}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                  <div className="field">
                    <label>
                      Subcategory
                    </label>
                    <input
                      className="input"
                      value={
                        row.subcategory
                      }
                      onChange={(event) =>
                        updateRow(row.id, {
                          subcategory:
                            event.target
                              .value,
                        })
                      }
                      placeholder="Optional"
                    />
                  </div>
                  <div className="field">
                    <label>
                      Rate per serving (optional)
                    </label>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.rate}
                      onChange={(event) =>
                        updateRow(row.id, {
                          rate:
                            event.target
                              .value,
                        })
                      }
                      placeholder="Optional · ₹0"
                    />
                  </div>
                  </>
                  )}
                </div>

                {rowErrors[row.id] ? (
                  <div
                    className="admin-message error"
                    role="alert"
                  >
                    {rowErrors[row.id]}
                  </div>
                ) : null}

                <div className="new-dish-actions">
                  <span className={
                    row.saveAs === 'alias' && (!row.aliasCategory || !row.aliasTarget)
                      ? 'new-dish-requirement'
                      : ''
                  }>
                    {row.saveAs === 'alias' && (!row.aliasCategory || !row.aliasTarget)
                      ? 'Required: Choose the existing catalog dish.'
                      : <>
                          Suggested category:{' '}
                          <b>{row.categoryHint}</b>
                        </>}
                  </span>
                  <button
                    className="danger-button"
                    type="button"
                    onClick={() =>
                      void reject(row)
                    }
                    disabled={
                      Boolean(workingId)
                    }
                  >
                    Reject
                  </button>
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() =>
                      void approve(row)
                    }
                    disabled={
                      Boolean(workingId)
                    }
                  >
                    {workingId === row.id
                      ? 'Saving…'
                      : row.saveAs === 'alias'
                        ? 'Add as Alias'
                        : 'Add as New Dish'}
                  </button>
                  {row.saveAs === 'new' ? (
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => void approve(row, true)}
                      disabled={Boolean(workingId)}
                    >
                      {workingId === row.id
                        ? 'Saving…'
                        : 'Approve + Auto Build'}
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>

          {visibleRows.length < filteredRows.length ? (
            <div className="new-dish-load-more">
              <span>
                Showing {visibleRows.length} of {filteredRows.length} matching dishes
              </span>
              <button
                className="ghost-button"
                type="button"
                onClick={() =>
                  setVisibleLimit((current) => current + 40)
                }
              >
                Load 40 more
              </button>
            </div>
          ) : null}
        </div>

        {lastAutoBuild ? (
          <div className="glass-card new-dish-auto-build-result">
            <div className="new-dish-auto-build-heading">
              <div>
                <span className="section-kicker">
                  Latest automatic recipe
                </span>

                <h2>
                  {lastAutoBuild.name}
                </h2>

                <p>
                  100-pax recipe saved and ready for menu costing.
                </p>
              </div>

              <span
                className={`new-dish-auto-build-ready status-${lastAutoBuild.quality.status.toLowerCase()}`}
              >
                {lastAutoBuild.quality.status === 'READY'
                  ? '✓ Ready for Costing'
                  : lastAutoBuild.quality.status === 'REVIEW'
                    ? '⚠ Review Recommended'
                    : '✕ Costing Blocked'}
              </span>
            </div>

            <div className="new-dish-auto-build-grid">
              <div>
                <span>
                  Raw ingredient cost
                </span>

                <strong>
                  ₹
                  {lastAutoBuild.cost.rawCostPerPlate.toFixed(2)}
                </strong>

                <small>
                  Per plate
                </small>
              </div>

              <div>
                <span>
                  Wastage
                </span>

                <strong>
                  8%
                </strong>

                <small>
                  ₹
                  {lastAutoBuild.cost.wastagePerPlate.toFixed(2)}
                  {' '}per plate
                </small>
              </div>

              <div className="is-primary">
                <span>
                  Final dish cost
                </span>

                <strong>
                  ₹
                  {lastAutoBuild.cost.costPerPlate.toFixed(2)}
                </strong>

                <small>
                  Including wastage
                </small>
              </div>

              <div>
                <span>
                  100-pax total
                </span>

                <strong>
                  ₹
                  {lastAutoBuild.cost.totalCost.toFixed(2)}
                </strong>

                <small>
                  Full batch
                </small>
              </div>

              <div>
                <span>
                  Ingredients
                </span>

                <strong>
                  {lastAutoBuild.ingredientCount}
                </strong>

                <small>
                  Recipe items
                </small>
              </div>

              <div>
                <span>
                  Estimated rates
                </span>

                <strong>
                  {lastAutoBuild.estimatedIngredientRates}
                </strong>

                <small>
                  Need later review
                </small>
              </div>
            </div>

            <div className="new-dish-quality-panel">
              <div className="new-dish-quality-heading">
                <div>
                  <span className="section-kicker">
                    Cost confidence
                  </span>

                  <strong>
                    {lastAutoBuild.quality.score}%
                  </strong>
                </div>

                <span
                  className={`quality-status ${lastAutoBuild.quality.status.toLowerCase()}`}
                >
                  {lastAutoBuild.quality.status}
                </span>
              </div>

              <div className="new-dish-quality-grid">
                <div>
                  <span>
                    Rate coverage
                  </span>

                  <strong>
                    {lastAutoBuild.quality.rateCoveragePercent}%
                  </strong>
                </div>

                <div>
                  <span>
                    Trusted rates
                  </span>

                  <strong>
                    {lastAutoBuild.quality.trustedRateCount}
                    /
                    {lastAutoBuild.quality.ingredientCount}
                  </strong>
                </div>

                <div>
                  <span>
                    Estimated
                  </span>

                  <strong>
                    {lastAutoBuild.quality.estimatedRates}
                  </strong>
                </div>

                <div>
                  <span>
                    Missing
                  </span>

                  <strong>
                    {lastAutoBuild.quality.missingRates}
                  </strong>
                </div>

                <div>
                  <span>
                    Warnings
                  </span>

                  <strong>
                    {lastAutoBuild.quality.warningCount}
                  </strong>
                </div>

                <div>
                  <span>
                    Errors
                  </span>

                  <strong>
                    {lastAutoBuild.quality.errorCount}
                  </strong>
                </div>
              </div>

              {lastAutoBuild.quality.issues.length ? (
                <div className="new-dish-quality-issues">
                  {lastAutoBuild.quality.issues.map(
                    (issue, index) => (
                      <div
                        className={`quality-issue ${issue.severity}`}
                        key={`${issue.code}-${index}`}
                      >
                        <span>
                          {issue.severity === 'error'
                            ? '✕'
                            : '⚠'}
                        </span>

                        <div>
                          <strong>
                            {issue.code.replaceAll('_', ' ')}
                          </strong>

                          <small>
                            {issue.message}
                          </small>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <div className="new-dish-quality-clean">
                  ✓ Recipe passed all automatic costing checks.
                </div>
              )}
            </div>

            <div className="new-dish-auto-build-footer">
              <span>
                Source:{' '}
                <b>
                  {lastAutoBuild.source.replaceAll('_', ' ')}
                </b>
              </span>

              <span>
                Standard master cost:{' '}
                <b>
                  ₹
                  {lastAutoBuild.standardCostPerPlate.toFixed(2)}
                </b>
              </span>

              <button
                className="secondary-button"
                type="button"
                onClick={() =>
                  setRecipeStudioOpened(
                    true,
                  )
                }
              >
                Review / Edit Recipe
              </button>
            </div>
          </div>
        ) : null}

        <div id="new-dish-recipe-studio">
          {recipeStudioOpened ? (
            <RecipeStudioPanel requestedDish={requestedRecipeDish} />
          ) : (
            <div className="glass-card new-dish-recipe-prompt">
              <div>
                <span className="section-kicker">Recipes</span>
                <h2>Add recipes without leaving this page</h2>
                <p>
                  Approve a new dish with “Approve + Auto Build”, or open
                  Recipe Studio to work on any existing recipe.
                </p>
              </div>
              <button
                className="primary-button"
                type="button"
                onClick={() => setRecipeStudioOpened(true)}
              >
                Open Recipe Studio
              </button>
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
