import { canonicalIngredientName } from './ingredientCatalog';
import type { MenuItem, WorkState } from './types';

export type GroceryRecipeIngredient = {
  name: string;
  quantity: number;
  unit: string;
};

export type GroceryRecipe = {
  name: string;
  aliases?: string[];
  baseGuests: number;
  ingredients: GroceryRecipeIngredient[];
};

export type GroceryIngredientRate = {
  id?: string;
  name: string;
  unit: string;
  rate: number;
};

export type FunctionGroceryItem = {
  name: string;
  quantity: number;
  unit: string;
  dishes: string[];
  rate: number | null;
  rateUnit: string | null;
  estimatedCost: number;
  hasRate: boolean;
};

export type FunctionGrocerySection = {
  key: string;
  dayLabel: string;
  mealLabel: string;
  pax: number;
  dishCount: number;
  items: FunctionGroceryItem[];
  matchedDishes: string[];
  unmatchedDishes: string[];
  estimatedIngredientCost: number;
  pricedIngredientCount: number;
  unpricedIngredientCount: number;
};

export type FunctionGroceryPlan = {
  functions: FunctionGrocerySection[];
  combinedItems: FunctionGroceryItem[];
  combinedIngredientCost: number;
  matchedDishes: string[];
  unmatchedDishes: string[];
  totalFunctionCovers: number;
  pricedIngredientCount: number;
  unpricedIngredientCount: number;
};

type IngredientAccumulator = {
  name: string;
  quantity: number;
  unit: string;
  dishes: Set<string>;
  rate: number | null;
  rateUnit: string | null;
  estimatedCost: number;
  hasRate: boolean;
};

type FunctionAccumulator = {
  key: string;
  dayLabel: string;
  mealLabel: string;
  pax: number;
  items: MenuItem[];
};

type NormalizedQuantity = {
  quantity: number;
  unit: string;
  family: string;
};

const MASS_UNITS = new Set([
  'kg',
  'kilogram',
  'kilograms',
  'kgs',
  'g',
  'gm',
  'gms',
  'gram',
  'grams',
]);

const VOLUME_UNITS = new Set([
  'l',
  'lt',
  'ltr',
  'litre',
  'litres',
  'liter',
  'liters',
  'ml',
  'millilitre',
  'millilitres',
  'milliliter',
  'milliliters',
]);

const PIECE_UNITS = new Set([
  'piece',
  'pieces',
  'pc',
  'pcs',
  'nos',
  'no',
  'unit',
  'units',
]);

const PACKET_UNITS = new Set([
  'packet',
  'packets',
  'pack',
  'packs',
  'pkt',
]);

function normalizeText(value: unknown) {
  return String(value || '')
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('en-IN')
    .replace(/\s+/g, ' ');
}

function normalizeIngredientKey(value: unknown) {
  return normalizeText(
    canonicalIngredientName(
      String(value || ''),
    ),
  );
}

function normalizeQuantity(
  quantity: number,
  unit: string,
): NormalizedQuantity {
  const safeQuantity = Math.max(
    0,
    Number(quantity) || 0,
  );
  const normalizedUnit = normalizeText(unit);

  if (MASS_UNITS.has(normalizedUnit)) {
    const isGram = [
      'g',
      'gm',
      'gms',
      'gram',
      'grams',
    ].includes(normalizedUnit);

    return {
      quantity: isGram
        ? safeQuantity / 1000
        : safeQuantity,
      unit: 'kg',
      family: 'mass',
    };
  }

  if (VOLUME_UNITS.has(normalizedUnit)) {
    const isMl = [
      'ml',
      'millilitre',
      'millilitres',
      'milliliter',
      'milliliters',
    ].includes(normalizedUnit);

    return {
      quantity: isMl
        ? safeQuantity / 1000
        : safeQuantity,
      unit: 'ltr',
      family: 'volume',
    };
  }

  if (PIECE_UNITS.has(normalizedUnit)) {
    return {
      quantity: safeQuantity,
      unit: 'piece',
      family: 'piece',
    };
  }

  if (PACKET_UNITS.has(normalizedUnit)) {
    return {
      quantity: safeQuantity,
      unit: 'packet',
      family: 'packet',
    };
  }

  return {
    quantity: safeQuantity,
    unit: String(unit || 'unit').trim() || 'unit',
    family: `other:${normalizedUnit || 'unit'}`,
  };
}

