import assert from 'node:assert/strict';
import test from 'node:test';

import {
  suggestThaiGas,
} from '../lib/thaiGas';

test('Thai Noodles uses wok noodle starter gas', () => {
  assert.deepEqual(
    suggestThaiGas('Thai Noodles'),
    {
      kgPer100: 1.00,
      group: 'Boil + Wok Toss',
      noGas: false,
    },
  );
});

test('Thai starter heuristics cover common cooking families', () => {
  assert.equal(
    suggestThaiGas('Veg Pad Thai').kgPer100,
    1.00,
  );

  assert.equal(
    suggestThaiGas('Thai Green Curry').kgPer100,
    1.05,
  );

  assert.equal(
    suggestThaiGas('Thai Fried Rice').kgPer100,
    0.90,
  );

  assert.equal(
    suggestThaiGas('Thai Salad').kgPer100,
    0.25,
  );
});
