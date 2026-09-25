import assert from 'node:assert/strict';
import test from 'node:test';

import {
  suggestSweetGas,
} from '../lib/sweetGas';

test('Sweet gas starter estimates distinguish dish-specific LPG usage', () => {
  assert.deepEqual(
    suggestSweetGas('Angoori Rabdi'),
    {
      kgPer100: 3.0,
      group: 'Milk Reduction',
      noGas: false,
    },
  );

  assert.deepEqual(
    suggestSweetGas('Gulab Jamun'),
    {
      kgPer100: 1.0,
      group: 'Fried + Syrup',
      noGas: false,
    },
  );

  assert.deepEqual(
    suggestSweetGas('Kaju Katli'),
    {
      kgPer100: 0.5,
      group: 'Katli / Barfi',
      noGas: false,
    },
  );

  assert.deepEqual(
    suggestSweetGas('Rabdi Malpua'),
    {
      kgPer100: 3.8,
      group: 'Milk Reduction + Fried',
      noGas: false,
    },
  );
});

test('cold Sweet starter estimates can explicitly use no gas', () => {
  assert.deepEqual(
    suggestSweetGas('Shrikhand'),
    {
      kgPer100: 0,
      group: 'Cold / No Gas',
      noGas: true,
    },
  );

  assert.deepEqual(
    suggestSweetGas('Dry Fruit Shrikhand'),
    {
      kgPer100: 0,
      group: 'Cold / No Gas',
      noGas: true,
    },
  );
});

test('Sweet name normalization supports imported spellings', () => {
  assert.equal(
    suggestSweetGas('rabadi_malpua').kgPer100,
    3.8,
  );

  assert.equal(
    suggestSweetGas('sitaphalrabadi').kgPer100,
    3.0,
  );
});

test('unknown Sweet keeps the generic Sweet starter estimate', () => {
  assert.deepEqual(
    suggestSweetGas('House Special Mithai'),
    {
      kgPer100: 1.5,
      group: 'Sweet Default',
      noGas: false,
    },
  );
});
