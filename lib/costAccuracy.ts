export type CostAccuracyRisk =
  | 'NEW_BASELINE'
  | 'STABLE'
  | 'WATCH'
  | 'HIGH';

export type CostBaselineSource =
  | 'previous_tenant_recipe'
  | 'dish_master'
  | 'built_in_catalog'
  | 'none';

export type CostAccuracyResult = {
  risk: CostAccuracyRisk;
  baselineSource: CostBaselineSource;

  currentCostPerPlate: number;
  previousCostPerPlate: number;

  changeAmount: number;
  changePercent: number;

  direction:
    | 'UP'
    | 'DOWN'
    | 'FLAT'
    | 'NEW';

  reason: string;
};

function roundMoney(
  value: number,
) {
  return Math.round(
    value * 100,
  ) / 100;
}

function roundPercent(
  value: number,
) {
  return Math.round(
    value * 10,
  ) / 10;
}

function sourceLabel(
  source: CostBaselineSource,
) {
  switch (source) {
    case 'previous_tenant_recipe':
      return 'previous tenant recipe';

    case 'dish_master':
      return 'Dish Master';

    case 'built_in_catalog':
      return 'catalog baseline';

    default:
      return 'previous cost';
  }
}

export function assessCostAccuracy(
  currentRaw: number,
  previousRaw: number,
  baselineSource:
    CostBaselineSource = 'none',
): CostAccuracyResult {
  const current =
    Math.max(
      0,
      Number(currentRaw) || 0,
    );

  const previous =
    Math.max(
      0,
      Number(previousRaw) || 0,
    );

  if (!(previous > 0)) {
    return {
      risk: 'NEW_BASELINE',
      baselineSource: 'none',

      currentCostPerPlate:
        roundMoney(current),

      previousCostPerPlate: 0,

      changeAmount: 0,
      changePercent: 0,

      direction: 'NEW',

      reason:
        'No previous trusted cost is available yet. This cost becomes the first baseline.',
    };
  }

  const change =
    current - previous;

  const absoluteChange =
    Math.abs(change);

  const percent =
    previous > 0
      ? (
          change /
          previous
        ) * 100
      : 0;

  const absolutePercent =
    Math.abs(percent);

  let risk:
    CostAccuracyRisk =
      'STABLE';

  /*
   * Avoid false alarms such as ₹2 → ₹3.
   * A meaningful rupee movement AND percentage
   * movement are both required.
   */
  if (
    absoluteChange >= 10 &&
    absolutePercent >= 30
  ) {
    risk = 'HIGH';
  } else if (
    absoluteChange >= 5 &&
    absolutePercent >= 15
  ) {
    risk = 'WATCH';
  }

  const direction =
    change > 0.01
      ? 'UP'
      : change < -0.01
        ? 'DOWN'
        : 'FLAT';

  const signedPercent =
    `${percent >= 0 ? '+' : ''}${roundPercent(percent)}%`;

  const signedAmount =
    `${change >= 0 ? '+' : '-'}₹${roundMoney(
      absoluteChange,
    ).toFixed(2)}`;

  const baseline =
    sourceLabel(
      baselineSource,
    );

  const reason =
    risk === 'HIGH'
      ? `Large cost movement: ${signedAmount} (${signedPercent}) versus ${baseline}. Review rates and recipe before quoting.`
      : risk === 'WATCH'
        ? `Cost changed ${signedAmount} (${signedPercent}) versus ${baseline}. A quick review is recommended.`
        : `Cost movement ${signedAmount} (${signedPercent}) is within the normal review range.`;

  return {
    risk,
    baselineSource,

    currentCostPerPlate:
      roundMoney(current),

    previousCostPerPlate:
      roundMoney(previous),

    changeAmount:
      roundMoney(change),

    changePercent:
      roundPercent(percent),

    direction,

    reason,
  };
}
