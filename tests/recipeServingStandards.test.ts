import test from 'node:test';
import assert from 'node:assert/strict';

import {
  recipeServingStandard,
  servingStandardInstruction,
} from '../lib/recipeServingStandards';

test(
  'welcome drink uses 180 ml per guest',
  () => {
    const result =
      recipeServingStandard(
        'Welcome Drink',
        'Orange Juice',
      );

    assert.ok(result);

    assert.equal(
      result.perGuestQuantity,
      180,
    );

    assert.equal(
      result.batch100Quantity,
      18,
    );

    assert.equal(
      result.batch100Unit,
      'ltr',
    );
  },
);

test(
  'mocktail uses 180 ml per guest',
  () => {
    const result =
      recipeServingStandard(
        'Mocktail',
        'Blue Lagoon',
      );

    assert.equal(
      result?.perGuestQuantity,
      180,
    );
  },
);

test(
  'soup uses 150 ml per guest',
  () => {
    const result =
      recipeServingStandard(
        'Soup',
        'Tomato Soup',
      );

    assert.equal(
      result?.perGuestQuantity,
      150,
    );

    assert.equal(
      result?.batch100Quantity,
      15,
    );
  },
);

test(
  'dal kadhi uses 100 ml per guest',
  () => {
    const result =
      recipeServingStandard(
        'Dal/Kadhi',
        'Dal Fry',
      );

    assert.equal(
      result?.perGuestQuantity,
      100,
    );

    assert.equal(
      result?.batch100Quantity,
      10,
    );
  },
);

test(
  'piece sweet uses one piece per guest',
  () => {
    const result =
      recipeServingStandard(
        'Sweet',
        'Gulab Jamun',
      );

    assert.equal(
      result?.perGuestQuantity,
      1,
    );

    assert.equal(
      result?.perGuestUnit,
      'piece',
    );

    assert.equal(
      result?.batch100Quantity,
      100,
    );
  },
);

test(
  'unknown category does not invent serving standard',
  () => {
    const result =
      recipeServingStandard(
        'Other',
        'Special Dish',
      );

    assert.equal(
      result,
      null,
    );
  },
);

test(
  'serving instruction explains final batch target',
  () => {
    const standard =
      recipeServingStandard(
        'Soup',
        'Manchow Soup',
      );

    const instruction =
      servingStandardInstruction(
        standard,
      );

    assert.match(
      instruction,
      /150 ml per guest/,
    );

    assert.match(
      instruction,
      /15 ltr final prepared yield/,
    );
  },
);
