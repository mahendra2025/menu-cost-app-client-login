import {
  menuDishModifierKey,
  type MenuDishModifiers,
} from './menuDishModifiers';

export type TenantDishAliasRule = {
  aliasName: string;
  canonicalName: string;
  category: string;

  action:
    | 'MAP'
    | 'REJECT';

  usageCount: number;

  scope?:
    | 'TENANT'
    | 'GLOBAL';
};

export function dishNameKey(
  value: string,
) {
  return String(
    value || '',
  )
    .toLowerCase()
    .normalize('NFKD')
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

export function isQuotationMetadataLine(
  value: string,
) {
  const raw =
    String(value || '')
      .normalize('NFKC')
      .replace(
        /[\u200B-\u200D\uFEFF]/g,
        '',
      )
      .replace(/\s+/g, ' ')
      .trim();

  if (!raw) {
    return true;
  }

  const normalized =
    dishNameKey(raw);

  if (
    /^(?:quotation|catering quotation|quotation note|quotation notes|quote|estimate|proposal|invoice|bill|client location|included menu|included menu items|rate per plate|guest count|total quotation|commercial summary|price summary|terms and conditions)(?:\b|$)/i.test(
      normalized,
    )
  ) {
    return true;
  }

  if (
    /^premium vegetarian cater(?:er|ers|ing)(?:\b|$)/i.test(
      normalized,
    ) ||
    /^premium vegetarian catering package(?:\b|$)/i.test(
      normalized,
    )
  ) {
    return true;
  }

  if (
    /\bquotation is based on\b/i.test(
      normalized,
    ) ||
    (
      /\bchanges? in menu\b/i.test(
        normalized,
      ) &&
      /\bfinal amount\b/i.test(
        normalized,
      )
    )
  ) {
    return true;
  }

  const moneyMatches =
    raw.match(
      /(?:₹|rs\.?|inr)\s*[\d,]+(?:\.\d+)?/gi,
    ) || [];

  if (
    moneyMatches.length >= 2
  ) {
    return true;
  }

  if (
    /\brate per plate\b/i.test(
      normalized,
    ) &&
    (
      /\bguest count\b/i.test(
        normalized,
      ) ||
      /\btotal quotation\b/i.test(
        normalized,
      )
    )
  ) {
    return true;
  }

  return false;
}

export function inferMenuDishCategory(
  value: string,
  sectionHeading = '',
): string | undefined {
  const dish =
    dishNameKey(value);
  const section =
    dishNameKey(
      sectionHeading,
    );

  if (!dish) {
    return undefined;
  }

  const has = (
    pattern: RegExp,
  ) => pattern.test(dish);

  const isFarsan =
    has(
      /\b(?:samosa|kachori|khaman|dhokla|khandvi|patra|fafda|ganthia|gathiya|muthiya|handvo|dal vada|mirchi vada|sev khamani|farsan|namkeen)\b/i,
    );

  if (
    section ===
      'farsan and starters' ||
    section ===
      'farsan starters'
  ) {
    return isFarsan
      ? 'Farsan'
      : 'Starter';
  }

  if (
    section ===
      'dal and rice' ||
    section ===
      'rice and dal'
  ) {
    if (
      has(
        /\b(?:dal|daal|kadhi|kadi)\b/i,
      )
    ) {
      return 'Dal / Kadhi';
    }

    if (
      has(
        /\b(?:rice|pulao|pulav|biryani|khichdi|khichadi)\b/i,
      )
    ) {
      return 'Rice';
    }
  }

  if (
    section ===
      'accompaniments' ||
    section ===
      'accompaniment' ||
    section ===
      'side accompaniments' ||
    section ===
      'side items' ||
    section ===
      'sides'
  ) {
    if (
      has(
        /\bpapad\b/i,
      )
    ) {
      return 'Papad';
    }

    if (
      has(
        /\b(?:achar|achaar|pickle|pickles)\b/i,
      )
    ) {
      return 'Pickle';
    }

    if (
      has(
        /\b(?:kachumber|salad)\b/i,
      )
    ) {
      return 'Salad';
    }

    if (
      has(
        /\braita\b/i,
      )
    ) {
      return 'Raita';
    }

    if (
      has(
        /\bmukhwas\b/i,
      )
    ) {
      return 'Mukhwas';
    }

    if (
      has(
        /\b(?:paan|pan)\b/i,
      )
    ) {
      return 'Paan';
    }

    return 'Condiments';
  }

  if (
    has(
      /\b(?:water bottle|mineral water|packaged water|drinking water|tea|coffee)\b/i,
    )
  ) {
    return 'Beverage';
  }

  if (
    has(
      /\b(?:soup|shorba)\b/i,
    )
  ) {
    return 'Soup';
  }

  if (
    has(
      /\b(?:ice cream|icecream|kulfi)\b/i,
    )
  ) {
    return 'Ice Cream';
  }

  if (
    has(
      /\b(?:rabdi|rabri|rasmalai|gulab jamun|jamun|halwa|katli|barfi|burfi|ladoo|laddu|jalebi|kheer|basundi|malpua|pedha|peda|sweet)\b/i,
    )
  ) {
    return 'Sweet';
  }

  if (
    has(
      /\b(?:roti|puri|poori|naan|nan|paratha|parantha|kulcha|bhakri|thepla|phulka|chapati|bread)\b/i,
    )
  ) {
    return 'Bread';
  }

  if (
    has(
      /\b(?:dal|daal|kadhi|kadi)\b/i,
    )
  ) {
    return 'Dal / Kadhi';
  }

  if (
    has(
      /\b(?:rice|pulao|pulav|biryani|khichdi|khichadi)\b/i,
    )
  ) {
    return 'Rice';
  }

  if (
    has(
      /\bpapad\b/i,
    )
  ) {
    return 'Papad';
  }

  if (
    has(
      /\b(?:achar|achaar|pickle|pickles)\b/i,
    )
  ) {
    return 'Pickle';
  }

  if (
    has(
      /\b(?:kachumber|salad)\b/i,
    )
  ) {
    return 'Salad';
  }

  if (
    has(
      /\braita\b/i,
    )
  ) {
    return 'Raita';
  }

  if (
    isFarsan
  ) {
    return 'Farsan';
  }

  if (
    has(
      /\b(?:pani puri|dahi puri|sev puri|bhel|chaat|chat|aloo tikki|raj kachori|dahi bhalla)\b/i,
    )
  ) {
    return 'Chaat';
  }

  if (
    has(
      /\bpaneer\b/i,
    )
  ) {
    if (
      /\b(?:starter|starters|snack|snacks)\b/i.test(
        section,
      )
    ) {
      return 'Starter';
    }

    return 'Paneer';
  }

  if (
    has(
      /\b(?:mix veg|mixed veg|mix vegetable|mixed vegetable|vegetable|sabji|sabzi|bharta)\b/i,
    )
  ) {
    return 'Sabji';
  }

  if (
    /\b(?:starter|starters)\b/i.test(
      section,
    )
  ) {
    return 'Starter';
  }

  if (
    section ===
      'main course' ||
    section ===
      'main courses'
  ) {
    return 'Main Course';
  }

  return undefined;
}


export type MenuSourceIntelligence = {
  nonEmptyLineCount: number;
  sectionHeadings: string[];
  ignoredMetadataLines: string[];
  guestCount?: number;
  ratePerPlate?: number;
  totalQuotation?: number;
  commercialCheck:
    | 'MATCH'
    | 'MISMATCH'
    | 'UNKNOWN';
  expectedQuotation?: number;
};

const INTELLIGENCE_SECTION_LABELS:
  Record<string, string> = {
    soup: 'Soup',
    soups: 'Soup',
    sweet: 'Sweet',
    sweets: 'Sweet',
    dessert: 'Dessert',
    desserts: 'Dessert',
    starter: 'Starter',
    starters: 'Starter',
    farsan: 'Farsan',
    'farsan starters':
      'Farsan & Starters',
    'farsan and starters':
      'Farsan & Starters',
    'indian bread':
      'Indian Breads',
    'indian breads':
      'Indian Breads',
    bread: 'Breads',
    breads: 'Breads',
    'main course':
      'Main Course',
    'main courses':
      'Main Course',
    'dal rice':
      'Dal & Rice',
    'dal and rice':
      'Dal & Rice',
    'rice dal':
      'Dal & Rice',
    'rice and dal':
      'Dal & Rice',
    accompaniment:
      'Accompaniments',
    accompaniments:
      'Accompaniments',
    'side accompaniments':
      'Accompaniments',
    beverage: 'Beverage',
    beverages: 'Beverage',
    'welcome drink':
      'Welcome Drink',
    'welcome drinks':
      'Welcome Drink',
    mocktail: 'Mocktail',
    mocktails: 'Mocktail',
    salad: 'Salad',
    salads: 'Salad',
    chaat: 'Chaat',
    chinese: 'Chinese',
    italian: 'Italian',
    'south indian':
      'South Indian',
    fruit: 'Fruit',
    fruits: 'Fruit',
    'ice cream':
      'Ice Cream',
    mukhwas: 'Mukhwas',
  };

function intelligenceNumber(
  value: string,
) {
  const number =
    Number(
      String(value || '')
        .replace(/,/g, '')
        .trim(),
    );

  return Number.isFinite(
    number,
  )
    ? number
    : 0;
}

function moneyValuesFromLine(
  line: string,
) {
  const explicit =
    Array.from(
      String(line || '')
        .matchAll(
          /(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)/gi,
        ),
    )
      .map(
        (match) =>
          intelligenceNumber(
            match[1],
          ),
      )
      .filter(
        (value) =>
          value > 0,
      );

  return explicit;
}

export function analyzeMenuSourceIntelligence(
  menuText: string,
): MenuSourceIntelligence {
  const lines =
    String(menuText || '')
      .normalize('NFKC')
      .replace(
        /[\u200B-\u200D\uFEFF]/g,
        '',
      )
      .split(/\r?\n/)
      .map(
        (line) =>
          line
            .replace(
              /^[\s•●▪►*\-–—]+/,
              '',
            )
            .replace(
              /\s+/g,
              ' ',
            )
            .trim(),
      )
      .filter(Boolean);

  const sectionHeadings =
    Array.from(
      new Map(
        lines
          .map(
            (line) => {
              const key =
                dishNameKey(
                  line
                    .replace(
                      /[:\-–—]+$/,
                      '',
                    ),
                );

              const label =
                INTELLIGENCE_SECTION_LABELS[
                  key
                ];

              return label
                ? [
                    label.toLowerCase(),
                    label,
                  ] as const
                : null;
            },
          )
          .filter(
            (
              value,
            ): value is
              readonly [
                string,
                string,
              ] =>
              Boolean(value),
          ),
      ).values(),
    );

  const ignoredMetadataLines =
    lines.filter(
      (line) =>
        isQuotationMetadataLine(
          line,
        ),
    );

  let guestCount:
    number | undefined;

  for (const line of lines) {
    const labeled =
      line.match(
        /^(?:pax|guests?|members?|persons?|people)\s*[:=-]?\s*([\d,]{1,9})\b/i,
      );

    const trailing =
      line.match(
        /\b([\d,]{1,9})\s*(?:pax|guests?|members?|persons?|people)\b/i,
      );

    const count =
      intelligenceNumber(
        labeled?.[1] ||
        trailing?.[1] ||
        '',
      );

    if (
      count > 0 &&
      (
        !guestCount ||
        count > guestCount
      )
    ) {
      guestCount =
        Math.round(
          count,
        );
    }
  }

  let ratePerPlate:
    number | undefined;

  let totalQuotation:
    number | undefined;

  for (const line of lines) {
    const normalized =
      dishNameKey(
        line,
      );

    if (
      /\brate per plate\b/i.test(
        normalized,
      )
    ) {
      const rateMatch =
        line.match(
          /(?:rate per plate|per plate)\s*[:=-]?\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)/i,
        );

      const value =
        intelligenceNumber(
          rateMatch?.[1] ||
          '',
        );

      if (value > 0) {
        ratePerPlate =
          value;
      }
    }

    if (
      /\b(?:total quotation|quotation total|grand total|total amount)\b/i.test(
        normalized,
      )
    ) {
      const totalMatch =
        line.match(
          /(?:total quotation|quotation total|grand total|total amount)\s*[:=-]?\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)/i,
        );

      const value =
        intelligenceNumber(
          totalMatch?.[1] ||
          '',
        );

      if (value > 0) {
        totalQuotation =
          value;
      }
    }
  }

  /*
   * Many quotation PDFs render the labels in
   * one row and the values in another row:
   *
   * Rate per plate | Guest count | Total quotation
   * Rs. 340        | 1,000       | Rs. 3,40,000
   *
   * When that commercial header is present,
   * infer the smallest money value as the
   * per-plate rate and the largest as total.
   */
  const hasCommercialSummary =
    lines.some(
      (line) => {
        const normalized =
          dishNameKey(
            line,
          );

        return (
          /\brate per plate\b/i.test(
            normalized,
          ) &&
          (
            /\bguest count\b/i.test(
              normalized,
            ) ||
            /\btotal quotation\b/i.test(
              normalized,
            )
          )
        );
      },
    );

  if (hasCommercialSummary) {
    const moneyValues =
      lines
        .flatMap(
          moneyValuesFromLine,
        )
        .filter(
          (value) =>
            value > 0,
        )
        .sort(
          (left, right) =>
            left - right,
        );

    if (
      !ratePerPlate &&
      moneyValues.length
    ) {
      ratePerPlate =
        moneyValues[0];
    }

    if (
      !totalQuotation &&
      moneyValues.length >= 2
    ) {
      totalQuotation =
        moneyValues[
          moneyValues.length -
          1
        ];
    }

    if (!guestCount) {
      const summaryIndex =
        lines.findIndex(
          (line) => {
            const normalized =
              dishNameKey(
                line,
              );

            return (
              /\brate per plate\b/i.test(
                normalized,
              ) &&
              /\bguest count\b/i.test(
                normalized,
              )
            );
          },
        );

      if (summaryIndex >= 0) {
        const nearby =
          lines.slice(
            summaryIndex + 1,
            summaryIndex + 5,
          );

        const candidateCounts =
          nearby
            .flatMap(
              (line) =>
                Array.from(
                  line.matchAll(
                    /\b([\d,]{2,9})\b/g,
                  ),
                ),
            )
            .map(
              (match) =>
                intelligenceNumber(
                  match[1],
                ),
            )
            .filter(
              (value) =>
                Number.isInteger(
                  value,
                ) &&
                value >= 10 &&
                value <=
                  1_000_000,
            )
            .filter(
              (value) =>
                value !==
                ratePerPlate &&
                value !==
                totalQuotation,
            );

        if (
          candidateCounts.length
        ) {
          guestCount =
            candidateCounts[0];
        }
      }
    }
  }

  const expectedQuotation =
    guestCount &&
    ratePerPlate
      ? Math.round(
          guestCount *
          ratePerPlate *
          100,
        ) / 100
      : undefined;

  let commercialCheck:
    MenuSourceIntelligence[
      'commercialCheck'
    ] =
      'UNKNOWN';

  if (
    expectedQuotation !==
      undefined &&
    totalQuotation !==
      undefined
  ) {
    const tolerance =
      Math.max(
        1,
        expectedQuotation *
          0.005,
      );

    commercialCheck =
      Math.abs(
        expectedQuotation -
        totalQuotation,
      ) <= tolerance
        ? 'MATCH'
        : 'MISMATCH';
  }

  return {
    nonEmptyLineCount:
      lines.length,
    sectionHeadings,
    ignoredMetadataLines,
    guestCount,
    ratePerPlate,
    totalQuotation,
    commercialCheck,
    expectedQuotation,
  };
}

