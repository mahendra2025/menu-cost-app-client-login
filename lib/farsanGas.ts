export type FarsanGasSuggestion = {
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
): FarsanGasSuggestion {
  return {
    kgPer100,
    group,
    noGas: false,
  };
}

const EXACT_FARSAN_GAS:
  Record<string, FarsanGasSuggestion> = {
    'khaman': suggestion(0.75, 'Steamed Farsan'),
    'nylon khaman': suggestion(0.75, 'Steamed Farsan'),
    'khandvi': suggestion(0.85, 'Cooked Batter + Tempering'),
    'patra': suggestion(0.90, 'Steamed + Tempering'),
    'methi gota': suggestion(1.10, 'Deep Fried'),
    'lilva kachori': suggestion(1.20, 'Stuffed Deep Fried'),
    'dal vada': suggestion(1.15, 'Deep Fried'),
    'handvo': suggestion(1.00, 'Slow Cook / Bake'),
    'methi muthiya': suggestion(0.90, 'Steamed + Tempering'),
    'sev khamani': suggestion(0.80, 'Steamed + Tempering'),
    'rava dhokla': suggestion(0.75, 'Steamed Farsan'),
    'fulwadi': suggestion(1.10, 'Deep Fried'),
    'ganthiya': suggestion(1.20, 'Deep Fried'),
    'bhavnagari gathiya': suggestion(1.20, 'Deep Fried'),
    'chorafali': suggestion(1.15, 'Deep Fried'),
    'ratlami sev': suggestion(1.20, 'Deep Fried'),
    'poha chivda': suggestion(0.55, 'Roast / Light Fry'),
    'masala peanuts': suggestion(0.90, 'Roast / Fry'),
    'mirchi vada': suggestion(1.20, 'Stuffed Deep Fried'),
    'bread pakoda': suggestion(1.15, 'Deep Fried'),
    'bread pakora': suggestion(1.15, 'Deep Fried'),
    'fafda': suggestion(1.20, 'Deep Fried'),
    'khaman dhokla': suggestion(0.75, 'Steamed Farsan'),
    'khandvi farsan': suggestion(0.85, 'Cooked Batter + Tempering'),
    'lilva kachori farsan': suggestion(1.20, 'Stuffed Deep Fried'),
    'samosa': suggestion(1.25, 'Stuffed Deep Fried'),
    'pakodi': suggestion(1.15, 'Deep Fried'),
    'khakhra': suggestion(0.65, 'Tawa Roast'),
    'paneer pakoda': suggestion(1.20, 'Deep Fried'),
    'sweet corn pakoda': suggestion(1.10, 'Deep Fried'),
    'batata vada': suggestion(1.15, 'Deep Fried'),
    'moong dal kachori': suggestion(1.25, 'Stuffed Deep Fried'),
    'dal kachori': suggestion(1.25, 'Stuffed Deep Fried'),
  };

/**
 * Starter LPG estimates per 100 guests.
 * Farsan varies mainly by steaming, frying, roasting and slow-cooking method.
 * Saved dish values and real burner profiles always take priority.
 */
export function suggestFarsanGas(
  dishName: string,
): FarsanGasSuggestion {
  const name = key(dishName);
  const exact = EXACT_FARSAN_GAS[name];

  if (exact) {
    return exact;
  }

  if (
    name.includes('khaman') ||
    name.includes('dhokla')
  ) {
    return suggestion(
      0.75,
      'Steamed Farsan',
    );
  }

  if (
    name.includes('khandvi')
  ) {
    return suggestion(
      0.85,
      'Cooked Batter + Tempering',
    );
  }

  if (
    name.includes('patra') ||
    name.includes('muthiya')
  ) {
    return suggestion(
      0.90,
      'Steamed + Tempering',
    );
  }

  if (
    name.includes('khakhra')
  ) {
    return suggestion(
      0.65,
      'Tawa Roast',
    );
  }

  if (
    name.includes('chivda')
  ) {
    return suggestion(
      0.55,
      'Roast / Light Fry',
    );
  }

  if (
    name.includes('kachori') ||
    name.includes('samosa') ||
    name.includes('mirchi vada')
  ) {
    return suggestion(
      1.25,
      'Stuffed Deep Fried',
    );
  }

  if (
    name.includes('pakoda') ||
    name.includes('pakora') ||
    name.includes('pakodi') ||
    name.includes('vada') ||
    name.includes('gota') ||
    name.includes('fafda') ||
    name.includes('ganthiya') ||
    name.includes('gathiya') ||
    name.includes('sev') ||
    name.includes('fulwadi') ||
    name.includes('chorafali')
  ) {
    return suggestion(
      1.15,
      'Deep Fried',
    );
  }

  if (
    name.includes('handvo')
  ) {
    return suggestion(
      1.00,
      'Slow Cook / Bake',
    );
  }

  return suggestion(
    1.00,
    'Farsan Default',
  );
}
