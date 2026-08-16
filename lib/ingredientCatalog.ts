export const INGREDIENT_CATEGORIES = [
  'Vegetables & Herbs',
  'Fruits',
  'Dairy',
  'Grains & Flour',
  'Pulses & Legumes',
  'Spices & Seasonings',
  'Oils & Fats',
  'Sauces & Condiments',
  'Beverages',
  'Sweeteners',
  'Bakery & Packaged',
  'Other',
] as const;

export type IngredientCategory = string;

export const INGREDIENT_UNITS = ['kg', 'gram', 'ltr', 'ml', 'piece', 'packet'] as const;
export type IngredientUnit = (typeof INGREDIENT_UNITS)[number];

export type IngredientRate = {
  id: string;
  name: string;
  category: IngredientCategory;
  rate: number;
  unit: IngredientUnit;
};

function includesAny(value: string, words: string[]) {
  return words.some((word) => value.includes(word));
}


const INGREDIENT_NAME_ALIASES:
  Record<string, string> = {
    // Tomato
    tomato: 'Tomato',
    tomatoes: 'Tomato',
    tamatar: 'Tomato',
    'टमाटर': 'Tomato',
    'ટામેટા': 'Tomato',

    // Potato
    potato: 'Potato',
    potatoes: 'Potato',
    aloo: 'Potato',
    alu: 'Potato',
    'आलू': 'Potato',
    'બટાકા': 'Potato',

    // Onion
    onion: 'Onion',
    onions: 'Onion',
    pyaz: 'Onion',
    pyaaz: 'Onion',
    piyaz: 'Onion',
    'प्याज': 'Onion',
    'प्याज़': 'Onion',
    'પ્યાજ': 'Onion',

    // Ginger
    ginger: 'Ginger',
    adrak: 'Ginger',
    'अदरक': 'Ginger',
    'આદુ': 'Ginger',

    // Garlic
    garlic: 'Garlic',
    lahsun: 'Garlic',
    lehsun: 'Garlic',
    lasun: 'Garlic',
    'लहसुन': 'Garlic',
    'લસણ': 'Garlic',

    // Green chilli
    'green chilli': 'Green Chilli',
    'green chili': 'Green Chilli',
    'green chillies': 'Green Chilli',
    'green chilies': 'Green Chilli',
    'hari mirch': 'Green Chilli',
    'hari mirchi': 'Green Chilli',
    'हरी मिर्च': 'Green Chilli',
    'લીલા મરચાં': 'Green Chilli',

    // Coriander leaves
    'coriander leaves': 'Coriander Leaves',
    'fresh coriander': 'Coriander Leaves',
    coriander: 'Coriander Leaves',
    dhaniya: 'Coriander Leaves',
    'hara dhaniya': 'Coriander Leaves',
    'धनिया': 'Coriander Leaves',
    'हरा धनिया': 'Coriander Leaves',
    'કોથમીર': 'Coriander Leaves',

    // Cumin
    cumin: 'Cumin',
    jeera: 'Cumin',
    jira: 'Cumin',
    'जीरा': 'Cumin',
    'જીરું': 'Cumin',

    // Turmeric
    turmeric: 'Turmeric',
    haldi: 'Turmeric',
    'हल्दी': 'Turmeric',
    'હળદર': 'Turmeric',

    // Red chilli powder
    'red chilli powder': 'Red Chilli Powder',
    'red chili powder': 'Red Chilli Powder',
    'lal mirch powder': 'Red Chilli Powder',
    'लाल मिर्च पाउडर': 'Red Chilli Powder',

    // Coriander powder
    'coriander powder': 'Coriander Powder',
    'dhaniya powder': 'Coriander Powder',
    'धनिया पाउडर': 'Coriander Powder',

    // Green peas
    'green peas': 'Green Peas',
    peas: 'Green Peas',
    matar: 'Green Peas',
    'मटर': 'Green Peas',
    'વટાણા': 'Green Peas',

    // Cauliflower
    cauliflower: 'Cauliflower',
    gobi: 'Cauliflower',
    'phool gobi': 'Cauliflower',
    'फूल गोभी': 'Cauliflower',
    'ફૂલકોબી': 'Cauliflower',

    // Capsicum
    capsicum: 'Capsicum',
    'shimla mirch': 'Capsicum',
    'शिमला मिर्च': 'Capsicum',

    // Curd
    curd: 'Curd',
    yogurt: 'Curd',
    yoghurt: 'Curd',
    dahi: 'Curd',
    'दही': 'Curd',
    'દહીં': 'Curd',

    // Besan
    besan: 'Besan',
    'gram flour': 'Besan',
    'चना आटा': 'Besan',

    // Atta
    atta: 'Atta',
    'wheat flour': 'Atta',
    'गेहूं का आटा': 'Atta',

    // Rava
    rava: 'Rava',
    rawa: 'Rava',
    sooji: 'Rava',
    suji: 'Rava',
    semolina: 'Rava',
    'सूजी': 'Rava',

    // Paneer
    paneer: 'Paneer',
    'cottage cheese': 'Paneer',

    // Ghee
    ghee: 'Ghee',
    'clarified butter': 'Ghee',
  };