export function sourceDishCoverageKey(
  item: {
    name: string;
    dayLabel?: string;
    mealLabel?: string;
    dishModifiers?:
      MenuDishModifiers;
  },
) {
  return [
    dishNameKey(
      item.dayLabel ||
      'event',
    ),

    dishNameKey(
      item.mealLabel ||
      'event menu',
    ),

    dishNameKey(
      item.name,
    ),

    menuDishModifierKey(
      item.dishModifiers,
    ),
  ].join(
    '::',
  );
}

const GENERIC_AI_SINGLE_DISH_WORDS =
  new Set([
    'menu',
    'food',
    'item',
    'items',
    'starter',
    'starters',
    'sweet',
    'sweets',
    'dessert',
    'desserts',
    'drink',
    'drinks',
    'juice',
    'juices',
    'salad',
    'salads',
    'rice',
    'bread',
    'breads',
    'sabji',
    'sabzi',
    'paneer',
    'dal',
    'kadhi',
    'chaat',
    'farsan',
    'mocktail',
    'mocktails',
    'soup',
    'soups',
  ]);

export function tokenWithinOneEdit(
  left: string,
  right: string,
) {
  if (left === right) {
    return true;
  }

  if (
    Math.abs(
      left.length -
      right.length,
    ) > 1
  ) {
    return false;
  }

  /*
   * Never fuzzy-match tiny words.
   */
  if (
    Math.min(
      left.length,
      right.length,
    ) < 5
  ) {
    return false;
  }

  let leftIndex = 0;
  let rightIndex = 0;
  let edits = 0;

  while (
    leftIndex < left.length &&
    rightIndex < right.length
  ) {
    if (
      left[leftIndex] ===
      right[rightIndex]
    ) {
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }

    edits += 1;

    if (edits > 1) {
      return false;
    }

    if (
      left.length >
      right.length
    ) {
      leftIndex += 1;

    } else if (
      right.length >
      left.length
    ) {
      rightIndex += 1;

    } else {
      leftIndex += 1;
      rightIndex += 1;
    }
  }

  if (
    leftIndex < left.length ||
    rightIndex < right.length
  ) {
    edits += 1;
  }

  return edits <= 1;
}

