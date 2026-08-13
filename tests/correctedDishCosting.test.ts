import test from 'node:test';

import assert from 'node:assert/strict';

import {
  buildAutoRecipeCostRefresh,
  buildCatalogCostRefresh,
  buildCategoryEstimateCostRefresh,
} from '../lib/correctedDishCosting';

test(
  'Dish Master refresh creates trusted cost',
  () => {
    const result =
      buildCatalogCostRefresh(
        78,
      );

    assert.equal(
      result.usable,
      true,
    );

    assert.equal(
      result.patch.costPerPlate,
      78,
    );

    assert.equal(
      result.patch.costSource,
      'catalog',
    );

    assert.equal(
      result.patch.coverageStatus,
      'COSTED',
    );

    assert.equal(
      result.patch.costApprovalStatus,
      'NOT_REQUIRED',
    );
  },
);

test(
  'category estimate is transparent review fallback',
  () => {
    const result =
      buildCategoryEstimateCostRefresh(
        55,
      );

    assert.equal(
      result.usable,
      true,
    );

    assert.equal(
      result.patch.costSource,
      'category_estimate',
    );

    assert.equal(
      result.patch.coverageStatus,
      'REVIEW',
    );

    assert.equal(
      result.patch.costQualityStatus,
      'REVIEW',
    );
  },
);

test(
  'ready AI recipe maps complete quality metadata',
  () => {
    const result =
      buildAutoRecipeCostRefresh({
        requestedName:
          'Rajwadi Paneer',

        costPerPlate:
          64.8,

        source:
          'ai_recipe',

        quality: {
          status:
            'READY',

          score:
            94,

          rateCoveragePercent:
            100,

          issues:
            [],
        },

        accuracy: {
          risk:
            'STABLE',

          previousCostPerPlate:
            62,

          changeAmount:
            2.8,

          changePercent:
            4.5,

          baselineSource:
            'previous_tenant_recipe',

          reason:
            'Cost movement is stable.',
        },

        costDrivers:
          [],
      });

    assert.equal(
      result.usable,
      true,
    );

    assert.equal(
      result.patch.costPerPlate,
      64.8,
    );

    assert.equal(
      result.patch.costSource,
      'ai_recipe',
    );

    assert.equal(
      result.patch.costConfidence,
      94,
    );

    assert.equal(
      result.patch.accuracyRisk,
      'STABLE',
    );

    assert.equal(
      result.patch.costApprovalStatus,
      'NOT_REQUIRED',
    );
  },
);

test(
  'review recipe keeps cost but requires approval',
  () => {
    const result =
      buildAutoRecipeCostRefresh({
        costPerPlate:
          48,

        source:
          'catalog_recipe',

        quality: {
          status:
            'REVIEW',

          score:
            72,

          rateCoveragePercent:
            80,

          issues: [
            {
              message:
                'Some ingredient rates are estimated.',
            },
          ],
        },

        accuracy: {
          risk:
            'WATCH',

          previousCostPerPlate:
            42,

          changeAmount:
            6,

          changePercent:
            14.3,

          baselineSource:
            'dish_master',

          reason:
            'Review movement.',
        },

        costDrivers:
          [],
      });

    assert.equal(
      result.usable,
      true,
    );

    assert.equal(
      result.patch.coverageStatus,
      'REVIEW',
    );

    assert.equal(
      result.patch.costApprovalStatus,
      'PENDING',
    );

    assert.equal(
      result.patch.costPerPlate,
      48,
    );
  },
);

test(
  'blocked automatic recipe never writes unsafe cost',
  () => {
    const result =
      buildAutoRecipeCostRefresh({
        costPerPlate:
          85,

        source:
          'ai_recipe',

        quality: {
          status:
            'BLOCKED',

          score:
            20,

          rateCoveragePercent:
            30,

          issues: [
            {
              message:
                'Recipe is unsafe for costing.',
            },
          ],
        },

        accuracy: {
          risk:
            'HIGH',

          baselineSource:
            'dish_master',
        },
      });

    assert.equal(
      result.usable,
      false,
    );

    assert.equal(
      result.patch.costPerPlate,
      0,
    );

    assert.equal(
      result.patch.coverageStatus,
      'NEW_DISH_PENDING',
    );

    assert.equal(
      result.patch.costApprovalStatus,
      'PENDING',
    );
  },
);

test(
  'unresolved API result stays manual-rate pending',
  () => {
    const result =
      buildAutoRecipeCostRefresh({
        costPerPlate:
          0,

        source:
          'unresolved',

        quality: {
          status:
            'BLOCKED',

          score:
            0,

          rateCoveragePercent:
            0,
        },
      });

    assert.equal(
      result.usable,
      false,
    );

    assert.equal(
      result.patch.costPerPlate,
      0,
    );

    assert.equal(
      result.patch.costSource,
      undefined,
    );
  },
);
