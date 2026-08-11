import type {
  MenuItem,
} from './types';

export type MenuCoverageStatus =
  NonNullable<
    MenuItem['coverageStatus']
  >;

export type MenuCoverageSummary = {
  total: number;

  counts: Record<
    MenuCoverageStatus,
    number
  >;

  accounted: number;
  unresolved: number;
  coveragePercent: number;
};

export function getMenuCoverageStatus(
  item: MenuItem,
  selected = true,
): MenuCoverageStatus {
  if (!selected) {
    return 'REJECTED';
  }

  const hasCost =
    Number(
      item.costPerPlate,
    ) > 0;

  if (hasCost) {
    if (
      item.costQualityStatus ===
        'REVIEW' ||
      item.costQualityStatus ===
        'BLOCKED'
    ) {
      return 'REVIEW';
    }

    return 'COSTED';
  }

  if (
    item.coverageStatus ===
    'NEW_DISH_PENDING'
  ) {
    return 'NEW_DISH_PENDING';
  }

  if (
    item.coverageStatus ===
    'REJECTED'
  ) {
    return 'REJECTED';
  }

  return 'UNRESOLVED';
}

export function menuCoverageStatusLabel(
  status: MenuCoverageStatus,
) {
  switch (status) {
    case 'COSTED':
      return 'Costed';

    case 'REVIEW':
      return 'Needs Review';

    case 'NEW_DISH_PENDING':
      return 'New Dish Pending';

    case 'REJECTED':
      return 'Rejected';

    default:
      return 'Unresolved';
  }
}

export function summarizeMenuCoverage(
  items: MenuItem[],
  selectedIds?: Set<string>,
): MenuCoverageSummary {
  const counts:
    Record<
      MenuCoverageStatus,
      number
    > = {
      COSTED: 0,
      REVIEW: 0,
      NEW_DISH_PENDING: 0,
      REJECTED: 0,
      UNRESOLVED: 0,
    };

  items.forEach(
    (item) => {
      const selected =
        selectedIds
          ? selectedIds.has(
              item.id,
            )
          : true;

      const status =
        getMenuCoverageStatus(
          item,
          selected,
        );

      counts[status] += 1;
    },
  );

  const total =
    items.length;

  const unresolved =
    counts.UNRESOLVED;

  /*
   * "Coverage" means every detected dish
   * has an explicit known state.
   *
   * Review, Pending and Rejected are
   * intentionally accounted states.
   * Only UNRESOLVED reduces coverage.
   */
  const accounted =
    Math.max(
      0,
      total - unresolved,
    );

  const coveragePercent =
    total
      ? Math.round(
          accounted /
            total *
            1000,
        ) / 10
      : 100;

  return {
    total,
    counts,
    accounted,
    unresolved,
    coveragePercent,
  };
}
