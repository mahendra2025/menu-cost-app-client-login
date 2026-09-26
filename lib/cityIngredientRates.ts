export const CORE_INGREDIENT_CITIES = [
  'Silvassa',
  'Vapi',
  'Daman',
] as const;

export function ingredientCityOptions(
  rows: Array<{
    city?: string | null;
    cityKey?: string | null;
  }> = [],
) {
  const byKey =
    new Map<
      string,
      {
        city: string;
        cityKey: string;
      }
    >();

  for (const city of CORE_INGREDIENT_CITIES) {
    const cityKey =
      normalizeCityKey(city);

    if (cityKey) {
      byKey.set(
        cityKey,
        {
          city,
          cityKey,
        },
      );
    }
  }

  for (const row of rows) {
    const city =
      normalizeCityName(
        row.city,
      );
    const cityKey =
      normalizeCityKey(
        row.cityKey ||
          city,
      );

    if (
      city &&
      cityKey &&
      !byKey.has(cityKey)
    ) {
      byKey.set(
        cityKey,
        {
          city,
          cityKey,
        },
      );
    }
  }

  return Array.from(
    byKey.values(),
  ).sort((left, right) =>
    left.city.localeCompare(
      right.city,
      'en-IN',
      {
        sensitivity: 'base',
      },
    ),
  );
}

export function normalizeCityName(value: unknown) {
  return String(value || '')
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ');
}

export function normalizeCityKey(value: unknown) {
  return normalizeCityName(value)
    .toLocaleLowerCase('en-IN')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export type IngredientRateSource =
  | 'TENANT'
  | 'CITY'
  | 'GLOBAL';

export function ingredientRateSourceLabel(
  source: IngredientRateSource,
  city?: string,
) {
  if (source === 'TENANT') return 'My rate';
  if (source === 'CITY') {
    const name = normalizeCityName(city);
    return name ? `${name} city rate` : 'City rate';
  }
  return 'Global master rate';
}


export function resolveIngredientRate(input: {
  tenantRate?: number | null;
  cityRate?: number | null;
  globalRate?: number | null;
}) {
  const tenantRate =
    Math.max(
      0,
      Number(input.tenantRate) || 0,
    );
  const cityRate =
    Math.max(
      0,
      Number(input.cityRate) || 0,
    );
  const globalRate =
    Math.max(
      0,
      Number(input.globalRate) || 0,
    );

  if (tenantRate > 0) {
    return {
      rate: tenantRate,
      source:
        'TENANT' as const,
    };
  }

  if (cityRate > 0) {
    return {
      rate: cityRate,
      source:
        'CITY' as const,
    };
  }

  return {
    rate: globalRate,
    source:
      'GLOBAL' as const,
  };
}
