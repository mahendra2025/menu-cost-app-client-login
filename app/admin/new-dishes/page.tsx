'use client';

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react';

import AppShell from '../../components/AppShell';

import {
  CATEGORIES,
} from '../../../lib/dishCostMaster';
import {
  recipeServingStandard,
} from '../../../lib/recipeServingStandards';

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
  subcategory: string;
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
  | 'READY'
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

  ok?: boolean;
  previewOnly?: boolean;
  error?: string;

  recipe?: {
    name: string;
    aliases?: string[];
    baseGuests: number;

    ingredients: Array<{
      name: string;
      quantity: number;
      unit: string;
      rate?: number;
      rateUnit?: string;
      rateSource?: string;
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

type RecipeIngredientMaster = {
  id: string;
  name: string;
  category: string;
  rate: number;
  unit: string;
};

type RecipeDraftIngredient = {
  rowId: string;
  rateKey: string;
  name: string;
  quantity: string;
  unit: string;
  rate: number;
  rateUnit: string;
};

type RecipeDraft = {
  suggestionId: string;
  name: string;
  category: string;
  subcategory: string;
  baseGuests: number;
  ingredients:
    RecipeDraftIngredient[];
};

type QuickRecipeResult = {
  ok?: boolean;
  updatedAt?: string;

  cost?: {
    rawCostPerPlate:
      number;
    wastagePercent:
      number;
    wastagePerPlate:
      number;
    costPerPlate:
      number;
    rawTotal:
      number;
    wastageTotal:
      number;
    totalCost:
      number;
  };

  quality?: {
    status:
      | 'READY'
      | 'REVIEW'
      | 'BLOCKED';

    score: number;
    ingredientCount:
      number;
    trustedRateCount:
      number;
    rateCoveragePercent:
      number;
    estimatedRates:
      number;
    missingRates:
      number;
    warningCount:
      number;
    errorCount:
      number;

    issues: Array<{
      severity:
        | 'warning'
        | 'error';

      code: string;
      message: string;
      ingredient?: string;
    }>;
  };

  error?: string;
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


function quickRecipeMoney(
  value: number,
) {
  return `₹${Math.max(
    0,
    Number(value) || 0,
  ).toLocaleString(
    'en-IN',
    {
      maximumFractionDigits: 2,
    },
  )}`;
}

function convertRecipeQuantity(
  quantity: number,
  unit: string,
  rateUnit: string,
) {
  if (
    unit === rateUnit
  ) {
    return quantity;
  }

  if (
    unit === 'gram' &&
    rateUnit === 'kg'
  ) {
    return quantity / 1000;
  }

  if (
    unit === 'kg' &&
    rateUnit === 'gram'
  ) {
    return quantity * 1000;
  }

  if (
    unit === 'ml' &&
    rateUnit === 'ltr'
  ) {
    return quantity / 1000;
  }

  if (
    unit === 'ltr' &&
    rateUnit === 'ml'
  ) {
    return quantity * 1000;
  }

  return quantity;
}

function quickRecipeUnitsCompatible(
  left: string,
  right: string,
) {
  if (left === right) {
    return true;
  }

  const mass =
    new Set([
      'kg',
      'gram',
    ]);

  const volume =
    new Set([
      'ltr',
      'ml',
    ]);

  return Boolean(
    (
      mass.has(left) &&
      mass.has(right)
    ) ||
    (
      volume.has(left) &&
      volume.has(right)
    ),
  );
}

function quickIngredientNameTokens(
  value: string,
) {
  const tokenAliases:
    Record<string, string> = {
      chili: 'chilli',
      chilies: 'chilli',
      chillies: 'chilli',
      chillis: 'chilli',
      tomatoes: 'tomato',
      potatoes: 'potato',
      onions: 'onion',
      cashews: 'cashew',
      almonds: 'almond',
      raisins: 'raisin',
      peas: 'pea',
    };

  const ignore =
    new Set([
      'fresh',
      'finely',
      'chopped',
      'sliced',
      'grated',
      'peeled',
      'cleaned',
    ]);

  return normalizeReviewText(
    value,
  )
    .split(' ')
    .filter(Boolean)
    .map(
      (token) =>
        tokenAliases[token] ||
        token,
    )
    .filter(
      (token) =>
        !ignore.has(token),
    );
}

function quickIngredientMatchScore(
  leftName: string,
  rightName: string,
) {
  const leftRaw =
    normalizeReviewText(
      leftName,
    );

  const rightRaw =
    normalizeReviewText(
      rightName,
    );

  if (
    !leftRaw ||
    !rightRaw
  ) {
    return 0;
  }

  if (
    leftRaw === rightRaw
  ) {
    return 1;
  }

  const left =
    quickIngredientNameTokens(
      leftName,
    );

  const right =
    quickIngredientNameTokens(
      rightName,
    );

  if (
    !left.length ||
    !right.length
  ) {
    return 0;
  }

  const protectedForms =
    new Set([
      'powder',
      'paste',
      'puree',
      'juice',
      'oil',
      'sauce',
      'syrup',
    ]);

  const leftForms =
    new Set(
      left.filter(
        (token) =>
          protectedForms.has(
            token,
          ),
      ),
    );

  const rightForms =
    new Set(
      right.filter(
        (token) =>
          protectedForms.has(
            token,
          ),
      ),
    );

  const formKey = (
    values: Set<string>,
  ) =>
    [...values]
      .sort()
      .join('|');

  if (
    formKey(leftForms) !==
    formKey(rightForms)
  ) {
    return 0;
  }

  const leftSet =
    new Set(left);

  const rightSet =
    new Set(right);

  if (
    leftSet.size ===
      rightSet.size &&
    [...leftSet].every(
      (token) =>
        rightSet.has(token),
    )
  ) {
    return 0.99;
  }

  const intersection =
    [...leftSet].filter(
      (token) =>
        rightSet.has(token),
    ).length;

  if (!intersection) {
    return 0;
  }

  const union =
    new Set([
      ...leftSet,
      ...rightSet,
    ]).size;

  const jaccard =
    intersection /
    Math.max(
      union,
      1,
    );

  const coverage =
    intersection /
    Math.max(
      Math.min(
        leftSet.size,
        rightSet.size,
      ),
      1,
    );

  const sizeGap =
    Math.abs(
      leftSet.size -
      rightSet.size,
    );

  if (
    coverage === 1 &&
    sizeGap <= 1
  ) {
    return 0.94;
  }

  return Math.min(
    0.93,
    jaccard * 0.6 +
      coverage * 0.4,
  );
}

function findQuickRecipeMasterMatch(
  ingredientName: string,
  ingredientUnit: string,
  masters: RecipeIngredientMaster[],
) {
  const ranked =
    masters
      .filter(
        (master) =>
          quickRecipeUnitsCompatible(
            ingredientUnit,
            master.unit,
          ),
      )
      .map(
        (master) => ({
          master,

          score:
            quickIngredientMatchScore(
              ingredientName,
              master.name,
            ),
        }),
      )
      .filter(
        (candidate) =>
          candidate.score >=
          0.94,
      )
      .sort(
        (left, right) =>
          right.score -
          left.score,
      );

  if (!ranked.length) {
    return null;
  }

  const best =
    ranked[0];

  const second =
    ranked[1];

  if (
    second &&
    best.score < 1 &&
    best.score -
      second.score <
      0.04
  ) {
    return null;
  }

  return best.master;
}

function quickIngredientCost(
  ingredient:
    RecipeDraftIngredient,
) {
  return (
    convertRecipeQuantity(
      Math.max(
        0,
        Number(
          ingredient.quantity,
        ) || 0,
      ),

      ingredient.unit,

      ingredient.rateUnit ||
        ingredient.unit,
    ) *
    Math.max(
      0,
      Number(
        ingredient.rate,
      ) || 0,
    )
  );
}

function quickRecipeSummary(
  draft: RecipeDraft | null,
) {
  if (!draft) {
    return {
      rawTotal: 0,
      wastageTotal: 0,
      finalTotal: 0,
      rawPerPlate: 0,
      finalPerPlate: 0,
    };
  }

  const guests =
    Math.max(
      1,
      Number(
        draft.baseGuests,
      ) || 100,
    );

  const ingredientTotal =
    draft.ingredients.reduce(
      (
        total,
        ingredient,
      ) =>
        total +
        quickIngredientCost(
          ingredient,
        ),
      0,
    );

  const rawPerPlate =
    Math.round(
      (
        ingredientTotal /
        guests
      ) *
        100,
    ) / 100;

  const finalPerPlate =
    Math.round(
      rawPerPlate *
        1.08 *
        100,
    ) / 100;

  const wastagePerPlate =
    Math.max(
      0,
      finalPerPlate -
        rawPerPlate,
    );

  return {
    rawTotal:
      Math.round(
        rawPerPlate *
          guests *
          100,
      ) / 100,

    wastageTotal:
      Math.round(
        wastagePerPlate *
          guests *
          100,
      ) / 100,

    finalTotal:
      Math.round(
        finalPerPlate *
          guests *
          100,
      ) / 100,

    rawPerPlate,

    finalPerPlate,
  };
}

function quickRecipePrecheck(
  draft: RecipeDraft | null,
) {
  if (!draft) {
    return {
      ready: false,
      message:
        'Start a recipe.',
    };
  }

  if (
    draft.baseGuests !==
    100
  ) {
    return {
      ready: false,
      message:
        'Recipe batch must be 100 pax.',
    };
  }

  if (
    draft.ingredients
      .length < 4
  ) {
    return {
      ready: false,
      message:
        'Add at least 4 costing ingredients.',
    };
  }

  const incomplete =
    draft.ingredients
      .find(
        (ingredient) =>
          !ingredient.name ||
          !ingredient.rateKey ||
          !(
            Number(
              ingredient.quantity,
            ) > 0
          ) ||
          !(
            Number(
              ingredient.rate,
            ) > 0
          ),
      );

  if (incomplete) {
    return {
      ready: false,
      message:
        'Complete ingredient, quantity and Ingredient Master rate.',
    };
  }

  return {
    ready: true,
    message:
      'Ready for server Quality Gate.',
  };
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

  const [
    subcategories,
    setSubcategories,
  ] = useState<
    Record<string, string[]>
  >({});

  const [catalogDishes, setCatalogDishes] =
    useState<CatalogDish[]>([]);
  const [loading, setLoading] =
    useState(true);
  const [workingId, setWorkingId] =
    useState('');

  const [
    selectedIds,
    setSelectedIds,
  ] = useState<Set<string>>(
    new Set(),
  );

  const [
    bulkWorking,
    setBulkWorking,
  ] = useState(false);

  const [
    bulkBuildRecipes,
    setBulkBuildRecipes,
  ] = useState(false);

  const [
    activeReviewId,
    setActiveReviewId,
  ] = useState('');

  const [
    recipeDraft,
    setRecipeDraft,
  ] =
    useState<RecipeDraft | null>(
      null,
    );

  const [
    recipeMasterRates,
    setRecipeMasterRates,
  ] = useState<
    RecipeIngredientMaster[]
  >([]);

  const [
    recipeRatesLoading,
    setRecipeRatesLoading,
  ] = useState(false);

  const [
    recipeGenerating,
    setRecipeGenerating,
  ] = useState(false);

  const [
    recipeSaving,
    setRecipeSaving,
  ] = useState(false);

  const [
    recipeResult,
    setRecipeResult,
  ] =
    useState<QuickRecipeResult | null>(
      null,
    );

  const [
    bulkIngredientOpen,
    setBulkIngredientOpen,
  ] = useState(false);

  const [
    bulkIngredientText,
    setBulkIngredientText,
  ] = useState('');

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

      const sourceSubcategories =
        queueData.subcategories &&
        typeof queueData.subcategories ===
          'object' &&
        !Array.isArray(
          queueData.subcategories,
        )
          ? queueData.subcategories as
              Record<
                string,
                unknown
              >
          : {};

      const availableSubcategories =
        Object.fromEntries(
          availableCategories.map(
            (category) => [
              category,

              Array.isArray(
                sourceSubcategories[
                  category
                ],
              )
                ? (
                    sourceSubcategories[
                      category
                    ] as unknown[]
                  )
                    .map(String)
                    .map(
                      (item) =>
                        item.trim(),
                    )
                    .filter(
                      Boolean,
                    )
                : [],
            ],
          ),
        );

      setSubcategories(
        availableSubcategories,
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

                    subcategory:
                      String(
                        item.subcategory ||
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
      setSelectedIds(
        new Set(),
      );

      setRecipeDraft(
        null,
      );

      setRecipeResult(
        null,
      );
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

  useEffect(() => {
    if (!activeReviewId) {
      document.body.style.overflow = '';
      return;
    }

    document.body.style.overflow = 'hidden';

    const closeOnEscape = (
      event: KeyboardEvent,
    ) => {
      if (event.key === 'Escape') {
        setActiveReviewId('');
      }
    };

    window.addEventListener(
      'keydown',
      closeOnEscape,
    );

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener(
        'keydown',
        closeOnEscape,
      );
    };
  }, [activeReviewId]);

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

  async function loadRecipeMasterRates() {
    if (
      recipeMasterRates
        .length
    ) {
      return recipeMasterRates;
    }

    if (
      recipeRatesLoading
    ) {
      return recipeMasterRates;
    }

    setRecipeRatesLoading(
      true,
    );

    try {
      const response =
        await fetch(
          '/api/admin/recipes/quick-create',
          {
            cache:
              'no-store',
          },
        );

      const data =
        await response.json() as {
          rates?: unknown[];
          error?: string;
        };

      if (!response.ok) {
        throw new Error(
          data.error ||
          'Could not load Ingredient Master.',
        );
      }

      const rates =
        (
          Array.isArray(
            data.rates,
          )
            ? data.rates
            : []
        )
          .flatMap(
            (value) => {
              if (
                !value ||
                typeof value !==
                  'object' ||
                Array.isArray(
                  value,
                )
              ) {
                return [];
              }

              const row =
                value as
                  Record<
                    string,
                    unknown
                  >;

              const id =
                String(
                  row.id ||
                    '',
                ).trim();

              const name =
                String(
                  row.name ||
                    '',
                ).trim();

              const rate =
                Math.max(
                  0,
                  Number(
                    row.rate,
                  ) || 0,
                );

              const unit =
                String(
                  row.unit ||
                    'kg',
                ).trim() ||
                'kg';

              if (
                !id ||
                !name
              ) {
                return [];
              }

              return [
                {
                  id,
                  name,

                  category:
                    String(
                      row.category ||
                        'Other',
                    ).trim() ||
                    'Other',

                  rate,
                  unit,
                },
              ];
            },
          )
          .sort(
            (
              left,
              right,
            ) =>
              left.name
                .localeCompare(
                  right.name,
                ),
          );

      setRecipeMasterRates(
        rates,
      );

      return rates;
    } catch (loadError) {
      setMessageType(
        'error',
      );

      setMessage(
        loadError instanceof
          Error
          ? loadError.message
          : 'Could not load Ingredient Master.',
      );

      return [];
    } finally {
      setRecipeRatesLoading(
        false,
      );
    }
  }

  function openRecipeEditor(
    row: EditableSuggestion,
  ) {
    if (
      row.saveAs !==
      'new'
    ) {
      setMessageType(
        'error',
      );

      setMessage(
        'Aliases use the existing dish recipe. Choose New Dish to create a new recipe.',
      );

      return;
    }

    if (
      recipeDraft
        ?.suggestionId ===
      row.id
    ) {
      setRecipeDraft(
        null,
      );

      setRecipeResult(
        null,
      );

      setBulkIngredientOpen(
        false,
      );

      setBulkIngredientText(
        '',
      );

      return;
    }

    setRecipeResult(
      null,
    );

    setBulkIngredientOpen(
      false,
    );

    setBulkIngredientText(
      '',
    );

    setRecipeDraft({
      suggestionId:
        row.id,

      name:
        row.dishName
          .trim() ||
        row.name,

      category:
        row.category ||
        'Other',

      subcategory:
        row.subcategory ||
        '',

      baseGuests:
        100,

      ingredients: [],
    });

    void loadRecipeMasterRates();
  }

  async function generateQuickRecipe(
    row: EditableSuggestion,
  ) {
    if (
      !recipeDraft ||
      recipeDraft
        .suggestionId !==
        row.id
    ) {
      return;
    }

    if (
      recipeDraft
        .ingredients
        .length
    ) {
      const replace =
        window.confirm(
          'Replace the current recipe ingredients with an AI-generated 100 pax recipe?',
        );

      if (!replace) {
        return;
      }
    }

    setRecipeGenerating(
      true,
    );

    setRecipeResult(
      null,
    );

    setMessage('');

    try {
      const masters =
        recipeMasterRates
          .length
          ? recipeMasterRates
          : await loadRecipeMasterRates();

      if (!masters.length) {
        throw new Error(
          'Ingredient Master has no usable rates.',
        );
      }

      const response =
        await fetch(
          '/api/admin/dish-suggestions/auto-build',
          {
            method:
              'POST',

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
                    .trim() ||
                  row.name,

                category:
                  row.category ||
                  'Other',

                subcategory:
                  row.subcategory ||
                  '',

                previewOnly:
                  true,

                forceAi:
                  true,
              }),
          },
        );

      const data =
        await response
          .json() as
            AutoBuildResult;

      if (!response.ok) {
        throw new Error(
          data.error ||
          'AI could not generate the recipe.',
        );
      }

      const generated =
        data.recipe
          ?.ingredients ||
        [];

      if (!generated.length) {
        throw new Error(
          'AI returned no usable ingredients.',
        );
      }

      const nextIngredients:
        RecipeDraftIngredient[] =
        generated.map(
          (
            ingredient,
            index,
          ) => {
            const normalizedName =
              normalizeReviewText(
                ingredient.name,
              );

            const master =
              masters.find(
                (rate) =>
                  normalizeReviewText(
                    rate.name,
                  ) ===
                    normalizedName &&
                  quickRecipeUnitsCompatible(
                    ingredient.unit,
                    rate.unit,
                  ),
              ) ||
              findQuickRecipeMasterMatch(
                ingredient.name,
                ingredient.unit,
                masters,
              );

            return {
              rowId:
                `ai-${Date.now()}-${index}`,

              rateKey:
                master?.id ||
                '',

              name:
                master?.name ||
                ingredient.name,

              quantity:
                String(
                  ingredient.quantity,
                ),

              unit:
                ingredient.unit,

              rate:
                master?.rate ||
                0,

              rateUnit:
                master?.unit ||
                ingredient.rateUnit ||
                ingredient.unit,
            };
          },
        );

      const unmatched =
        nextIngredients.filter(
          (ingredient) =>
            !ingredient.rateKey,
        ).length;

      const autoMatched =
        nextIngredients.length -
        unmatched;

      setRecipeDraft(
        (current) =>
          current &&
          current.suggestionId ===
            row.id
            ? {
                ...current,

                name:
                  row.dishName
                    .trim() ||
                  current.name,

                category:
                  row.category ||
                  current.category,

                subcategory:
                  row.subcategory ||
                  current.subcategory,

                baseGuests:
                  100,

                ingredients:
                  nextIngredients,
              }
            : current,
      );

      setRecipeResult({
        ok: true,

        cost:
          data.cost,

        quality:
          data.quality,
      });

      setMessageType(
        unmatched
          ? 'error'
          : 'success',
      );

      setMessage(
        unmatched
          ? `AI generated ${nextIngredients.length} ingredients · ${autoMatched} auto-matched · ${unmatched} need manual Ingredient Master matching.`
          : `AI generated ${nextIngredients.length} ingredients · all ${autoMatched} matched to Ingredient Master. Review quantities, cost and Quality Gate before saving.`,
      );
    } catch (generateError) {
      setMessageType(
        'error',
      );

      setMessage(
        generateError instanceof
          Error
          ? generateError.message
          : 'AI recipe generation failed.',
      );
    } finally {
      setRecipeGenerating(
        false,
      );
    }
  }

  function normalizeBulkRecipeUnit(
    value: string,
  ) {
    const normalized =
      String(value || '')
        .trim()
        .toLowerCase();

    const aliases:
      Record<string, string> = {
        kg: 'kg',
        kgs: 'kg',
        kilogram: 'kg',
        kilograms: 'kg',

        g: 'gram',
        gm: 'gram',
        gms: 'gram',
        gram: 'gram',
        grams: 'gram',

        l: 'ltr',
        lt: 'ltr',
        ltr: 'ltr',
        litre: 'ltr',
        liter: 'ltr',
        litres: 'ltr',
        liters: 'ltr',

        ml: 'ml',

        pc: 'piece',
        pcs: 'piece',
        piece: 'piece',
        pieces: 'piece',

        pkt: 'packet',
        pkts: 'packet',
        packet: 'packet',
        packets: 'packet',
      };

    return aliases[normalized] || '';
  }

  async function addBulkRecipeIngredients() {
    if (!recipeDraft) {
      return;
    }

    const lines =
      bulkIngredientText
        .split(/\r?\n/)
        .map(
          (line) =>
            line.trim(),
        )
        .filter(Boolean);

    if (!lines.length) {
      setMessageType('error');
      setMessage(
        'Paste ingredients first. Example: Poha | 6 | kg',
      );
      return;
    }

    const masters =
      recipeMasterRates.length
        ? recipeMasterRates
        : await loadRecipeMasterRates();

    if (!masters.length) {
      setMessageType('error');
      setMessage(
        'Ingredient Master has no usable rates.',
      );
      return;
    }

    const added:
      RecipeDraftIngredient[] = [];

    const unmatched:
      string[] = [];

    const existingKeys =
      new Set(
        recipeDraft.ingredients
          .map(
            (ingredient) =>
              ingredient.rateKey,
          )
          .filter(Boolean),
      );

    lines.forEach(
      (
        line,
        index,
      ) => {
        const parts =
          line
            .split(
              /\s*(?:\||\t|,)\s*/,
            )
            .map(
              (part) =>
                part.trim(),
            )
            .filter(Boolean);

        if (parts.length < 2) {
          unmatched.push(line);
          return;
        }

        const ingredientName =
          parts[0];

        const quantity =
          Math.max(
            0,
            Number(
              parts[1]
                .replace(
                  /[^0-9.]/g,
                  '',
                ),
            ) || 0,
          );

        if (
          !ingredientName ||
          !(quantity > 0)
        ) {
          unmatched.push(line);
          return;
        }

        const requestedUnit =
          normalizeBulkRecipeUnit(
            parts[2] || '',
          );

        const normalizedName =
          normalizeReviewText(
            ingredientName,
          );

        const exactMatches =
          masters.filter(
            (master) =>
              normalizeReviewText(
                master.name,
              ) ===
              normalizedName,
          );

        let master =
          requestedUnit
            ? exactMatches.find(
                (candidate) =>
                  quickRecipeUnitsCompatible(
                    requestedUnit,
                    candidate.unit,
                  ),
              )
            : exactMatches[0];

        if (
          !master &&
          requestedUnit
        ) {
          master =
            findQuickRecipeMasterMatch(
              ingredientName,
              requestedUnit,
              masters,
            ) || undefined;
        }

        if (!master) {
          unmatched.push(line);
          return;
        }

        const ingredientUnit =
          requestedUnit ||
          master.unit;

        if (
          !quickRecipeUnitsCompatible(
            ingredientUnit,
            master.unit,
          )
        ) {
          unmatched.push(line);
          return;
        }

        if (
          existingKeys.has(
            master.id,
          )
        ) {
          unmatched.push(
            `${line}  ← already added`,
          );
          return;
        }

        existingKeys.add(
          master.id,
        );

        added.push({
          rowId:
            `bulk-${Date.now()}-${index}`,

          rateKey:
            master.id,

          name:
            master.name,

          quantity:
            String(quantity),

          unit:
            ingredientUnit,

          rate:
            master.rate,

          rateUnit:
            master.unit,
        });
      },
    );

    if (added.length) {
      setRecipeDraft(
        (current) =>
          current
            ? {
                ...current,

                ingredients: [
                  ...current.ingredients,
                  ...added,
                ],
              }
            : current,
      );
    }

    setBulkIngredientText(
      unmatched.join('\n'),
    );

    setRecipeResult(
      null,
    );

    if (added.length) {
      setMessageType(
        unmatched.length
          ? 'error'
          : 'success',
      );

      setMessage(
        unmatched.length
          ? `${added.length} ingredients added · ${unmatched.length} line${unmatched.length === 1 ? '' : 's'} need review.`
          : `${added.length} ingredients added from bulk paste.`,
      );
    } else {
      setMessageType('error');

      setMessage(
        'No bulk ingredients matched Ingredient Master. Check ingredient name, quantity and unit.',
      );
    }
  }

  function addQuickRecipeIngredient() {
    if (!recipeDraft) {
      return;
    }

    setRecipeDraft(
      {
        ...recipeDraft,

        ingredients: [
          ...recipeDraft
            .ingredients,

          {
            rowId:
              `recipe-${Date.now()}-${Math.random()}`,

            rateKey:
              '',

            name:
              '',

            quantity:
              '1',

            unit:
              'kg',

            rate:
              0,

            rateUnit:
              'kg',
          },
        ],
      },
    );
  }

  function updateQuickRecipeIngredient(
    rowId: string,
    patch:
      Partial<
        RecipeDraftIngredient
      >,
  ) {
    setRecipeDraft(
      (current) =>
        current
          ? {
              ...current,

              ingredients:
                current
                  .ingredients
                  .map(
                    (
                      ingredient,
                    ) =>
                      ingredient
                        .rowId ===
                      rowId
                        ? {
                            ...ingredient,
                            ...patch,
                          }
                        : ingredient,
                  ),
            }
          : current,
    );
  }

  function selectQuickRecipeIngredient(
    rowId: string,
    rateKey: string,
  ) {
    const master =
      recipeMasterRates
        .find(
          (rate) =>
            rate.id ===
            rateKey,
        );

    if (!master) {
      updateQuickRecipeIngredient(
        rowId,
        {
          rateKey: '',
          name: '',
          rate: 0,
        },
      );

      return;
    }

    updateQuickRecipeIngredient(
      rowId,
      {
        rateKey:
          master.id,

        name:
          master.name,

        rate:
          master.rate,

        rateUnit:
          master.unit,

        unit:
          master.unit,
      },
    );
  }

  function removeQuickRecipeIngredient(
    rowId: string,
  ) {
    setRecipeDraft(
      (current) =>
        current
          ? {
              ...current,

              ingredients:
                current
                  .ingredients
                  .filter(
                    (
                      ingredient,
                    ) =>
                      ingredient
                        .rowId !==
                      rowId,
                  ),
            }
          : current,
    );
  }

  async function saveQuickRecipe(
    row: EditableSuggestion,
    publishDish: boolean,
  ) {
    if (
      !recipeDraft ||
      recipeDraft
        .suggestionId !==
        row.id
    ) {
      return;
    }

    const precheck =
      quickRecipePrecheck(
        recipeDraft,
      );

    if (!precheck.ready) {
      setMessageType(
        'error',
      );

      setMessage(
        precheck.message,
      );

      return;
    }

    setRecipeSaving(
      true,
    );

    setRecipeResult(
      null,
    );

    setMessage('');

    try {
      const response =
        await fetch(
          '/api/admin/recipes/quick-create',
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                name:
                  row.dishName
                    .trim() ||
                  recipeDraft
                    .name,

                category:
                  row.category ||
                  recipeDraft
                    .category,

                subcategory:
                  row.subcategory ||
                  recipeDraft
                    .subcategory,

                baseGuests:
                  100,

                ingredients:
                  recipeDraft
                    .ingredients,

                publishDish,
              }),
          },
        );

      const data =
        await response
          .json() as
            QuickRecipeResult;

      setRecipeResult(
        data,
      );

      if (!response.ok) {
        throw new Error(
          data.error ||
          data.quality
            ?.issues?.[0]
            ?.message ||
          'Recipe did not pass Quality Gate.',
        );
      }

      const finalRate =
        Math.max(
          0,
          Number(
            data.cost
              ?.costPerPlate,
          ) || 0,
        );

      try {
        localStorage.removeItem(
          'admin_recipe_catalog_v1',
        );

        if (
          data.updatedAt
        ) {
          localStorage.setItem(
            'admin_recipe_dish_sync_v1',
            String(
              data.updatedAt,
            ),
          );
        }
      } catch {
        // Cache is optional.
      }

      if (!publishDish) {
        updateRow(
          row.id,
          {
            rate:
              finalRate > 0
                ? String(
                    finalRate,
                  )
                : row.rate,
          },
        );

        setMessageType(
          'success',
        );

        setMessage(
          `${row.dishName.trim()} recipe saved · READY ${data.quality?.score ?? 100}/100 · ₹${finalRate.toFixed(2)}/plate.`,
        );

        return;
      }

      const publishResponse =
        await fetch(
          '/api/admin/dish-suggestions',
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                id:
                  row.id,

                name:
                  row.dishName
                    .trim(),

                category:
                  row.category,

                subcategory:
                  row.subcategory,

                rate:
                  finalRate,

                mode:
                  'new',

                aliasOf:
                  '',
              }),
          },
        );

      const publishData =
        await publishResponse
          .json()
          .catch(
            () => ({}),
          ) as {
            error?: string;
          };

      if (
        !publishResponse.ok
      ) {
        throw new Error(
          publishData.error ||
          'Recipe and Dish Master were saved, but the New Dishes queue could not be cleared.',
        );
      }

      const nextDish:
        CatalogDish = {
        name:
          row.dishName
            .trim(),

        category:
          row.category ||
          'Other',

        subcategory:
          row.subcategory ||
          '',

        rate:
          finalRate,

        aliases: [],
      };

      setCatalogDishes(
        (current) => {
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

      setSelectedIds(
        (current) => {
          const next =
            new Set(
              current,
            );

          next.delete(
            row.id,
          );

          return next;
        },
      );

      setRecipeDraft(
        null,
      );

      setActiveReviewId(
        '',
      );

      setMessageType(
        'success',
      );

      setMessage(
        `${row.dishName.trim()} added · Recipe READY ${data.quality?.score ?? 100}/100 · Dish Master ₹${finalRate.toFixed(2)}/plate.`,
      );
    } catch (saveError) {
      setMessageType(
        'error',
      );

      setMessage(
        saveError instanceof
          Error
          ? saveError.message
          : 'Could not save recipe.',
      );
    } finally {
      setRecipeSaving(
        false,
      );
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
  ): Promise<boolean> {
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
      return false;
    }

    if (
      row.saveAs === 'new' &&
      !row.category
    ) {
      showRowError(
        'Choose a category.',
      );
      return false;
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
      return false;
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

        if (
          !buildData.quality ||
          buildData.quality.status !==
            'READY'
        ) {
          const firstIssue =
            buildData.quality
              ?.issues?.[0]
              ?.message ||
            'Recipe needs manual review.';

          throw new Error(
            `Recipe quality ${
              buildData.quality
                ?.status ||
              'BLOCKED'
            }: ${firstIssue} Suggestion was kept for review.`,
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

              subcategory:
                row.subcategory
                  .trim(),

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

      setSelectedIds(
        (current) => {
          const next =
            new Set(
              current,
            );

          next.delete(
            row.id,
          );

          return next;
        },
      );

      setActiveReviewId(
        (current) =>
          current === row.id
            ? ''
            : current,
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

      return true;

    } catch (error) {
      showRowError(
        error instanceof Error
          ? error.message
          : 'Could not process this dish',
      );
      return false;
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

      setSelectedIds(
        (current) => {
          const next =
            new Set(
              current,
            );

          next.delete(
            row.id,
          );

          return next;
        },
      );

      setActiveReviewId(
        (current) =>
          current === row.id
            ? ''
            : current,
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

  function subcategoriesFor(
    category: string,
  ) {
    return Array.from(
      new Set([
        ...(
          subcategories[
            category
          ] || []
        ),

        ...catalogDishes
          .filter(
            (dish) =>
              dish.category ===
              category,
          )
          .map(
            (dish) =>
              dish.subcategory,
          )
          .filter(Boolean),
      ]),
    ).sort(
      (left, right) =>
        left.localeCompare(
          right,
        ),
    );
  }

  function isReadyForApproval(
    row: EditableSuggestion,
  ) {
    if (
      !row.dishName.trim()
    ) {
      return false;
    }

    const confidence =
      Math.max(
        0,
        Number(
          row.aiConfidence,
        ) || 0,
      );

    if (
      row.saveAs ===
      'alias'
    ) {
      return Boolean(
        row.aliasCategory &&
        row.aliasTarget &&
        (
          isLikelyDuplicate(
            row,
          ) ||
          confidence >= 75
        ),
      );
    }

    return Boolean(
      row.category &&
      row.analyzedAt &&
      confidence >= 80 &&
      row.recommendation &&
      row.recommendation !==
        'REVIEW' &&
      row.recommendation !==
        'REJECT' &&
      row.riskLevel !==
        'HIGH'
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

        ready:
          rows.filter(
            (row) =>
              isReadyForApproval(
                row,
              ),
          ).length,

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
                'READY' &&
              !isReadyForApproval(
                row,
              )
            ) {
              return false;
            }

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
    setActiveReviewId('');
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

  const readyRows =
    rows.filter(
      (row) =>
        isReadyForApproval(
          row,
        ),
    );

  const selectedReadyRows =
    readyRows.filter(
      (row) =>
        selectedIds.has(
          row.id,
        ),
    );

  const selectedNewCount =
    selectedReadyRows.filter(
      (row) =>
        row.saveAs ===
        'new',
    ).length;

  const selectedAliasCount =
    selectedReadyRows.filter(
      (row) =>
        row.saveAs ===
        'alias',
    ).length;

  function toggleSelected(
    id: string,
  ) {
    setSelectedIds(
      (current) => {
        const next =
          new Set(
            current,
          );

        if (
          next.has(id)
        ) {
          next.delete(id);
        } else {
          next.add(id);
        }

        return next;
      },
    );
  }

  function selectAllReady() {
    setSelectedIds(
      new Set(
        readyRows.map(
          (row) =>
            row.id,
        ),
      ),
    );
  }

  function clearSelection() {
    setSelectedIds(
      new Set(),
    );
  }

  async function approveSelected() {
    const targets =
      rows.filter(
        (row) =>
          selectedIds.has(
            row.id,
          ) &&
          isReadyForApproval(
            row,
          ),
      );

    if (!targets.length) {
      setMessageType(
        'error',
      );

      setMessage(
        'Select at least one Ready dish.',
      );

      return;
    }

    const newDishCount =
      targets.filter(
        (row) =>
          row.saveAs ===
          'new',
      ).length;

    const aliasCount =
      targets.filter(
        (row) =>
          row.saveAs ===
          'alias',
      ).length;

    const recipeText =
      bulkBuildRecipes &&
      newDishCount > 0
        ? ` Auto Build will run for ${newDishCount} new dish${
            newDishCount === 1
              ? ''
              : 'es'
          }.`
        : '';

    const confirmed =
      window.confirm(
        `Approve ${targets.length} ready dish${
          targets.length === 1
            ? ''
            : 'es'
        }? ${newDishCount} new · ${aliasCount} alias${
          aliasCount === 1
            ? ''
            : 'es'
        }.${recipeText}`,
      );

    if (!confirmed) {
      return;
    }

    setBulkWorking(
      true,
    );

    setMessageType(
      'success',
    );

    setMessage(
      `Approving ${targets.length} dishes…`,
    );

    let approved = 0;
    let failed = 0;

    try {
      for (
        const row
        of targets
      ) {
        const ok =
          await approve(
            row,
            bulkBuildRecipes &&
              row.saveAs ===
                'new',
          );

        if (ok) {
          approved += 1;
        } else {
          failed += 1;
        }
      }

      setMessageType(
        failed
          ? 'error'
          : 'success',
      );

      setMessage(
        failed
          ? `${approved} approved · ${failed} need manual review.`
          : `${approved} dish${
              approved === 1
                ? ''
                : 'es'
            } approved successfully.`,
      );
    } finally {
      setBulkWorking(
        false,
      );
    }
  }

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
                void analyzeSuggestions(
                  visibleRows
                    .slice(
                      0,
                      30,
                    )
                    .map(
                      (row) =>
                        row.id,
                    ),
                )
              }
              disabled={
                loading ||
                analyzingAll ||
                !visibleRows.length
              }
            >
              {analyzingAll
                ? 'AI analyzing…'
                : `Analyze visible ${Math.min(visibleRows.length, 30)}`
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
              onClick={() =>
                window.location.assign(
                  '/admin/recipes',
                )
              }
            >
              Open Recipes
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
              'READY'
                ? 'is-active'
                : ''
            }
            onClick={() =>
              setReviewFilter(
                'READY',
              )
            }
          >
            <span>
              Ready
            </span>

            <strong>
              {queueStats.ready}
            </strong>

            <small>
              Ready to approve
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

                <option value="READY">
                  Ready to approve
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

          <div className="new-dish-bulk-bar">
            <div className="new-dish-bulk-summary">
              <strong>
                {readyRows.length} Ready
              </strong>

              <span>
                {selectedReadyRows.length
                  ? `${selectedReadyRows.length} selected · ${selectedNewCount} new · ${selectedAliasCount} aliases`
                  : 'Select Ready dishes for bulk approval'}
              </span>
            </div>

            <label className="new-dish-bulk-toggle">
              <input
                type="checkbox"
                checked={
                  bulkBuildRecipes
                }
                onChange={(event) =>
                  setBulkBuildRecipes(
                    event.target
                      .checked,
                  )
                }
                disabled={
                  bulkWorking
                }
              />

              <span>
                Auto Build recipes
              </span>
            </label>

            <button
              className="ghost-button"
              type="button"
              onClick={
                selectAllReady
              }
              disabled={
                bulkWorking ||
                !readyRows.length
              }
            >
              Select all Ready
            </button>

            {selectedReadyRows.length ? (
              <button
                className="ghost-button"
                type="button"
                onClick={
                  clearSelection
                }
                disabled={
                  bulkWorking
                }
              >
                Clear
              </button>
            ) : null}

            <button
              className="primary-button"
              type="button"
              onClick={() =>
                void approveSelected()
              }
              disabled={
                bulkWorking ||
                !selectedReadyRows.length
              }
            >
              {bulkWorking
                ? 'Approving…'
                : `Approve ${selectedReadyRows.length || ''} Selected`}
            </button>
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

          {activeReviewId ? (
            <button
              className="new-dish-modal-backdrop"
              type="button"
              aria-label="Close dish review"
              onClick={() =>
                setActiveReviewId('')
              }
            />
          ) : null}

          <div className="new-dish-list">
            {visibleRows.map((row) => (
              <article
                className={`new-dish-card ${
                  isReadyForApproval(
                    row,
                  )
                    ? 'is-ready'
                    : ''
                } ${
                  selectedIds.has(
                    row.id,
                  )
                    ? 'is-selected'
                    : ''
                } ${
                  activeReviewId ===
                  row.id
                    ? 'is-popup'
                    : ''
                }`}
                key={row.id}
              >
                <div className="new-dish-source">
                  <label
                    className={`new-dish-select ${
                      isReadyForApproval(
                        row,
                      )
                        ? ''
                        : 'is-disabled'
                    }`}
                    title={
                      isReadyForApproval(
                        row,
                      )
                        ? 'Select for bulk approval'
                        : 'Complete review before selecting'
                    }
                  >
                    <input
                      type="checkbox"
                      checked={
                        isReadyForApproval(
                          row,
                        ) &&
                        selectedIds.has(
                          row.id,
                        )
                      }
                      disabled={
                        !isReadyForApproval(
                          row,
                        ) ||
                        bulkWorking
                      }
                      onChange={() =>
                        toggleSelected(
                          row.id,
                        )
                      }
                    />

                    <span>
                      {isReadyForApproval(
                        row,
                      )
                        ? 'Select'
                        : 'Review'}
                    </span>
                  </label>

                  <div>
                    <span>
                      Detected text
                    </span>
                    <strong>
                      {row.name}
                    </strong>
                  </div>
                  <div className="new-dish-source-actions">
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

                    <button
                      className="new-dish-review-button"
                      type="button"
                      onClick={() =>
                        setActiveReviewId(
                          activeReviewId ===
                            row.id
                            ? ''
                            : row.id,
                        )
                      }
                    >
                      {activeReviewId ===
                      row.id
                        ? '✕ Close'
                        : 'Review'}
                    </button>
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

                  {isReadyForApproval(
                    row,
                  ) ? (
                    <span className="new-dish-signal verified">
                      ✓ Ready to approve
                    </span>
                  ) : (
                    <span className="new-dish-signal pending">
                      {row.analyzedAt
                        ? 'Needs review'
                        : 'AI analysis pending'}
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

                <details className="new-dish-verification">
                  <summary className="new-dish-verification-summary">
                    <span>
                      Optional verification
                    </span>
                    <small>
                      Use Google only when AI or catalog matching is unclear
                    </small>
                  </summary>
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
                </details>

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
                      onChange={(event) => {
                        const nextCategory =
                          event.target
                            .value;

                        const choices =
                          subcategoriesFor(
                            nextCategory,
                          );

                        updateRow(
                          row.id,
                          {
                            category:
                              nextCategory,

                            subcategory:
                              choices.includes(
                                row.subcategory,
                              )
                                ? row.subcategory
                                : '',
                          },
                        );
                      }}
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

                    <select
                      className="select"
                      value={
                        row.subcategory
                      }
                      onChange={(event) =>
                        updateRow(
                          row.id,
                          {
                            subcategory:
                              event
                                .target
                                .value,
                          },
                        )
                      }
                    >
                      <option value="">
                        No subcategory
                      </option>

                      {subcategoriesFor(
                        row.category,
                      ).map(
                        (subcategory) => (
                          <option
                            key={
                              subcategory
                            }
                            value={
                              subcategory
                            }
                          >
                            {subcategory}
                          </option>
                        ),
                      )}
                    </select>
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

                {row.saveAs === 'new' ? (
                  <div className="new-dish-recipe-launch">
                    <div>
                      <span className="section-kicker">
                        Recipe
                      </span>

                      <strong>
                        Build exact ingredient cost
                      </strong>

                      <small>
                        100 pax · Ingredient Master · 8% wastage · Quality Gate
                      </small>
                    </div>

                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() =>
                        openRecipeEditor(
                          row,
                        )
                      }
                      disabled={
                        recipeSaving
                      }
                    >
                      {recipeDraft
                        ?.suggestionId ===
                      row.id
                        ? 'Close Recipe'
                        : '+ New Recipe'}
                    </button>
                  </div>
                ) : null}

                {recipeDraft
                  ?.suggestionId ===
                row.id ? (
                  <div className="new-dish-recipe-editor">
                    <div className="new-dish-recipe-head">
                      <div>
                        <span className="section-kicker">
                          New Recipe
                        </span>

                        <h3>
                          {row.dishName}
                        </h3>

                        <p>
                          {row.category}
                          {row.subcategory
                            ? ` → ${row.subcategory}`
                            : ''}
                          {' · '}
                          100 pax standard
                        </p>
                      </div>

                      <div className="new-dish-recipe-head-actions">
                        <button
                          className="primary-button"
                          type="button"
                          onClick={() =>
                            void generateQuickRecipe(
                              row,
                            )
                          }
                          disabled={
                            recipeGenerating ||
                            recipeRatesLoading ||
                            recipeSaving
                          }
                        >
                          {recipeGenerating
                            ? '✨ Generating…'
                            : '✨ AI Generate Recipe'}
                        </button>

                        <button
                          className="ghost-button"
                          type="button"
                          onClick={() =>
                            window.location.assign(
                              '/admin/ingredients',
                            )
                          }
                          disabled={
                            recipeGenerating
                          }
                        >
                          Ingredient Master
                        </button>
                      </div>
                    </div>

                    {(() => {
                      const servingTarget =
                        recipeServingStandard(
                          row.category,
                          row.dishName,
                        );

                      if (!servingTarget) {
                        return null;
                      }

                      return (
                        <div className="new-dish-serving-target">
                          <div>
                            <span className="section-kicker">
                              Serving Target
                            </span>

                            <strong>
                              {servingTarget.label}
                            </strong>

                            <small>
                              {servingTarget.perGuestQuantity}
                              {' '}
                              {servingTarget.perGuestUnit}
                              {' / guest'}
                            </small>
                          </div>

                          <div className="new-dish-serving-target-value">
                            <span>
                              100 pax target
                            </span>

                            <strong>
                              {servingTarget.batch100Quantity}
                              {' '}
                              {servingTarget.batch100Unit}
                            </strong>
                          </div>

                          <small className="new-dish-serving-target-note">
                            AI uses this target for production sizing.
                            Ingredient costing and 8% wastage remain separate.
                          </small>
                        </div>
                      );
                    })()}

                    {recipeGenerating ? (
                      <div className="new-dish-recipe-loading">
                        ✨ AI is creating a practical 100 pax catering recipe…
                      </div>
                    ) : recipeRatesLoading ? (
                      <div className="new-dish-recipe-loading">
                        Loading Ingredient Master…
                      </div>
                    ) : null}

                    <div className="new-dish-recipe-table-head">
                      <span>
                        Ingredient
                      </span>

                      <span>
                        Qty
                      </span>

                      <span>
                        Unit
                      </span>

                      <span>
                        Rate
                      </span>

                      <span>
                        Cost
                      </span>

                      <span />
                    </div>

                    <div className="new-dish-recipe-ingredients">
                      {recipeDraft
                        .ingredients
                        .map(
                          (
                            ingredient,
                          ) => (
                            <div
                              className="new-dish-recipe-ingredient"
                              key={
                                ingredient.rowId
                              }
                            >
                              <select
                                className="select"
                                value={
                                  ingredient.rateKey
                                }
                                onChange={(event) =>
                                  selectQuickRecipeIngredient(
                                    ingredient.rowId,
                                    event
                                      .target
                                      .value,
                                  )
                                }
                              >
                                <option value="">
                                  Select ingredient
                                </option>

                                {recipeMasterRates.map(
                                  (
                                    master,
                                  ) => (
                                    <option
                                      key={
                                        master.id
                                      }
                                      value={
                                        master.id
                                      }
                                    >
                                      {master.name}
                                    </option>
                                  ),
                                )}
                              </select>

                              <input
                                className="input"
                                type="number"
                                min="0"
                                step="0.01"
                                value={
                                  ingredient.quantity
                                }
                                onChange={(event) =>
                                  updateQuickRecipeIngredient(
                                    ingredient.rowId,
                                    {
                                      quantity:
                                        event
                                          .target
                                          .value,
                                    },
                                  )
                                }
                              />

                              <select
                                className="select"
                                value={
                                  ingredient.unit
                                }
                                onChange={(event) =>
                                  updateQuickRecipeIngredient(
                                    ingredient.rowId,
                                    {
                                      unit:
                                        event
                                          .target
                                          .value,
                                    },
                                  )
                                }
                              >
                                <option value="kg">
                                  kg
                                </option>
                                <option value="gram">
                                  gram
                                </option>
                                <option value="ltr">
                                  ltr
                                </option>
                                <option value="ml">
                                  ml
                                </option>
                                <option value="piece">
                                  piece
                                </option>
                                <option value="packet">
                                  packet
                                </option>
                              </select>

                              <div className="new-dish-recipe-readonly">
                                {ingredient.rate > 0
                                  ? `${quickRecipeMoney(ingredient.rate)}/${ingredient.rateUnit}`
                                  : '—'}
                              </div>

                              <div className="new-dish-recipe-readonly">
                                {quickRecipeMoney(
                                  quickIngredientCost(
                                    ingredient,
                                  ),
                                )}
                              </div>

                              <button
                                className="new-dish-recipe-remove"
                                type="button"
                                aria-label="Remove ingredient"
                                onClick={() =>
                                  removeQuickRecipeIngredient(
                                    ingredient.rowId,
                                  )
                                }
                              >
                                ×
                              </button>
                            </div>
                          ),
                        )}
                    </div>

                    {!recipeDraft
                      .ingredients
                      .length ? (
                      <div className="new-dish-recipe-empty">
                        Add at least 4 costing ingredients.
                      </div>
                    ) : null}

                    <div className="new-dish-recipe-add-actions">
                      <button
                        className="ghost-button"
                        type="button"
                        onClick={
                          addQuickRecipeIngredient
                        }
                        disabled={
                          recipeRatesLoading ||
                          recipeSaving
                        }
                      >
                        + Ingredient
                      </button>

                      <button
                        className="ghost-button"
                        type="button"
                        onClick={() =>
                          setBulkIngredientOpen(
                            (current) =>
                              !current,
                          )
                        }
                        disabled={
                          recipeRatesLoading ||
                          recipeSaving
                        }
                      >
                        {bulkIngredientOpen
                          ? 'Close Bulk'
                          : '+ Bulk Ingredients'}
                      </button>
                    </div>

                    {bulkIngredientOpen ? (
                      <div className="new-dish-bulk-ingredients">
                        <div className="new-dish-bulk-ingredients-head">
                          <div>
                            <span className="section-kicker">
                              Bulk Ingredients
                            </span>

                            <strong>
                              Paste many ingredients
                            </strong>
                          </div>

                          <small>
                            Ingredient | Qty | Unit
                          </small>
                        </div>

                        <textarea
                          className="textarea new-dish-bulk-ingredients-input"
                          rows={7}
                          value={
                            bulkIngredientText
                          }
                          onChange={(event) =>
                            setBulkIngredientText(
                              event.target.value,
                            )
                          }
                          placeholder={`Poha | 6 | kg
Potato | 4 | kg
Onion | 2 | kg
Oil | 1.5 | ltr
Peanut | 1 | kg
Lemon | 25 | piece`}
                        />

                        <div className="new-dish-bulk-ingredients-footer">
                          <small>
                            Supports | comma or tab. Names are matched safely with Ingredient Master. Unmatched lines stay here for correction.
                          </small>

                          <button
                            className="primary-button"
                            type="button"
                            onClick={() =>
                              void addBulkRecipeIngredients()
                            }
                            disabled={
                              recipeRatesLoading ||
                              recipeSaving ||
                              !bulkIngredientText
                                .trim()
                            }
                          >
                            Add Matched Ingredients
                          </button>
                        </div>
                      </div>
                    ) : null}

                    <div className="new-dish-recipe-cost-grid">
                      <div>
                        <span>
                          Raw Cost
                        </span>

                        <strong>
                          {quickRecipeMoney(
                            quickRecipeSummary(
                              recipeDraft,
                            ).rawTotal,
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Wastage 8%
                        </span>

                        <strong>
                          {quickRecipeMoney(
                            quickRecipeSummary(
                              recipeDraft,
                            ).wastageTotal,
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Final 100 Pax
                        </span>

                        <strong>
                          {quickRecipeMoney(
                            quickRecipeSummary(
                              recipeDraft,
                            ).finalTotal,
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          ₹ / Plate
                        </span>

                        <strong>
                          {quickRecipeMoney(
                            quickRecipeSummary(
                              recipeDraft,
                            ).finalPerPlate,
                          )}
                        </strong>
                      </div>
                    </div>

                    <div
                      className={`new-dish-recipe-precheck ${
                        quickRecipePrecheck(
                          recipeDraft,
                        ).ready
                          ? 'ready'
                          : 'blocked'
                      }`}
                    >
                      <strong>
                        {quickRecipePrecheck(
                          recipeDraft,
                        ).ready
                          ? '✓ Ready for Quality Gate'
                          : '○ Recipe incomplete'}
                      </strong>

                      <span>
                        {quickRecipePrecheck(
                          recipeDraft,
                        ).message}
                      </span>
                    </div>

                    {recipeResult
                      ?.quality ? (
                      <div
                        className={`new-dish-recipe-quality ${
                          recipeResult
                            .quality
                            .status
                            .toLowerCase()
                        }`}
                      >
                        <strong>
                          {recipeResult
                            .quality
                            .status}
                          {' · '}
                          {recipeResult
                            .quality
                            .score}
                          /100
                        </strong>

                        <span>
                          Rate coverage{' '}
                          {recipeResult
                            .quality
                            .rateCoveragePercent}
                          %
                        </span>

                        {recipeResult
                          .quality
                          .issues
                          .slice(
                            0,
                            3,
                          )
                          .map(
                            (
                              issue,
                              index,
                            ) => (
                              <small
                                key={`${issue.code}-${index}`}
                              >
                                {issue.message}
                              </small>
                            ),
                          )}
                      </div>
                    ) : null}

                    <div className="new-dish-recipe-actions">
                      <button
                        className="secondary-button"
                        type="button"
                        disabled={
                          recipeSaving ||
                          !quickRecipePrecheck(
                            recipeDraft,
                          ).ready
                        }
                        onClick={() =>
                          void saveQuickRecipe(
                            row,
                            false,
                          )
                        }
                      >
                        {recipeSaving
                          ? 'Saving…'
                          : 'Save Recipe'}
                      </button>

                      <button
                        className="primary-button"
                        type="button"
                        disabled={
                          recipeSaving ||
                          !quickRecipePrecheck(
                            recipeDraft,
                          ).ready
                        }
                        onClick={() =>
                          void saveQuickRecipe(
                            row,
                            true,
                          )
                        }
                      >
                        {recipeSaving
                          ? 'Saving…'
                          : 'Save Recipe + Add Dish'}
                      </button>
                    </div>
                  </div>
                ) : null}

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
                      disabled={Boolean(workingId) || bulkWorking}
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
                  window.location.assign(
                    `/admin/recipes?recipe=${encodeURIComponent(
                      lastAutoBuild.name,
                    )}`,
                  )
                }
              >
                Review / Edit Recipe
              </button>
            </div>
          </div>
        ) : null}

        <div className="glass-card new-dish-recipe-prompt">
          <div>
            <span className="section-kicker">Recipes</span>
            <h2>Recipe workspace</h2>
            <p>
              Recipe ingredients and costing are managed in the
              separate Recipes workspace.
            </p>
          </div>

          <button
            className="primary-button"
            type="button"
            onClick={() =>
              window.location.assign(
                '/admin/recipes',
              )
            }
          >
            Open Recipes
          </button>
        </div>
      </section>
    </AppShell>
  );
}
