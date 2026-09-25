import assert from 'node:assert/strict';
import test from 'node:test';

import {
  suggestIndianBreadGas,
} from '../lib/indianBreadGas';

test('Indian Bread gas starters distinguish tawa, tandoor, frying and millet breads', () => {
  assert.deepEqual(
    [
      suggestIndianBreadGas('Chapati').kgPer100,
      suggestIndianBreadGas('Tandoori Roti').kgPer100,
      suggestIndianBreadGas('Plain Naan').kgPer100,
      suggestIndianBreadGas('Garlic Naan').kgPer100,
      suggestIndianBreadGas('Plain Puri').kgPer100,
      suggestIndianBreadGas('Bajra Roti').kgPer100,
      suggestIndianBreadGas('Laccha Paratha').kgPer100,
    ],
    [
      1.00,
      1.35,
      1.45,
      1.50,
      1.20,
      1.20,
      1.25,
    ],
  );
});

test('Indian Bread alternate spellings stay covered', () => {
  assert.equal(
    suggestIndianBreadGas('Lachha Paratha').kgPer100,
    1.25,
  );

  assert.equal(
    suggestIndianBreadGas('Poori').kgPer100,
    1.20,
  );
});

test('unknown Indian Bread uses bread-level starter instead of safe 0.5 fallback', () => {
  assert.deepEqual(
    suggestIndianBreadGas('House Special Bread'),
    {
      kgPer100: 1.30,
      group: 'Indian Bread Default',
      noGas: false,
    },
  );
});
