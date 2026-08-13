export type DetectionBenchmarkItem = {
  coverageStatus?: string;
  detectionSource?: string;
  detectionReason?: string;
};

export type DetectionBenchmark = {
  initialDetected: number;
  acceptedInitial: number;
  groundTruth: number;

  corrected: number;
  falsePositives: number;
  recoveredMissed: number;
  manuallyAddedMissed: number;
  totalMissedRecovered: number;

  recallPercent: number;
  precisionPercent: number;
  exactCapturePercent: number;

  reviewActions: number;

  score: number;

  grade:
    | 'EXCELLENT'
    | 'GOOD'
    | 'NEEDS_WORK';

  hasReviewSignals: boolean;
};

function percent(
  numerator: number,
  denominator: number,
  fallback = 100,
) {
  if (!(denominator > 0)) {
    return fallback;
  }

  return Math.round(
    numerator /
      denominator *
      1000,
  ) / 10;
}

function reasonIncludes(
  item: DetectionBenchmarkItem,
  value: string,
) {
  return String(
    item.detectionReason ||
    '',
  )
    .toLowerCase()
    .includes(
      value.toLowerCase(),
    );
}

export function buildDetectionBenchmark(
  items:
    DetectionBenchmarkItem[],
): DetectionBenchmark {
  const rows =
    Array.isArray(items)
      ? items
      : [];

  const isRecoveredMissed = (
    item:
      DetectionBenchmarkItem,
  ) =>
    reasonIncludes(
      item,
      'confirmed a possible missed',
    );

  const isManuallyAddedMissed = (
    item:
      DetectionBenchmarkItem,
  ) =>
    reasonIncludes(
      item,
      'manually added a dish missed',
    );

  const isMissedDish = (
    item:
      DetectionBenchmarkItem,
  ) =>
    isRecoveredMissed(item) ||
    isManuallyAddedMissed(item);

  const isRejected = (
    item:
      DetectionBenchmarkItem,
  ) =>
    item.coverageStatus ===
      'REJECTED';

  const isCorrected = (
    item:
      DetectionBenchmarkItem,
  ) =>
    reasonIncludes(
      item,
      'corrected the detected dish',
    );

  const recoveredMissed =
    rows.filter(
      isRecoveredMissed,
    ).length;

  const manuallyAddedMissed =
    rows.filter(
      isManuallyAddedMissed,
    ).length;

  const totalMissedRecovered =
    recoveredMissed +
    manuallyAddedMissed;

  /*
   * These are dishes the detector
   * originally proposed automatically.
   *
   * Manually recovered dishes are excluded.
   */
  const initialRows =
    rows.filter(
      (item) =>
        !isMissedDish(item),
    );

  const falsePositives =
    initialRows.filter(
      isRejected,
    ).length;

  const acceptedInitial =
    initialRows.filter(
      (item) =>
        !isRejected(item),
    ).length;

  const corrected =
    initialRows.filter(
      (item) =>
        !isRejected(item) &&
        isCorrected(item),
    ).length;

  /*
   * Ground truth is built from the
   * user's reviewed final menu:
   *
   * accepted original detections
   * +
   * real dishes the detector missed.
   */
  const groundTruth =
    acceptedInitial +
    totalMissedRecovered;

  const initialDetected =
    initialRows.length;

  const recallPercent =
    percent(
      acceptedInitial,
      groundTruth,
      groundTruth > 0
        ? 0
        : 100,
    );

  const precisionPercent =
    percent(
      acceptedInitial,
      initialDetected,
      initialDetected > 0
        ? 0
        : 100,
    );

  /*
   * Exact capture means:
   *
   * correct dish +
   * no name/category correction required.
   */
  const exactDetected =
    Math.max(
      0,
      acceptedInitial -
      corrected,
    );

  const exactCapturePercent =
    percent(
      exactDetected,
      groundTruth,
      groundTruth > 0
        ? 0
        : 100,
    );

  const reviewActions =
    corrected +
    falsePositives +
    totalMissedRecovered;

  /*
   * Recall matters most because silently
   * missing a dish can directly damage
   * a catering quotation/costing.
   */
  const score =
    Math.round(
      (
        recallPercent *
          0.45 +
        precisionPercent *
          0.35 +
        exactCapturePercent *
          0.20
      ) *
      10,
    ) / 10;

  const grade:
    DetectionBenchmark[
      'grade'
    ] =
      recallPercent >= 95 &&
      precisionPercent >= 97
        ? 'EXCELLENT'
        : recallPercent >= 90 &&
            precisionPercent >= 93
          ? 'GOOD'
          : 'NEEDS_WORK';

  return {
    initialDetected,
    acceptedInitial,
    groundTruth,

    corrected,
    falsePositives,
    recoveredMissed,
    manuallyAddedMissed,
    totalMissedRecovered,

    recallPercent,
    precisionPercent,
    exactCapturePercent,

    reviewActions,

    score,
    grade,

    hasReviewSignals:
      reviewActions > 0,
  };
}
