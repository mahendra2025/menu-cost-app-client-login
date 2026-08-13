import type {
  MenuItem,
} from './types';

export type DishCostRefresh = {
  usable: boolean;

  source:
    | 'catalog'
    | 'catalog_recipe'
    | 'ai_recipe'
    | 'category_estimate'
    | 'unresolved';

  reason: string;

  patch:
    Partial<MenuItem>;
};

function asRecord(
  value: unknown,
): Record<
  string,
  unknown
> {
  if (
    !value ||
    typeof value !==
      'object' ||
    Array.isArray(
      value,
    )
  ) {
    return {};
  }

  return value as Record<
    string,
    unknown
  >;
}

function safeNumber(
  value: unknown,
) {
  const number =
    Number(value);

  return Number.isFinite(
    number,
  )
    ? number
    : 0;
}

function clampPercent(
  value: unknown,
) {
  return Math.max(
    0,
    Math.min(
      100,
      safeNumber(
        value,
      ),
    ),
  );
}

function firstIssueMessage(
  value: unknown,
) {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return '';
  }

  for (
    const issue
    of value
  ) {
    const row =
      asRecord(issue);

    const message =
      String(
        row.message ||
        '',
      ).trim();

    if (message) {
      return message;
    }
  }

  return '';
}

function validAccuracyRisk(
  value: unknown,
):
  | MenuItem[
      'accuracyRisk'
    ]
  | undefined {
  const risk =
    String(
      value ||
      '',
    );

  if (
    [
      'NEW_BASELINE',
      'STABLE',
      'WATCH',
      'HIGH',
    ].includes(
      risk,
    )
  ) {
    return risk as
      NonNullable<
        MenuItem[
          'accuracyRisk'
        ]
      >;
  }

  return undefined;
}

function validBaselineSource(
  value: unknown,
):
  NonNullable<
    MenuItem[
      'costBaselineSource'
    ]
  > {
  const source =
    String(
      value ||
      '',
    );

  if (
    [
      'previous_tenant_recipe',
      'dish_master',
      'built_in_catalog',
      'none',
    ].includes(
      source,
    )
  ) {
    return source as
      NonNullable<
        MenuItem[
          'costBaselineSource'
        ]
      >;
  }

  return 'none';
}

export function buildCatalogCostRefresh(
  rateRaw: unknown,
): DishCostRefresh {
  const rate =
    Math.max(
      0,
      safeNumber(
        rateRaw,
      ),
    );

  if (!(rate > 0)) {
    return {
      usable:
        false,

      source:
        'unresolved',

      reason:
        'Dish Master did not provide a usable rate.',

      patch: {
        costPerPlate:
          0,

        costSource:
          undefined,

        coverageStatus:
          'NEW_DISH_PENDING',

        costQualityStatus:
          'BLOCKED',

        costConfidence:
          0,

        rateCoveragePercent:
          0,

        coverageReason:
          'No usable Dish Master rate is available.',

        costApprovalStatus:
          'PENDING',

        costApprovalReason:
          'Enter or confirm a cost for this dish.',

        ingredientCostDrivers:
          [],
      },
    };
  }

  return {
    usable:
      true,

    source:
      'catalog',

    reason:
      'Fresh Dish Master rate applied.',

    patch: {
      costPerPlate:
        rate,

      costSource:
        'catalog',

      coverageStatus:
        'COSTED',

      costQualityStatus:
        'READY',

      costConfidence:
        100,

      rateCoveragePercent:
        100,

      coverageReason:
        'Fresh Dish Master rate applied after menu correction.',

      costApprovalStatus:
        'NOT_REQUIRED',

      costApprovedAt:
        undefined,

      costApprovalReason:
        'Dish Master rate is trusted.',

      accuracyRisk:
        undefined,

      previousCostPerPlate:
        undefined,

      costChangeAmount:
        undefined,

      costChangePercent:
        undefined,

      costBaselineSource:
        undefined,

      accuracyReason:
        undefined,

      ingredientCostDrivers:
        [],
    },
  };
}

export function buildCategoryEstimateCostRefresh(
  rateRaw: unknown,
): DishCostRefresh {
  const rate =
    Math.max(
      0,
      safeNumber(
        rateRaw,
      ),
    );

  if (!(rate > 0)) {
    return buildCatalogCostRefresh(
      0,
    );
  }

  return {
    usable:
      true,

    source:
      'category_estimate',

    reason:
      'Temporary category estimate applied.',

    patch: {
      costPerPlate:
        rate,

      costSource:
        'category_estimate',

      coverageStatus:
        'REVIEW',

      costQualityStatus:
        'REVIEW',

      costConfidence:
        35,

      rateCoveragePercent:
        0,

      coverageReason:
        'No confirmed recipe was available, so a transparent category estimate is being used temporarily.',

      costApprovalStatus:
        'NOT_REQUIRED',

      costApprovedAt:
        undefined,

      costApprovalReason:
        'Category estimate is visible for later improvement.',

      accuracyRisk:
        'NEW_BASELINE',

      previousCostPerPlate:
        0,

      costChangeAmount:
        0,

      costChangePercent:
        0,

      costBaselineSource:
        'none',

      accuracyReason:
        'No trusted previous cost is available for this temporary estimate.',

      ingredientCostDrivers:
        [],
    },
  };
}

