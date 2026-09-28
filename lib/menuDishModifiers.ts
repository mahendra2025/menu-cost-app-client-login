export type MenuDishModifierTag =
  | 'JAIN'
  | 'NO_ONION_GARLIC'
  | 'SATVIK'
  | 'VEGAN'
  | 'LIVE';

export type MenuDishModifiers = {
  tags: MenuDishModifierTag[];
  portionQuantity?: number;
  portionUnit?:
    | 'ml'
    | 'ltr'
    | 'gram'
    | 'kg'
    | 'piece';
  pieceWeightGrams?: number;
};

function roundModifierNumber(
  value: number,
) {
  return Math.round(
    value * 100,
  ) / 100;
}

function uniqueTags(
  values:
    MenuDishModifierTag[],
) {
  return Array.from(
    new Set(values),
  );
}

function normalizeSpaces(
  value: string,
) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function hasMenuDishModifiers(
  value:
    | MenuDishModifiers
    | null
    | undefined,
) {
  return Boolean(
    value &&
    (
      value.tags.length ||
      Number(
        value.portionQuantity,
      ) > 0 ||
      Number(
        value.pieceWeightGrams,
      ) > 0
    ),
  );
}

export function mergeMenuDishModifiers(
  ...values:
    Array<
      | MenuDishModifiers
      | null
      | undefined
    >
): MenuDishModifiers | undefined {
  const tags =
    uniqueTags(
      values.flatMap(
        (value) =>
          value?.tags || [],
      ),
    );

  const portion =
    [...values]
      .reverse()
      .find(
        (value) =>
          Number(
            value
              ?.portionQuantity,
          ) > 0 &&
          Boolean(
            value
              ?.portionUnit,
          ),
      );

  const weight =
    [...values]
      .reverse()
      .find(
        (value) =>
          Number(
            value
              ?.pieceWeightGrams,
          ) > 0,
      );

  const merged:
    MenuDishModifiers = {
      tags,
      ...(portion
        ? {
            portionQuantity:
              portion
                .portionQuantity,
            portionUnit:
              portion
                .portionUnit,
          }
        : {}),
      ...(weight
        ? {
            pieceWeightGrams:
              weight
                .pieceWeightGrams,
          }
        : {}),
    };

  return hasMenuDishModifiers(
    merged,
  )
    ? merged
    : undefined;
}

