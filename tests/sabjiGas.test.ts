import assert from 'node:assert/strict';
import test from 'node:test';

import {
  suggestSabjiGas,
} from '../lib/sabjiGas';

test('Sabji gas starters distinguish dry, gravy and heavy dishes', () => {
  assert.deepEqual(
    suggestSabjiGas('Aloo Jeera'),
    {
      kgPer100: 0.65,
      group: 'Dry Sabji',
      noGas: false,
    },
  );

  assert.deepEqual(
    suggestSabjiGas('Veg Kolhapuri'),
    {
      kgPer100: 1.15,
      group: 'Gravy Sabji',
      noGas: false,
    },
  );

  assert.deepEqual(
    suggestSabjiGas('Paneer Tikka Masala'),
    {
      kgPer100: 1.30,
      group: 'Tikka + Gravy',
      noGas: false,
    },
  );

  assert.deepEqual(
    suggestSabjiGas('Banana Kofta Curry'),
    {
      kgPer100: 1.45,
      group: 'Kofta + Gravy',
      noGas: false,
    },
  );
});

test('Sabji name normalization supports imported underscore spellings', () => {
  assert.equal(
    suggestSabjiGas('Aloo Gobi_matar').kgPer100,
    0.85,
  );
});

test('unknown Sabji keeps the generic Sabji starter estimate', () => {
  assert.deepEqual(
    suggestSabjiGas('House Special Vegetable'),
    {
      kgPer100: 1,
      group: 'Sabji Default',
      noGas: false,
    },
  );
});
