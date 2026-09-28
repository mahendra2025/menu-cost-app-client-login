export type ThaiGasSuggestion = {
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
): ThaiGasSuggestion {
  return {
    kgPer100,
    group,
    noGas: false,
  };
}

const EXACT_THAI_GAS:
  Record<string, ThaiGasSuggestion> = {
    'thai noodles': suggestion(1.00, 'Boil + Wok Toss'),
  };

/**
 * Starter LPG estimates per 100 guests.
 * Thai dishes vary mainly by boiling, wok-tossing, curry simmering and rice.
 * Saved dish values and real burner profiles always take priority.
 */
export function suggestThaiGas(
  dishName: string,
): ThaiGasSuggestion {
  const name = key(dishName);
  const exact = EXACT_THAI_GAS[name];

  if (exact) {
    return exact;
  }

  if (
    name.includes('noodle') ||
    name.includes('pad thai')
  ) {
    return suggestion(
      1.00,
      'Boil + Wok Toss',
    );
  }

  if (
    name.includes('fried rice')
  ) {
    return suggestion(
      0.90,
      'Wok Rice',
    );
  }

  if (
    name.includes('curry')
  ) {
    return suggestion(
      1.05,
      'Thai Curry Simmer',
    );
  }

  if (
    name.includes('soup')
  ) {
    return suggestion(
      0.80,
      'Thai Soup Simmer',
    );
  }

  if (
    name.includes('salad')
  ) {
    return suggestion(
      0.25,
      'Light Cook / Assembly',
    );
  }

  return suggestion(
    0.90,
    'Thai Default',
  );
}
