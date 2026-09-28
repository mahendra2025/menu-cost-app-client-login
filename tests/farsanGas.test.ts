import assert from 'node:assert/strict';
import test from 'node:test';

import {
  suggestFarsanGas,
} from '../lib/farsanGas';

test('Farsan gas starters distinguish steaming, frying and roasting', () => {
  assert.deepEqual(
    [
      suggestFarsanGas('Khaman').kgPer100,
      suggestFarsanGas('Khandvi').kgPer100,
      suggestFarsanGas('Methi Gota').kgPer100,
      suggestFarsanGas('Samosa').kgPer100,
      suggestFarsanGas('Khakhra').kgPer100,
      suggestFarsanGas('Poha Chivda').kgPer100,
    ],
    [
      0.75,
      0.85,
      1.10,
      1.25,
      0.65,
      0.55,
    ],
  );
});

test('Farsan alternate names keep expected starter values', () => {
  assert.equal(
    suggestFarsanGas('Bread Pakora').kgPer100,
    1.15,
  );

  assert.equal(
    suggestFarsanGas('Khandvi Farsan').kgPer100,
    0.85,
  );

  assert.equal(
    suggestFarsanGas('Lilva Kachori Farsan').kgPer100,
    1.20,
  );
});

test('unknown Farsan keeps generic Farsan starter estimate', () => {
  assert.deepEqual(
    suggestFarsanGas('House Special Farsan'),
    {
      kgPer100: 1.00,
      group: 'Farsan Default',
      noGas: false,
    },
  );
});
