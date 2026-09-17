import type { DisposableCostItem } from './types';

export type DisposableCostLine = DisposableCostItem & {
  lineTotal: number;
};

export type DisposableCostSummary = {
  items: DisposableCostLine[];
  activeItemCount: number;
  total: number;
};

function safeNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

export function calculateDisposableCost(
  items: DisposableCostItem[],
): DisposableCostSummary {
  const normalized = (Array.isArray(items) ? items : []).map((item) => {
    const quantity = safeNumber(item.quantity);
    const unitCost = safeNumber(item.unitCost);

    return {
      ...item,
      quantity,
      unitCost,
      lineTotal: quantity * unitCost,
    };
  });

  const total = normalized.reduce(
    (sum, item) => sum + item.lineTotal,
    0,
  );

  return {
    items: normalized,
    activeItemCount: normalized.filter((item) => item.lineTotal > 0).length,
    total,
  };
}

export function disposableCostPerCover(
  total: number,
  covers: number,
) {
  const safeTotal = safeNumber(total);
  const safeCovers = Math.max(0, Math.round(safeNumber(covers)));

  return safeCovers > 0 ? safeTotal / safeCovers : 0;
}
