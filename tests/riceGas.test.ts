import assert from 'node:assert/strict';
import test from 'node:test';

import {
  suggestRiceGas,
} from '../lib/riceGas';

test('Rice gas starters distinguish plain, pulao, biryani and tempering rice', () => {
  assert.deepEqual(
    [
      suggestRiceGas('Steamed Rice').kgPer100,
      suggestRiceGas('Jeera Rice').kgPer100,
      suggestRiceGas('Veg Pulao').kgPer100,
      suggestRiceGas('Kashmiri Pulao').kgPer100,
      suggestRiceGas('Veg Biryani').kgPer100,
      suggestRiceGas('Veg Dum Biryani').kgPer100,
      suggestRiceGas('Curd Rice').kgPer100,
    ],
    [
      0.65,
      0.75,
      0.85,
      0.90,
      1.00,
      1.10,
      0.65,
    ],
  );
});

test('Rice imported typo for Jeera Rice stays covered', () => {
  assert.equal(
    suggestRiceGas('eera Rice').kgPer100,
    0.75,
  );
});

test('unknown Rice keeps generic Rice starter estimate', () => {
  assert.deepEqual(
    suggestRiceGas('House Special Rice'),
    {
      kgPer100: 0.70,
      group: 'Rice Default',
      noGas: false,
    },
  );
});
