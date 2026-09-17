export type SellingPriceMode = 'MARKUP' | 'MARGIN' | 'MANUAL';

export type SellingPriceInput = {
  totalCost: number;
  totalCovers: number;
  mode: SellingPriceMode;
  percent?: number;
  manualPricePerCover?: number;
};

export type SellingPriceResult = {
  totalCost: number;
  totalCovers: number;
  costPerCover: number;
  sellingPricePerCover: number;
  totalSelling: number;
  profit: number;
  markupPercent: number;
  marginPercent: number;
};

function safeNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function roundUpRupee(value: number) {
  return Math.ceil(Math.max(0, value));
}

export function calculateSellingPrice({
  totalCost,
  totalCovers,
  mode,
  percent = 0,
  manualPricePerCover = 0,
}: SellingPriceInput): SellingPriceResult {
  const cost = Math.max(0, safeNumber(totalCost));
  const covers = Math.max(0, Math.round(safeNumber(totalCovers)));
  const costPerCover = covers > 0 ? cost / covers : 0;
  const safePercent = Math.max(0, safeNumber(percent));

  let sellingPricePerCover = 0;

  if (mode === 'MANUAL') {
    sellingPricePerCover = Math.max(0, safeNumber(manualPricePerCover));
  } else if (covers > 0 && mode === 'MARGIN') {
    // Margin is profit / selling price. Keep the denominator valid.
    const margin = Math.min(95, safePercent);
    const targetSelling = margin >= 100
      ? 0
      : cost / (1 - margin / 100);
    sellingPricePerCover = roundUpRupee(targetSelling / covers);
  } else if (covers > 0) {
    // Markup is profit / cost.
    const targetSelling = cost * (1 + safePercent / 100);
    sellingPricePerCover = roundUpRupee(targetSelling / covers);
  }

  const totalSelling = sellingPricePerCover * covers;
  const profit = totalSelling - cost;
  const markupPercent = cost > 0 ? (profit / cost) * 100 : 0;
  const marginPercent = totalSelling > 0 ? (profit / totalSelling) * 100 : 0;

  return {
    totalCost: cost,
    totalCovers: covers,
    costPerCover,
    sellingPricePerCover,
    totalSelling,
    profit,
    markupPercent,
    marginPercent,
  };
}
