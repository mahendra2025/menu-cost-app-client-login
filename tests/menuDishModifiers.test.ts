import test from 'node:test';

import assert from 'node:assert/strict';

import {
  extractMenuDishModifiers,
  menuDishModifierKey,
  menuDishModifierLabels,
  menuDishVariantName,
  readMenuDishModifiers,
} from '../lib/menuDishModifiers';

test(
  'detects Jain and keeps the base dish clean',
  () => {
    const result =
      extractMenuDishModifiers(
        'Jain Paneer Tikka',
      );

    assert.equal(
      result.cleanText,
      'Paneer Tikka',
    );

    assert.deepEqual(
      result.modifiers?.tags,
      [
        'JAIN',
      ],
    );

    assert.equal(
      menuDishVariantName(
        result.cleanText,
        result.modifiers,
      ),
      'Paneer Tikka [Jain]',
    );
  },
);

test(
  'detects no onion garlic modifier',
  () => {
    const result =
      extractMenuDishModifiers(
        'Dal Fry - Without Onion & Garlic',
      );

    assert.equal(
      result.cleanText,
      'Dal Fry',
    );

    assert.deepEqual(
      result.modifiers?.tags,
      [
        'NO_ONION_GARLIC',
      ],
    );
  },
);

test(
  'detects live counter without changing the base dish',
  () => {
    const result =
      extractMenuDishModifiers(
        'Live Roti',
      );

    assert.equal(
      result.cleanText,
      'Roti',
    );

    assert.deepEqual(
      result.modifiers?.tags,
      [
        'LIVE',
      ],
    );
  },
);

test(
  'detects beverage serving size',
  () => {
    const result =
      extractMenuDishModifiers(
        'Water Bottle - 200 ml',
      );

    assert.equal(
      result.cleanText,
      'Water Bottle',
    );

    assert.equal(
      result.modifiers
        ?.portionQuantity,
      200,
    );

    assert.equal(
      result.modifiers
        ?.portionUnit,
      'ml',
    );
  },
);

test(
  'detects piece count and piece weight',
  () => {
    const result =
      extractMenuDishModifiers(
        'Gulab Jamun - 2 pcs x 35 g',
      );

    assert.equal(
      result.cleanText,
      'Gulab Jamun',
    );

    assert.equal(
      result.modifiers
        ?.portionQuantity,
      2,
    );

    assert.equal(
      result.modifiers
        ?.portionUnit,
      'piece',
    );

    assert.equal(
      result.modifiers
        ?.pieceWeightGrams,
      35,
    );
  },
);

test(
  'modifier identity separates standard and Jain variants',
  () => {
    const standard =
      menuDishModifierKey(
        undefined,
      );

    const jain =
      menuDishModifierKey({
        tags: [
          'JAIN',
        ],
      });

    assert.notEqual(
      standard,
      jain,
    );
  },
);

test(
  'safe decoder drops unsupported modifier values',
  () => {
    const decoded =
      readMenuDishModifiers({
        tags: [
          'JAIN',
          'UNKNOWN',
        ],
        portionQuantity:
          200,
        portionUnit:
          'ml',
      });

    assert.deepEqual(
      menuDishModifierLabels(
        decoded,
      ),
      [
        'Jain',
        '200 ml',
      ],
    );
  },
);
