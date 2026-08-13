'use client';

import {
  useEffect,
  useState,
} from 'react';

import { useRouter } from 'next/navigation';

import FreeLimitPaywall from '../../components/FreeLimitPaywall';

import AppShell, {
  LockedCard,
} from '../../components/AppShell';

import {
  findPendingDishCandidates,
  flushDraftToServer,
  flushWorkSave,
  getSession,
  loadWork,
  parseMenuText,
  saveWork,
  uid,
  type PendingDishCandidate,
} from '../../../lib/store';

import {
  getCostingAnalyticsKey,
  trackProductEvent,
} from '../../../lib/productAnalytics';

import {
  menuItemIdentity,
  mergeFunctionMenu,
} from '../../../lib/menuFunctionImport';

import {
  getMenuCoverageStatus,
  menuCoverageStatusLabel,
  summarizeMenuCoverage,
} from '../../../lib/menuCoverage';

import type {
  EventDetails,
  MenuItem,
  Session,
  WorkState,
} from '../../../lib/types';

import {
  CATEGORIES,
  type Category,
} from '../../../lib/menuCategories';

import {
  cleanupMenuSourceText,
  dishNameKey,
  getDishSourceEvidenceScore,
  preprocessMenuTextWithTenantLearning,
  sourceDishCoverageKey,
  type TenantDishAliasRule,
} from '../../../lib/menuDetectionCore';

import {
  buildDetectionBenchmark,
} from '../../../lib/detectionBenchmark';

import {
  buildAutoRecipeCostRefresh,
  buildCatalogCostRefresh,
  buildCategoryEstimateCostRefresh,
  type DishCostRefresh,
} from '../../../lib/correctedDishCosting';

const SAMPLE_MENU = `Day 1 • Dinner • 300 Members
Welcome Drink
Orange Juice

Starter
Paneer Tikka
Hara Bhara Kebab

Main Course
Paneer Butter Masala
Dal Fry
Jeera Rice
Butter Naan

Sweet
Gulab Jamun`;

type DetectedEventDetails = Partial<
  Pick<
    EventDetails,
    | 'clientName'
    | 'eventName'
    | 'eventDate'
    | 'functionType'
    | 'pax'
    | 'city'
    | 'venue'
  >
>;

type MenuDetectionPreview = {
  menu: MenuItem[];

  possibleMissed:
    PendingDishCandidate[];

  eventDetails:
    DetectedEventDetails;

  source:
    | 'ai'
    | 'rules';
};

type AiMenuExtraction = {
  eventDetails?: Partial<
    Record<
      keyof DetectedEventDetails,
      string | number | null
    >
  >;
  services?: Array<{
    dayLabel?: string | null;
    mealLabel?: string | null;
    pax?: number | null;
    dishes?: Array<{
      name?: string;
      category?: string;
    }>;
  }>;
};

const EVENT_DETAIL_LABELS: Record<
  keyof DetectedEventDetails,
  string
> = {
  clientName: 'Client',
  eventName: 'Event',
  eventDate: 'Date',
  functionType: 'Function',
  pax: 'Guests',
  city: 'City',
  venue: 'Venue',
};

