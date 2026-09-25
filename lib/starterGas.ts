export type StarterGasSuggestion = {
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
): StarterGasSuggestion {
  return { kgPer100, group, noGas: false };
}

const EXACT_STARTER_GAS:
  Record<string, StarterGasSuggestion> = {
    'paneer lifafa': suggestion(1.20, 'Stuffed / Fried Paneer'),
    'paneer tikka': suggestion(1.25, 'Tandoor / Tikka'),
    'veg kebab': suggestion(1.00, 'Tawa / Grill Kebab'),
    'bbq paneer': suggestion(1.25, 'Grill / BBQ'),
    'achari soya chaap': suggestion(1.20, 'Tandoor / Chaap'),
    'afghani paneer tikka': suggestion(1.25, 'Tandoor / Tikka'),
    'afghani soya chaap': suggestion(1.20, 'Tandoor / Chaap'),
    'aloo 65': suggestion(1.15, 'Deep Fried'),
    'aloo nazakat': suggestion(1.10, 'Stuffed / Tandoor'),
    'baby corn chilli': suggestion(1.15, 'Fry + Toss'),
    'baby corn manchurian': suggestion(1.20, 'Fry + Toss'),
    'baby corn pakoda': suggestion(1.10, 'Deep Fried'),
    'beetroot cutlet': suggestion(1.00, 'Tawa / Fry'),
    'beetroot kebab': suggestion(1.00, 'Tawa / Grill Kebab'),
    'bharwa tandoori aloo': suggestion(1.15, 'Stuffed Tandoor'),
    'bread roll': suggestion(1.10, 'Deep Fried'),
    'bruschetta': suggestion(0.55, 'Toast + Topping'),
    'chana dal kebab': suggestion(1.00, 'Tawa / Grill Kebab'),
    'cheese bread roll': suggestion(1.15, 'Deep Fried'),
    'cheese chilli toast': suggestion(0.65, 'Toast / Grill'),
    'cheese corn croquette': suggestion(1.15, 'Deep Fried'),
    'cheese cutlet': suggestion(1.05, 'Tawa / Fry'),
    'cheese fondue bites': suggestion(1.10, 'Fry / Bake'),
    'cheese fries': suggestion(1.15, 'Deep Fried'),
    'cheese garlic bread': suggestion(0.70, 'Bake / Toast'),
    'cheese pakoda': suggestion(1.15, 'Deep Fried'),
    'cheese paneer tikka': suggestion(1.30, 'Tandoor / Tikka'),
    'cheese quesadilla': suggestion(0.90, 'Tawa / Griddle'),
    'cheese spring roll': suggestion(1.15, 'Deep Fried'),
    'chilli garlic gobhi': suggestion(1.15, 'Fry + Toss'),
    'chilli potato': suggestion(1.15, 'Fry + Toss'),
    'corn canape': suggestion(0.45, 'Light Toast / Assembly'),
    'corn cheese balls': suggestion(1.15, 'Deep Fried'),
    'corn chilli': suggestion(1.10, 'Fry + Toss'),
    'corn cutlet': suggestion(1.00, 'Tawa / Fry'),
    'corn pakoda': suggestion(1.10, 'Deep Fried'),
    'corn salt and pepper': suggestion(1.10, 'Fry + Toss'),
    'corn seekh kebab': suggestion(1.05, 'Tandoor / Grill'),
    'crispy gobhi': suggestion(1.20, 'Deep Fried'),
    'crispy mushroom': suggestion(1.20, 'Deep Fried'),
    'crispy paneer': suggestion(1.20, 'Deep Fried'),
    'dahi sholay': suggestion(1.15, 'Deep Fried'),
    'dry fruit kachori': suggestion(1.25, 'Stuffed Deep Fried'),
    'dry paneer manchurian': suggestion(1.25, 'Fry + Toss'),
    'french fries': suggestion(1.10, 'Deep Fried'),
    'fried paneer momos': suggestion(1.10, 'Fried Momos'),
    'fried veg momos': suggestion(1.05, 'Fried Momos'),
    'gobhi manchurian dry': suggestion(1.20, 'Fry + Toss'),
    'hara bhara kebab': suggestion(1.00, 'Tawa / Fry'),
    'hariyali paneer tikka': suggestion(1.25, 'Tandoor / Tikka'),
    'hash browns': suggestion(1.05, 'Deep Fried'),
    'honey chilli paneer': suggestion(1.20, 'Fry + Toss'),
    'jalapeno cheese balls': suggestion(1.15, 'Deep Fried'),
    'kali mirch paneer tikka': suggestion(1.25, 'Tandoor / Tikka'),
    'kanda bhajiya': suggestion(1.10, 'Deep Fried'),
    'kathal galouti kebab': suggestion(1.00, 'Tawa / Shallow Fry'),
    'kung pao paneer': suggestion(1.15, 'Wok Toss'),
    'lasooni paneer tikka': suggestion(1.25, 'Tandoor / Tikka'),
    'loaded nachos': suggestion(0.40, 'Bake / Assembly'),
    'makai chevdo cups': suggestion(0.45, 'Light Cook + Assembly'),
    'malai broccoli': suggestion(1.10, 'Tandoor / Grill'),
    'malai paneer tikka': suggestion(1.25, 'Tandoor / Tikka'),
    'malai soya chaap': suggestion(1.20, 'Tandoor / Chaap'),
    'mexican corn cups': suggestion(0.55, 'Light Cook + Assembly'),
    'mini cheese pizza': suggestion(0.90, 'Bake / Oven'),
    'mini kachori': suggestion(1.20, 'Deep Fried'),
    'mini patra': suggestion(0.85, 'Steam + Tempering'),
    'mini veg pizza': suggestion(0.90, 'Bake / Oven'),
    'mirchi bhajiya': suggestion(1.10, 'Deep Fried'),
    'mix veg pakoda': suggestion(1.10, 'Deep Fried'),
    'moong dal kebab': suggestion(1.00, 'Tawa / Grill Kebab'),
    'moong dal pakoda': suggestion(1.10, 'Deep Fried'),
    'mozzarella sticks': suggestion(1.15, 'Deep Fried'),
    'mushroom cheese balls': suggestion(1.15, 'Deep Fried'),
    'mushroom chilli': suggestion(1.10, 'Fry + Toss'),
    'mushroom duplex': suggestion(1.10, 'Stuffed / Tandoor'),
    'mushroom manchurian': suggestion(1.15, 'Fry + Toss'),
    'mushroom salt and pepper': suggestion(1.10, 'Fry + Toss'),
    'mushroom seekh kebab': suggestion(1.05, 'Tandoor / Grill'),
    'nachos with salsa': suggestion(0.25, 'Light Heat + Assembly'),
    'onion pakoda': suggestion(1.10, 'Deep Fried'),
    'onion rings': suggestion(1.10, 'Deep Fried'),
    'pahadi paneer tikka': suggestion(1.25, 'Tandoor / Tikka'),
    'palak pakoda': suggestion(1.10, 'Deep Fried'),
    'paneer angara': suggestion(1.25, 'Tandoor / Grill'),
    'paneer canape': suggestion(0.55, 'Light Toast / Assembly'),
    'paneer cheese balls': suggestion(1.20, 'Deep Fried'),
    'paneer chilli': suggestion(1.20, 'Fry + Toss'),
    'paneer corn balls': suggestion(1.15, 'Deep Fried'),
    'paneer fingers': suggestion(1.15, 'Deep Fried'),
    'paneer hariyali': suggestion(1.20, 'Tandoor / Grill'),
    'paneer kurkure': suggestion(1.20, 'Deep Fried'),
    'paneer lollipop': suggestion(1.20, 'Deep Fried'),
    'paneer malai seekh': suggestion(1.20, 'Tandoor / Grill'),
    'paneer momos': suggestion(0.75, 'Steamed Momos'),
    'paneer salt and pepper': suggestion(1.15, 'Fry + Toss'),
    'paneer seekh kebab': suggestion(1.15, 'Tandoor / Grill'),
    'paneer shashlik': suggestion(1.20, 'Grill / Skewer'),
    'paneer spring roll': suggestion(1.15, 'Deep Fried'),
    'peri peri fries': suggestion(1.10, 'Deep Fried'),
  };

