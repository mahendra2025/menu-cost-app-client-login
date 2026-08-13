import test from 'node:test';

import assert from 'node:assert/strict';

import {
  buildDetectionBenchmark,
} from '../lib/detectionBenchmark';

test(
  'perfect untouched detection scores 100',
  () => {
    const result =
      buildDetectionBenchmark([
        {
          coverageStatus:
            'COSTED',

          detectionSource:
            'catalog',

          detectionReason:
            'Matched Dish Master/catalog',
        },

        {
          coverageStatus:
            'COSTED',

          detectionSource:
            'ai',

          detectionReason:
            'AI dish strongly matches one source menu line',
        },
      ]);

    assert.equal(
      result.recallPercent,
      100,
    );

    assert.equal(
      result.precisionPercent,
      100,
    );

    assert.equal(
      result.exactCapturePercent,
      100,
    );
  },
);

test(
  'rejected detection lowers precision',
  () => {
    const result =
      buildDetectionBenchmark([
        {
          coverageStatus:
            'COSTED',
        },

        {
          coverageStatus:
            'REJECTED',

          detectionReason:
            'User marked this detection as a false positive',
        },
      ]);

    assert.equal(
      result.falsePositives,
      1,
    );

    assert.equal(
      result.precisionPercent,
      50,
    );
  },
);

test(
  'recovered missed dish lowers recall',
  () => {
    const result =
      buildDetectionBenchmark([
        {
          coverageStatus:
            'COSTED',
        },

        {
          coverageStatus:
            'NEW_DISH_PENDING',

          detectionSource:
            'manual',

          detectionReason:
            'User confirmed a possible missed source-menu dish',
        },
      ]);

    assert.equal(
      result.totalMissedRecovered,
      1,
    );

    assert.equal(
      result.recallPercent,
      50,
    );
  },
);

test(
  'manual missed dish also counts against recall',
  () => {
    const result =
      buildDetectionBenchmark([
        {
          coverageStatus:
            'COSTED',
        },

        {
          coverageStatus:
            'NEW_DISH_PENDING',

          detectionReason:
            'User manually added a dish missed by detection',
        },
      ]);

    assert.equal(
      result.manuallyAddedMissed,
      1,
    );

    assert.equal(
      result.groundTruth,
      2,
    );

    assert.equal(
      result.recallPercent,
      50,
    );
  },
);

test(
  'corrected detection remains true positive but reduces exact capture',
  () => {
    const result =
      buildDetectionBenchmark([
        {
          coverageStatus:
            'NEW_DISH_PENDING',

          detectionSource:
            'manual',

          detectionReason:
            'User corrected the detected dish name or category',
        },
      ]);

    assert.equal(
      result.recallPercent,
      100,
    );

    assert.equal(
      result.precisionPercent,
      100,
    );

    assert.equal(
      result.corrected,
      1,
    );

    assert.equal(
      result.exactCapturePercent,
      0,
    );
  },
);

test(
  'restored rejected item becomes accepted again',
  () => {
    const result =
      buildDetectionBenchmark([
        {
          coverageStatus:
            'COSTED',

          detectionSource:
            'manual',

          detectionReason:
            'User restored this detected dish',
        },
      ]);

    assert.equal(
      result.falsePositives,
      0,
    );

    assert.equal(
      result.precisionPercent,
      100,
    );
  },
);

test(
  'excellent target requires strong recall and precision',
  () => {
    const rows = [];

    for (
      let index = 0;
      index < 100;
      index += 1
    ) {
      rows.push({
        coverageStatus:
          'COSTED',
      });
    }

    const result =
      buildDetectionBenchmark(
        rows,
      );

    assert.equal(
      result.grade,
      'EXCELLENT',
    );
  },
);
