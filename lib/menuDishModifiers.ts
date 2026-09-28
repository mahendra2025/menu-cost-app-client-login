export type MenuDishModifierTag =
  | 'JAIN'
  | 'NO_ONION_GARLIC'
  | 'SATVIK'
  | 'VEGAN'
  | 'LIVE';

export type MenuDishPortionUnit =
  | 'ml'
  | 'ltr'
  | 'gram'
  | 'kg'
  | 'piece';

export type MenuDishModifiers = {
  tags: MenuDishModifierTag[];
  portionQuantity?: number;
  portionUnit?: MenuDishPortionUnit;
  pieceWeightGrams?: number;
};

const TAGS: readonly MenuDishModifierTag[] = [
  'JAIN',
  'NO_ONION_GARLIC',
  'SATVIK',
  'VEGAN',
  'LIVE',
];

const PORTION_UNITS: readonly MenuDishPortionUnit[] = [
  'ml',
  'ltr',
  'gram',
  'kg',
  'piece',
];

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function uniqueTags(values: MenuDishModifierTag[]) {
  return Array.from(new Set(values));
}

export function hasMenuDishModifiers(
  value: MenuDishModifiers | null | undefined,
) {
  return Boolean(
    value &&
      (value.tags.length > 0 ||
        Number(value.portionQuantity) > 0 ||
        Number(value.pieceWeightGrams) > 0),
  );
}

export function readMenuDishModifiers(
  value: unknown,
): MenuDishModifiers | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const row = value as Record<string, unknown>;
  const tags = Array.isArray(row.tags)
    ? uniqueTags(
        row.tags
          .map((tag) => String(tag || '').trim().toUpperCase())
          .filter((tag): tag is MenuDishModifierTag =>
            TAGS.includes(tag as MenuDishModifierTag),
          ),
      )
    : [];

  const rawUnit = String(row.portionUnit || '')
    .trim()
    .toLowerCase();
  const portionUnit = PORTION_UNITS.includes(
    rawUnit as MenuDishPortionUnit,
  )
    ? (rawUnit as MenuDishPortionUnit)
    : undefined;

  const portionQuantity = Math.max(0, Number(row.portionQuantity) || 0);
  const pieceWeightGrams = Math.max(0, Number(row.pieceWeightGrams) || 0);

  const result: MenuDishModifiers = {
    tags,
    ...(portionUnit && portionQuantity > 0
      ? {
          portionQuantity: round2(portionQuantity),
          portionUnit,
        }
      : {}),
    ...(pieceWeightGrams > 0
      ? { pieceWeightGrams: round2(pieceWeightGrams) }
      : {}),
  };

  return hasMenuDishModifiers(result) ? result : undefined;
}

export function mergeMenuDishModifiers(
  ...values: Array<MenuDishModifiers | null | undefined>
): MenuDishModifiers | undefined {
  const tags = uniqueTags(values.flatMap((value) => value?.tags || []));
  const portion = [...values]
    .reverse()
    .find(
      (value) =>
        Number(value?.portionQuantity) > 0 && Boolean(value?.portionUnit),
    );
  const weight = [...values]
    .reverse()
    .find((value) => Number(value?.pieceWeightGrams) > 0);

  const merged: MenuDishModifiers = {
    tags,
    ...(portion?.portionUnit && Number(portion.portionQuantity) > 0
      ? {
          portionQuantity: portion.portionQuantity,
          portionUnit: portion.portionUnit,
        }
      : {}),
    ...(Number(weight?.pieceWeightGrams) > 0
      ? { pieceWeightGrams: weight?.pieceWeightGrams }
      : {}),
  };

  return hasMenuDishModifiers(merged) ? merged : undefined;
}

function normalizePortionUnit(rawUnit: string): MenuDishPortionUnit {
  const value = rawUnit.toLowerCase();
  if (value === 'ml') return 'ml';
  if (['ltr', 'litre', 'liter', 'litres', 'liters'].includes(value)) {
    return 'ltr';
  }
  if (['kg', 'kgs'].includes(value)) return 'kg';
  if (['g', 'gm', 'gms', 'gram', 'grams'].includes(value)) return 'gram';
  return 'piece';
}

