import assert from 'node:assert/strict';
import test from 'node:test';

import {
  suggestChaatGas,
} from '../lib/chaatGas';

test('Chaat gas starters distinguish cold, fried and ragda/tawa dishes', () => {
  assert.deepEqual(
    suggestChaatGas('Pani Puri'),
    {
      kgPer100: 0.25,
      group: 'Cold Assembly + Boiled Filling',
      noGas: false,
    },
  );

  assert.deepEqual(
    suggestChaatGas('Bhel Puri'),
    {
      kgPer100: 0.15,
      group: 'Cold Assembly',
      noGas: false,
    },
  );

  assert.deepEqual(
    suggestChaatGas('Aloo Tikki Chaat'),
    {
      kgPer100: 0.75,
      group: 'Tawa / Fry Chaat',
      noGas: false,
    },
  );

  assert.deepEqual(
    suggestChaatGas('Ragda Pattice'),
    {
      kgPer100: 0.90,
      group: 'Boiled Ragda + Tawa',
      noGas: false,
    },
  );
});

test('Chaat starter supports alternate spellings', () => {
  assert.equal(
    suggestChaatGas('Ragda Patties').kgPer100,
    0.90,
  );

  assert.equal(
    suggestChaatGas('Lacha Tikka').kgPer100,
    0.70,
  );
});

test('unknown Chaat keeps the generic Chaat starter estimate', () => {
  assert.deepEqual(
    suggestChaatGas('House Special Chaat'),
    {
      kgPer100: 0.50,
      group: 'Chaat Default',
      noGas: false,
    },
  );
});
