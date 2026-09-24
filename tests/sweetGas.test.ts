import assert from 'node:assert/strict';
import test from 'node:test';

import {
  suggestSweetGas,
} from '../lib/sweetGas';

test('Sweet gas starter estimates distinguish high-gas and no-gas sweets', () => {
  assert.deepEqual(
    suggestSweetGas('Angoori Rabdi'),
    {
      kgPer100: 2.6,
      group: 'Milk Reduction',
      noGas: false,
    },
  );

  assert.deepEqual(
    suggestSweetGas('Shrikhand'),
    {
      kgPer100: 0,
      group: 'Cold / No Gas',
      noGas: true,
    },
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
