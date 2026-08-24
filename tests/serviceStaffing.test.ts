import test from 'node:test';
import assert from 'node:assert/strict';
import { specialistCookQuantity } from '../lib/serviceStaffing';

test('specialist cooks are recommended at one per 100 guests', () => {
  assert.equal(specialistCookQuantity(0), 0);
  assert.equal(specialistCookQuantity(1), 1);
  assert.equal(specialistCookQuantity(100), 1);
  assert.equal(specialistCookQuantity(101), 2);
  assert.equal(specialistCookQuantity(250), 3);
});
