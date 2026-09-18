export type DishMatchOption = {
  name: string;
  category: string;
  subcategory?: string;
};

export type RankedDishMatch<T extends DishMatchOption = DishMatchOption> = T & {
  score: number;
};

export type UnknownDishPriorityInput = {
  occurrences?: number | null;
  riskLevel?: string | null;
  duplicateScore?: number | null;
  aiConfidence?: number | null;
};

export function normalizeDishMatchText(value: string): string {
  return String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase('en-IN')
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function bigrams(value: string) {
  const compact = normalizeDishMatchText(value).replace(/\s+/g, '');
  if (compact.length < 2) return compact ? [compact] : [];
  const result: string[] = [];
  for (let index = 0; index < compact.length - 1; index += 1) {
    result.push(compact.slice(index, index + 2));
  }
  return result;
}

function diceCoefficient(left: string, right: string) {
  const a = bigrams(left);
  const b = bigrams(right);
  if (!a.length || !b.length) return 0;

  const counts = new Map<string, number>();
  b.forEach((item) => counts.set(item, (counts.get(item) ?? 0) + 1));

  let matches = 0;
  a.forEach((item) => {
    const count = counts.get(item) ?? 0;
    if (count > 0) {
      matches += 1;
      counts.set(item, count - 1);
    }
  });

  return (2 * matches) / (a.length + b.length);
}

function tokenOverlap(left: string, right: string) {
  const a = new Set(normalizeDishMatchText(left).split(' ').filter(Boolean));
  const b = new Set(normalizeDishMatchText(right).split(' ').filter(Boolean));
  if (!a.size || !b.size) return 0;

  let matches = 0;
  a.forEach((token) => {
    if (b.has(token)) matches += 1;
  });

  return matches / Math.max(a.size, b.size);
}

export function dishNameSimilarity(left: string, right: string): number {
  const a = normalizeDishMatchText(left);
  const b = normalizeDishMatchText(right);
  if (!a || !b) return 0;
  if (a === b) return 100;

  const dice = diceCoefficient(a, b);
  const tokens = tokenOverlap(a, b);
  const contains = a.includes(b) || b.includes(a) ? 0.12 : 0;
  const prefix = a.slice(0, 4) === b.slice(0, 4) ? 0.05 : 0;

  return Math.max(
    0,
    Math.min(100, Math.round((dice * 0.72 + tokens * 0.23 + contains + prefix) * 100)),
  );
}

export function rankDishMatches<T extends DishMatchOption>(
  query: string,
  options: T[],
  limit = 5,
): RankedDishMatch<T>[] {
  const normalizedQuery = normalizeDishMatchText(query);
  if (!normalizedQuery) return [];

  return options
    .map((option) => ({
      ...option,
      score: dishNameSimilarity(normalizedQuery, option.name),
    }))
    .filter((option) => option.score >= 25)
    .sort((left, right) =>
      right.score - left.score ||
      left.name.localeCompare(right.name),
    )
    .slice(0, Math.max(1, limit));
}

export function unknownDishPriorityScore(input: UnknownDishPriorityInput): number {
  const occurrences = Math.max(0, Number(input.occurrences) || 0);
  const rawDuplicate = Math.max(0, Number(input.duplicateScore) || 0);
  const rawConfidence = Math.max(0, Number(input.aiConfidence) || 0);
  const duplicate = Math.min(100, rawDuplicate <= 1 ? rawDuplicate * 100 : rawDuplicate);
  const confidence = Math.min(100, rawConfidence <= 1 ? rawConfidence * 100 : rawConfidence);
  const risk = String(input.riskLevel || '').toUpperCase();

  const riskWeight =
    risk === 'HIGH' ? 55 :
    risk === 'MEDIUM' ? 30 :
    risk === 'LOW' ? 10 :
    0;

  return occurrences * 8 + riskWeight + duplicate * 0.25 + confidence * 0.05;
}
