export type ChineseGasSuggestion = {
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
): ChineseGasSuggestion {
  return {
    kgPer100,
    group,
    noGas: false,
  };
}

const EXACT_CHINESE_GAS:
  Record<string, ChineseGasSuggestion> = {
    'veg manchurian dry': suggestion(1.20, 'Fried + Toss'),
    'veg manchurian gravy': suggestion(1.30, 'Fried + Gravy'),
    'hakka noodles': suggestion(0.95, 'Wok Noodles'),
    'schezwan noodles': suggestion(1.00, 'Wok Noodles'),
    'veg fried rice': suggestion(0.85, 'Wok Rice'),
    'schezwan fried rice': suggestion(0.90, 'Wok Rice'),
    'chilli paneer dry': suggestion(1.20, 'Paneer Fry + Toss'),
    'chilli paneer gravy': suggestion(1.30, 'Paneer Fry + Gravy'),
    'crispy veg': suggestion(1.25, 'Deep Fried'),
    'honey chilli potato': suggestion(1.20, 'Fried + Toss'),
    'veg spring roll': suggestion(1.15, 'Deep Fried'),
    'chilli baby corn': suggestion(1.10, 'Fried + Toss'),
    'dragon paneer': suggestion(1.25, 'Paneer Fry + Toss'),
    'singapore noodles': suggestion(1.00, 'Wok Noodles'),
    'triple schezwan rice': suggestion(1.25, 'Rice + Sauce Combo'),
    'triple schezwan fried rice': suggestion(1.25, 'Rice + Sauce Combo'),
    'triple schezwan noodles': suggestion(1.30, 'Noodles + Sauce Combo'),
    'chinese bhel': suggestion(0.80, 'Fried Noodles + Toss'),
    'veg 65': suggestion(1.20, 'Deep Fried'),
    'paneer 65': suggestion(1.25, 'Paneer Fry'),
    'hot garlic vegetables': suggestion(1.05, 'Wok Gravy'),
    'american chopsuey': suggestion(1.25, 'Fried Noodles + Gravy'),
    'chinese chopsuey': suggestion(1.20, 'Fried Noodles + Gravy'),
    'baby corn fried rice': suggestion(0.90, 'Wok Rice'),
    'baby corn in hot garlic sauce': suggestion(1.10, 'Wok Gravy'),
    'baby corn in schezwan sauce': suggestion(1.10, 'Wok Gravy'),
    'baby corn mushroom gravy': suggestion(1.15, 'Wok Gravy'),
    'baby corn noodles': suggestion(1.00, 'Wok Noodles'),
    'baby corn salt and pepper': suggestion(1.10, 'Fried + Toss'),
    'basil fried rice': suggestion(0.85, 'Wok Rice'),
    'black pepper fried rice': suggestion(0.90, 'Wok Rice'),
    'black pepper noodles': suggestion(1.00, 'Wok Noodles'),
    'black pepper paneer': suggestion(1.15, 'Paneer + Sauce'),
    'broccoli fried rice': suggestion(0.85, 'Wok Rice'),
    'broccoli in black pepper sauce': suggestion(1.05, 'Wok Gravy'),
    'broccoli in garlic sauce': suggestion(1.05, 'Wok Gravy'),
    'broccoli mushroom stir fry': suggestion(0.95, 'Stir Fry'),
    'broccoli noodles': suggestion(1.00, 'Wok Noodles'),
    'burnt garlic fried rice': suggestion(0.90, 'Wok Rice'),
    'burnt garlic noodles': suggestion(1.00, 'Wok Noodles'),
    'cheese corn momos': suggestion(0.75, 'Steamed Momos'),
    'chilli garlic fried rice': suggestion(0.90, 'Wok Rice'),
    'chilli garlic noodles': suggestion(1.00, 'Wok Noodles'),
    'chilli mushroom': suggestion(1.10, 'Fried / Wok Sauce'),
    'chilli tofu': suggestion(1.10, 'Fried / Wok Sauce'),
    'chinese combo plate': suggestion(1.40, 'Multi-item Combo'),
    'chinese mixed vegetable': suggestion(1.00, 'Wok Vegetables'),
    'corn fried rice': suggestion(0.85, 'Wok Rice'),
    'corn manchurian': suggestion(1.20, 'Fried + Toss'),
    'crispy lotus stem': suggestion(1.25, 'Deep Fried'),
    'crispy spinach': suggestion(1.15, 'Deep Fried'),
    'crispy vegetables': suggestion(1.25, 'Deep Fried'),
    'exotic vegetables in black pepper sauce': suggestion(1.10, 'Wok Gravy'),
    'exotic vegetables in garlic sauce': suggestion(1.10, 'Wok Gravy'),
    'fried rice with manchurian': suggestion(1.35, 'Rice + Manchurian Combo'),
    'garlic fried rice': suggestion(0.85, 'Wok Rice'),
    'ginger fried rice': suggestion(0.85, 'Wok Rice'),
    'ginger garlic noodles': suggestion(1.00, 'Wok Noodles'),
    'glass noodles': suggestion(0.95, 'Wok Noodles'),
    'gobhi manchurian gravy': suggestion(1.30, 'Fried + Gravy'),
    'hakka noodles with manchurian': suggestion(1.40, 'Noodles + Manchurian Combo'),
    'hong kong fried rice': suggestion(0.90, 'Wok Rice'),
    'hong kong noodles': suggestion(1.00, 'Wok Noodles'),
    'hot garlic noodles': suggestion(1.00, 'Wok Noodles'),
    'hot garlic paneer': suggestion(1.20, 'Paneer + Sauce'),
    'kung pao tofu': suggestion(1.05, 'Wok Tofu'),
    'lemon fried rice': suggestion(0.85, 'Wok Rice'),
    'manchurian fried rice': suggestion(1.35, 'Rice + Manchurian Combo'),
    'mixed vegetable noodles': suggestion(1.00, 'Wok Noodles'),
    'mushroom fried rice': suggestion(0.85, 'Wok Rice'),
    'mushroom hakka noodles': suggestion(1.00, 'Wok Noodles'),
    'mushroom in black pepper sauce': suggestion(1.05, 'Wok Gravy'),
    'mushroom in hot garlic sauce': suggestion(1.05, 'Wok Gravy'),
    'mushroom in schezwan sauce': suggestion(1.05, 'Wok Gravy'),
    'mushroom momos': suggestion(0.70, 'Steamed Momos'),
    'pan fried noodles': suggestion(1.05, 'Pan Fried Noodles'),
    'paneer fried rice': suggestion(0.95, 'Wok Rice'),
    'paneer hakka noodles': suggestion(1.05, 'Wok Noodles'),
    'paneer in black bean sauce': suggestion(1.15, 'Paneer + Sauce'),
    'paneer in garlic sauce': suggestion(1.15, 'Paneer + Sauce'),
    'paneer in hot bean sauce': suggestion(1.15, 'Paneer + Sauce'),
    'paneer manchurian dry': suggestion(1.25, 'Paneer Fry + Toss'),
    'paneer manchurian gravy': suggestion(1.35, 'Paneer Fry + Gravy'),
    'rice noodles': suggestion(0.95, 'Wok Noodles'),
    'schezwan rice with manchurian': suggestion(1.40, 'Rice + Manchurian Combo'),
    'schezwan tofu': suggestion(1.10, 'Wok Tofu'),
    'shanghai fried rice': suggestion(0.90, 'Wok Rice'),
    'shanghai noodles': suggestion(1.00, 'Wok Noodles'),
    'singapore fried rice': suggestion(0.90, 'Wok Rice'),
    'stir fried vegetables': suggestion(0.90, 'Stir Fry'),
    'sweet and sour paneer': suggestion(1.15, 'Paneer + Sauce'),
    'sweet and sour tofu': suggestion(1.05, 'Tofu + Sauce'),
    'tofu fried rice': suggestion(0.90, 'Wok Rice'),
    'tofu in black bean sauce': suggestion(1.05, 'Tofu + Sauce'),
    'tofu in hot garlic sauce': suggestion(1.05, 'Tofu + Sauce'),
    'tofu manchurian': suggestion(1.20, 'Fried + Toss'),
    'tofu noodles': suggestion(1.00, 'Wok Noodles'),
    'tofu salt and pepper': suggestion(1.05, 'Fried + Toss'),
    'veg fried momos': suggestion(1.05, 'Fried Momos'),
    'veg hakka noodles': suggestion(0.95, 'Wok Noodles'),
  };

