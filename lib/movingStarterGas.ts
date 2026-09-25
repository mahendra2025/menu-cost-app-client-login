export type MovingStarterGasSuggestion = {
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
): MovingStarterGasSuggestion {
  return {
    kgPer100,
    group,
    noGas: false,
  };
}

const EXACT_MOVING_STARTER_GAS:
  Record<string, MovingStarterGasSuggestion> = {
    'paneer malai tikka': suggestion(1.25, 'Tandoor / Tikka'),
    'achari paneer tikka': suggestion(1.25, 'Tandoor / Tikka'),
    'dahi ke kebab': suggestion(1.10, 'Fry / Shallow Fry'),
    'veg seekh kebab': suggestion(1.15, 'Tandoor / Grill'),
    'crispy corn': suggestion(1.10, 'Deep Fried'),
    'cheese corn ball': suggestion(1.15, 'Deep Fried'),
    'mini veg spring roll': suggestion(1.10, 'Deep Fried'),
    'mini hara bhara kebab': suggestion(1.00, 'Tawa / Fry'),
    'paneer chilli bites': suggestion(1.20, 'Fry + Toss'),
    'mini samosa': suggestion(1.15, 'Deep Fried'),
    'tandoori broccoli': suggestion(1.10, 'Tandoor / Grill'),
    'tandoori mushroom': suggestion(1.10, 'Tandoor / Grill'),
    'stuffed paneer tikka': suggestion(1.30, 'Tandoor / Stuffed Tikka'),
    'veg shami kebab': suggestion(1.00, 'Tawa / Fry'),
    'veg galouti kebab': suggestion(0.95, 'Tawa / Shallow Fry'),
    'crispy baby corn': suggestion(1.15, 'Deep Fried'),
    'honey chilli lotus stem': suggestion(1.20, 'Fry + Toss'),
    'mini veg cutlet': suggestion(1.00, 'Fry / Shallow Fry'),
    'paneer popcorn': suggestion(1.20, 'Deep Fried'),
    'cheese cigar roll': suggestion(1.15, 'Deep Fried'),
    'corn cheese seekh kebab': suggestion(1.15, 'Tandoor / Grill'),
    'tandoori baby corn': suggestion(1.05, 'Tandoor / Grill'),
    'malai broccoli tikka': suggestion(1.15, 'Tandoor / Tikka'),
    'veg kurkure': suggestion(1.15, 'Deep Fried'),
    'mini paneer samosa': suggestion(1.20, 'Deep Fried'),
    'spinach cheese roll': suggestion(1.15, 'Deep Fried'),
    'schezwan paneer finger': suggestion(1.20, 'Fry + Toss'),
    'potato cheese shot': suggestion(1.10, 'Deep Fried'),
    'tandoori pineapple': suggestion(0.90, 'Tandoor / Grill'),
    'veg cheese lollipop': suggestion(1.15, 'Deep Fried'),
    'paneer kathi bite': suggestion(1.10, 'Tawa / Grill'),
    'corn palak tikki': suggestion(1.00, 'Tawa / Fry'),
    'dahi paneer sholay': suggestion(1.20, 'Fry / Tandoor'),
    'tandoori aloo': suggestion(1.00, 'Tandoor / Grill'),
    'paneer cheese croquette': suggestion(1.20, 'Deep Fried'),
    'sesame paneer': suggestion(1.15, 'Fry + Toss'),
    'veg manchurian ball': suggestion(1.15, 'Deep Fried'),
    'mini pizza bite': suggestion(0.90, 'Bake / Oven'),
    'cheese jalapeno popper': suggestion(1.15, 'Deep Fried'),
    'veg satay stick': suggestion(0.90, 'Grill / Tawa'),
  };

/**
 * Starter LPG estimates per 100 guests.
 * Moving starters vary mainly by tandoor/grill, shallow fry, deep fry,
 * wok-toss and oven method.
 * Saved dish values and real burner profiles always take priority.
 */
export function suggestMovingStarterGas(
  dishName: string,
): MovingStarterGasSuggestion {
  const name = key(dishName);
  const exact = EXACT_MOVING_STARTER_GAS[name];

  if (exact) {
    return exact;
  }

  if (
    name.includes('paneer') &&
    name.includes('tikka')
  ) {
    return suggestion(
      1.25,
      'Tandoor / Tikka',
    );
  }

  if (
    name.includes('tandoori') ||
    name.includes('tikka') ||
    name.includes('seekh')
  ) {
    return suggestion(
      1.10,
      'Tandoor / Grill',
    );
  }

  if (
    name.includes('manchurian') ||
    name.includes('chilli') ||
    name.includes('schezwan') ||
    name.includes('honey chilli') ||
    name.includes('sesame')
  ) {
    return suggestion(
      1.20,
      'Fry + Toss',
    );
  }

  if (
    name.includes('popcorn') ||
    name.includes('croquette') ||
    name.includes('spring roll') ||
    name.includes('samosa') ||
    name.includes('kurkure') ||
    name.includes('popper') ||
    name.includes('cigar roll') ||
    name.includes('crispy') ||
    name.includes('cheese ball') ||
    name.includes('lollipop')
  ) {
    return suggestion(
      1.15,
      'Deep Fried',
    );
  }

  if (
    name.includes('kebab') ||
    name.includes('tikki') ||
    name.includes('cutlet')
  ) {
    return suggestion(
      1.00,
      'Tawa / Fry',
    );
  }

  if (
    name.includes('pizza')
  ) {
    return suggestion(
      0.90,
      'Bake / Oven',
    );
  }

  if (
    name.includes('satay') ||
    name.includes('kathi')
  ) {
    return suggestion(
      0.90,
      'Grill / Tawa',
    );
  }

  return suggestion(
    1.00,
    'Moving Starter Default',
  );
}
