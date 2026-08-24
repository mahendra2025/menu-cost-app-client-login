import test from 'node:test';
import assert from 'node:assert/strict';
import { serviceStaffRecommendation, specialistCookQuantity, specialistStaffRecommendations } from '../lib/serviceStaffing';

test('specialist cooks are recommended at one per 100 guests', () => {
  assert.equal(specialistCookQuantity(0), 0);
  assert.equal(specialistCookQuantity(1), 1);
  assert.equal(specialistCookQuantity(100), 1);
  assert.equal(specialistCookQuantity(101), 2);
  assert.equal(specialistCookQuantity(250), 3);
});

function recommendedWaiters(style: 'BUFFET' | 'TABLE_SERVICE', pax: number) {
  return serviceStaffRecommendation(style, pax).find((item) => item.role === 'Waiter')?.quantity;
}

test('buffet recommends one waiter per 25 guests, rounded up', () => {
  assert.equal(recommendedWaiters('BUFFET', 25), 1);
  assert.equal(recommendedWaiters('BUFFET', 26), 2);
  assert.equal(recommendedWaiters('BUFFET', 100), 4);
});

test('table service recommends one waiter per 10 guests, rounded up', () => {
  assert.equal(recommendedWaiters('TABLE_SERVICE', 10), 1);
  assert.equal(recommendedWaiters('TABLE_SERVICE', 11), 2);
  assert.equal(recommendedWaiters('TABLE_SERVICE', 100), 10);
});

test('every function recommends four Masi and two Helpers per 100 guests', () => {
  for (const style of ['BUFFET', 'TABLE_SERVICE', 'LIVE_COUNTER', 'PACKED_MEAL'] as const) {
    const recommendation = serviceStaffRecommendation(style, 100);
    assert.equal(recommendation.find((item) => item.role === 'Masi')?.quantity, 4);
    assert.equal(recommendation.find((item) => item.role === 'Helper')?.quantity, 2);
  }
});

test('Masi and Helper recommendations round up proportionally', () => {
  const recommendation = serviceStaffRecommendation('BUFFET', 150);
  assert.equal(recommendation.find((item) => item.role === 'Masi')?.quantity, 6);
  assert.equal(recommendation.find((item) => item.role === 'Helper')?.quantity, 3);
});

test('dish categories create one scaled specialist team per station', () => {
  const recommendation = specialistStaffRecommendations([
    { name: 'Paneer Butter Masala', category: 'Paneer' },
    { name: 'Kadai Paneer', category: 'Paneer' },
    { name: 'Dal Tadka', category: 'Dal / Kadhi' },
  ], 250);
  assert.deepEqual(recommendation.map((item) => [item.role, item.quantity]), [
    ['Sabji Cook', 3],
    ['Dal / Kadhi Cook', 3],
  ]);
});
