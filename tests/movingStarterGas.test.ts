import assert from 'node:assert/strict';
import test from 'node:test';

import {
  suggestMovingStarterGas,
} from '../lib/movingStarterGas';

test('Moving Starter gas estimates distinguish tandoor, fry, tawa and oven methods', () => {
  assert.deepEqual(
    [
      suggestMovingStarterGas('Paneer Malai Tikka').kgPer100,
      suggestMovingStarterGas('Crispy Corn').kgPer100,
      suggestMovingStarterGas('Veg Galouti Kebab').kgPer100,
      suggestMovingStarterGas('Paneer Chilli Bites').kgPer100,
      suggestMovingStarterGas('Mini Pizza Bite').kgPer100,
      suggestMovingStarterGas('Veg Satay Stick').kgPer100,
    ],
    [
      1.25,
      1.10,
      0.95,
      1.20,
      0.90,
      0.90,
    ],
  );
});

test('Moving Starter exact dishes preserve heavier paneer and stuffed items', () => {
  assert.equal(
    suggestMovingStarterGas('Stuffed Paneer Tikka').kgPer100,
    1.30,
  );

  assert.equal(
    suggestMovingStarterGas('Paneer Cheese Croquette').kgPer100,
    1.20,
  );

  assert.equal(
    suggestMovingStarterGas('Tandoori Pineapple').kgPer100,
    0.90,
  );
});

test('unknown Moving Starter uses a starter-level estimate instead of safe 0.5 fallback', () => {
  assert.deepEqual(
    suggestMovingStarterGas('House Special Moving Starter'),
    {
      kgPer100: 1.00,
      group: 'Moving Starter Default',
      noGas: false,
    },
  );
});
