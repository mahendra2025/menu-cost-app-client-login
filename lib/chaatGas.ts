export type ChaatGasSuggestion = {
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
): ChaatGasSuggestion {
  return {
    kgPer100,
    group,
    noGas: false,
  };
}

const EXACT_CHAAT_GAS:
  Record<string, ChaatGasSuggestion> = {
    'pani puri': suggestion(0.25, 'Cold Assembly + Boiled Filling'),
    'dahi puri': suggestion(0.20, 'Cold Assembly'),
    'aloo tikki chaat': suggestion(0.75, 'Tawa / Fry Chaat'),
    'papdi chaat': suggestion(0.30, 'Cold Assembly + Prep'),
    'samosa chaat': suggestion(0.65, 'Fried + Assembly'),
    'raj kachori': suggestion(0.55, 'Fried + Assembly'),
    'bhel puri': suggestion(0.15, 'Cold Assembly'),
    'sev puri': suggestion(0.20, 'Cold Assembly'),
    'dahi bhalla': suggestion(0.60, 'Fried + Cold Assembly'),
    'basket chaat': suggestion(0.55, 'Fried + Assembly'),
    'ragda pattice': suggestion(0.90, 'Boiled Ragda + Tawa'),
    'ragda patties': suggestion(0.90, 'Boiled Ragda + Tawa'),
    'crispy corn chaat': suggestion(0.70, 'Fried Chaat'),
    'dry fruit chaat': suggestion(0.10, 'Cold Assembly'),
    'lachha tikka': suggestion(0.70, 'Tawa / Fry Chaat'),
    'lacha tikka': suggestion(0.70, 'Tawa / Fry Chaat'),
  };

/**
 * Starter LPG estimates per 100 guests.
 * Chaat varies heavily by cooking method: cold assembly uses little LPG,
 * while tikki, ragda, bhalla, samosa and fried items use more.
 * Saved dish values and real burner profiles always take priority.
 */
export function suggestChaatGas(
  dishName: string,
): ChaatGasSuggestion {
  const name = key(dishName);
  const exact = EXACT_CHAAT_GAS[name];

  if (exact) {
    return exact;
  }

  if (
    name.includes('ragda')
  ) {
    return suggestion(
      0.90,
      'Boiled Ragda + Tawa',
    );
  }

  if (
    name.includes('tikki') ||
    name.includes('pattice') ||
    name.includes('patties')
  ) {
    return suggestion(
      0.75,
      'Tawa / Fry Chaat',
    );
  }

  if (
    name.includes('samosa') ||
    name.includes('bhalla') ||
    name.includes('kachori') ||
    name.includes('basket') ||
    name.includes('crispy') ||
    name.includes('fried')
  ) {
    return suggestion(
      0.60,
      'Fried + Assembly',
    );
  }

  if (
    name.includes('pani puri')
  ) {
    return suggestion(
      0.25,
      'Cold Assembly + Boiled Filling',
    );
  }

  if (
    name.includes('dahi') ||
    name.includes('bhel') ||
    name.includes('sev puri') ||
    name.includes('papdi') ||
    name.includes('dry fruit')
  ) {
    return suggestion(
      0.20,
      'Cold Assembly',
    );
  }

  return suggestion(
    0.50,
    'Chaat Default',
  );
}
