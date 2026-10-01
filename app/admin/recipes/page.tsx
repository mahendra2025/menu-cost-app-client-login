'use client';

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import AppShell from '../../components/AppShell';

import {
  applyRecipeWastage,
  assessRecipeQuality,
  readCostableRecipe,
} from '../../../lib/recipeCosting';

import {
  canonicalIngredientName,
  inferIngredientCategory,
  normalizeIngredientId,
} from '../../../lib/ingredientCatalog';

import {
  DEFAULT_COOKING_GAS_KG_PER_100,
  DEFAULT_GAS_CATEGORY_RATES,
  DEFAULT_LPG_SETTING,
  categoryGasKgPer100,
  isNoGasCategory,
  lpgRatePerKg,
  normalizeGasCategoryKey,
  type GasCategoryRateValue,
  type LpgCostSetting,
} from '../../../lib/gasCost';

import {
  suggestSweetGas,
} from '../../../lib/sweetGas';

import {
  suggestSabjiGas,
} from '../../../lib/sabjiGas';

import {
  suggestChaatGas,
} from '../../../lib/chaatGas';

import {
  suggestChineseGas,
} from '../../../lib/chineseGas';

import {
  suggestDalKadhiGas,
} from '../../../lib/dalKadhiGas';

import {
  suggestFarsanGas,
} from '../../../lib/farsanGas';

import {
  suggestIndianBreadGas,
} from '../../../lib/indianBreadGas';

import {
  suggestItalianGas,
} from '../../../lib/italianGas';

import {
  suggestMovingStarterGas,
} from '../../../lib/movingStarterGas';

import {
  suggestRiceGas,
} from '../../../lib/riceGas';

import {
  suggestSouthIndianGas,
} from '../../../lib/southIndianGas';

import {
  suggestStarterGas,
} from '../../../lib/starterGas';

import {
  suggestThaiGas,
} from '../../../lib/thaiGas';

import {
  menuDishModifierLabels,
  readMenuDishModifiers,
} from '../../../lib/menuDishModifiers';

type RawRow = Record<string, unknown>;

type RecipeCatalog = {
  dishes: RawRow[];
  rates: RawRow[];
  deletedDishIds: string[];
  catalogVersion: number;
  categories: string[];
  subcategories:
    Record<string, string[]>;
};

const RECIPE_CACHE_KEY = 'admin_recipe_catalog_v2';
const RECIPE_DISH_SYNC_KEY =
  'admin_recipe_dish_sync_v1';
const BULK_RECIPE_DRAFT_KEY =
  'menu_cost_bulk_recipe_draft_v1';

let memoryRecipeCatalog:
  RecipeCatalog | null =
    null;

let memoryRecipeCatalogLoadedAt =
  0;

const RECIPE_MEMORY_FRESH_MS =
  20 * 1000;

const RECIPES_PER_PAGE = 30;
const GAS_QUICK_ROWS_PER_PAGE = 100;

function recipePageForIndex(
  index: number | null,
) {
  if (
    index === null ||
    index < 0
  ) {
    return 1;
  }

  return (
    Math.floor(
      index /
        RECIPES_PER_PAGE,
    ) + 1
  );
}

function text(value: unknown) {
  return String(value ?? '').trim();
}

function numberValue(
  value: unknown,
  fallback = 0,
) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function requestedRecipeIndex(
  dishes: RawRow[],
) {
  if (
    typeof window ===
    'undefined'
  ) {
    return dishes.length
      ? 0
      : null;
  }

  const requested =
    new URLSearchParams(
      window.location.search,
    )
      .get('recipe')
      ?.trim()
      .toLowerCase();

  if (!requested) {
    return dishes.length
      ? 0
      : null;
  }

  const index =
    dishes.findIndex(
      (dish) =>
        String(
          dish.dishName ||
          dish.name ||
          '',
        )
          .trim()
          .toLowerCase() ===
        requested,
    );

  return index >= 0
    ? index
    : null;
}

function recipeName(dish: RawRow) {
  return text(
    dish.dishName ||
    dish.name,
  ) || 'Untitled Recipe';
}

function recipeIngredients(
  dish: RawRow,
) {
  return Array.isArray(
    dish.ingredients,
  )
    ? dish.ingredients.filter(
        (
          row,
        ): row is RawRow =>
          Boolean(
            row &&
            typeof row ===
              'object' &&
            !Array.isArray(row),
          ),
      )
    : [];
}

function ingredientQuantity(
  ingredient: RawRow,
) {
  return Math.max(
    0,
    numberValue(
      ingredient.quantity ??
      ingredient.qty,
    ),
  );
}

function ingredientRate(
  ingredient: RawRow,
) {
  return Math.max(
    0,
    numberValue(
      ingredient.marketRate ??
      ingredient.rate,
    ),
  );
}

function convertedQuantity(
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

function recipeTotal(
  dish: RawRow,
) {
  return recipeIngredients(
    dish,
  ).reduce(
    (
      total,
      ingredient,
    ) => {
      const qty =
        ingredientQuantity(
          ingredient,
        );

      const unit =
        text(
          ingredient.unit,
        ) || 'kg';

      const rateUnit =
        text(
          ingredient.rateUnit,
        ) || unit;

      return (
        total +
        convertedQuantity(
          qty,
          unit,
          rateUnit,
        ) *
          ingredientRate(
            ingredient,
          )
      );
    },
    0,
  );
}

function money(value: number) {
  return `₹${value.toLocaleString(
    'en-IN',
    {
      maximumFractionDigits: 2,
    },
  )}`;
}

function optionalRecipeGasNumber(
  value: unknown,
) {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ''
  ) {
    return null;
  }

  const number =
    Number(value);

  return Number.isFinite(number)
    ? Math.max(0, number)
    : null;
}

function hasRealRecipeGas(
  dish: RawRow | null,
) {
  if (!dish || dish.gasNoGas === true) {
    return false;
  }

  return (
    Number(dish.gasBurnerKgPerHour) > 0 &&
    Number(dish.gasCookingMinutes) > 0 &&
    Number(dish.gasBurnerCount) > 0 &&
    Number(dish.gasBatchPax) > 0
  );
}

function recipeGasPreview(
  dish: RawRow | null,
  category: string,
  guests: number,
  setting: LpgCostSetting,
  rates: GasCategoryRateValue[],
) {
  const lpgRate =
    lpgRatePerKg(
      setting,
    );

  if (!dish) {
    return {
      source: 'CATEGORY',
      gasKgPer100: 0,
      gasKg: 0,
      gasCost: 0,
      gasCostPerPerson: 0,
      lpgRate,
    };
  }

  if (dish.gasNoGas === true) {
    return {
      source: 'NO GAS',
      gasKgPer100: 0,
      gasKg: 0,
      gasCost: 0,
      gasCostPerPerson: 0,
      lpgRate,
    };
  }

  if (hasRealRecipeGas(dish)) {
    const burnerKgPerHour =
      Number(
        dish.gasBurnerKgPerHour,
      );
    const cookingMinutes =
      Number(
        dish.gasCookingMinutes,
      );
    const burnerCount =
      Math.max(
        1,
        Math.round(
          Number(
            dish.gasBurnerCount,
          ),
        ),
      );
    const batchPax =
      Math.max(
        1,
        Math.round(
          Number(
            dish.gasBatchPax,
          ),
        ),
      );
    const batches =
      Math.max(
        1,
        Math.ceil(
          guests /
          batchPax,
        ),
      );
    const gasKgPerBatch =
      burnerKgPerHour *
      burnerCount *
      (
        cookingMinutes /
        60
      );
    const gasKg =
      gasKgPerBatch *
      batches;
    const gasKgPer100 =
      gasKgPerBatch *
      Math.max(
        1,
        Math.ceil(
          100 /
          batchPax,
        ),
      );
    const gasCost =
      gasKg *
      lpgRate;

    return {
      source: 'REAL PROFILE',
      gasKgPer100,
      gasKg,
      gasCost,
      gasCostPerPerson:
        guests > 0
          ? gasCost /
            guests
          : 0,
      lpgRate,
    };
  }

  const measured =
    optionalRecipeGasNumber(
      dish.gasKgPer100,
    );

  const noGasCategory =
    isNoGasCategory(
      category,
    );

  const categoryGas =
    categoryGasKgPer100(
      category,
      rates,
    );

  const categoryKey =
    normalizeGasCategoryKey(
      category,
    );

  const sweetStarter =
    categoryKey === 'sweet'
      ? suggestSweetGas(
          recipeName(dish),
        )
      : null;

  const sabjiStarter =
    categoryKey === 'sabji'
      ? suggestSabjiGas(
          recipeName(dish),
        )
      : null;

  const chaatStarter =
    categoryKey === 'chaat'
      ? suggestChaatGas(
          recipeName(dish),
        )
      : null;

  const chineseStarter =
    categoryKey === 'chinese'
      ? suggestChineseGas(
          recipeName(dish),
        )
      : null;

  const dalKadhiStarter =
    categoryKey === 'dalkadhi'
      ? suggestDalKadhiGas(
          recipeName(dish),
        )
      : null;

  const farsanStarter =
    categoryKey === 'farsan'
      ? suggestFarsanGas(
          recipeName(dish),
        )
      : null;

  const indianBreadStarter =
    categoryKey === 'indianbread' ||
    categoryKey === 'bread'
      ? suggestIndianBreadGas(
          recipeName(dish),
        )
      : null;

  const italianStarter =
    categoryKey === 'italian'
      ? suggestItalianGas(
          recipeName(dish),
        )
      : null;

  const movingStarter =
    categoryKey === 'movingstarter'
      ? suggestMovingStarterGas(
          recipeName(dish),
        )
      : null;

  const riceStarter =
    categoryKey === 'rice'
      ? suggestRiceGas(
          recipeName(dish),
        )
      : null;

  const southIndianStarter =
    categoryKey === 'southindian'
      ? suggestSouthIndianGas(
          recipeName(dish),
        )
      : null;

  const starterEstimate =
    categoryKey === 'starter'
      ? suggestStarterGas(
          recipeName(dish),
        )
      : null;

  const thaiStarter =
    categoryKey === 'thai'
      ? suggestThaiGas(
          recipeName(dish),
        )
      : null;

  const gasKgPer100 =
    measured !== null &&
    (
      measured > 0 ||
      noGasCategory
    )
      ? measured
      : noGasCategory
        ? 0
        : sweetStarter
          ? sweetStarter
              .kgPer100
          : sabjiStarter
            ? sabjiStarter
                .kgPer100
            : chaatStarter
              ? chaatStarter
                  .kgPer100
              : chineseStarter
                ? chineseStarter
                    .kgPer100
                : dalKadhiStarter
                  ? dalKadhiStarter
                      .kgPer100
                  : farsanStarter
                    ? farsanStarter
                        .kgPer100
                    : indianBreadStarter
                      ? indianBreadStarter
                          .kgPer100
                      : italianStarter
                        ? italianStarter
                            .kgPer100
                        : movingStarter
                          ? movingStarter
                              .kgPer100
                          : riceStarter
                            ? riceStarter
                                .kgPer100
                            : southIndianStarter
                              ? southIndianStarter
                                  .kgPer100
                              : starterEstimate
                                ? starterEstimate
                                    .kgPer100
                                : thaiStarter
                                  ? thaiStarter
                                      .kgPer100
                                  : categoryGas > 0
                                    ? categoryGas
                                    : DEFAULT_COOKING_GAS_KG_PER_100;

  const source =
    measured !== null &&
    (
      measured > 0 ||
      noGasCategory
    )
      ? 'DISH RATE'
      : noGasCategory
        ? 'NO GAS CATEGORY'
        : sweetStarter
          ? 'SWEET STARTER'
          : sabjiStarter
            ? 'SABJI STARTER'
            : chaatStarter
              ? 'CHAAT STARTER'
              : chineseStarter
                ? 'CHINESE STARTER'
                : dalKadhiStarter
                  ? 'DAL/KADHI STARTER'
                  : farsanStarter
                    ? 'FARSAN STARTER'
                    : indianBreadStarter
                      ? 'INDIAN BREAD STARTER'
                      : italianStarter
                        ? 'ITALIAN STARTER'
                        : movingStarter
                          ? 'MOVING STARTER'
                          : riceStarter
                            ? 'RICE STARTER'
                            : southIndianStarter
                              ? 'SOUTH INDIAN STARTER'
                              : starterEstimate
                                ? 'STARTER ESTIMATE'
                                : thaiStarter
                                  ? 'THAI STARTER'
                                  : categoryGas > 0
                                    ? 'CATEGORY'
                                    : 'SAFE DEFAULT';

  const gasKg =
    gasKgPer100 *
    guests /
    100;

  const gasCost =
    gasKg *
    lpgRate;

  return {
    source,
    gasKgPer100,
    gasKg,
    gasCost,
    gasCostPerPerson:
      guests > 0
        ? gasCost /
          guests
        : 0,
    lpgRate,
  };
}

function smartServingSuggestion(
  dish: RawRow,
) {
  const name =
    recipeName(dish)
      .toLowerCase()
      .normalize('NFKD')
      .replace(/\p{Diacritic}/gu, '');

  const obviousPiece =
    /\b(?:bottle|samosa|kachori|roll|ball|cutlet|patty|patties|tikki|vada|ladoo|laddu|gulab jamun|rasgulla|peda|pedha|barfi|burfi|katli|momos?|spring roll)\b/i.test(name);

  return obviousPiece
    ? {
        servingSize: 1,
        servingUnit: 'piece',
      }
    : {
        servingSize: 1,
        servingUnit: 'serving',
      };
}

function draftRecipeQuality(
  dish: RawRow,
) {
  const ingredients =
    recipeIngredients(dish);
  const missingRates =
    ingredients.filter(
      (ingredient) =>
        !(ingredientRate(ingredient) > 0),
    ).length;
  const estimatedRates =
    ingredients.filter(
      (ingredient) =>
        text(ingredient.rateSource) ===
        'category_estimate',
    ).length;
  const guests =
    Math.max(
      1,
      numberValue(dish.baseGuests, 100),
    );
  const costPerPlate =
    applyRecipeWastage(
      recipeTotal(dish) / guests,
    );

  return assessRecipeQuality(
    readCostableRecipe(dish),
    {
      missingRates,
      estimatedRates,
      costPerPlate,
    },
  );
}

function normalizeChatGptRecipePaste(
  value: string,
) {
  const raw =
    value.trim();

  if (!raw) {
    return raw;
  }

  const meaningfulLines =
    raw
      .split(/\r?\n/)
      .map((line) =>
        line.trim(),
      )
      .filter(Boolean);

  const alreadyStructured =
    meaningfulLines.some(
      (line) =>
        /^(?:R|RECIPE|I|ING|INGREDIENT|G|GAS|LPG)\s*\|/i.test(
          line,
        ),
    );

  if (alreadyStructured) {
    return raw;
  }

  const unitAliases:
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
      pack: 'packet',
      packet: 'packet',
      packets: 'packet',
      serving: 'serving',
      servings: 'serving',
    };

  type ChatRecipeDraft = {
    name: string;
    category: string;
    subcategory: string;
    baseGuests: number;
    servingSize: number;
    servingUnit: string;
    pieceWeightGrams: number;
    gasKgPer100: string;
    ingredients: string[];
  };

  const createDraft =
    (): ChatRecipeDraft => ({
      name: '',
      category: 'Other',
      subcategory: '',
      baseGuests: 100,
      servingSize: 1,
      servingUnit: 'serving',
      pieceWeightGrams: 0,
      gasKgPer100: '',
      ingredients: [],
    });

  const drafts:
    ChatRecipeDraft[] = [];

  let draft =
    createDraft();

  const flushDraft = () => {
    if (
      draft.name &&
      draft.ingredients.length
    ) {
      drafts.push(draft);
    }

    draft =
      createDraft();
  };

  const cleanLine = (
    input: string,
  ) =>
    input
      .replace(/^\s*[-*•]\s*/, '')
      .replace(/\*\*/g, '')
      .trim();

  const cleanNumber = (
    input: string,
  ) => {
    const match =
      input
        .replace(/,/g, '')
        .match(/-?\d+(?:\.\d+)?/);

    return match
      ? Number(match[0])
      : Number.NaN;
  };

  for (
    const rawLine of meaningfulLines
  ) {
    const line =
      cleanLine(rawLine);

    if (!line) {
      continue;
    }

    const dishMatch =
      line.match(
        /^(?:DISH(?:\s+NAME)?|RECIPE)\s*[:=-]\s*(.+)$/i,
      );

    if (dishMatch) {
      if (
        draft.name &&
        draft.ingredients.length
      ) {
        flushDraft();
      }

      draft.name =
        dishMatch[1]
          .replace(/^#+\s*/, '')
          .trim();

      continue;
    }

    const categoryMatch =
      line.match(
        /^CATEGORY\s*[:=-]\s*(.+)$/i,
      );

    if (categoryMatch) {
      draft.category =
        categoryMatch[1].trim() ||
        'Other';
      continue;
    }

    const subcategoryMatch =
      line.match(
        /^SUB\s*CATEGORY\s*[:=-]\s*(.+)$/i,
      ) ||
      line.match(
        /^SUBCATEGORY\s*[:=-]\s*(.+)$/i,
      );

    if (subcategoryMatch) {
      draft.subcategory =
        subcategoryMatch[1].trim();
      continue;
    }

    const guestMatch =
      line.match(
        /^(?:GUESTS?|PAX|BASE\s*GUESTS?)\s*[:=-]\s*(.+)$/i,
      );

    if (guestMatch) {
      const guests =
        cleanNumber(
          guestMatch[1],
        );

      if (
        Number.isFinite(guests) &&
        guests > 0
      ) {
        draft.baseGuests =
          Math.round(guests);
      }

      continue;
    }

    const gasMatch =
      line.match(
        /^(?:GAS(?:\s*KG)?(?:\s*\/\s*100)?|GAS_KG|LPG(?:\s*KG)?(?:\s*\/\s*100)?)\s*[:=-]\s*(.+)$/i,
      );

    if (gasMatch) {
      const gas =
        cleanNumber(
          gasMatch[1],
        );

      if (
        Number.isFinite(gas) &&
        gas >= 0
      ) {
        draft.gasKgPer100 =
          String(gas);
      }

      continue;
    }

    const servingMatch =
      line.match(
        /^SERVING(?:\s+SIZE)?\s*[:=-]\s*(.+)$/i,
      );

    if (servingMatch) {
      const parts =
        servingMatch[1]
          .trim()
          .split(/\s+/);

      const serving =
        cleanNumber(
          parts[0] || '',
        );

      const servingUnit =
        unitAliases[
          String(
            parts[1] ||
            'serving',
          ).toLowerCase()
        ];

      if (
        Number.isFinite(serving) &&
        serving > 0
      ) {
        draft.servingSize =
          serving;
      }

      if (servingUnit) {
        draft.servingUnit =
          servingUnit;
      }

      continue;
    }

    if (
      !draft.name &&
      /^#{1,3}\s+/.test(
        rawLine.trim(),
      )
    ) {
      const heading =
        rawLine
          .trim()
          .replace(
            /^#{1,3}\s+/,
            '',
          )
          .replace(/\*\*/g, '')
          .trim();

      if (
        heading &&
        !/^(?:ingredients?|recipe|method|preparation)$/i.test(
          heading,
        )
      ) {
        draft.name =
          heading;
      }

      continue;
    }

    let row =
      line;

    if (
      row.startsWith('|')
    ) {
      row =
        row.slice(1);
    }

    if (
      row.endsWith('|')
    ) {
      row =
        row.slice(0, -1);
    }

    const parts =
      row
        .split(
          /\s*(?:\||,|\t)\s*/,
        )
        .map((part) =>
          part.trim(),
        )
        .filter(Boolean);

    if (
      parts.length < 3
    ) {
      continue;
    }

    const headerText =
      parts
        .slice(0, 4)
        .join(' ')
        .toLowerCase();

    if (
      /ingredient/.test(
        headerText,
      ) &&
      /(?:qty|quantity)/.test(
        headerText,
      )
    ) {
      continue;
    }

    if (
      parts.every(
        (part) =>
          /^:?-{2,}:?$/.test(
            part,
          ),
      )
    ) {
      continue;
    }

    const ingredientName =
      parts[0];

    const quantity =
      cleanNumber(
        parts[1],
      );

    const rawUnit =
      String(
        parts[2] || '',
      )
        .toLowerCase()
        .replace(/\./g, '');

    const unit =
      unitAliases[
        rawUnit
      ];

    if (
      !ingredientName ||
      !Number.isFinite(
        quantity,
      ) ||
      quantity < 0 ||
      !unit
    ) {
      continue;
    }

    const rate =
      parts[3]
        ? cleanNumber(
            parts[3],
          )
        : Number.NaN;

    const rateUnit =
      unitAliases[
        String(
          parts[4] ||
          rawUnit,
        )
          .toLowerCase()
          .replace(/\./g, '')
      ] ||
      unit;

    draft.ingredients.push(
      [
        'I',
        ingredientName,
        String(quantity),
        unit,
        Number.isFinite(rate) &&
        rate >= 0
          ? String(rate)
          : '',
        rateUnit,
      ].join(' | '),
    );
  }

  flushDraft();

  if (!drafts.length) {
    return raw;
  }

  return drafts
    .flatMap((recipe) => [
      [
        'R',
        recipe.name,
        recipe.category,
        recipe.subcategory,
        String(
          recipe.servingSize,
        ),
        recipe.servingUnit,
        String(
          recipe.baseGuests,
        ),
        String(
          recipe.pieceWeightGrams,
        ),
        recipe.gasKgPer100,
      ].join(' | '),
      ...recipe.ingredients,
    ])
    .join('\n');
}


