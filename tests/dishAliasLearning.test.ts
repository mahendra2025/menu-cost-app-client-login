import assert from 'node:assert/strict';

import {
  buildAdminReviewedAliasRules,
  mergeLearnedDishAliasRules,
} from '../lib/dishAliasLearning';
import {
  preprocessMenuTextWithTenantLearning,
} from '../lib/menuDetectionCore';

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

const preprocessed = preprocessMenuTextWithTenantLearning(
  'Starter\nPanner Tikka\nSweet\nGulab Jamun',
  globalRules,
);

assert.equal(preprocessed.replacements, 1);
assert.ok(preprocessed.menuText.includes('Paneer Tikka'));
assert.ok(!preprocessed.menuText.includes('Panner Tikka'));

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
