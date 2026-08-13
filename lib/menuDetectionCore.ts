export type TenantDishAliasRule = {
  aliasName: string;
  canonicalName: string;
  category: string;

  action:
    | 'MAP'
    | 'REJECT';

  usageCount: number;
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

export function sourceDishCoverageKey(
  item: {
    name: string;
    dayLabel?: string;
    mealLabel?: string;
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
      sourceLine.includes(
        dish,
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
      /[●▪◦◆◇■□✓✔]/g,
    ) || [];

  normalizedArtifacts +=
    bulletMatches.length;

  text = text.replace(
    /[●▪◦◆◇■□✓✔]/g,
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
          .replace(
            /\s*\|\s*/g,
            ' | ',
          )
          .replace(
            /^\s*[●▪◦◆◇■□✓✔]\s*/u,
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
