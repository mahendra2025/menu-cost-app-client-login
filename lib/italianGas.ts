export type ItalianGasSuggestion = {
  kgPer100: number;
  group: string;
  noGas: false;
};

function key(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('en-IN')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function suggestion(
  kgPer100: number,
  group: string,
): ItalianGasSuggestion {
  return {
    kgPer100,
    group,
    noGas: false,
  };
}

const EXACT_ITALIAN_GAS:
  Record<string, ItalianGasSuggestion> = {
    'pesto risotto': suggestion(1.05, 'Risotto Simmer'),
    'pesto vegetable panini': suggestion(0.85, 'Grill / Panini'),
    'roasted vegetable salad': suggestion(0.45, 'Roast + Cold Assembly'),
    'sauteed vegetables': suggestion(0.70, 'Saute'),
    'schezwan paneer pizza': suggestion(1.20, 'Pizza Oven'),
    'schezwan pasta': suggestion(0.95, 'Boil + Sauce'),
    'spaghetti aglio olio': suggestion(0.85, 'Boil + Saute'),
    'spaghetti arrabbiata': suggestion(0.90, 'Boil + Sauce'),
    'spaghetti pesto': suggestion(0.85, 'Boil + Toss'),
    'spaghetti pomodoro': suggestion(0.90, 'Boil + Sauce'),
    'spinach corn lasagna': suggestion(1.15, 'Bake + Sauce'),
    'spinach corn pasta': suggestion(0.95, 'Boil + Sauce'),
    'spinach corn pizza': suggestion(1.15, 'Pizza Oven'),
    'spinach corn risotto': suggestion(1.05, 'Risotto Simmer'),
    'stuffed garlic bread': suggestion(1.00, 'Bake'),
    'stuffed pasta shells': suggestion(1.10, 'Boil + Bake'),
    'tandoori paneer pizza': suggestion(1.25, 'Pizza Oven + Paneer Prep'),
    'tandoori pasta': suggestion(1.00, 'Boil + Sauce'),
    'thin crust margherita pizza': suggestion(1.10, 'Pizza Oven'),
    'tomato basil bruschetta': suggestion(0.60, 'Toast + Topping'),
    'tomato basil pasta': suggestion(0.90, 'Boil + Sauce'),
    'tomato basil risotto': suggestion(1.00, 'Risotto Simmer'),
    'tomato crostini': suggestion(0.55, 'Toast + Topping'),
    'truffle mushroom pasta': suggestion(0.95, 'Boil + Sauce'),
    'truffle mushroom risotto': suggestion(1.05, 'Risotto Simmer'),
    'vegetable au gratin': suggestion(1.10, 'Bake + Sauce'),
    'vegetable calzone': suggestion(1.15, 'Pizza Oven'),
    'vegetable lasagna': suggestion(1.15, 'Bake + Sauce'),
    'vegetable panini': suggestion(0.80, 'Grill / Panini'),
    'vegetable risotto': suggestion(1.00, 'Risotto Simmer'),
    'veggie delight pizza': suggestion(1.15, 'Pizza Oven'),
    'wood fired margherita pizza': suggestion(0.20, 'Wood Fired + Sauce Prep'),
    'veg pizza': suggestion(1.15, 'Pizza Oven'),
  };

/**
 * Starter LPG estimates per 100 guests.
 * Italian dishes vary by boiling, sauteing, simmering, grilling and oven use.
 * Saved dish values and real burner profiles always take priority.
 */
export function suggestItalianGas(
  dishName: string,
): ItalianGasSuggestion {
  const name = key(dishName);
  const exact = EXACT_ITALIAN_GAS[name];

  if (exact) {
    return exact;
  }

  if (
    name.includes('wood fired') &&
    name.includes('pizza')
  ) {
    return suggestion(
      0.20,
      'Wood Fired + Sauce Prep',
    );
  }

  if (
    name.includes('pizza') ||
    name.includes('calzone')
  ) {
    return suggestion(
      1.15,
      'Pizza Oven',
    );
  }

  if (
    name.includes('lasagna') ||
    name.includes('au gratin') ||
    name.includes('gratin') ||
    name.includes('stuffed pasta shells')
  ) {
    return suggestion(
      1.10,
      'Bake + Sauce',
    );
  }

  if (
    name.includes('risotto')
  ) {
    return suggestion(
      1.00,
      'Risotto Simmer',
    );
  }

  if (
    name.includes('panini')
  ) {
    return suggestion(
      0.80,
      'Grill / Panini',
    );
  }

  if (
    name.includes('bruschetta') ||
    name.includes('crostini') ||
    name.includes('garlic bread')
  ) {
    return suggestion(
      0.60,
      'Toast / Bake',
    );
  }

  if (
    name.includes('salad')
  ) {
    return suggestion(
      0.35,
      'Light Cook + Cold Assembly',
    );
  }

  if (
    name.includes('saute') ||
    name.includes('sauté')
  ) {
    return suggestion(
      0.70,
      'Saute',
    );
  }

  if (
    name.includes('pasta') ||
    name.includes('spaghetti')
  ) {
    return suggestion(
      0.90,
      'Boil + Sauce',
    );
  }

  return suggestion(
    0.80,
    'Italian Default',
  );
}