export function canonicalIngredientName(
  name: string,
) {
  const cleaned =
    String(name || '')
      .normalize('NFKC')
      .trim()
      .replace(/\s+/g, ' ');

  if (!cleaned) {
    return '';
  }

  return (
    INGREDIENT_NAME_ALIASES[
      cleaned.toLowerCase()
    ] ||
    cleaned
  );
}

export function inferIngredientCategory(name: string): IngredientCategory {
  const value = name.trim().toLowerCase();
  if (includesAny(value, ['milk', 'cream', 'curd', 'paneer', 'cheese', 'butter', 'ghee', 'khoya'])) return 'Dairy';
  if (includesAny(value, ['oil', 'shortening'])) return 'Oils & Fats';
  if (includesAny(value, ['sugar', 'jaggery', 'honey', 'syrup'])) return 'Sweeteners';
  if (includesAny(value, ['sauce', 'chutney', 'ketchup', 'pickle', 'vinegar', 'mayonnaise', 'pesto'])) return 'Sauces & Condiments';
  if (includesAny(value, ['juice', 'water', 'soda', 'cola', 'tea', 'coffee', 'ale'])) return 'Beverages';
  if (includesAny(value, ['flour', 'rice', 'rava', 'poha', 'oats', 'barley', 'quinoa', 'pasta', 'noodle', 'vermicelli'])) return 'Grains & Flour';
  if (includesAny(value, ['dal', 'lentil', 'chana', 'rajma', 'pea', 'bean', 'gram'])) return 'Pulses & Legumes';
  if (includesAny(value, ['masala', 'salt', 'pepper', 'chilli', 'cumin', 'coriander powder', 'turmeric', 'cardamom', 'cinnamon', 'saffron', 'kesar', 'seasoning', 'ajwain', 'asafoetida'])) return 'Spices & Seasonings';
  if (includesAny(value, ['bread', 'bun', 'base', 'sheet', 'wrapper', 'papad', 'chips', 'nachos', 'biscuit', 'cup', 'spoon', 'packet'])) return 'Bakery & Packaged';
  if (includesAny(value, ['apple', 'banana', 'orange', 'mango', 'lemon', 'lime', 'pineapple', 'berry', 'grape', 'guava', 'lychee', 'peach', 'kiwi', 'watermelon', 'pomegranate', 'coconut'])) return 'Fruits';
  if (includesAny(value, ['onion', 'tomato', 'potato', 'carrot', 'cabbage', 'capsicum', 'spinach', 'mint', 'garlic', 'ginger', 'leaves', 'vegetable', 'mushroom', 'broccoli', 'gourd', 'beetroot', 'pumpkin', 'corn', 'bhindi'])) return 'Vegetables & Herbs';
  return 'Other';
}

export function normalizeIngredientId(name: string, unit: string) {
  return `${name.trim().toLowerCase()}__${unit}`;
}

export function normalizeIngredientRate(value: unknown): IngredientRate | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const name = String(row.name || '').trim();
  const unit = String(row.unit || '').trim() as IngredientUnit;
  if (!name || !INGREDIENT_UNITS.includes(unit)) return null;
  const suppliedCategory = String(row.category || '').trim();
  return {
    id: normalizeIngredientId(name, unit),
    name,
    category: suppliedCategory && suppliedCategory.length <= 60 ? suppliedCategory : inferIngredientCategory(name),
    rate: Math.max(0, Number(row.rate) || 0),
    unit,
  };
}
