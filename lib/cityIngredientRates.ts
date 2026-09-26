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