export function getDishSourceEvidenceScore(
  menuText: string,
  dishName: string,
) {
  const dish =
    dishNameKey(
      dishName,
    );

  if (!dish) {
    return 0;
  }

  const dishTokens =
    dish
      .split(' ')
      .filter(Boolean);

  if (!dishTokens.length) {
    return 0;
  }

  /*
   * Generic menu headings cannot become
   * AI-supported dishes.
   */
  if (
    dishTokens.length === 1 &&
    GENERIC_AI_SINGLE_DISH_WORDS.has(
      dishTokens[0],
    )
  ) {
    return 0;
  }

  /*
   * Evidence is line-aware.
   *
   * Never combine dish words from different
   * sections or pages.
   */
  const sourceLines =
    String(menuText || '')
      .normalize('NFKC')
      .replace(
        /[•▪●◦◆◇■□✓✔*]/g,
        '\n',
      )
      .replace(
        /[|;,]+/g,
        '\n',
      )
      .split(/\r?\n/)
      .map(
        (line) =>
          dishNameKey(
            line,
          ),
      )
      .filter(Boolean);

  let bestScore = 0;

  for (
    const sourceLine
    of sourceLines
  ) {
    const lineTokens =
      sourceLine
        .split(' ')
        .filter(Boolean);

    /*
     * Long prose is weak evidence.
     */
    if (
      lineTokens.length > 14
    ) {
      continue;
    }

    if (
      sourceLine === dish
    ) {
      return 100;
    }

    if (
      ` ${sourceLine} `.includes(
        ` ${dish} `,
      )
    ) {
      bestScore =
        Math.max(
          bestScore,
          96,
        );
    }

    let matched = 0;

    for (
      const dishToken
      of dishTokens
    ) {
      const tokenFound =
        lineTokens.some(
          (lineToken) =>
            lineToken ===
              dishToken ||
            tokenWithinOneEdit(
              dishToken,
              lineToken,
            ),
        );

      if (tokenFound) {
        matched += 1;
      }
    }

    const coverage =
      matched /
      dishTokens.length;

    let score = 0;

    if (
      coverage >= 1
    ) {
      score =
        dishTokens.length >= 2
          ? 92
          : 82;

    } else if (
      coverage >= 0.8
    ) {
      score = 84;

    } else if (
      coverage >= 0.66 &&
      dishTokens.length >= 3
    ) {
      score = 68;
    }

    if (
      score > 0 &&
      lineTokens.length <=
        dishTokens.length + 2
    ) {
      score += 5;
    }

    bestScore =
      Math.max(
        bestScore,
        Math.min(
          score,
          100,
        ),
      );
  }

  return bestScore;
}


