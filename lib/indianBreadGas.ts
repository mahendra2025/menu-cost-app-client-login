export type IndianBreadGasSuggestion = {
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
): IndianBreadGasSuggestion {
  return {
    kgPer100,
    group,
    noGas: false,
  };
}

const EXACT_INDIAN_BREAD_GAS:
  Record<string, IndianBreadGasSuggestion> = {
    'chapati': suggestion(1.00, 'Tawa Bread'),
    'roti': suggestion(1.00, 'Tawa Bread'),
    'phulka': suggestion(1.05, 'Tawa + Flame'),
    'tandoori roti': suggestion(1.35, 'Tandoor Bread'),
    'butter tandoori roti': suggestion(1.35, 'Tandoor Bread'),
    'plain naan': suggestion(1.45, 'Tandoor Naan'),
    'butter naan': suggestion(1.45, 'Tandoor Naan'),
    'garlic naan': suggestion(1.50, 'Tandoor Naan'),
    'missi roti': suggestion(1.20, 'Tawa / Tandoor Bread'),
    'bajra roti': suggestion(1.20, 'Tawa Millet Bread'),
    'makki roti': suggestion(1.25, 'Tawa Millet Bread'),
    'plain puri': suggestion(1.20, 'Deep Fried Bread'),
    'puri': suggestion(1.20, 'Deep Fried Bread'),
    'poori': suggestion(1.20, 'Deep Fried Bread'),
    'laccha paratha': suggestion(1.25, 'Tawa Paratha'),
    'lachha paratha': suggestion(1.25, 'Tawa Paratha'),
    'pudina paratha': suggestion(1.20, 'Tawa Paratha'),
  };

/**
 * Starter LPG estimates per 100 guests.
 * Indian breads vary mainly by tawa, direct flame, tandoor and deep-frying.
 * Saved dish values and real burner profiles always take priority.
 */
export function suggestIndianBreadGas(
  dishName: string,
): IndianBreadGasSuggestion {
  const name = key(dishName);
  const exact = EXACT_INDIAN_BREAD_GAS[name];

  if (exact) {
    return exact;
  }

  if (
    name.includes('naan')
  ) {
    return suggestion(
      name.includes('garlic')
        ? 1.50
        : 1.45,
      'Tandoor Naan',
    );
  }

  if (
    name.includes('tandoori') ||
    name.includes('tandoor')
  ) {
    return suggestion(
      1.35,
      'Tandoor Bread',
    );
  }

  if (
    name.includes('puri') ||
    name.includes('poori')
  ) {
    return suggestion(
      1.20,
      'Deep Fried Bread',
    );
  }

  if (
    name.includes('paratha')
  ) {
    return suggestion(
      1.25,
      'Tawa Paratha',
    );
  }

  if (
    name.includes('bajra') ||
    name.includes('makki') ||
    name.includes('jowar')
  ) {
    return suggestion(
      1.20,
      'Tawa Millet Bread',
    );
  }

  if (
    name.includes('phulka')
  ) {
    return suggestion(
      1.05,
      'Tawa + Flame',
    );
  }

  if (
    name.includes('chapati') ||
    name.includes('roti')
  ) {
    return suggestion(
      1.00,
      'Tawa Bread',
    );
  }

  return suggestion(
    1.30,
    'Indian Bread Default',
  );
}
