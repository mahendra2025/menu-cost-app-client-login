import assert from 'node:assert/strict';

import {
  buildAdminReviewedAliasRules,
  mergeLearnedDishAliasRules,
} from '../lib/dishAliasLearning';

const globalRules = buildAdminReviewedAliasRules([
  {
    name: 'Panner Tikka',
    canonicalName: 'Paneer Tikka',
    suggestedCategory: 'Starter',
    occurrences: 4,
    status: 'MATCHED',
  },
  {
    name: 'Paneer Tikka',
    canonicalName: 'Paneer Tikka',
    categoryHint: 'Starter',
    occurrences: 2,
    status: 'APPROVED',
  },
  {
    name: 'Venue',
    canonicalName: '',
    categoryHint: 'Other',
    occurrences: 3,
    status: 'IGNORED',
  },
]);

assert.equal(globalRules.length, 1);
assert.equal(globalRules[0]?.aliasName, 'Panner Tikka');
assert.equal(globalRules[0]?.canonicalName, 'Paneer Tikka');
assert.equal(globalRules[0]?.scope, 'GLOBAL');
assert.equal(globalRules[0]?.usageCount, 4);

const merged = mergeLearnedDishAliasRules(
  [
    {
      aliasName: 'Panner Tikka',
      canonicalName: '',
      category: 'Starter',
      action: 'REJECT',
      usageCount: 2,
      scope: 'TENANT',
    },
  ],
  globalRules,
);

assert.equal(merged.length, 1);
assert.equal(merged[0]?.scope, 'TENANT');
assert.equal(merged[0]?.action, 'REJECT');

console.log('dishAliasLearning tests passed');