function normalizeRateToFamily(
  rate: GroceryIngredientRate,
): {
  family: string;
  ratePerDisplayUnit: number;
  rateUnit: string;
} | null {
  const normalized = normalizeQuantity(
    1,
    rate.unit,
  );
  const safeRate = Math.max(
    0,
    Number(rate.rate) || 0,
  );

  if (!(safeRate > 0)) {
    return null;
  }

  const unit = normalizeText(rate.unit);

  if (normalized.family === 'mass') {
    const perKg = [
      'g',
      'gm',
      'gms',
      'gram',
      'grams',
    ].includes(unit)
      ? safeRate * 1000
      : safeRate;

    return {
      family: 'mass',
      ratePerDisplayUnit: perKg,
      rateUnit: 'kg',
    };
  }

  if (normalized.family === 'volume') {
    const perLitre = [
      'ml',
      'millilitre',
      'millilitres',
      'milliliter',
      'milliliters',
    ].includes(unit)
      ? safeRate * 1000
      : safeRate;

    return {
      family: 'volume',
      ratePerDisplayUnit: perLitre,
      rateUnit: 'ltr',
    };
  }

  return {
    family: normalized.family,
    ratePerDisplayUnit: safeRate,
    rateUnit: normalized.unit,
  };
}

function recipeCatalog(
  recipes: GroceryRecipe[],
) {
  const catalog = new Map<
    string,
    GroceryRecipe
  >();

  recipes.forEach((recipe) => {
    const names = [
      recipe.name,
      ...(Array.isArray(recipe.aliases)
        ? recipe.aliases
        : []),
    ];

    names.forEach((name) => {
      const key = normalizeText(name);
      if (key) {
        catalog.set(key, recipe);
      }
    });
  });

  return catalog;
}

function rateCatalog(
  rates: GroceryIngredientRate[],
) {
  const catalog = new Map<
    string,
    GroceryIngredientRate[]
  >();

  rates.forEach((rate) => {
    const key = normalizeIngredientKey(
      rate.name,
    );

    if (!key) return;

    catalog.set(
      key,
      [
        ...(catalog.get(key) || []),
        rate,
      ],
    );
  });

  return catalog;
}

function findCompatibleRate(
  ingredientName: string,
  family: string,
  rates: Map<string, GroceryIngredientRate[]>,
) {
  const candidates =
    rates.get(
      normalizeIngredientKey(
        ingredientName,
      ),
    ) || [];

  for (const candidate of candidates) {
    const normalized =
      normalizeRateToFamily(
        candidate,
      );

    if (
      normalized &&
      normalized.family === family
    ) {
      return normalized;
    }
  }

  return null;
}

function functionKeyForItem(
  item: MenuItem,
) {
  if (item.serviceId?.trim()) {
    return `service:${item.serviceId.trim()}`;
  }

  return `meal:${normalizeText(item.dayLabel)}::${normalizeText(item.mealLabel || 'Event Menu')}`;
}

