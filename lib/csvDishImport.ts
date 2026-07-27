import type { DishCostItem } from './dishCostMaster';

export type CsvDishRow = {
  name?: string;
  category?: string;
  subcategory?: string;
  rate?: string | number;
  servingQuantity?: string | number;
  servingUnit?: string;
  aliases?: string;
};

export function convertCsvDishRow(
  row: CsvDishRow,
): Partial<DishCostItem> | null {
  const name = String(row.name || '').trim();
  const category = String(row.category || '').trim();

  if (!name || !category) {
    return null;
  }

  const aliases = String(row.aliases || '')
    .split('|')
    .map((alias) => alias.trim())
    .filter(Boolean);

  return {
    name,
    category,

    subcategory: String(
      row.subcategory || '',
    ).trim(),

    rate: Math.max(
      Number(row.rate) || 0,
      0,
    ),

    servingQuantity: Math.max(
      Number(row.servingQuantity) || 1,
      0.01,
    ),

    servingUnit:
      String(row.servingUnit || 'serving').trim() ||
      'serving',

    aliases,
  };
}

export function convertCsvDishRows(
  rows: CsvDishRow[],
): Array<Partial<DishCostItem>> {
  return rows
    .map(convertCsvDishRow)
    .filter(
      (
        dish,
      ): dish is Partial<DishCostItem> =>
        dish !== null,
    );
}