type BulkDuplicateMode =
  | 'update'
  | 'skip'
  | 'copy';

type BulkImportIngredientPreview = {
  name: string;
  quantity: number;
  unit: string;
  rate: number;
  rateUnit: string;
  existsInMaster: boolean;
  missingRate: boolean;
  duplicate: boolean;
};

type BulkImportRecipePreview = {
  name: string;
  category: string;
  subcategory: string;
  servingSize: number;
  servingUnit: string;
  baseGuests: number;
  pieceWeightGrams: number;
  gasKgPer100: number | null;
  ingredients: BulkImportIngredientPreview[];
  duplicateRecipe: boolean;
};

type BulkImportPreview = {
  recipes: BulkImportRecipePreview[];
  invalidLines: number;
  invalidRecipes: number;
};

const BULK_RECIPE_UNIT_ALIASES:
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
    pack: 'packet',
    packet: 'packet',
    packets: 'packet',
    serving: 'serving',
    servings: 'serving',
  };

function normalizeBulkRecipeUnit(
  value: unknown,
) {
  return (
    BULK_RECIPE_UNIT_ALIASES[
      text(value)
        .toLowerCase()
        .replace(/\./g, '')
    ] || ''
  );
}

function bulkIngredientKey(
  name: string,
  unit: string,
) {
  return (
    canonicalIngredientName(name)
      .toLowerCase() +
    '|' +
    unit
  );
}

function parseBulkRecipeImport(
  value: string,
  catalog: RecipeCatalog,
  rateOverrides:
    Record<string, string> = {},
): BulkImportPreview {
  const normalized =
    normalizeChatGptRecipePaste(
      value,
    );

  const lines =
    normalized
      .split(/\r?\n/)
      .map((line) =>
        line.trim(),
      )
      .filter(Boolean);

  const masterById =
    new Map<string, RawRow>();

  const masterByName =
    new Map<string, RawRow>();

  for (
    const rate of catalog.rates
  ) {
    const name =
      canonicalIngredientName(
        text(
          rate.name ||
          rate.ingredientName,
        ),
      );

    const unit =
      normalizeBulkRecipeUnit(
        rate.unit ||
        rate.rateUnit,
      );

    if (!name || !unit) {
      continue;
    }

    masterById.set(
      normalizeIngredientId(
        name,
        unit,
      ).toLowerCase(),
      rate,
    );

    if (
      !masterByName.has(
        name.toLowerCase(),
      )
    ) {
      masterByName.set(
        name.toLowerCase(),
        rate,
      );
    }
  }

  const existingRecipeNames =
    new Set(
      catalog.dishes.map(
        (dish) =>
          recipeName(dish)
            .trim()
            .toLowerCase(),
      ),
    );

  const pastedRecipeNames =
    new Set<string>();

  const recipes:
    BulkImportRecipePreview[] =
    [];

  let active:
    BulkImportRecipePreview | null =
    null;

  let invalidLines = 0;
  let invalidRecipes = 0;

  for (const line of lines) {
    const parts =
      line
        .split(/\s*\|\s*/)
        .map((part) =>
          part.trim(),
        );

    const type =
      text(parts[0])
        .toUpperCase();

    if (
      type === 'R' ||
      type === 'RECIPE'
    ) {
      const name =
        text(parts[1])
          .replace(
            /\s+/g,
            ' ',
          );

      const category =
        text(parts[2]) ||
        'Other';

      const subcategory =
        text(parts[3]);

      const servingSizeRaw =
        Number(parts[4]);

      const servingUnit =
        normalizeBulkRecipeUnit(
          parts[5] ||
          'serving',
        );

      const baseGuestsRaw =
        Number(parts[6]);

      const pieceWeightRaw =
        Number(parts[7]);

      const gasText =
        text(parts[8]);

      const gasRaw =
        gasText
          ? Number(gasText)
          : Number.NaN;

      if (
        !name ||
        !servingUnit
      ) {
        active = null;
        invalidRecipes += 1;
        continue;
      }

      const nameKey =
        name.toLowerCase();

      active = {
        name,
        category,
        subcategory,
        servingSize:
          Number.isFinite(
            servingSizeRaw,
          ) &&
          servingSizeRaw > 0
            ? servingSizeRaw
            : 1,
        servingUnit,
        baseGuests:
          Number.isFinite(
            baseGuestsRaw,
          ) &&
          baseGuestsRaw > 0
            ? Math.round(
                baseGuestsRaw,
              )
            : 100,
        pieceWeightGrams:
          servingUnit ===
            'piece' &&
          Number.isFinite(
            pieceWeightRaw,
          ) &&
          pieceWeightRaw > 0
            ? pieceWeightRaw
            : 0,
        gasKgPer100:
          Number.isFinite(
            gasRaw,
          ) &&
          gasRaw >= 0
            ? gasRaw
            : null,
        ingredients: [],
        duplicateRecipe:
          existingRecipeNames.has(
            nameKey,
          ) ||
          pastedRecipeNames.has(
            nameKey,
          ),
      };

      recipes.push(active);

      pastedRecipeNames.add(
        nameKey,
      );

      continue;
    }

    if (
      type === 'G' ||
      type === 'GAS' ||
      type === 'LPG'
    ) {
      if (!active) {
        invalidLines += 1;
        continue;
      }

      const gasValue =
        Number(parts[1]);

      const gasUnit =
        normalizeBulkRecipeUnit(
          parts[2] ||
          'kg',
        );

      if (
        !Number.isFinite(
          gasValue,
        ) ||
        gasValue < 0 ||
        (
          gasUnit !== 'kg' &&
          gasUnit !== 'gram'
        )
      ) {
        invalidLines += 1;
        continue;
      }

      active.gasKgPer100 =
        gasUnit === 'gram'
          ? gasValue / 1000
          : gasValue;

      continue;
    }

    if (
      type === 'I' ||
      type === 'ING' ||
      type === 'INGREDIENT'
    ) {
      if (!active) {
        invalidLines += 1;
        continue;
      }

      const ingredientName =
        canonicalIngredientName(
          text(parts[1]),
        );

      const quantity =
        Number(parts[2]);

      const unit =
        normalizeBulkRecipeUnit(
          parts[3] ||
          'kg',
        );

      if (
        !ingredientName ||
        !unit ||
        !Number.isFinite(
          quantity,
        ) ||
        quantity < 0
      ) {
        invalidLines += 1;
        continue;
      }

      const enteredRateText =
        text(parts[4]);

      const enteredRate =
        enteredRateText
          ? Number(
              enteredRateText,
            )
          : Number.NaN;

      const enteredRateValid =
        enteredRateText !== '' &&
        Number.isFinite(
          enteredRate,
        ) &&
        enteredRate >= 0;

      const enteredRateUnit =
        normalizeBulkRecipeUnit(
          parts[5],
        );

      const lookupUnit =
        enteredRateUnit ||
        unit;

      const master =
        masterById.get(
          normalizeIngredientId(
            ingredientName,
            lookupUnit,
          ).toLowerCase(),
        ) ||
        masterByName.get(
          ingredientName
            .toLowerCase(),
        );

      const masterRate =
        Math.max(
          0,
          numberValue(
            master?.rate ??
            master?.marketRate,
          ),
        );

      const masterUnit =
        normalizeBulkRecipeUnit(
          master?.unit ||
          master?.rateUnit,
        );

      const rateUnit =
        masterUnit ||
        enteredRateUnit ||
        unit;

      const overrideKey =
        bulkIngredientKey(
          ingredientName,
          rateUnit,
        );

      const overrideText =
        Object.prototype
          .hasOwnProperty.call(
            rateOverrides,
            overrideKey,
          )
          ? text(
              rateOverrides[
                overrideKey
              ],
            )
          : '';

      const overrideRate =
        overrideText !== ''
          ? Number(
              overrideText,
            )
          : Number.NaN;

      const overrideValid =
        overrideText !== '' &&
        Number.isFinite(
          overrideRate,
        ) &&
        overrideRate >= 0;

      const finalRate =
        masterRate > 0
          ? masterRate
          : overrideValid
            ? overrideRate
            : enteredRateValid
              ? enteredRate
              : 0;

      const ingredientKey =
        bulkIngredientKey(
          ingredientName,
          unit,
        );

      const duplicate =
        active.ingredients.some(
          (ingredient) =>
            bulkIngredientKey(
              ingredient.name,
              ingredient.unit,
            ) ===
            ingredientKey,
        );

      active.ingredients.push({
        name:
          ingredientName,
        quantity,
        unit,
        rate:
          Math.max(
            0,
            finalRate,
          ),
        rateUnit,
        existsInMaster:
          Boolean(master),
        missingRate:
          !(masterRate > 0) &&
          !overrideValid &&
          !enteredRateValid,
        duplicate,
      });

      continue;
    }

    invalidLines += 1;
  }

  return {
    recipes,
    invalidLines,
    invalidRecipes,
  };
}

