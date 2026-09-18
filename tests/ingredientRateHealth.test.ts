import assert from 'node:assert/strict';

import {
  buildIngredientRateHealth,
} from '../lib/ingredientRateHealth';

const result = buildIngredientRateHealth({
  now: new Date('2026-09-18T00:00:00.000Z'),
  staleAfterDays: 60,
  recentWithinDays: 30,
  rates: [
    {
      id: 'paneer__kg',
      name: 'Paneer',
      category: 'Dairy',
      unit: 'kg',
      rate: 360,
      updatedAt: '2026-09-10T00:00:00.000Z',
    },
    {
      id: 'tomato__kg',
      name: 'Tomato',
      category: 'Vegetables & Herbs',
      unit: 'kg',
      rate: 32,
      updatedAt: '2026-07-01T00:00:00.000Z',
    },
    {
      id: 'cashew__kg',
      name: 'Cashew',
      category: 'Other',
      unit: 'kg',
      rate: 0,
    },
    {
      id: 'ghee__kg',
      name: 'Ghee',
      category: 'Dairy',
      unit: 'kg',
      rate: 610,
      updatedAt: '2026-08-10T00:00:00.000Z',
    },
    {
      id: 'salt__kg',
      name: 'Salt',
      category: 'Spices & Seasonings',
      unit: 'kg',
      rate: 20,
    },
  ],
  recipes: [
    {
      dishName: 'Paneer Tikka',
      ingredients: [
        { rateKey: 'paneer__kg' },
        { rateKey: 'tomato__kg' },
      ],
    },
    {
      dishName: 'Paneer Lababdar',
      ingredients: [
        { rateKey: 'paneer__kg' },
        { rateKey: 'cashew__kg' },
      ],
    },
  ],
});

const paneer = result.items.find(
  (item) => item.id === 'paneer__kg',
);
const tomato = result.items.find(
  (item) => item.id === 'tomato__kg',
);
const cashew = result.items.find(
  (item) => item.id === 'cashew__kg',
);
const ghee = result.items.find(
  (item) => item.id === 'ghee__kg',
);
const salt = result.items.find(
  (item) => item.id === 'salt__kg',
);

assert.equal(paneer?.status, 'RECENT');
assert.equal(paneer?.recipeCount, 2);
assert.equal(tomato?.status, 'STALE');
assert.equal(cashew?.status, 'MISSING_RATE');
assert.equal(ghee?.status, 'HEALTHY');
assert.equal(salt?.status, 'STALE');
assert.equal(salt?.freshnessKnown, false);

assert.deepEqual(result.summary, {
  total: 5,
  ready: 4,
  missingRate: 1,
  stale: 2,
  recent: 1,
  healthy: 1,
  linked: 3,
  rateCoveragePercent: 80,
  freshCoveragePercent: 40,
});

assert.ok(
  (cashew?.priorityScore || 0) >
    (tomato?.priorityScore || 0),
);

console.log('ingredientRateHealth tests passed');
