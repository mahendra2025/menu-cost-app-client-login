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
