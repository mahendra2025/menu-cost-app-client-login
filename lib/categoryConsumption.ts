export type ConsumptionRecommendationInput = {
  category: string;
  mealLabel?: string;
  pax?: number;
};

function normalize(value: string | undefined) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('en-IN')
    .replace(/\s+/g, ' ');
}

function mealGroup(mealLabel: string | undefined) {
  const meal = normalize(mealLabel);

  if (/breakfast|morning/.test(meal)) return 'BREAKFAST' as const;
  if (/hi[- ]?tea|high tea|tea|snack/.test(meal)) return 'HI_TEA' as const;
  if (/lunch|dinner|reception|sangeet|dj|wedding|barat|mamera|haldi/.test(meal)) {
    return 'MAIN_MEAL' as const;
  }

  return 'GENERAL' as const;
}

const GENERAL: Record<string, number> = {
  'welcome drink': 90,
  mocktail: 80,
  starter: 70,
  soup: 35,
  sweet: 80,
  farsan: 55,
  paneer: 85,
  sabji: 100,
  'main course': 100,
  bread: 110,
  'dal / kadhi': 55,
  rice: 65,
  salad: 40,
  raita: 45,
  papad: 35,
  pickle: 20,
  condiments: 25,
  'live counter': 50,
  chaat: 45,
  italian: 40,
  pizza: 35,
  pasta: 35,
  continental: 35,
  chinese: 50,
  'south indian': 45,
  snacks: 55,
  sandwich: 35,
  fruit: 35,
  'ice cream': 60,
  bakery: 30,
  'dry fruit': 20,
  paan: 30,
  mukhwas: 25,
  beverage: 80,
  other: 50,
};

const BREAKFAST: Record<string, number> = {
  ...GENERAL,
  'welcome drink': 55,
  mocktail: 30,
  starter: 30,
  soup: 15,
  sweet: 45,
  farsan: 80,
  paneer: 35,
  sabji: 60,
  'main course': 65,
  bread: 65,
  'dal / kadhi': 35,
  rice: 35,
  'live counter': 70,
  chaat: 35,
  chinese: 25,
  'south indian': 90,
  snacks: 80,
  sandwich: 60,
  fruit: 55,
  'ice cream': 20,
  bakery: 50,
  beverage: 90,
};

const HI_TEA: Record<string, number> = {
  ...GENERAL,
  'welcome drink': 60,
  mocktail: 55,
  starter: 60,
  soup: 30,
  sweet: 45,
  farsan: 75,
  paneer: 30,
  sabji: 25,
  'main course': 25,
  bread: 30,
  'dal / kadhi': 15,
  rice: 15,
  'live counter': 65,
  chaat: 60,
  italian: 50,
  pizza: 50,
  pasta: 40,
  chinese: 60,
  'south indian': 55,
  snacks: 80,
  sandwich: 65,
  fruit: 40,
  'ice cream': 40,
  bakery: 55,
  beverage: 90,
};

function categoryKey(category: string) {
  const value = normalize(category);

  if (/water/.test(value)) return 'water';
  if (/dal|kadhi/.test(value)) return 'dal / kadhi';
  if (/bread|roti|naan|kulcha|puri/.test(value)) return 'bread';
  if (/sweet|dessert/.test(value)) return 'sweet';
  if (/ice.?cream/.test(value)) return 'ice cream';

  return value;
}

export function recommendCategoryConsumptionPercent({
  category,
  mealLabel,
  pax = 0,
}: ConsumptionRecommendationInput) {
  const group = mealGroup(mealLabel);
  const key = categoryKey(category);

  if (key === 'water') return 100;

  const table =
    group === 'BREAKFAST'
      ? BREAKFAST
      : group === 'HI_TEA'
        ? HI_TEA
        : GENERAL;

  let percent = table[key] ?? GENERAL[key] ?? 50;

  const guests = Math.max(0, Number(pax) || 0);

  if (guests >= 500 && ['bread', 'rice', 'beverage', 'welcome drink'].includes(key)) {
    percent += 5;
  } else if (guests > 0 && guests <= 100 && ['live counter', 'chaat', 'italian', 'chinese'].includes(key)) {
    percent = Math.max(20, percent - 5);
  }

  return Math.min(150, Math.max(0, Math.round(percent)));
}