function cleanSeparators(value: string) {
  return value
    .replace(/\(\s*\)|\[\s*\]/g, ' ')
    .replace(/\s*[-–—|:/]\s*(?=$)/g, ' ')
    .replace(/^[\s:|\-–—/]+|[\s:|\-–—/]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractMenuDishModifiers(value: string) {
  const original = String(value || '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim();
  let cleanText = original;
  const tags: MenuDishModifierTag[] = [];

  const tagRules: Array<[MenuDishModifierTag, RegExp]> = [
    [
      'NO_ONION_GARLIC',
      /\b(?:no|without)\s+onion\s*(?:&|and|\/|\+)?\s*(?:no\s+)?garlic\b|\bno\s+onion\s+no\s+garlic\b|बिना\s*(?:प्याज|प्याज़)\s*(?:और|व)\s*लहसुन|ડુંગળી\s*(?:અને|&)\s*લસણ\s*વગર/iu,
    ],
    ['JAIN', /\bjain\b|जैन|જૈન/iu],
    ['SATVIK', /\b(?:satvik|sattvik|satvic)\b|सात्विक|સાત્વિક/iu],
    ['VEGAN', /\bvegan\b|वीगन|વેગન/iu],
    ['LIVE', /\blive(?:\s+counter)?\b/iu],
  ];

  for (const [tag, pattern] of tagRules) {
    if (pattern.test(cleanText)) {
      tags.push(tag);
      cleanText = cleanText.replace(pattern, ' ');
    }
  }

  let pieceWeightGrams: number | undefined;
  const pieceWeightPattern =
    /\b(\d+(?:\.\d+)?)\s*(?:g|gm|gms|gram|grams)\s*(?:each|\/\s*(?:pc|pcs|piece|pieces)|per\s+(?:pc|piece))\b/i;
  const pieceMultiplierPattern =
    /\b(\d+(?:\.\d+)?)\s*(?:pc|pcs|piece|pieces)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(?:g|gm|gms|gram|grams)\b/i;

  const multiplier = original.match(pieceMultiplierPattern);
  if (multiplier) {
    pieceWeightGrams = round2(Number(multiplier[2]));
    cleanText = cleanText.replace(multiplier[0], ' ');
  } else {
    const each = original.match(pieceWeightPattern);
    if (each) {
      pieceWeightGrams = round2(Number(each[1]));
      cleanText = cleanText.replace(each[0], ' ');
    }
  }

  let portionQuantity: number | undefined;
  let portionUnit: MenuDishPortionUnit | undefined;

  if (multiplier) {
    portionQuantity = round2(Number(multiplier[1]));
    portionUnit = 'piece';
  } else {
    const portionMatches = Array.from(
      original.matchAll(
        /\b(\d+(?:\.\d+)?)\s*(ml|ltr|litre|liter|litres|liters|kg|kgs|g|gm|gms|gram|grams|pc|pcs|piece|pieces)\b/gi,
      ),
    );

    for (const match of portionMatches) {
      const unit = normalizePortionUnit(match[2]);
      if (pieceWeightGrams && unit === 'gram') continue;
      portionQuantity = round2(Number(match[1]));
      portionUnit = unit;
      cleanText = cleanText.replace(match[0], ' ');
      if (unit === 'piece') break;
    }
  }

  const modifiers: MenuDishModifiers = {
    tags: uniqueTags(tags),
    ...(portionQuantity && portionUnit
      ? { portionQuantity, portionUnit }
      : {}),
    ...(pieceWeightGrams ? { pieceWeightGrams } : {}),
  };

  return {
    cleanText: cleanSeparators(cleanText),
    modifiers: hasMenuDishModifiers(modifiers) ? modifiers : undefined,
  };
}

export function menuDishModifiersRequireRecipeVariant(
  value: MenuDishModifiers | null | undefined,
) {
  if (!value) return false;

  const recipeChangingTags =
    new Set<MenuDishModifierTag>([
      'JAIN',
      'NO_ONION_GARLIC',
      'SATVIK',
      'VEGAN',
    ]);

  return value.tags.some(
    (tag) =>
      recipeChangingTags.has(
        tag,
      ),
  );
}

export function menuDishModifierLabels(
  value: MenuDishModifiers | null | undefined,
) {
  if (!value) return [];

  const labels: string[] = value.tags.map((tag) => {
    if (tag === 'JAIN') return 'Jain';
    if (tag === 'NO_ONION_GARLIC') return 'No Onion-Garlic';
    if (tag === 'SATVIK') return 'Satvik';
    if (tag === 'VEGAN') return 'Vegan';
    return 'Live';
  });

  if (Number(value.portionQuantity) > 0 && value.portionUnit) {
    const unit =
      value.portionUnit === 'piece'
        ? Number(value.portionQuantity) === 1
          ? 'piece'
          : 'pieces'
        : value.portionUnit;
    labels.push(`${value.portionQuantity} ${unit}`);
  }

  if (Number(value.pieceWeightGrams) > 0) {
    labels.push(`${value.pieceWeightGrams} g / piece`);
  }

  return labels;
}

export function menuDishVariantName(
  baseName: string,
  value: MenuDishModifiers | null | undefined,
) {
  const name = String(baseName || '').replace(/\s+/g, ' ').trim();
  const labels = menuDishModifierLabels(value);
  return labels.length ? `${name} [${labels.join(', ')}]` : name;
}

export function menuDishModifierKey(
  value: MenuDishModifiers | null | undefined,
) {
  if (!value) return 'standard';
  return [
    ...value.tags,
    value.portionQuantity ? `qty:${value.portionQuantity}` : '',
    value.portionUnit ? `unit:${value.portionUnit}` : '',
    value.pieceWeightGrams ? `piece-g:${value.pieceWeightGrams}` : '',
  ]
    .filter(Boolean)
    .join('|') || 'standard';
}
