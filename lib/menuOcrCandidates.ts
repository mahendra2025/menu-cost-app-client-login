export type MenuOcrCandidate = {
  text: string;
  confidence: number;
  label: string;
};

export function menuOcrScore(text: string, confidence: number) {
  const usefulCharacters = text.match(/[\p{L}\p{N}]/gu)?.length ?? 0;
  const lines = text.split(/\r?\n/).filter((line) => /[\p{L}\p{N}]/u.test(line)).length;
  return (Number.isFinite(confidence) ? Math.max(0, Math.min(100, confidence)) : 0)
    + Math.min(20, usefulCharacters / 8) + Math.min(15, lines * 1.5);
}

/** A failed enhancement must not discard a successful reading. */
export async function collectMenuOcrCandidate(
  candidates: MenuOcrCandidate[],
  label: string,
  recognize: () => Promise<{ data: { text: string; confidence: number } }>,
) {
  try {
    const { data } = await recognize();
    const text = String(data.text || '').replace(/\u0000/g, '').trim();
    if (text) candidates.push({ text, confidence: data.confidence, label });
  } catch (error) {
    console.warn(`Menu reading failed (${label}):`, error);
  }
}

/** Compare every reading against the catalog, not only the OCR winner. */
export async function selectMenuOcrCandidate(
  candidates: MenuOcrCandidate[],
  catalogBoost?: (text: string) => Promise<number>,
) {
  const unique = candidates.filter((candidate, index) =>
    candidate.text.trim() && !candidates.slice(0, index).some((previous) =>
      previous.text === candidate.text && previous.confidence >= candidate.confidence),
  );
  const scored = await Promise.all(unique.map(async (candidate) => {
    let boost = 0;
    try {
      const value = catalogBoost ? await catalogBoost(candidate.text) : 0;
      if (Number.isFinite(value)) boost = value;
    } catch {
      // Catalog availability must not prevent the user from reviewing the text.
    }
    return { ...candidate, score: boost + menuOcrScore(candidate.text, candidate.confidence) };
  }));
  return scored.sort((left, right) => right.score - left.score)[0];
}
