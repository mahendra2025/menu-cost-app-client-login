import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assessRecipeQuality,
  type CostableRecipe,
} from '../lib/recipeCosting';

function quality(
  recipe: CostableRecipe,
) {
  return assessRecipeQuality(
    recipe,
    {
      missingRates: 0,
      estimatedRates: 0,
      costPerPlate: 60,
    },
  );
}

function paneerRecipe(
  paneerKg: number,
): CostableRecipe {
  return {
    name: 'Paneer Handi',
    aliases: [],
    baseGuests: 100,

    ingredients: [
      {
        name: 'Paneer',
        quantity: paneerKg,
        unit: 'kg',
      },
      {
        name: 'Onion',
        quantity: 2,
        unit: 'kg',
      },
      {
        name: 'Tomato',
        quantity: 3,
        unit: 'kg',
      },
      {
        name: 'Cream',
        quantity: 1,
        unit: 'kg',
      },
    ],
  };
}

test(
  'blocks paneer dish when paneer is critically low',
  () => {
    const result =
      quality(
        paneerRecipe(1),
      );

    assert.equal(
      result.status,
      'BLOCKED',
    );

    assert.ok(
      result.issues.some(
        (issue) =>
          issue.code ===
          'PANEER_CRITICALLY_LOW_QUANTITY',
      ),
    );
  },
);

test(
  'reviews paneer dish when paneer quantity is low',
  () => {
    const result =
      quality(
        paneerRecipe(3),
      );

    assert.equal(
      result.status,
      'REVIEW',
    );

    assert.ok(
      result.issues.some(
        (issue) =>
          issue.code ===
          'PANEER_LOW_QUANTITY',
      ),
    );
  },
);

test(
  'accepts realistic paneer quantity',
  () => {
    const result =
      quality(
        paneerRecipe(6),
      );

    assert.equal(
      result.status,
      'READY',
    );
  },
);

test(
  'blocks paneer dish when core paneer ingredient is missing',
  () => {
    const result =
      quality({
        name:
          'Paneer Butter Masala',

        aliases: [],
        baseGuests: 100,

        ingredients: [
          {
            name: 'Onion',
            quantity: 3,
            unit: 'kg',
          },
          {
            name: 'Tomato',
            quantity: 4,
            unit: 'kg',
          },
          {
            name: 'Butter',
            quantity: 1,
            unit: 'kg',
          },
          {
            name: 'Cream',
            quantity: 1,
            unit: 'kg',
          },
        ],
      });

    assert.equal(
      result.status,
      'BLOCKED',
    );

    assert.ok(
      result.issues.some(
        (issue) =>
          issue.code ===
          'PANEER_CORE_INGREDIENT_MISSING',
      ),
    );
  },
);

test(
  'blocks biryani when rice is missing',
  () => {
    const result =
      quality({
        name:
          'Veg Biryani',

        aliases: [],
        baseGuests: 100,

        ingredients: [
          {
            name: 'Mixed Vegetable',
            quantity: 5,
            unit: 'kg',
          },
          {
            name: 'Curd',
            quantity: 2,
            unit: 'kg',
          },
          {
            name: 'Onion',
            quantity: 3,
            unit: 'kg',
          },
          {
            name: 'Oil',
            quantity: 1,
            unit: 'ltr',
          },
        ],
      });

    assert.equal(
      result.status,
      'BLOCKED',
    );

    assert.ok(
      result.issues.some(
        (issue) =>
          issue.code ===
          'RICE_CORE_INGREDIENT_MISSING',
      ),
    );
  },
);
