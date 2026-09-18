import assert from 'node:assert/strict';

import {
  dishNameSimilarity,
  rankDishMatches,
  unknownDishPriorityScore,
} from '../lib/unknownDishQueue';

assert.ok(dishNameSimilarity('Panner Tikka', 'Paneer Tikka') > 70);
assert.equal(dishNameSimilarity('Dal Fry', 'Dal Fry'), 100);

const ranked = rankDishMatches(
  'Panner Butter Mashala',
  [
    { name: 'Paneer Butter Masala', category: 'Paneer' },
    { name: 'Paneer Tikka', category: 'Starter' },
    { name: 'Dal Fry', category: 'Dal / Kadhi' },
  ],
);

assert.equal(ranked[0]?.name, 'Paneer Butter Masala');
assert.ok((ranked[0]?.score ?? 0) > (ranked[1]?.score ?? 0));

assert.ok(
  unknownDishPriorityScore({
    occurrences: 8,
    riskLevel: 'HIGH',
    duplicateScore: 90,
  }) >
    unknownDishPriorityScore({
      occurrences: 1,
      riskLevel: 'LOW',
      duplicateScore: 20,
    }),
);

console.log('unknownDishQueue tests passed');