function parseDetectedDate(
  value: string,
): string | undefined {
  const cleaned = value
    .replace(/[,|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const numericDate = cleaned.match(
    /\b(\d{1,4})[./-](\d{1,2})[./-](\d{1,4})\b/,
  );

  if (numericDate) {
    const first = Number(numericDate[1]);
    const second = Number(numericDate[2]);
    const third = Number(numericDate[3]);
    const year =
      first > 1900
        ? first
        : third < 100
          ? 2000 + third
          : third;
    const month =
      first > 1900 ? second : second;
    const day =
      first > 1900 ? third : first;

    if (
      year >= 2000 &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31
    ) {
      return [
        String(year).padStart(4, '0'),
        String(month).padStart(2, '0'),
        String(day).padStart(2, '0'),
      ].join('-');
    }
  }

  const parsedTime = Date.parse(cleaned);

  if (!Number.isNaN(parsedTime)) {
    const parsedDate = new Date(parsedTime);

    return [
      parsedDate.getFullYear(),
      String(parsedDate.getMonth() + 1).padStart(2, '0'),
      String(parsedDate.getDate()).padStart(2, '0'),
    ].join('-');
  }

  return undefined;
}

function detectEventDetails(
  text: string,
): DetectedEventDetails {
  const detected: DetectedEventDetails = {};
  const lines = text
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^[\s•●▪►*-]+/, '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean);

  const fieldPatterns: Array<{
    key: Exclude<
      keyof DetectedEventDetails,
      'eventDate' | 'pax'
    >;
    pattern: RegExp;
  }> = [
    {
      key: 'clientName',
      pattern:
        /^(?:client(?:\s+name)?|customer(?:\s+name)?|party\s+name)\s*[:=-]\s*(.+)$/i,
    },
    {
      key: 'eventName',
      pattern:
        /^(?:event(?:\s+name)?|occasion|program(?:me)?)\s*[:=-]\s*(.+)$/i,
    },
    {
      key: 'functionType',
      pattern:
        /^(?:function(?:\s+type)?|meal(?:\s+type)?|service)\s*[:=-]\s*(.+)$/i,
    },
    {
      key: 'venue',
      pattern:
        /^(?:venue|location|address)\s*[:=-]\s*(.+)$/i,
    },
    {
      key: 'city',
      pattern:
        /^(?:city|town)\s*[:=-]\s*(.+)$/i,
    },
  ];

  for (const line of lines.slice(0, 80)) {
    for (const { key, pattern } of fieldPatterns) {
      if (detected[key]) continue;

      const match = line.match(pattern);
      const value = match?.[1]?.trim();

      if (value && value.length <= 160) {
        detected[key] = value;
      }
    }

    if (!detected.eventDate) {
      const dateMatch = line.match(
        /^(?:event\s+date|date|on)\s*[:=-]\s*(.+)$/i,
      );
      const parsedDate =
        dateMatch?.[1]
          ? parseDetectedDate(dateMatch[1])
          : undefined;

      if (parsedDate) {
        detected.eventDate = parsedDate;
      }
    }

    const labeledPax = line.match(
      /^(?:pax|guests?|members?|persons?|people)\s*[:=-]?\s*(\d{1,6})\b/i,
    );
    const trailingPax = line.match(
      /\b(\d{1,6})\s*(?:pax|guests?|members?|persons?|people)\b/i,
    );
    const pax = Number(
      labeledPax?.[1] ||
        trailingPax?.[1] ||
        0,
    );

    if (pax > Number(detected.pax || 0)) {
      detected.pax = pax;
    }
  }

  return detected;
}

function mergeDetectedEventDetails(
  event: EventDetails,
  detected: DetectedEventDetails,
): EventDetails {
  const nextEvent = { ...event };

  for (const [
    key,
    value,
  ] of Object.entries(detected) as Array<
    [
      keyof DetectedEventDetails,
      string | number,
    ]
  >) {
    if (
      key === 'pax'
        ? !(Number(nextEvent.pax) > 0)
        : !String(nextEvent[key] ?? '').trim()
    ) {
      Object.assign(nextEvent, {
        [key]: value,
      });
    }
  }

  return nextEvent;
}

function hasHardCostBlock(
  item: MenuItem,
) {
  return (
    item.costQualityStatus ===
    'BLOCKED'
  );
}

function requiresCostApproval(
  item: MenuItem,
) {
  /*
   * Category estimates are intentionally
   * labelled REVIEW but are allowed as a
   * temporary automatic fallback.
   *
   * They remain visible on the Cost page
   * so the caterer can improve them later.
   */
  if (
    item.costSource ===
      'category_estimate'
  ) {
    return false;
  }

  return (
    item.costQualityStatus ===
      'REVIEW' ||
    item.accuracyRisk ===
      'HIGH'
  );
}

async function requestTenantDishAliases():
  Promise<
    TenantDishAliasRule[]
  > {
  try {
    const response =
      await fetch(
        '/api/client/dish-aliases',
        {
          cache:
            'no-store',
        },
      );

    if (!response.ok) {
      return [];
    }

    const data =
      await response.json() as {
        aliases?: unknown[];
      };

    if (
      !Array.isArray(
        data.aliases,
      )
    ) {
      return [];
    }

    return data.aliases
      .map(
        (value) => {
          if (
            !value ||
            typeof value !==
              'object' ||
            Array.isArray(
              value,
            )
          ) {
            return null;
          }

          const row =
            value as Record<
              string,
              unknown
            >;

          const aliasName =
            String(
              row.aliasName ||
              '',
            ).trim();

          const action =
            String(
              row.action ||
              'MAP',
            )
              .trim()
              .toUpperCase();

          if (
            !aliasName ||
            ![
              'MAP',
              'REJECT',
            ].includes(
              action,
            )
          ) {
            return null;
          }

          return {
            aliasName,

            canonicalName:
              String(
                row.canonicalName ||
                '',
              ).trim(),

            category:
              String(
                row.category ||
                'Other',
              ).trim() ||
              'Other',

            action:
              action as
                | 'MAP'
                | 'REJECT',

            usageCount:
              Number(
                row.usageCount,
              ) || 0,
          };
        },
      )
      .filter(
        (
          item,
        ): item is
          TenantDishAliasRule =>
          Boolean(item),
      );

  } catch (
    aliasError
  ) {
    console.warn(
      'Tenant dish aliases unavailable:',
      aliasError,
    );

    return [];
  }
}

async function saveTenantDishLearning(
  input: {
    aliasName: string;
    canonicalName?: string;
    category?: string;
    action:
      | 'MAP'
      | 'REJECT';
  },
) {
  try {
    await fetch(
      '/api/client/dish-aliases',
      {
        method:
          'POST',

        headers: {
          'Content-Type':
            'application/json',
        },

        body:
          JSON.stringify(
            input,
          ),
      },
    );
  } catch (
    learningError
  ) {
    /*
     * Learning is useful but should never
     * block the user from correcting a menu.
     */
    console.warn(
      'Dish correction learning skipped:',
      learningError,
    );
  }
}

async function applyTenantDishLearning(
  menu: MenuItem[],
  rules:
    TenantDishAliasRule[],
): Promise<MenuItem[]> {
  if (
    !menu.length ||
    !rules.length
  ) {
    return menu;
  }

  const ruleMap =
    new Map<
      string,
      TenantDishAliasRule
    >();

  /*
   * API returns newest rules first.
   * First match wins.
   */
  for (const rule of rules) {
    const aliasKey =
      dishNameKey(
        rule.aliasName,
      );

    if (
      aliasKey &&
      !ruleMap.has(
        aliasKey,
      )
    ) {
      ruleMap.set(
        aliasKey,
        rule,
      );
    }

    /*
     * Also recognize the canonical name
     * after pre-detection rewriting.
     */
    if (
      rule.action ===
        'MAP' &&
      rule.canonicalName
    ) {
      const canonicalKey =
        dishNameKey(
          rule.canonicalName,
        );

      if (
        canonicalKey &&
        !ruleMap.has(
          canonicalKey,
        )
      ) {
        ruleMap.set(
          canonicalKey,
          rule,
        );
      }
    }
  }

  const dishCatalog =
    await import(
      '../../../lib/dishCostMaster'
    );

  return menu.flatMap<MenuItem>(
    (
      item,
    ): MenuItem[] => {
      const rule =
        ruleMap.get(
          dishNameKey(
            item.name,
          ),
        );

      if (!rule) {
        return [
          item,
        ];
      }

      /*
       * A previously confirmed false
       * positive must disappear before
       * costing.
       */
      if (
        rule.action ===
        'REJECT'
      ) {
        console.info(
          'Ignored learned false positive:',
          item.name,
        );

        return [];
      }

      const canonicalName =
        rule.canonicalName ||
        item.name;

      /*
       * Convert stored database strings
       * back into the application's strict
       * Category union safely.
       */
      const learnedCategory:
        Category =
          CATEGORIES.includes(
            rule.category as
              Category,
          )
            ? (
                rule.category as
                  Category
              )
            : CATEGORIES.includes(
                  item.category as
                    Category,
                )
              ? (
                  item.category as
                    Category
                )
              : 'Other';

      const masterDish =
        dishCatalog
          .findDishByName(
            canonicalName,
          ) ||
        dishCatalog
          .findFuzzyDishByName(
            canonicalName,
            learnedCategory,
          );

      const canonicalCategory:
        Category =
          masterDish &&
          CATEGORIES.includes(
            masterDish.category as
              Category,
          )
            ? (
                masterDish.category as
                  Category
              )
            : learnedCategory;

      const masterRate =
        Math.max(
          0,
          Number(
            masterDish?.rate,
          ) || 0,
        );

      const learnedItem:
        MenuItem = {
          ...item,

          name:
            masterDish?.name ||
            canonicalName,

          category:
            canonicalCategory,

          /*
           * If the correction resolves to a
           * Dish Master row, safely reuse its
           * rate immediately.
           *
           * Otherwise the normal recipe engine
           * will calculate the cost afterwards.
           */
          costPerPlate:
            masterRate,

          portionQuantity:
            masterDish
              ?.servingQuantity ??
            item.portionQuantity ??
            1,

          portionUnit:
            masterDish
              ?.servingUnit ||
            item.portionUnit ||
            'serving',

          detectionSource:
            'manual',

          detectionConfidence:
            100,

          detectionReason:
            `Learned from a previous correction: "${rule.aliasName}" → "${canonicalName}"`,
        };

      return [
        learnedItem,
      ];
    },
  );
}

async function requestAiMenuExtraction(
  menuText: string,
) {
  const response = await fetch(
    '/api/client/ai-menu',
    {
      method: 'POST',
      headers: {
        'Content-Type':
          'application/json',
      },
      body: JSON.stringify({
        menuText,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      'AI menu detection is unavailable',
    );
  }

  const data = (await response.json()) as {
    extraction?: AiMenuExtraction;
  };

  if (
    !data.extraction ||
    !Array.isArray(
      data.extraction.services,
    )
  ) {
    throw new Error(
      'AI returned an invalid menu',
    );
  }

  return data.extraction;
}

function normalizeAiEventDetails(
  extraction: AiMenuExtraction,
): DetectedEventDetails {
  const output: DetectedEventDetails = {};

  for (const key of [
    'clientName',
    'eventName',
    'eventDate',
    'functionType',
    'city',
    'venue',
  ] as const) {
    const value =
      extraction.eventDetails?.[key];

    if (
      typeof value === 'string' &&
      value.trim()
    ) {
      output[key] = value.trim();
    }
  }

  const pax = Number(
    extraction.eventDetails?.pax,
  );

  if (pax > 0) {
    output.pax = Math.round(pax);
  }

  return output;
}

export default function EventPage() {
  const router = useRouter();

  const [session, setSession] =
    useState<Session | null>(null);

  const [work, setWork] =
    useState<WorkState | null>(null);

  const [detecting, setDetecting] =
    useState(false);

  const [error, setError] =
    useState('');

  const [freeLimitBlocked, setFreeLimitBlocked] = useState(false);

  const [uploading, setUploading] =
    useState<'pdf' | 'camera' | null>(null);

  const [uploadStatus, setUploadStatus] =
    useState('');

  const [importFunctionName, setImportFunctionName] =
    useState('');

  const [importFunctionPax, setImportFunctionPax] =
    useState('');

  const [detectedEventDetails, setDetectedEventDetails] =
    useState<DetectedEventDetails>({});

  const [detectionPreview, setDetectionPreview] =
    useState<MenuDetectionPreview | null>(null);

  const [manualRateIds, setManualRateIds] =
    useState<Set<string>>(
      () => new Set(),
    );

  const [
    recostingDishIds,
    setRecostingDishIds,
  ] =
    useState<Set<string>>(
      () => new Set(),
    );

  const [selectedPreviewIds, setSelectedPreviewIds] =
    useState<Set<string>>(
      () => new Set(),
    );

  const [
    detectionReviewFilter,
    setDetectionReviewFilter,
  ] =
    useState<
      | 'ALL'
      | 'PROBLEMS'
      | 'UNCERTAIN'
      | 'CATALOG'
      | 'CONSENSUS'
      | 'AI'
      | 'RULES'
    >('ALL');

  const [
    detectionSearch,
    setDetectionSearch,
  ] =
    useState('');

  const [
    activeDetectionProblemId,
    setActiveDetectionProblemId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    showDetectionSourceCompare,
    setShowDetectionSourceCompare,
  ] =
    useState(true);

  const [
    selectedSourceLineNumber,
    setSelectedSourceLineNumber,
  ] =
    useState<number | null>(
      null,
    );

  const [
    editingDetectionId,
    setEditingDetectionId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    editDetectionName,
    setEditDetectionName,
  ] =
    useState('');

  const [
    editDetectionCategory,
    setEditDetectionCategory,
  ] =
    useState<Category>(
      'Other',
    );

  const [
    showAddMissedDish,
    setShowAddMissedDish,
  ] =
    useState(false);

  const [
    newDetectionDishName,
    setNewDetectionDishName,
  ] =
    useState('');

  const [
    newDetectionDishCategory,
    setNewDetectionDishCategory,
  ] =
    useState<Category>(
      'Other',
    );

  const [
    newDetectionDishGroupKey,
    setNewDetectionDishGroupKey,
  ] =
    useState('');

  useEffect(() => {
    const currentSession = getSession();

    setSession(currentSession);

    if (currentSession) {
      const savedWork = loadWork(
        currentSession.tenantId,
      );

      setWork(savedWork);
      setImportFunctionName(
        savedWork.menu.length
          ? ''
          : savedWork.event.functionType,
      );
      setImportFunctionPax(
        savedWork.event.pax > 0
          ? String(savedWork.event.pax)
          : '',
      );
    }
  }, []);

  useEffect(() => {
    function handleDetectionReviewShortcut(
      event: KeyboardEvent,
    ) {
      const target =
        event.target as
          HTMLElement | null;

      if (
        target &&
        (
          [
            'INPUT',
            'TEXTAREA',
            'SELECT',
          ].includes(
            target.tagName,
          ) ||
          target.isContentEditable
        )
      ) {
        return;
      }

      /*
       * N = Next problem
       */
      if (
        event.key.toLowerCase() ===
        'n'
      ) {
        const button =
          document.querySelector<
            HTMLButtonElement
          >(
            '[data-menu-next-problem]',
          );

        if (
          button &&
          !button.disabled
        ) {
          event.preventDefault();
          button.click();
        }

        return;
      }

      /*
       * / = Focus dish search
       */
      if (
        event.key === '/'
      ) {
        const search =
          document.querySelector<
            HTMLInputElement
          >(
            '[data-menu-detection-search]',
          );

        if (search) {
          event.preventDefault();
          search.focus();
        }

        return;
      }

      /*
       * Escape = clear lightweight
       * review state.
       */
      if (
        event.key ===
        'Escape'
      ) {
        setDetectionSearch('');
        setEditingDetectionId(
          null,
        );
      }
    }

    window.addEventListener(
      'keydown',
      handleDetectionReviewShortcut,
    );

    return () =>
      window.removeEventListener(
        'keydown',
        handleDetectionReviewShortcut,
      );
  }, []);

  function persistWork(
    nextWork: WorkState,
  ) {
    if (!session) return;

    setWork(nextWork);

    saveWork(
      session.tenantId,
      nextWork,
    );
  }

  function updateEvent(
    key: keyof WorkState['event'],
    value: string | number,
  ) {
    if (!work) return;

    const nextWork: WorkState = {
      ...work,

      event: {
        ...work.event,
        [key]: value,
      },
    };

    persistWork(nextWork);
  }

  function detectionGroupKeyForItem(
    item: Pick<
      MenuItem,
      | 'serviceId'
      | 'dayLabel'
      | 'mealLabel'
    >,
  ) {
    return (
      item.serviceId ||
      `${item.dayLabel || 'Event'}::${item.mealLabel || 'Event Menu'}`
    );
  }

  async function recostReviewedDish(
    itemId: string,
    name: string,
    category: Category,
    trigger:
      | 'corrected'
      | 'recovered'
      | 'manual_add'
      | 'restored',
  ) {
    const normalizedName =
      dishNameKey(
        name,
      );

    if (!normalizedName) {
      return;
    }

    setRecostingDishIds(
      (current) => {
        const next =
          new Set(current);

        next.add(
          itemId,
        );

        return next;
      },
    );

    const applyRefresh = (
      refresh:
        DishCostRefresh,
    ) => {
      setDetectionPreview(
        (current) =>
          current
            ? {
                ...current,

                menu:
                  current.menu.map(
                    (item) => {
                      if (
                        item.id !==
                        itemId ||
                        dishNameKey(
                          item.name,
                        ) !==
                          normalizedName
                      ) {
                        return item;
                      }

                      return {
                        ...item,
                        ...refresh.patch,
                      };
                    },
                  ),
              }
            : current,
      );

      setManualRateIds(
        (current) => {
          const next =
            new Set(current);

          if (
            refresh.usable
          ) {
            next.delete(
              itemId,
            );
          } else {
            next.add(
              itemId,
            );
          }

          return next;
        },
      );
    };

    try {
      /*
       * Fastest / safest path:
       * Dish Master first.
       */
      const dishCatalog =
        await import(
          '../../../lib/dishCostMaster'
        );

      const masterDish =
        dishCatalog
          .findDishByName(
            name,
          ) ||
        dishCatalog
          .findFuzzyDishByName(
            name,
            category,
          );

      const masterRate =
        Math.max(
          0,
          Number(
            masterDish
              ?.rate,
          ) || 0,
        );

      if (
        masterDish &&
        masterRate > 0
      ) {
        const refresh =
          buildCatalogCostRefresh(
            masterRate,
          );

        applyRefresh(
          refresh,
        );

        void trackProductEvent(
          'menu_detection_recost',
          {
            trigger,
            dish:
              name,
            category,
            source:
              refresh.source,
            usable:
              refresh.usable,
            cost:
              masterRate,
          },
        );

        return;
      }

      /*
       * No direct Dish Master rate:
       * ask the permanent recipe-costing API.
       */
      let automaticRefresh:
        DishCostRefresh | null =
          null;

      try {
        const response =
          await fetch(
            '/api/client/auto-recipe-costs',
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body:
                JSON.stringify({
                  dishes: [
                    {
                      name,
                      category,
                    },
                  ],
                }),
            },
          );

        if (
          response.ok
        ) {
          const payload =
            await response.json() as {
              results?:
                unknown[];
            };

          const result =
            (
              Array.isArray(
                payload.results,
              )
                ? payload.results
                : []
            )
              .find(
                (value) => {
                  if (
                    !value ||
                    typeof value !==
                      'object' ||
                    Array.isArray(
                      value,
                    )
                  ) {
                    return false;
                  }

                  const row =
                    value as Record<
                      string,
                      unknown
                    >;

                  return (
                    dishNameKey(
                      String(
                        row.requestedName ||
                        '',
                      ),
                    ) ===
                    normalizedName
                  );
                },
              ) ||
            payload
              .results?.[0];

          automaticRefresh =
            buildAutoRecipeCostRefresh(
              result,
            );

          if (
            automaticRefresh
              .usable
          ) {
            applyRefresh(
              automaticRefresh,
            );

            void trackProductEvent(
              'menu_detection_recost',
              {
                trigger,
                dish:
                  name,
                category,
                source:
                  automaticRefresh
                    .source,
                usable:
                  true,
                cost:
                  Number(
                    automaticRefresh
                      .patch
                      .costPerPlate,
                  ) || 0,
              },
            );

            return;
          }
        }
      } catch (
        automaticCostError
      ) {
        console.warn(
          'Corrected dish automatic costing unavailable:',
          automaticCostError,
        );
      }

      /*
       * Transparent last automatic fallback:
       * category estimate.
       */
      const categoryRate =
        Math.max(
          0,
          Number(
            dishCatalog
              .CATEGORY_BASE_COST[
              category as keyof typeof dishCatalog.CATEGORY_BASE_COST
            ],
          ) || 0,
        );

      if (
        categoryRate > 0
      ) {
        const estimate =
          buildCategoryEstimateCostRefresh(
            categoryRate,
          );

        applyRefresh(
          estimate,
        );

        void trackProductEvent(
          'menu_detection_recost',
          {
            trigger,
            dish:
              name,
            category,
            source:
              estimate.source,
            usable:
              true,
            cost:
              categoryRate,
          },
        );

        return;
      }

      /*
       * Automatic costing genuinely failed.
       * Keep the manual-rate requirement.
       */
      const unresolved =
        automaticRefresh ||
        buildAutoRecipeCostRefresh(
          null,
        );

      applyRefresh(
        unresolved,
      );

      void trackProductEvent(
        'menu_detection_recost',
        {
          trigger,
          dish:
            name,
          category,
          source:
            'unresolved',
          usable:
            false,
          cost:
            0,
        },
      );

    } catch (
      recostError
    ) {
      console.warn(
        'Corrected dish recost failed:',
        recostError,
      );

      setManualRateIds(
        (current) => {
          const next =
            new Set(current);

          next.add(
            itemId,
          );

          return next;
        },
      );

      void trackProductEvent(
        'menu_detection_recost',
        {
          trigger,
          dish:
            name,
          category,
          source:
            'unresolved',
          usable:
            false,
          cost:
            0,
        },
      );

    } finally {
      setRecostingDishIds(
        (current) => {
          const next =
            new Set(current);

          next.delete(
            itemId,
          );

          return next;
        },
      );
    }
  }

  function confirmDetectedDish(
    item: MenuItem,
  ) {
    if (
      item.coverageStatus ===
        'REJECTED' ||
      !detectionNeedsReview(
        item,
      )
    ) {
      return;
    }

    setDetectionPreview(
      (current) =>
        current
          ? {
              ...current,

              menu:
                current.menu.map(
                  (menuItem) =>
                    menuItem.id ===
                    item.id
                      ? {
                          ...menuItem,

                          detectionSource:
                            'manual',

                          detectionConfidence:
                            100,

                          detectionReason:
                            'User confirmed this detected dish is correct',
                        }
                      : menuItem,
                ),
            }
          : current,
    );

    /*
     * Remember the confirmed spelling
     * and category for this tenant.
     */
    void saveTenantDishLearning({
      aliasName:
        item.name,

      canonicalName:
        item.name,

      category:
        item.category,

      action:
        'MAP',
    });

    void trackProductEvent(
      'menu_detection_review_action',
      {
        action:
          'confirm_detected',

        dish:
          item.name,

        category:
          item.category,
      },
    );

    setActiveDetectionProblemId(
      item.id,
    );

    setError('');
  }

  function selectOriginalComparisonLine(
    line: {
      lineNumber: number;
      raw: string;
      body: string;
      key: string;
    },
  ) {
    if (!detectionPreview) {
      return;
    }

    setSelectedSourceLineNumber(
      line.lineNumber,
    );

    /*
     * Exact name is preferred.
     * Evidence matching also handles small OCR
     * spelling differences / corrected names.
     */
    const matchingItem =
      detectionPreview.menu.find(
        (item) =>
          item.coverageStatus !==
            'REJECTED' &&
          (
            (
              line.key &&
              dishNameKey(
                item.name,
              ) === line.key
            ) ||
            getDishSourceEvidenceScore(
              line.raw,
              item.name,
            ) >= 84
          ),
      );

    if (matchingItem) {
      setShowAddMissedDish(
        false,
      );

      setActiveDetectionProblemId(
        matchingItem.id,
      );

      window.setTimeout(
        () => {
          document
            .getElementById(
              `compare-detected-${matchingItem.id}`,
            )
            ?.scrollIntoView({
              behavior:
                'smooth',

              block:
                'center',
            });
        },
        40,
      );

      return;
    }

    /*
     * No detected match:
     * prefill Add Dish on the right.
     */
    const candidate =
      detectionPreview
        .possibleMissed
        .find(
          (item) =>
            dishNameKey(
              item.name,
            ) ===
            line.key,
        );

    const categoryHint =
      candidate?.categoryHint;

    setNewDetectionDishName(
      line.body ||
      line.raw,
    );

    if (
      categoryHint &&
      CATEGORIES.includes(
        categoryHint as
          Category,
      )
    ) {
      setNewDetectionDishCategory(
        categoryHint as
          Category,
      );
    } else {
      setNewDetectionDishCategory(
        'Other',
      );
    }

    if (
      !newDetectionDishGroupKey &&
      detectionFunctionOptions.length
    ) {
      setNewDetectionDishGroupKey(
        detectionFunctionOptions[
          0
        ].key,
      );
    }

    setShowAddMissedDish(
      true,
    );

    setActiveDetectionProblemId(
      null,
    );

    window.setTimeout(
      () => {
        document
          .querySelector(
            '.menu-compare-add-form',
          )
          ?.scrollIntoView({
            behavior:
              'smooth',

            block:
              'center',
          });
      },
      40,
    );
  }

  function quickMoveDetectionFunction(
    item: MenuItem,
    nextGroupKey: string,
  ) {
    if (
      !detectionPreview ||
      item.coverageStatus ===
        'REJECTED' ||
      detectionGroupKeyForItem(
        item,
      ) ===
        nextGroupKey
    ) {
      return;
    }

    const target =
      detectionPreview.menu.find(
        (candidate) =>
          detectionGroupKeyForItem(
            candidate,
          ) ===
          nextGroupKey,
      );

    if (!target) {
      return;
    }

    setDetectionPreview(
      (current) =>
        current
          ? {
              ...current,

              menu:
                current.menu.map(
                  (menuItem) =>
                    menuItem.id ===
                    item.id
                      ? {
                          ...menuItem,

                          serviceId:
                            target.serviceId,

                          dayLabel:
                            target.dayLabel,

                          mealLabel:
                            target.mealLabel,

                          servicePax:
                            target.servicePax,

                          detectionSource:
                            'manual',

                          detectionConfidence:
                            100,

                          detectionReason:
                            'User corrected the detected dish meal/function',
                        }
                      : menuItem,
                ),
            }
          : current,
    );

    setSelectedPreviewIds(
      (current) => {
        const next =
          new Set(current);

        next.add(
          item.id,
        );

        return next;
      },
    );

    void trackProductEvent(
      'menu_detection_review_action',
      {
        action:
          'quick_function_change',

        dish:
          item.name,

        from:
          [
            item.dayLabel,
            item.mealLabel,
          ]
            .filter(Boolean)
            .join(
              ' • ',
            ),

        to:
          [
            target.dayLabel,
            target.mealLabel,
          ]
            .filter(Boolean)
            .join(
              ' • ',
            ),
      },
    );

    setError('');
  }

  function quickChangeDetectionCategory(
    item: MenuItem,
    nextCategory: Category,
  ) {
    if (
      item.coverageStatus ===
        'REJECTED' ||
      item.category ===
        nextCategory
    ) {
      return;
    }

    setDetectionPreview(
      (current) =>
        current
          ? {
              ...current,

              menu:
                current.menu.map(
                  (menuItem) =>
                    menuItem.id ===
                    item.id
                      ? {
                          ...menuItem,

                          category:
                            nextCategory,

                          /*
                           * Category can change
                           * which recipe/rate is valid.
                           * Never reuse stale cost.
                           */
                          costPerPlate:
                            0,

                          costSource:
                            undefined,

                          coverageStatus:
                            'NEW_DISH_PENDING',

                          costQualityStatus:
                            undefined,

                          costConfidence:
                            0,

                          rateCoveragePercent:
                            0,

                          coverageReason:
                            'Category corrected; fresh cost is being calculated',

                          accuracyRisk:
                            undefined,

                          previousCostPerPlate:
                            undefined,

                          costChangeAmount:
                            undefined,

                          costChangePercent:
                            undefined,

                          costBaselineSource:
                            undefined,

                          accuracyReason:
                            undefined,

                          ingredientCostDrivers:
                            [],

                          costApprovalStatus:
                            'PENDING',

                          costApprovedAt:
                            undefined,

                          costApprovalReason:
                            'Fresh cost required after category correction',

                          detectionSource:
                            'manual',

                          detectionConfidence:
                            100,

                          detectionReason:
                            'User corrected the detected dish category',
                        }
                      : menuItem,
                ),
            }
          : current,
    );

    setSelectedPreviewIds(
      (current) => {
        const next =
          new Set(current);

        next.add(
          item.id,
        );

        return next;
      },
    );

    setManualRateIds(
      (current) => {
        const next =
          new Set(current);

        next.add(
          item.id,
        );

        return next;
      },
    );

    void saveTenantDishLearning({
      aliasName:
        item.name,

      canonicalName:
        item.name,

      category:
        nextCategory,

      action:
        'MAP',
    });

    void trackProductEvent(
      'menu_detection_review_action',
      {
        action:
          'quick_category_change',

        dish:
          item.name,

        previousCategory:
          item.category,

        category:
          nextCategory,
      },
    );

    void recostReviewedDish(
      item.id,
      item.name,
      nextCategory,
      'corrected',
    );

    setError('');
  }

  function beginDetectionEdit(
    item: MenuItem,
  ) {
    setError('');

    setEditingDetectionId(
      item.id,
    );

    setEditDetectionName(
      item.name,
    );

    setEditDetectionCategory(
      CATEGORIES.includes(
        item.category as Category,
      )
        ? (
            item.category as Category
          )
        : 'Other',
    );
  }

  function cancelDetectionEdit() {
    setEditingDetectionId(
      null,
    );

    setEditDetectionName(
      '',
    );

    setEditDetectionCategory(
      'Other',
    );
  }

  function saveDetectionEdit(
    itemId: string,
  ) {
    if (!detectionPreview) {
      return;
    }

    const name =
      editDetectionName
        .replace(/\s+/g, ' ')
        .trim();

    if (!name) {
      setError(
        'Dish name cannot be empty.',
      );
      return;
    }

    const currentItem =
      detectionPreview.menu.find(
        (item) =>
          item.id === itemId,
      );

    if (!currentItem) {
      return;
    }

    const currentGroup =
      detectionGroupKeyForItem(
        currentItem,
      );

    const duplicate =
      detectionPreview.menu.some(
        (item) =>
          item.id !== itemId &&
          detectionGroupKeyForItem(
            item,
          ) === currentGroup &&
          dishNameKey(
            item.name,
          ) ===
            dishNameKey(
              name,
            ),
      );

    if (duplicate) {
      setError(
        `${name} already exists in this function.`,
      );
      return;
    }

    /*
     * Critical safety rule:
     *
     * If detection name/category changes,
     * the previous recipe/catalog cost may
     * belong to a completely different dish.
     *
     * Never keep that stale cost.
     */
    setDetectionPreview(
      (current) =>
        current
          ? {
              ...current,

              menu:
                current.menu.map(
                  (item) =>
                    item.id ===
                    itemId
                      ? {
                          ...item,

                          name,

                          category:
                            editDetectionCategory,

                          costPerPlate:
                            0,

                          costSource:
                            undefined,

                          coverageStatus:
                            'NEW_DISH_PENDING',

                          costQualityStatus:
                            undefined,

                          costConfidence:
                            0,

                          rateCoveragePercent:
                            0,

                          coverageReason:
                            'Detection was corrected by the user. Confirm a new rate before saving.',

                          accuracyRisk:
                            undefined,

                          previousCostPerPlate:
                            undefined,

                          costChangeAmount:
                            undefined,

                          costChangePercent:
                            undefined,

                          costBaselineSource:
                            undefined,

                          accuracyReason:
                            undefined,

                          ingredientCostDrivers:
                            [],

                          costApprovalStatus:
                            'PENDING',

                          costApprovedAt:
                            undefined,

                          costApprovalReason:
                            'Corrected dish needs a newly confirmed cost.',

                          detectionSource:
                            'manual',

                          detectionConfidence:
                            100,

                          detectionReason:
                            'User corrected the detected dish name or category',
                        }
                      : item,
                ),
            }
          : current,
    );

    setManualRateIds(
      (current) => {
        const next =
          new Set(current);

        next.add(
          itemId,
        );

        return next;
      },
    );

    setSelectedPreviewIds(
      (current) => {
        const next =
          new Set(current);

        next.add(
          itemId,
        );

        return next;
      },
    );

    setDetectionReviewFilter(
      'ALL',
    );

    /*
     * Teach future detections.
     *
     * This is tenant-specific and does not
     * modify the global Dish Master.
     */
    void saveTenantDishLearning({
      aliasName:
        currentItem.name,

      canonicalName:
        name,

      category:
        editDetectionCategory,

      action:
        'MAP',
    });

    void trackProductEvent(
      'menu_detection_review_action',
      {
        action:
          'edit_detected',
        dish:
          name,
        category:
          editDetectionCategory,
      },
    );

    void recostReviewedDish(
      itemId,
      name,
      editDetectionCategory,
      'corrected',
    );

    cancelDetectionEdit();

    setError('');
  }

  function toggleDetectedDishRejection(
    item: MenuItem,
  ) {
    const restoring =
      item.coverageStatus ===
      'REJECTED';

    setDetectionPreview(
      (current) =>
        current
          ? {
              ...current,

              menu:
                current.menu.map(
                  (menuItem) => {
                    if (
                      menuItem.id !==
                      item.id
                    ) {
                      return menuItem;
                    }

                    if (restoring) {
                      const hasCost =
                        Number(
                          menuItem
                            .costPerPlate,
                        ) > 0;

                      return {
                        ...menuItem,

                        coverageStatus:
                          hasCost
                            ? menuItem
                                  .costQualityStatus ===
                                'REVIEW'
                              ? 'REVIEW'
                              : 'COSTED'
                            : 'NEW_DISH_PENDING',

                        detectionSource:
                          'manual',

                        detectionConfidence:
                          100,

                        detectionReason:
                          'User restored this detected dish',
                      };
                    }

                    return {
                      ...menuItem,

                      coverageStatus:
                        'REJECTED',

                      detectionSource:
                        'manual',

                      detectionConfidence:
                        100,

                      detectionReason:
                        'User marked this detection as a false positive',
                    };
                  },
                ),
            }
          : current,
    );

    setSelectedPreviewIds(
      (current) => {
        const next =
          new Set(current);

        if (restoring) {
          next.add(
            item.id,
          );
        } else {
          next.delete(
            item.id,
          );
        }

        return next;
      },
    );

    setManualRateIds(
      (current) => {
        const next =
          new Set(current);

        if (!restoring) {
          next.delete(
            item.id,
          );
        } else if (
          !(
            Number(
              item.costPerPlate,
            ) > 0
          )
        ) {
          next.add(
            item.id,
          );
        }

        return next;
      },
    );

    if (restoring) {
      /*
       * Restoring a dish means it should no
       * longer be treated as a learned false
       * positive in future menus.
       */
      void saveTenantDishLearning({
        aliasName:
          item.name,

        canonicalName:
          item.name,

        category:
          item.category,

        action:
          'MAP',
      });
    } else {
      void saveTenantDishLearning({
        aliasName:
          item.name,

        category:
          item.category,

        action:
          'REJECT',
      });
    }

    void trackProductEvent(
      'menu_detection_review_action',
      {
        action:
          restoring
            ? 'restore'
            : 'reject',
        dish:
          item.name,
        category:
          item.category,
      },
    );

    if (
      restoring &&
      !(
        Number(
          item.costPerPlate,
        ) > 0
      )
    ) {
      const restoreCategory:
        Category =
          CATEGORIES.includes(
            item.category as
              Category,
          )
            ? (
                item.category as
                  Category
              )
            : 'Other';

      void recostReviewedDish(
        item.id,
        item.name,
        restoreCategory,
        'restored',
      );
    }

    setError('');
  }

  function addPossibleMissedDish(
    candidate:
      PendingDishCandidate,
  ) {
    if (!detectionPreview) {
      return;
    }

    const name =
      candidate.name
        .replace(/\s+/g, ' ')
        .trim();

    if (!name) {
      return;
    }

    const candidateKey =
      sourceDishCoverageKey({
        name,

        dayLabel:
          candidate.dayLabel,

        mealLabel:
          candidate.mealLabel,
      });

    const alreadyExists =
      detectionPreview.menu.some(
        (item) =>
          sourceDishCoverageKey(
            item,
          ) ===
          candidateKey,
      );

    if (alreadyExists) {
      setDetectionPreview(
        (current) =>
          current
            ? {
                ...current,

                possibleMissed:
                  current
                    .possibleMissed
                    .filter(
                      (item) =>
                        sourceDishCoverageKey(
                          item,
                        ) !==
                        candidateKey,
                    ),
              }
            : current,
      );

      return;
    }

    const category:
      Category =
        CATEGORIES.includes(
          candidate.categoryHint as
            Category,
        )
          ? (
              candidate.categoryHint as
                Category
            )
          : 'Other';

    const newItem:
      MenuItem = {
        id:
          uid('dish'),

        name,

        category,

        costPerPlate:
          0,

        portionQuantity:
          1,

        portionUnit:
          'serving',

        serviceId:
          candidate.serviceId,

        dayLabel:
          candidate.dayLabel,

        mealLabel:
          candidate.mealLabel ||
          'Event Menu',

        servicePax:
          Number(
            candidate.servicePax,
          ) ||
          Number(
            work?.event.pax,
          ) ||
          0,

        /*
         * Human confirmation upgrades this
         * source line to trusted detection.
         */
        detectionSource:
          'manual',

        detectionConfidence:
          100,

        detectionReason:
          'User confirmed a possible missed source-menu dish',

        coverageStatus:
          'NEW_DISH_PENDING',

        costConfidence:
          0,

        rateCoveragePercent:
          0,

        coverageReason:
          'Recovered dish needs a confirmed cost.',

        costApprovalStatus:
          'PENDING',

        costApprovalReason:
          'Recovered dish needs a confirmed cost.',
      };

    setDetectionPreview(
      (current) =>
        current
          ? {
              ...current,

              menu: [
                ...current.menu,
                newItem,
              ],

              possibleMissed:
                current
                  .possibleMissed
                  .filter(
                    (item) =>
                      sourceDishCoverageKey(
                        item,
                      ) !==
                      candidateKey,
                  ),
            }
          : current,
    );

    setSelectedPreviewIds(
      (current) => {
        const next =
          new Set(current);

        next.add(
          newItem.id,
        );

        return next;
      },
    );

    setManualRateIds(
      (current) => {
        const next =
          new Set(current);

        next.add(
          newItem.id,
        );

        return next;
      },
    );

    /*
     * Confirmed missed dish becomes
     * tenant-specific learning.
     */
    void saveTenantDishLearning({
      aliasName:
        name,

      canonicalName:
        name,

      category,

      action:
        'MAP',
    });

    void trackProductEvent(
      'menu_detection_review_action',
      {
        action:
          'recover_possible_missed',
        dish:
          name,
        category,
      },
    );

    void recostReviewedDish(
      newItem.id,
      name,
      category,
      'recovered',
    );

    setDetectionReviewFilter(
      'ALL',
    );

    setError('');
  }

  function dismissPossibleMissedDish(
    candidate:
      PendingDishCandidate,
  ) {
    const candidateKey =
      sourceDishCoverageKey(
        candidate,
      );

    setDetectionPreview(
      (current) =>
        current
          ? {
              ...current,

              possibleMissed:
                current
                  .possibleMissed
                  .filter(
                    (item) =>
                      sourceDishCoverageKey(
                        item,
                      ) !==
                      candidateKey,
                  ),
            }
          : current,
    );

    /*
     * Explicit false-positive confirmation
     * is learned for this tenant.
     */
    void saveTenantDishLearning({
      aliasName:
        candidate.name,

      category:
        candidate.categoryHint ||
        'Other',

      action:
        'REJECT',
    });

    void trackProductEvent(
      'menu_detection_review_action',
      {
        action:
          'dismiss_possible_missed',
        dish:
          candidate.name,
        category:
          candidate.categoryHint ||
          'Other',
      },
    );

    setError('');
  }

  function addMissedDetectedDish() {
    if (!detectionPreview) {
      return;
    }

    const name =
      newDetectionDishName
        .replace(/\s+/g, ' ')
        .trim();

    if (!name) {
      setError(
        'Enter the missed dish name.',
      );
      return;
    }

    const groupSource =
      detectionPreview.menu.find(
        (item) =>
          detectionGroupKeyForItem(
            item,
          ) ===
          newDetectionDishGroupKey,
      );

    const duplicate =
      detectionPreview.menu.some(
        (item) =>
          detectionGroupKeyForItem(
            item,
          ) ===
            (
              newDetectionDishGroupKey ||
              detectionGroupKeyForItem(
                groupSource || {},
              )
            ) &&
          dishNameKey(
            item.name,
          ) ===
            dishNameKey(
              name,
            ),
      );

    if (duplicate) {
      setError(
        `${name} already exists in this function.`,
      );
      return;
    }

    const newItem:
      MenuItem = {
        id:
          uid('dish'),

        name,

        category:
          newDetectionDishCategory,

        costPerPlate:
          0,

        portionQuantity:
          1,

        portionUnit:
          'serving',

        serviceId:
          groupSource
            ?.serviceId,

        dayLabel:
          groupSource
            ?.dayLabel,

        mealLabel:
          groupSource
            ?.mealLabel ||
          'Event Menu',

        servicePax:
          Number(
            groupSource
              ?.servicePax,
          ) ||
          Number(
            work?.event.pax,
          ) ||
          0,

        detectionSource:
          'manual',

        detectionConfidence:
          100,

        detectionReason:
          'User manually added a dish missed by detection',

        coverageStatus:
          'NEW_DISH_PENDING',

        costConfidence:
          0,

        rateCoveragePercent:
          0,

        coverageReason:
          'Manually added dish needs a confirmed cost.',

        costApprovalStatus:
          'PENDING',

        costApprovalReason:
          'Manually added dish needs a confirmed cost.',
      };

    setDetectionPreview(
      (current) =>
        current
          ? {
              ...current,

              menu: [
                ...current.menu,
                newItem,
              ],
            }
          : current,
    );

    setSelectedPreviewIds(
      (current) => {
        const next =
          new Set(current);

        next.add(
          newItem.id,
        );

        return next;
      },
    );

    setManualRateIds(
      (current) => {
        const next =
          new Set(current);

        next.add(
          newItem.id,
        );

        return next;
      },
    );

    setNewDetectionDishName(
      '',
    );

    /*
     * A manually added dish is valid menu
     * knowledge too. Saving a self-alias
     * remembers its category next time.
     */
    void saveTenantDishLearning({
      aliasName:
        name,

      canonicalName:
        name,

      category:
        newDetectionDishCategory,

      action:
        'MAP',
    });

    void trackProductEvent(
      'menu_detection_review_action',
      {
        action:
          'manual_add_missed',
        dish:
          name,
        category:
          newDetectionDishCategory,
      },
    );

    void recostReviewedDish(
      newItem.id,
      name,
      newDetectionDishCategory,
      'manual_add',
    );

    setNewDetectionDishCategory(
      'Other',
    );

    setShowAddMissedDish(
      false,
    );

    setDetectionReviewFilter(
      'ALL',
    );

    setError('');
  }

  async function detectAndNext() {
    if (
      !work ||
      !session ||
      detecting
    ) {
      return;
    }

    const rawMenuText =
      work.event.rawMenuText.trim();

    setError('');
    setManualRateIds(new Set());

    setEditingDetectionId(
      null,
    );

    setShowAddMissedDish(
      false,
    );

    setNewDetectionDishName(
      '',
    );

    if (!rawMenuText) {
      setError(
        'Please paste the menu before continuing.',
      );

      return;
    }

    const functionName =
      importFunctionName.trim();

    if (!functionName) {
      setError(
        'Enter the function name first, for example Breakfast, Lunch, Sangeet or Reception Dinner.',
      );

      return;
    }

    setDetecting(true);

    try {
      /*
       * Refresh the PostgreSQL-backed dish catalog before parsing.
       * This ensures newly added Admin dishes can be detected even
       * when this browser still has an older local catalog.
       */
      const { syncDishCostItemsFromServer } =
        await import('../../../lib/dishCostMaster');
      await syncDishCostItemsFromServer();

      /*
       * Load this caterer's learned corrections
       * before AI/local parsing.
       *
       * This lets a known OCR spelling become
       * its canonical dish before either
       * detector sees it.
       */
      const tenantDishAliases =
        await requestTenantDishAliases();

      /*
       * V20:
       *
       * Repair conservative OCR/PDF extraction
       * problems BEFORE tenant alias learning,
       * local rules and AI see the menu.
       *
       * Original rawMenuText remains untouched
       * for the V19 source comparison screen.
       */
      const sourceCatalog =
        await import(
          '../../../lib/dishCostMaster'
        );

      const learnedDishKeys =
        new Set(
          tenantDishAliases
            .filter(
              (rule) =>
                rule.action ===
                'MAP',
            )
            .flatMap(
              (rule) => [
                dishNameKey(
                  rule.aliasName,
                ),

                dishNameKey(
                  rule.canonicalName,
                ),
              ],
            )
            .filter(Boolean),
        );

      const sourceCleanup =
        cleanupMenuSourceText(
          rawMenuText,

          (candidate) =>
            Boolean(
              sourceCatalog
                .findDishByName(
                  candidate,
                ),
            ) ||
            learnedDishKeys.has(
              dishNameKey(
                candidate,
              ),
            ),
        );

      if (
        sourceCleanup
          .mergedWrappedLines >
          0 ||
        sourceCleanup
          .normalizedColumns >
          0 ||
        sourceCleanup
          .normalizedArtifacts >
          0
      ) {
        void trackProductEvent(
          'menu_source_cleanup',
          {
            mergedWrappedLines:
              sourceCleanup
                .mergedWrappedLines,

            normalizedColumns:
              sourceCleanup
                .normalizedColumns,

            normalizedArtifacts:
              sourceCleanup
                .normalizedArtifacts,
          },
        );
      }

      const learnedMenu =
        preprocessMenuTextWithTenantLearning(
          sourceCleanup.menuText,
          tenantDishAliases,
        );

      const detectionMenuText =
        learnedMenu.menuText;

      if (
        learnedMenu.replacements > 0
      ) {
        console.info(
          `Applied ${learnedMenu.replacements} learned menu correction(s) before detection.`,
        );
      }

      let catalogMenu: MenuItem[] = [];
      let manualMenu: MenuItem[] = [];
      let detectedDetails =
        detectEventDetails(rawMenuText);
      let detectionSource:
        | 'ai'
        | 'rules' = 'rules';

      /*
       * Always run deterministic local detection alongside AI.
       *
       * Previously local detection only ran when AI completely failed.
       * This meant a successful AI response could still silently omit
       * several dishes.
       */
      const localDetectionPromise =
        Promise.all([
          parseMenuText(
            detectionMenuText,
          ),

          findPendingDishCandidates(
            detectionMenuText,
          ),
        ]);

      const coverageKey = (
        item: Pick<
          MenuItem,
          | 'name'
          | 'dayLabel'
          | 'mealLabel'
        >,
      ) =>
        [
          dishNameKey(
            item.dayLabel || 'event',
          ),
          dishNameKey(
            item.mealLabel ||
              'event menu',
          ),
          dishNameKey(item.name),
        ].join('::');

      try {
        const extraction =
          await requestAiMenuExtraction(
            detectionMenuText,
          );
        const dishCatalog =
          await import(
            '../../../lib/dishCostMaster'
          );
        const allowedCategories =
          new Set<string>(
            dishCatalog.CATEGORIES,
          );
        const seenItems =
          new Set<string>();

        extraction.services?.forEach(
          (service, serviceIndex) => {
            const serviceId =
              `ai_service_${serviceIndex + 1}`;
            const dayLabel = String(
              service.dayLabel || '',
            ).trim();
            const mealLabel =
              String(
                service.mealLabel ||
                  'Event Menu',
              ).trim() || 'Event Menu';
            const servicePax =
              Math.max(
                0,
                Math.round(
                  Number(service.pax) ||
                    Number(
                      extraction
                        .eventDetails
                        ?.pax,
                    ) ||
                    0,
                ),
              ) || undefined;

            service.dishes?.forEach(
              (dish) => {
                const name = String(
                  dish.name || '',
                )
                  .replace(/\s+/g, ' ')
                  .trim();

                if (!name) return;

                const category =
                  allowedCategories.has(
                    String(
                      dish.category || '',
                    ),
                  )
                    ? (dish.category as Category)
                    : 'Other';
                const matchedDish =
                  dishCatalog.findDishByName(
                    name,
                  ) ||
                  dishCatalog.findFuzzyDishByName(
                    name,
                    category,
                  );

                const matchedCategoryCost =
                  matchedDish
                    ? Math.max(
                        0,
                        Number(
                          dishCatalog
                            .CATEGORY_BASE_COST[
                            matchedDish.category as keyof typeof dishCatalog.CATEGORY_BASE_COST
                          ],
                        ) || 0,
                      )
                    : 0;

                /*
                 * Source evidence is evaluated
                 * against individual menu lines.
                 *
                 * This prevents AI from combining
                 * unrelated words from different
                 * menu sections into a fake dish.
                 */
                const sourceEvidenceScore =
                  matchedDish
                    ? 100
                    : getDishSourceEvidenceScore(
                        detectionMenuText,
                        name,
                      );

                if (
                  !matchedDish &&
                  sourceEvidenceScore < 65
                ) {
                  console.info(
                    'Ignored weak AI dish:',
                    name,
                    sourceEvidenceScore,
                  );

                  return;
                }

                const item: MenuItem = {
                  id: uid('dish'),
                  name:
                    matchedDish?.name ||
                    name,
                  category:
                    matchedDish?.category ||
                    category,
                  costPerPlate:
                    Number(
                      matchedDish?.rate,
                    ) ||
                    matchedCategoryCost,
                  portionQuantity:
                    matchedDish
                      ?.servingQuantity ?? 1,
                  portionUnit:
                    matchedDish
                      ?.servingUnit ??
                    'serving',
                  serviceId,
                  dayLabel:
                    dayLabel || undefined,
                  mealLabel,
                  servicePax,

                  detectionSource:
                    matchedDish
                      ? 'catalog'
                      : 'ai',

                  detectionConfidence:
                    matchedDish
                      ? 100
                      : sourceEvidenceScore,

                  detectionReason:
                    matchedDish
                      ? 'AI dish matched Dish Master/catalog'
                      : sourceEvidenceScore >= 90
                        ? 'AI dish strongly matches one source menu line'
                        : 'AI dish has strong same-line OCR/menu evidence',
                };
                const identity =
                  menuItemIdentity(item);

                if (
                  seenItems.has(identity)
                ) {
                  return;
                }

                seenItems.add(identity);

                if (matchedDish) {
                  catalogMenu.push(item);
                } else {
                  manualMenu.push(item);
                }
              },
            );
          },
        );

        /*
         * Merge local detection with AI detection.
         *
         * AI understands unusual/new dish names.
         * Local detection is reliable for known catalog dishes.
         * Combining both gives much better recall.
         */
        const [
          localCatalogMenu,
          pendingCandidates,
        ] =
          await localDetectionPromise;

        /*
         * Confidence-based detection merge.
         *
         * Priority:
         *   1. Known catalog dish
         *   2. AI + local consensus
         *   3. AI-supported unknown
         *   4. Medium/high local unknown
         *
         * A known catalog match must always
         * replace an AI 'unknown' version.
         */
        const catalogByKey =
          new Map(
            catalogMenu.map(
              (item) => [
                coverageKey(item),
                item,
              ],
            ),
          );

        const manualByKey =
          new Map(
            manualMenu.map(
              (item) => [
                coverageKey(item),
                item,
              ],
            ),
          );

        localCatalogMenu.forEach(
          (item) => {
            const key =
              coverageKey(item);

            catalogByKey.set(
              key,
              {
                ...item,

                detectionSource:
                  'catalog',

                detectionConfidence:
                  100,

                detectionReason:
                  'Local rules matched Dish Master/catalog',
              },
            );

            /*
             * Critical:
             * known catalog result beats
             * an AI unknown for same dish/meal.
             */
            manualByKey.delete(
              key,
            );
          },
        );

        pendingCandidates.forEach(
          (candidate) => {
            const item:
              MenuItem = {
                id:
                  uid('dish'),

                name:
                  candidate.name,

                category:
                  candidate.categoryHint ||
                  'Other',

                costPerPlate: 0,

                portionQuantity:
                  1,

                portionUnit:
                  'serving',

                serviceId:
                  candidate.serviceId,

                dayLabel:
                  candidate.dayLabel,

                mealLabel:
                  candidate.mealLabel,

                servicePax:
                  candidate.servicePax,

                detectionSource:
                  'rules',

                detectionConfidence:
                  candidate
                    .confidenceScore,

                detectionReason:
                  candidate
                    .detectionReason,
              };

            const key =
              coverageKey(item);

            if (
              catalogByKey.has(
                key,
              )
            ) {
              return;
            }

            const existingAi =
              manualByKey.get(
                key,
              );

            /*
             * AI + local rules agree:
             * very strong new-dish signal.
             */
            if (existingAi) {
              manualByKey.set(
                key,
                {
                  ...existingAi,

                  category:
                    existingAi
                      .category ===
                      'Other'
                      ? candidate
                          .categoryHint ||
                        'Other'
                      : existingAi
                          .category,

                  detectionSource:
                    'consensus',

                  detectionConfidence:
                    Math.max(
                      90,
                      Number(
                        existingAi
                          .detectionConfidence,
                      ) || 0,
                      candidate
                        .confidenceScore,
                    ),

                  detectionReason:
                    'AI and local menu rules both detected this dish',
                },
              );

              return;
            }

            /*
             * Low-confidence local-only text is
             * shown neither as a dish nor selected.
             * This removes OCR notes/prose noise.
             */
            if (
              candidate.confidence ===
              'LOW'
            ) {
              console.info(
                'Ignored low-confidence menu text:',
                candidate.name,
              );

              return;
            }

            manualByKey.set(
              key,
              item,
            );
          },
        );

        catalogMenu =
          Array.from(
            catalogByKey.values(),
          );

        manualMenu =
          Array.from(
            manualByKey.values(),
          );

        if (
          !catalogMenu.length &&
          !manualMenu.length
        ) {
          throw new Error(
            'AI found no menu dishes',
          );
        }

        detectedDetails = {
          ...detectedDetails,
          ...normalizeAiEventDetails(
            extraction,
          ),
        };
        detectionSource = 'ai';
      } catch (aiError) {
        console.warn(
          'AI menu detection fell back to local rules:',
          aiError,
        );

        const [
          localCatalogMenu,
          pendingCandidates,
        ] =
          await localDetectionPromise;

        catalogMenu = localCatalogMenu;
        manualMenu =
          pendingCandidates
            .filter(
              (candidate) =>
                candidate.confidence !==
                'LOW',
            )
            .map(
              (candidate) => ({
                id:
                  uid('dish'),

                name:
                  candidate.name,

                category:
                  candidate.categoryHint ||
                  'Other',

                costPerPlate:
                  0,

                portionQuantity:
                  1,

                portionUnit:
                  'serving',

                serviceId:
                  candidate.serviceId,

                dayLabel:
                  candidate.dayLabel,

                mealLabel:
                  candidate.mealLabel,

                servicePax:
                  candidate.servicePax,

                detectionSource:
                  'rules' as const,

                detectionConfidence:
                  candidate
                    .confidenceScore,

                detectionReason:
                  candidate
                    .detectionReason,
              }),
            );
      }

      /*
       * Final meal-aware dedupe.
       *
       * Manual items are inserted first,
       * catalog items second so a trusted
       * catalog dish always wins.
       *
       * Same dish in different meals remains
       * separate because coverageKey includes
       * day + meal.
       */
      const mergedDetectedByKey =
        new Map<
          string,
          MenuItem
        >();

      manualMenu.forEach(
        (item) => {
          mergedDetectedByKey.set(
            coverageKey(item),
            item,
          );
        },
      );

      catalogMenu.forEach(
        (item) => {
          mergedDetectedByKey.set(
            coverageKey(item),
            item,
          );
        },
      );

      let detectedMenu =
        Array.from(
          mergedDetectedByKey.values(),
        );

      /*
       * Apply previous corrections before
       * cost coverage is calculated.
       *
       * Example:
       *   Panner Tikka
       *        ↓ learned alias
       *   Paneer Tikka
       *        ↓
       *   Dish Master / recipe costing
       */
      detectedMenu =
        await applyTenantDishLearning(
          detectedMenu,
          tenantDishAliases,
        );

      /*
       * Two different OCR spellings may both
       * resolve to the same learned canonical
       * dish. Deduplicate again after learning.
       */
      const learnedDetectedByKey =
        new Map<
          string,
          MenuItem
        >();

      detectedMenu.forEach(
        (item) => {
          learnedDetectedByKey.set(
            coverageKey(item),
            item,
          );
        },
      );

      detectedMenu =
        Array.from(
          learnedDetectedByKey.values(),
        );

      /*
       * Source Coverage Recovery
       *
       * The same local detection promise can
       * safely be awaited again. Promise
       * results are cached after resolution.
       *
       * This avoids separate AI-success and
       * AI-fallback bookkeeping.
       */
      const [
        ,
        sourcePendingCandidates,
      ] =
        await localDetectionPromise;

      const detectedCoverageKeys =
        new Set(
          detectedMenu.map(
            sourceDishCoverageKey,
          ),
        );

      const learnedRejectedKeys =
        new Set(
          tenantDishAliases
            .filter(
              (rule) =>
                rule.action ===
                'REJECT',
            )
            .map(
              (rule) =>
                dishNameKey(
                  rule.aliasName,
                ),
            ),
        );

      const possibleMissedMap =
        new Map<
          string,
          PendingDishCandidate
        >();

      sourcePendingCandidates
        .filter(
          (candidate) =>
            candidate.confidence ===
              'LOW' &&
            candidate
              .confidenceScore >=
              10,
        )
        .forEach(
          (candidate) => {
            const candidateKey =
              sourceDishCoverageKey(
                candidate,
              );

            if (
              detectedCoverageKeys.has(
                candidateKey,
              )
            ) {
              return;
            }

            if (
              learnedRejectedKeys.has(
                dishNameKey(
                  candidate.name,
                ),
              )
            ) {
              return;
            }

            const existing =
              possibleMissedMap.get(
                candidateKey,
              );

            /*
             * If duplicate source candidates
             * exist, keep the strongest one.
             */
            if (
              !existing ||
              candidate
                .confidenceScore >
                existing
                  .confidenceScore
            ) {
              possibleMissedMap.set(
                candidateKey,
                candidate,
              );
            }
          },
        );

      const possibleMissedDishes =
        Array.from(
          possibleMissedMap.values(),
        )
          .sort(
            (left, right) =>
              right.confidenceScore -
              left.confidenceScore,
          )
          .slice(
            0,
            40,
          );

      const pendingMenuIds =
        new Set(
          detectedMenu
            .filter(
              (item) =>
                item.detectionSource !==
                  'catalog' &&
                !(
                  Number(
                    item.costPerPlate,
                  ) > 0
                ),
            )
            .map(
              (item) =>
                item.id,
            ),
        );

      detectedMenu =
        detectedMenu.map(
          (item) => {
            const hasCatalogCost =
              Number(
                item.costPerPlate,
              ) > 0;

            const isPending =
              pendingMenuIds.has(
                item.id,
              );

            return {
              ...item,

              coverageStatus:
                hasCatalogCost
                  ? 'COSTED'
                  : isPending
                    ? 'NEW_DISH_PENDING'
                    : 'UNRESOLVED',

              costQualityStatus:
                hasCatalogCost
                  ? 'READY'
                  : undefined,

              costConfidence:
                hasCatalogCost
                  ? 100
                  : 0,

              rateCoveragePercent:
                hasCatalogCost
                  ? 100
                  : 0,

              coverageReason:
                hasCatalogCost
                  ? 'Dish Master cost available'
                  : isPending
                    ? 'Dish is not yet fully costed'
                    : 'No usable cost found',

              costApprovalStatus:
                hasCatalogCost
                  ? 'NOT_REQUIRED'
                  : 'PENDING',
            };
          },
        );

      console.log(
        'Detected menu:',
        detectedMenu,
      );

      if (!detectedMenu.length) {
        setError(
          'No likely dishes were found. Check the extracted menu text and try again.',
        );

        return;
      }

      try {
        const recipeResponse = await fetch(
          '/api/client/auto-recipe-costs',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              dishes: detectedMenu
                .filter((item) => !(Number(item.costPerPlate) > 0))
                .map((item) => ({
                  name: item.name,
                  category: item.category,
                })),
            }),
          },
        );
        const recipeData = await recipeResponse.json() as {
          results?: Array<{
            requestedName?: string;
            matchedName?: string;
            costPerPlate?: number;
            source?: 'catalog_recipe' | 'ai_recipe' | 'unresolved';

            costDrivers?: Array<{
              name: string;

              quantity: number;
              unit: string;

              rate: number;
              rateUnit: string;
              rateSource: string;

              batchCost: number;

              rawCostPerPlate: number;
              finalCostPerPlate: number;

              contributionPercent: number;

              previousCostPerPlate: number;
              changePerPlate: number;
              changePercent: number;

              direction:
                | 'UP'
                | 'DOWN'
                | 'FLAT'
                | 'NEW';
            }>;

            quality?: {
              status?:
                | 'READY'
                | 'REVIEW'
                | 'BLOCKED';

              score?: number;
              rateCoveragePercent?: number;

              issues?: Array<{
                message?: string;
              }>;
            };

            accuracy?: {
              risk?:
                | 'NEW_BASELINE'
                | 'STABLE'
                | 'WATCH'
                | 'HIGH';

              baselineSource?:
                | 'previous_tenant_recipe'
                | 'dish_master'
                | 'built_in_catalog'
                | 'none';

              currentCostPerPlate?: number;
              previousCostPerPlate?: number;
              changeAmount?: number;
              changePercent?: number;

              direction?:
                | 'UP'
                | 'DOWN'
                | 'FLAT'
                | 'NEW';

              reason?: string;
            };
          }>;
        };

        if (recipeResponse.ok && Array.isArray(recipeData.results)) {
          const recipeCosts = new Map(
            recipeData.results.map((result) => [
              dishNameKey(String(result.requestedName || '')),
              result,
            ]),
          );

          detectedMenu = detectedMenu.map((item) => {
            const result = recipeCosts.get(dishNameKey(item.name));
            const recipeCost = Math.max(
              0,
              Number(
                result?.costPerPlate,
              ) || 0,
            );

            const quality =
              result?.quality;

            if (!(recipeCost > 0) || (Number(item.costPerPlate) > 0)) {
              const hasExistingCost =
                Number(
                  item.costPerPlate,
                ) > 0;

              return {
                ...item,

                costSource:
                  hasExistingCost
                    ? 'catalog'
                    : 'manual',

                coverageStatus:
                  hasExistingCost
                    ? 'COSTED'
                    : item.coverageStatus ||
                      'UNRESOLVED',

                costQualityStatus:
                  hasExistingCost
                    ? 'READY'
                    : quality?.status,

                costConfidence:
                  hasExistingCost
                    ? 100
                    : Math.max(
                        0,
                        Number(
                          quality?.score,
                        ) || 0,
                      ),

                rateCoveragePercent:
                  hasExistingCost
                    ? 100
                    : Math.max(
                        0,
                        Number(
                          quality
                            ?.rateCoveragePercent,
                        ) || 0,
                      ),

                coverageReason:
                  hasExistingCost
                    ? 'Dish Master cost available'
                    : quality
                        ?.issues
                        ?.[0]
                        ?.message ||
                      item.coverageReason ||
                      'Dish still needs a usable cost',

                costApprovalStatus:
                  hasExistingCost
                    ? 'NOT_REQUIRED'
                    : item.costApprovalStatus ||
                      'PENDING',
              };
            }

            const qualityStatus =
              quality?.status ||
              'READY';

            const accuracy =
              result?.accuracy;

            const accuracyNeedsReview =
              accuracy?.risk ===
                'HIGH';

            const hardCostBlock =
              qualityStatus ===
                'BLOCKED';

            const approvalRequired =
              qualityStatus ===
                'REVIEW' ||
              accuracyNeedsReview;

            return {
              ...item,

              name:
                String(
                  result?.matchedName ||
                  item.name,
                ),

              costPerPlate:
                recipeCost,

              costSource:
                result?.source ===
                  'ai_recipe'
                  ? 'ai_recipe'
                  : 'catalog_recipe',

              coverageStatus:
                qualityStatus ===
                  'READY' &&
                !accuracyNeedsReview
                  ? 'COSTED'
                  : 'REVIEW',

              costQualityStatus:
                qualityStatus,

              costConfidence:
                Math.max(
                  0,
                  Number(
                    quality?.score,
                  ) || 100,
                ),

              rateCoveragePercent:
                Math.max(
                  0,
                  Number(
                    quality
                      ?.rateCoveragePercent,
                  ) || 100,
                ),

              coverageReason:
                accuracyNeedsReview
                  ? accuracy?.reason ||
                    'Large cost movement needs review'
                  : qualityStatus ===
                      'READY'
                    ? 'Recipe cost passed automatic QA'
                    : quality
                        ?.issues
                        ?.[0]
                        ?.message ||
                      'Recipe cost needs review',

              accuracyRisk:
                accuracy?.risk,

              previousCostPerPlate:
                Math.max(
                  0,
                  Number(
                    accuracy
                      ?.previousCostPerPlate,
                  ) || 0,
                ),

              costChangeAmount:
                Number(
                  accuracy
                    ?.changeAmount,
                ) || 0,

              costChangePercent:
                Number(
                  accuracy
                    ?.changePercent,
                ) || 0,

              costBaselineSource:
                accuracy
                  ?.baselineSource,

              accuracyReason:
                accuracy?.reason ||
                '',

              ingredientCostDrivers:
                result?.costDrivers ||
                [],

              costApprovalStatus:
                hardCostBlock ||
                approvalRequired
                  ? 'PENDING'
                  : 'NOT_REQUIRED',

              costApprovedAt:
                undefined,

              costApprovalReason:
                hardCostBlock
                  ? 'Recipe QA is blocked and must be corrected'
                  : approvalRequired
                    ? accuracyNeedsReview
                      ? 'High historical cost movement requires approval'
                      : 'Recipe QA review requires approval'
                    : 'No approval required',
            };
          });
        }
      } catch (recipeError) {
        console.warn('Automatic recipe costing skipped:', recipeError);
      }

      /*
       * Permanent final fallback.
       *
       * Recipe generation may occasionally be
       * unavailable because of an AI/provider,
       * network, ingredient-rate or recipe issue.
       *
       * Do not turn a 150-dish wedding menu into
       * 150 manual data-entry tasks.
       *
       * Give every remaining dish a transparent
       * category estimate instead.
       */
      const stillMissingBeforeFallback =
        detectedMenu.filter(
          (item) =>
            !(
              Number(
                item.costPerPlate,
              ) > 0
            ),
        );

      if (
        stillMissingBeforeFallback.length
      ) {
        try {
          const dishCatalog =
            await import(
              '../../../lib/dishCostMaster'
            );

          detectedMenu =
            detectedMenu.map(
              (item) => {
                if (
                  Number(
                    item.costPerPlate,
                  ) > 0
                ) {
                  return item;
                }

                const categoryRate =
                  Math.max(
                    0,
                    Number(
                      dishCatalog
                        .CATEGORY_BASE_COST[
                        item.category as keyof typeof dishCatalog.CATEGORY_BASE_COST
                      ],
                    ) || 0,
                  );

                const otherRate =
                  Math.max(
                    0,
                    Number(
                      dishCatalog
                        .CATEGORY_BASE_COST
                        .Other,
                    ) || 40,
                  );

                const estimatedCost =
                  categoryRate > 0
                    ? categoryRate
                    : otherRate;

                return {
                  ...item,

                  costPerPlate:
                    estimatedCost,

                  costSource:
                    'category_estimate',

                  coverageStatus:
                    'REVIEW',

                  costQualityStatus:
                    'REVIEW',

                  costConfidence: 35,

                  rateCoveragePercent: 0,

                  coverageReason:
                    `Temporary ${item.category || 'Other'} category estimate. Add a Dish Master rate or recipe to improve accuracy.`,

                  costApprovalStatus:
                    'NOT_REQUIRED',

                  costApprovalReason:
                    'Automatic category estimate used because no recipe or Dish Master cost was available.',
                };
              },
            );
        } catch (
          fallbackError
        ) {
          console.warn(
            'Category fallback costing skipped:',
            fallbackError,
          );
        }
      }

      const unresolvedMenu = detectedMenu.filter(
        (item) => !(Number(item.costPerPlate) > 0),
      );

      console.info(
        `Menu detection complete: ${detectedMenu.length - unresolvedMenu.length} costed dishes and ${unresolvedMenu.length} dishes needing manual rates.`,
      );

      setDetectedEventDetails(
        detectedDetails,
      );
      setDetectionPreview({
        menu:
          detectedMenu,

        possibleMissed:
          possibleMissedDishes,

        eventDetails:
          detectedDetails,

        source:
          detectionSource,
      });
      setDetectionReviewFilter(
        'ALL',
      );

      void trackProductEvent(
        'menu_detected',
        {
          dishCount:
            detectedMenu.length,
          catalogDishCount:
            catalogMenu.length,
          missingRateCount:
            unresolvedMenu.length,

          possibleMissedCount:
            possibleMissedDishes.length,

          source:
            work.event.uploadFileName
              ? 'upload'
              : 'text',
          detectionMode:
            detectionSource,
        },
      );

      /*
       * Keep original new-dish identity even after
       * automatic costing.
       *
       * This lets Admin > New Dishes continue
       * learning the catalog while the client
       * can continue costing immediately.
       */
      setManualRateIds(
        new Set(
          Array.from(
            pendingMenuIds,
          ),
        ),
      );
      /*
       * Automatically select only dishes with
       * reasonable detection confidence.
       *
       * Catalog dishes are 100.
       * AI-supported dishes are ~72.
       * AI + rules consensus is >= 90.
       */
      setSelectedPreviewIds(
        new Set(
          detectedMenu
            .filter(
              (item) =>
                (
                  Number(
                    item
                      .detectionConfidence,
                  ) || 100
                ) >= 45,
            )
            .map(
              (item) =>
                item.id,
            ),
        ),
      );

      /*
       * Direct Menu Detection Flow
       *
       * Detection is now the menu-building step.
       * Once dishes are detected, save them
       * immediately and continue to Cost.
       *
       * The Cost page already provides editable
       * ₹/plate inputs, so unknown/new dishes can
       * be priced there instead of forcing a
       * separate detection-review screen.
       */

      try {
        const usageResponse =
          await fetch(
            `/api/client/free-usage?costingId=${encodeURIComponent(
              work.costingId,
            )}`,
            {
              cache: 'no-store',
            },
          );

        if (!usageResponse.ok) {
          setError(
            'Could not verify your costing allowance. Please try again.',
          );

          return;
        }

        const usage =
          await usageResponse.json();

        if (
          !usage.canUseCurrentCosting
        ) {
          setFreeLimitBlocked(
            true,
          );

          setError(
            'Your 5 free costings are used. Upgrade to Pro to start a new costing.',
          );

          return;
        }
      } catch {
        setError(
          'Could not verify your costing allowance. Please try again.',
        );

        return;
      }

      /*
       * Every item reaching detectedMenu has
       * already passed the detection/evidence
       * pipeline.
       *
       * Low-confidence local noise was removed
       * earlier, so all remaining detected dishes
       * can safely be taken to costing.
       */
      const directMenu =
        detectedMenu.filter(
          (item) =>
            item.coverageStatus !==
            'REJECTED',
        );

      const {
        menu: mergedMenu,
        newItems: newFunctionItems,
      } = mergeFunctionMenu({
        existingMenu:
          work.menu,
        detectedMenu:
          directMenu,
        functionName,
        functionPax:
          Number(importFunctionPax) || 0,
        defaultPax:
          Number(work.event.pax) || 0,
      });

      const nextWork:
        WorkState = {
          ...work,

          event:
            mergeDetectedEventDetails(
              work.event,
              detectedDetails,
            ),

          menu:
            mergedMenu,
        };

      /*
       * Continue feeding genuinely new dishes
       * to Admin > New Dishes.
       *
       * Admin-learning failure must not block
       * the caterer from reaching Cost.
       */
      try {
        const newDishCandidates =
          directMenu
            .filter(
              (item) =>
                pendingMenuIds.has(
                  item.id,
                ),
            )
            .map(
              (item) => ({
                name:
                  item.name,

                categoryHint:
                  item.category ||
                  'Other',
              }),
            );

        if (
          newDishCandidates.length
        ) {
          const suggestionResponse =
            await fetch(
              '/api/dish-suggestions',
              {
                method:
                  'POST',

                headers: {
                  'Content-Type':
                    'application/json',
                },

                body:
                  JSON.stringify({
                    sourceFileName:
                      work.event
                        .uploadFileName ||
                      'Pasted menu',

                    candidates:
                      newDishCandidates,
                  }),
              },
            );

          if (
            !suggestionResponse.ok
          ) {
            console.warn(
              'New-dish admin queue could not be updated.',
            );
          }
        }
      } catch (
        suggestionError
      ) {
        console.warn(
          'New-dish admin queue skipped:',
          suggestionError,
        );
      }

      /*
       * Save locally first so /app/cost can
       * render immediately after navigation.
       */
      persistWork(
        nextWork,
      );

      flushWorkSave(
        session.tenantId,
      );

      /*
       * Also save the same detected menu
       * to the server draft.
       */
      await flushDraftToServer(
        session.tenantId,
        nextWork,
      );

      const costingKey =
        getCostingAnalyticsKey(
          nextWork,
        );

      void trackProductEvent(
        'menu_saved',
        {
          costingKey,

          dishCount:
            nextWork.menu.length,

          importedDishCount:
            newFunctionItems.length,

          functionName,

          mode:
            'merge_function',
        },
        {
          onceKey:
            `menu_saved:${costingKey}`,
        },
      );

      /*
       * No intermediate Detected Menu screen.
       */
      window.location.assign(
        '/app/cost',
      );

      return;
    } catch (detectError) {
      console.error(
        'Menu detection error:',
        detectError,
      );

      setError(
        detectError instanceof Error
          ? detectError.message
          : 'Menu detection failed. Please try again.',
      );
    } finally {
      setDetecting(false);
    }
  }

  async function applyDetectionPreview(
    mode: 'replace' | 'merge',
  ) {
    if (
      !work ||
      !session ||
      !detectionPreview
    ) {
      return;
    }

    const selectedMenu =
      detectionPreview.menu.filter(
        (item) =>
          selectedPreviewIds.has(
            item.id,
          ),
      );

    if (!selectedMenu.length) {
      setError(
        'Select at least one detected dish before continuing.',
      );
      return;
    }

    const blockingCoverage =
      selectedMenu.filter(
        (item) => {
          const status =
            getMenuCoverageStatus(
              item,
              true,
            );

          return (
            status ===
              'UNRESOLVED' ||
            status ===
              'NEW_DISH_PENDING'
          );
        },
      );

    if (
      blockingCoverage.length
    ) {
      setError(
        `${blockingCoverage.length} selected dish${blockingCoverage.length === 1 ? '' : 'es'} still need a cost. Enter a rate, resolve the dish, or deselect it before continuing.`,
      );

      return;
    }

    const hardBlockedCosts =
      selectedMenu.filter(
        hasHardCostBlock,
      );

    if (
      hardBlockedCosts.length
    ) {
      setError(
        `${hardBlockedCosts.length} selected dish${hardBlockedCosts.length === 1 ? ' has' : 'es have'} blocked recipe QA. Correct the recipe or enter a manual rate before continuing.`,
      );

      return;
    }

    const pendingApprovals =
      selectedMenu.filter(
        (item) =>
          requiresCostApproval(
            item,
          ) &&
          item.costApprovalStatus !==
            'APPROVED',
      );

    if (
      pendingApprovals.length
    ) {
      setError(
        `${pendingApprovals.length} selected dish cost${pendingApprovals.length === 1 ? ' requires' : 's require'} approval before continuing.`,
      );

      return;
    }

    setFreeLimitBlocked(false);

    try {
      const usageResponse = await fetch(
        `/api/client/free-usage?costingId=${encodeURIComponent(work.costingId)}`,
        { cache: 'no-store' },
      );
      if (!usageResponse.ok) {
        setError('Could not verify your costing allowance. Please try again.');
        return;
      }
      const usage = await usageResponse.json();
      if (!usage.canUseCurrentCosting) {
        setFreeLimitBlocked(true);
        setError('Your 5 free costings are used. Upgrade to Pro to start a new costing.');
        return;
      }
    } catch {
      setError('Could not verify your costing allowance. Please try again.');
      return;
    }

    let nextMenu = selectedMenu;

    if (mode === 'merge') {
      const existingKeys =
        new Set(
          work.menu.map(
            menuItemIdentity,
          ),
        );

      nextMenu = [
        ...work.menu,
        ...selectedMenu.filter(
          (item) =>
            !existingKeys.has(
              menuItemIdentity(item),
            ),
        ),
      ];
    }

    const nextWork: WorkState = {
      ...work,
      event:
        mergeDetectedEventDetails(
          work.event,
          detectionPreview.eventDetails,
        ),
      menu: nextMenu,
    };

    try {
      const newDishCandidates =
        selectedMenu
          .filter((item) =>
            manualRateIds.has(item.id),
          )
          .map((item) => ({
            name: item.name,
            categoryHint:
              item.category || 'Other',
          }));

      if (newDishCandidates.length) {
        const suggestionResponse =
          await fetch(
            '/api/dish-suggestions',
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json',
              },
              body: JSON.stringify({
                sourceFileName:
                  work.event
                    .uploadFileName ||
                  'Pasted menu',
                candidates:
                  newDishCandidates,
              }),
            },
          );

        if (!suggestionResponse.ok) {
          const suggestionData =
            (await suggestionResponse
              .json()
              .catch(() => ({}))) as {
              error?: string;
            };

          throw new Error(
            suggestionData.error ||
              'New dishes could not be sent for admin review. Please try again.',
          );
        }
      }

      persistWork(nextWork);

      // Complete local-storage saving before opening the next page.
      flushWorkSave(session.tenantId);
      // Persist the detected menu and calculated dish costs before navigation.
      await flushDraftToServer(session.tenantId, nextWork);

      const costingKey =
        getCostingAnalyticsKey(
          nextWork,
        );

      void trackProductEvent(
        'menu_saved',
        {
          costingKey,
          dishCount:
            nextWork.menu.length,
          mode,
        },
        {
          onceKey:
            `menu_saved:${costingKey}`,
        },
      );

      // Full navigation prevents the next page from getting stuck.
      window.location.assign('/app/manpower');
    } catch (saveError) {
      console.error(
        'Detected menu save failed:',
        saveError,
      );

      setError(
        saveError instanceof Error
          ? saveError.message
          : 'The detected menu could not be saved. Please try again.',
      );
    }
  }

  function saveExtractedMenu(
    fileName: string,
    extractedText: string,
    sourceLabel: string,
  ) {
    if (!work) return;

    const cleanedText = extractedText
      .replace(/\u0000/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (!cleanedText) {
      throw new Error(
        `${sourceLabel} did not contain readable menu text. Try a clearer photo or paste the menu manually.`,
      );
    }

    const detectedDetails =
      detectEventDetails(cleanedText);
    const detectedDetailCount =
      Object.keys(detectedDetails).length;

    const nextWork: WorkState = {
      ...work,
      event: {
        ...mergeDetectedEventDetails(
          work.event,
          detectedDetails,
        ),
        uploadFileName: fileName,
        rawMenuText: cleanedText,
      },
    };

    persistWork(nextWork);
    setDetectionPreview(null);
    setSelectedPreviewIds(new Set());
    setDetectedEventDetails(
      detectedDetails,
    );
    setUploadStatus(
      detectedDetailCount > 0
        ? `${sourceLabel} read successfully. ${detectedDetailCount} event detail${detectedDetailCount === 1 ? '' : 's'} found and empty fields were filled.`
        : `${sourceLabel} read successfully. Review the extracted text below, then continue.`,
    );
  }

  async function scoreExtractedMenu(
    text: string,
  ) {
    const [
      catalogDishes,
      possibleNewDishes,
    ] = await Promise.all([
      parseMenuText(text),
      findPendingDishCandidates(text),
    ]);

    return (
      catalogDishes.length * 1000 +
      possibleNewDishes.length * 100
    );
  }

  async function readPdf(
    file: File,
  ) {
    setError('');
    setUploadStatus(
      'Loading PDF reader...',
    );
    setUploading('pdf');

    try {
      const {
        extractPdfMenu,
      } =
        await import(
          '../../../lib/menuUploadProcessor'
        );

      const result =
        await extractPdfMenu(
          file,
          setUploadStatus,
          scoreExtractedMenu,
        );

      saveExtractedMenu(
        file.name,
        result.text,
        result.sourceLabel,
      );

    } catch (uploadError) {
      setUploadStatus('');

      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'The PDF could not be read. Please try another file.',
      );

    } finally {
      setUploading(null);
    }
  }

  async function readMenuPhoto(
    file: File,
  ) {
    setError('');
    setUploadStatus(
      'Loading photo reader...',
    );
    setUploading('camera');

    try {
      const {
        extractMenuPhoto,
      } =
        await import(
          '../../../lib/menuUploadProcessor'
        );

      const result =
        await extractMenuPhoto(
          file,
          setUploadStatus,
          scoreExtractedMenu,
        );

      saveExtractedMenu(
        file.name,
        result.text,
        result.sourceLabel,
      );

    } catch (uploadError) {
      setUploadStatus('');

      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'The menu photo could not be read. Please try a clearer photo.',
      );

    } finally {
      setUploading(null);
    }
  }

  function useSampleMenu() {
    if (!work) return;
    if (work.event.rawMenuText.trim() && !window.confirm('Replace the current menu text with the sample format?')) return;
    setError('');
    setUploadStatus('');
    setDetectedEventDetails({});
    setDetectionPreview(null);
    setSelectedPreviewIds(new Set());
    updateEvent('rawMenuText', SAMPLE_MENU);
  }

  function clearMenuText() {
    if (!work?.event.rawMenuText.trim()) return;
    if (!window.confirm('Clear the current menu text?')) return;
    setError('');
    setUploadStatus('');
    setDetectedEventDetails({});
    setDetectionPreview(null);
    setSelectedPreviewIds(new Set());
    updateEvent('rawMenuText', '');
  }

  if (!work || !session) {
    return (
      <AppShell title="Event Details">
        <div className="content-grid">
          <div className="glass-card">
            Loading...
          </div>
        </div>
      </AppShell>
    );
  }

  if (
    session.status === 'EXPIRED'
  ) {
    return (
      <AppShell title="Event Details">
        <LockedCard />
      </AppShell>
    );
  }

  const menuLines = work.event.rawMenuText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean).length;

  const firstMenuEventReady =
    Boolean(
      work.event.eventName.trim() ||
      work.event.clientName.trim() ||
      Number(work.event.pax) > 0,
    );

  const firstMenuTextReady =
    work.event.rawMenuText.trim().length > 0;

  const firstMenuDetected =
    Boolean(
      detectionPreview &&
      detectionPreview.menu.length > 0,
    );

  const firstMenuSaved =
    work.menu.length > 0;

  const showFirstMenuGuide =
    !firstMenuSaved;

  const firstMenuCompletedSteps =
    [
      firstMenuEventReady,
      firstMenuTextReady,
      firstMenuDetected,
      firstMenuSaved,
    ].filter(Boolean).length;

  function scrollToFirstMenuSection(
    id: string,
  ) {
    document
      .getElementById(id)
      ?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
  }

  const selectedPreviewMenu =
    detectionPreview?.menu.filter(
      (item) =>
        selectedPreviewIds.has(
          item.id,
      ),
    ) ?? [];
  const detectionReviewItems =
    detectionPreview?.menu || [];

  function normalizedDetectionConfidence(
    item: MenuItem,
  ) {
    if (
      item.detectionConfidence ===
      undefined
    ) {
      return item.detectionSource ===
        'catalog'
        ? 100
        : 70;
    }

    return Math.max(
      0,
      Math.min(
        100,
        Number(
          item.detectionConfidence,
        ) || 0,
      ),
    );
  }

  function detectionNeedsReview(
    item: MenuItem,
  ) {
    const confidence =
      normalizedDetectionConfidence(
        item,
      );

    return (
      confidence < 85 ||
      item.detectionSource ===
        'rules'
    );
  }

  function detectionHasProblem(
    item: MenuItem,
  ) {
    if (
      item.coverageStatus ===
      'REJECTED'
    ) {
      return false;
    }

    return (
      detectionNeedsReview(
        item,
      ) ||
      manualRateIds.has(
        item.id,
      ) ||
      item.coverageStatus ===
        'REVIEW' ||
      item.coverageStatus ===
        'NEW_DISH_PENDING' ||
      item.coverageStatus ===
        'UNRESOLVED' ||
      hasHardCostBlock(
        item,
      ) ||
      (
        requiresCostApproval(
          item,
        ) &&
        item.costApprovalStatus !==
          'APPROVED'
      ) ||
      item.accuracyRisk ===
        'HIGH'
    );
  }

  const detectionSourceCounts = {
    catalog:
      detectionReviewItems.filter(
        (item) =>
          item.detectionSource ===
          'catalog',
      ).length,

    consensus:
      detectionReviewItems.filter(
        (item) =>
          item.detectionSource ===
          'consensus',
      ).length,

    ai:
      detectionReviewItems.filter(
        (item) =>
          item.detectionSource ===
          'ai',
      ).length,

    rules:
      detectionReviewItems.filter(
        (item) =>
          item.detectionSource ===
          'rules',
      ).length,

    problems:
      detectionReviewItems.filter(
        detectionHasProblem,
      ).length,

    uncertain:
      detectionReviewItems.filter(
        detectionNeedsReview,
      ).length,
  };

  /*
   * Detection Review Gate
   *
   * Cost approval remains a separate gate.
   * This gate only ensures uncertain
   * detections and possible missed lines
   * were consciously reviewed.
   */
  const detectionUnconfirmedCount =
    detectionReviewItems.filter(
      (item) =>
        item.coverageStatus !==
          'REJECTED' &&
        detectionNeedsReview(
          item,
        ),
    ).length;

  const detectionPossibleMissedCount =
    detectionPreview
      ?.possibleMissed
      .length || 0;

  const detectionReviewGatePending =
    detectionUnconfirmedCount +
    detectionPossibleMissedCount;

  const detectionReviewGateTotal =
    detectionReviewItems.filter(
      (item) =>
        item.coverageStatus !==
        'REJECTED',
    ).length +
    detectionPossibleMissedCount;

  const detectionReviewGateReviewed =
    Math.max(
      0,
      detectionReviewGateTotal -
      detectionReviewGatePending,
    );

  const detectionReviewGatePercent =
    detectionReviewGateTotal > 0
      ? Math.round(
          detectionReviewGateReviewed /
            detectionReviewGateTotal *
            100,
        )
      : 100;

  const detectionReviewGateReady =
    detectionReviewGatePending ===
      0 &&
    recostingDishIds.size ===
      0;

  function jumpToNextDetectionProblem() {
    const problems =
      detectionReviewItems.filter(
        detectionHasProblem,
      );

    /*
     * If dishes are resolved but source
     * coverage still has possible misses,
     * jump there next.
     */
    if (!problems.length) {
      if (
        detectionPossibleMissedCount >
        0
      ) {
        document
          .querySelector(
            '.menu-missed-recovery',
          )
          ?.scrollIntoView({
            behavior:
              'smooth',

            block:
              'center',
          });
      }

      return;
    }

    const currentIndex =
      problems.findIndex(
        (item) =>
          item.id ===
          activeDetectionProblemId,
      );

    const nextIndex =
      currentIndex >= 0
        ? (
            currentIndex + 1
          ) %
          problems.length
        : 0;

    const nextItem =
      problems[
        nextIndex
      ];

    setDetectionSearch('');

    setDetectionReviewFilter(
      'PROBLEMS',
    );

    setActiveDetectionProblemId(
      nextItem.id,
    );

    window.setTimeout(
      () => {
        const element =
          document.getElementById(
            `detected-dish-${nextItem.id}`,
          );

        element?.scrollIntoView({
          behavior:
            'smooth',

          block:
            'center',
        });

        element?.focus({
          preventScroll:
            true,
        });
      },
      60,
    );
  }

  /*
   * V19 Source Compare
   *
   * This does NOT change detection.
   * It only gives the caterer a visual
   * comparison between original menu lines
   * and the final detected dishes.
   *
   * A source line is marked "Detected"
   * only when its cleaned line body exactly
   * matches a detected dish name.
   *
   * Everything else remains neutral instead
   * of incorrectly calling headings/notes
   * missed dishes.
   */
  const detectedSourceNameKeys =
    new Set(
      detectionReviewItems
        .filter(
          (item) =>
            item.coverageStatus !==
            'REJECTED',
        )
        .map(
          (item) =>
            dishNameKey(
              item.name,
            ),
        )
        .filter(Boolean),
    );

  const possibleMissedSourceKeys =
    new Set(
      (
        detectionPreview
          ?.possibleMissed ||
        []
      )
        .map(
          (candidate) =>
            dishNameKey(
              candidate.name,
            ),
        )
        .filter(Boolean),
    );

  const sourceComparisonLines =
    work.event.rawMenuText
      .split('\n')
      .map(
        (
          rawLine,
          index,
        ) => {
          const raw =
            rawLine.trim();

          const body =
            raw
              .replace(
                /^\s*(?:[-*•●▪◦–—]+|\d+[.)-])\s*/u,
                '',
              )
              .trim();

          const key =
            dishNameKey(
              body,
            );

          const status:
            | 'DETECTED'
            | 'POSSIBLE_MISSED'
            | 'SOURCE' =
              key &&
              detectedSourceNameKeys.has(
                key,
              )
                ? 'DETECTED'
                : key &&
                    possibleMissedSourceKeys.has(
                      key,
                    )
                  ? 'POSSIBLE_MISSED'
                  : 'SOURCE';

          return {
            lineNumber:
              index + 1,

            raw,
            body,
            key,
            status,
          };
        },
      )
      .filter(
        (line) =>
          Boolean(
            line.raw,
          ),
      );

  const sourceCompareExactDetectedCount =
    sourceComparisonLines.filter(
      (line) =>
        line.status ===
        'DETECTED',
    ).length;

  const sourceComparePossibleMissedCount =
    sourceComparisonLines.filter(
      (line) =>
        line.status ===
        'POSSIBLE_MISSED',
    ).length;

  const sourceCompareDetectedItems =
    detectionReviewItems.filter(
      (item) =>
        item.coverageStatus !==
        'REJECTED',
    );

  const selectedSourceLine =
    selectedSourceLineNumber ===
    null
      ? undefined
      : sourceComparisonLines.find(
          (line) =>
            line.lineNumber ===
            selectedSourceLineNumber,
        );

  const selectedSourceDetectedItem =
    selectedSourceLine
      ? sourceCompareDetectedItems.find(
          (item) =>
            (
              selectedSourceLine.key &&
              dishNameKey(
                item.name,
              ) ===
                selectedSourceLine.key
            ) ||
            getDishSourceEvidenceScore(
              selectedSourceLine.raw,
              item.name,
            ) >= 84,
        )
      : undefined;

  const sourceCompareAttentionCount =
    sourceCompareDetectedItems.filter(
      (item) =>
        detectionNeedsReview(
          item,
        ),
    ).length +
    sourceComparePossibleMissedCount;

  const normalizedDetectionSearch =
    dishNameKey(
      detectionSearch,
    );

  const filteredDetectionMenu =
    detectionReviewItems.filter(
      (item) => {
        /*
         * Search across the fields a caterer
         * naturally remembers.
         */
        if (
          normalizedDetectionSearch
        ) {
          const searchText =
            dishNameKey(
              [
                item.name,
                item.category,
                item.dayLabel,
                item.mealLabel,
              ]
                .filter(Boolean)
                .join(' '),
            );

          if (
            !searchText.includes(
              normalizedDetectionSearch,
            )
          ) {
            return false;
          }
        }

        if (
          detectionReviewFilter ===
          'ALL'
        ) {
          return true;
        }

        if (
          detectionReviewFilter ===
          'PROBLEMS'
        ) {
          return detectionHasProblem(
            item,
          );
        }

        if (
          detectionReviewFilter ===
          'UNCERTAIN'
        ) {
          return detectionNeedsReview(
            item,
          );
        }

        if (
          detectionReviewFilter ===
          'CATALOG'
        ) {
          return (
            item.detectionSource ===
            'catalog'
          );
        }

        if (
          detectionReviewFilter ===
          'CONSENSUS'
        ) {
          return (
            item.detectionSource ===
            'consensus'
          );
        }

        if (
          detectionReviewFilter ===
          'AI'
        ) {
          return (
            item.detectionSource ===
            'ai'
          );
        }

        return (
          item.detectionSource ===
          'rules'
        );
      },
    );

  const filteredDetectionIds =
    new Set(
      filteredDetectionMenu.map(
        (item) => item.id,
      ),
    );

  /*
   * V10/V11 real-menu accuracy benchmark.
   *
   * This starts as a baseline and becomes
   * more meaningful as the user corrects,
   * rejects, or recovers dishes.
   */
  const detectionBenchmark =
    buildDetectionBenchmark(
      detectionReviewItems,
    );

  const selectedMissingManualRateCount =
    selectedPreviewMenu.filter(
      (item) =>
        manualRateIds.has(item.id) &&
        !(Number(item.costPerPlate) > 0),
    ).length;

  const menuCoverageAudit =
    summarizeMenuCoverage(
      detectionPreview?.menu ||
        [],
      selectedPreviewIds,
    );

  const accuracyAuditMenu =
    (
      detectionPreview?.menu ||
      []
    ).filter(
      (item) =>
        selectedPreviewIds.has(
          item.id,
        ),
    );

  const highAccuracyRiskCount =
    accuracyAuditMenu.filter(
      (item) =>
        item.accuracyRisk ===
        'HIGH',
    ).length;

  const watchAccuracyRiskCount =
    accuracyAuditMenu.filter(
      (item) =>
        item.accuracyRisk ===
        'WATCH',
    ).length;

  const stableAccuracyCount =
    accuracyAuditMenu.filter(
      (item) =>
        item.accuracyRisk ===
        'STABLE',
    ).length;

  const newBaselineCount =
    accuracyAuditMenu.filter(
      (item) =>
        item.accuracyRisk ===
        'NEW_BASELINE',
    ).length;

  const approvalGateItems =
    selectedPreviewMenu.filter(
      (item) =>
        hasHardCostBlock(item) ||
        requiresCostApproval(item),
    );

  const hardBlockedCostItems =
    approvalGateItems.filter(
      hasHardCostBlock,
    );

  const pendingCostApprovalItems =
    approvalGateItems.filter(
      (item) =>
        !hasHardCostBlock(item) &&
        item.costApprovalStatus !==
          'APPROVED',
    );

  const approvedCostReviewItems =
    approvalGateItems.filter(
      (item) =>
        item.costApprovalStatus ===
          'APPROVED',
    );

  const menuIngredientDriverMap =
    new Map<
      string,
      {
        name: string;
        costPerPlate: number;
        dishCount: number;
        estimatedCount: number;
      }
    >();

  selectedPreviewMenu.forEach(
    (item) => {
      (
        item.ingredientCostDrivers ||
        []
      ).forEach(
        (driver) => {
          const key =
            dishNameKey(
              `${driver.name} ${driver.rateUnit}`,
            );

          const existing =
            menuIngredientDriverMap.get(
              key,
            );

          menuIngredientDriverMap.set(
            key,
            {
              name:
                existing?.name ||
                driver.name,

              costPerPlate:
                (
                  existing
                    ?.costPerPlate ||
                  0
                ) +
                Number(
                  driver.finalCostPerPlate,
                ),

              dishCount:
                (
                  existing
                    ?.dishCount ||
                  0
                ) + 1,

              estimatedCount:
                (
                  existing
                    ?.estimatedCount ||
                  0
                ) +
                (
                  driver.rateSource ===
                    'category_estimate'
                    ? 1
                    : 0
                ),
            },
          );
        },
      );
    },
  );

  const topMenuIngredientDrivers =
    Array.from(
      menuIngredientDriverMap.values(),
    )
      .sort(
        (left, right) =>
          right.costPerPlate -
          left.costPerPlate,
      )
      .slice(
        0,
        6,
      );

  const largestCostMovements =
    accuracyAuditMenu
      .filter(
        (item) =>
          item.accuracyRisk ===
            'HIGH' ||
          item.accuracyRisk ===
            'WATCH',
      )
      .sort(
        (left, right) =>
          Math.abs(
            Number(
              right
                .costChangePercent,
            ) || 0,
          ) -
          Math.abs(
            Number(
              left
                .costChangePercent,
            ) || 0,
          ),
      )
      .slice(0, 5);

  const detectionFunctionMap =
    new Map<
      string,
      {
        key: string;
        label: string;
      }
    >();

  detectionReviewItems.forEach(
    (item) => {
      const key =
        detectionGroupKeyForItem(
          item,
        );

      if (
        detectionFunctionMap.has(
          key,
        )
      ) {
        return;
      }

      detectionFunctionMap.set(
        key,
        {
          key,

          label:
            [
              item.dayLabel,
              item.mealLabel,
            ]
              .filter(Boolean)
              .join(' • ') ||
            'Event Menu',
        },
      );
    },
  );

  const detectionFunctionOptions =
    Array.from(
      detectionFunctionMap.values(),
    );

  const previewGroupMap =
    new Map<
      string,
      {
        key: string;
        dayLabel: string;
        mealLabel: string;
        servicePax: number;
        items: MenuItem[];
      }
    >();

  for (
    const item
    of filteredDetectionMenu
  ) {
    const groupKey =
      item.serviceId ||
      `${item.dayLabel || 'Event'}::${item.mealLabel || 'Event Menu'}`;
    const existingGroup =
      previewGroupMap.get(groupKey);

    if (existingGroup) {
      existingGroup.items.push(item);
      existingGroup.servicePax =
        Math.max(
          existingGroup.servicePax,
          Number(item.servicePax) || 0,
        );
    } else {
      previewGroupMap.set(groupKey, {
        key: groupKey,
        dayLabel:
          item.dayLabel || '',
        mealLabel:
          item.mealLabel ||
          'Event Menu',
        servicePax:
          Number(item.servicePax) ||
          Number(work.event.pax) ||
          0,
        items: [item],
      });
    }
  }

  const detectionPreviewGroups =
    Array.from(
      previewGroupMap.values(),
    );

  const existingMenuKeys =
    new Set(
      work.menu.map(
        menuItemIdentity,
      ),
    );

  const previewDuplicateCount =
    selectedPreviewMenu.filter(
      (item) =>
        existingMenuKeys.has(
          menuItemIdentity(item),
        ),
    ).length;

  const detectionActionCount =
    detectionReviewItems.filter(
      (item) =>
        item.coverageStatus !==
          'REJECTED' &&
        (
          detectionNeedsReview(
            item,
          ) ||
          manualRateIds.has(
            item.id,
          ) ||
          item.coverageStatus ===
            'REVIEW' ||
          item.coverageStatus ===
            'NEW_DISH_PENDING' ||
          item.coverageStatus ===
            'UNRESOLVED'
        ),
    ).length;

  const detectionReadyCount =
    detectionReviewItems.filter(
      (item) =>
        item.coverageStatus !==
          'REJECTED' &&
        item.coverageStatus ===
          'COSTED' &&
        !detectionNeedsReview(
          item,
        ) &&
        Number(
          item.costPerPlate,
        ) > 0,
    ).length;

  const detectionRejectedCount =
    detectionReviewItems.filter(
      (item) =>
        item.coverageStatus ===
        'REJECTED',
    ).length;

  return (
    <AppShell
      title="Create Event"
      hidePageTitle
    >
      <section className="content-grid">
        {showFirstMenuGuide ? (
          <div className="first-menu-guide">
            <div className="first-menu-guide-top">
              <div>
                <span className="section-kicker">
                  First costing
                </span>

                <h2>
                  Create your first menu costing
                </h2>

                <p>
                  Follow these four steps.
                  Menu Costing will guide you from
                  event details to a saved menu.
                </p>
              </div>

              <div className="first-menu-guide-progress">
                <strong>
                  {firstMenuCompletedSteps}/4
                </strong>

                <span>
                  steps complete
                </span>
              </div>
            </div>

            <div className="first-menu-progress-bar">
              <span
                style={{
                  width:
                    `${Math.max(
                      5,
                      (
                        firstMenuCompletedSteps /
                        4
                      ) * 100,
                    )}%`,
                }}
              />
            </div>

            <div className="first-menu-steps">
              <button
                type="button"
                className={
                  firstMenuEventReady
                    ? 'is-complete'
                    : 'is-current'
                }
                onClick={() =>
                  scrollToFirstMenuSection(
                    'eventInformation',
                  )
                }
              >
                <span className="first-menu-step-number">
                  {firstMenuEventReady
                    ? '✓'
                    : '1'}
                </span>

                <span>
                  <b>
                    Event details
                  </b>

                  <small>
                    Client, event or guest count
                  </small>
                </span>
              </button>

              <button
                type="button"
                className={
                  firstMenuTextReady
                    ? 'is-complete'
                    : firstMenuEventReady
                      ? 'is-current'
                      : ''
                }
                onClick={() =>
                  scrollToFirstMenuSection(
                    'menuInput',
                  )
                }
              >
                <span className="first-menu-step-number">
                  {firstMenuTextReady
                    ? '✓'
                    : '2'}
                </span>

                <span>
                  <b>
                    Add menu
                  </b>

                  <small>
                    PDF, photo or pasted text
                  </small>
                </span>
              </button>

              <button
                type="button"
                className={
                  firstMenuDetected
                    ? 'is-complete'
                    : firstMenuTextReady
                      ? 'is-current'
                      : ''
                }
                onClick={() => {
                  if (
                    firstMenuTextReady &&
                    !detecting
                  ) {
                    void detectAndNext();
                  } else {
                    scrollToFirstMenuSection(
                      'menuInput',
                    );
                  }
                }}
              >
                <span className="first-menu-step-number">
                  {firstMenuDetected
                    ? '✓'
                    : '3'}
                </span>

                <span>
                  <b>
                    Detect dishes
                  </b>

                  <small>
                    Review what Menu Costing found
                  </small>
                </span>
              </button>

              <button
                type="button"
                className={
                  firstMenuSaved
                    ? 'is-complete'
                    : firstMenuDetected
                      ? 'is-current'
                      : ''
                }
                onClick={() =>
                  scrollToFirstMenuSection(
                    firstMenuDetected
                      ? 'menuDetectionPreview'
                      : 'menuInput',
                  )
                }
              >
                <span className="first-menu-step-number">
                  {firstMenuSaved
                    ? '✓'
                    : '4'}
                </span>

                <span>
                  <b>
                    Save menu
                  </b>

                  <small>
                    Continue to costing
                  </small>
                </span>
              </button>
            </div>

            {!firstMenuTextReady ? (
              <div className="first-menu-guide-actions">
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => {
                    useSampleMenu();

                    window.setTimeout(
                      () =>
                        scrollToFirstMenuSection(
                          'menuInput',
                        ),
                      50,
                    );
                  }}
                >
                  Try Sample Menu
                </button>

                <button
                  className="primary-button"
                  type="button"
                  onClick={() =>
                    scrollToFirstMenuSection(
                      'menuInput',
                    )
                  }
                >
                  Add My Menu
                </button>
              </div>
            ) : firstMenuTextReady &&
              !firstMenuDetected ? (
              <div className="first-menu-guide-actions">
                <button
                  className="primary-button"
                  type="button"
                  disabled={
                    detecting ||
                    Boolean(uploading)
                  }
                  onClick={() =>
                    void detectAndNext()
                  }
                >
                  {detecting
                    ? 'Detecting…'
                    : 'Detect My Menu'}
                </button>
              </div>
            ) : firstMenuDetected ? (
              <div className="first-menu-guide-actions">
                <button
                  className="primary-button"
                  type="button"
                  onClick={() =>
                    scrollToFirstMenuSection(
                      'menuDetectionPreview',
                    )
                  }
                >
                  Review Detected Dishes
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        <div
          id="eventInformation"
          className="glass-card event-details-card"
          style={{ order: 2 }}
        >
          <div className="event-section-heading">
            <div>
              <span className="section-kicker">Event brief</span>
              <h2>Event information</h2>
            </div>
          </div>

          <div className="form-grid">
            <div className="three-grid">
              <div className="field">
                <label htmlFor="clientName">
                  Client Name
                </label>

                <input
                  id="clientName"
                  className="input input-large"
                  value={
                    work.event.clientName
                  }
                  onChange={(event) =>
                    updateEvent(
                      'clientName',
                      event.target.value,
                    )
                  }
                  placeholder="Client name"
                />
              </div>

              <div className="field">
                <label htmlFor="eventName">
                  Event Name
                </label>

                <input
                  id="eventName"
                  className="input input-large"
                  value={
                    work.event.eventName
                  }
                  onChange={(event) =>
                    updateEvent(
                      'eventName',
                      event.target.value,
                    )
                  }
                  placeholder="Wedding / Birthday / Corporate"
                />
              </div>

              <div className="field">
                <label htmlFor="eventDate">
                  Event Date
                </label>

                <input
                  id="eventDate"
                  className="input input-large"
                  type="date"
                  value={
                    work.event.eventDate
                  }
                  onChange={(event) =>
                    updateEvent(
                      'eventDate',
                      event.target.value,
                    )
                  }
                />
              </div>
            </div>

            <div className="three-grid">
              <div className="field">
                <label htmlFor="functionType">
                  Function Type
                </label>

                <input
                  id="functionType"
                  className="input input-large"
                  value={
                    work.event.functionType
                  }
                  onChange={(event) =>
                    updateEvent(
                      'functionType',
                      event.target.value,
                    )
                  }
                  placeholder="Lunch / Dinner / Breakfast"
                />
              </div>

              <div className="field">
                <label htmlFor="pax">
                  Default Pax / Guests
                </label>

                <input
                  id="pax"
                  className="input input-large"
                  type="number"
                  min="1"
                  inputMode="numeric"
                  value={
                    work.event.pax || ''
                  }
                  onChange={(event) =>
                    updateEvent(
                      'pax',
                      Math.max(
                        0,
                        Number(
                          event.target.value,
                        ) || 0,
                      ),
                    )
                  }
                  placeholder="300"
                />
              </div>

              <div className="field">
                <label htmlFor="city">
                  City
                </label>

                <input
                  id="city"
                  className="input input-large"
                  value={
                    work.event.city
                  }
                  onChange={(event) =>
                    updateEvent(
                      'city',
                      event.target.value,
                    )
                  }
                  placeholder="Silvassa"
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="venue">
                Venue
              </label>

              <input
                id="venue"
                className="input input-large"
                value={
                  work.event.venue
                }
                onChange={(event) =>
                  updateEvent(
                    'venue',
                    event.target.value,
                  )
                }
                placeholder="Venue / Address"
              />
            </div>
          </div>
        </div>

        <div
          id="menuInput"
          className="glass-card event-menu-card"
          style={{ order: 1 }}
        >
          <div className="form-grid">
            <div className="menu-source-workspace">
              <div className="menu-source-workspace-heading">
                <div>
                  <span>Function-by-function import</span>
                  <h3>Add one function menu</h3>
                </div>
                {work.menu.length > 0 ? (
                  <small>{work.menu.length} dishes already saved</small>
                ) : null}
              </div>

              <div className="function-import-context">
                <div className="field">
                  <label htmlFor="importFunctionName">
                    Function name
                  </label>
                  <input
                    id="importFunctionName"
                    className="input"
                    value={importFunctionName}
                    onChange={(event) => {
                      setError('');
                      setImportFunctionName(event.target.value);
                    }}
                    placeholder="Breakfast / Lunch / Sangeet / Reception Dinner"
                  />
                </div>

                <div className="field">
                  <label htmlFor="importFunctionPax">
                    Guests for this function
                  </label>
                  <input
                    id="importFunctionPax"
                    className="input"
                    type="number"
                    min="1"
                    inputMode="numeric"
                    value={importFunctionPax}
                    onChange={(event) =>
                      setImportFunctionPax(event.target.value)
                    }
                    placeholder={work.event.pax > 0 ? String(work.event.pax) : '300'}
                  />
                </div>

                <p>
                  Import only this function below. Previously saved functions stay in the event automatically.
                </p>
              </div>

              <div className="menu-upload-options">
                  <div className="menu-upload-option">
                    <span className="menu-upload-icon" aria-hidden="true">PDF</span>
                    <div>
                      <b>Upload PDF</b>
                      <p>Text or scanned PDF, including multi-column menus, up to 15 MB.</p>
                    </div>
                    <label
                      className={`ghost-button ${uploading ? 'is-disabled' : ''}`}
                      htmlFor="menuPdf"
                    >
                      {uploading === 'pdf' ? 'Reading PDF...' : 'Choose PDF'}
                    </label>
                    <input
                      id="menuPdf"
                      className="visually-hidden-file"
                      type="file"
                      accept="application/pdf,.pdf"
                      disabled={Boolean(uploading)}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = '';
                        if (file) void readPdf(file);
                      }}
                    />
                  </div>

                  <div className="menu-upload-option">
                    <span className="menu-upload-icon camera" aria-hidden="true">CAM</span>
                    <div>
                      <b>Take a photo</b>
                      <p>Use a clear, straight menu photo.</p>
                    </div>
                    <div className="menu-photo-actions">
                      <label
                        className={`ghost-button ${uploading ? 'is-disabled' : ''}`}
                        htmlFor="menuCamera"
                      >
                        {uploading === 'camera' ? 'Scanning photo...' : 'Open Camera'}
                      </label>
                      <label
                        className={`ghost-button ${uploading ? 'is-disabled' : ''}`}
                        htmlFor="menuPhoto"
                      >
                        Upload Photo
                      </label>
                    </div>
                    <input
                      id="menuCamera"
                      className="visually-hidden-file"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      disabled={Boolean(uploading)}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = '';
                        if (file) void readMenuPhoto(file);
                      }}
                    />
                    <input
                      id="menuPhoto"
                      className="visually-hidden-file"
                      type="file"
                      accept="image/*"
                      disabled={Boolean(uploading)}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = '';
                        if (file) void readMenuPhoto(file);
                      }}
                    />
                  </div>
              </div>

              {uploadStatus ? (
                <div className="menu-upload-status" role="status" aria-live="polite">
                  <span className={uploading ? 'upload-spinner' : 'upload-check'} aria-hidden="true" />
                  <div>
                    <b>{uploading ? 'Processing menu' : 'Menu imported successfully'}</b>
                    <p>{uploadStatus}</p>
                    {work.event.uploadFileName && !uploading ? (
                      <small>{work.event.uploadFileName}</small>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {Object.keys(detectedEventDetails).length > 0 ? (
                <div className="event-detected-details">
                  <div className="event-detected-details-heading">
                    <div>
                      <span aria-hidden="true">✓</span>
                      <div>
                        <b>Event details detected</b>
                        <p>Empty fields in Event information were filled automatically.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        document
                          .getElementById('clientName')
                          ?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center',
                          })
                      }
                    >
                      Review details
                    </button>
                  </div>
                  <div className="event-detected-detail-list">
                    {(Object.entries(detectedEventDetails) as Array<
                      [keyof DetectedEventDetails, string | number]
                    >).map(([key, value]) => (
                      <span key={key}>
                        <small>{EVENT_DETAIL_LABELS[key]}</small>
                        <b>{String(value)}</b>
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="field menu-text-field">
                  <div className="event-menu-text-heading">
                    <label htmlFor="rawMenuText">Menu text</label>
                    <div>
                      <button className="event-text-action" type="button" onClick={useSampleMenu}>Use sample</button>
                      {work.event.rawMenuText ? <button className="event-text-action danger" type="button" onClick={clearMenuText}>Clear</button> : null}
                    </div>
                  </div>

                  <textarea
                    id="rawMenuText"
                    className="textarea textarea-large"
                    value={work.event.rawMenuText}
                    onChange={(event) => {
                      setError('');
                      setDetectedEventDetails({});
                      setDetectionPreview(null);
                      setSelectedPreviewIds(new Set());
                      updateEvent('rawMenuText', event.target.value);
                    }}
                    placeholder={`Welcome Drink
Orange Juice

Starter
Paneer Tikka
Hara Bhara Kebab

Main Course
Paneer Butter Masala
Special Maharaja Sabji
Dal Fry
Jeera Rice
Butter Naan

Sweet
Gulab Jamun`}
                  />
                  <div className="event-text-meta">
                    <span>{menuLines} non-empty lines • {work.event.rawMenuText.length.toLocaleString('en-IN')} characters</span>
                    <span>English • Roman Hindi • Hindi • Gujarati</span>
                  </div>
              </div>
            </div>

            {error ? (
              <div className="event-detection-error" role="alert">
                <b>Menu needs attention</b>
                <p>{error}</p>
              </div>
            ) : null}

            {detectionPreview ? (
              <div
                id="menuDetectionPreview"
                className="menu-detection-preview"
              >
                <div className="menu-preview-heading">
                  <div>
                    <span className="section-kicker">
                      {detectionPreview.source === 'ai'
                        ? 'AI-assisted detection'
                        : 'Local detection fallback'}
                    </span>
                    <h3>Review detected menu</h3>
                    <p>
                      {detectionPreview.source === 'ai'
                        ? 'AI organized the menu, matched saved recipes, and calculated available dish costs.'
                        : 'The AI service was unavailable, so the built-in parser handled this menu.'}
                      {' '}AI recipe estimates are marked for review; unresolved dishes can continue with ₹0.
                    </p>
                  </div>
                  <div className="menu-preview-metrics">
                    <span><b>{selectedPreviewMenu.length}</b> selected</span>
                    <span><b>{detectionPreviewGroups.length}</b> functions</span>
                    <span>
                      <b>
                        {menuCoverageAudit.counts.COSTED}
                      </b>{' '}
                      costed
                    </span>
                    {detectionPreview.menu.some((item) => item.costSource === 'ai_recipe') ? (
                      <span><b>{detectionPreview.menu.filter((item) => item.costSource === 'ai_recipe').length}</b> AI recipe</span>
                    ) : null}
                    {manualRateIds.size > 0 ? (
                      <span className={selectedMissingManualRateCount > 0 ? 'needs-attention' : ''}>
                        <b>{manualRateIds.size}</b> manual rate
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="menu-review-command">
                  <div className="menu-review-command-copy">
                    <span>
                      Review queue
                    </span>

                    <strong>
                      {detectionActionCount > 0
                        ? `${detectionActionCount} dish${detectionActionCount === 1 ? '' : 'es'} need attention`
                        : 'Detected menu looks ready'}
                    </strong>

                    <small>
                      Review uncertain dishes first. Fix wrong names, mark false detections as Not a dish, and recover anything that was missed.
                    </small>
                  </div>

                  <div className="menu-review-command-stats">
                    <div
                      className={
                        detectionActionCount > 0
                          ? 'attention'
                          : 'ready'
                      }
                    >
                      <b>
                        {detectionActionCount}
                      </b>

                      <span>
                        Need attention
                      </span>
                    </div>

                    <div className="ready">
                      <b>
                        {detectionReadyCount}
                      </b>

                      <span>
                        Ready
                      </span>
                    </div>

                    <div
                      className={
                        detectionPreview
                          .possibleMissed
                          .length
                          ? 'attention'
                          : ''
                      }
                    >
                      <b>
                        {
                          detectionPreview
                            .possibleMissed
                            .length
                        }
                      </b>

                      <span>
                        Possible missed
                      </span>
                    </div>

                    <div>
                      <b>
                        {
                          selectedPreviewMenu
                            .length
                        }
                      </b>

                      <span>
                        Selected
                      </span>
                    </div>
                  </div>

                  <div className="menu-review-command-actions">
                    <button
                      type="button"
                      className="primary-button"
                      disabled={
                        detectionSourceCounts
                          .problems === 0
                      }
                      onClick={() => {
                        setDetectionReviewFilter(
                          'PROBLEMS',
                        );

                        window.setTimeout(
                          () =>
                            document
                              .querySelector(
                                '.menu-preview-groups',
                              )
                              ?.scrollIntoView({
                                behavior:
                                  'smooth',

                                block:
                                  'start',
                              }),
                          40,
                        );
                      }}
                    >
                      Review Problems
                      {detectionSourceCounts
                        .problems > 0
                        ? ` (${detectionSourceCounts.problems})`
                        : ''}
                    </button>

                    <button
                      type="button"
                      className={`secondary-button menu-source-compare-toggle ${
                        showDetectionSourceCompare
                          ? 'active'
                          : ''
                      }`}
                      data-menu-source-compare
                      aria-pressed={
                        showDetectionSourceCompare
                      }
                      onClick={() =>
                        setShowDetectionSourceCompare(
                          (current) =>
                            !current,
                        )
                      }
                    >
                      {showDetectionSourceCompare
                        ? 'Hide Compare'
                        : 'Compare Source'}

                      <kbd>
                        C
                      </kbd>
                    </button>

                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() =>
                        setDetectionReviewFilter(
                          'ALL',
                        )
                      }
                    >
                      Show All Dishes
                    </button>
                  </div>
                </div>

                {recostingDishIds.size > 0 ? (
                  <div
                    className="event-detection-note menu-recosting-note"
                    role="status"
                    aria-live="polite"
                  >
                    <span
                      className="menu-recosting-spinner"
                      aria-hidden="true"
                    />

                    <div>
                      <b>
                        Recalculating corrected dish cost
                      </b>

                      <p>
                        {recostingDishIds.size}{' '}
                        {recostingDishIds.size === 1
                          ? 'dish is'
                          : 'dishes are'}{' '}
                        being checked against Dish Master and recipe costing.
                      </p>
                    </div>
                  </div>
                ) : null}

                {manualRateIds.size > 0 ? (
                  <div className="event-detection-note" role="status">
                    <b>Rates for new or corrected dishes</b>
                    <p>
                      {manualRateIds.size} {manualRateIds.size === 1 ? 'dish needs' : 'dishes need'} a confirmed per-plate rate before saving. New and corrected dishes are also available for admin review.
                    </p>
                  </div>
                ) : null}

                {showDetectionSourceCompare ? (
                  <div className="menu-source-compare">
                    <div className="menu-source-compare-head">
                      <div>
                        <span>
                          Menu Detection
                        </span>

                        <strong>
                          Detected Menu
                        </strong>

                        <small>
                          {sourceCompareAttentionCount > 0
                            ? `${sourceCompareAttentionCount} item${sourceCompareAttentionCount === 1 ? '' : 's'} need attention. Edit the detected dishes below.`
                            : 'Review the detected dishes, make any correction, then use this menu.'}
                        </small>
                      </div>

                      <div className="menu-source-compare-stats">
                        <div className="matched">
                          <b>
                            {
                              sourceCompareExactDetectedCount
                            }
                          </b>

                          <span>
                            Exact source matches
                          </span>
                        </div>

                        <div
                          className={
                            sourceComparePossibleMissedCount >
                            0
                              ? 'attention'
                              : ''
                          }
                        >
                          <b>
                            {
                              sourceComparePossibleMissedCount
                            }
                          </b>

                          <span>
                            Possible missed
                          </span>
                        </div>

                        <div>
                          <b>
                            {
                              sourceCompareDetectedItems
                                .length
                            }
                          </b>

                          <span>
                            Detected dishes
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="menu-source-compare-close"
                        onClick={() =>
                          setShowDetectionSourceCompare(
                            false,
                          )
                        }
                        aria-label="Close source comparison"
                      >
                        ×
                      </button>
                    </div>

                    <div className="menu-source-compare-columns">
                      <section className="menu-source-compare-panel">
                        <div className="menu-source-compare-panel-head">
                          <div>
                            <span>
                              Original
                            </span>

                            <strong>
                              Original Menu
                            </strong>
                          </div>

                          <small>
                            {
                              sourceComparisonLines
                                .length
                            }
                            {' '}non-empty lines
                          </small>
                        </div>

                        <div className="menu-source-line-list">
                          {sourceComparisonLines.map(
                            (line) => {
                              const missedCandidate =
                                detectionPreview
                                  .possibleMissed
                                  .find(
                                    (candidate) =>
                                      dishNameKey(
                                        candidate.name,
                                      ) ===
                                      line.key,
                                  );

                              return (
                                <div
                                  className={`menu-source-line ${line.status
                                    .toLowerCase()
                                    .replaceAll(
                                      '_',
                                      '-',
                                    )} ${
                                      selectedSourceLineNumber ===
                                      line.lineNumber
                                        ? 'is-selected-source'
                                        : ''
                                    }`}
                                  key={`source-${line.lineNumber}`}
                                  role="button"
                                  tabIndex={0}
                                  aria-selected={
                                    selectedSourceLineNumber ===
                                    line.lineNumber
                                  }
                                  onClick={() =>
                                    selectOriginalComparisonLine(
                                      line,
                                    )
                                  }
                                  onKeyDown={(event) => {
                                    if (
                                      event.target !==
                                      event.currentTarget
                                    ) {
                                      return;
                                    }

                                    if (
                                      event.key ===
                                        'Enter' ||
                                      event.key ===
                                        ' '
                                    ) {
                                      event.preventDefault();

                                      selectOriginalComparisonLine(
                                        line,
                                      );
                                    }
                                  }}
                                >
                                  <span className="menu-source-line-number">
                                    {
                                      line.lineNumber
                                    }
                                  </span>

                                  <div className="menu-source-line-copy">
                                    <strong>
                                      {
                                        line.raw
                                      }
                                    </strong>

                                    {line.status ===
                                    'DETECTED' ? (
                                      <small className="matched">
                                        ✓ Detected
                                      </small>
                                    ) : line.status ===
                                        'POSSIBLE_MISSED' &&
                                      missedCandidate ? (
                                      <>
                                        <small className="attention">
                                          ⚠ Possible missed dish
                                        </small>

                                        <div className="menu-source-missed-actions">
                                          <button
                                            type="button"
                                            className="source-add"
                                            onClick={(event) => {
                                              event.stopPropagation();

                                              setSelectedSourceLineNumber(
                                                line.lineNumber,
                                              );

                                              addPossibleMissedDish(
                                                missedCandidate,
                                              );
                                            }}
                                          >
                                            + Add Dish
                                          </button>

                                          <button
                                            type="button"
                                            className="source-ignore"
                                            onClick={(event) => {
                                              event.stopPropagation();

                                              dismissPossibleMissedDish(
                                                missedCandidate,
                                              );

                                              if (
                                                selectedSourceLineNumber ===
                                                line.lineNumber
                                              ) {
                                                setSelectedSourceLineNumber(
                                                  null,
                                                );
                                              }
                                            }}
                                          >
                                            Not a dish
                                          </button>
                                        </div>
                                      </>
                                    ) : (
                                      <small
                                        className={
                                          selectedSourceLineNumber ===
                                            line.lineNumber &&
                                          !selectedSourceDetectedItem
                                            ? 'source-not-detected'
                                            : ''
                                        }
                                      >
                                        {selectedSourceLineNumber ===
                                          line.lineNumber &&
                                        !selectedSourceDetectedItem
                                          ? 'Not detected — add if this is a dish'
                                          : 'Source / heading / note'}
                                      </small>
                                    )}
                                  </div>
                                </div>
                              );
                            },
                          )}
                        </div>
                      </section>

                      <section className="menu-source-compare-panel">
                        <div className="menu-source-compare-panel-head">
                          <div>
                            <span>
                              Detected
                            </span>

                            <strong>
                              Detected Menu
                            </strong>
                          </div>

                          <small>
                            {
                              sourceCompareDetectedItems
                                .length
                            }
                            {' '}active dishes
                          </small>
                        </div>

                        <div className="menu-source-detected-list">
                          {selectedSourceLine ? (
                            <div
                              className={`menu-compare-source-selection ${
                                selectedSourceDetectedItem
                                  ? 'found'
                                  : 'missing'
                              }`}
                            >
                              <div>
                                <span>
                                  Selected from Original Menu
                                </span>

                                <strong>
                                  {
                                    selectedSourceLine.raw
                                  }
                                </strong>
                              </div>

                              <div>
                                <b>
                                  {selectedSourceDetectedItem
                                    ? '✓ Found in Detected Menu'
                                    : 'Not detected'}
                                </b>

                                <small>
                                  {selectedSourceDetectedItem
                                    ? selectedSourceDetectedItem.name
                                    : 'If this is a dish, review the prefilled form below and add it.'}
                                </small>
                              </div>
                            </div>
                          ) : null}

                          <div className="menu-compare-add-dish">
                            <button
                              type="button"
                              className="menu-compare-add-toggle"
                              onClick={() => {
                                setShowAddMissedDish(
                                  (current) =>
                                    !current,
                                );

                                if (
                                  !newDetectionDishGroupKey &&
                                  detectionFunctionOptions.length
                                ) {
                                  setNewDetectionDishGroupKey(
                                    detectionFunctionOptions[
                                      0
                                    ].key,
                                  );
                                }
                              }}
                            >
                              + Add Dish
                            </button>
                          </div>

                          {showAddMissedDish ? (
                            <div className="menu-compare-add-form">
                              <div className="menu-compare-field">
                                <span>
                                  Dish name
                                </span>

                                <input
                                  className="input"
                                  value={
                                    newDetectionDishName
                                  }
                                  onChange={(event) =>
                                    setNewDetectionDishName(
                                      event.target
                                        .value,
                                    )
                                  }
                                  placeholder="Enter missed dish"
                                  autoFocus
                                />
                              </div>

                              <div className="menu-compare-field">
                                <span>
                                  Category
                                </span>

                                <select
                                  className="select"
                                  value={
                                    newDetectionDishCategory
                                  }
                                  onChange={(event) =>
                                    setNewDetectionDishCategory(
                                      event.target
                                        .value as Category,
                                    )
                                  }
                                >
                                  {CATEGORIES.map(
                                    (
                                      category,
                                    ) => (
                                      <option
                                        key={
                                          category
                                        }
                                        value={
                                          category
                                        }
                                      >
                                        {
                                          category
                                        }
                                      </option>
                                    ),
                                  )}
                                </select>
                              </div>

                              {detectionFunctionOptions.length >
                              1 ? (
                                <div className="menu-compare-field">
                                  <span>
                                    Function
                                  </span>

                                  <select
                                    className="select"
                                    value={
                                      newDetectionDishGroupKey
                                    }
                                    onChange={(event) =>
                                      setNewDetectionDishGroupKey(
                                        event.target
                                          .value,
                                      )
                                    }
                                  >
                                    {detectionFunctionOptions.map(
                                      (
                                        option,
                                      ) => (
                                        <option
                                          key={
                                            option.key
                                          }
                                          value={
                                            option.key
                                          }
                                        >
                                          {
                                            option.label
                                          }
                                        </option>
                                      ),
                                    )}
                                  </select>
                                </div>
                              ) : null}

                              <div className="menu-compare-add-actions">
                                <button
                                  type="button"
                                  className="primary-button"
                                  onClick={
                                    addMissedDetectedDish
                                  }
                                >
                                  Add to Menu
                                </button>

                                <button
                                  type="button"
                                  className="ghost-button"
                                  onClick={() => {
                                    setShowAddMissedDish(
                                      false,
                                    );

                                    setNewDetectionDishName(
                                      '',
                                    );
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : null}

                          {sourceCompareDetectedItems.map(
                            (item) => (
                              <div
                                id={`compare-detected-${item.id}`}
                                className={`menu-source-detected-item menu-compare-editable ${
                                  detectionHasProblem(
                                    item,
                                  )
                                    ? 'attention'
                                    : 'ready'
                                } ${
                                  selectedSourceDetectedItem?.id ===
                                  item.id
                                    ? 'source-selected-match'
                                    : ''
                                }`}
                                key={`compare-${item.id}`}
                              >
                                {editingDetectionId ===
                                item.id ? (
                                  <div className="menu-compare-edit-form">
                                    <div className="menu-compare-field">
                                      <span>
                                        Dish name
                                      </span>

                                      <input
                                        className="input"
                                        value={
                                          editDetectionName
                                        }
                                        onChange={(event) =>
                                          setEditDetectionName(
                                            event.target
                                              .value,
                                          )
                                        }
                                      />
                                    </div>

                                    <div className="menu-compare-field">
                                      <span>
                                        Category
                                      </span>

                                      <select
                                        className="select"
                                        value={
                                          editDetectionCategory
                                        }
                                        onChange={(event) =>
                                          setEditDetectionCategory(
                                            event.target
                                              .value as Category,
                                          )
                                        }
                                      >
                                        {CATEGORIES.map(
                                          (
                                            category,
                                          ) => (
                                            <option
                                              key={
                                                category
                                              }
                                              value={
                                                category
                                              }
                                            >
                                              {
                                                category
                                              }
                                            </option>
                                          ),
                                        )}
                                      </select>
                                    </div>

                                    <div className="menu-compare-edit-actions">
                                      <button
                                        type="button"
                                        className="primary-button"
                                        onClick={() =>
                                          saveDetectionEdit(
                                            item.id,
                                          )
                                        }
                                      >
                                        Save
                                      </button>

                                      <button
                                        type="button"
                                        className="ghost-button"
                                        onClick={
                                          cancelDetectionEdit
                                        }
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="menu-compare-dish-main">
                                      <div className="menu-compare-dish-title">
                                        <strong>
                                          {
                                            item.name
                                          }
                                        </strong>

                                        {recostingDishIds.has(
                                          item.id,
                                        ) ? (
                                          <span className="menu-compare-recosting">
                                            Re-costing…
                                          </span>
                                        ) : null}
                                      </div>

                                      <div className="menu-compare-dish-meta">
                                        <select
                                          value={
                                            item.category
                                          }
                                          disabled={
                                            recostingDishIds.has(
                                              item.id,
                                            )
                                          }
                                          onChange={(event) =>
                                            quickChangeDetectionCategory(
                                              item,
                                              event.target
                                                .value as Category,
                                            )
                                          }
                                          aria-label={`Category for ${item.name}`}
                                        >
                                          {CATEGORIES.map(
                                            (
                                              category,
                                            ) => (
                                              <option
                                                key={
                                                  category
                                                }
                                                value={
                                                  category
                                                }
                                              >
                                                {
                                                  category
                                                }
                                              </option>
                                            ),
                                          )}
                                        </select>

                                        {detectionFunctionOptions.length >
                                        1 ? (
                                          <select
                                            className="menu-compare-function-select"
                                            value={
                                              detectionGroupKeyForItem(
                                                item,
                                              )
                                            }
                                            onChange={(event) =>
                                              quickMoveDetectionFunction(
                                                item,
                                                event.target
                                                  .value,
                                              )
                                            }
                                            aria-label={`Function for ${item.name}`}
                                          >
                                            {detectionFunctionOptions.map(
                                              (
                                                option,
                                              ) => (
                                                <option
                                                  key={
                                                    option.key
                                                  }
                                                  value={
                                                    option.key
                                                  }
                                                >
                                                  {
                                                    option.label
                                                  }
                                                </option>
                                              ),
                                            )}
                                          </select>
                                        ) : null}

                                        {(item.dayLabel ||
                                          item.mealLabel) ? (
                                          <small>
                                            {[
                                              item.dayLabel,
                                              item.mealLabel,
                                            ]
                                              .filter(
                                                Boolean,
                                              )
                                              .join(
                                                ' • ',
                                              )}
                                          </small>
                                        ) : null}
                                      </div>
                                    </div>

                                    {manualRateIds.has(
                                      item.id,
                                    ) ? (
                                      <div
                                        className={`menu-compare-manual-rate ${
                                          item.costSource ===
                                          'manual'
                                            ? 'has-manual-rate'
                                            : 'needs-manual-rate'
                                        }`}
                                      >
                                        <div className="menu-compare-manual-rate-copy">
                                          <span>
                                            {item.costSource ===
                                            'manual'
                                              ? 'Manual Rate'
                                              : 'New / Unmatched Dish'}
                                          </span>

                                          <strong>
                                            {item.costSource ===
                                            'manual'
                                              ? 'Your rate is being used'
                                              : 'Enter manual ₹/plate if needed'}
                                          </strong>

                                          <small>
                                            {item.costSource ===
                                            'manual'
                                              ? `Manual cost ₹${Number(
                                                  item.costPerPlate,
                                                ).toFixed(
                                                  2,
                                                )}/plate`
                                              : Number(
                                                    item.costPerPlate,
                                                  ) > 0
                                                ? `Automatic ${
                                                    item.costSource ===
                                                    'ai_recipe'
                                                      ? 'AI recipe'
                                                      : item.costSource ===
                                                          'catalog_recipe'
                                                        ? 'recipe'
                                                        : item.costSource ===
                                                            'category_estimate'
                                                          ? 'category estimate'
                                                          : 'estimated'
                                                  } rate ₹${Number(
                                                    item.costPerPlate,
                                                  ).toFixed(
                                                    2,
                                                  )}/plate. Change it to use your own rate.`
                                                : 'No usable automatic cost was found. Enter the dish cost per plate.'}
                                          </small>
                                        </div>

                                        <label className="menu-compare-manual-rate-input">
                                          <span>
                                            ₹
                                          </span>

                                          <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            inputMode="decimal"
                                            value={
                                              item.costPerPlate ||
                                              ''
                                            }
                                            onFocus={(event) =>
                                              event.currentTarget.select()
                                            }
                                            onChange={(event) => {
                                              const rate =
                                                Math.max(
                                                  0,
                                                  Number(
                                                    event.target
                                                      .value,
                                                  ) || 0,
                                                );

                                              setDetectionPreview(
                                                (current) =>
                                                  current
                                                    ? {
                                                        ...current,

                                                        menu:
                                                          current.menu.map(
                                                            (
                                                              menuItem,
                                                            ) =>
                                                              menuItem.id ===
                                                              item.id
                                                                ? {
                                                                    ...menuItem,

                                                                    costPerPlate:
                                                                      rate,

                                                                    costSource:
                                                                      rate >
                                                                      0
                                                                        ? 'manual'
                                                                        : 'manual',

                                                                    coverageStatus:
                                                                      rate >
                                                                      0
                                                                        ? 'COSTED'
                                                                        : 'NEW_DISH_PENDING',

                                                                    costQualityStatus:
                                                                      rate >
                                                                      0
                                                                        ? 'READY'
                                                                        : undefined,

                                                                    costConfidence:
                                                                      rate >
                                                                      0
                                                                        ? 100
                                                                        : 0,

                                                                    rateCoveragePercent:
                                                                      rate >
                                                                      0
                                                                        ? 100
                                                                        : 0,

                                                                    coverageReason:
                                                                      rate >
                                                                      0
                                                                        ? 'Manual rate entered by user'
                                                                        : 'Manual rate required',

                                                                    ingredientCostDrivers:
                                                                      [],

                                                                    costApprovalStatus:
                                                                      rate >
                                                                      0
                                                                        ? 'APPROVED'
                                                                        : 'PENDING',

                                                                    costApprovedAt:
                                                                      rate >
                                                                      0
                                                                        ? new Date().toISOString()
                                                                        : undefined,

                                                                    costApprovalReason:
                                                                      rate >
                                                                      0
                                                                        ? 'User manually entered and accepted this rate'
                                                                        : 'Manual rate required',
                                                                  }
                                                                : menuItem,
                                                          ),
                                                      }
                                                    : current,
                                              );

                                              setSelectedPreviewIds(
                                                (
                                                  current,
                                                ) => {
                                                  const next =
                                                    new Set(
                                                      current,
                                                    );

                                                  next.add(
                                                    item.id,
                                                  );

                                                  return next;
                                                },
                                              );

                                              setError('');
                                            }}
                                            aria-label={`Manual rate for ${item.name}`}
                                            placeholder="Enter rate"
                                          />

                                          <small>
                                            / plate
                                          </small>
                                        </label>
                                      </div>
                                    ) : null}

                                    <div className="menu-compare-dish-actions">
                                      {detectionNeedsReview(
                                        item,
                                      ) ? (
                                        <button
                                          type="button"
                                          className="compare-confirm"
                                          onClick={() =>
                                            confirmDetectedDish(
                                              item,
                                            )
                                          }
                                        >
                                          ✓ Looks correct
                                        </button>
                                      ) : (
                                        <span className="compare-ready">
                                          ✓ Ready
                                        </span>
                                      )}

                                      <button
                                        type="button"
                                        className="compare-edit"
                                        onClick={() =>
                                          beginDetectionEdit(
                                            item,
                                          )
                                        }
                                      >
                                        Edit
                                      </button>

                                      <button
                                        type="button"
                                        className="compare-remove"
                                        onClick={() =>
                                          toggleDetectedDishRejection(
                                            item,
                                          )
                                        }
                                      >
                                        Not a dish
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            ),
                          )}
                        </div>
                      </section>
                    </div>

                    <div className="menu-source-compare-footer">
                      <p>
                        <b>
                          How to read this:
                        </b>
                        {' '}
                        Green means an exact cleaned source line matches a detected dish. Orange means the existing recovery engine already identified that line as a possible missed dish. Neutral lines may be headings, notes, event details, or complex menu lines and are not automatically treated as missing.
                      </p>

                      {detectionPreview
                        .possibleMissed
                        .length > 0 ? (
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => {
                            setShowDetectionSourceCompare(
                              false,
                            );

                            window.setTimeout(
                              () =>
                                document
                                  .querySelector(
                                    '.menu-missed-recovery',
                                  )
                                  ?.scrollIntoView({
                                    behavior:
                                      'smooth',

                                    block:
                                      'center',
                                  }),
                              40,
                            );
                          }}
                        >
                          Review Possible Missed
                          {' '}
                          (
                          {
                            detectionPreview
                              .possibleMissed
                              .length
                          }
                          )
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <div className="menu-review-diagnostics-heading">
                  <div>
                    <span>
                      Advanced diagnostics
                    </span>

                    <strong>
                      Detection & costing health
                    </strong>

                    <small>
                      These technical checks are useful after the menu itself has been reviewed.
                    </small>
                  </div>

                  <span aria-hidden="true">
                    ↳
                  </span>
                </div>

                <div className="menu-detection-benchmark">
                  <div className="menu-detection-benchmark-head">
                    <div>
                      <span>
                        Detection Accuracy Benchmark
                      </span>

                      <strong>
                        {detectionBenchmark.grade ===
                        'EXCELLENT'
                          ? '✓ Excellent detection'
                          : detectionBenchmark.grade ===
                              'GOOD'
                            ? '◷ Good — keep improving'
                            : '⚠ Needs improvement'}
                      </strong>

                      <small>
                        {detectionBenchmark.hasReviewSignals
                          ? 'Calculated from the corrections you made on this real menu.'
                          : 'Baseline only. Correct, reject, or recover dishes to turn this into a real accuracy measurement.'}
                      </small>
                    </div>

                    <div
                      className={`menu-detection-benchmark-score ${
                        detectionBenchmark.grade ===
                        'EXCELLENT'
                          ? 'excellent'
                          : detectionBenchmark.grade ===
                              'GOOD'
                            ? 'good'
                            : 'attention'
                      }`}
                    >
                      <b>
                        {detectionBenchmark.score.toFixed(
                          1,
                        )}
                      </b>

                      <span>
                        score
                      </span>
                    </div>
                  </div>

                  <div className="menu-detection-benchmark-grid">
                    <div>
                      <span>
                        Recall
                      </span>

                      <b>
                        {detectionBenchmark.recallPercent.toFixed(
                          1,
                        )}
                        %
                      </b>

                      <small>
                        real dishes captured
                      </small>
                    </div>

                    <div>
                      <span>
                        Precision
                      </span>

                      <b>
                        {detectionBenchmark.precisionPercent.toFixed(
                          1,
                        )}
                        %
                      </b>

                      <small>
                        detected items that are real
                      </small>
                    </div>

                    <div>
                      <span>
                        Exact Capture
                      </span>

                      <b>
                        {detectionBenchmark.exactCapturePercent.toFixed(
                          1,
                        )}
                        %
                      </b>

                      <small>
                        no correction needed
                      </small>
                    </div>
                  </div>

                  <div className="menu-detection-benchmark-detail">
                    <span>
                      <b>
                        {
                          detectionBenchmark
                            .initialDetected
                        }
                      </b>
                      {' '}initially detected
                    </span>

                    <span>
                      <b>
                        {
                          detectionBenchmark
                            .corrected
                        }
                      </b>
                      {' '}corrected
                    </span>

                    <span>
                      <b>
                        {
                          detectionBenchmark
                            .falsePositives
                        }
                      </b>
                      {' '}false positives
                    </span>

                    <span>
                      <b>
                        {
                          detectionBenchmark
                            .totalMissedRecovered
                        }
                      </b>
                      {' '}missed & recovered
                    </span>

                    <span>
                      <b>
                        {
                          detectionBenchmark
                            .groundTruth
                        }
                      </b>
                      {' '}reviewed real dishes
                    </span>
                  </div>

                  <div className="menu-detection-benchmark-target">
                    Target:
                    {' '}
                    <b>
                      Recall ≥95%
                    </b>
                    {' · '}
                    <b>
                      Precision ≥97%
                    </b>
                  </div>
                </div>

                {detectionPreview
                  .possibleMissed
                  .length ? (
                  <div className="menu-missed-recovery">
                    <div className="menu-missed-recovery-head">
                      <div>
                        <span>
                          Source Coverage Check
                        </span>

                        <strong>
                          {
                            detectionPreview
                              .possibleMissed
                              .length
                          }{' '}
                          possible missed{' '}
                          {detectionPreview
                            .possibleMissed
                            .length === 1
                            ? 'dish'
                            : 'dishes'}
                        </strong>

                        <small>
                          These lines came from the uploaded menu but were too uncertain to add automatically.
                        </small>
                      </div>

                      <div className="menu-missed-recovery-count">
                        {
                          detectionPreview
                            .possibleMissed
                            .length
                        }
                      </div>
                    </div>

                    <div className="menu-missed-recovery-list">
                      {detectionPreview
                        .possibleMissed
                        .map(
                          (candidate) => (
                            <div
                              className="menu-missed-recovery-item"
                              key={
                                sourceDishCoverageKey(
                                  candidate,
                                )
                              }
                            >
                              <div>
                                <strong>
                                  {
                                    candidate.name
                                  }
                                </strong>

                                <span>
                                  {[
                                    candidate.dayLabel,
                                    candidate.mealLabel,
                                    candidate.categoryHint,
                                  ]
                                    .filter(Boolean)
                                    .join(
                                      ' • ',
                                    ) ||
                                    'Menu source line'}
                                </span>

                                <small>
                                  {
                                    candidate.confidenceScore
                                  }
                                  % parser confidence
                                  {' · '}
                                  {
                                    candidate.detectionReason
                                  }
                                </small>
                              </div>

                              <div className="menu-missed-recovery-actions">
                                <button
                                  type="button"
                                  className="primary-button"
                                  onClick={() =>
                                    addPossibleMissedDish(
                                      candidate,
                                    )
                                  }
                                >
                                  + Add Dish
                                </button>

                                <button
                                  type="button"
                                  className="ghost-button"
                                  onClick={() =>
                                    dismissPossibleMissedDish(
                                      candidate,
                                    )
                                  }
                                >
                                  Not a dish
                                </button>
                              </div>
                            </div>
                          ),
                        )}
                    </div>
                  </div>
                ) : null}

                <div className="menu-detection-correction-bar">
                  <div>
                    <b>
                      Detection corrections
                    </b>

                    <span>
                      Fix wrong results or add a dish that was missed.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowAddMissedDish(
                        (current) =>
                          !current,
                      );

                      if (
                        !newDetectionDishGroupKey &&
                        detectionFunctionOptions
                          .length
                      ) {
                        setNewDetectionDishGroupKey(
                          detectionFunctionOptions[
                            0
                          ].key,
                        );
                      }

                      setError('');
                    }}
                  >
                    + Add missed dish
                  </button>
                </div>

                {showAddMissedDish ? (
                  <div className="menu-add-missed-dish">
                    <label>
                      <span>
                        Dish name
                      </span>

                      <input
                        className="input"
                        value={
                          newDetectionDishName
                        }
                        onChange={(event) =>
                          setNewDetectionDishName(
                            event.target
                              .value,
                          )
                        }
                        placeholder="Example: Rajwadi Paneer"
                        autoFocus
                      />
                    </label>

                    <label>
                      <span>
                        Category
                      </span>

                      <select
                        className="select"
                        value={
                          newDetectionDishCategory
                        }
                        onChange={(event) =>
                          setNewDetectionDishCategory(
                            event.target
                              .value as Category,
                          )
                        }
                      >
                        {CATEGORIES.map(
                          (category) => (
                            <option
                              key={
                                category
                              }
                              value={
                                category
                              }
                            >
                              {
                                category
                              }
                            </option>
                          ),
                        )}
                      </select>
                    </label>

                    <label>
                      <span>
                        Function / Meal
                      </span>

                      <select
                        className="select"
                        value={
                          newDetectionDishGroupKey
                        }
                        onChange={(event) =>
                          setNewDetectionDishGroupKey(
                            event.target
                              .value,
                          )
                        }
                      >
                        {!detectionFunctionOptions
                          .length ? (
                          <option value="">
                            Event Menu
                          </option>
                        ) : null}

                        {detectionFunctionOptions.map(
                          (group) => (
                            <option
                              key={
                                group.key
                              }
                              value={
                                group.key
                              }
                            >
                              {
                                group.label
                              }
                            </option>
                          ),
                        )}
                      </select>
                    </label>

                    <div className="menu-add-missed-actions">
                      <button
                        type="button"
                        className="primary-button"
                        onClick={
                          addMissedDetectedDish
                        }
                      >
                        Add Dish
                      </button>

                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => {
                          setShowAddMissedDish(
                            false,
                          );

                          setNewDetectionDishName(
                            '',
                          );

                          setError('');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="menu-detection-searchbar">
                  <label className="menu-detection-search">
                    <span
                      aria-hidden="true"
                    >
                      ⌕
                    </span>

                    <input
                      type="search"
                      value={
                        detectionSearch
                      }
                      onChange={(event) =>
                        setDetectionSearch(
                          event.target
                            .value,
                        )
                      }
                      placeholder="Search dish, category or meal..."
                      aria-label="Search detected dishes"
                    />

                    {detectionSearch ? (
                      <button
                        type="button"
                        onClick={() =>
                          setDetectionSearch(
                            '',
                          )
                        }
                        aria-label="Clear dish search"
                      >
                        ×
                      </button>
                    ) : null}
                  </label>

                  <button
                    type="button"
                    className={`menu-problems-toggle ${
                      detectionReviewFilter ===
                      'PROBLEMS'
                        ? 'active'
                        : detectionSourceCounts
                              .problems > 0
                          ? 'attention'
                          : ''
                    }`}
                    onClick={() =>
                      setDetectionReviewFilter(
                        detectionReviewFilter ===
                          'PROBLEMS'
                          ? 'ALL'
                          : 'PROBLEMS',
                      )
                    }
                  >
                    <span>
                      Problems only
                    </span>

                    <b>
                      {
                        detectionSourceCounts
                          .problems
                      }
                    </b>
                  </button>
                </div>

                <div className="menu-detection-filterbar">
                  <button
                    type="button"
                    className={
                      detectionReviewFilter ===
                      'PROBLEMS'
                        ? 'active attention'
                        : detectionSourceCounts
                              .problems > 0
                          ? 'attention'
                          : ''
                    }
                    onClick={() =>
                      setDetectionReviewFilter(
                        'PROBLEMS',
                      )
                    }
                  >
                    Problems
                    <b>
                      {
                        detectionSourceCounts
                          .problems
                      }
                    </b>
                  </button>

                  <button
                    type="button"
                    className={
                      detectionReviewFilter ===
                      'ALL'
                        ? 'active'
                        : ''
                    }
                    onClick={() =>
                      setDetectionReviewFilter(
                        'ALL',
                      )
                    }
                  >
                    All
                    <b>
                      {
                        detectionPreview
                          .menu.length
                      }
                    </b>
                  </button>

                  <button
                    type="button"
                    className={
                      detectionReviewFilter ===
                      'UNCERTAIN'
                        ? 'active attention'
                        : detectionSourceCounts
                              .uncertain > 0
                          ? 'attention'
                          : ''
                    }
                    onClick={() =>
                      setDetectionReviewFilter(
                        'UNCERTAIN',
                      )
                    }
                  >
                    Review
                    <b>
                      {
                        detectionSourceCounts
                          .uncertain
                      }
                    </b>
                  </button>

                  <button
                    type="button"
                    className={
                      detectionReviewFilter ===
                      'CATALOG'
                        ? 'active'
                        : ''
                    }
                    onClick={() =>
                      setDetectionReviewFilter(
                        'CATALOG',
                      )
                    }
                  >
                    Catalog
                    <b>
                      {
                        detectionSourceCounts
                          .catalog
                      }
                    </b>
                  </button>

                  <button
                    type="button"
                    className={
                      detectionReviewFilter ===
                      'CONSENSUS'
                        ? 'active'
                        : ''
                    }
                    onClick={() =>
                      setDetectionReviewFilter(
                        'CONSENSUS',
                      )
                    }
                  >
                    AI + Rules
                    <b>
                      {
                        detectionSourceCounts
                          .consensus
                      }
                    </b>
                  </button>

                  <button
                    type="button"
                    className={
                      detectionReviewFilter ===
                      'AI'
                        ? 'active'
                        : ''
                    }
                    onClick={() =>
                      setDetectionReviewFilter(
                        'AI',
                      )
                    }
                  >
                    AI
                    <b>
                      {
                        detectionSourceCounts
                          .ai
                      }
                    </b>
                  </button>

                  <button
                    type="button"
                    className={
                      detectionReviewFilter ===
                      'RULES'
                        ? 'active'
                        : ''
                    }
                    onClick={() =>
                      setDetectionReviewFilter(
                        'RULES',
                      )
                    }
                  >
                    Rules
                    <b>
                      {
                        detectionSourceCounts
                          .rules
                      }
                    </b>
                  </button>
                </div>

                <div className="menu-preview-toolbar">
                  <b>{selectedPreviewMenu.length} of {detectionPreview.menu.length} dishes selected</b>
                  <div>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedPreviewIds(
                          (current) => {
                            const next =
                              new Set(
                                current,
                              );

                            filteredDetectionMenu.forEach(
                              (item) =>
                                next.add(
                                  item.id,
                                ),
                            );

                            return next;
                          },
                        )
                      }
                      disabled={
                        !filteredDetectionMenu.length
                      }
                    >
                      Select visible
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedPreviewIds(
                          (current) => {
                            const next =
                              new Set(
                                current,
                              );

                            filteredDetectionIds.forEach(
                              (id) =>
                                next.delete(
                                  id,
                                ),
                            );

                            return next;
                          },
                        )
                      }
                      disabled={
                        !filteredDetectionMenu.length
                      }
                    >
                      Clear visible
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedPreviewIds(
                          new Set(
                            detectionPreview.menu.map(
                              (item) => item.id,
                            ),
                          ),
                        )
                      }
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedPreviewIds(
                          new Set(),
                        )
                      }
                    >
                      Clear selection
                    </button>
                  </div>
                </div>

                <div className="menu-coverage-audit">
                  <div className="menu-coverage-head">
                    <div>
                      <span>
                        Menu Coverage Audit
                      </span>

                      <strong>
                        {menuCoverageAudit.coveragePercent.toFixed(1)}
                        %
                      </strong>

                      <small>
                        {menuCoverageAudit.accounted}
                        /
                        {menuCoverageAudit.total}
                        {' '}dishes have an explicit state
                      </small>
                    </div>

                    <div
                      className={`menu-coverage-grade ${
                        menuCoverageAudit.unresolved === 0
                          ? 'complete'
                          : 'attention'
                      }`}
                    >
                      {menuCoverageAudit.unresolved === 0
                        ? '✓ Complete'
                        : `${menuCoverageAudit.unresolved} unresolved`}
                    </div>
                  </div>

                  <div className="menu-coverage-progress">
                    <span
                      style={{
                        width:
                          `${menuCoverageAudit.coveragePercent}%`,
                      }}
                    />
                  </div>

                  <div className="menu-coverage-states">
                    <div className="costed">
                      <b>
                        {menuCoverageAudit.counts.COSTED}
                      </b>

                      <span>
                        Costed
                      </span>
                    </div>

                    <div className="review">
                      <b>
                        {menuCoverageAudit.counts.REVIEW}
                      </b>

                      <span>
                        Needs Review
                      </span>
                    </div>

                    <div className="pending">
                      <b>
                        {menuCoverageAudit.counts.NEW_DISH_PENDING}
                      </b>

                      <span>
                        New Dish Pending
                      </span>
                    </div>

                    <div className="rejected">
                      <b>
                        {menuCoverageAudit.counts.REJECTED}
                      </b>

                      <span>
                        Rejected
                      </span>
                    </div>

                    <div className="unresolved">
                      <b>
                        {menuCoverageAudit.counts.UNRESOLVED}
                      </b>

                      <span>
                        Unresolved
                      </span>
                    </div>
                  </div>

                  {menuCoverageAudit.unresolved > 0 ? (
                    <p className="menu-coverage-warning">
                      No menu item will be silently dropped.
                      Resolve each unresolved dish or intentionally deselect it.
                    </p>
                  ) : (
                    <p className="menu-coverage-success">
                      ✓ Every detected dish is accounted for.
                    </p>
                  )}
                </div>

                <div className="menu-cost-accuracy-audit">
                  <div className="menu-cost-accuracy-head">
                    <div>
                      <span>
                        Costing Accuracy Audit
                      </span>

                      <strong>
                        {highAccuracyRiskCount > 0
                          ? `${highAccuracyRiskCount} high-risk change${highAccuracyRiskCount === 1 ? '' : 's'}`
                          : watchAccuracyRiskCount > 0
                            ? `${watchAccuracyRiskCount} change${watchAccuracyRiskCount === 1 ? '' : 's'} to review`
                            : 'Costs look stable'}
                      </strong>

                      <small>
                        Current recipe costs are compared with the previous tenant cost or catalog baseline.
                      </small>
                    </div>

                    <div
                      className={`cost-accuracy-overall ${
                        highAccuracyRiskCount > 0
                          ? 'high'
                          : watchAccuracyRiskCount > 0
                            ? 'watch'
                            : 'stable'
                      }`}
                    >
                      {highAccuracyRiskCount > 0
                        ? '⚠ Review required'
                        : watchAccuracyRiskCount > 0
                          ? '◷ Check changes'
                          : '✓ Stable'}
                    </div>
                  </div>

                  <div className="menu-cost-accuracy-stats">
                    <div className="high">
                      <b>
                        {highAccuracyRiskCount}
                      </b>

                      <span>
                        High Risk
                      </span>
                    </div>

                    <div className="watch">
                      <b>
                        {watchAccuracyRiskCount}
                      </b>

                      <span>
                        Watch
                      </span>
                    </div>

                    <div className="stable">
                      <b>
                        {stableAccuracyCount}
                      </b>

                      <span>
                        Stable
                      </span>
                    </div>

                    <div className="baseline">
                      <b>
                        {newBaselineCount}
                      </b>

                      <span>
                        New Baseline
                      </span>
                    </div>
                  </div>

                  {largestCostMovements.length ? (
                    <div className="menu-cost-movement-list">
                      {largestCostMovements.map(
                        (item) => (
                          <div
                            className={`menu-cost-movement ${
                              item.accuracyRisk === 'HIGH'
                                ? 'high'
                                : 'watch'
                            }`}
                            key={`accuracy-${item.id}`}
                          >
                            <div>
                              <strong>
                                {item.name}
                              </strong>

                              <small>
                                Previous ₹
                                {Number(
                                  item.previousCostPerPlate,
                                ).toFixed(2)}
                                {' → '}
                                Current ₹
                                {Number(
                                  item.costPerPlate,
                                ).toFixed(2)}
                              </small>
                            </div>

                            <div className="menu-cost-movement-change">
                              <b>
                                {Number(
                                  item.costChangePercent,
                                ) >= 0
                                  ? '+'
                                  : ''}
                                {Number(
                                  item.costChangePercent,
                                ).toFixed(1)}
                                %
                              </b>

                              <span>
                                {Number(
                                  item.costChangeAmount,
                                ) >= 0
                                  ? '+'
                                  : '-'}
                                ₹
                                {Math.abs(
                                  Number(
                                    item.costChangeAmount,
                                  ),
                                ).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <p className="menu-cost-accuracy-clean">
                      ✓ No abnormal historical cost movements detected in the selected menu.
                    </p>
                  )}
                </div>

                <div className="ingredient-driver-intelligence">
                  <div className="ingredient-driver-head">
                    <div>
                      <span>
                        Ingredient Cost Drivers
                      </span>

                      <strong>
                        What is driving this menu cost?
                      </strong>

                      <small>
                        Based on actual recipe quantities and the ingredient rates used in costing.
                      </small>
                    </div>

                    <div className="ingredient-driver-count">
                      <b>
                        {topMenuIngredientDrivers.length}
                      </b>

                      <span>
                        top drivers
                      </span>
                    </div>
                  </div>

                  {topMenuIngredientDrivers.length ? (
                    <div className="ingredient-driver-list">
                      {topMenuIngredientDrivers.map(
                        (driver) => {
                          const highest =
                            Math.max(
                              0.01,
                              topMenuIngredientDrivers[
                                0
                              ]?.costPerPlate ||
                                0.01,
                            );

                          const width =
                            Math.max(
                              5,
                              Math.min(
                                100,
                                driver.costPerPlate /
                                  highest *
                                  100,
                              ),
                            );

                          return (
                            <div
                              className="ingredient-driver-row"
                              key={`driver-${dishNameKey(driver.name)}`}
                            >
                              <div className="ingredient-driver-copy">
                                <strong>
                                  {driver.name}
                                </strong>

                                <small>
                                  {driver.dishCount}
                                  {' '}
                                  dish
                                  {driver.dishCount === 1
                                    ? ''
                                    : 'es'}

                                  {driver.estimatedCount
                                    ? ` · ${driver.estimatedCount} estimated`
                                    : ''}
                                </small>
                              </div>

                              <div className="ingredient-driver-bar">
                                <span
                                  style={{
                                    width:
                                      `${width}%`,
                                  }}
                                />
                              </div>

                              <div className="ingredient-driver-cost">
                                ₹
                                {driver.costPerPlate.toFixed(
                                  2,
                                )}
                                <small>
                                  / plate
                                </small>
                              </div>
                            </div>
                          );
                        },
                      )}
                    </div>
                  ) : (
                    <p className="ingredient-driver-empty">
                      Ingredient driver data appears when a priced recipe is available.
                    </p>
                  )}
                </div>

                <div
                  className={`cost-approval-gate ${
                    hardBlockedCostItems.length
                      ? 'blocked'
                      : pendingCostApprovalItems.length
                        ? 'pending'
                        : 'clear'
                  }`}
                >
                  <div className="cost-approval-gate-head">
                    <div>
                      <span>
                        Cost Approval Gate
                      </span>

                      <strong>
                        {hardBlockedCostItems.length
                          ? `${hardBlockedCostItems.length} blocked cost${hardBlockedCostItems.length === 1 ? '' : 's'}`
                          : pendingCostApprovalItems.length
                            ? `${pendingCostApprovalItems.length} approval${pendingCostApprovalItems.length === 1 ? '' : 's'} required`
                            : 'Ready to continue'}
                      </strong>

                      <small>
                        Risky costs must be accepted or corrected before they enter final costing.
                      </small>
                    </div>

                    <div className="cost-approval-gate-status">
                      {hardBlockedCostItems.length
                        ? '✕ Fix required'
                        : pendingCostApprovalItems.length
                          ? '⚠ Approval required'
                          : '✓ Gate passed'}
                    </div>
                  </div>

                  <div className="cost-approval-summary">
                    <div>
                      <b>
                        {hardBlockedCostItems.length}
                      </b>
                      <span>
                        Blocked
                      </span>
                    </div>

                    <div>
                      <b>
                        {pendingCostApprovalItems.length}
                      </b>
                      <span>
                        Pending
                      </span>
                    </div>

                    <div>
                      <b>
                        {approvedCostReviewItems.length}
                      </b>
                      <span>
                        Approved
                      </span>
                    </div>
                  </div>

                  {approvalGateItems.length ? (
                    <div className="cost-approval-list">
                      {approvalGateItems.map(
                        (item) => {
                          const hardBlocked =
                            hasHardCostBlock(
                              item,
                            );

                          const approved =
                            item.costApprovalStatus ===
                            'APPROVED';

                          return (
                            <div
                              className={`cost-approval-item ${
                                hardBlocked
                                  ? 'blocked'
                                  : approved
                                    ? 'approved'
                                    : 'pending'
                              }`}
                              key={`approval-${item.id}`}
                            >
                              <div className="cost-approval-item-copy">
                                <strong>
                                  {item.name}
                                </strong>

                                <small>
                                  Current ₹
                                  {Number(
                                    item.costPerPlate,
                                  ).toFixed(2)}

                                  {Number(
                                    item.previousCostPerPlate,
                                  ) > 0
                                    ? ` · Previous ₹${Number(item.previousCostPerPlate).toFixed(2)}`
                                    : ''}

                                  {item.costChangePercent !== undefined &&
                                  Number(
                                    item.previousCostPerPlate,
                                  ) > 0
                                    ? ` · ${Number(item.costChangePercent) >= 0 ? '+' : ''}${Number(item.costChangePercent).toFixed(1)}%`
                                    : ''}
                                </small>

                                <p>
                                  {hardBlocked
                                    ? item.coverageReason ||
                                      'Recipe QA must be corrected.'
                                    : item.accuracyRisk ===
                                        'HIGH'
                                      ? item.accuracyReason ||
                                        'Large cost movement requires approval.'
                                      : item.coverageReason ||
                                        'This cost requires review.'}
                                </p>
                              </div>

                              <div className="cost-approval-actions">
                                {hardBlocked ? (
                                  <button
                                    className="secondary-button"
                                    type="button"
                                    onClick={() => {
                                      setManualRateIds(
                                        (current) => {
                                          const next =
                                            new Set(
                                              current,
                                            );

                                          next.add(
                                            item.id,
                                          );

                                          return next;
                                        },
                                      );
                                    }}
                                  >
                                    Enter Manual Rate
                                  </button>
                                ) : approved ? (
                                  <span className="cost-approved-pill">
                                    ✓ Approved
                                  </span>
                                ) : (
                                  <button
                                    className="primary-button"
                                    type="button"
                                    onClick={() => {
                                      setDetectionPreview(
                                        (current) =>
                                          current
                                            ? {
                                                ...current,

                                                menu:
                                                  current.menu.map(
                                                    (
                                                      menuItem,
                                                    ) =>
                                                      menuItem.id ===
                                                      item.id
                                                        ? {
                                                            ...menuItem,

                                                            costApprovalStatus:
                                                              'APPROVED',

                                                            costApprovedAt:
                                                              new Date().toISOString(),

                                                            costApprovalReason:
                                                              'User explicitly accepted reviewed cost',
                                                          }
                                                        : menuItem,
                                                  ),
                                              }
                                            : current,
                                      );
                                    }}
                                  >
                                    Accept Current Cost
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        },
                      )}
                    </div>
                  ) : (
                    <p className="cost-approval-clear">
                      ✓ No selected dish requires manual cost approval.
                    </p>
                  )}

                  {pendingCostApprovalItems.length > 1 &&
                  !hardBlockedCostItems.length ? (
                    <button
                      className="secondary-button cost-approve-all"
                      type="button"
                      onClick={() => {
                        const pendingIds =
                          new Set(
                            pendingCostApprovalItems.map(
                              (item) =>
                                item.id,
                            ),
                          );

                        setDetectionPreview(
                          (current) =>
                            current
                              ? {
                                  ...current,

                                  menu:
                                    current.menu.map(
                                      (item) =>
                                        pendingIds.has(
                                          item.id,
                                        )
                                          ? {
                                              ...item,

                                              costApprovalStatus:
                                                'APPROVED',

                                              costApprovedAt:
                                                new Date().toISOString(),

                                              costApprovalReason:
                                                'User bulk-approved reviewed costs',
                                            }
                                          : item,
                                    ),
                                }
                              : current,
                        );
                      }}
                    >
                      Approve All Review Costs
                    </button>
                  ) : null}
                </div>

                <div className="menu-preview-groups">
                  {!detectionPreviewGroups.length ? (
                    <div className="menu-detection-filter-empty">
                      <b>
                        {detectionSearch
                          ? 'No dishes match your search'
                          : detectionReviewFilter ===
                              'PROBLEMS'
                            ? 'No problems left'
                            : 'Nothing in this view'}
                      </b>

                      <span>
                        {detectionSearch
                          ? `No detected dish matches “${detectionSearch}”.`
                          : detectionReviewFilter ===
                              'PROBLEMS'
                            ? 'Every detected dish in this menu is currently resolved.'
                            : 'Try another review filter.'}
                      </span>

                      {detectionSearch ? (
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() =>
                            setDetectionSearch(
                              '',
                            )
                          }
                        >
                          Clear Search
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  {detectionPreviewGroups.map((group) => {
                    const allGroupItems =
                      detectionReviewItems.filter(
                        (item) =>
                          detectionGroupKeyForItem(
                            item,
                          ) ===
                          group.key,
                      );

                    const groupProblemCount =
                      allGroupItems.filter(
                        detectionHasProblem,
                      ).length;

                    const groupReviewedCount =
                      allGroupItems.length -
                      groupProblemCount;

                    const groupReviewPercent =
                      allGroupItems.length
                        ? Math.round(
                            (
                              groupReviewedCount /
                              allGroupItems.length
                            ) *
                              100,
                          )
                        : 100;

                    const groupContainsActiveProblem =
                      group.items.some(
                        (item) =>
                          item.id ===
                          activeDetectionProblemId,
                      );

                    const selectedInGroup =
                      allGroupItems.filter(
                        (item) =>
                          selectedPreviewIds.has(
                            item.id,
                          ),
                      ).length;

                    return (
                      <details
                        className="menu-preview-group"
                        key={group.key}
                        open
                      >
                        <summary>
                          <div className="menu-preview-group-copy">
                            <b>
                              {[group.dayLabel, group.mealLabel]
                                .filter(Boolean)
                                .join(' • ')}
                            </b>

                            <span>
                              {group.servicePax > 0
                                ? `${group.servicePax} members • `
                                : ''}

                              {selectedInGroup}/
                              {allGroupItems.length}
                              {' '}selected

                              {groupProblemCount > 0
                                ? ` • ${groupProblemCount} need attention`
                                : ' • ready'}
                            </span>
                          </div>

                          <div
                            className={`menu-preview-group-health ${
                              groupProblemCount > 0
                                ? 'attention'
                                : 'complete'
                            }`}
                          >
                            <b>
                              {groupReviewPercent}%
                            </b>

                            <span>
                              <i
                                style={{
                                  width:
                                    `${groupReviewPercent}%`,
                                }}
                              />
                            </span>

                            <small>
                              reviewed
                            </small>
                          </div>

                          <span
                            className="menu-preview-group-arrow"
                            aria-hidden="true"
                          >
                            ⌄
                          </span>
                        </summary>

                        <div className="menu-preview-items">
                          {group.items.map((item) => {
                            const isSelected =
                              selectedPreviewIds.has(
                                item.id,
                              );

                            return (
                              <div
                                id={`detected-dish-${item.id}`}
                                tabIndex={-1}
                                className={`menu-preview-item ${isSelected ? 'is-selected' : ''} ${manualRateIds.has(item.id) ? 'needs-manual-rate' : ''} ${item.coverageStatus === 'REJECTED' ? 'is-rejected' : ''} ${detectionNeedsReview(item) ? 'needs-review' : ''} ${Number(item.costPerPlate) > 0 ? 'has-cost' : 'missing-cost'} ${activeDetectionProblemId === item.id ? 'is-active-problem' : ''}`}
                                key={item.id}
                              >
                                <label className="menu-preview-selector" aria-label={`Select ${item.name}`}>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    disabled={
                                      item.coverageStatus ===
                                      'REJECTED'
                                    }
                                    onChange={(event) => {
                                      const nextIds =
                                        new Set(
                                          selectedPreviewIds,
                                        );

                                      if (event.target.checked) {
                                        nextIds.add(item.id);
                                      } else {
                                        nextIds.delete(item.id);
                                      }

                                      setSelectedPreviewIds(
                                        nextIds,
                                      );
                                      setError('');
                                    }}
                                  />
                                  <span className="menu-preview-checkbox" aria-hidden="true">✓</span>
                                </label>
                                <div>
                                  <div className="menu-detection-title-row">
                                    <b>
                                      {
                                        item.name
                                      }
                                    </b>

                                    <div className="menu-detection-item-actions">
                                      {detectionNeedsReview(
                                        item,
                                      ) &&
                                      item.coverageStatus !==
                                        'REJECTED' ? (
                                        <button
                                          type="button"
                                          className="confirm"
                                          onClick={() =>
                                            confirmDetectedDish(
                                              item,
                                            )
                                          }
                                        >
                                          ✓ Looks correct
                                        </button>
                                      ) : null}

                                      <button
                                        type="button"
                                        onClick={() =>
                                          beginDetectionEdit(
                                            item,
                                          )
                                        }
                                        disabled={
                                          item.coverageStatus ===
                                          'REJECTED'
                                        }
                                      >
                                        Fix
                                      </button>

                                      <button
                                        type="button"
                                        className={
                                          item.coverageStatus ===
                                          'REJECTED'
                                            ? 'restore'
                                            : 'reject'
                                        }
                                        onClick={() =>
                                          toggleDetectedDishRejection(
                                            item,
                                          )
                                        }
                                      >
                                        {item.coverageStatus ===
                                        'REJECTED'
                                          ? 'Restore'
                                          : 'Not a dish'}
                                      </button>
                                    </div>
                                  </div>

                                  {editingDetectionId ===
                                  item.id ? (
                                    <div className="menu-detection-edit-form">
                                      <input
                                        className="input"
                                        value={
                                          editDetectionName
                                        }
                                        onChange={(event) =>
                                          setEditDetectionName(
                                            event.target
                                              .value,
                                          )
                                        }
                                        aria-label={`Correct name for ${item.name}`}
                                      />

                                      <select
                                        className="select"
                                        value={
                                          editDetectionCategory
                                        }
                                        onChange={(event) =>
                                          setEditDetectionCategory(
                                            event.target
                                              .value as Category,
                                          )
                                        }
                                      >
                                        {CATEGORIES.map(
                                          (
                                            category,
                                          ) => (
                                            <option
                                              key={
                                                category
                                              }
                                              value={
                                                category
                                              }
                                            >
                                              {
                                                category
                                              }
                                            </option>
                                          ),
                                        )}
                                      </select>

                                      <div>
                                        <button
                                          type="button"
                                          className="primary-button"
                                          onClick={() =>
                                            saveDetectionEdit(
                                              item.id,
                                            )
                                          }
                                        >
                                          Save Correction
                                        </button>

                                        <button
                                          type="button"
                                          className="ghost-button"
                                          onClick={
                                            cancelDetectionEdit
                                          }
                                        >
                                          Cancel
                                        </button>
                                      </div>

                                      <small>
                                        Changing the dish clears its old cost so a price from the wrong dish cannot be reused.
                                      </small>
                                    </div>
                                  ) : null}

                                  <div className="menu-detection-inline-meta">
                                    <label className="menu-quick-category">
                                      <span>
                                        Category
                                      </span>

                                      <select
                                        value={
                                          item.category
                                        }
                                        disabled={
                                          item.coverageStatus ===
                                            'REJECTED' ||
                                          recostingDishIds.has(
                                            item.id,
                                          )
                                        }
                                        onChange={(event) =>
                                          quickChangeDetectionCategory(
                                            item,
                                            event.target
                                              .value as Category,
                                          )
                                        }
                                        aria-label={`Category for ${item.name}`}
                                      >
                                        {CATEGORIES.map(
                                          (
                                            category,
                                          ) => (
                                            <option
                                              key={
                                                category
                                              }
                                              value={
                                                category
                                              }
                                            >
                                              {
                                                category
                                              }
                                            </option>
                                          ),
                                        )}
                                      </select>
                                    </label>

                                    <small>
                                      {recostingDishIds.has(
                                        item.id,
                                      )
                                        ? 'Re-costing…'
                                        : item.costSource ===
                                            'ai_recipe'
                                          ? 'AI recipe estimate'
                                          : item.costSource ===
                                              'catalog'
                                            ? 'Dish Master cost'
                                            : item.costSource ===
                                                'catalog_recipe'
                                              ? 'Recipe cost'
                                              : item.costSource ===
                                                  'category_estimate'
                                                ? 'Category estimate'
                                                : 'Cost review'}
                                    </small>
                                  </div>

                                  <div className="menu-detection-badges">
                                    <span
                                      className={`menu-detection-source ${item.detectionSource || 'rules'}`}
                                      title={
                                        item.detectionReason ||
                                        ''
                                      }
                                    >
                                      {item.detectionSource ===
                                      'catalog'
                                        ? '✓ Catalog'
                                        : item.detectionSource ===
                                            'consensus'
                                          ? '✓ AI + Rules'
                                          : item.detectionSource ===
                                              'ai'
                                            ? 'AI'
                                            : item.detectionSource ===
                                                'manual'
                                              ? '✓ User Corrected'
                                              : 'Rules'}
                                    </span>

                                    <span
                                      className={`menu-detection-confidence ${
                                        normalizedDetectionConfidence(
                                          item,
                                        ) >= 90
                                          ? 'high'
                                          : normalizedDetectionConfidence(
                                                item,
                                              ) >= 75
                                            ? 'good'
                                            : 'review'
                                      }`}
                                      title={
                                        item.detectionReason ||
                                        'Detection confidence'
                                      }
                                    >
                                      {
                                        normalizedDetectionConfidence(
                                          item,
                                        )
                                      }
                                      % detection
                                    </span>

                                    {detectionNeedsReview(
                                      item,
                                    ) ? (
                                      <span className="menu-detection-review-badge">
                                        Review
                                      </span>
                                    ) : null}
                                  </div>

                                  {item.detectionReason ? (
                                    <details className="menu-detection-reason-details">
                                      <summary>
                                        Why was this detected?
                                      </summary>

                                      <small className="menu-detection-reason">
                                        {
                                          item.detectionReason
                                        }
                                      </small>
                                    </details>
                                  ) : null}

                                  {item.ingredientCostDrivers?.length ? (
                                    <details className="dish-cost-driver-details">
                                      <summary>
                                        View cost drivers
                                      </summary>

                                      <div className="dish-cost-driver-list">
                                        {item.ingredientCostDrivers.map(
                                          (driver) => (
                                            <div
                                              className="dish-cost-driver-row"
                                              key={`${item.id}-${dishNameKey(driver.name)}-${driver.rateUnit}`}
                                            >
                                              <div>
                                                <strong>
                                                  {driver.name}
                                                </strong>

                                                <small>
                                                  {driver.quantity}
                                                  {' '}
                                                  {driver.unit}
                                                  {' × ₹'}
                                                  {driver.rate.toFixed(
                                                    2,
                                                  )}
                                                  /
                                                  {driver.rateUnit}
                                                </small>

                                                <small>
                                                  Rate source:{' '}
                                                  {driver.rateSource.replaceAll(
                                                    '_',
                                                    ' ',
                                                  )}
                                                </small>
                                              </div>

                                              <div>
                                                <b>
                                                  ₹
                                                  {driver.finalCostPerPlate.toFixed(
                                                    2,
                                                  )}
                                                </b>

                                                <small>
                                                  {driver.contributionPercent.toFixed(
                                                    1,
                                                  )}
                                                  % of dish
                                                </small>

                                                {driver.direction ===
                                                  'UP' ? (
                                                  <span className="driver-change-up">
                                                    +₹
                                                    {Math.abs(
                                                      driver.changePerPlate,
                                                    ).toFixed(
                                                      2,
                                                    )}
                                                  </span>
                                                ) : driver.direction ===
                                                  'DOWN' ? (
                                                  <span className="driver-change-down">
                                                    -₹
                                                    {Math.abs(
                                                      driver.changePerPlate,
                                                    ).toFixed(
                                                      2,
                                                    )}
                                                  </span>
                                                ) : null}
                                              </div>
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    </details>
                                  ) : null}

                                  {item.costApprovalStatus ===
                                  'APPROVED' ? (
                                    <span className="menu-cost-approved-badge">
                                      ✓ Cost approved
                                    </span>
                                  ) : requiresCostApproval(
                                      item,
                                    ) ? (
                                    <span className="menu-cost-pending-badge">
                                      ⚠ Approval pending
                                    </span>
                                  ) : null}

                                  {item.accuracyRisk &&
                                  item.accuracyRisk !==
                                    'NEW_BASELINE' ? (
                                    <span
                                      className={`menu-accuracy-badge ${item.accuracyRisk.toLowerCase()}`}
                                      title={
                                        item.accuracyReason ||
                                        ''
                                      }
                                    >
                                      {item.accuracyRisk === 'HIGH'
                                        ? '⚠ Cost jump'
                                        : item.accuracyRisk === 'WATCH'
                                          ? '◷ Cost changed'
                                          : '✓ Cost stable'}

                                      {item.costChangePercent !== undefined
                                        ? ` · ${Number(item.costChangePercent) >= 0 ? '+' : ''}${Number(item.costChangePercent).toFixed(1)}%`
                                        : ''}
                                    </span>
                                  ) : null}

                                  <span
                                    className={`menu-coverage-badge ${getMenuCoverageStatus(
                                      item,
                                      isSelected,
                                    )
                                      .toLowerCase()
                                      .replaceAll(
                                        '_',
                                        '-',
                                      )}`}
                                  >
                                    {menuCoverageStatusLabel(
                                      getMenuCoverageStatus(
                                        item,
                                        isSelected,
                                      ),
                                    )}

                                    {item.costConfidence !== undefined &&
                                    isSelected
                                      ? ` · ${Math.round(item.costConfidence)}%`
                                      : ''}
                                  </span>
                                </div>
                                {manualRateIds.has(item.id) ? (
                                  <label className="menu-preview-rate">
                                    <span>₹</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      inputMode="decimal"
                                      value={item.costPerPlate || ''}
                                      onChange={(event) => {
                                        const rate = Math.max(0, Number(event.target.value) || 0);
                                        setDetectionPreview((current) =>
                                          current
                                            ? {
                                                ...current,
                                                menu: current.menu.map((menuItem) =>
                                                  menuItem.id === item.id
                                                    ? {
                                                        ...menuItem,

                                                        costPerPlate:
                                                          rate,

                                                        costSource:
                                                          rate > 0
                                                            ? 'manual'
                                                            : menuItem.costSource,

                                                        coverageStatus:
                                                          rate > 0
                                                            ? 'COSTED'
                                                            : 'NEW_DISH_PENDING',

                                                        costQualityStatus:
                                                          rate > 0
                                                            ? 'READY'
                                                            : undefined,

                                                        costConfidence:
                                                          rate > 0
                                                            ? 100
                                                            : 0,

                                                        rateCoveragePercent:
                                                          rate > 0
                                                            ? 100
                                                            : 0,

                                                        coverageReason:
                                                          rate > 0
                                                            ? 'Manual rate entered by user'
                                                            : 'Manual rate required',

                                                        costApprovalStatus:
                                                          rate > 0
                                                            ? 'APPROVED'
                                                            : 'PENDING',

                                                        costApprovedAt:
                                                          rate > 0
                                                            ? new Date().toISOString()
                                                            : undefined,

                                                        costApprovalReason:
                                                          rate > 0
                                                            ? 'User manually entered and accepted this rate'
                                                            : 'Manual rate required',
                                                      }
                                                    : menuItem,
                                                ),
                                              }
                                            : current,
                                        );
                                        setError('');
                                      }}
                                      aria-label={`Rate for ${item.name}`}
                                      placeholder="Optional"
                                    />
                                  </label>
                                ) : (
                                  <strong className="menu-preview-cost">
                                    ₹{Number(item.costPerPlate).toFixed(2)}
                                  </strong>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    );
                  })}
                </div>

                <div
                  className={`menu-detection-final-gate ${
                    detectionReviewGateReady
                      ? 'ready'
                      : 'pending'
                  }`}
                >
                  <div className="menu-detection-final-gate-copy">
                    <span>
                      Detection Review Gate
                    </span>

                    <strong>
                      {detectionReviewGateReady
                        ? '✓ Menu detection reviewed'
                        : `${detectionReviewGatePending} review item${detectionReviewGatePending === 1 ? '' : 's'} left`}
                    </strong>

                    <small>
                      {detectionReviewGateReady
                        ? 'All uncertain detections and possible missed source lines have been reviewed.'
                        : `${detectionUnconfirmedCount} uncertain dish${detectionUnconfirmedCount === 1 ? '' : 'es'} · ${detectionPossibleMissedCount} possible missed line${detectionPossibleMissedCount === 1 ? '' : 's'}`}
                    </small>
                  </div>

                  <div className="menu-detection-final-progress">
                    <div>
                      <span
                        style={{
                          width:
                            `${detectionReviewGatePercent}%`,
                        }}
                      />
                    </div>

                    <b>
                      {
                        detectionReviewGatePercent
                      }
                      %
                    </b>
                  </div>

                  {!detectionReviewGateReady ? (
                    <button
                      type="button"
                      className="primary-button"
                      data-menu-next-problem
                      onClick={
                        jumpToNextDetectionProblem
                      }
                    >
                      Review Next Problem

                      <kbd>
                        N
                      </kbd>
                    </button>
                  ) : (
                    <div className="menu-detection-final-ready">
                      Ready to save
                    </div>
                  )}
                </div>

                {previewDuplicateCount > 0 ? (
                  <div className="menu-preview-duplicate-note">
                    <b>{previewDuplicateCount} duplicate {previewDuplicateCount === 1 ? 'dish' : 'dishes'} found</b>
                    <p>Merge mode will keep the existing version and skip these duplicates.</p>
                  </div>
                ) : null}

                <div className="menu-preview-actions">
                  <div>
                    <b>Ready to save {selectedPreviewMenu.length} dishes?</b>
                    <span>
                      {work.menu.length > 0
                        ? `Your current menu contains ${work.menu.length} dishes.`
                        : 'This will create your event menu.'}
                    </span>
                  </div>
                  {work.menu.length > 0 ? (
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() =>
                        applyDetectionPreview(
                          'merge',
                        )
                      }
                      disabled={!selectedPreviewMenu.length || !detectionReviewGateReady}
                    >
                      Merge with Current
                    </button>
                  ) : null}
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() =>
                      applyDetectionPreview(
                        'replace',
                      )
                    }
                    disabled={!selectedPreviewMenu.length || !detectionReviewGateReady}
                  >
                    Use This Menu
                  </button>
                  <button
                    className="menu-preview-cancel"
                    type="button"
                    onClick={() => {
                      setDetectionPreview(null);
                      setSelectedPreviewIds(new Set());
                      setError('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            <div className="action-row event-detect-action">
              <button
                className="primary-button"
                type="button"
                onClick={detectAndNext}
                disabled={detecting || Boolean(uploading) || !work.event.rawMenuText.trim()}
              >
                {detecting
                  ? 'Detecting Dishes...'
                  : detectionPreview
                    ? 'Refresh Detection Preview'
                    : `Detect & Add Function${menuLines > 0 ? ` • ${menuLines} lines` : ''}`}
              </button>
            </div>
          </div>
        </div>
      </section>
            <FreeLimitPaywall
          open={freeLimitBlocked}
          onClose={() => setFreeLimitBlocked(false)}
        />

</AppShell>
  );
}
