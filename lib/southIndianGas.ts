export type SouthIndianGasSuggestion = {
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
): SouthIndianGasSuggestion {
  return {
    kgPer100,
    group,
    noGas: false,
  };
}

const EXACT_SOUTH_INDIAN_GAS:
  Record<string, SouthIndianGasSuggestion> = {
    'noodle dosa': suggestion(1.35, 'Loaded Dosa'),
    'oats dosa': suggestion(1.15, 'Tawa Dosa'),
    'oats idli': suggestion(0.75, 'Steamed Idli'),
    'oats uttapam': suggestion(1.10, 'Tawa Uttapam'),
    'olan': suggestion(0.85, 'Coconut Stew'),
    'onion bajji': suggestion(1.15, 'Deep Fried'),
    'onion dosa': suggestion(1.20, 'Tawa Dosa'),
    'onion masala dosa': suggestion(1.30, 'Dosa + Masala'),
    'onion rava dosa': suggestion(1.30, 'Rava Dosa'),
    'onion rava masala dosa': suggestion(1.35, 'Rava Dosa + Masala'),
    'onion tomato uttapam': suggestion(1.20, 'Tawa Uttapam'),
    'onion uttapam': suggestion(1.15, 'Tawa Uttapam'),
    'palak dosa': suggestion(1.15, 'Tawa Dosa'),
    'paneer cheese dosa': suggestion(1.35, 'Loaded Dosa'),
    'paneer cheese uttapam': suggestion(1.30, 'Loaded Uttapam'),
    'paneer dosa': suggestion(1.30, 'Loaded Dosa'),
    'paneer masala dosa': suggestion(1.35, 'Loaded Dosa + Masala'),
    'paneer uttapam': suggestion(1.25, 'Loaded Uttapam'),
    'paper dosa': suggestion(1.30, 'Paper Dosa'),
    'paper masala dosa': suggestion(1.35, 'Paper Dosa + Masala'),
    'peanut chutney': suggestion(0.20, 'Chutney Prep'),
    'peanut rice': suggestion(0.80, 'Tempered Rice'),
    'pepper rasam': suggestion(0.80, 'Rasam Simmer'),
    'pesarattu': suggestion(1.10, 'Tawa Pesarattu'),
    'pesarattu upma': suggestion(1.25, 'Tawa + Upma'),
    'pizza dosa': suggestion(1.40, 'Loaded Dosa'),
    'plain dosa': suggestion(1.15, 'Tawa Dosa'),
    'plain idli': suggestion(0.70, 'Steamed Idli'),
    'plain uttapam': suggestion(1.10, 'Tawa Uttapam'),
    'podi dosa': suggestion(1.20, 'Tawa Dosa'),
    'podi idli': suggestion(0.80, 'Steamed + Tempering'),
    'podi uttapam': suggestion(1.15, 'Tawa Uttapam'),
    'potato masala': suggestion(0.75, 'Potato Masala'),
    'punugulu': suggestion(1.10, 'Deep Fried'),
    'puttu with kadala curry': suggestion(1.15, 'Steam + Curry'),
    'quinoa dosa': suggestion(1.15, 'Tawa Dosa'),
    'ragi dosa': suggestion(1.15, 'Tawa Dosa'),
    'ragi idli': suggestion(0.75, 'Steamed Idli'),
    'ragi roti': suggestion(1.00, 'Tawa Roti'),
    'rasam': suggestion(0.75, 'Rasam Simmer'),
    'rasam rice': suggestion(0.85, 'Rice + Rasam'),
    'rasam shots': suggestion(0.60, 'Rasam Simmer'),
    'rasam vada': suggestion(1.30, 'Fried Vada + Rasam'),
    'rava idli': suggestion(0.75, 'Steamed Idli'),
    'rava masala dosa': suggestion(1.30, 'Rava Dosa + Masala'),
    'rava pongal': suggestion(0.90, 'Pongal Simmer'),
    'rava upma': suggestion(0.85, 'Upma'),
    'rava uttapam': suggestion(1.15, 'Tawa Uttapam'),
    'sambhar': suggestion(1.00, 'Sambhar Simmer'),
    'sambar': suggestion(1.00, 'Sambhar Simmer'),
    'sambhar rice': suggestion(0.90, 'Rice + Sambhar'),
    'sambhar vada': suggestion(1.35, 'Fried Vada + Sambhar'),
    'schezwan cheese dosa': suggestion(1.35, 'Loaded Dosa'),
    'schezwan dosa': suggestion(1.25, 'Tawa Dosa'),
    'schezwan idli': suggestion(0.90, 'Steamed + Toss'),
    'schezwan masala dosa': suggestion(1.35, 'Loaded Dosa + Masala'),
    'schezwan uttapam': suggestion(1.25, 'Loaded Uttapam'),
    'semiya upma': suggestion(0.85, 'Upma'),
    'sesame rice': suggestion(0.80, 'Tempered Rice'),
    'set dosa': suggestion(1.10, 'Tawa Dosa'),
    'south indian platter': suggestion(1.50, 'Multi-item Platter'),
    'south indian vegetable pulao': suggestion(0.85, 'Vegetable Pulao'),
    'spring dosa': suggestion(1.30, 'Loaded Dosa'),
    'stuffed idli': suggestion(0.85, 'Steamed Stuffed Idli'),
    'sweet pongal': suggestion(1.00, 'Sweet Pongal Simmer'),
    'tamarind rice': suggestion(0.80, 'Tempered Rice'),
    'thatte idli': suggestion(0.80, 'Steamed Idli'),
    'thoran': suggestion(0.70, 'Dry Coconut Sabji'),
    'tiffin sambhar': suggestion(0.95, 'Sambhar Simmer'),
    'tomato chutney': suggestion(0.35, 'Cooked Chutney'),
    'tomato dosa': suggestion(1.15, 'Tawa Dosa'),
    'tomato upma': suggestion(0.90, 'Upma'),
    'tomato uttapam': suggestion(1.15, 'Tawa Uttapam'),
    'topi dosa': suggestion(1.30, 'Paper / Shape Dosa'),
    'upma breakfast': suggestion(0.85, 'Upma'),
    'vangi bath': suggestion(0.90, 'Masala Rice'),
    'vegetable bath': suggestion(0.90, 'Masala Rice'),
    'vegetable idli': suggestion(0.80, 'Steamed Idli'),
    'vegetable kurma': suggestion(0.95, 'Vegetable Gravy'),
    'vegetable paniyaram': suggestion(1.00, 'Paniyaram Pan'),
    'vegetable sambhar': suggestion(1.05, 'Sambhar Simmer'),
    'vegetable sambar': suggestion(1.05, 'Sambhar Simmer'),
    'vegetable stew': suggestion(0.90, 'Coconut Stew'),
    'vegetable uttapam': suggestion(1.20, 'Tawa Uttapam'),
    'ven pongal': suggestion(0.95, 'Pongal Simmer'),
  };

