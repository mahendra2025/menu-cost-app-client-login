import assert from 'node:assert/strict';
import test from 'node:test';

import {
  suggestDalKadhiGas,
} from '../lib/dalKadhiGas';

test('Dal and Kadhi gas starters distinguish simmer and fry workload', () => {
  assert.deepEqual(
    [
      suggestDalKadhiGas('Dal Tadka').kgPer100,
      suggestDalKadhiGas('Dal Fry').kgPer100,
      suggestDalKadhiGas('Dal Makhani').kgPer100,
      suggestDalKadhiGas('Gujarati Kadhi').kgPer100,
      suggestDalKadhiGas('Punjabi Kadhi Pakora').kgPer100,
      suggestDalKadhiGas('Moong Dal').kgPer100,
    ],
    [
      1.00,
      0.95,
      1.40,
      0.80,
      1.35,
      0.85,
    ],
  );
});

test('unknown Dal/Kadhi keeps generic category-level starter estimate', () => {
  assert.deepEqual(
    suggestDalKadhiGas('House Special Dal'),
    {
      kgPer100: 1.00,
      group: 'Dal / Kadhi Default',
      noGas: false,
    },
  );
});
