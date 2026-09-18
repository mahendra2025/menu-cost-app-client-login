export type LearnedDishAliasRule = {
  aliasName: string;
  canonicalName: string;
  category: string;
  action: 'MAP' | 'REJECT';
  usageCount: number;
  scope: 'TENANT' | 'GLOBAL';
};

export type ReviewedDishAliasRow = {
  name?: string | null;
  canonicalName?: string | null;
  matchedDishName?: string | null;
  suggestedCategory?: string | null;
  categoryHint?: string | null;
  occurrences?: number | null;
  status?: string | null;
};

export function normalizeLearnedDishAliasKey(value: unknown) {
  return String(value || '')
    .normalize('NFKD')
    .toLocaleLowerCase('en-IN')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildAdminReviewedAliasRules(
  rows: ReviewedDishAliasRow[],
): LearnedDishAliasRule[] {
  const rules = new Map<string, LearnedDishAliasRule>();

  for (const row of rows) {
    const status = String(row.status || '').trim().toUpperCase();

    if (!['MATCHED', 'APPROVED'].includes(status)) {
      continue;
    }

    const aliasName = String(row.name || '').trim();
    const canonicalName = String(
      row.canonicalName || row.matchedDishName || '',
    ).trim();
    const aliasKey = normalizeLearnedDishAliasKey(aliasName);
    const canonicalKey = normalizeLearnedDishAliasKey(canonicalName);

    if (
      !aliasKey ||
      !canonicalKey ||
      aliasKey === canonicalKey ||
      rules.has(aliasKey)
    ) {
      continue;
    }

    rules.set(aliasKey, {
      aliasName,
      canonicalName,
      category:
        String(
          row.suggestedCategory ||
            row.categoryHint ||
            'Other',
        ).trim() || 'Other',
      action: 'MAP',
      usageCount: Math.max(0, Number(row.occurrences) || 0),
      scope: 'GLOBAL',
    });
  }

  return Array.from(rules.values());
}

export function mergeLearnedDishAliasRules(
  tenantRules: LearnedDishAliasRule[],
  globalRules: LearnedDishAliasRule[],
): LearnedDishAliasRule[] {
  const merged = new Map<string, LearnedDishAliasRule>();

  for (const rule of [...tenantRules, ...globalRules]) {
    const key = normalizeLearnedDishAliasKey(rule.aliasName);

    if (!key || merged.has(key)) {
      continue;
    }

    merged.set(key, rule);
  }

  return Array.from(merged.values());
}