export type MenuSourceCleanupResult = {
  menuText: string;

  mergedWrappedLines: number;
  normalizedColumns: number;
  normalizedArtifacts: number;
};

type KnownDishMatcher = (
  candidate: string,
) => boolean;

function menuCleanupLineParts(
  line: string,
) {
  const match =
    String(line || '')
      .match(
        /^(\s*(?:(?:[•*-]|\d+[.)])\s*)?)(.*)$/u,
      );

  return {
    prefix:
      match?.[1] || '',

    body:
      (
        match?.[2] ||
        line
      ).trim(),

    hasExplicitPrefix:
      Boolean(
        match?.[1]?.trim(),
      ),
  };
}

/**
 * Clean common OCR / PDF extraction noise
 * before AI + local menu detection.
 *
 * Important:
 * Wrapped lines are merged ONLY when the
 * combined text resolves to a known dish.
 * This prevents ordinary headings or notes
 * from being invented into dishes.
 */
export function cleanupMenuSourceText(
  menuText: string,
  isKnownDish:
    KnownDishMatcher =
      () => false,
): MenuSourceCleanupResult {
  const rawText =
    String(
      menuText ||
      '',
    );

  /*
   * Full-width ｜ becomes normal |
   * during NFKC normalization.
   *
   * Count it before normalization so
   * cleanup telemetry stays accurate.
   */
  const compatibilityPipeMatches =
    rawText.match(
      /｜/g,
    ) || [];

  let normalizedArtifacts =
    compatibilityPipeMatches.length;

  let text =
    rawText.normalize(
      'NFKC',
    );

  let normalizedColumns =
    0;

  let mergedWrappedLines =
    0;

  /*
   * Invisible OCR artifacts.
   */
  const invisibleMatches =
    text.match(
      /[\u200B-\u200D\uFEFF]/g,
    ) || [];

  normalizedArtifacts +=
    invisibleMatches.length;

  text = text.replace(
    /[\u200B-\u200D\uFEFF]/g,
    '',
  );

  /*
   * Non-breaking spaces.
   */
  const nbspMatches =
    text.match(
      /\u00A0/g,
    ) || [];

  normalizedArtifacts +=
    nbspMatches.length;

  text = text.replace(
    /\u00A0/g,
    ' ',
  );

  /*
   * Remove soft hyphens and repair words that
   * OCR/PDF extraction split across a line.
   *
   * Paneer But-\nter Masala
   *
   * becomes:
   *
   * Paneer Butter Masala
   *
   * Requiring a lowercase continuation avoids
   * joining two ordinary menu items.
   */
  const softHyphenMatches =
    text.match(
      /\u00AD/g,
    ) || [];

  normalizedArtifacts +=
    softHyphenMatches.length;

  text = text.replace(
    /\u00AD/g,
    '',
  );

  const wrappedWordMatches =
    text.match(
      /[\p{L}\p{M}]-\s*\n\s*[\p{Ll}\p{M}]/gu,
    ) || [];

  normalizedArtifacts +=
    wrappedWordMatches.length;

  text = text.replace(
    /([\p{L}\p{M}])-\s*\n\s*([\p{Ll}\p{M}])/gu,
    '$1$2',
  );

  /*
   * Normalize line endings / page breaks.
   */
  text = text
    .replace(
      /\r\n?/g,
      '\n',
    )
    .replace(
      /\f+/g,
      '\n',
    );

  /*
   * OCR often produces visually similar
   * vertical separators.
   */
  const oddPipeMatches =
    text.match(
      /[¦｜]/g,
    ) || [];

  normalizedArtifacts +=
    oddPipeMatches.length;

  text = text.replace(
    /[¦｜]/g,
    '|',
  );

  /*
   * Normalize common bullet glyphs.
   */
  const bulletMatches =
    text.match(
      /[●▪◦◆◇■□✓✔☐☑☒·∙]/g,
    ) || [];

  normalizedArtifacts +=
    bulletMatches.length;

  text = text.replace(
    /[●▪◦◆◇■□✓✔☐☑☒·∙]/g,
    '•',
  );

  /*
   * PDF tables commonly become tab-separated
   * columns after extraction.
   */
  const tabGroups =
    text.match(
      /\t+/g,
    ) || [];

  normalizedColumns +=
    tabGroups.length;

  text = text.replace(
    /\t+/g,
    ' | ',
  );

  let lines =
    text.split(
      '\n',
    );

  /*
   * Multiple spaces can represent columns.
   *
   * Only split these when at least two
   * resulting cells are known dishes.
   *
   * Example:
   *
   * Paneer Tikka    Gulab Jamun
   *
   * becomes:
   *
   * Paneer Tikka | Gulab Jamun
   *
   * while:
   *
   * Dinner    300 Pax
   *
   * stays unchanged.
   */
  lines =
    lines.map(
      (line) => {
        const chunks =
          line
            .trim()
            .split(
              /\s{4,}/,
            )
            .map(
              (chunk) =>
                chunk.trim(),
            )
            .filter(Boolean);

        if (
          chunks.length <
          2
        ) {
          return line;
        }

        const knownChunks =
          chunks.filter(
            (chunk) =>
              isKnownDish(
                chunk,
              ),
          );

        if (
          knownChunks.length <
          2
        ) {
          return line;
        }

        normalizedColumns +=
          chunks.length -
          1;

        return chunks.join(
          ' | ',
        );
      },
    );

  /*
   * Keep pipe spacing predictable.
   */
  lines =
    lines.map(
      (line) =>
        line
          /*
           * Printed menus often use dot leaders
           * between an item and its price. Remove
           * the leader and amount so the remaining
           * text can match the Dish Master.
           */
          .replace(
            /\s*(?:\.{2,}|…+|_{2,}|-{3,})\s*(?:(?:₹|rs\.?|inr)\s*)?\d+(?:\.\d+)?\s*(?:\/-)?\s*$/gi,
            '',
          )
          .replace(
            /\s*\|\s*/g,
            ' | ',
          )
          .replace(
            /^\s*[●▪◦◆◇■□✓✔☐☑☒·∙]\s*/u,
            '• ',
          )
          .trimEnd(),
    );

  const output:
    string[] = [];

  /*
   * Conservative wrapped-line repair.
   *
   * Longest known match wins:
   *
   * Paneer
   * Butter
   * Masala
   *
   * → Paneer Butter Masala
   *
   * Separate bullet items are NEVER merged.
   */
  for (
    let index = 0;
    index < lines.length;
  ) {
    const currentLine =
      lines[index];

    if (
      !currentLine.trim()
    ) {
      output.push(
        '',
      );

      index += 1;

      continue;
    }

    const first =
      menuCleanupLineParts(
        currentLine,
      );

    let repaired:
      string | null =
        null;

    let consumed =
      1;

    for (
      const span
      of [
        4,
        3,
        2,
      ]
    ) {
      if (
        index +
        span >
        lines.length
      ) {
        continue;
      }

      const candidateLines =
        lines.slice(
          index,
          index +
          span,
        );

      const parts =
        candidateLines.map(
          menuCleanupLineParts,
        );

      const valid =
        parts.every(
          (
            part,
            partIndex,
          ) => {
            if (
              !part.body ||
              part.body.includes(
                '|',
              ) ||
              part.body.endsWith(
                ':',
              )
            ) {
              return false;
            }

            /*
             * A new bullet/number means a new
             * menu item, never a continuation.
             */
            if (
              partIndex >
                0 &&
              part
                .hasExplicitPrefix
            ) {
              return false;
            }

            const wordCount =
              dishNameKey(
                part.body,
              )
                .split(
                  ' ',
                )
                .filter(
                  Boolean,
                )
                .length;

            return (
              wordCount >
                0 &&
              wordCount <=
                5
            );
          },
        );

      if (!valid) {
        continue;
      }

      const combined =
        parts
          .map(
            (part) =>
              part.body,
          )
          .join(
            ' ',
          )
          .replace(
            /\s+/g,
            ' ',
          )
          .trim();

      /*
       * Do not merge if the first line
       * already represents a complete known
       * dish.
       */
      if (
        isKnownDish(
          first.body,
        )
      ) {
        continue;
      }

      if (
        !isKnownDish(
          combined,
        )
      ) {
        continue;
      }

      repaired =
        first.prefix +
        combined;

      consumed =
        span;

      break;
    }

    if (repaired) {
      output.push(
        repaired,
      );

      mergedWrappedLines +=
        consumed -
        1;

      index +=
        consumed;

      continue;
    }

    output.push(
      currentLine,
    );

    index += 1;
  }

  return {
    menuText:
      output.join(
        '\n',
      ),

    mergedWrappedLines,

    normalizedColumns,

    normalizedArtifacts,
  };
}


