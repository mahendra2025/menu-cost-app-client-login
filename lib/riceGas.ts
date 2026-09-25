export type RiceGasSuggestion = {
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
): RiceGasSuggestion {
  return {
    kgPer100,
    group,
    noGas: false,
  };
}

const EXACT_RICE_GAS:
  Record<string, RiceGasSuggestion> = {
    'jeera rice': suggestion(0.75, 'Rice + Tempering'),
    'eera rice': suggestion(0.75, 'Rice + Tempering'),
    'steamed rice': suggestion(0.65, 'Plain Rice'),
    'matar pulao': suggestion(0.80, 'Pulao'),
    'peas pulao': suggestion(0.80, 'Pulao'),
    'veg pulao': suggestion(0.85, 'Vegetable Pulao'),
    'kashmiri pulao': suggestion(0.90, 'Rich Pulao'),
    'veg dum biryani': suggestion(1.10, 'Dum Biryani'),
    'veg biryani': suggestion(1.00, 'Biryani'),
    'lemon rice': suggestion(0.75, 'Rice + Tempering'),
    'curd rice': suggestion(0.65, 'Rice + Tempering'),
    'tomato rice': suggestion(0.80, 'Masala Rice'),
    'masala rice': suggestion(0.85, 'Masala Rice'),
    'kesar rice': suggestion(0.75, 'Flavoured Rice'),
  };

/**
 * Starter LPG estimates per 100 guests.
 * Rice dishes vary mainly by plain boiling, tempering, pulao frying,
 * and dum cooking. Saved dish values and real burner profiles always win.
 */
export function suggestRiceGas(
  dishName: string,
): RiceGasSuggestion {
  const name = key(dishName);
  const exact = EXACT_RICE_GAS[name];

  if (exact) {
    return exact;
  }

  if (
    name.includes('dum') &&
    name.includes('biryani')
  ) {
    return suggestion(
      1.10,
      'Dum Biryani',
    );
  }

  if (
    name.includes('biryani')
  ) {
    return suggestion(
      1.00,
      'Biryani',
    );
  }

  if (
    name.includes('kashmiri') &&
    name.includes('pulao')
  ) {
    return suggestion(
      0.90,
      'Rich Pulao',
    );
  }

  if (
    name.includes('pulao') ||
    name.includes('pulav')
  ) {
    return suggestion(
      0.85,
      'Pulao',
    );
  }

  if (
    name.includes('steamed') ||
    name.includes('plain rice') ||
    name === 'rice'
  ) {
    return suggestion(
      0.65,
      'Plain Rice',
    );
  }

  if (
    name.includes('jeera') ||
    name.includes('lemon') ||
    name.includes('curd')
  ) {
    return suggestion(
      0.75,
      'Rice + Tempering',
    );
  }

  if (
    name.includes('tomato') ||
    name.includes('masala')
  ) {
    return suggestion(
      0.85,
      'Masala Rice',
    );
  }

  return suggestion(
    0.70,
    'Rice Default',
  );
}
