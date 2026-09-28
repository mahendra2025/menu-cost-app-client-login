export type DalKadhiGasSuggestion = {
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
): DalKadhiGasSuggestion {
  return {
    kgPer100,
    group,
    noGas: false,
  };
}

const EXACT_DAL_KADHI_GAS:
  Record<string, DalKadhiGasSuggestion> = {
    'dal tadka': suggestion(1.00, 'Boil + Tadka'),
    'dal fry': suggestion(0.95, 'Boil + Fry Tadka'),
    'dal makhani': suggestion(1.40, 'Long Simmer Dal'),
    'dal palak': suggestion(1.05, 'Dal + Leafy Simmer'),
    'panchmel dal': suggestion(1.15, 'Mixed Dal Simmer'),
    'gujarati dal': suggestion(0.95, 'Light Dal Simmer'),
    'gujarati kadhi': suggestion(0.80, 'Kadhi Simmer'),
    'punjabi kadhi pakora': suggestion(1.35, 'Fried Pakora + Kadhi'),
    'rajasthani kadhi': suggestion(0.85, 'Kadhi Simmer'),
    'moong dal': suggestion(0.85, 'Quick Dal Simmer'),
  };

/**
 * Starter LPG estimates per 100 guests.
 * Dal/Kadhi gas varies mostly by simmer time and whether frying/tadka is needed.
 * Saved dish values and real burner profiles always take priority.
 */
export function suggestDalKadhiGas(
  dishName: string,
): DalKadhiGasSuggestion {
  const name = key(dishName);
  const exact = EXACT_DAL_KADHI_GAS[name];

  if (exact) {
    return exact;
  }

  if (
    name.includes('makhani') ||
    name.includes('maa ki dal') ||
    name.includes('kali dal')
  ) {
    return suggestion(
      1.40,
      'Long Simmer Dal',
    );
  }

  if (
    name.includes('pakora') &&
    name.includes('kadhi')
  ) {
    return suggestion(
      1.35,
      'Fried Pakora + Kadhi',
    );
  }

  if (
    name.includes('kadhi')
  ) {
    return suggestion(
      0.85,
      'Kadhi Simmer',
    );
  }

  if (
    name.includes('panchmel') ||
    name.includes('panchratna') ||
    name.includes('mixed dal')
  ) {
    return suggestion(
      1.15,
      'Mixed Dal Simmer',
    );
  }

  if (
    name.includes('palak') ||
    name.includes('methi')
  ) {
    return suggestion(
      1.05,
      'Dal + Leafy Simmer',
    );
  }

  if (
    name.includes('moong') ||
    name.includes('yellow dal')
  ) {
    return suggestion(
      0.85,
      'Quick Dal Simmer',
    );
  }

  if (
    name.includes('fry')
  ) {
    return suggestion(
      0.95,
      'Boil + Fry Tadka',
    );
  }

  if (
    name.includes('tadka')
  ) {
    return suggestion(
      1.00,
      'Boil + Tadka',
    );
  }

  return suggestion(
    1.00,
    'Dal / Kadhi Default',
  );
}
