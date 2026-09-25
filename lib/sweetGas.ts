export type SweetGasSuggestion = {
  kgPer100: number;
  group: string;
  noGas: boolean;
};

function key(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('en-IN')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function has(
  value: string,
  terms: string[],
) {
  return terms.some(
    (term) =>
      value.includes(term),
  );
}

const EXACT_SWEET_GAS:
  Record<string, SweetGasSuggestion> = {
    'gulab jamun': { kgPer100: 1.0, group: 'Fried + Syrup', noGas: false },
    'kala jamun': { kgPer100: 1.1, group: 'Fried + Syrup', noGas: false },
    rasgulla: { kgPer100: 1.6, group: 'Syrup Sweet', noGas: false },
    rajbhog: { kgPer100: 1.8, group: 'Syrup Sweet', noGas: false },
    'cham cham': { kgPer100: 1.6, group: 'Syrup Sweet', noGas: false },
    chamcham: { kgPer100: 1.6, group: 'Syrup Sweet', noGas: false },
    rasmalai: { kgPer100: 2.4, group: 'Milk + Syrup', noGas: false },
    'kaju katli': { kgPer100: 0.5, group: 'Katli / Barfi', noGas: false },
    mohanthal: { kgPer100: 1.2, group: 'Roasted Sweet', noGas: false },
    'moong dal halwa': { kgPer100: 1.8, group: 'Roasted Halwa', noGas: false },
    'gajar halwa': { kgPer100: 1.7, group: 'Roasted Halwa', noGas: false },
    jalebi: { kgPer100: 1.1, group: 'Fried Sweet', noGas: false },
    imarti: { kgPer100: 1.2, group: 'Fried Sweet', noGas: false },
    balushahi: { kgPer100: 1.0, group: 'Fried + Syrup', noGas: false },
    malpua: { kgPer100: 1.3, group: 'Fried Sweet', noGas: false },
    'besan ladoo': { kgPer100: 0.7, group: 'Ladoo', noGas: false },
    'motichoor ladoo': { kgPer100: 1.2, group: 'Ladoo', noGas: false },
    'milk cake': { kgPer100: 2.4, group: 'Milk Reduction', noGas: false },
    kalakand: { kgPer100: 2.2, group: 'Milk Reduction', noGas: false },
    'kesar peda': { kgPer100: 2.0, group: 'Milk Reduction', noGas: false },
    'badam barfi': { kgPer100: 0.9, group: 'Katli / Barfi', noGas: false },
    rabri: { kgPer100: 3.0, group: 'Milk Reduction', noGas: false },
    rabdi: { kgPer100: 3.0, group: 'Milk Reduction', noGas: false },
    basundi: { kgPer100: 2.6, group: 'Milk Reduction', noGas: false },
    'kesar shrikhand': { kgPer100: 0, group: 'Cold / No Gas', noGas: true },
    'dry fruit shrikhand': { kgPer100: 0, group: 'Cold / No Gas', noGas: true },
    shrikhand: { kgPer100: 0, group: 'Cold / No Gas', noGas: true },
    phirni: { kgPer100: 1.4, group: 'Milk Cooking', noGas: false },
    'mawa gujiya': { kgPer100: 1.0, group: 'Fried Sweet', noGas: false },
    'chhena toast': { kgPer100: 1.7, group: 'Syrup Sweet', noGas: false },
    sandesh: { kgPer100: 1.3, group: 'Chhena Sweet', noGas: false },
    'karachi halwa': { kgPer100: 1.2, group: 'Halwa', noGas: false },
    'gond ladoo': { kgPer100: 0.7, group: 'Ladoo', noGas: false },
    'badam halwa': { kgPer100: 1.5, group: 'Roasted Halwa', noGas: false },
    'lauki halwa': { kgPer100: 1.6, group: 'Roasted Halwa', noGas: false },
    'coconut ladoo': { kgPer100: 0.5, group: 'Ladoo', noGas: false },
    'atta ladoo': { kgPer100: 0.6, group: 'Ladoo', noGas: false },
    'dry fruit ladoo': { kgPer100: 0.4, group: 'Ladoo', noGas: false },
    'mawa kachori': { kgPer100: 1.1, group: 'Fried Sweet', noGas: false },
    'shahi tukda': { kgPer100: 1.2, group: 'Milk + Fried', noGas: false },
    'double ka meetha': { kgPer100: 1.2, group: 'Milk + Fried', noGas: false },
    'angoori rasmalai': { kgPer100: 2.5, group: 'Milk + Syrup', noGas: false },
    'mathura peda': { kgPer100: 2.0, group: 'Milk Reduction', noGas: false },
    'angoori rabdi': { kgPer100: 3.0, group: 'Milk Reduction', noGas: false },
    'angoor rabdi': { kgPer100: 3.0, group: 'Milk Reduction', noGas: false },
    'rabdi malpua': { kgPer100: 3.8, group: 'Milk Reduction + Fried', noGas: false },
    'rabadi malpua': { kgPer100: 3.8, group: 'Milk Reduction + Fried', noGas: false },
    'five star rabdi': { kgPer100: 3.2, group: 'Milk Reduction', noGas: false },
    'doodh jalebi': { kgPer100: 2.8, group: 'Milk + Fried', noGas: false },
    'malai sandwich': { kgPer100: 1.7, group: 'Chhena Sweet', noGas: false },
    'gulab jamun with rabdi': { kgPer100: 3.4, group: 'Milk Reduction + Fried', noGas: false },
    ghevar: { kgPer100: 1.3, group: 'Fried Sweet', noGas: false },
    sitaphalrabadi: { kgPer100: 3.0, group: 'Milk Reduction', noGas: false },
    'sitaphal rabadi': { kgPer100: 3.0, group: 'Milk Reduction', noGas: false },
    'sitaphal rabdi': { kgPer100: 3.0, group: 'Milk Reduction', noGas: false },
  };

/**
 * Starter estimates per 100 guests.
 * Dish values are editable and should be replaced by measured kitchen data
 * whenever real LPG consumption is available.
 */
export function suggestSweetGas(
  dishName: string,
): SweetGasSuggestion {
  const name = key(dishName);
  const exact = EXACT_SWEET_GAS[name];

  if (exact) {
    return exact;
  }

  if (
    has(name, [
      'shrikhand',
      'shrikand',
      'aamrakhand',
      'amrakhand',
      'ice cream',
    ])
  ) {
    return {
      kgPer100: 0,
      group: 'Cold / No Gas',
      noGas: true,
    };
  }

  if (
    has(name, [
      'rabdi',
      'rabri',
      'rabadi',
    ])
  ) {
    return {
      kgPer100: 3.0,
      group: 'Milk Reduction',
      noGas: false,
    };
  }

  if (name.includes('basundi')) {
    return {
      kgPer100: 2.6,
      group: 'Milk Reduction',
      noGas: false,
    };
  }

  if (
    has(name, [
      'moong dal halwa',
      'moong halwa',
    ])
  ) {
    return {
      kgPer100: 1.8,
      group: 'Roasted Halwa',
      noGas: false,
    };
  }

  if (name.includes('gajar halwa')) {
    return {
      kgPer100: 1.7,
      group: 'Roasted Halwa',
      noGas: false,
    };
  }

  if (name.includes('halwa')) {
    return {
      kgPer100: 1.5,
      group: 'Roasted Halwa',
      noGas: false,
    };
  }

  if (name.includes('malpua')) {
    return {
      kgPer100: 1.3,
      group: 'Fried Sweet',
      noGas: false,
    };
  }

  if (name.includes('imarti')) {
    return {
      kgPer100: 1.2,
      group: 'Fried Sweet',
      noGas: false,
    };
  }

  if (name.includes('jalebi')) {
    return {
      kgPer100: 1.1,
      group: 'Fried Sweet',
      noGas: false,
    };
  }

  if (
    has(name, [
      'gulab jamun',
      'kala jamun',
    ])
  ) {
    return {
      kgPer100:
        name.includes('kala jamun')
          ? 1.1
          : 1.0,
      group: 'Fried + Syrup',
      noGas: false,
    };
  }

  if (
    has(name, [
      'balushahi',
      'badusha',
    ])
  ) {
    return {
      kgPer100: 1.0,
      group: 'Fried + Syrup',
      noGas: false,
    };
  }

  if (name.includes('rasmalai')) {
    return {
      kgPer100: 2.4,
      group: 'Milk + Syrup',
      noGas: false,
    };
  }

  if (
    has(name, [
      'rasgulla',
      'rasgola',
    ])
  ) {
    return {
      kgPer100: 1.6,
      group: 'Syrup Sweet',
      noGas: false,
    };
  }

  if (
    has(name, [
      'cham cham',
      'chamcham',
    ])
  ) {
    return {
      kgPer100: 1.6,
      group: 'Syrup Sweet',
      noGas: false,
    };
  }

  if (name.includes('kaju katli')) {
    return {
      kgPer100: 0.5,
      group: 'Katli / Barfi',
      noGas: false,
    };
  }

  if (name.includes('katli')) {
    return {
      kgPer100: 0.7,
      group: 'Katli / Barfi',
      noGas: false,
    };
  }

  if (
    has(name, [
      'barfi',
      'burfi',
    ])
  ) {
    return {
      kgPer100: 0.9,
      group: 'Katli / Barfi',
      noGas: false,
    };
  }

  if (name.includes('mohanthal')) {
    return {
      kgPer100: 1.2,
      group: 'Roasted Sweet',
      noGas: false,
    };
  }

  if (
    has(name, [
      'besan ladoo',
      'besan laddu',
      'besan laddoo',
    ])
  ) {
    return {
      kgPer100: 0.7,
      group: 'Ladoo',
      noGas: false,
    };
  }

  if (
    has(name, [
      'boondi ladoo',
      'boondi laddu',
      'boondi laddoo',
      'motichoor ladoo',
      'motichoor laddu',
      'motichoor laddoo',
    ])
  ) {
    return {
      kgPer100: 1.2,
      group: 'Ladoo',
      noGas: false,
    };
  }

  if (
    has(name, [
      'ladoo',
      'laddu',
      'laddoo',
    ])
  ) {
    return {
      kgPer100: 0.7,
      group: 'Ladoo',
      noGas: false,
    };
  }

  if (name.includes('milk cake')) {
    return {
      kgPer100: 2.4,
      group: 'Milk Reduction',
      noGas: false,
    };
  }

  if (name.includes('kalakand')) {
    return {
      kgPer100: 2.2,
      group: 'Milk Reduction',
      noGas: false,
    };
  }

  if (name.includes('peda')) {
    return {
      kgPer100: 2.0,
      group: 'Milk Reduction',
      noGas: false,
    };
  }

  if (name.includes('kheer')) {
    return {
      kgPer100: 1.8,
      group: 'Milk Cooking',
      noGas: false,
    };
  }

  if (
    has(name, [
      'phirni',
      'firni',
    ])
  ) {
    return {
      kgPer100: 1.4,
      group: 'Milk Cooking',
      noGas: false,
    };
  }

  return {
    kgPer100: 1.5,
    group: 'Sweet Default',
    noGas: false,
  };
}
