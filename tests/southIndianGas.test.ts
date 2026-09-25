import assert from 'node:assert/strict';
import test from 'node:test';

import {
  suggestSouthIndianGas,
} from '../lib/southIndianGas';

test('South Indian gas starters distinguish tawa, steam, fry, simmer and rice methods', () => {
  assert.deepEqual(
    [
      suggestSouthIndianGas('Plain Dosa').kgPer100,
      suggestSouthIndianGas('Paneer Masala Dosa').kgPer100,
      suggestSouthIndianGas('Plain Idli').kgPer100,
      suggestSouthIndianGas('Paneer Cheese Uttapam').kgPer100,
      suggestSouthIndianGas('Onion Bajji').kgPer100,
      suggestSouthIndianGas('Peanut Chutney').kgPer100,
      suggestSouthIndianGas('Rasam').kgPer100,
      suggestSouthIndianGas('Sambhar').kgPer100,
      suggestSouthIndianGas('Ven Pongal').kgPer100,
      suggestSouthIndianGas('Vangi Bath').kgPer100,
    ],
    [
      1.15,
      1.35,
      0.70,
      1.30,
      1.15,
      0.20,
      0.75,
      1.00,
      0.95,
      0.90,
    ],
  );
});

test('South Indian special combinations get heavier or lighter starter values', () => {
  assert.equal(
    suggestSouthIndianGas('Rasam Vada').kgPer100,
    1.30,
  );

  assert.equal(
    suggestSouthIndianGas('Sambhar Vada').kgPer100,
    1.35,
  );

  assert.equal(
    suggestSouthIndianGas('South Indian Platter').kgPer100,
    1.50,
  );

  assert.equal(
    suggestSouthIndianGas('Tomato Chutney').kgPer100,
    0.35,
  );
});

test('unknown South Indian dish uses starter default instead of category fallback', () => {
  assert.deepEqual(
    suggestSouthIndianGas('House Special South Indian'),
    {
      kgPer100: 1.00,
      group: 'South Indian Default',
      noGas: false,
    },
  );
});
