import assert from 'node:assert/strict';
import test from 'node:test';

import {
  suggestItalianGas,
} from '../lib/italianGas';

test('Italian gas starters distinguish simmer, boil, oven, grill and light prep', () => {
  assert.deepEqual(
    [
      suggestItalianGas('Pesto Risotto').kgPer100,
      suggestItalianGas('Spaghetti Aglio Olio').kgPer100,
      suggestItalianGas('Spinach Corn Lasagna').kgPer100,
      suggestItalianGas('Vegetable Panini').kgPer100,
      suggestItalianGas('Roasted Vegetable Salad').kgPer100,
      suggestItalianGas('Veg Pizza').kgPer100,
    ],
    [
      1.05,
      0.85,
      1.15,
      0.80,
      0.45,
      1.15,
    ],
  );
});

test('wood fired pizza keeps LPG starter low because oven fuel is not LPG', () => {
  assert.deepEqual(
    suggestItalianGas('Wood Fired Margherita Pizza'),
    {
      kgPer100: 0.20,
      group: 'Wood Fired + Sauce Prep',
      noGas: false,
    },
  );
});

test('unknown Italian dish keeps generic Italian starter estimate', () => {
  assert.deepEqual(
    suggestItalianGas('House Special Italian'),
    {
      kgPer100: 0.80,
      group: 'Italian Default',
      noGas: false,
    },
  );
});
