import assert from 'node:assert/strict';

import {
  calculateDisposableCost,
  disposableCostPerCover,
} from '../lib/disposableCost';

const summary = calculateDisposableCost([
  {
    id: 'plates',
    name: 'Disposable Plate',
    quantity: 330,
    unitCost: 6,
  },
  {
    id: 'bowls',
    name: 'Bowl',
    quantity: 330,
    unitCost: 2,
  },
  {
    id: 'unused',
    name: 'Unused',
    quantity: 0,
    unitCost: 10,
  },
]);

assert.equal(summary.items[0].lineTotal, 1980);
assert.equal(summary.items[1].lineTotal, 660);
assert.equal(summary.total, 2640);
assert.equal(summary.activeItemCount, 2);
assert.equal(disposableCostPerCover(summary.total, 300), 8.8);
assert.equal(disposableCostPerCover(3880, 300), 3880 / 300);
assert.equal(disposableCostPerCover(1000, 0), 0);

const safe = calculateDisposableCost([
  {
    id: 'bad',
    name: 'Bad input',
    quantity: -5,
    unitCost: Number.NaN,
  },
]);

assert.equal(safe.total, 0);
assert.equal(calculateDisposableCost([]).total, 0);

console.log('disposableCost tests passed');