/**
 * Starter LPG estimates per 100 guests.
 * South Indian dishes vary by tawa, steaming, frying, simmering and tempering.
 * Saved dish values and real burner profiles always take priority.
 */
export function suggestSouthIndianGas(
  dishName: string,
): SouthIndianGasSuggestion {
  const name = key(dishName);
  const exact = EXACT_SOUTH_INDIAN_GAS[name];

  if (exact) {
    return exact;
  }

  if (
    name.includes('chutney')
  ) {
    return suggestion(
      0.30,
      'Chutney Prep',
    );
  }

  if (
    name.includes('vada') ||
    name.includes('bajji') ||
    name.includes('punugulu')
  ) {
    return suggestion(
      name.includes('sambhar') ||
      name.includes('sambar') ||
      name.includes('rasam')
        ? 1.30
        : 1.15,
      'Fried South Indian',
    );
  }

  if (
    name.includes('idli')
  ) {
    return suggestion(
      0.75,
      'Steamed Idli',
    );
  }

  if (
    name.includes('uttapam')
  ) {
    return suggestion(
      name.includes('paneer') ||
      name.includes('cheese') ||
      name.includes('schezwan')
        ? 1.25
        : 1.15,
      'Tawa Uttapam',
    );
  }

  if (
    name.includes('dosa')
  ) {
    if (
      name.includes('masala') ||
      name.includes('paneer') ||
      name.includes('cheese') ||
      name.includes('spring') ||
      name.includes('pizza') ||
      name.includes('noodle')
    ) {
      return suggestion(
        1.30,
        'Loaded Dosa',
      );
    }

    return suggestion(
      1.15,
      'Tawa Dosa',
    );
  }

  if (
    name.includes('sambhar') ||
    name.includes('sambar')
  ) {
    return suggestion(
      1.00,
      'Sambhar Simmer',
    );
  }

  if (
    name.includes('rasam')
  ) {
    return suggestion(
      0.75,
      'Rasam Simmer',
    );
  }

  if (
    name.includes('upma')
  ) {
    return suggestion(
      0.85,
      'Upma',
    );
  }

  if (
    name.includes('pongal')
  ) {
    return suggestion(
      0.95,
      'Pongal Simmer',
    );
  }

  if (
    name.includes('rice') ||
    name.includes('bath') ||
    name.includes('pulao')
  ) {
    return suggestion(
      0.85,
      'South Indian Rice',
    );
  }

  if (
    name.includes('stew') ||
    name.includes('kurma') ||
    name.includes('olan')
  ) {
    return suggestion(
      0.90,
      'South Indian Gravy',
    );
  }

  return suggestion(
    1.00,
    'South Indian Default',
  );
}