function buildFunctionGroups(
  work: WorkState,
) {
  const groups = new Map<
    string,
    FunctionAccumulator
  >();
  const fallbackPax = Math.max(
    0,
    Number(work.event.pax) || 0,
  );

  work.menu.forEach((item) => {
    if (
      item.coverageStatus ===
      'REJECTED'
    ) {
      return;
    }

    const key =
      functionKeyForItem(item);
    const existing = groups.get(key);
    const pax = Math.max(
      0,
      Number(item.servicePax) ||
        fallbackPax,
    );

    if (existing) {
      existing.pax = Math.max(
        existing.pax,
        pax,
      );
      existing.items.push(item);
      return;
    }

    groups.set(key, {
      key,
      dayLabel:
        item.dayLabel?.trim() || '',
      mealLabel:
        item.mealLabel?.trim() ||
        work.event.functionType?.trim() ||
        'Event Menu',
      pax,
      items: [item],
    });
  });

  return Array.from(
    groups.values(),
  );
}

function roundQuantity(value: number) {
  return Math.round(value * 1000) / 1000;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function buildSection(
  group: FunctionAccumulator,
  recipes: Map<string, GroceryRecipe>,
  rates: Map<string, GroceryIngredientRate[]>,
): FunctionGrocerySection {
  const groceries = new Map<
    string,
    IngredientAccumulator
  >();
  const matchedDishes =
    new Set<string>();
  const unmatchedDishes =
    new Set<string>();
  const seenDishes =
    new Set<string>();

  group.items.forEach((item) => {
    const dishKey =
      normalizeText(item.name);

    if (
      !dishKey ||
      seenDishes.has(dishKey)
    ) {
      return;
    }

    seenDishes.add(dishKey);

    const recipe =
      recipes.get(dishKey);

    if (
      !recipe ||
      !Array.isArray(
        recipe.ingredients,
      ) ||
      recipe.ingredients.length === 0
    ) {
      unmatchedDishes.add(
        item.name,
      );
      return;
    }

    matchedDishes.add(
      recipe.name,
    );

    const baseGuests = Math.max(
      1,
      Number(recipe.baseGuests) || 100,
    );
    const pax = Math.max(
      0,
      Number(item.servicePax) ||
        group.pax,
    );
    const portionPercent = Math.max(
      0,
      Number(item.portionPercent) || 100,
    );
    const scale =
      (pax / baseGuests) *
      (portionPercent / 100);

    recipe.ingredients.forEach(
      (ingredient) => {
        const normalized =
          normalizeQuantity(
            Number(
              ingredient.quantity,
            ) || 0,
            ingredient.unit,
          );

        if (
          !(normalized.quantity > 0) ||
          !(scale > 0)
        ) {
          return;
        }

        const ingredientName =
          canonicalIngredientName(
            ingredient.name,
          ) ||
          ingredient.name.trim();
        const key = [
          normalizeIngredientKey(
            ingredientName,
          ),
          normalizeText(
            normalized.unit,
          ),
        ].join('__');
        const quantity =
          normalized.quantity * scale;
        const compatibleRate =
          findCompatibleRate(
            ingredientName,
            normalized.family,
            rates,
          );
        const estimatedCost =
          compatibleRate
            ? quantity *
              compatibleRate
                .ratePerDisplayUnit
            : 0;
        const existing =
          groceries.get(key);

        if (existing) {
          existing.quantity +=
            quantity;
          existing.estimatedCost +=
            estimatedCost;
          existing.dishes.add(
            item.name,
          );

          if (
            !existing.hasRate &&
            compatibleRate
          ) {
            existing.hasRate = true;
            existing.rate =
              compatibleRate
                .ratePerDisplayUnit;
            existing.rateUnit =
              compatibleRate.rateUnit;
          }

          return;
        }

        groceries.set(key, {
          name: ingredientName,
          quantity,
          unit: normalized.unit,
          dishes: new Set([
            item.name,
          ]),
          rate:
            compatibleRate
              ?.ratePerDisplayUnit ??
            null,
          rateUnit:
            compatibleRate
              ?.rateUnit ??
            null,
          estimatedCost,
          hasRate:
            Boolean(compatibleRate),
        });
      },
    );
  });

  const items = Array.from(
    groceries.values(),
  )
    .map((item) => ({
      name: item.name,
      quantity:
        roundQuantity(
          item.quantity,
        ),
      unit: item.unit,
      dishes: Array.from(
        item.dishes,
      ).sort((left, right) =>
        left.localeCompare(right),
      ),
      rate:
        item.rate === null
          ? null
          : roundMoney(item.rate),
      rateUnit: item.rateUnit,
      estimatedCost:
        roundMoney(
          item.estimatedCost,
        ),
      hasRate: item.hasRate,
    }))
    .sort((left, right) =>
      left.name.localeCompare(
        right.name,
      ),
    );

  return {
    key: group.key,
    dayLabel: group.dayLabel,
    mealLabel: group.mealLabel,
    pax: group.pax,
    dishCount: seenDishes.size,
    items,
    matchedDishes: Array.from(
      matchedDishes,
    ).sort((left, right) =>
      left.localeCompare(right),
    ),
    unmatchedDishes: Array.from(
      unmatchedDishes,
    ).sort((left, right) =>
      left.localeCompare(right),
    ),
    estimatedIngredientCost:
      roundMoney(
        items.reduce(
          (sum, item) =>
            sum +
            item.estimatedCost,
          0,
        ),
      ),
    pricedIngredientCount:
      items.filter(
        (item) => item.hasRate,
      ).length,
    unpricedIngredientCount:
      items.filter(
        (item) => !item.hasRate,
      ).length,
  };
}

function combineSections(
  sections: FunctionGrocerySection[],
) {
  const combined = new Map<
    string,
    IngredientAccumulator
  >();

  sections.forEach((section) => {
    section.items.forEach((item) => {
      const key = [
        normalizeIngredientKey(
          item.name,
        ),
        normalizeText(item.unit),
      ].join('__');
      const existing =
        combined.get(key);

      if (existing) {
        existing.quantity +=
          item.quantity;
        existing.estimatedCost +=
          item.estimatedCost;
        item.dishes.forEach((dish) =>
          existing.dishes.add(dish),
        );

        if (
          !existing.hasRate &&
          item.hasRate
        ) {
          existing.hasRate = true;
          existing.rate = item.rate;
          existing.rateUnit =
            item.rateUnit;
        }

        return;
      }

      combined.set(key, {
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        dishes: new Set(
          item.dishes,
        ),
        rate: item.rate,
        rateUnit: item.rateUnit,
        estimatedCost:
          item.estimatedCost,
        hasRate: item.hasRate,
      });
    });
  });

  return Array.from(
    combined.values(),
  )
    .map((item) => ({
      name: item.name,
      quantity:
        roundQuantity(
          item.quantity,
        ),
      unit: item.unit,
      dishes: Array.from(
        item.dishes,
      ).sort((left, right) =>
        left.localeCompare(right),
      ),
      rate:
        item.rate === null
          ? null
          : roundMoney(item.rate),
      rateUnit: item.rateUnit,
      estimatedCost:
        roundMoney(
          item.estimatedCost,
        ),
      hasRate: item.hasRate,
    }))
    .sort((left, right) =>
      left.name.localeCompare(
        right.name,
      ),
    );
}

export function buildFunctionGroceryPlan(
  work: WorkState,
  recipeValues: GroceryRecipe[],
  rateValues: GroceryIngredientRate[],
): FunctionGroceryPlan {
  const recipes =
    recipeCatalog(
      recipeValues,
    );
  const rates =
    rateCatalog(
      rateValues,
    );
  const functions =
    buildFunctionGroups(work)
      .map((group) =>
        buildSection(
          group,
          recipes,
          rates,
        ),
      );
  const combinedItems =
    combineSections(functions);
  const matchedDishes =
    new Set<string>();
  const unmatchedDishes =
    new Set<string>();

  functions.forEach((section) => {
    section.matchedDishes.forEach(
      (dish) =>
        matchedDishes.add(dish),
    );
    section.unmatchedDishes.forEach(
      (dish) =>
        unmatchedDishes.add(dish),
    );
  });

  return {
    functions,
    combinedItems,
    combinedIngredientCost:
      roundMoney(
        combinedItems.reduce(
          (sum, item) =>
            sum +
            item.estimatedCost,
          0,
        ),
      ),
    matchedDishes: Array.from(
      matchedDishes,
    ).sort((left, right) =>
      left.localeCompare(right),
    ),
    unmatchedDishes: Array.from(
      unmatchedDishes,
    ).sort((left, right) =>
      left.localeCompare(right),
    ),
    totalFunctionCovers:
      functions.reduce(
        (sum, section) =>
          sum + section.pax,
        0,
      ),
    pricedIngredientCount:
      combinedItems.filter(
        (item) => item.hasRate,
      ).length,
    unpricedIngredientCount:
      combinedItems.filter(
        (item) => !item.hasRate,
      ).length,
  };
}

function csvCell(
  value: string | number,
) {
  let text = String(value);

  if (/^[=+@-]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

function quantityText(value: number) {
  return value
    .toFixed(3)
    .replace(/\.?0+$/, '');
}

export function downloadFunctionGroceryCsv(
  work: WorkState,
  plan: FunctionGroceryPlan,
) {
  if (
    typeof document ===
    'undefined'
  ) {
    return;
  }

  const rows: Array<
    Array<string | number>
  > = [
    ['Function-wise Grocery List'],
    [
      'Event',
      work.event.eventName || '-',
    ],
    [
      'Client',
      work.event.clientName || '-',
    ],
    [
      'Total Function Covers',
      plan.totalFunctionCovers,
    ],
    [
      'Estimated Ingredient Cost',
      plan.combinedIngredientCost,
    ],
  ];

  plan.functions.forEach(
    (section) => {
      rows.push(
        [],
        [
          [
            section.dayLabel,
            section.mealLabel,
          ]
            .filter(Boolean)
            .join(' - ') ||
            'Event Menu',
        ],
        [
          'Guests',
          section.pax,
        ],
        [
          'Ingredient',
          'Quantity',
          'Unit',
          'Rate',
          'Rate Unit',
          'Estimated Cost',
          'Used In Dishes',
        ],
      );

      section.items.forEach(
        (item) => {
          rows.push([
            item.name,
            quantityText(
              item.quantity,
            ),
            item.unit,
            item.rate ?? '',
            item.rateUnit ?? '',
            item.estimatedCost,
            item.dishes.join(', '),
          ]);
        },
      );

      if (
        section.unmatchedDishes
          .length
      ) {
        rows.push(
          [],
          [
            'Dishes Without Saved Recipes',
          ],
          ...section.unmatchedDishes.map(
            (dish) => [dish],
          ),
        );
      }
    },
  );

  rows.push(
    [],
    ['Combined Event Grocery'],
    [
      'Ingredient',
      'Quantity',
      'Unit',
      'Rate',
      'Rate Unit',
      'Estimated Cost',
      'Used In Dishes',
    ],
  );

  plan.combinedItems.forEach(
    (item) => {
      rows.push([
        item.name,
        quantityText(
          item.quantity,
        ),
        item.unit,
        item.rate ?? '',
        item.rateUnit ?? '',
        item.estimatedCost,
        item.dishes.join(', '),
      ]);
    },
  );

  const csv = `\uFEFF${rows
    .map((row) =>
      row.map(csvCell).join(','),
    )
    .join('\r\n')}`;
  const blob = new Blob(
    [csv],
    {
      type:
        'text/csv;charset=utf-8',
    },
  );
  const url =
    URL.createObjectURL(blob);
  const link =
    document.createElement('a');
  const filePart = String(
    work.event.eventName ||
      work.event.clientName ||
      'event',
  )
    .trim()
    .toLocaleLowerCase('en-IN')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') ||
    'event';

  link.href = url;
  link.download =
    `grocery-${filePart}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