export default function RecipesPage() {
  const [
    catalog,
    setCatalog,
  ] =
    useState<RecipeCatalog | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    smartDraftGenerating,
    setSmartDraftGenerating,
  ] =
    useState(false);

  const [
    syncStatus,
    setSyncStatus,
  ] = useState<
    'idle' |
    'syncing' |
    'synced' |
    'error'
  >('idle');

  const [
    syncMessage,
    setSyncMessage,
  ] = useState(
    'Auto sync to Dish Master is enabled.',
  );

  const [
    message,
    setMessage,
  ] =
    useState('');

  const [
    error,
    setError,
  ] =
    useState('');

  const [
    query,
    setQuery,
  ] =
    useState('');

  const deferredQuery =
    useDeferredValue(
      query,
    );

  const [
    category,
    setCategory,
  ] =
    useState('ALL');

  const [
    selectedIndex,
    setSelectedIndex,
  ] =
    useState<number | null>(
      null,
    );

  const coverageCreateHandled =
    useRef(false);

  const bulkCoverageCreateHandled =
    useRef(false);

  const [
    recipePage,
    setRecipePage,
  ] = useState(1);

  const [
    bulkIngredients,
    setBulkIngredients,
  ] = useState('');

  const [
    bulkRecipes,
    setBulkRecipes,
  ] = useState('');

  const [
    bulkDuplicateMode,
    setBulkDuplicateMode,
  ] =
    useState<BulkDuplicateMode>(
      'update',
    );

  const [
    bulkRateOverrides,
    setBulkRateOverrides,
  ] = useState<
    Record<string, string>
  >({});

  const [
    showBulkRecipes,
    setShowBulkRecipes,
  ] = useState(false);

  const [
    showGasQuickEntry,
    setShowGasQuickEntry,
  ] = useState(false);

  const [
    gasQuickUnsetOnly,
    setGasQuickUnsetOnly,
  ] = useState(false);

  const [
    gasQuickBulkValue,
    setGasQuickBulkValue,
  ] = useState('');

  const [
    gasQuickPage,
    setGasQuickPage,
  ] = useState(1);

  const [
    gasQuickStickyIndexes,
    setGasQuickStickyIndexes,
  ] = useState<Set<number>>(
    () => new Set(),
  );

  const gasQuickInputRefs =
    useRef<Record<
      number,
      HTMLInputElement | null
    >>({});

  const [
    gasSetting,
    setGasSetting,
  ] =
    useState<LpgCostSetting>({
      ...DEFAULT_LPG_SETTING,
    });

  const [
    gasCategoryRates,
    setGasCategoryRates,
  ] =
    useState<GasCategoryRateValue[]>(
      () =>
        DEFAULT_GAS_CATEGORY_RATES.map(
          (rate) => ({
            ...rate,
          }),
        ),
    );

  async function loadRecipes(background = false) {
    if (!background) setLoading(true);
    setError('');

    try {
      const response =
        await fetch(
          '/api/admin/recipes',
          {
            cache:
              'no-store',
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          'Could not load recipes.',
        );
      }

      const source =
        data.catalog;

      const nextCatalog:
        RecipeCatalog = {
          dishes:
            Array.isArray(
              source?.dishes,
            )
              ? source.dishes
              : [],

          rates:
            Array.isArray(
              source?.rates,
            )
              ? source.rates
              : [],

          deletedDishIds:
            Array.isArray(
              source
                ?.deletedDishIds,
            )
              ? source
                  .deletedDishIds
                  .map(String)
              : [],

          catalogVersion:
            Math.max(
              1,
              Number(
                source
                  ?.catalogVersion,
              ) || 1,
            ),

          categories:
            Array.isArray(
              data.categories,
            )
              ? data.categories
                  .map(String)
                  .map(
                    (item: string) =>
                      item.trim(),
                  )
                  .filter(Boolean)
              : [],

          subcategories:
            data.subcategories &&
            typeof data.subcategories ===
              'object' &&
            !Array.isArray(
              data.subcategories,
            )
              ? Object.fromEntries(
                  Object.entries(
                    data.subcategories as
                      Record<
                        string,
                        unknown
                      >,
                  ).map(
                    ([
                      category,
                      values,
                    ]) => [
                      category,
                      Array.isArray(
                        values,
                      )
                        ? values
                            .map(String)
                            .map(
                              (
                                item,
                              ) =>
                                item.trim(),
                            )
                            .filter(
                              Boolean,
                            )
                        : [],
                    ],
                  ),
                )
              : {},
        };

      setCatalog(
        nextCatalog,
      );

      memoryRecipeCatalog =
        nextCatalog;

      memoryRecipeCatalogLoadedAt =
        Date.now();

      setSelectedIndex(
        requestedRecipeIndex(
          nextCatalog.dishes,
        ),
      );

      try {
        localStorage.setItem(
          RECIPE_CACHE_KEY,
          JSON.stringify(nextCatalog),
        );
      } catch {
        // Cache is optional.
      }

    } catch (
      loadError
    ) {
      setError(
        loadError instanceof
          Error
          ? loadError.message
          : 'Could not load recipes.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function loadGasMaster() {
      try {
        const response =
          await fetch(
            '/api/admin/gas-cost',
            {
              cache:
                'no-store',
            },
          );

        if (!response.ok) {
          return;
        }

        const data =
          await response.json();

        if (
          data.setting &&
          typeof data.setting ===
            'object'
        ) {
          setGasSetting({
            cylinderPrice:
              Math.max(
                0,
                Number(
                  data.setting
                    .cylinderPrice,
                ) ||
                DEFAULT_LPG_SETTING
                  .cylinderPrice,
              ),
            cylinderWeightKg:
              Math.max(
                0.01,
                Number(
                  data.setting
                    .cylinderWeightKg,
                ) ||
                DEFAULT_LPG_SETTING
                  .cylinderWeightKg,
              ),
          });
        }

        if (
          Array.isArray(
            data.categoryRates,
          )
        ) {
          setGasCategoryRates(
            data.categoryRates,
          );
        }
      } catch {
        // Recipes can still use the built-in gas defaults.
      }
    }

    void loadGasMaster();
  }, []);

  useEffect(() => {
    if (memoryRecipeCatalog) {
      setCatalog(
        memoryRecipeCatalog,
      );

      setSelectedIndex(
        requestedRecipeIndex(
          memoryRecipeCatalog.dishes,
        ),
      );

      setLoading(false);

      if (
        Date.now() -
          memoryRecipeCatalogLoadedAt >
        RECIPE_MEMORY_FRESH_MS
      ) {
        void loadRecipes(true);
      }

      return;
    }

    try {
      const raw =
        localStorage.getItem(
          RECIPE_CACHE_KEY,
        );

      if (raw) {
        const cached =
          JSON.parse(raw) as RecipeCatalog;

        if (
          Array.isArray(cached.dishes) &&
          Array.isArray(cached.rates)
        ) {
          memoryRecipeCatalog =
            cached;

          memoryRecipeCatalogLoadedAt =
            0;

          setCatalog(cached);

          setSelectedIndex(
            requestedRecipeIndex(
              cached.dishes,
            ),
          );

          setLoading(false);

          void loadRecipes(true);
          return;
        }
      }
    } catch {
      localStorage.removeItem(
        RECIPE_CACHE_KEY,
      );
    }

    void loadRecipes();
  }, []);

  useEffect(() => {
    if (
      !catalog ||
      typeof window === 'undefined'
    ) {
      return;
    }

    const params =
      new URLSearchParams(
        window.location.search,
      );

    const bulkRequested =
      params.get('bulkCreate') ===
      '1';

    if (bulkRequested) {
      if (
        bulkCoverageCreateHandled.current
      ) {
        return;
      }

      bulkCoverageCreateHandled.current =
        true;

      let draft:
        Record<string, unknown> | null =
        null;

      try {
        const rawDraft =
          localStorage.getItem(
            BULK_RECIPE_DRAFT_KEY,
          );

        if (rawDraft) {
          const parsed =
            JSON.parse(
              rawDraft,
            );

          if (
            parsed &&
            typeof parsed ===
              'object' &&
            !Array.isArray(
              parsed,
            )
          ) {
            draft =
              parsed as
                Record<
                  string,
                  unknown
                >;
          }
        }
      } catch {
        draft = null;
      }

      const createdAt =
        Number(
          draft?.createdAt,
        ) || 0;

      if (
        !draft ||
        (
          createdAt > 0 &&
          Date.now() -
            createdAt >
            60 * 60 * 1000
        )
      ) {
        localStorage.removeItem(
          BULK_RECIPE_DRAFT_KEY,
        );

        setError(
          'Bulk recipe draft is unavailable. Return to menu detection and choose Create Missing Recipes again.',
        );
        return;
      }

      const requestedDishes =
        (
          Array.isArray(
            draft.dishes,
          )
            ? draft.dishes
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

              const name =
                String(
                  row.name ||
                  '',
                )
                  .normalize(
                    'NFKC',
                  )
                  .replace(
                    /\s+/g,
                    ' ',
                  )
                  .trim()
                  .slice(
                    0,
                    120,
                  );

              if (!name) {
                return [];
              }

              const requestedCategory =
                String(
                  row.category ||
                  'Other',
                )
                  .normalize(
                    'NFKC',
                  )
                  .replace(
                    /\s+/g,
                    ' ',
                  )
                  .trim()
                  .slice(
                    0,
                    60,
                  ) ||
                'Other';

              const modifiers =
                readMenuDishModifiers(
                  row.modifiers,
                );

              return [
                {
                  name,
                  category:
                    requestedCategory,
                  modifiers,
                },
              ];
            },
          );

      const uniqueRequestedDishes =
        Array.from(
          new Map(
            requestedDishes.map(
              (dish) => [
                dish.name
                  .toLocaleLowerCase(
                    'en-IN',
                  ),
                dish,
              ],
            ),
          ).values(),
        );

      if (
        !uniqueRequestedDishes.length
      ) {
        setError(
          'No missing dishes were found in the bulk recipe draft.',
        );
        return;
      }

      const nextDishes = [
        ...catalog.dishes,
      ];

      const nextCategories =
        new Set(
          catalog.categories,
        );

      let createdCount = 0;
      let existingCount = 0;
      let firstTouchedIndex:
        number | null =
        null;

      for (
        const requested
        of uniqueRequestedDishes
      ) {
        const existingIndex =
          nextDishes.findIndex(
            (dish) =>
              recipeName(dish)
                .toLocaleLowerCase(
                  'en-IN',
                ) ===
              requested.name
                .toLocaleLowerCase(
                  'en-IN',
                ),
          );

        if (
          existingIndex >= 0
        ) {
          existingCount += 1;

          if (
            firstTouchedIndex ===
            null
          ) {
            firstTouchedIndex =
              existingIndex;
          }

          continue;
        }

        const newIndex =
          nextDishes.length;

        nextDishes.push({
          dishName:
            requested.name,
          category:
            requested.category,
          subcategory: '',
          baseGuests: 100,
          servingSize:
            requested.modifiers?.portionQuantity ||
            1,
          servingUnit:
            requested.modifiers?.portionUnit ||
            'serving',
          pieceWeightGrams:
            requested.modifiers?.pieceWeightGrams ||
            0,
          dishModifiers:
            requested.modifiers,
          dishRate: 0,
          ingredients: [],
        });

        nextCategories.add(
          requested.category,
        );

        createdCount += 1;

        if (
          firstTouchedIndex ===
          null
        ) {
          firstTouchedIndex =
            newIndex;
        }
      }

      if (createdCount > 0) {
        const nextCatalog:
          RecipeCatalog = {
            ...catalog,
            dishes:
              nextDishes,
            categories:
              Array.from(
                nextCategories,
              ),
          };

        setCatalog(
          nextCatalog,
        );

        memoryRecipeCatalog =
          nextCatalog;
      }

      setQuery('');
      setCategory('ALL');

      if (
        firstTouchedIndex !==
        null
      ) {
        setSelectedIndex(
          firstTouchedIndex,
        );

        setRecipePage(
          recipePageForIndex(
            firstTouchedIndex,
          ),
        );
      }

      setError('');
      setMessage(
        `${createdCount} missing recipe${createdCount === 1 ? '' : 's'} prepared${existingCount ? ` · ${existingCount} already available` : ''}. Add ingredients, serving quantity/unit and gas cost, then Save & Sync once for the full batch.`,
      );

      return;
    }

    if (
      coverageCreateHandled.current
    ) {
      return;
    }

    const requestedName =
      String(
        params.get('create') ||
        '',
      )
        .normalize('NFKC')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 120);

    if (!requestedName) {
      return;
    }

    coverageCreateHandled.current =
      true;

    const existingIndex =
      catalog.dishes.findIndex(
        (dish) =>
          recipeName(dish)
            .toLocaleLowerCase(
              'en-IN',
            ) ===
          requestedName
            .toLocaleLowerCase(
              'en-IN',
            ),
      );

    if (existingIndex >= 0) {
      setSelectedIndex(
        existingIndex,
      );

      setRecipePage(
        recipePageForIndex(
          existingIndex,
        ),
      );

      setQuery('');
      setCategory('ALL');

      setMessage(
        `Existing recipe opened for ${requestedName}.`,
      );

      return;
    }

    const requestedCategory =
      String(
        params.get('category') ||
        'Other',
      )
        .normalize('NFKC')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 60) ||
      'Other';

    const requestedSubcategory =
      String(
        params.get(
          'subcategory',
        ) || '',
      )
        .normalize('NFKC')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 60);

    const requestedModifiers =
      readMenuDishModifiers({
        tags:
          String(
            params.get('modifierTags') ||
            '',
          )
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
        portionQuantity:
          Number(
            params.get(
              'modifierPortionQuantity',
            ) || 0,
          ),
        portionUnit:
          params.get(
            'modifierPortionUnit',
          ) || '',
        pieceWeightGrams:
          Number(
            params.get(
              'modifierPieceWeightGrams',
            ) || 0,
          ),
      });

    const index =
      catalog.dishes.length;

    const dish = {
      dishName:
        requestedName,
      category:
        requestedCategory,
      subcategory:
        requestedSubcategory,
      baseGuests: 100,
      servingSize:
        requestedModifiers?.portionQuantity ||
        1,
      servingUnit:
        requestedModifiers?.portionUnit ||
        'serving',
      pieceWeightGrams:
        requestedModifiers?.pieceWeightGrams ||
        0,
      dishModifiers:
        requestedModifiers,
      dishRate: 0,
      ingredients: [],
    };

    setCatalog({
      ...catalog,
      dishes: [
        ...catalog.dishes,
        dish,
      ],
    });

    setQuery('');
    setCategory('ALL');
    setSelectedIndex(index);

    setRecipePage(
      recipePageForIndex(
        index,
      ),
    );

    setMessage(
      `New recipe created for ${requestedName}. Add ingredients, then Save & Sync.`,
    );
  }, [catalog]);

  const categories =
    useMemo(
      () =>
        Array.from(
          new Set([
            ...(
              catalog
                ?.categories ||
              []
            ),

            ...(
              catalog
                ?.dishes ||
              []
            )
              .map(
                (dish) =>
                  text(
                    dish.category,
                  ),
              )
              .filter(
                Boolean,
              ),

            'Other',
          ]),
        ).sort(
          (a, b) =>
            a.localeCompare(
              b,
            ),
        ),
      [catalog],
    );

  const visibleRecipes =
    useMemo(() => {
      const q =
        deferredQuery
          .trim()
          .toLowerCase();

      return (
        catalog
          ?.dishes ||
        []
      )
        .map(
          (
            dish,
            index,
          ) => ({
            dish,
            index,
          }),
        )
        .filter(
          ({
            dish,
          }) => {
            if (
              recipeIngredients(
                dish,
              ).length === 0
            ) {
              return false;
            }

            const matchesCategory =
              category ===
                'ALL' ||
              text(
                dish.category,
              ) ===
                category;

            const searchable =
              [
                recipeName(
                  dish,
                ),
                text(
                  dish.category,
                ),
                text(
                  dish.subcategory,
                ),
              ]
                .join(' ')
                .toLowerCase();

            return (
              matchesCategory &&
              (
                !q ||
                searchable.includes(
                  q,
                )
              )
            );
          },
        );
    }, [
      catalog,
      category,
      deferredQuery,
    ]);

  const gasQuickRows =
    useMemo(
      () =>
        visibleRecipes.filter(
          ({
            dish,
            index,
          }) => {
            if (
              !gasQuickUnsetOnly ||
              gasQuickStickyIndexes.has(
                index,
              )
            ) {
              return true;
            }

            return !(
              dish.gasNoGas ===
                true ||
              hasRealRecipeGas(
                dish,
              ) ||
              optionalRecipeGasNumber(
                dish.gasKgPer100,
              ) !== null
            );
          },
        ),
      [
        visibleRecipes,
        gasQuickUnsetOnly,
        gasQuickStickyIndexes,
      ],
    );

  const gasQuickPageCount =
    Math.max(
      1,
      Math.ceil(
        gasQuickRows.length /
          GAS_QUICK_ROWS_PER_PAGE,
      ),
    );

  const paginatedGasQuickRows =
    gasQuickRows.slice(
      (gasQuickPage - 1) *
        GAS_QUICK_ROWS_PER_PAGE,
      gasQuickPage *
        GAS_QUICK_ROWS_PER_PAGE,
    );

  const recipePageCount =
    Math.max(
      1,
      Math.ceil(
        visibleRecipes.length /
          RECIPES_PER_PAGE,
      ),
    );

  const paginatedRecipes =
    visibleRecipes.slice(
      (recipePage - 1) *
        RECIPES_PER_PAGE,
      recipePage *
        RECIPES_PER_PAGE,
    );

  useEffect(() => {
    setRecipePage(1);
    setGasQuickPage(1);
  }, [
    category,
    deferredQuery,
    gasQuickUnsetOnly,
  ]);

  useEffect(() => {
    if (
      recipePage >
      recipePageCount
    ) {
      setRecipePage(
        recipePageCount,
      );
    }
  }, [
    recipePage,
    recipePageCount,
  ]);

  useEffect(() => {
    if (
      gasQuickPage >
      gasQuickPageCount
    ) {
      setGasQuickPage(
        gasQuickPageCount,
      );
    }
  }, [
    gasQuickPage,
    gasQuickPageCount,
  ]);

  const selectedDish =
    selectedIndex ===
      null
      ? null
      : catalog
          ?.dishes[
            selectedIndex
          ] ||
        null;

  function updateDish(
    index: number,
    patch: RawRow,
  ) {
    setMessage('');

    setCatalog(
      (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,

          dishes:
            current.dishes.map(
              (
                dish,
                dishIndex,
              ) =>
                dishIndex ===
                index
                  ? {
                      ...dish,
                      ...patch,
                    }
                  : dish,
            ),
        };
      },
    );
  }

  function smartDraftPatch(
    dish: RawRow,
  ): RawRow {
    const category =
      text(dish.category) ||
      'Other';
    const gas =
      recipeGasPreview(
        dish,
        category,
        100,
        gasSetting,
        gasCategoryRates,
      );
    const serving =
      smartServingSuggestion(dish);
    const hasExplicitGas =
      dish.gasNoGas === true ||
      hasRealRecipeGas(dish) ||
      optionalRecipeGasNumber(
        dish.gasKgPer100,
      ) !== null;
    const currentServingUnit =
      text(dish.servingUnit) ||
      'serving';
    const currentServingSize =
      Math.max(
        0.01,
        numberValue(
          dish.servingSize,
          1,
        ),
      );
    const useServingSuggestion =
      currentServingUnit ===
        'serving' &&
      currentServingSize === 1 &&
      serving.servingUnit !==
        'serving';

    return {
      generatedRecipe: false,
      smartDraftReviewed: true,
      smartDraftAcceptedAt:
        new Date().toISOString(),
      ...(useServingSuggestion
        ? serving
        : {}),
      ...(hasExplicitGas
        ? {}
        : gas.gasKgPer100 <= 0
          ? {
              gasNoGas: true,
              gasKgPer100: 0,
            }
          : {
              gasNoGas: false,
              gasKgPer100:
                Math.round(
                  gas.gasKgPer100 * 100,
                ) / 100,
            }),
    };
  }

  function acceptSmartDraft(
    index: number,
  ) {
    const dish =
      catalog?.dishes[index];
    if (
      !dish ||
      dish.generatedRecipe !== true
    ) {
      return;
    }

    const quality =
      draftRecipeQuality(dish);
    if (quality.status === 'BLOCKED') {
      setError(
        recipeName(dish) +
          ' Smart Draft is blocked. Fix the recipe-quality errors before accepting it.',
      );
      return;
    }

    updateDish(
      index,
      smartDraftPatch(dish),
    );
    setError('');
    setMessage(
      'Smart Draft accepted for ' +
        recipeName(dish) +
        '. Suggested serving and gas defaults are now locked in. Save & Sync when ready.',
    );
  }

  function acceptAllSmartDrafts() {
    if (!catalog) return;
    let accepted = 0;
    let blocked = 0;
    const nextDishes =
      catalog.dishes.map(
        (dish) => {
          if (
            dish.generatedRecipe !== true
          ) return dish;
          const quality =
            draftRecipeQuality(dish);
          if (quality.status === 'BLOCKED') {
            blocked += 1;
            return dish;
          }
          accepted += 1;
          return {
            ...dish,
            ...smartDraftPatch(dish),
          };
        },
      );

    if (!accepted) {
      setError(
        blocked
          ? String(blocked) +
            ' Smart Draft' +
            (blocked === 1 ? '' : 's') +
            ' still have blocking recipe-quality issues.'
          : 'No Smart Drafts are waiting for review.',
      );
      return;
    }

    const nextCatalog = {
      ...catalog,
      dishes: nextDishes,
    };
    setCatalog(nextCatalog);
    memoryRecipeCatalog =
      nextCatalog;
    setError('');
    setMessage(
      String(accepted) +
        ' Smart Draft' +
        (accepted === 1 ? '' : 's') +
        ' accepted' +
        (blocked
          ? ' · ' +
            String(blocked) +
            ' blocked draft' +
            (blocked === 1 ? '' : 's') +
            ' left for manual review'
          : '') +
        '. Save & Sync once when finished.',
    );
  }
  async function generateSmartDrafts(
    targetIndexes: number[],
    confirmReplace = false,
  ) {
    if (
      !catalog ||
      !targetIndexes.length
    ) {
      return;
    }

    const uniqueIndexes =
      Array.from(
        new Set(
          targetIndexes.filter(
            (index) =>
              index >= 0 &&
              index <
                catalog.dishes
                  .length,
          ),
        ),
      );

    if (!uniqueIndexes.length) {
      return;
    }

    const targets =
      uniqueIndexes.map(
        (index) => ({
          index,
          dish:
            catalog.dishes[
              index
            ],
        }),
      );

    if (
      confirmReplace &&
      targets.some(
        ({ dish }) =>
          recipeIngredients(
            dish,
          ).length > 0,
      )
    ) {
      const replace =
        window.confirm(
          'Replace the current ingredients with a new Smart Recipe Draft?',
        );

      if (!replace) {
        return;
      }
    }

    setSmartDraftGenerating(
      true,
    );
    setError('');
    setMessage(
      `Generating ${targets.length} Smart Recipe Draft${targets.length === 1 ? '' : 's'} for 100 guests…`,
    );

    try {
      const generatedByName =
        new Map<
          string,
          RawRow
        >();

      const chunkSize = 24;

      for (
        let offset = 0;
        offset <
          targets.length;
        offset += chunkSize
      ) {
        const chunk =
          targets.slice(
            offset,
            offset +
              chunkSize,
          );

        const response =
          await fetch(
            '/api/admin/recipes/smart-drafts',
            {
              method:
                'POST',
              headers: {
                'Content-Type':
                  'application/json',
              },
              body:
                JSON.stringify({
                  dishes:
                    chunk.map(
                      ({
                        dish,
                      }) => ({
                        name:
                          recipeName(
                            dish,
                          ),
                        category:
                          text(
                            dish.category,
                          ) ||
                          'Other',
                        modifiers:
                          dish.dishModifiers,
                      }),
                    ),
                }),
            },
          );

        const data =
          await response
            .json() as {
              error?: string;
              results?: Array<{
                requestedName?: string;
                recipe?: RawRow;
              }>;
            };

        if (!response.ok) {
          throw new Error(
            data.error ||
              'Smart Recipe Draft generation failed.',
          );
        }

        (
          Array.isArray(
            data.results,
          )
            ? data.results
            : []
        ).forEach(
          (result) => {
            const key =
              String(
                result.requestedName ||
                  '',
              )
                .trim()
                .toLocaleLowerCase(
                  'en-IN',
                );

            if (
              key &&
              result.recipe &&
              typeof result.recipe ===
                'object' &&
              !Array.isArray(
                result.recipe,
              )
            ) {
              generatedByName.set(
                key,
                result.recipe,
              );
            }
          },
        );
      }

      let generatedCount = 0;
      let firstGeneratedIndex:
        number | null =
        null;

      const targetSet =
        new Set(
          uniqueIndexes,
        );

      const nextDishes =
        catalog.dishes.map(
          (
            dish,
            index,
          ) => {
            if (
              !targetSet.has(
                index,
              )
            ) {
              return dish;
            }

            const key =
              recipeName(dish)
                .trim()
                .toLocaleLowerCase(
                  'en-IN',
                );

            const generated =
              generatedByName.get(
                key,
              );

            if (!generated) {
              return dish;
            }

            generatedCount += 1;

            if (
              firstGeneratedIndex ===
              null
            ) {
              firstGeneratedIndex =
                index;
            }

            return {
              ...dish,
              ...generated,
              dishName:
                recipeName(
                  dish,
                ),
              name:
                recipeName(
                  dish,
                ),
              category:
                text(
                  dish.category,
                ) ||
                text(
                  generated.category,
                ) ||
                'Other',
              subcategory:
                text(
                  dish.subcategory,
                ),
              servingSize:
                dish.servingSize ??
                generated.servingSize ??
                1,
              servingUnit:
                text(
                  dish.servingUnit,
                ) ||
                text(
                  generated.servingUnit,
                ) ||
                'serving',
              pieceWeightGrams:
                dish.pieceWeightGrams ??
                generated.pieceWeightGrams ??
                0,
              generatedRecipe:
                true,
              smartDraftReviewed:
                false,
              smartDraftAcceptedAt:
                '',
            };
          },
        );

      if (!generatedCount) {
        throw new Error(
          'No Smart Recipe Drafts were returned. Check the AI configuration and Ingredient Master.',
        );
      }

      const nextCatalog:
        RecipeCatalog = {
          ...catalog,
          dishes:
            nextDishes,
      };

      setCatalog(
        nextCatalog,
      );
      memoryRecipeCatalog =
        nextCatalog;

      if (
        firstGeneratedIndex !==
        null
      ) {
        setSelectedIndex(
          firstGeneratedIndex,
        );
        setRecipePage(
          recipePageForIndex(
            firstGeneratedIndex,
          ),
        );
      }

      const missed =
        targets.length -
        generatedCount;

      setMessage(
        `${generatedCount} Smart Recipe Draft${generatedCount === 1 ? '' : 's'} generated for 100 guests${missed > 0 ? ` · ${missed} could not be generated` : ''}. Review ingredients, serving, gas and Quality Gate, then Accept and Save & Sync.`,
      );
    } catch (
      generateError
    ) {
      setError(
        generateError instanceof
          Error
          ? generateError.message
          : 'Smart Recipe Draft generation failed.',
      );
    } finally {
      setSmartDraftGenerating(
        false,
      );
    }
  }

  function generateSelectedSmartDraft() {
    if (
      selectedIndex ===
        null ||
      !selectedDish
    ) {
      return;
    }

    void generateSmartDrafts(
      [
        selectedIndex,
      ],
      recipeIngredients(
        selectedDish,
      ).length > 0,
    );
  }

  function generateAllBlankSmartDrafts() {
    if (!catalog) {
      return;
    }

    const blankIndexes =
      catalog.dishes
        .map(
          (
            dish,
            index,
          ) => ({
            dish,
            index,
          }),
        )
        .filter(
          ({ dish }) =>
            recipeIngredients(
              dish,
            ).length === 0 &&
            dish.generatedRecipe !==
              true,
        )
        .map(
          ({ index }) =>
            index,
        );

    void generateSmartDrafts(
      blankIndexes,
      false,
    );
  }

  function quickGasPatch(
    rawValue: string,
  ): RawRow | null {
    const trimmed =
      rawValue.trim();

    if (!trimmed) {
      return {
        gasKgPer100: '',
        gasNoGas: false,
      };
    }

    const value =
      Number(trimmed);

    if (
      !Number.isFinite(value) ||
      value < 0
    ) {
      return null;
    }

    return {
      gasKgPer100:
        rawValue,
      gasNoGas:
        value === 0,
      gasBurnerKgPerHour: '',
      gasCookingMinutes: '',
      gasBurnerCount: '',
      gasBatchPax: '',
    };
  }

  function setQuickGasValue(
    dishIndex: number,
    rawValue: string,
  ) {
    const patch =
      quickGasPatch(
        rawValue,
      );

    if (!patch) {
      return;
    }

    setGasQuickStickyIndexes(
      (current) => {
        if (
          current.has(
            dishIndex,
          )
        ) {
          return current;
        }

        const next =
          new Set(current);

        next.add(
          dishIndex,
        );

        return next;
      },
    );

    updateDish(
      dishIndex,
      patch,
    );
  }

  function applyQuickGasSequence(
    startPosition: number,
    values: string[],
  ) {
    const targets =
      paginatedGasQuickRows
        .slice(
          startPosition,
          startPosition +
            values.length,
        )
        .map(
          (
            { index },
            offset,
          ) => ({
            index,
            patch:
              quickGasPatch(
                values[offset],
              ),
          }),
        )
        .filter(
          (
            item,
          ): item is {
            index: number;
            patch: RawRow;
          } =>
            Boolean(item.patch),
        );

    if (!targets.length) {
      return;
    }

    setGasQuickStickyIndexes(
      (current) => {
        const next =
          new Set(current);

        targets.forEach(
          ({ index }) =>
            next.add(index),
        );

        return next;
      },
    );

    const patchByIndex =
      new Map(
        targets.map(
          ({
            index,
            patch,
          }) => [
            index,
            patch,
          ],
        ),
      );

    setCatalog(
      (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          dishes:
            current.dishes.map(
              (
                dish,
                index,
              ) => {
                const patch =
                  patchByIndex.get(
                    index,
                  );

                return patch
                  ? {
                      ...dish,
                      ...patch,
                    }
                  : dish;
              },
            ),
        };
      },
    );

    setMessage(
      `${targets.length} gas value${targets.length === 1 ? '' : 's'} pasted. Save & Sync once when finished.`,
    );
  }

  function applyQuickGasToVisible() {
    const patch =
      quickGasPatch(
        gasQuickBulkValue,
      );

    if (
      !patch ||
      !gasQuickRows.length
    ) {
      setError(
        'Enter a valid gas kg / 100 value first.',
      );
      return;
    }

    const targetIndexes =
      new Set(
        gasQuickRows.map(
          ({ index }) =>
            index,
        ),
      );

    setCatalog(
      (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          dishes:
            current.dishes.map(
              (
                dish,
                index,
              ) =>
                targetIndexes.has(
                  index,
                )
                  ? {
                      ...dish,
                      ...patch,
                    }
                  : dish,
            ),
        };
      },
    );

    setError('');
    setMessage(
      `Gas ${gasQuickBulkValue} kg / 100 applied to ${targetIndexes.size} visible recipe${targetIndexes.size === 1 ? '' : 's'}. Save & Sync once when finished.`,
    );
  }

  function updateIngredient(
    dishIndex: number,
    ingredientIndex: number,
    patch: RawRow,
  ) {
    if (!catalog) {
      return;
    }

    const dish =
      catalog.dishes[
        dishIndex
      ];

    const ingredients =
      recipeIngredients(
        dish,
      );

    updateDish(
      dishIndex,
      {
        ingredients:
          ingredients.map(
            (
              ingredient,
              index,
            ) =>
              index ===
              ingredientIndex
                ? {
                    ...ingredient,
                    ...patch,
                  }
                : ingredient,
          ),
      },
    );
  }

  async function addBulkIngredients() {
    if (
      !catalog ||
      selectedIndex === null ||
      !selectedDish
    ) {
      return;
    }

    const unitAliases:
      Record<string, string> = {
        kg: 'kg',
        kgs: 'kg',
        kilogram: 'kg',
        g: 'gram',
        gm: 'gram',
        gram: 'gram',
        l: 'ltr',
        lt: 'ltr',
        ltr: 'ltr',
        litre: 'ltr',
        ml: 'ml',
        pc: 'piece',
        pcs: 'piece',
        piece: 'piece',
        pkt: 'packet',
        packet: 'packet',
      };

    const lines =
      bulkIngredients
        .split(/\r?\n/)
        .map((line) =>
          line.trim(),
        )
        .filter(Boolean);

    const added:
      RawRow[] = [];

    let skipped = 0;

    lines.forEach((line) => {
      const parts =
        line
          .split(
            /\s*(?:\t|\||,)\s*/,
          )
          .map((part) =>
            part.trim(),
          );

      const name =
        parts[0] || '';

      const quantity =
        Number(parts[1]);

      const rawUnit =
        (
          parts[2] ||
          'kg'
        ).toLowerCase();

      const unit =
        unitAliases[
          rawUnit
        ];

      const rate =
        Number(parts[3]);

      if (
        !name ||
        !Number.isFinite(
          quantity,
        ) ||
        quantity < 0 ||
        !unit
      ) {
        skipped += 1;
        return;
      }

      const safeRate =
        Number.isFinite(rate) &&
        rate >= 0
          ? rate
          : 0;

      added.push({
        name,
        quantity,
        qty: quantity,
        unit,
        marketRate:
          safeRate,
        rate:
          safeRate,
        rateUnit:
          unit,
      });
    });

    if (!added.length) {
      setError(
        'No valid ingredients found. Use: Name, Qty, Unit, Rate',
      );
      return;
    }

    const previousCatalog =
      catalog;

    const nextCatalog:
      RecipeCatalog = {
        ...catalog,
        dishes:
          catalog.dishes.map(
            (dish, index) =>
              index ===
              selectedIndex
                ? {
                    ...dish,
                    ingredients: [
                      ...recipeIngredients(
                        selectedDish,
                      ),
                      ...added,
                    ],
                  }
                : dish,
          ),
      };

    setCatalog(
      nextCatalog,
    );
    setError('');
    setMessage(
      `${added.length} ingredient${
        added.length === 1
          ? ''
          : 's'
      } added${
        skipped
          ? ` · ${skipped} skipped`
          : ''
      } · Saving…`,
    );

    const saved =
      await saveRecipes(
        nextCatalog,
      );

    if (saved) {
      setBulkIngredients('');
      setMessage(
        `${added.length} ingredient${
          added.length === 1
            ? ''
            : 's'
        } added and saved${
          skipped
            ? ` · ${skipped} skipped`
            : ''
        }.`,
      );
    } else {
      setCatalog(
        previousCatalog,
      );
    }
  }

  function changeServingQuantity(
    nextValue: number,
  ) {
    if (
      selectedIndex === null ||
      !selectedDish
    ) {
      return;
    }

    const currentServing =
      Math.max(
        0.01,
        numberValue(
          selectedDish.servingSize,
          1,
        ),
      );

    const nextServing =
      Math.max(
        0.01,
        nextValue || 0.01,
      );

    const ratio =
      nextServing /
      currentServing;

    const scaledIngredients =
      recipeIngredients(
        selectedDish,
      ).map(
        (ingredient) => {
          const currentQuantity =
            ingredientQuantity(
              ingredient,
            );

          const nextQuantity =
            Math.round(
              currentQuantity *
                ratio *
                1000000,
            ) / 1000000;

          return {
            ...ingredient,
            quantity:
              nextQuantity,
            qty:
              nextQuantity,
          };
        },
      );

    updateDish(
      selectedIndex,
      {
        servingSize:
          nextServing,
        ingredients:
          scaledIngredients,
      },
    );
  }

  function addIngredient() {
    if (
      selectedIndex ===
        null ||
      !selectedDish
    ) {
      return;
    }

    updateDish(
      selectedIndex,
      {
        ingredients: [
          ...recipeIngredients(
            selectedDish,
          ),
          {
            name:
              'New Ingredient',
            quantity: 1,
            unit: 'kg',
            marketRate: 0,
            rateUnit: 'kg',
          },
        ],
      },
    );
  }

  function removeIngredient(
    ingredientIndex: number,
  ) {
    if (
      selectedIndex ===
        null ||
      !selectedDish
    ) {
      return;
    }

    updateDish(
      selectedIndex,
      {
        ingredients:
          recipeIngredients(
            selectedDish,
          ).filter(
            (
              _,
              index,
            ) =>
              index !==
              ingredientIndex,
          ),
      },
    );
  }

  const bulkImportPreview =
    useMemo<BulkImportPreview>(
      () => {
        if (
          !catalog ||
          !bulkRecipes.trim()
        ) {
          return {
            recipes: [],
            invalidLines: 0,
            invalidRecipes: 0,
          };
        }

        return parseBulkRecipeImport(
          bulkRecipes,
          catalog,
          bulkRateOverrides,
        );
      },
      [
        bulkRecipes,
        catalog,
        bulkRateOverrides,
      ],
    );

  const bulkIngredientIssues =
    useMemo(
      () => {
        const issues =
          new Map<
            string,
            BulkImportIngredientPreview
          >();

        for (
          const recipe of
          bulkImportPreview.recipes
        ) {
          for (
            const ingredient of
            recipe.ingredients
          ) {
            if (
              ingredient.existsInMaster &&
              !ingredient.missingRate
            ) {
              continue;
            }

            const key =
              bulkIngredientKey(
                ingredient.name,
                ingredient.rateUnit,
              );

            if (!issues.has(key)) {
              issues.set(
                key,
                ingredient,
              );
            }
          }
        }

        return Array.from(
          issues.values(),
        );
      },
      [
        bulkImportPreview,
      ],
    );

  const bulkMissingRateCount =
    bulkIngredientIssues.filter(
      (ingredient) =>
        ingredient.missingRate,
    ).length;

  const bulkMissingMasterCount =
    bulkIngredientIssues.filter(
      (ingredient) =>
        !ingredient.existsInMaster,
    ).length;

  const bulkDuplicateIngredientCount =
    bulkImportPreview.recipes.reduce(
      (
        total,
        recipe,
      ) =>
        total +
        recipe.ingredients.filter(
          (ingredient) =>
            ingredient.duplicate,
        ).length,
      0,
    );

  const bulkDuplicateRecipeCount =
    bulkImportPreview.recipes.filter(
      (recipe) =>
        recipe.duplicateRecipe,
    ).length;

  async function addBulkRecipes() {
    if (!catalog) {
      return;
    }

    if (
      !bulkImportPreview
        .recipes.length
    ) {
      setError(
        'No valid recipes found. Use R | for recipe, I | for ingredient and G | for LPG.',
      );
      return;
    }

    if (
      bulkMissingRateCount > 0
    ) {
      setError(
        String(
          bulkMissingRateCount,
        ) +
        ' ingredient rate(s) are missing. Set the rate before Add All & Save.',
      );
      return;
    }

    if (
      bulkDuplicateIngredientCount >
      0
    ) {
      setError(
        String(
          bulkDuplicateIngredientCount,
        ) +
        ' duplicate ingredient line(s) found. Remove duplicates before saving.',
      );
      return;
    }

    const previousCatalog =
      catalog;

    const nextDishes:
      RawRow[] =
      catalog.dishes.map(
        (dish) => ({
          ...dish,
          ingredients:
            recipeIngredients(
              dish,
            ).map(
              (ingredient) => ({
                ...ingredient,
              }),
            ),
        }),
      );

    const nextRates:
      RawRow[] =
      catalog.rates.map(
        (rate) => ({
          ...rate,
        }),
      );

    const recipeIndexByName =
      new Map<string, number>(
        nextDishes.map(
          (dish, index) => [
            recipeName(dish)
              .trim()
              .toLowerCase(),
            index,
          ],
        ),
      );

    const nextCategories =
      new Set(
        catalog.categories,
      );

    const nextSubcategories:
      Record<string, string[]> = {
        ...catalog.subcategories,
      };

    let addedRecipes = 0;
    let updatedRecipes = 0;
    let copiedRecipes = 0;
    let skippedRecipes = 0;
    let ingredientCount = 0;
    let masterChanges = 0;
    let firstTouchedIndex:
      number | null =
      null;

    const makeCopyName = (
      originalName: string,
    ) => {
      let candidate =
        originalName + ' Copy';

      let suffix = 2;

      while (
        recipeIndexByName.has(
          candidate
            .toLowerCase(),
        )
      ) {
        candidate =
          originalName +
          ' Copy ' +
          String(suffix);

        suffix += 1;
      }

      return candidate;
    };

    for (
      const recipe of
      bulkImportPreview.recipes
    ) {
      const originalKey =
        recipe.name
          .trim()
          .toLowerCase();

      const existingIndex =
        recipeIndexByName.get(
          originalKey,
        );

      if (
        existingIndex !==
          undefined &&
        bulkDuplicateMode ===
          'skip'
      ) {
        skippedRecipes += 1;
        continue;
      }

      const isCopy =
        existingIndex !==
          undefined &&
        bulkDuplicateMode ===
          'copy';

      const targetName =
        isCopy
          ? makeCopyName(
              recipe.name,
            )
          : recipe.name;

      const importedIngredients =
        recipe.ingredients.map(
          (ingredient) => {
            const name =
              canonicalIngredientName(
                ingredient.name,
              );

            let rateIndex =
              nextRates.findIndex(
                (rate) =>
                  canonicalIngredientName(
                    text(
                      rate.name ||
                      rate.ingredientName,
                    ),
                  )
                    .toLowerCase() ===
                    name
                      .toLowerCase() &&
                  normalizeBulkRecipeUnit(
                    rate.unit ||
                    rate.rateUnit,
                  ) ===
                    ingredient.rateUnit,
              );

            if (
              rateIndex < 0
            ) {
              nextRates.push({
                id:
                  normalizeIngredientId(
                    name,
                    ingredient.rateUnit,
                  ),
                name,
                category:
                  inferIngredientCategory(
                    name,
                  ),
                rate:
                  Math.max(
                    0,
                    ingredient.rate,
                  ),
                unit:
                  ingredient.rateUnit,
              });

              rateIndex =
                nextRates.length -
                1;

              masterChanges += 1;
            } else {
              const currentRate =
                Math.max(
                  0,
                  numberValue(
                    nextRates[
                      rateIndex
                    ].rate ??
                    nextRates[
                      rateIndex
                    ].marketRate,
                  ),
                );

              if (
                !(currentRate > 0) &&
                ingredient.rate >= 0
              ) {
                nextRates[
                  rateIndex
                ] = {
                  ...nextRates[
                    rateIndex
                  ],
                  id:
                    normalizeIngredientId(
                      name,
                      ingredient.rateUnit,
                    ),
                  name,
                  category:
                    text(
                      nextRates[
                        rateIndex
                      ].category,
                    ) ||
                    inferIngredientCategory(
                      name,
                    ),
                  rate:
                    ingredient.rate,
                  unit:
                    ingredient.rateUnit,
                };

                masterChanges += 1;
              }
            }

            const master =
              nextRates[
                rateIndex
              ];

            const masterRate =
              Math.max(
                0,
                numberValue(
                  master.rate ??
                  master.marketRate,
                ),
              );

            const masterUnit =
              normalizeBulkRecipeUnit(
                master.unit ||
                master.rateUnit,
              ) ||
              ingredient.rateUnit;

            ingredientCount += 1;

            return {
              name,
              ingredientName:
                name,
              quantity:
                ingredient.quantity,
              qty:
                ingredient.quantity,
              unit:
                ingredient.unit,
              marketRate:
                masterRate,
              rate:
                masterRate,
              rateUnit:
                masterUnit,
              rateKey:
                text(master.id) ||
                normalizeIngredientId(
                  name,
                  masterUnit,
                ),
            };
          },
        );

      const gasPatch =
        recipe.gasKgPer100 !==
        null
          ? {
              gasKgPer100:
                recipe.gasKgPer100,
              gasNoGas:
                recipe.gasKgPer100 ===
                0,
              gasBurnerKgPerHour:
                '',
              gasCookingMinutes:
                '',
              gasBurnerCount:
                '',
              gasBatchPax:
                '',
            }
          : {};

      const recipePayload:
        RawRow = {
          dishName:
            targetName,
          name:
            targetName,
          category:
            recipe.category,
          subcategory:
            recipe.subcategory,
          baseGuests:
            recipe.baseGuests,
          servingSize:
            recipe.servingSize,
          servingUnit:
            recipe.servingUnit,
          pieceWeightGrams:
            recipe.pieceWeightGrams,
          ...gasPatch,
          dishRate: 0,
          ingredients:
            importedIngredients,
        };

      let touchedIndex:
        number;

      if (
        existingIndex !==
          undefined &&
        !isCopy
      ) {
        nextDishes[
          existingIndex
        ] = {
          ...nextDishes[
            existingIndex
          ],
          ...recipePayload,
        };

        touchedIndex =
          existingIndex;

        updatedRecipes += 1;
      } else {
        touchedIndex =
          nextDishes.length;

        nextDishes.push(
          recipePayload,
        );

        recipeIndexByName.set(
          targetName
            .toLowerCase(),
          touchedIndex,
        );

        if (isCopy) {
          copiedRecipes += 1;
        } else {
          addedRecipes += 1;
        }
      }

      if (
        firstTouchedIndex ===
        null
      ) {
        firstTouchedIndex =
          touchedIndex;
      }

      nextCategories.add(
        recipe.category,
      );

      if (
        recipe.subcategory
      ) {
        const existing =
          nextSubcategories[
            recipe.category
          ] || [];

        if (
          !existing.some(
            (item) =>
              item
                .toLowerCase() ===
              recipe.subcategory
                .toLowerCase(),
          )
        ) {
          nextSubcategories[
            recipe.category
          ] = [
            ...existing,
            recipe.subcategory,
          ];
        }
      }
    }

    const changedRecipes =
      addedRecipes +
      updatedRecipes +
      copiedRecipes;

    if (
      changedRecipes === 0
    ) {
      setError(
        skippedRecipes > 0
          ? 'All pasted recipes already exist and duplicate action is Skip.'
          : 'No recipe was imported.',
      );
      return;
    }

    const nextCatalog:
      RecipeCatalog = {
        ...catalog,
        dishes:
          nextDishes,
        rates:
          nextRates,
        categories:
          Array.from(
            nextCategories,
          ),
        subcategories:
          nextSubcategories,
    };

    setCatalog(
      nextCatalog,
    );

    memoryRecipeCatalog =
      nextCatalog;

    setQuery('');
    setCategory(
      'ALL',
    );

    if (
      firstTouchedIndex !==
      null
    ) {
      setSelectedIndex(
        firstTouchedIndex,
      );

      setRecipePage(
        recipePageForIndex(
          firstTouchedIndex,
        ),
      );
    }

    setError('');
    setMessage(
      'Validated. Saving recipes, Ingredient Master and Dish Master sync...',
    );

    const saved =
      await saveRecipes(
        nextCatalog,
      );

    if (!saved) {
      setCatalog(
        previousCatalog,
      );

      memoryRecipeCatalog =
        previousCatalog;

      return;
    }

    setBulkRecipes('');
    setBulkRateOverrides(
      {},
    );
    setShowBulkRecipes(
      false,
    );

    setMessage(
      String(addedRecipes) +
      ' new | ' +
      String(updatedRecipes) +
      ' updated | ' +
      String(copiedRecipes) +
      ' copied | ' +
      String(skippedRecipes) +
      ' skipped | ' +
      String(ingredientCount) +
      ' ingredients | ' +
      String(masterChanges) +
      ' Ingredient Master changes | saved and synced.',
    );
  }

  function addRecipe() {
    if (!catalog) {
      return;
    }

    const index =
      catalog.dishes.length;

    const dish = {
      dishName:
        'New Recipe',
      category:
        'Other',
      subcategory: '',
      baseGuests: 100,
      servingSize: 1,
      servingUnit:
        'serving',

      pieceWeightGrams: 0,

      dishRate: 0,
      ingredients: [],
    };

    setCatalog({
      ...catalog,

      dishes: [
        ...catalog.dishes,
        dish,
      ],
    });

    setQuery('');
    setCategory(
      'ALL',
    );
    setSelectedIndex(
      index,
    );

    setRecipePage(
      recipePageForIndex(
        index,
      ),
    );
  }

  async function deleteSelectedRecipe() {
    if (
      !catalog ||
      selectedIndex === null ||
      !selectedDish
    ) {
      return;
    }

    const name =
      recipeName(selectedDish);

    const confirmed =
      window.confirm(
        `Delete ${name}? This will delete both the Recipe and linked Dish.`,
      );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setMessage('');
    setError('');

    try {
      const response =
        await fetch(
          `/api/admin/dishes/item?name=${encodeURIComponent(
            name,
          )}`,
          {
            method: 'DELETE',
          },
        );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Could not delete recipe and dish.',
        );
      }

      try {
        localStorage.removeItem(
          RECIPE_CACHE_KEY,
        );
      } catch {
        // Cache is optional.
      }

      await loadRecipes();

      setMessage(
        `${name} recipe and linked dish deleted.`,
      );

      setSyncStatus('synced');

      setSyncMessage(
        '✓ Recipe and Dish removed together',
      );
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Could not delete recipe and dish.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveRecipes(
    catalogOverride?: RecipeCatalog,
  ): Promise<boolean> {
    const catalogToSave =
      catalogOverride ??
      catalog;

    if (!catalogToSave) {
      return false;
    }

    const invalidGasRecipe =
      catalogToSave.dishes.find(
        (dish) => {
          if (
            dish.gasNoGas ===
            true
          ) {
            return false;
          }

          const realValues = [
            optionalRecipeGasNumber(
              dish.gasBurnerKgPerHour,
            ),
            optionalRecipeGasNumber(
              dish.gasCookingMinutes,
            ),
            optionalRecipeGasNumber(
              dish.gasBurnerCount,
            ),
            optionalRecipeGasNumber(
              dish.gasBatchPax,
            ),
          ];

          const hasAny =
            realValues.some(
              (value) =>
                value !== null,
            );

          const complete =
            realValues.every(
              (value) =>
                value !== null &&
                value > 0,
            );

          return (
            hasAny &&
            !complete
          );
        },
      );

    if (invalidGasRecipe) {
      setError(
        `${recipeName(invalidGasRecipe)}: Real gas profile needs Burner kg/hour, Cooking minutes, Burners and Gas batch guests. Fill all 4 or clear all 4.`,
      );
      return false;
    }

    setSaving(true);
    setSyncStatus(
      'syncing',
    );
    setSyncMessage(
      'Saving and syncing to Dish Master…',
    );
    setMessage('');
    setError('');

    try {
      const response =
        await fetch(
          '/api/admin/recipes',
          {
            method:
              'PUT',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify(
                catalogToSave,
              ),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          'Could not save recipes.',
        );
      }

      try {
        localStorage.setItem(
          RECIPE_CACHE_KEY,
          JSON.stringify(catalogToSave),
        );

        if (
          new URLSearchParams(
            window.location.search,
          ).get('bulkCreate') ===
          '1'
        ) {
          localStorage.removeItem(
            BULK_RECIPE_DRAFT_KEY,
          );
        }

        if (
          data.updatedAt
        ) {
          localStorage.setItem(
            RECIPE_DISH_SYNC_KEY,
            String(
              data.updatedAt,
            ),
          );
        }
      } catch {
        // Cache is optional.
      }

      const syncedDishes =
        Math.max(
          0,
          Number(
            data.syncedDishes,
          ) || 0,
        );

      const activeDish =
        selectedIndex === null
          ? null
          : catalogToSave.dishes[
              selectedIndex
            ] || null;

      const activeGuests =
        activeDish
          ? Math.max(
              1,
              numberValue(
                activeDish.baseGuests,
                100,
              ),
            )
          : 100;

      const activeRate =
        activeDish
          ? applyRecipeWastage(
              recipeTotal(
                activeDish,
              ) /
                activeGuests,
            )
          : 0;

      const syncWarning =
        text(
          data.syncWarning,
        );

      const caterersOsSync =
        data.caterersOsSync &&
        typeof data.caterersOsSync ===
          'object'
          ? data.caterersOsSync as
              Record<string, unknown>
          : null;

      const caterersOsStatus =
        text(
          caterersOsSync?.status,
        );

      const caterersOsError =
        text(
          caterersOsSync?.error,
        );

      const caterersOsRecipeCount =
        Math.max(
          0,
          Number(
            caterersOsSync
              ?.recipeCount,
          ) || 0,
        );

      const caterersOsWorkspaceCount =
        Math.max(
          0,
          Number(
            caterersOsSync
              ?.workspaceCount,
          ) || 0,
        );

      const caterersOsFailedWorkspaceCount =
        Math.max(
          0,
          Number(
            caterersOsSync
              ?.failedWorkspaceCount,
          ) || 0,
        );

      if (syncWarning) {
        setSyncStatus(
          'error',
        );

        setSyncMessage(
          `✓ Recipes saved · ${syncWarning}`,
        );

        setMessage(
          activeDish
            ? `Saved successfully · ${recipeName(activeDish)} ${money(activeRate)}/plate. Dish Master sync did not finish.`
            : 'Saved successfully. Dish Master sync did not finish.',
        );
      } else if (
        caterersOsStatus ===
          'failed' ||
        caterersOsStatus ===
          'partial'
      ) {
        setSyncStatus(
          'error',
        );

        setSyncMessage(
          caterersOsStatus ===
            'partial'
            ? `✓ Dish Master synced · CaterersOS updated ${caterersOsWorkspaceCount} workspace${caterersOsWorkspaceCount === 1 ? '' : 's'} · ${caterersOsFailedWorkspaceCount} failed`
            : `✓ Dish Master synced · CaterersOS sync failed${ 
                caterersOsError
                  ? `: ${caterersOsError}`
                  : ''
              }`,
        );

        setMessage(
          activeDish
            ? `Saved · ${recipeName(activeDish)} ${money(activeRate)}/plate. CaterersOS recipe sync did not finish for every linked workspace.`
            : 'Saved successfully. CaterersOS recipe sync did not finish for every linked workspace.',
        );
      } else {
        setSyncStatus(
          'synced',
        );

        const caterersOsSuffix =
          caterersOsStatus ===
          'synced'
            ? ` · ${caterersOsRecipeCount} recipe${ 
                caterersOsRecipeCount === 1
                  ? ''
                  : 's'
              } synced to ${caterersOsWorkspaceCount} CaterersOS workspace${caterersOsWorkspaceCount === 1 ? '' : 's'}`
            : caterersOsStatus ===
              'not_configured'
              ? ' · No CaterersOS workspaces linked'
              : '';

        setSyncMessage(
          `✓ ${syncedDishes} recipe${ 
            syncedDishes === 1
              ? ''
              : 's'
          } synced to Dish Master${caterersOsSuffix}`,
        );

        setMessage(
          syncedDishes > 0
            ? `Saved · Synced to Dish Master: ${syncedDishes} recipe${ 
                syncedDishes === 1
                  ? ''
                  : 's'
              }${ 
                activeDish
                  ? ` · ${recipeName(activeDish)} ${money(activeRate)}/plate`
                  : ''
              }${ 
                caterersOsStatus ===
                'synced'
                  ? ' · CaterersOS updated'
                  : ''
              }.`
            : caterersOsStatus ===
              'synced'
              ? 'Saved · CaterersOS recipe catalog updated.'
              : 'Saved successfully.',
        );
      }

      return true;
    } catch (
      saveError
    ) {
      setSyncStatus(
        'error',
      );

      setSyncMessage(
        'Sync failed — save again to retry.',
      );

      setError(
        saveError instanceof
          Error
          ? saveError.message
          : 'Could not save recipes.',
      );

      return false;
    } finally {
      setSaving(false);
    }
  }

  const ingredients =
    selectedDish
      ? recipeIngredients(
          selectedDish,
        )
      : [];

  const totalCost =
    selectedDish
      ? recipeTotal(
          selectedDish,
        )
      : 0;

  const guests =
    Math.max(
      1,
      numberValue(
        selectedDish
          ?.baseGuests,
        100,
      ),
    );

  const rawPerPerson =
    totalCost /
    guests;

  const finalPerPerson =
    applyRecipeWastage(
      rawPerPerson,
    );

  const wastagePerPerson =
    Math.max(
      0,
      finalPerPerson -
        Math.round(
          rawPerPerson *
            100,
        ) /
          100,
    );

  const finalTotalCost =
    finalPerPerson *
    guests;

  const missingRateCount =
    ingredients.filter(
      (ingredient) =>
        !(
          ingredientRate(
            ingredient,
          ) > 0
        ),
    ).length;

  const estimatedRateCount =
    ingredients.filter(
      (ingredient) =>
        text(
          ingredient.rateSource,
        ) ===
        'category_estimate',
    ).length;

  const qualityRecipe =
    selectedDish
      ? readCostableRecipe(
          selectedDish,
        )
      : null;

  const recipeQuality =
    assessRecipeQuality(
      qualityRecipe,
      {
        missingRates:
          missingRateCount,

        estimatedRates:
          estimatedRateCount,

        costPerPlate:
          finalPerPerson,
      },
    );

  const selectedCategory =
    text(
      selectedDish?.category,
    ) ||
    'Other';

  const selectedSubcategory =
    text(
      selectedDish
        ?.subcategory,
    );

  const gasPreview =
    recipeGasPreview(
      selectedDish,
      selectedCategory,
      guests,
      gasSetting,
      gasCategoryRates,
    );

  const explicitGasProfileCount =
    useMemo(
      () =>
        (
          catalog
            ?.dishes ||
          []
        ).filter(
          (dish) =>
            dish.gasNoGas ===
              true ||
            hasRealRecipeGas(
              dish,
            ) ||
            (
              optionalRecipeGasNumber(
                dish.gasKgPer100,
              ) !== null &&
              Number(
                dish.gasKgPer100,
              ) > 0
            ),
        ).length,
      [catalog],
    );

  const smartDraftCount =
    useMemo(
      () =>
        (
          catalog?.dishes ||
          []
        ).filter(
          (dish) =>
            dish.generatedRecipe ===
            true,
        ).length,
      [catalog],
    );

  const blankSmartDraftCount =
    useMemo(
      () =>
        (
          catalog?.dishes ||
          []
        ).filter(
          (dish) =>
            recipeIngredients(
              dish,
            ).length === 0 &&
            dish.generatedRecipe !==
              true,
        ).length,
      [catalog],
    );

  const selectedIngredientRateCoverage =
    ingredients.length
      ? Math.round(
          (
            (
              ingredients.length -
              missingRateCount
            ) /
            ingredients.length
          ) *
          100,
        )
      : 100;

  const selectedSubcategories =
    Array.from(
      new Set([
        ...(
          catalog
            ?.subcategories?.[
              selectedCategory
            ] ||
          []
        ),

        ...(
          selectedSubcategory
            ? [
                selectedSubcategory,
              ]
            : []
        ),
      ]),
    ).sort(
      (a, b) =>
        a.localeCompare(
          b,
        ),
    );

  return (
    <AppShell
      title="Recipes"
      subtitle="Fast recipe costing workspace"
      hidePageTitle
    >
      <section className="recipe-fast-page">
        <style>{`
          .recipe-fast-page {
            display:grid;
            gap:14px;
            max-width:1480px;
            margin:0 auto;
            padding-bottom:88px;
          }

          .recipe-fast-hero {
            position:sticky;
            top:0;
            z-index:8;
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:18px;
            padding:12px 14px;
            border:1px solid #27313d;
            border-radius:16px;
            background:rgba(13,18,24,.94);
            backdrop-filter:blur(18px);
            box-shadow:0 12px 34px rgba(0,0,0,.18);
          }

          .recipe-fast-kicker {
            color:#6eabff;
            font-size:10px;
            font-weight:900;
            letter-spacing:.1em;
            text-transform:uppercase;
          }

          .recipe-fast-hero h1 {
            margin:3px 0 2px;
            font-size:24px;
            letter-spacing:-.04em;
          }

          .recipe-fast-hero p {
            margin:0;
            color:#8995a4;
            font-size:10px;
          }

          .recipe-fast-actions {
            display:flex;
            gap:7px;
            align-items:center;
          }

          .recipe-fast-button {
            min-height:38px;
            padding:0 12px;
            border:1px solid #303944;
            border-radius:10px;
            background:#151b23;
            color:#dce5ef;
            font:inherit;
            font-size:10px;
            font-weight:850;
            cursor:pointer;
            transition:border-color .16s ease, background .16s ease, transform .16s ease;
          }

          .recipe-fast-button:hover:not(:disabled) {
            border-color:#4b5b6d;
            background:#1b232d;
          }

          .recipe-fast-button:active:not(:disabled) {
            transform:translateY(1px);
          }

          .recipe-fast-button.primary {
            border-color:#1478f2;
            background:#1478f2;
            color:#fff;
          }

          .recipe-fast-button:disabled {
            opacity:.55;
            cursor:wait;
          }

          .recipe-fast-actions {
            flex-wrap:wrap;
          }

          .recipe-fast-bulk-recipes {
            display:grid;
            gap:10px;
            padding:14px;
            border:1px solid #303944;
            border-radius:14px;
            background:#10161e;
          }

          .recipe-fast-bulk-head {
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:12px;
          }

          .recipe-fast-bulk-head div {
            display:grid;
            gap:3px;
          }

          .recipe-fast-bulk-head strong {
            font-size:14px;
          }

          .recipe-fast-bulk-head span {
            color:#8995a4;
            font-size:10px;
          }

          .recipe-fast-bulk-textarea {
            width:100%;
            min-height:170px;
            resize:vertical;
            padding:12px;
            border:1px solid #303844;
            border-radius:10px;
            outline:0;
            background:#0b1016;
            color:#e7edf4;
            font:inherit;
            font-size:11px;
            line-height:1.6;
          }

          .recipe-fast-bulk-textarea:focus {
            border-color:#428de8;
          }

          .recipe-fast-bulk-footer {
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:12px;
          }

          .recipe-fast-bulk-footer small {
            color:#7f8b99;
            font-size:9px;
          }

          .recipe-bulk-options {
            display:grid;
            grid-template-columns:minmax(220px,300px) 1fr;
            gap:10px;
            align-items:end;
          }

          .recipe-bulk-option {
            display:grid;
            gap:5px;
          }

          .recipe-bulk-option label {
            color:#8190a0;
            font-size:8px;
            font-weight:900;
            text-transform:uppercase;
          }

          .recipe-bulk-summary {
            display:grid;
            grid-template-columns:repeat(5,minmax(0,1fr));
            gap:7px;
          }

          .recipe-bulk-summary div {
            padding:9px 10px;
            border:1px solid #29333e;
            border-radius:10px;
            background:#0d1319;
          }

          .recipe-bulk-summary span,
          .recipe-bulk-summary b {
            display:block;
          }

          .recipe-bulk-summary span {
            color:#758495;
            font-size:8px;
            text-transform:uppercase;
          }

          .recipe-bulk-summary b {
            margin-top:3px;
            font-size:12px;
          }

          .recipe-bulk-issues {
            display:grid;
            gap:7px;
            padding:10px;
            border:1px solid rgba(255,159,10,.28);
            border-radius:11px;
            background:rgba(255,159,10,.055);
          }

          .recipe-bulk-issues strong {
            font-size:11px;
          }

          .recipe-bulk-issue-list {
            display:grid;
            gap:5px;
            max-height:220px;
            overflow:auto;
          }

          .recipe-bulk-issue-row {
            display:grid;
            grid-template-columns:minmax(150px,1fr) auto minmax(110px,150px);
            gap:7px;
            align-items:center;
            padding:7px 8px;
            border:1px solid rgba(255,255,255,.07);
            border-radius:9px;
            background:rgba(5,8,12,.28);
          }

          .recipe-bulk-issue-row b {
            font-size:10px;
          }

          .recipe-bulk-badges {
            display:flex;
            flex-wrap:wrap;
            gap:4px;
          }

          .recipe-bulk-badge {
            padding:3px 6px;
            border:1px solid #394552;
            border-radius:999px;
            color:#9cacbd;
            font-size:7px;
            font-weight:900;
            text-transform:uppercase;
          }

          .recipe-bulk-badge.warn {
            border-color:rgba(255,159,10,.35);
            color:#ffc267;
          }

          .recipe-bulk-badge.good {
            border-color:rgba(52,199,89,.3);
            color:#8ee6a5;
          }

          .recipe-bulk-rate-input {
            width:100%;
            min-height:34px;
            padding:0 9px;
            border:1px solid #3a4653;
            border-radius:8px;
            outline:0;
            background:#0b1016;
            color:#eef5ff;
            font:inherit;
            font-size:10px;
            text-align:right;
          }

          .recipe-bulk-rate-input:focus {
            border-color:#409cff;
          }

          .recipe-bulk-preview {
            display:grid;
            gap:7px;
            max-height:520px;
            overflow:auto;
          }

          .recipe-bulk-preview-card {
            display:grid;
            gap:8px;
            padding:10px;
            border:1px solid #2a3540;
            border-radius:11px;
            background:#0d1319;
          }

          .recipe-bulk-preview-head {
            display:flex;
            justify-content:space-between;
            align-items:flex-start;
            gap:10px;
          }

          .recipe-bulk-preview-head b,
          .recipe-bulk-preview-head span {
            display:block;
          }

          .recipe-bulk-preview-head b {
            font-size:11px;
          }

          .recipe-bulk-preview-head span {
            margin-top:2px;
            color:#758495;
            font-size:8px;
          }

          .recipe-bulk-preview-kpis {
            display:grid;
            grid-template-columns:repeat(5,minmax(0,1fr));
            gap:6px;
          }

          .recipe-bulk-preview-kpis div {
            padding:7px 8px;
            border:1px solid #25303b;
            border-radius:8px;
            background:#10171f;
          }

          .recipe-bulk-preview-kpis span,
          .recipe-bulk-preview-kpis b {
            display:block;
          }

          .recipe-bulk-preview-kpis span {
            color:#718091;
            font-size:7px;
            text-transform:uppercase;
          }

          .recipe-bulk-preview-kpis b {
            margin-top:3px;
            font-size:10px;
          }

          .recipe-fast-sync {
            padding:8px 11px;
            border:1px solid #29333e;
            border-radius:10px;
            background:#0f151c;
            color:#8794a3;
            font-size:9px;
            font-weight:800;
          }

          .recipe-fast-sync.synced {
            border-color:rgba(52,199,89,.25);
            background:rgba(52,199,89,.07);
            color:#8ee6a5;
          }

          .recipe-fast-sync.syncing {
            border-color:rgba(64,156,255,.25);
            background:rgba(64,156,255,.07);
            color:#8cc5ff;
          }

          .recipe-fast-sync.error {
            border-color:rgba(255,90,90,.25);
            background:rgba(255,90,90,.07);
            color:#ff9b94;
          }

          .recipe-fast-message {
            padding:10px 12px;
            border:1px solid rgba(52,199,89,.22);
            border-radius:10px;
            background:rgba(52,199,89,.07);
            color:#8ee6a5;
            font-size:11px;
          }

          .recipe-fast-error {
            padding:10px 12px;
            border:1px solid rgba(255,90,90,.25);
            border-radius:10px;
            background:rgba(255,90,90,.07);
            color:#ff9b94;
            font-size:11px;
          }

          .recipe-fast-stats {
            display:grid;
            grid-template-columns:repeat(4,minmax(0,1fr));
            gap:8px;
          }

          .recipe-fast-stat {
            position:relative;
            overflow:hidden;
            padding:12px 13px;
            border:1px solid #28323d;
            border-radius:13px;
            background:linear-gradient(180deg,#111820,#0e141b);
          }

          .recipe-fast-stat::after {
            content:'';
            position:absolute;
            inset:auto 0 0;
            height:2px;
            background:linear-gradient(90deg,rgba(64,156,255,.7),transparent);
            opacity:.55;
          }

          .recipe-fast-stat small,
          .recipe-fast-stat strong {
            display:block;
          }

          .recipe-fast-stat small {
            color:#7f8b99;
            font-size:8px;
            font-weight:850;
            text-transform:uppercase;
          }

          .recipe-fast-stat strong {
            margin-top:5px;
            font-size:19px;
          }

          .recipe-fast-toolbar {
            display:grid;
            grid-template-columns:minmax(260px,1fr) 220px auto;
            gap:8px;
            align-items:center;
            padding:9px;
            border:1px solid #27313b;
            border-radius:13px;
            background:#0f151c;
          }

          .recipe-toolbar-count {
            min-width:120px;
            text-align:right;
            color:#7f8b99;
            font-size:9px;
            font-weight:800;
          }

          .recipe-fast-input {
            width:100%;
            min-height:42px;
            padding:0 11px;
            border:1px solid #303844;
            border-radius:10px;
            outline:0;
            background:#151b23;
            color:#e7edf4;
            font:inherit;
            font-size:12px;
            color-scheme:dark;
          }

          .recipe-fast-input:focus {
            border-color:#428de8;
          }

          .recipe-gas-quick {
            display:grid;
            gap:10px;
            padding:12px;
            border:1px solid rgba(64,156,255,.3);
            border-radius:14px;
            background:linear-gradient(180deg,rgba(64,156,255,.07),#0e141b 36%);
            box-shadow:0 12px 34px rgba(0,0,0,.15);
          }

          .recipe-gas-quick-head {
            display:flex;
            align-items:flex-start;
            justify-content:space-between;
            gap:16px;
          }

          .recipe-gas-quick-head h2 {
            margin:0 0 3px;
            font-size:18px;
            letter-spacing:-.03em;
          }

          .recipe-gas-quick-head p {
            margin:0;
            color:#7f8b99;
            font-size:9px;
          }

          .recipe-gas-quick-tools {
            display:grid;
            grid-template-columns:minmax(110px,150px) auto auto;
            gap:7px;
            align-items:center;
          }

          .recipe-gas-quick-table {
            overflow:auto;
            max-height:calc(100vh - 330px);
            border:1px solid #27313b;
            border-radius:11px;
            background:#0d1319;
          }

          .recipe-gas-quick-row {
            display:grid;
            grid-template-columns:minmax(220px,1.7fr) minmax(120px,.6fr) minmax(130px,.65fr) minmax(90px,.5fr);
            gap:8px;
            align-items:center;
            min-height:46px;
            padding:6px 9px;
            border-bottom:1px solid #202a34;
          }

          .recipe-gas-quick-row.header {
            position:sticky;
            top:0;
            z-index:2;
            min-height:36px;
            background:#111923;
            color:#758495;
            font-size:8px;
            font-weight:900;
            text-transform:uppercase;
            letter-spacing:.05em;
          }

          .recipe-gas-quick-name b,
          .recipe-gas-quick-name span {
            display:block;
          }

          .recipe-gas-quick-name b {
            overflow:hidden;
            text-overflow:ellipsis;
            white-space:nowrap;
            font-size:10px;
          }

          .recipe-gas-quick-name span {
            margin-top:2px;
            color:#718091;
            font-size:8px;
          }

          .recipe-gas-quick-input {
            width:100%;
            min-height:34px;
            padding:0 10px;
            border:1px solid #33404c;
            border-radius:8px;
            outline:none;
            background:#0a1016;
            color:#eef5ff;
            font:inherit;
            font-size:12px;
            font-weight:800;
            text-align:right;
          }

          .recipe-gas-quick-input:focus {
            border-color:#409cff;
            box-shadow:0 0 0 3px rgba(64,156,255,.12);
          }

          .recipe-gas-quick-cost {
            text-align:right;
          }

          .recipe-gas-quick-cost b,
          .recipe-gas-quick-cost span {
            display:block;
          }

          .recipe-gas-quick-cost b {
            font-size:10px;
          }

          .recipe-gas-quick-cost span {
            margin-top:2px;
            color:#718091;
            font-size:7px;
          }

          .recipe-gas-quick-pager {
            display:grid;
            grid-template-columns:1fr auto 1fr;
            gap:7px;
            align-items:center;
          }

          .recipe-gas-quick-pager span {
            color:#7f8b99;
            font-size:9px;
            font-weight:800;
            text-align:center;
          }

          .recipe-fast-workspace {
            display:grid;
            grid-template-columns:350px minmax(0,1fr);
            gap:12px;
            min-height:620px;
            align-items:start;
          }

          .recipe-fast-list,
          .recipe-fast-editor {
            border:1px solid #28323d;
            border-radius:15px;
            background:#0f141b;
            overflow:hidden;
            box-shadow:0 10px 30px rgba(0,0,0,.12);
          }

          .recipe-fast-list {
            position:sticky;
            top:84px;
            max-height:calc(100vh - 110px);
            overflow:auto;
          }

          .recipe-list-head {
            position:sticky;
            top:0;
            z-index:2;
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:10px;
            padding:10px 12px;
            border-bottom:1px solid #26303a;
            background:rgba(15,20,27,.96);
            backdrop-filter:blur(12px);
          }

          .recipe-list-head strong {
            font-size:10px;
          }

          .recipe-list-head span {
            color:#738191;
            font-size:8px;
          }

          .recipe-fast-row {
            width:100%;
            display:block;
            padding:11px 12px;
            border:0;
            border-left:3px solid transparent;
            border-bottom:1px solid #222a33;
            background:transparent;
            color:#dce4ed;
            text-align:left;
            cursor:pointer;
            transition:background .15s ease,border-color .15s ease;
          }

          .recipe-fast-row:hover {
            background:#141d27;
          }

          .recipe-fast-row.active {
            border-left-color:#409cff;
            background:linear-gradient(90deg,rgba(64,156,255,.12),#17212d 42%);
          }

          .recipe-fast-row b,
          .recipe-fast-row span {
            display:block;
          }

          .recipe-fast-row-main {
            display:flex;
            align-items:flex-start;
            justify-content:space-between;
            gap:10px;
          }

          .recipe-fast-row-copy {
            min-width:0;
            flex:1 1 auto;
          }

          .recipe-fast-row b {
            font-size:11px;
          }

          .recipe-fast-row span {
            margin-top:3px;
            color:#7f8b99;
            font-size:9px;
          }

          .recipe-fast-row-metrics {
            flex:0 0 auto;
            display:grid;
            grid-template-columns:repeat(2,minmax(68px,1fr));
            gap:5px;
          }

          .recipe-fast-row-metric {
            min-width:68px;
            padding:5px 7px;
            border:1px solid #2a3540;
            border-radius:9px;
            background:#111820;
            text-align:right;
          }

          .recipe-fast-row-metric.gas {
            border-color:rgba(64,156,255,.23);
            background:rgba(64,156,255,.07);
          }

          .recipe-fast-row-metric b {
            font-size:10px;
          }

          .recipe-fast-row-metric.gas b {
            color:#9dcbff;
          }

          .recipe-fast-row-metric span {
            margin-top:1px;
            color:#718398;
            font-size:7px;
            font-weight:800;
            text-transform:uppercase;
          }

          .recipe-fast-editor {
            padding:16px;
            overflow:visible;
          }

          .recipe-editor-summary {
            display:flex;
            align-items:flex-start;
            justify-content:space-between;
            gap:16px;
            margin:-2px 0 14px;
            padding:13px 14px;
            border:1px solid #293440;
            border-radius:13px;
            background:linear-gradient(135deg,#121a23,#0f151c);
          }

          .recipe-editor-summary-copy {
            min-width:0;
          }

          .recipe-editor-summary-copy span {
            color:#6eabff;
            font-size:8px;
            font-weight:900;
            letter-spacing:.08em;
            text-transform:uppercase;
          }

          .recipe-editor-summary-copy h2 {
            margin:4px 0 3px;
            overflow:hidden;
            text-overflow:ellipsis;
            white-space:nowrap;
            font-size:20px;
            letter-spacing:-.035em;
          }

          .recipe-editor-summary-copy p {
            margin:0;
            color:#7f8b99;
            font-size:9px;
          }

          .recipe-editor-summary-kpis {
            display:grid;
            grid-template-columns:repeat(3,minmax(90px,1fr));
            gap:6px;
          }

          .recipe-editor-summary-kpis div {
            padding:8px 9px;
            border:1px solid #2c3742;
            border-radius:9px;
            background:#0d1319;
          }

          .recipe-editor-summary-kpis span,
          .recipe-editor-summary-kpis b {
            display:block;
          }

          .recipe-editor-summary-kpis span {
            color:#748292;
            font-size:7px;
            text-transform:uppercase;
          }

          .recipe-editor-summary-kpis b {
            margin-top:3px;
            font-size:11px;
          }

          .recipe-section-title {
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:10px;
            margin:14px 0 8px;
          }

          .recipe-section-title strong {
            font-size:11px;
          }

          .recipe-section-title span {
            color:#718091;
            font-size:8px;
          }

          .recipe-fast-grid {
            display:grid;
            grid-template-columns:2fr 1fr 1fr 1fr;
            gap:8px;
            padding:12px;
            border:1px solid #28323d;
            border-radius:12px;
            background:#10161d;
          }

          .recipe-fast-field {
            display:grid;
            gap:5px;
          }

          .recipe-fast-field label {
            color:#7f8b99;
            font-size:8px;
            font-weight:850;
            text-transform:uppercase;
          }

          .recipe-fast-costs {
            display:grid;
            grid-template-columns:repeat(4,1fr);
            gap:7px;
            margin:10px 0 12px;
          }

          .recipe-fast-cost {
            padding:11px;
            border:1px solid #293540;
            border-radius:10px;
            background:linear-gradient(180deg,#141b23,#11171e);
          }

          .recipe-fast-cost.primary-cost {
            border-color:rgba(52,199,89,.3);
            background:rgba(52,199,89,.065);
          }

          .recipe-fast-cost span,
          .recipe-fast-cost b {
            display:block;
          }

          .recipe-fast-cost span {
            color:#788593;
            font-size:8px;
            text-transform:uppercase;
          }

          .recipe-fast-cost b {
            margin-top:4px;
            font-size:14px;
          }

          .recipe-gas-panel {
            display:grid;
            gap:11px;
            margin:10px 0 14px;
            padding:13px;
            border:1px solid rgba(64,156,255,.24);
            border-radius:12px;
            background:linear-gradient(180deg,rgba(64,156,255,.065),rgba(64,156,255,.025));
          }

          .recipe-gas-head {
            display:flex;
            align-items:flex-start;
            justify-content:space-between;
            gap:12px;
          }

          .recipe-gas-head > div:first-child {
            display:grid;
            gap:3px;
          }

          .recipe-gas-head strong {
            font-size:13px;
          }

          .recipe-gas-head small {
            color:#8190a0;
            font-size:9px;
          }

          .recipe-gas-source {
            flex:0 0 auto;
            padding:5px 8px;
            border:1px solid rgba(64,156,255,.28);
            border-radius:999px;
            color:#8cc5ff;
            background:rgba(64,156,255,.08);
            font-size:8px;
            font-weight:900;
            letter-spacing:.04em;
          }

          .recipe-gas-stats {
            display:grid;
            grid-template-columns:repeat(4,minmax(0,1fr));
            gap:7px;
          }

          .recipe-gas-stat {
            padding:9px 10px;
            border:1px solid #29323d;
            border-radius:10px;
            background:#111820;
          }

          .recipe-gas-stat span,
          .recipe-gas-stat b,
          .recipe-gas-stat small {
            display:block;
          }

          .recipe-gas-stat span {
            color:#788593;
            font-size:8px;
            text-transform:uppercase;
          }

          .recipe-gas-stat b {
            margin-top:4px;
            font-size:13px;
          }

          .recipe-gas-stat small {
            margin-top:2px;
            color:#788593;
            font-size:8px;
          }

          .recipe-gas-fields {
            display:grid;
            grid-template-columns:repeat(5,minmax(110px,1fr));
            gap:7px;
          }

          .recipe-gas-no-gas {
            display:flex;
            align-items:center;
            gap:9px;
            padding:9px 10px;
            border:1px solid #303944;
            border-radius:10px;
            background:#10161e;
          }

          .recipe-gas-no-gas input {
            width:17px;
            height:17px;
            flex:0 0 auto;
          }

          .recipe-gas-no-gas > span {
            display:grid;
            gap:2px;
            font-size:10px;
            font-weight:850;
          }

          .recipe-gas-no-gas small {
            color:#7f8b99;
            font-size:8px;
            font-weight:650;
          }

          .recipe-smart-draft {
            display:grid;
            grid-template-columns:minmax(0,1fr) auto auto;
            align-items:center;
            gap:12px;
            padding:13px 14px;
            border:1px solid rgba(64,156,255,.28);
            border-radius:14px;
            background:linear-gradient(135deg,rgba(64,156,255,.10),rgba(14,20,27,.96));
          }

          .recipe-smart-draft-copy {
            min-width:0;
          }

          .recipe-smart-draft-copy span {
            color:#6eabff;
            font-size:9px;
            font-weight:900;
            letter-spacing:.08em;
            text-transform:uppercase;
          }

          .recipe-smart-draft-copy h3 {
            margin:4px 0 3px;
            font-size:14px;
            letter-spacing:-.02em;
          }

          .recipe-smart-draft-copy p {
            margin:0;
            color:#8995a4;
            font-size:9px;
            line-height:1.5;
          }

          .recipe-smart-draft-status {
            display:grid;
            min-width:88px;
            gap:2px;
            padding:8px 10px;
            border:1px solid rgba(157,178,204,.13);
            border-radius:10px;
            text-align:center;
          }

          .recipe-smart-draft-actions {
            display:grid;
            gap:6px;
            min-width:150px;
          }

          .recipe-smart-draft-actions .recipe-fast-button {
            width:100%;
          }

          .recipe-smart-draft-status b {
            font-size:10px;
          }

          .recipe-smart-draft-status span {
            color:#7f8b99;
            font-size:8px;
          }

          @media (max-width:760px) {
            .recipe-smart-draft {
              grid-template-columns:1fr;
              align-items:stretch;
            }

            .recipe-smart-draft-status {
              width:max-content;
            }

            .recipe-smart-draft .recipe-fast-button {
              width:100%;
            }
          }
          .recipe-fast-quality {
            display:none;
            gap:9px;
            margin:0 0 14px;
            padding:12px;
            border:1px solid #303944;
            border-radius:12px;
            background:#111820;
          }

          .recipe-fast-quality.ready {
            border-color:rgba(52,199,89,.32);
            background:rgba(52,199,89,.06);
          }

          .recipe-fast-quality.review {
            border-color:rgba(255,159,10,.34);
            background:rgba(255,159,10,.06);
          }

          .recipe-fast-quality.blocked {
            border-color:rgba(255,69,58,.34);
            background:rgba(255,69,58,.06);
          }

          .recipe-fast-quality-head {
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:10px;
          }

          .recipe-fast-quality-head strong {
            font-size:12px;
          }

          .recipe-fast-quality-badge {
            padding:5px 8px;
            border:1px solid #3b4653;
            border-radius:999px;
            font-size:9px;
            font-weight:900;
          }

          .recipe-fast-quality.ready
          .recipe-fast-quality-badge {
            color:#8ee6a5;
          }

          .recipe-fast-quality.review
          .recipe-fast-quality-badge {
            color:#ffc267;
          }

          .recipe-fast-quality.blocked
          .recipe-fast-quality-badge {
            color:#ff9b94;
          }

          .recipe-fast-quality-metrics {
            display:grid;
            grid-template-columns:repeat(3,1fr);
            gap:6px;
          }

          .recipe-fast-quality-metrics div {
            padding:8px;
            border:1px solid #29323d;
            border-radius:9px;
            background:rgba(0,0,0,.12);
          }

          .recipe-fast-quality-metrics span,
          .recipe-fast-quality-metrics b {
            display:block;
          }

          .recipe-fast-quality-metrics span {
            color:#788593;
            font-size:8px;
            text-transform:uppercase;
          }

          .recipe-fast-quality-metrics b {
            margin-top:3px;
            font-size:11px;
          }

          .recipe-fast-quality-issues {
            display:grid;
            gap:4px;
            margin:0;
            padding-left:18px;
            color:#aab4c0;
            font-size:10px;
          }

          .recipe-fast-heading {
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:10px;
            margin:18px 0 8px;
            padding-top:2px;
          }

          .recipe-fast-heading h2 {
            margin:0;
            font-size:14px;
          }

          .recipe-fast-ingredient {
            display:grid;
            grid-template-columns:2fr .7fr .7fr .8fr .7fr auto;
            gap:6px;
            align-items:end;
            padding:9px;
            margin-bottom:6px;
            border:1px solid #252f39;
            border-radius:10px;
            background:#0d1319;
          }

          .recipe-fast-remove {
            width:36px;
            min-height:38px;
            border:1px solid rgba(255,90,90,.2);
            border-radius:9px;
            background:rgba(255,90,90,.06);
            color:#ff8e88;
            cursor:pointer;
          }

          .recipe-fast-empty {
            display:grid;
            min-height:360px;
            place-items:center;
            color:#7f8b99;
            font-size:11px;
          }

          @media(max-width:1100px) {
            .recipe-gas-fields {
              grid-template-columns:repeat(3,minmax(110px,1fr));
            }
          }

          @media(max-width:900px) {
            .recipe-gas-stats {
              grid-template-columns:1fr 1fr;
            }

            .recipe-fast-workspace {
              grid-template-columns:1fr;
            }

            .recipe-fast-list {
              position:static;
              max-height:300px;
            }

            .recipe-editor-summary {
              flex-direction:column;
            }

            .recipe-editor-summary-kpis {
              width:100%;
            }

            .recipe-fast-stats {
              grid-template-columns:1fr 1fr;
            }

            .recipe-fast-grid {
              grid-template-columns:1fr;
            }

            .recipe-fast-ingredient {
              grid-template-columns:1fr 1fr;
            }
          }

          @media(max-width:620px) {
            .recipe-bulk-options {
              grid-template-columns:1fr;
            }

            .recipe-bulk-summary,
            .recipe-bulk-preview-kpis {
              grid-template-columns:1fr 1fr;
            }

            .recipe-bulk-issue-row {
              grid-template-columns:1fr;
            }

            .recipe-fast-bulk-footer {
              align-items:stretch;
              flex-direction:column;
            }

            .recipe-gas-quick-head {
              flex-direction:column;
            }

            .recipe-gas-quick-tools {
              width:100%;
              grid-template-columns:1fr;
            }

            .recipe-gas-quick-table {
              max-height:none;
            }

            .recipe-gas-quick-row {
              grid-template-columns:minmax(155px,1.4fr) minmax(100px,.8fr) minmax(105px,.8fr);
              min-width:520px;
            }

            .recipe-gas-quick-row > :nth-child(4) {
              display:none;
            }

            .recipe-fast-page {
              padding-bottom:40px;
            }

            .recipe-fast-hero {
              position:static;
              padding:12px;
            }

            .recipe-editor-summary-kpis {
              grid-template-columns:1fr;
            }

            .recipe-gas-head {
              flex-direction:column;
            }

            .recipe-gas-fields {
              grid-template-columns:1fr;
            }

            .recipe-fast-hero {
              align-items:stretch;
              flex-direction:column;
            }

            .recipe-fast-actions {
              display:grid;
              grid-template-columns:1fr 1fr;
            }

            .recipe-fast-toolbar {
              grid-template-columns:1fr;
            }

            .recipe-fast-costs {
              grid-template-columns:1fr 1fr;
            }

            .recipe-fast-stats {
              grid-template-columns:1fr 1fr;
            }

            .recipe-fast-toolbar {
              padding:8px;
            }

            .recipe-toolbar-count {
              text-align:left;
            }

            .recipe-fast-row-main {
              align-items:stretch;
              flex-direction:column;
            }

            .recipe-fast-row-metrics {
              grid-template-columns:1fr 1fr;
            }

            .recipe-fast-row-metric {
              text-align:left;
            }
          }
        `}</style>

        <div className="recipe-fast-hero">
          <div>
            <span className="recipe-fast-kicker">
              Recipe Costing Workspace
            </span>

            <h1>
              Recipes
            </h1>

            <p>
              Ingredients, food cost and LPG cost in one place.
            </p>
          </div>

          <div className="recipe-fast-actions">
            {typeof window !== 'undefined' &&
            new URLSearchParams(window.location.search).get('from') === 'dishes' ? (
              <button
                className="recipe-fast-button"
                type="button"
                onClick={() =>
                  window.location.assign('/admin/dishes')
                }
              >
                ← Back to Dishes
              </button>
            ) : null}

            <button
              className={`recipe-fast-button ${showGasQuickEntry ? 'primary' : ''}`}
              type="button"
              onClick={() =>
                setShowGasQuickEntry(
                  (current) =>
                    !current,
                )
              }
              disabled={
                !catalog
              }
            >
              ⚡ Fast Gas Entry
            </button>

            <button
              className="recipe-fast-button"
              type="button"
              onClick={() =>
                setShowBulkRecipes(
                  (current) =>
                    !current,
                )
              }
              disabled={
                !catalog
              }
            >
              + ChatGPT Import
            </button>

            {blankSmartDraftCount > 0 ? (
              <button
                className="recipe-fast-button"
                type="button"
                onClick={
                  generateAllBlankSmartDrafts
                }
                disabled={
                  smartDraftGenerating ||
                  saving
                }
              >
                {smartDraftGenerating
                  ? '✨ Generating drafts…'
                  : `✨ Generate ${blankSmartDraftCount} Blank Draft${blankSmartDraftCount === 1 ? '' : 's'}`}
              </button>
            ) : null}

            {smartDraftCount > 0 ? (
              <button
                className="recipe-fast-button"
                type="button"
                onClick={
                  acceptAllSmartDrafts
                }
              >
                ✓ Accept {smartDraftCount} Smart Draft{smartDraftCount === 1 ? '' : 's'}
              </button>
            ) : null}

            <button
              className="recipe-fast-button"
              type="button"
              onClick={
                addRecipe
              }
              disabled={
                !catalog
              }
            >
              + New Recipe
            </button>

            <button
              className="recipe-fast-button primary"
              type="button"
              onClick={() =>
                void saveRecipes()
              }
              disabled={
                saving ||
                smartDraftGenerating ||
                !catalog
              }
            >
              {saving
                ? 'Saving & Syncing…'
                : 'Save & Sync'}
            </button>
          </div>
        </div>

        {showBulkRecipes ? (
          <div className="recipe-fast-bulk-recipes">
            <div className="recipe-fast-bulk-head">
              <div>
                <strong>
                  Bulk Recipe Import v2
                </strong>

                <span>
                  Paste recipes, validate rates and LPG, preview cost, then save everything in one action.
                </span>
              </div>

              <button
                className="recipe-fast-button"
                type="button"
                onClick={() =>
                  setShowBulkRecipes(
                    false,
                  )
                }
              >
                Close
              </button>
            </div>

            <textarea
              className="recipe-fast-bulk-textarea"
              value={bulkRecipes}
              onChange={(event) =>
                setBulkRecipes(
                  event.target.value,
                )
              }
              placeholder={'R | Mix Pakoda | Farsan | Dry | 100 | gram | 100\nI | Besan | 8 | kg | 120 | kg\nI | Potato | 5 | kg | 30 | kg\nI | Oil | 6 | ltr | 150 | ltr\nG | 1.00 | kg'}
            />

            <div className="recipe-bulk-options">
              <div className="recipe-bulk-option">
                <label>
                  Existing recipe action
                </label>

                <select
                  className="recipe-fast-input"
                  value={
                    bulkDuplicateMode
                  }
                  onChange={(event) =>
                    setBulkDuplicateMode(
                      event.target
                        .value as
                        BulkDuplicateMode,
                    )
                  }
                >
                  <option value="update">
                    Update existing
                  </option>
                  <option value="skip">
                    Skip duplicates
                  </option>
                  <option value="copy">
                    Create copy
                  </option>
                </select>
              </div>

              <div className="recipe-bulk-summary">
                <div>
                  <span>Recipes</span>
                  <b>
                    {bulkImportPreview.recipes.length}
                  </b>
                </div>

                <div>
                  <span>Existing</span>
                  <b>
                    {bulkDuplicateRecipeCount}
                  </b>
                </div>

                <div>
                  <span>New ingredients</span>
                  <b>
                    {bulkMissingMasterCount}
                  </b>
                </div>

                <div>
                  <span>Missing rates</span>
                  <b>
                    {bulkMissingRateCount}
                  </b>
                </div>

                <div>
                  <span>Invalid</span>
                  <b>
                    {bulkImportPreview.invalidLines + bulkImportPreview.invalidRecipes}
                  </b>
                </div>
              </div>
            </div>

            {bulkIngredientIssues.length > 0 ? (
              <div className="recipe-bulk-issues">
                <div>
                  <strong>
                    Ingredient Master checks
                  </strong>

                  <div
                    style={{
                      marginTop: '3px',
                      color: '#9a865e',
                      fontSize: '8px',
                    }}
                  >
                    New ingredients are created automatically. Enter a rate where it is missing.
                  </div>
                </div>

                <div className="recipe-bulk-issue-list">
                  {bulkIngredientIssues.map(
                    (ingredient) => {
                      const key =
                        bulkIngredientKey(
                          ingredient.name,
                          ingredient.rateUnit,
                        );

                      const override =
                        bulkRateOverrides[
                          key
                        ];

                      const displayRate =
                        override !==
                        undefined
                          ? override
                          : ingredient.missingRate
                            ? ''
                            : String(
                                ingredient.rate,
                              );

                      return (
                        <div
                          className="recipe-bulk-issue-row"
                          key={key}
                        >
                          <div>
                            <b>
                              {ingredient.name}
                            </b>

                            <div
                              style={{
                                marginTop: '2px',
                                color: '#758495',
                                fontSize: '8px',
                              }}
                            >
                              Rate unit: {ingredient.rateUnit}
                            </div>
                          </div>

                          <div className="recipe-bulk-badges">
                            {!ingredient.existsInMaster ? (
                              <span className="recipe-bulk-badge warn">
                                New ingredient
                              </span>
                            ) : (
                              <span className="recipe-bulk-badge good">
                                In master
                              </span>
                            )}

                            {ingredient.missingRate ? (
                              <span className="recipe-bulk-badge warn">
                                Rate missing
                              </span>
                            ) : null}
                          </div>

                          <input
                            className="recipe-bulk-rate-input"
                            type="number"
                            min="0"
                            step="0.01"
                            value={displayRate}
                            placeholder={'Rate / ' + ingredient.rateUnit}
                            onChange={(event) =>
                              setBulkRateOverrides(
                                (current) => ({
                                  ...current,
                                  [key]:
                                    event
                                      .target
                                      .value,
                                }),
                              )
                            }
                          />
                        </div>
                      );
                    },
                  )}
                </div>
              </div>
            ) : null}

            {bulkDuplicateIngredientCount > 0 ? (
              <div className="recipe-fast-error">
                {bulkDuplicateIngredientCount} duplicate ingredient line(s) detected. Remove duplicates before saving.
              </div>
            ) : null}

            {bulkImportPreview.recipes.length > 0 ? (
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '10px',
                    marginBottom: '7px',
                  }}
                >
                  <strong
                    style={{
                      fontSize: '11px',
                    }}
                  >
                    Import preview
                  </strong>

                  <span
                    style={{
                      color: '#758495',
                      fontSize: '8px',
                    }}
                  >
                    Food + LPG + total cost before save
                  </span>
                </div>

                <div className="recipe-bulk-preview">
                  {bulkImportPreview.recipes.map(
                    (
                      recipe,
                      recipeIndex,
                    ) => {
                      const previewDish:
                        RawRow = {
                          dishName:
                            recipe.name,
                          name:
                            recipe.name,
                          category:
                            recipe.category,
                          baseGuests:
                            recipe.baseGuests,
                          ...(recipe.gasKgPer100 !==
                          null
                            ? {
                                gasKgPer100:
                                  recipe.gasKgPer100,
                                gasNoGas:
                                  recipe.gasKgPer100 ===
                                  0,
                              }
                            : {}),
                          ingredients:
                            recipe.ingredients.map(
                              (
                                ingredient,
                              ) => ({
                                name:
                                  ingredient.name,
                                quantity:
                                  ingredient.quantity,
                                unit:
                                  ingredient.unit,
                                rate:
                                  ingredient.rate,
                                marketRate:
                                  ingredient.rate,
                                rateUnit:
                                  ingredient.rateUnit,
                              }),
                            ),
                        };

                      const foodCost =
                        recipeTotal(
                          previewDish,
                        );

                      const gas =
                        recipeGasPreview(
                          previewDish,
                          recipe.category,
                          recipe.baseGuests,
                          gasSetting,
                          gasCategoryRates,
                        );

                      const total =
                        foodCost +
                        gas.gasCost;

                      const perPerson =
                        total /
                        Math.max(
                          1,
                          recipe.baseGuests,
                        );

                      return (
                        <div
                          className="recipe-bulk-preview-card"
                          key={recipe.name + '-' + String(recipeIndex)}
                        >
                          <div className="recipe-bulk-preview-head">
                            <div>
                              <b>
                                {recipe.name}
                              </b>

                              <span>
                                {recipe.category}
                                {recipe.subcategory
                                  ? ' | ' + recipe.subcategory
                                  : ''}
                                {' | '}
                                {recipe.baseGuests} guests
                                {' | '}
                                {recipe.servingSize} {recipe.servingUnit}
                              </span>
                            </div>

                            <div className="recipe-bulk-badges">
                              {recipe.duplicateRecipe ? (
                                <span className="recipe-bulk-badge warn">
                                  Existing recipe
                                </span>
                              ) : (
                                <span className="recipe-bulk-badge good">
                                  New recipe
                                </span>
                              )}

                              <span className="recipe-bulk-badge">
                                {gas.source}
                              </span>
                            </div>
                          </div>

                          <div className="recipe-bulk-preview-kpis">
                            <div>
                              <span>Ingredients</span>
                              <b>
                                {recipe.ingredients.length}
                              </b>
                            </div>

                            <div>
                              <span>Food cost</span>
                              <b>
                                {money(foodCost)}
                              </b>
                            </div>

                            <div>
                              <span>LPG</span>
                              <b>
                                {gas.gasKg.toFixed(2)} kg
                              </b>
                            </div>

                            <div>
                              <span>Total</span>
                              <b>
                                {money(total)}
                              </b>
                            </div>

                            <div>
                              <span>Cost / person</span>
                              <b>
                                {money(perPerson)}
                              </b>
                            </div>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              </div>
            ) : null}

            <div className="recipe-fast-bulk-footer">
              <small>
                R = recipe | I = ingredient | G = LPG kg per 100 guests. Missing Ingredient Master items are created automatically.
              </small>

              <button
                className="recipe-fast-button primary"
                type="button"
                disabled={
                  saving ||
                  !bulkRecipes.trim() ||
                  !bulkImportPreview
                    .recipes.length ||
                  bulkMissingRateCount >
                    0 ||
                  bulkDuplicateIngredientCount >
                    0
                }
                onClick={() =>
                  void addBulkRecipes()
                }
              >
                {saving
                  ? 'Validating & Saving...'
                  : 'Add All & Save (' + String(bulkImportPreview.recipes.length) + ')'}
              </button>
            </div>
          </div>
        ) : null}

        <div
          className={`recipe-fast-sync ${
            syncStatus
          }`}
        >
          {syncMessage}
        </div>

        {message ? (
          <div className="recipe-fast-message">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="recipe-fast-error">
            {error}
            {' '}
            <button
              type="button"
              onClick={() =>
                void loadRecipes()
              }
            >
              Retry
            </button>
          </div>
        ) : null}

        <div className="recipe-fast-stats">
          <div className="recipe-fast-stat">
            <small>
              Recipes
            </small>
            <strong>
              {catalog?.dishes.length ?? 0}
            </strong>
          </div>

          <div className="recipe-fast-stat">
            <small>
              Categories
            </small>
            <strong>
              {categories.length}
            </strong>
          </div>

          <div className="recipe-fast-stat">
            <small>
              Ingredients
            </small>
            <strong>
              {catalog
                ?.dishes.reduce(
                  (
                    total,
                    dish,
                  ) =>
                    total +
                    recipeIngredients(
                      dish,
                    ).length,
                  0,
                ) ?? 0}
            </strong>
          </div>

          <div className="recipe-fast-stat">
            <small>
              Gas Profiles
            </small>
            <strong>
              {explicitGasProfileCount}
            </strong>
            <span
              style={{
                display: 'block',
                marginTop: '3px',
                color: '#738191',
                fontSize: '8px',
              }}
            >
              explicit dish gas setup
            </span>
          </div>
        </div>

        <div className="recipe-fast-toolbar">
          <input
            className="recipe-fast-input"
            type="search"
            value={query}
            onChange={(event) =>
              setQuery(
                event.target.value,
              )
            }
            placeholder="Search recipe…"
          />

          <select
            className="recipe-fast-input"
            value={category}
            onChange={(event) =>
              setCategory(
                event.target.value,
              )
            }
          >
            <option value="ALL">
              All categories
            </option>

            {categories.map(
              (item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ),
            )}
          </select>

          <div className="recipe-toolbar-count">
            {visibleRecipes.length.toLocaleString('en-IN')} matching recipe{visibleRecipes.length === 1 ? '' : 's'}
          </div>
        </div>

        {loading ? (
          <div className="recipe-fast-empty">
            Loading recipes…
          </div>
        ) : showGasQuickEntry ? (
          <section className="recipe-gas-quick">
            <div className="recipe-gas-quick-head">
              <div>
                <h2>
                  Fast Gas Entry
                </h2>
                <p>
                  Type kg LPG / 100 guests and press Enter. Paste many rows from Excel. Save once after finishing.
                </p>
              </div>

              <div className="recipe-gas-quick-tools">
                <input
                  className="recipe-fast-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={gasQuickBulkValue}
                  onChange={(event) =>
                    setGasQuickBulkValue(
                      event.target.value,
                    )
                  }
                  placeholder="kg / 100"
                />

                <button
                  className="recipe-fast-button"
                  type="button"
                  disabled={
                    !gasQuickRows.length
                  }
                  onClick={
                    applyQuickGasToVisible
                  }
                >
                  Apply to visible
                </button>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: '#9ba7b5',
                    fontSize: '9px',
                    fontWeight: 800,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={
                      gasQuickUnsetOnly
                    }
                    onChange={(event) => {
                      setGasQuickStickyIndexes(
                        new Set(),
                      );
                      setGasQuickUnsetOnly(
                        event.target.checked,
                      );
                    }}
                  />
                  Only not set
                </label>
              </div>
            </div>

            <div className="recipe-gas-quick-table">
              <div className="recipe-gas-quick-row header">
                <span>
                  Dish
                </span>
                <span>
                  Gas kg / 100
                </span>
                <span>
                  Gas cost / 100
                </span>
                <span>
                  Source
                </span>
              </div>

              {paginatedGasQuickRows.length ? (
                paginatedGasQuickRows.map(
                  (
                    {
                      dish,
                      index,
                    },
                    rowPosition,
                  ) => {
                    const dishCategory =
                      text(
                        dish.category,
                      ) ||
                      'Other';

                    const preview =
                      recipeGasPreview(
                        dish,
                        dishCategory,
                        100,
                        gasSetting,
                        gasCategoryRates,
                      );

                    const explicitValue =
                      dish.gasNoGas ===
                        true
                        ? '0'
                        : optionalRecipeGasNumber(
                            dish.gasKgPer100,
                          ) !== null
                          ? String(
                              dish.gasKgPer100,
                            )
                          : '';

                    return (
                      <div
                        className="recipe-gas-quick-row"
                        key={`quick-gas-${recipeName(dish)}-${index}`}
                      >
                        <div className="recipe-gas-quick-name">
                          <b>
                            {recipeName(
                              dish,
                            )}
                          </b>
                          <span>
                            {dishCategory}
                          </span>
                        </div>

                        <input
                          className="recipe-gas-quick-input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            explicitValue
                          }
                          ref={(node) => {
                            gasQuickInputRefs.current[
                              index
                            ] = node;
                          }}
                          placeholder={
                            preview.gasKgPer100.toFixed(
                              2,
                            )
                          }
                          title="Manual LPG kg for 100 guests. Enter 0 for no gas."
                          onChange={(event) =>
                            setQuickGasValue(
                              index,
                              event.target.value,
                            )
                          }
                          onPaste={(event) => {
                            const clipboard =
                              event.clipboardData.getData(
                                'text',
                              );

                            const lines =
                              clipboard
                                .split(
                                  /\r?\n/,
                                )
                                .map(
                                  (line) =>
                                    line.trim(),
                                )
                                .filter(Boolean);

                            if (
                              lines.length <= 1
                            ) {
                              return;
                            }

                            const values =
                              lines
                                .map(
                                  (line) => {
                                    const parts =
                                      line
                                        .split(
                                          /\t|\||,/,
                                        )
                                        .map(
                                          (part) =>
                                            part.trim(),
                                        )
                                        .filter(Boolean);

                                    return (
                                      [...parts]
                                        .reverse()
                                        .find(
                                          (part) =>
                                            Number.isFinite(
                                              Number(
                                                part,
                                              ),
                                            ),
                                        ) ||
                                      ''
                                    );
                                  },
                                )
                                .filter(Boolean);

                            if (
                              !values.length
                            ) {
                              return;
                            }

                            event.preventDefault();

                            applyQuickGasSequence(
                              rowPosition,
                              values,
                            );
                          }}
                          onKeyDown={(event) => {
                            if (
                              event.key !==
                              'Enter'
                            ) {
                              return;
                            }

                            event.preventDefault();

                            const next =
                              paginatedGasQuickRows[
                                rowPosition +
                                  1
                              ];

                            if (next) {
                              requestAnimationFrame(
                                () =>
                                  gasQuickInputRefs.current[
                                    next.index
                                  ]?.focus(),
                              );
                            }
                          }}
                        />

                        <div className="recipe-gas-quick-cost">
                          <b>
                            {money(
                              preview.gasCost,
                            )}
                          </b>
                          <span>
                            {preview.gasKgPer100.toFixed(
                              2,
                            )}
                            {' kg used'}
                          </span>
                        </div>

                        <div className="recipe-gas-quick-cost">
                          <b>
                            {preview.source}
                          </b>
                          <span>
                            {dish.gasNoGas ===
                            true
                              ? 'Explicit no gas'
                              : explicitValue
                                ? 'Manual dish rate'
                                : preview.source ===
                                      'SWEET STARTER' ||
                                    preview.source ===
                                      'SABJI STARTER' ||
                                    preview.source ===
                                      'CHAAT STARTER' ||
                                    preview.source ===
                                      'CHINESE STARTER' ||
                                    preview.source ===
                                      'DAL/KADHI STARTER' ||
                                    preview.source ===
                                      'FARSAN STARTER' ||
                                    preview.source ===
                                      'INDIAN BREAD STARTER' ||
                                    preview.source ===
                                      'ITALIAN STARTER' ||
                                    preview.source ===
                                      'MOVING STARTER' ||
                                    preview.source ===
                                      'RICE STARTER' ||
                                    preview.source ===
                                      'SOUTH INDIAN STARTER' ||
                                    preview.source ===
                                      'STARTER ESTIMATE' ||
                                    preview.source ===
                                      'THAI STARTER'
                                  ? 'Starter estimate'
                                  : 'Fallback shown'}
                          </span>
                        </div>
                      </div>
                    );
                  },
                )
              ) : (
                <div className="recipe-fast-empty">
                  No matching gas rows
                </div>
              )}
            </div>

            <div className="recipe-gas-quick-pager">
              <button
                className="recipe-fast-button"
                type="button"
                disabled={
                  gasQuickPage <= 1
                }
                onClick={() =>
                  setGasQuickPage(
                    (current) =>
                      Math.max(
                        1,
                        current - 1,
                      ),
                  )
                }
              >
                ← Previous 100
              </button>

              <span>
                {gasQuickRows.length.toLocaleString(
                  'en-IN',
                )}
                {' dishes · Page '}
                {gasQuickPage}
                {' / '}
                {gasQuickPageCount}
              </span>

              <button
                className="recipe-fast-button"
                type="button"
                disabled={
                  gasQuickPage >=
                  gasQuickPageCount
                }
                onClick={() =>
                  setGasQuickPage(
                    (current) =>
                      Math.min(
                        gasQuickPageCount,
                        current + 1,
                      ),
                  )
                }
              >
                Next 100 →
              </button>
            </div>
          </section>
        ) : (
          <div className="recipe-fast-workspace">
            <aside className="recipe-fast-list">
              <div className="recipe-list-head">
                <strong>
                  Recipe Library
                </strong>
                <span>
                  Click a dish to edit
                </span>
              </div>

              {paginatedRecipes.length ? (
                paginatedRecipes.map(
                  ({
                    dish,
                    index,
                  }) => {
                    const dishCategory =
                      text(
                        dish.category,
                      ) ||
                      'Other';

                    const rowGuests =
                      Math.max(
                        1,
                        numberValue(
                          dish.baseGuests,
                          100,
                        ),
                      );

                    const rowFoodPerPerson =
                      applyRecipeWastage(
                        recipeTotal(
                          dish,
                        ) /
                        rowGuests,
                      );

                    const rowGas =
                      recipeGasPreview(
                        dish,
                        dishCategory,
                        100,
                        gasSetting,
                        gasCategoryRates,
                      );

                    return (
                      <button
                        className={`recipe-fast-row ${
                          selectedIndex === index
                            ? 'active'
                            : ''
                        }`}
                        key={`${recipeName(dish)}-${index}`}
                        type="button"
                        title="Open recipe costing"
                        onClick={() =>
                          setSelectedIndex(
                            index,
                          )
                        }
                      >
                        <div className="recipe-fast-row-main">
                          <div className="recipe-fast-row-copy">
                            <b>
                              {recipeName(
                                dish,
                              )}
                            </b>

                            <span>
                              {dishCategory}
                              {dish.generatedRecipe
                                ? ' · Smart Draft'
                                : dish.smartDraftReviewed
                                  ? ' · Draft reviewed'
                                  : ''}
                              {' · '}
                              {recipeIngredients(
                                dish,
                              ).length}
                              {' ingredients'}
                              {' · '}
                              {rowGas.source}
                            </span>
                          </div>

                          <div className="recipe-fast-row-metrics">
                            <div className="recipe-fast-row-metric">
                              <b>
                                {money(
                                  rowFoodPerPerson,
                                )}
                              </b>
                              <span>
                                Food / pax
                              </span>
                            </div>

                            <div className="recipe-fast-row-metric gas">
                              <b>
                                {money(
                                  rowGas.gasCost,
                                )}
                              </b>
                              <span>
                                Gas / 100
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  },
                )
              ) : (
                <div className="recipe-fast-empty">
                  No matching recipes
                </div>
              )}
              {visibleRecipes.length >
              RECIPES_PER_PAGE ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      '1fr auto 1fr',
                    gap: '6px',
                    alignItems: 'center',
                    padding: '9px',
                    borderTop:
                      '1px solid #222a33',
                    background:
                      '#0d1218',
                  }}
                >
                  <button
                    className="recipe-fast-button"
                    type="button"
                    disabled={
                      recipePage <= 1
                    }
                    onClick={() =>
                      setRecipePage(
                        (current) =>
                          Math.max(
                            1,
                            current - 1,
                          ),
                      )
                    }
                  >
                    ← Prev
                  </button>

                  <span
                    style={{
                      color: '#8995a4',
                      fontSize: '10px',
                      textAlign: 'center',
                    }}
                  >
                    {recipePage}
                    {' / '}
                    {recipePageCount}
                    <br />
                    {visibleRecipes.length}
                    {' recipes'}
                  </span>

                  <button
                    className="recipe-fast-button"
                    type="button"
                    disabled={
                      recipePage >=
                      recipePageCount
                    }
                    onClick={() =>
                      setRecipePage(
                        (current) =>
                          Math.min(
                            recipePageCount,
                            current + 1,
                          ),
                      )
                    }
                  >
                    Next →
                  </button>
                </div>
              ) : null}
            </aside>

            <main className="recipe-fast-editor">
              {selectedDish &&
              selectedIndex !==
                null ? (
                <>
                  <div className="recipe-editor-summary">
                    <div className="recipe-editor-summary-copy">
                      <span>
                        Selected Recipe
                      </span>
                      <h2>
                        {recipeName(selectedDish)}
                      </h2>
                      <p>
                        {selectedCategory}
                        {selectedSubcategory
                          ? ` · ${selectedSubcategory}`
                          : ''}
                        {' · '}
                        {guests.toLocaleString('en-IN')} batch guests
                        {menuDishModifierLabels(
                          readMenuDishModifiers(
                            selectedDish.dishModifiers,
                          ),
                        ).length
                          ? ` · ${menuDishModifierLabels(
                              readMenuDishModifiers(
                                selectedDish.dishModifiers,
                              ),
                            ).join(' · ')}`
                          : ''}
                      </p>
                    </div>

                    <div className="recipe-editor-summary-kpis">
                      <div>
                        <span>
                          Food / Person
                        </span>
                        <b>
                          {money(finalPerPerson)}
                        </b>
                      </div>
                      <div>
                        <span>
                          Gas / Person
                        </span>
                        <b>
                          {money(gasPreview.gasCostPerPerson)}
                        </b>
                      </div>
                      <div>
                        <span>
                          Rate Coverage
                        </span>
                        <b>
                          {selectedIngredientRateCoverage}%
                        </b>
                      </div>
                    </div>
                  </div>

                  {selectedDish.generatedRecipe === true ? (
                    <div className="recipe-smart-draft">
                      <div className="recipe-smart-draft-copy">
                        <span>
                          Smart Recipe Draft
                        </span>
                        <h3>
                          AI prepared this 100-guest recipe for review
                        </h3>
                        <p>
                          {ingredients.length} ingredients · {money(finalPerPerson)} food / person · {recipeQuality.rateCoveragePercent}% trusted rate coverage · {gasPreview.gasKgPer100.toFixed(2)} kg LPG / 100 suggested.
                        </p>
                      </div>

                      <div className="recipe-smart-draft-status">
                        <b>
                          {recipeQuality.status}
                        </b>
                        <span>
                          {recipeQuality.score}/100 quality
                        </span>
                      </div>

                      <div className="recipe-smart-draft-actions">
                        <button
                          type="button"
                          className="recipe-fast-button primary"
                          disabled={
                            recipeQuality.status ===
                            'BLOCKED' ||
                            smartDraftGenerating
                          }
                          onClick={() =>
                            acceptSmartDraft(
                              selectedIndex,
                            )
                          }
                        >
                          {recipeQuality.status ===
                          'BLOCKED'
                            ? 'Fix blocked issues first'
                            : '✓ Accept Smart Draft'}
                        </button>

                        <button
                          type="button"
                          className="recipe-fast-button"
                          disabled={
                            smartDraftGenerating ||
                            saving
                          }
                          onClick={
                            generateSelectedSmartDraft
                          }
                        >
                          {smartDraftGenerating
                            ? 'Generating…'
                            : '↻ Regenerate Draft'}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {selectedDish.generatedRecipe !== true &&
                  ingredients.length === 0 ? (
                    <div className="recipe-smart-draft">
                      <div className="recipe-smart-draft-copy">
                        <span>
                          Recipe Not Built Yet
                        </span>
                        <h3>
                          Generate a Smart Recipe Draft for 100 guests
                        </h3>
                        <p>
                          AI will prepare the main cost-driving ingredients using your Ingredient Master rates. You stay in control: review quantities, serving and gas before saving.
                        </p>
                      </div>

                      <div className="recipe-smart-draft-status">
                        <b>
                          100 PAX
                        </b>
                        <span>
                          editable draft
                        </span>
                      </div>

                      <button
                        type="button"
                        className="recipe-fast-button primary"
                        disabled={
                          smartDraftGenerating ||
                          saving
                        }
                        onClick={
                          generateSelectedSmartDraft
                        }
                      >
                        {smartDraftGenerating
                          ? '✨ Generating…'
                          : '✨ Generate Smart Draft'}
                      </button>
                    </div>
                  ) : null}

                  <div className="recipe-section-title">
                    <strong>
                      Recipe Setup
                    </strong>
                    <span>
                      Identity, serving and batch size
                    </span>
                  </div>

                  <div className="recipe-fast-grid">
                    <div className="recipe-fast-field">
                      <label>
                        Dish name
                      </label>

                      <input
                        className="recipe-fast-input"
                        value={recipeName(
                          selectedDish,
                        )}
                        onChange={(event) =>
                          updateDish(
                            selectedIndex,
                            {
                              dishName:
                                event
                                  .target
                                  .value,
                              name:
                                event
                                  .target
                                  .value,
                            },
                          )
                        }
                      />
                    </div>

                    <div className="recipe-fast-field">
                      <label>
                        Category
                      </label>

                      <select
                        className="recipe-fast-input"
                        value={
                          selectedCategory
                        }
                        onChange={(event) => {
                          const nextCategory =
                            event
                              .target
                              .value;

                          const allowedSubcategories =
                            catalog
                              ?.subcategories?.[
                                nextCategory
                              ] ||
                            [];

                          updateDish(
                            selectedIndex,
                            {
                              category:
                                nextCategory,

                              subcategory:
                                allowedSubcategories
                                  .includes(
                                    selectedSubcategory,
                                  )
                                  ? selectedSubcategory
                                  : '',
                            },
                          );
                        }}
                      >
                        {categories.map(
                          (item) => (
                            <option
                              key={
                                item
                              }
                              value={
                                item
                              }
                            >
                              {item}
                            </option>
                          ),
                        )}
                      </select>
                    </div>

                    <div className="recipe-fast-field">
                      <label>
                        Subcategory
                      </label>

                      <select
                        className="recipe-fast-input"
                        value={
                          selectedSubcategory
                        }
                        onChange={(event) =>
                          updateDish(
                            selectedIndex,
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

                        {selectedSubcategories.map(
                          (item) => (
                            <option
                              key={
                                item
                              }
                              value={
                                item
                              }
                            >
                              {item}
                            </option>
                          ),
                        )}
                      </select>
                    </div>

                    <div className="recipe-fast-field">
                      <label>
                        Batch guests
                      </label>

                      <input
                        className="recipe-fast-input"
                        type="number"
                        min="1"
                        value={guests}
                        onChange={(event) =>
                          updateDish(
                            selectedIndex,
                            {
                              baseGuests:
                                Math.max(
                                  1,
                                  Number(
                                    event
                                      .target
                                      .value,
                                  ) ||
                                    1,
                                ),
                            },
                          )
                        }
                      />
                    </div>

                    <div className="recipe-fast-field">
                      <label>
                        Serving Quantity
                      </label>

                      <input
                        className="recipe-fast-input"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={Math.max(
                          0.01,
                          numberValue(
                            selectedDish.servingSize,
                            1,
                          ),
                        )}
                        onChange={(event) =>
                          changeServingQuantity(
                            Number(
                              event.target.value,
                            ),
                          )
                        }
                      />
                    </div>

                    <div className="recipe-fast-field">
                      <label>
                        Serving Unit
                      </label>

                      <select
                        className="recipe-fast-input"
                        value={
                          text(
                            selectedDish.servingUnit,
                          ) || 'serving'
                        }
                        onChange={(event) => {
                          const nextUnit =
                            event.target.value;

                          updateDish(
                            selectedIndex,
                            {
                              servingUnit:
                                nextUnit,

                              ...(nextUnit ===
                              'piece'
                                ? {}
                                : {
                                    pieceWeightGrams:
                                      0,
                                  }),
                            },
                          );
                        }}
                      >
                        <option value="gram">
                          gram
                        </option>

                        <option value="ml">
                          ml
                        </option>

                        <option value="piece">
                          piece
                        </option>

                        <option value="serving">
                          serving
                        </option>

                        <option value="kg">
                          kg
                        </option>

                        <option value="ltr">
                          ltr
                        </option>
                      </select>
                    </div>

                    {text(
                      selectedDish.servingUnit,
                    ) === 'piece' ? (
                      <div className="recipe-fast-field">
                        <label>
                          Weight / Piece (g)
                        </label>

                        <input
                          className="recipe-fast-input"
                          type="number"
                          min="0"
                          step="0.1"
                          value={Math.max(
                            0,
                            numberValue(
                              selectedDish
                                .pieceWeightGrams,
                              0,
                            ),
                          )}
                          placeholder="35"
                          onChange={(event) =>
                            updateDish(
                              selectedIndex,
                              {
                                pieceWeightGrams:
                                  Math.max(
                                    0,
                                    Number(
                                      event
                                        .target
                                        .value,
                                    ) || 0,
                                  ),
                              },
                            )
                          }
                        />

                        <small
                          style={{
                            color:
                              '#7f8b99',
                            fontSize:
                              '9px',
                          }}
                        >
                          Total serving ≈{' '}
                          {(
                            Math.max(
                              0.01,
                              numberValue(
                                selectedDish
                                  .servingSize,
                                1,
                              ),
                            ) *
                            Math.max(
                              0,
                              numberValue(
                                selectedDish
                                  .pieceWeightGrams,
                                0,
                              ),
                            )
                          ).toLocaleString(
                            'en-IN',
                            {
                              maximumFractionDigits:
                                1,
                            },
                          )}{' '}
                          g
                        </small>
                      </div>
                    ) : null}
                  </div>

                  <div className="recipe-section-title">
                    <strong>
                      Food Cost Summary
                    </strong>
                    <span>
                      Includes 8% wastage
                    </span>
                  </div>

                  <div className="recipe-fast-costs">
                    <div className="recipe-fast-cost">
                      <span>
                        Raw Batch Cost
                      </span>

                      <b>
                        {money(
                          totalCost,
                        )}
                      </b>
                    </div>

                    <div className="recipe-fast-cost">
                      <span>
                        Wastage 8%
                      </span>

                      <b>
                        {money(
                          wastagePerPerson *
                            guests,
                        )}
                      </b>
                    </div>

                    <div className="recipe-fast-cost">
                      <span>
                        Final Batch Cost
                      </span>

                      <b>
                        {money(
                          finalTotalCost,
                        )}
                      </b>
                    </div>

                    <div className="recipe-fast-cost primary-cost">
                      <span>
                        Final / Person
                      </span>

                      <b>
                        {money(
                          finalPerPerson,
                        )}
                      </b>
                    </div>
                  </div>

                  <div className="recipe-gas-panel">
                    <div className="recipe-gas-head">
                      <div>
                        <strong>
                          Gas Cost (LPG)
                        </strong>
                        <small>
                          Saved with this recipe and synced to Dish Master.
                        </small>
                      </div>

                      <span className="recipe-gas-source">
                        {gasPreview.source}
                      </span>
                    </div>

                    <div className="recipe-gas-stats">
                      <div className="recipe-gas-stat">
                        <span>
                          LPG / 100
                        </span>
                        <b>
                          {gasPreview.gasKgPer100.toFixed(2)} kg
                        </b>
                        <small>
                          Effective recipe gas
                        </small>
                      </div>

                      <div className="recipe-gas-stat">
                        <span>
                          LPG / Recipe Batch
                        </span>
                        <b>
                          {gasPreview.gasKg.toFixed(3)} kg
                        </b>
                        <small>
                          {guests.toLocaleString('en-IN')} guests
                        </small>
                      </div>

                      <div className="recipe-gas-stat">
                        <span>
                          Gas Cost / Batch
                        </span>
                        <b>
                          {money(
                            gasPreview.gasCost,
                          )}
                        </b>
                        <small>
                          ₹{gasPreview.lpgRate.toFixed(2)} / kg LPG
                        </small>
                      </div>

                      <div className="recipe-gas-stat">
                        <span>
                          Food + Gas / Person
                        </span>
                        <b>
                          {money(
                            finalPerPerson +
                            gasPreview.gasCostPerPerson,
                          )}
                        </b>
                        <small>
                          Gas {money(gasPreview.gasCostPerPerson)} / person
                        </small>
                      </div>
                    </div>

                    <label className="recipe-gas-no-gas">
                      <input
                        type="checkbox"
                        checked={
                          selectedDish.gasNoGas ===
                          true
                        }
                        onChange={(event) =>
                          updateDish(
                            selectedIndex,
                            event.target.checked
                              ? {
                                  gasNoGas: true,
                                  gasKgPer100: 0,
                                  gasBurnerKgPerHour: null,
                                  gasCookingMinutes: null,
                                  gasBurnerCount: null,
                                  gasBatchPax: null,
                                }
                              : {
                                  gasNoGas: false,
                                  gasKgPer100: null,
                                },
                          )
                        }
                      />
                      <span>
                        No Gas Recipe
                        <small>
                          Use only when this recipe genuinely needs no LPG.
                        </small>
                      </span>
                    </label>

                    <div className="recipe-gas-fields">
                      <div className="recipe-fast-field">
                        <label>
                          Measured LPG kg / 100
                        </label>
                        <input
                          className="recipe-fast-input"
                          type="number"
                          min="0"
                          step="0.01"
                          disabled={
                            selectedDish.gasNoGas ===
                            true
                          }
                          value={
                            selectedDish.gasKgPer100 ===
                              null ||
                            selectedDish.gasKgPer100 ===
                              undefined
                              ? ''
                              : numberValue(
                                  selectedDish.gasKgPer100,
                                )
                          }
                          placeholder={gasPreview.gasKgPer100.toFixed(2)}
                          onChange={(event) =>
                            updateDish(
                              selectedIndex,
                              {
                                gasNoGas: false,
                                gasKgPer100:
                                  event.target.value.trim()
                                    ? Math.max(
                                        0,
                                        Number(
                                          event.target.value,
                                        ) || 0,
                                      )
                                    : null,
                              },
                            )
                          }
                        />
                      </div>

                      <div className="recipe-fast-field">
                        <label>
                          Burner kg / hour
                        </label>
                        <input
                          className="recipe-fast-input"
                          type="number"
                          min="0"
                          step="0.01"
                          disabled={
                            selectedDish.gasNoGas ===
                            true
                          }
                          value={
                            selectedDish.gasBurnerKgPerHour ===
                              null ||
                            selectedDish.gasBurnerKgPerHour ===
                              undefined
                              ? ''
                              : numberValue(
                                  selectedDish.gasBurnerKgPerHour,
                                )
                          }
                          placeholder="0.50"
                          onChange={(event) =>
                            updateDish(
                              selectedIndex,
                              {
                                gasNoGas: false,
                                gasBurnerKgPerHour:
                                  event.target.value.trim()
                                    ? Math.max(
                                        0,
                                        Number(
                                          event.target.value,
                                        ) || 0,
                                      )
                                    : null,
                              },
                            )
                          }
                        />
                      </div>

                      <div className="recipe-fast-field">
                        <label>
                          Cooking min / batch
                        </label>
                        <input
                          className="recipe-fast-input"
                          type="number"
                          min="0"
                          step="1"
                          disabled={
                            selectedDish.gasNoGas ===
                            true
                          }
                          value={
                            selectedDish.gasCookingMinutes ===
                              null ||
                            selectedDish.gasCookingMinutes ===
                              undefined
                              ? ''
                              : numberValue(
                                  selectedDish.gasCookingMinutes,
                                )
                          }
                          placeholder="60"
                          onChange={(event) =>
                            updateDish(
                              selectedIndex,
                              {
                                gasNoGas: false,
                                gasCookingMinutes:
                                  event.target.value.trim()
                                    ? Math.max(
                                        0,
                                        Number(
                                          event.target.value,
                                        ) || 0,
                                      )
                                    : null,
                              },
                            )
                          }
                        />
                      </div>

                      <div className="recipe-fast-field">
                        <label>
                          Burners used
                        </label>
                        <input
                          className="recipe-fast-input"
                          type="number"
                          min="1"
                          step="1"
                          disabled={
                            selectedDish.gasNoGas ===
                            true
                          }
                          value={
                            selectedDish.gasBurnerCount ===
                              null ||
                            selectedDish.gasBurnerCount ===
                              undefined
                              ? ''
                              : numberValue(
                                  selectedDish.gasBurnerCount,
                                )
                          }
                          placeholder="1"
                          onChange={(event) =>
                            updateDish(
                              selectedIndex,
                              {
                                gasNoGas: false,
                                gasBurnerCount:
                                  event.target.value.trim()
                                    ? Math.max(
                                        1,
                                        Math.round(
                                          Number(
                                            event.target.value,
                                          ) || 1,
                                        ),
                                      )
                                    : null,
                              },
                            )
                          }
                        />
                      </div>

                      <div className="recipe-fast-field">
                        <label>
                          Gas Batch Guests
                        </label>
                        <input
                          className="recipe-fast-input"
                          type="number"
                          min="1"
                          step="1"
                          disabled={
                            selectedDish.gasNoGas ===
                            true
                          }
                          value={
                            selectedDish.gasBatchPax ===
                              null ||
                            selectedDish.gasBatchPax ===
                              undefined
                              ? ''
                              : numberValue(
                                  selectedDish.gasBatchPax,
                                )
                          }
                          placeholder={String(guests)}
                          onChange={(event) =>
                            updateDish(
                              selectedIndex,
                              {
                                gasNoGas: false,
                                gasBatchPax:
                                  event.target.value.trim()
                                    ? Math.max(
                                        1,
                                        Math.round(
                                          Number(
                                            event.target.value,
                                          ) || 1,
                                        ),
                                      )
                                    : null,
                              },
                            )
                          }
                        />
                      </div>
                    </div>

                    <small
                      style={{
                        color: '#7f8b99',
                        fontSize: '9px',
                      }}
                    >
                      Priority: No Gas → Real burner profile → Measured kg/100 → Dish starter → Category fallback → Safe default.
                    </small>
                  </div>

                  <div
                    className={`recipe-fast-quality ${
                      recipeQuality.status
                        .toLowerCase()
                    }`}
                  >
                    <div className="recipe-fast-quality-head">
                      <strong>
                        Recipe Quality Gate
                      </strong>

                      <span className="recipe-fast-quality-badge">
                        {recipeQuality.status}
                        {' · '}
                        {recipeQuality.score}/100
                      </span>
                    </div>

                    <div className="recipe-fast-quality-metrics">
                      <div>
                        <span>
                          Rate coverage
                        </span>

                        <b>
                          {recipeQuality.rateCoveragePercent}%
                        </b>
                      </div>

                      <div>
                        <span>
                          Missing rates
                        </span>

                        <b>
                          {recipeQuality.missingRates}
                        </b>
                      </div>

                      <div>
                        <span>
                          Warnings
                        </span>

                        <b>
                          {recipeQuality.warningCount}
                        </b>
                      </div>
                    </div>

                    {recipeQuality.issues.length ? (
                      <ul className="recipe-fast-quality-issues">
                        {recipeQuality.issues
                          .slice(
                            0,
                            5,
                          )
                          .map(
                            (
                              issue,
                              index,
                            ) => (
                              <li
                                key={`${issue.code}-${index}`}
                              >
                                {issue.message}
                              </li>
                            ),
                          )}
                      </ul>
                    ) : null}
                  </div>

                  <div className="recipe-fast-heading">
                    <div>
                      <h2>
                        Ingredients
                      </h2>
                      <span
                        style={{
                          display: 'block',
                          marginTop: '3px',
                          color: '#738191',
                          fontSize: '8px',
                        }}
                      >
                        {ingredients.length} items · {selectedIngredientRateCoverage}% rate coverage
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: '7px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <button
                        className="recipe-fast-button"
                        type="button"
                        onClick={
                          addIngredient
                        }
                      >
                        + Ingredient
                      </button>

                      <button
                        className="recipe-fast-remove"
                        type="button"
                        style={{
                          width: 'auto',
                          padding: '0 12px',
                        }}
                        disabled={saving}
                        onClick={() =>
                          void deleteSelectedRecipe()
                        }
                      >
                        Delete Recipe + Dish
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gap: '8px',
                      marginBottom: '12px',
                      padding: '12px',
                      border: '1px solid #29323d',
                      borderRadius: '12px',
                      background: '#111820',
                    }}
                  >
                    <div>
                      <strong
                        style={{
                          fontSize: '12px',
                        }}
                      >
                        Paste Bulk Ingredients
                      </strong>

                      <div
                        style={{
                          marginTop: '4px',
                          color: '#7f8b99',
                          fontSize: '10px',
                        }}
                      >
                        One per line:
                        Name, Qty, Unit, Rate
                      </div>
                    </div>

                    <textarea
                      className="recipe-fast-input"
                      value={bulkIngredients}
                      rows={6}
                      style={{
                        minHeight: '130px',
                        paddingTop: '10px',
                        paddingBottom: '10px',
                        resize: 'vertical',
                      }}
                      placeholder={`Paneer,8,kg,280
Onion,2,kg,30
Tomato,3,kg,35
Cream,0.8,kg,220`}
                      onChange={(event) =>
                        setBulkIngredients(
                          event.target.value,
                        )
                      }
                    />

                    <div>
                      <button
                        className="recipe-fast-button primary"
                        type="button"
                        disabled={
                          saving ||
                          !bulkIngredients.trim()
                        }
                        onClick={() =>
                          void addBulkIngredients()
                        }
                      >
                        {saving
                          ? 'Saving…'
                          : '+ Add & Save Bulk Ingredients'}
                      </button>
                    </div>
                  </div>

                  {ingredients.map(
                    (
                      ingredient,
                      ingredientIndex,
                    ) => {
                      const quantity =
                        ingredientQuantity(
                          ingredient,
                        );

                      const rate =
                        ingredientRate(
                          ingredient,
                        );

                      return (
                        <div
                          className="recipe-fast-ingredient"
                          key={ingredientIndex}
                        >
                          <div className="recipe-fast-field">
                            <label>
                              Ingredient
                            </label>

                            <select
                              className="recipe-fast-input"
                              value=""
                              onChange={(event) => {
                                const selected =
                                  catalog?.rates.find(
                                    (item) =>
                                      text(item.id) ===
                                      event.target.value,
                                  );

                                if (!selected) return;

                                updateIngredient(
                                  selectedIndex,
                                  ingredientIndex,
                                  {
                                    name: text(selected.name),
                                    ingredientName: text(selected.name),
                                    rateKey: text(selected.id),
                                    marketRate: numberValue(selected.rate),
                                    rate: numberValue(selected.rate),
                                    unit: text(selected.unit) || 'kg',
                                    rateUnit: text(selected.unit) || 'kg',
                                  },
                                );
                              }}
                            >
                              <option value="">
                                Select from Ingredient Master
                              </option>

                              {(catalog?.rates || [])
                                .slice()
                                .sort((a, b) =>
                                  text(a.name).localeCompare(
                                    text(b.name),
                                  ),
                                )
                                .map((item) => (
                                  <option
                                    key={text(item.id)}
                                    value={text(item.id)}
                                  >
                                    {text(item.name)}
                                    {' · ₹'}
                                    {numberValue(item.rate)}
                                    {'/'}
                                    {text(item.unit)}
                                  </option>
                                ))}
                            </select>

                            <input
                              className="recipe-fast-input"
                              value={text(
                                ingredient.name ||
                                  ingredient.ingredientName,
                              )}
                              onChange={(event) =>
                                updateIngredient(
                                  selectedIndex,
                                  ingredientIndex,
                                  {
                                    name:
                                      event
                                        .target
                                        .value,
                                  },
                                )
                              }
                            />
                          </div>

                          <div className="recipe-fast-field">
                            <label>
                              Qty
                            </label>

                            <input
                              className="recipe-fast-input"
                              type="number"
                              min="0"
                              step="0.01"
                              value={quantity}
                              onChange={(event) =>
                                updateIngredient(
                                  selectedIndex,
                                  ingredientIndex,
                                  {
                                    quantity:
                                      Math.max(
                                        0,
                                        Number(
                                          event
                                            .target
                                            .value,
                                        ) ||
                                          0,
                                      ),
                                    qty:
                                      Math.max(
                                        0,
                                        Number(
                                          event
                                            .target
                                            .value,
                                        ) ||
                                          0,
                                      ),
                                  },
                                )
                              }
                            />
                          </div>

                          <div className="recipe-fast-field">
                            <label>
                              Unit
                            </label>

                            <select
                              className="recipe-fast-input"
                              value={
                                text(
                                  ingredient.unit,
                                ) ||
                                'kg'
                              }
                              onChange={(event) =>
                                updateIngredient(
                                  selectedIndex,
                                  ingredientIndex,
                                  {
                                    unit:
                                      event
                                        .target
                                        .value,
                                  },
                                )
                              }
                            >
                              <option value="kg">kg</option>
                              <option value="gram">gram</option>
                              <option value="ltr">ltr</option>
                              <option value="ml">ml</option>
                              <option value="piece">piece</option>
                              <option value="packet">packet</option>
                            </select>
                          </div>

                          <div className="recipe-fast-field">
                            <label>
                              Rate
                            </label>

                            <input
                              className="recipe-fast-input"
                              type="number"
                              min="0"
                              step="0.01"
                              value={rate}
                              onChange={(event) =>
                                updateIngredient(
                                  selectedIndex,
                                  ingredientIndex,
                                  {
                                    marketRate:
                                      Math.max(
                                        0,
                                        Number(
                                          event
                                            .target
                                            .value,
                                        ) ||
                                          0,
                                      ),
                                    rate:
                                      Math.max(
                                        0,
                                        Number(
                                          event
                                            .target
                                            .value,
                                        ) ||
                                          0,
                                      ),
                                  },
                                )
                              }
                            />
                          </div>

                          <div className="recipe-fast-field">
                            <label>
                              Cost
                            </label>

                            <input
                              className="recipe-fast-input"
                              readOnly
                              value={money(
                                convertedQuantity(
                                  quantity,
                                  text(
                                    ingredient.unit,
                                  ) ||
                                    'kg',
                                  text(
                                    ingredient.rateUnit,
                                  ) ||
                                    text(
                                      ingredient.unit,
                                    ) ||
                                    'kg',
                                ) *
                                  rate,
                              )}
                            />
                          </div>

                          <button
                            className="recipe-fast-remove"
                            type="button"
                            aria-label="Remove ingredient"
                            onClick={() =>
                              removeIngredient(
                                ingredientIndex,
                              )
                            }
                          >
                            ×
                          </button>
                        </div>
                      );
                    },
                  )}

                  {!ingredients.length ? (
                    <div className="recipe-fast-empty">
                      Add the first ingredient
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="recipe-fast-empty">
                  Select a recipe
                </div>
              )}
            </main>
          </div>
        )}
      </section>
    </AppShell>
  );
}
