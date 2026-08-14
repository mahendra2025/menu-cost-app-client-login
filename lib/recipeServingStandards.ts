export type RecipeServingStandard = {
  code: string;
  label: string;
  perGuestQuantity: number;
  perGuestUnit:
    | 'ml'
    | 'piece';
  batch100Quantity: number;
  batch100Unit:
    | 'ltr'
    | 'piece';
};

function normalizeServingText(
  value: unknown,
) {
  return String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase('en-IN')
    .replace(
      /[^\p{L}\p{N}]+/gu,
      ' ',
    )
    .replace(/\s+/g, ' ')
    .trim();
}

function includesServingTerm(
  value: string,
  terms: string[],
) {
  const haystack =
    ` ${normalizeServingText(
      value,
    )} `;

  return terms.some(
    (term) => {
      const needle =
        normalizeServingText(
          term,
        );

      return Boolean(
        needle &&
        haystack.includes(
          ` ${needle} `,
        ),
      );
    },
  );
}

export function recipeServingStandard(
  category: unknown,
  dishName: unknown,
): RecipeServingStandard | null {
  const categoryText =
    normalizeServingText(
      category,
    );

  const nameText =
    normalizeServingText(
      dishName,
    );

  const drink =
    includesServingTerm(
      categoryText,
      [
        'welcome drink',
        'mocktail',
        'beverage',
      ],
    ) ||
    includesServingTerm(
      nameText,
      [
        'juice',
        'mocktail',
        'sharbat',
        'sherbet',
        'lassi',
        'thandai',
        'lemonade',
        'cooler',
      ],
    );

  if (drink) {
    return {
      code:
        'DRINK_180ML',

      label:
        'Drink / Mocktail',

      perGuestQuantity:
        180,

      perGuestUnit:
        'ml',

      batch100Quantity:
        18,

      batch100Unit:
        'ltr',
    };
  }

  const soup =
    includesServingTerm(
      categoryText,
      [
        'soup',
      ],
    ) ||
    includesServingTerm(
      nameText,
      [
        'soup',
      ],
    );

  if (soup) {
    return {
      code:
        'SOUP_150ML',

      label:
        'Soup',

      perGuestQuantity:
        150,

      perGuestUnit:
        'ml',

      batch100Quantity:
        15,

      batch100Unit:
        'ltr',
    };
  }

  const dalKadhi =
    includesServingTerm(
      categoryText,
      [
        'dal kadhi',
        'dal',
        'kadhi',
      ],
    ) ||
    includesServingTerm(
      nameText,
      [
        'dal',
        'dahl',
        'kadhi',
        'kadi',
      ],
    );

  if (dalKadhi) {
    return {
      code:
        'DAL_KADHI_100ML',

      label:
        'Dal / Kadhi',

      perGuestQuantity:
        100,

      perGuestUnit:
        'ml',

      batch100Quantity:
        10,

      batch100Unit:
        'ltr',
    };
  }

  const pieceSweet =
    includesServingTerm(
      nameText,
      [
        'gulab jamun',
        'rasgulla',
        'rasmalai',
        'laddu',
        'ladoo',
        'peda',
        'barfi',
        'burfi',
        'kaju katli',
        'kaju roll',
        'cham cham',
        'sandesh',
      ],
    );

  if (pieceSweet) {
    return {
      code:
        'SWEET_1PC',

      label:
        'Piece Sweet',

      perGuestQuantity:
        1,

      perGuestUnit:
        'piece',

      batch100Quantity:
        100,

      batch100Unit:
        'piece',
    };
  }

  return null;
}

export function servingStandardInstruction(
  standard:
    RecipeServingStandard | null,
) {
  if (!standard) {
    return '';
  }

  return [
    `${standard.label} serving target is approximately`,
    `${standard.perGuestQuantity} ${standard.perGuestUnit} per guest.`,
    `For 100 guests, plan approximately`,
    `${standard.batch100Quantity} ${standard.batch100Unit} final prepared yield.`,
    'Use this as production-sizing guidance, not as a reason to invent non-costed ingredients.',
  ].join(' ');
}
