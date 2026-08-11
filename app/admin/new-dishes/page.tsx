'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import AppShell from '../../components/AppShell';
import RecipeStudioPanel, {
  type RecipeStudioDishRequest,
} from '../dishes/RecipeStudioPanel';

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

function reviewTokens(value: string) {
  return normalizeReviewText(value)
    .split(' ')
    .filter(Boolean);
}

function scoreCatalogCandidate(
  input: string,
  candidate: string,
) {
  const left =
    normalizeReviewText(input);

  const right =
    normalizeReviewText(candidate);

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
    new Set(reviewTokens(left));

  const rightTokens =
    new Set(reviewTokens(right));

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
  catalog: CatalogDish[],
): CatalogMatch[] {
  const input =
    normalizeReviewText(
      dishName,
    );

  if (!input) return [];

  return catalog
    .map((dish) => {
      let bestScore =
        scoreCatalogCandidate(
          input,
          dish.name,
        );

      let reason =
        bestScore === 1
          ? 'Exact dish name'
          : bestScore >= 0.9
            ? 'Very similar name'
            : 'Similar words';

      for (
        const alias of
        dish.aliases ?? []
      ) {
        const aliasScore =
          scoreCatalogCandidate(
            input,
            alias,
          );

        if (
          aliasScore >
          bestScore
        ) {
          bestScore =
            aliasScore;

          reason =
            aliasScore === 1
              ? 'Exact alias'
              : aliasScore >= 0.9
                ? 'Very similar alias'
                : 'Similar alias';
        }
      }

      return {
        dish,
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
    useState<string[]>([]);
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
  const [messageType, setMessageType] =
    useState<'success' | 'error'>(
      'success',
    );
  const [query, setQuery] =
    useState('');

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

  const [verifications, setVerifications] =
    useState<Record<string, DishVerification>>({});
  const [recipeStudioOpened, setRecipeStudioOpened] =
    useState(false);
  const [requestedRecipeDish, setRequestedRecipeDish] =
    useState<RecipeStudioDishRequest | null>(null);

  async function loadQueue() {
    setLoading(true);
    setMessage('');

    try {
      const [
        queueResponse,
        catalogResponse,
      ] = await Promise.all([
        fetch(
          '/api/admin/dish-suggestions',
          { cache: 'no-store' },
        ),
        fetch('/api/admin/dishes', {
          cache: 'no-store',
        }),
      ]);
      const queueData =
        await queueResponse.json();
      const catalogData =
        await catalogResponse.json();

      if (!queueResponse.ok) {
        throw new Error(
          queueData.error ||
            'Could not load new dishes',
        );
      }

      const availableCategories =
        Array.isArray(
          catalogData.categories,
        )
          ? catalogData.categories
              .map(String)
              .filter(Boolean)
          : ['Other'];

      setCategories(
        availableCategories,
      );
      setCatalogDishes(
        Array.isArray(catalogData.items)
          ? catalogData.items
              .map((item: Record<string, unknown>) => ({
                name: String(item.name || '').trim(),
                category: String(item.category || '').trim(),
                rate: Math.max(Number(item.rate) || 0, 0),
                aliases: Array.isArray(item.aliases)
                  ? item.aliases.map(String).filter(Boolean)
                  : [],
              }))
              .filter((item: CatalogDish) => item.name)
          : [],
      );
      setRows(
        (
          queueData.suggestions ||
          []
        ).map(
          (
            suggestion: Suggestion,
          ): EditableSuggestion => ({
            ...suggestion,
            dishName:
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
            saveAs: 'new',
            aliasCategory: '',
            aliasTarget: '',
          }),
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

              return {
                ...row,
                ...analysis,

                dishName:
                  analysis
                    .canonicalName ||
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
    const verification =
      verifications[row.id];
    const aliasTarget = catalogDishes.find(
      (dish) =>
        dish.name.toLowerCase() ===
          row.aliasTarget.trim().toLowerCase() &&
        dish.category.toLowerCase() ===
          row.aliasCategory.trim().toLowerCase(),
    );

    if (
      !row.dishName.trim() ||
      (row.saveAs === 'new' &&
        !row.category) ||
      (row.saveAs === 'alias' &&
        (!row.aliasCategory || !aliasTarget))
    ) {
      setMessageType('error');
      setMessage(
        !row.dishName.trim()
          ? 'Enter a dish name before adding it.'
          : row.saveAs === 'alias'
              ? 'Choose an existing catalog dish for this alias.'
              : !row.category
                ? 'Choose a category before adding the dish.'
                : 'Could not add the dish.',
      );
      return;
    }

    setWorkingId(row.id);
    setMessage('');

    try {
      const response = await fetch(
        '/api/admin/dish-suggestions',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            id: row.id,
            name: row.dishName,
            category: row.category,
            subcategory:
              row.subcategory,
            rate:
              Number(row.rate) || 0,
            mode: row.saveAs,
            aliasOf: aliasTarget?.name || '',
            googleVerified:
              Boolean(verification?.confirmed),
          }),
        },
      );
      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Could not add the dish',
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
        buildRecipe
          ? `${row.dishName.trim()} was added. Its recipe is ready below.`
          : row.saveAs === 'alias'
          ? `${row.dishName.trim()} was added as an alias of ${aliasTarget?.name}.`
          : `${row.dishName.trim()} was added to the Dish Catalog.`,
      );
      if (buildRecipe && row.saveAs === 'new') {
        setRequestedRecipeDish({
          requestId: `new_dish_recipe_${row.id}_${Date.now()}`,
          name: row.dishName.trim(),
          category: row.category.trim() || 'Other',
          subcategory: row.subcategory.trim(),
        });
        setRecipeStudioOpened(true);
        window.requestAnimationFrame(() => {
          document
            .getElementById('new-dish-recipe-studio')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    } catch (error) {
      setMessageType('error');
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not add the dish',
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
                catalogDishes,
              ),
            ],
          ),
        ),
      [
        rows,
        catalogDishes,
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

  const visibleRows =
    useMemo(() => {
      const search =
        query
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
      query,
      categoryFilter,
      reviewFilter,
      queueSort,
      catalogMatchMap,
      verifications,
    ]);

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
                      Rate per serving
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
                        : 'Add Dish & Build Recipe'}
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </div>

        <div id="new-dish-recipe-studio">
          {recipeStudioOpened ? (
            <RecipeStudioPanel requestedDish={requestedRecipeDish} />
          ) : (
            <div className="glass-card new-dish-recipe-prompt">
              <div>
                <span className="section-kicker">Recipes</span>
                <h2>Add recipes without leaving this page</h2>
                <p>
                  Approve a new dish with “Add Dish &amp; Build Recipe”, or open
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