/**
 * Starter LPG estimates per 100 guests.
 * Chinese dishes vary by wok time and whether frying/gravy/steaming is needed.
 * Saved dish values and real burner profiles always take priority.
 */
export function suggestChineseGas(
  dishName: string,
): ChineseGasSuggestion {
  const name = key(dishName);
  const exact = EXACT_CHINESE_GAS[name];

  if (exact) {
    return exact;
  }

  if (name.includes('combo')) {
    return suggestion(1.40, 'Multi-item Combo');
  }

  if (
    name.includes('with manchurian') ||
    (
      name.includes('manchurian') &&
      name.includes('rice')
    )
  ) {
    return suggestion(1.35, 'Rice / Noodles + Manchurian');
  }

  if (
    name.includes('momos') &&
    name.includes('fried')
  ) {
    return suggestion(1.05, 'Fried Momos');
  }

  if (name.includes('momos')) {
    return suggestion(0.70, 'Steamed Momos');
  }

  if (
    name.includes('crispy') ||
    name.includes('spring roll') ||
    name.includes('65')
  ) {
    return suggestion(1.20, 'Deep Fried');
  }

  if (
    name.includes('manchurian') &&
    name.includes('gravy')
  ) {
    return suggestion(1.30, 'Fried + Gravy');
  }

  if (name.includes('manchurian')) {
    return suggestion(1.20, 'Fried + Toss');
  }

  if (
    name.includes('paneer') &&
    (
      name.includes('gravy') ||
      name.includes('sauce') ||
      name.includes('chilli') ||
      name.includes('dragon')
    )
  ) {
    return suggestion(1.20, 'Paneer + Sauce');
  }

  if (
    name.includes('fried rice') ||
    name.endsWith(' rice')
  ) {
    return suggestion(
      name.includes('schezwan') ||
      name.includes('black pepper')
        ? 0.90
        : 0.85,
      'Wok Rice',
    );
  }

  if (
    name.includes('noodles')
  ) {
    return suggestion(
      name.includes('pan fried')
        ? 1.05
        : 1.00,
      'Wok Noodles',
    );
  }

  if (
    name.includes('gravy') ||
    name.includes('sauce')
  ) {
    return suggestion(1.10, 'Wok Gravy');
  }

  if (
    name.includes('stir fry') ||
    name.includes('stir fried')
  ) {
    return suggestion(0.90, 'Stir Fry');
  }

  return suggestion(1.10, 'Chinese Default');
}