export function buildAutoRecipeCostRefresh(
  value: unknown,
): DishCostRefresh {
  const row =
    asRecord(
      value,
    );

  const sourceRaw =
    String(
      row.source ||
      '',
    );

  const validSource =
    sourceRaw ===
      'catalog_recipe' ||
    sourceRaw ===
      'ai_recipe';

  const source:
    DishCostRefresh[
      'source'
    ] =
      validSource
        ? sourceRaw as
            | 'catalog_recipe'
            | 'ai_recipe'
        : 'unresolved';

  const cost =
    Math.max(
      0,
      safeNumber(
        row.costPerPlate,
      ),
    );

  const quality =
    asRecord(
      row.quality,
    );

  const statusRaw =
    String(
      quality.status ||
      '',
    );

  const qualityStatus:
    NonNullable<
      MenuItem[
        'costQualityStatus'
      ]
    > =
      statusRaw ===
        'READY' ||
      statusRaw ===
        'REVIEW' ||
      statusRaw ===
        'BLOCKED'
        ? statusRaw
        : 'BLOCKED';

  const accuracy =
    asRecord(
      row.accuracy,
    );

  const risk =
    validAccuracyRisk(
      accuracy.risk,
    );

  const issue =
    firstIssueMessage(
      quality.issues,
    );

  const usable =
    Boolean(
      validSource &&
      cost > 0 &&
      qualityStatus !==
        'BLOCKED',
    );

  if (!usable) {
    return {
      usable:
        false,

      source:
        'unresolved',

      reason:
        issue ||
        'Automatic recipe costing could not produce a safe usable cost.',

      patch: {
        costPerPlate:
          0,

        costSource:
          undefined,

        coverageStatus:
          'NEW_DISH_PENDING',

        costQualityStatus:
          'BLOCKED',

        costConfidence:
          clampPercent(
            quality.score,
          ),

        rateCoveragePercent:
          clampPercent(
            quality
              .rateCoveragePercent,
          ),

        coverageReason:
          issue ||
          'Automatic recipe costing could not produce a safe usable cost. Confirm a manual rate.',

        costApprovalStatus:
          'PENDING',

        costApprovedAt:
          undefined,

        costApprovalReason:
          'A safe automatic cost is not available yet.',

        accuracyRisk:
          risk,

        previousCostPerPlate:
          Math.max(
            0,
            safeNumber(
              accuracy
                .previousCostPerPlate,
            ),
          ),

        costChangeAmount:
          safeNumber(
            accuracy
              .changeAmount,
          ),

        costChangePercent:
          safeNumber(
            accuracy
              .changePercent,
          ),

        costBaselineSource:
          validBaselineSource(
            accuracy
              .baselineSource,
          ),

        accuracyReason:
          String(
            accuracy.reason ||
            '',
          ).trim() ||
          undefined,

        ingredientCostDrivers:
          [],
      },
    };
  }

  const needsApproval =
    qualityStatus ===
      'REVIEW' ||
    risk ===
      'HIGH';

  const coverageStatus:
    NonNullable<
      MenuItem[
        'coverageStatus'
      ]
    > =
      qualityStatus ===
        'REVIEW'
        ? 'REVIEW'
        : 'COSTED';

  const drivers =
    Array.isArray(
      row.costDrivers,
    )
      ? row.costDrivers as
          MenuItem[
            'ingredientCostDrivers'
          ]
      : [];

  return {
    usable:
      true,

    source,

    reason:
      issue ||
      'Fresh automatic recipe cost calculated.',

    patch: {
      costPerPlate:
        cost,

      costSource:
        source ===
          'catalog_recipe' ||
        source ===
          'ai_recipe'
          ? source
          : undefined,

      coverageStatus,

      costQualityStatus:
        qualityStatus,

      costConfidence:
        clampPercent(
          quality.score,
        ),

      rateCoveragePercent:
        clampPercent(
          quality
            .rateCoveragePercent,
        ),

      coverageReason:
        issue ||
        (
          source ===
            'catalog_recipe'
            ? 'Fresh catalog recipe cost calculated with 8% wastage.'
            : 'Fresh AI-assisted recipe cost calculated with 8% wastage.'
        ),

      accuracyRisk:
        risk,

      previousCostPerPlate:
        Math.max(
          0,
          safeNumber(
            accuracy
              .previousCostPerPlate,
          ),
        ),

      costChangeAmount:
        safeNumber(
          accuracy
            .changeAmount,
        ),

      costChangePercent:
        safeNumber(
          accuracy
            .changePercent,
        ),

      costBaselineSource:
        validBaselineSource(
          accuracy
            .baselineSource,
        ),

      accuracyReason:
        String(
          accuracy.reason ||
          '',
        ).trim() ||
        undefined,

      costApprovalStatus:
        needsApproval
          ? 'PENDING'
          : 'NOT_REQUIRED',

      costApprovedAt:
        undefined,

      costApprovalReason:
        needsApproval
          ? (
              risk ===
                'HIGH'
                ? 'Large cost movement needs review before quoting.'
                : 'Recipe quality should be reviewed before quoting.'
            )
          : 'Automatic cost passed the current quality checks.',

      ingredientCostDrivers:
        drivers,
    },
  };
}
