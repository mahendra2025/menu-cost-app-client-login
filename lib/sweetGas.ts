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

/**
 * Starter estimates only.
 * These values are meant to give each sweet its own editable LPG profile
 * until the caterer replaces them with measured kitchen data.
 */
export function suggestSweetGas(
  dishName: string,
): SweetGasSuggestion {
  const name = key(dishName);

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
      'angoor rabdi',
      'angoori rabdi',
      'angoor rabri',
      'angoori rabri',
    ])
  ) {
    return {
      kgPer100: 2.6,
      group: 'Milk Reduction',
      noGas: false,
    };
  }

  if (
    has(name, [
      'rabdi',
      'rabri',
    ])
  ) {
    return {
      kgPer100: 2.5,
      group: 'Milk Reduction',
      noGas: false,
    };
  }

  if (
    name.includes(
      'basundi',
    )
  ) {
    return {
      kgPer100: 2.3,
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
      kgPer100: 2.5,
      group: 'Roasted Halwa',
      noGas: false,
    };
  }

  if (
    name.includes(
      'gajar halwa',
    )
  ) {
    return {
      kgPer100: 2.2,
      group: 'Roasted Halwa',
      noGas: false,
    };
  }

  if (
    name.includes(
      'halwa',
    )
  ) {
    return {
      kgPer100: 2.0,
      group: 'Roasted Halwa',
      noGas: false,
    };
  }

  if (
    name.includes(
      'malpua',
    )
  ) {
    return {
      kgPer100: 2.0,
      group: 'Fried Sweet',
      noGas: false,
    };
  }

  if (
    has(name, [
      'jalebi',
      'imarti',
    ])
  ) {
    return {
      kgPer100: 1.8,
      group: 'Fried Sweet',
      noGas: false,
    };
  }

  if (
    name.includes(
      'gulab jamun',
    )
  ) {
    return {
      kgPer100: 1.5,
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
      kgPer100: 1.6,
      group: 'Fried + Syrup',
      noGas: false,
    };
  }

  if (
    name.includes(
      'rasmalai',
    )
  ) {
    return {
      kgPer100: 2.0,
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
      kgPer100: 1.4,
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
      kgPer100: 1.5,
      group: 'Syrup Sweet',
      noGas: false,
    };
  }

  if (
    name.includes(
      'kaju katli',
    )
  ) {
    return {
      kgPer100: 1.0,
      group: 'Katli / Barfi',
      noGas: false,
    };
  }

  if (
    name.includes(
      'katli',
    )
  ) {
    return {
      kgPer100: 1.1,
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
      kgPer100: 1.2,
      group: 'Katli / Barfi',
      noGas: false,
    };
  }

  if (
    name.includes(
      'mohanthal',
    )
  ) {
    return {
      kgPer100: 1.6,
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
      kgPer100: 1.3,
      group: 'Ladoo',
      noGas: false,
    };
  }

  if (
    has(name, [
      'boondi ladoo',
      'boondi laddu',
      'boondi laddoo',
    ])
  ) {
    return {
      kgPer100: 1.5,
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
      kgPer100: 1.4,
      group: 'Ladoo',
      noGas: false,
    };
  }

  if (
    name.includes(
      'milk cake',
    )
  ) {
    return {
      kgPer100: 2.1,
      group: 'Milk Reduction',
      noGas: false,
    };
  }

  if (
    name.includes(
      'kalakand',
    )
  ) {
    return {
      kgPer100: 2.0,
      group: 'Milk Reduction',
      noGas: false,
    };
  }

  if (
    name.includes(
      'peda',
    )
  ) {
    return {
      kgPer100: 1.8,
      group: 'Milk Reduction',
      noGas: false,
    };
  }

  if (
    name.includes(
      'kheer',
    )
  ) {
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
      kgPer100: 1.5,
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
