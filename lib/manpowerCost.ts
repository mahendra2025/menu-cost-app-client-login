import type {
  ManpowerRateMode,
  ManpowerRow,
} from './types';

function normalizePart(
  value: unknown,
  fallback: string,
) {
  return String(
    value || fallback,
  )
    .trim()
    .toLocaleLowerCase(
      'en-IN',
    )
    .replace(/\s+/g, ' ');
}

export function manpowerRawCost(
  row: ManpowerRow,
) {
  return (
    Math.max(
      0,
      Number(row.quantity) || 0,
    ) *
    Math.max(
      0,
      Number(row.rate) || 0,
    )
  );
}

export function getManpowerRateMode(
  row: ManpowerRow,
): ManpowerRateMode {
  /*
   * Dish specialists remain meal-specific.
   */
  if (row.autoDishAssignment) {
    return 'PER_MEAL';
  }

  return (
    row.rateMode ||
    'PER_MEAL'
  );
}

export function inferManpowerShift(
  row: ManpowerRow,
) {
  if (
    String(
      row.shiftLabel || '',
    ).trim()
  ) {
    return String(
      row.shiftLabel,
    ).trim();
  }

  const meal =
    normalizePart(
      row.mealLabel,
      '',
    );

  if (
    meal.includes('breakfast') ||
    meal.includes('morning')
  ) {
    return 'Morning';
  }

  if (
    meal.includes('lunch') ||
    meal.includes('hi-tea') ||
    meal.includes('hi tea') ||
    meal.includes('afternoon')
  ) {
    return 'Afternoon';
  }

  if (
    meal.includes('dinner') ||
    meal.includes('reception') ||
    meal.includes('evening')
  ) {
    return 'Evening';
  }

  return 'General Shift';
}

export function manpowerRateModeLabel(
  row: ManpowerRow,
) {
  const mode =
    getManpowerRateMode(row);

  if (mode === 'PER_DAY') {
    return 'Per Day';
  }

  if (mode === 'PER_SHIFT') {
    return `Per Shift · ${inferManpowerShift(
      row,
    )}`;
  }

  return 'Per Meal';
}

export function manpowerBillingKey(
  row: ManpowerRow,
) {
  const mode =
    getManpowerRateMode(row);

  /*
   * Every meal row is independently billable.
   */
  if (mode === 'PER_MEAL') {
    return `meal::${row.id}`;
  }

  const day =
    normalizePart(
      row.dayLabel,
      'event',
    );

  const role =
    normalizePart(
      row.role,
      'staff',
    );

  if (mode === 'PER_DAY') {
    return (
      `day::${day}` +
      `::${role}`
    );
  }

  const shift =
    normalizePart(
      inferManpowerShift(row),
      'general shift',
    );

  return (
    `shift::${day}` +
    `::${shift}` +
    `::${role}`
  );
}

function billingGroups(
  rows: ManpowerRow[],
) {
  const groups =
    new Map<
      string,
      {
        cost: number;
        representativeId: string;
      }
    >();

  rows.forEach((row) => {
    const cost =
      manpowerRawCost(row);

    if (!(cost > 0)) {
      return;
    }

    const key =
      manpowerBillingKey(row);

    const current =
      groups.get(key);

    /*
     * Shared shift/day team:
     * use the maximum required manpower
     * across covered meals.
     *
     * Example:
     * Lunch 10 waiters
     * Dinner 15 waiters
     * Same day team -> charge 15.
     */
    if (
      !current ||
      cost > current.cost
    ) {
      groups.set(
        key,
        {
          cost,
          representativeId:
            row.id,
        },
      );
    }
  });

  return groups;
}

export function calculateManpowerCost(
  rows: ManpowerRow[],
) {
  return Array.from(
    billingGroups(
      rows,
    ).values(),
  ).reduce(
    (sum, group) =>
      sum + group.cost,
    0,
  );
}

export function manpowerBillableCost(
  row: ManpowerRow,
  rows: ManpowerRow[],
) {
  const raw =
    manpowerRawCost(row);

  if (!(raw > 0)) {
    return 0;
  }

  const group =
    billingGroups(
      rows,
    ).get(
      manpowerBillingKey(
        row,
      ),
    );

  if (!group) {
    return 0;
  }

  return (
    group.representativeId ===
    row.id
      ? group.cost
      : 0
  );
}

export function manpowerIncludedInSharedRate(
  row: ManpowerRow,
  rows: ManpowerRow[],
) {
  return (
    getManpowerRateMode(row) !==
      'PER_MEAL' &&
    manpowerRawCost(row) > 0 &&
    manpowerBillableCost(
      row,
      rows,
    ) === 0
  );
}