export function extractMenuDishModifiers(
  value: string,
) {
  const original =
    normalizeSpaces(value);

  let cleanText =
    original;

  const tags:
    MenuDishModifierTag[] =
      [];

  const tagRules:
    Array<{
      tag:
        MenuDishModifierTag;
      pattern: RegExp;
    }> = [
      {
        tag: 'NO_ONION_GARLIC',
        pattern:
          /\b(?:no|without)\s+onion\s*(?:&|and|\/|\+)?\s*(?:no\s+)?garlic\b|\bno\s+onion\s+no\s+garlic\b|\bwithout\s+onion\s*(?:&|and|\/|\+)?\s*garlic\b|बिना\s*(?:प्याज|प्याज़)\s*(?:और|व)\s*लहसुन|ડુંગળી\s*(?:અને|&)\s*લસણ\s*વગર/giu,
      },
      {
        tag: 'JAIN',
        pattern:
          /\bjain\b|\bजैन\b|\bજૈન\b/giu,
      },
      {
        tag: 'SATVIK',
        pattern:
          /\b(?:satvik|sattvik|satvic)\b|\bसात्विक\b|\bસાત્વિક\b/giu,
      },
      {
        tag: 'VEGAN',
        pattern:
          /\bvegan\b|\bवीगन\b|\bવેગન\b/giu,
      },
      {
        tag: 'LIVE',
        pattern:
          /\blive(?:\s+counter)?\b/giu,
      },
    ];

  for (
    const rule
    of tagRules
  ) {
    if (
      rule.pattern.test(
        cleanText,
      )
    ) {
      tags.push(
        rule.tag,
      );

      rule.pattern.lastIndex =
        0;

      cleanText =
        cleanText.replace(
          rule.pattern,
          ' ',
        );
    }

    rule.pattern.lastIndex =
      0;
  }

  let pieceWeightGrams:
    number | undefined;

  const pieceWeightMatch =
    original.match(
      /\b(\d+(?:\.\d+)?)\s*(?:g|gm|gms|gram|grams)\s*(?:each|\/\s*(?:pc|pcs|piece|pieces)|per\s+(?:pc|piece))\b/i,
    ) ||
    original.match(
      /\b(?:pc|pcs|piece|pieces)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(?:g|gm|gms|gram|grams)\b/i,
    );

  if (pieceWeightMatch) {
    const parsed =
      Number(
        pieceWeightMatch[1],
      );

    if (parsed > 0) {
      pieceWeightGrams =
        roundModifierNumber(
          parsed,
        );
    }

    cleanText =
      cleanText.replace(
        pieceWeightMatch[0],
        ' ',
      );
  }

  let portionQuantity:
    number | undefined;

  let portionUnit:
    MenuDishModifiers[
      'portionUnit'
    ];

  const portionMatches =
    Array.from(
      original.matchAll(
        /\b(\d+(?:\.\d+)?)\s*(ml|ltr|litre|liter|litres|liters|kg|kgs|g|gm|gms|gram|grams|pc|pcs|piece|pieces)\b/gi,
      ),
    );

  for (
    const match
    of portionMatches
  ) {
    const quantity =
      Number(match[1]);

    if (!(quantity > 0)) {
      continue;
    }

    const rawUnit =
      String(match[2])
        .toLowerCase();

    const unit =
      rawUnit === 'ml'
        ? 'ml'
        : [
            'ltr',
            'litre',
            'liter',
            'litres',
            'liters',
          ].includes(
            rawUnit,
          )
          ? 'ltr'
          : [
              'kg',
              'kgs',
            ].includes(
              rawUnit,
            )
            ? 'kg'
            : [
                'g',
                'gm',
                'gms',
                'gram',
                'grams',
              ].includes(
                rawUnit,
              )
              ? 'gram'
              : 'piece';

    /*
     * If a separate "...g each" weight was
     * detected, prefer the piece count as the
     * serving quantity instead of the weight.
     */
    if (
      pieceWeightGrams &&
      unit === 'gram'
    ) {
      continue;
    }

    portionQuantity =
      roundModifierNumber(
        quantity,
      );
    portionUnit = unit;

    cleanText =
      cleanText.replace(
        match[0],
        ' ',
      );

    if (
      unit === 'piece'
    ) {
      break;
    }
  }

  cleanText =
    cleanText
      .replace(
        /\(\s*\)|\[\s*\]/g,
        ' ',
      )
      .replace(
        /\s*[-–—|:/]\s*(?=$)/g,
        ' ',
      )
      .replace(
        /^[\s:|\-–—/]+|[\s:|\-–—/]+$/g,
        '',
      )
      .replace(/\s+/g, ' ')
      .trim();

  const modifiers:
    MenuDishModifiers = {
      tags:
        uniqueTags(tags),
      ...(portionQuantity &&
      portionUnit
        ? {
            portionQuantity,
            portionUnit,
          }
        : {}),
      ...(pieceWeightGrams
        ? {
            pieceWeightGrams,
          }
        : {}),
    };

  return {
    cleanText,
    modifiers:
      hasMenuDishModifiers(
        modifiers,
      )
        ? modifiers
        : undefined,
  };
}

export function menuDishModifierKey(
  value:
    | MenuDishModifiers
    | null
    | undefined,
) {
  if (!value) {
    return 'standard';
  }

  return [
    ...value.tags,
    value.portionQuantity
      ? `qty:${value.portionQuantity}`
      : '',
    value.portionUnit
      ? `unit:${value.portionUnit}`
      : '',
    value.pieceWeightGrams
      ? `piece-g:${value.pieceWeightGrams}`
      : '',
  ]
    .filter(Boolean)
    .join('|') ||
    'standard';
}

export function menuDishModifierLabels(
  value:
    | MenuDishModifiers
    | null
    | undefined,
) {
  if (!value) {
    return [];
  }

  const labels =
    value.tags.map(
      (tag) =>
        tag === 'JAIN'
          ? 'Jain'
          : tag ===
              'NO_ONION_GARLIC'
            ? 'No Onion-Garlic'
            : tag ===
                'SATVIK'
              ? 'Satvik'
              : tag ===
                  'VEGAN'
                ? 'Vegan'
                : 'Live',
    );

  if (
    Number(
      value.portionQuantity,
    ) > 0 &&
    value.portionUnit
  ) {
    labels.push(
      `${value.portionQuantity} ${value.portionUnit === 'piece' ? (Number(value.portionQuantity) === 1 ? 'piece' : 'pieces') : value.portionUnit}`,
    );
  }

  if (
    Number(
      value.pieceWeightGrams,
    ) > 0
  ) {
    labels.push(
      `${value.pieceWeightGrams} g / piece`,
    );
  }

  return labels;
}