/**
 * Starter LPG estimates per 100 guests.
 * Saved dish values and real burner profiles always take priority.
 */
export function suggestStarterGas(
  dishName: string,
): StarterGasSuggestion {
  const name = key(dishName);
  const exact = EXACT_STARTER_GAS[name];

  if (exact) return exact;

  if (
    name.includes('momos')
  ) {
    return suggestion(
      name.includes('fried') ? 1.05 : 0.75,
      name.includes('fried') ? 'Fried Momos' : 'Steamed Momos',
    );
  }

  if (
    name.includes('tikka') ||
    name.includes('tandoori') ||
    name.includes('chaap') ||
    name.includes('shashlik') ||
    name.includes('bbq')
  ) {
    return suggestion(
      name.includes('paneer') ? 1.25 : 1.15,
      'Tandoor / Grill',
    );
  }

  if (
    name.includes('manchurian') ||
    name.includes('chilli') ||
    name.includes('schezwan') ||
    name.includes('kung pao') ||
    name.includes('salt and pepper')
  ) {
    return suggestion(
      1.15,
      'Fry + Toss',
    );
  }

  if (
    name.includes('pakoda') ||
    name.includes('pakora') ||
    name.includes('bhajiya') ||
    name.includes('fries') ||
    name.includes('kachori') ||
    name.includes('spring roll') ||
    name.includes('croquette') ||
    name.includes('balls') ||
    name.includes('kurkure') ||
    name.includes('lollipop') ||
    name.includes('rings') ||
    name.includes('crispy') ||
    name.includes('sticks')
  ) {
    return suggestion(
      1.15,
      'Deep Fried',
    );
  }

  if (
    name.includes('kebab') ||
    name.includes('cutlet')
  ) {
    return suggestion(
      1.00,
      'Tawa / Grill Kebab',
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
    name.includes('toast') ||
    name.includes('garlic bread') ||
    name.includes('bruschetta')
  ) {
    return suggestion(
      0.60,
      'Toast / Bake',
    );
  }

  if (
    name.includes('nachos') ||
    name.includes('canape') ||
    name.includes('cups')
  ) {
    return suggestion(
      0.45,
      'Light Heat + Assembly',
    );
  }

  return suggestion(
    1.00,
    'Starter Default',
  );
}