export function preprocessMenuTextWithTenantLearning(
  menuText: string,
  rules:
    TenantDishAliasRule[],
) {
  if (!rules.length) {
    return {
      menuText,
      replacements: 0,
    };
  }

  /*
   * API returns newest rules first.
   * First correction wins.
   */
  const mapRules =
    new Map<
      string,
      TenantDishAliasRule
    >();

  for (
    const rule
    of rules
  ) {
    if (
      rule.action !==
        'MAP' ||
      !rule.canonicalName
    ) {
      continue;
    }

    const key =
      dishNameKey(
        rule.aliasName,
      );

    if (
      key &&
      !mapRules.has(
        key,
      )
    ) {
      mapRules.set(
        key,
        rule,
      );
    }
  }

  let replacements = 0;

  const learnedText =
    String(menuText || '')
      .split(/\r?\n/)
      .map(
        (line) => {
          /*
           * Preserve bullets / numbering.
           * Replace only an exact dish line.
           */
          const match =
            line.match(
              /^(\s*(?:(?:[•●▪►*-]|\d+[.)])\s*)?)(.*)$/,
            );

          const prefix =
            match?.[1] ||
            '';

          const body =
            (
              match?.[2] ||
              line
            ).trim();

          if (!body) {
            return line;
          }

          const rule =
            mapRules.get(
              dishNameKey(
                body,
              ),
            );

          if (
            !rule ||
            !rule.canonicalName
          ) {
            return line;
          }

          if (
            dishNameKey(
              body,
            ) ===
            dishNameKey(
              rule.canonicalName,
            )
          ) {
            return line;
          }

          replacements += 1;

          return (
            prefix +
            rule.canonicalName
          );
        },
      )
      .join('\n');

  return {
    menuText:
      learnedText,

    replacements,
  };
}
