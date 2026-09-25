import assert from 'node:assert/strict';
import test from 'node:test';

import {
  suggestChineseGas,
} from '../lib/chineseGas';

test('Chinese gas starters distinguish wok, fried, gravy and combo dishes', () => {
  assert.deepEqual(
    suggestChineseGas('Veg Fried Rice'),
    {
      kgPer100: 0.85,
      group: 'Wok Rice',
      noGas: false,
    },
  );

  assert.deepEqual(
    suggestChineseGas('Hakka Noodles'),
    {
      kgPer100: 0.95,
      group: 'Wok Noodles',
      noGas: false,
    },
  );

  assert.deepEqual(
    suggestChineseGas('Veg Manchurian Gravy'),
    {
      kgPer100: 1.30,
      group: 'Fried + Gravy',
      noGas: false,
    },
  );

  assert.deepEqual(
    suggestChineseGas('Hakka Noodles with Manchurian'),
    {
      kgPer100: 1.40,
      group: 'Noodles + Manchurian Combo',
      noGas: false,
    },
  );
});

test('Chinese momos distinguish steamed and fried preparation', () => {
  assert.equal(
    suggestChineseGas('Mushroom Momos').kgPer100,
    0.70,
  );

  assert.equal(
    suggestChineseGas('Veg Fried Momos').kgPer100,
    1.05,
  );
});

test('unknown Chinese dish keeps the generic Chinese starter estimate', () => {
  assert.deepEqual(
    suggestChineseGas('House Special Chinese'),
    {
      kgPer100: 1.10,
      group: 'Chinese Default',
      noGas: false,
    },
  );
});


test('remaining Chinese dishes use specific momos, chow mein and vegetable sauce starters', () => {
  assert.deepEqual(
    [
      suggestChineseGas('Veg Schezwan Momos').kgPer100,
      suggestChineseGas('Veg Steamed Momos').kgPer100,
      suggestChineseGas('Vegetable Chow Mein').kgPer100,
      suggestChineseGas('Vegetable in Black Bean Sauce').kgPer100,
      suggestChineseGas('Vegetable in Hot Garlic Sauce').kgPer100,
      suggestChineseGas('Vegetable Salt and Pepper').kgPer100,
      suggestChineseGas('Veg Momos').kgPer100,
    ],
    [
      0.80,
      0.70,
      1.00,
      1.05,
      1.10,
      1.10,
      0.70,
    ],
  );
});
