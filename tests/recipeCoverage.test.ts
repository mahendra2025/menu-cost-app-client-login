import assert from 'node:assert/strict';

import {
  buildRecipeCoverage,
} from '../lib/recipeCoverage';

const result = buildRecipeCoverage({
  dishes: [
    {
      name: 'Paneer Tikka',
      category: 'Starter',
      rate: 52,
      aliases: ['Panner Tikka'],
    },
    {
      name: 'Dal Fry',
      category: 'Dal / Kadhi',
      rate: 26,
    },
    {
      name: 'Jeera Rice',
      category: 'Rice',
      rate: 24,
    },
    {
      name: 'Gulab Jamun',
      category: 'Sweet',
      rate: 18,
    },
  ],
  recipes: [
    {
      dishName: 'Paneer Tikka',
      baseGuests: 100,
      ingredients: [
        {
          name: 'Paneer',
          quantity: 8,
          unit: 'kg',
          rateKey: 'paneer::kg',
        },
      ],
    },
    {
      dishName: 'Dal Fry',
      baseGuests: 100,
      ingredients: [
        {
          name: 'Dal',
          quantity: 5,
          unit: 'kg',
          rateKey: 'dal::kg',
        },
      ],
    },
    {
      dishName: 'Jeera Rice',
      baseGuests: 100,
      ingredients: [],
    },
  ],
  rates: [
    {
      id: 'paneer::kg',
      name: 'Paneer',
      unit: 'kg',
      rate: 360,
    },
    {
      id: 'dal::kg',
      name: 'Dal',
      unit: 'kg',
      rate: 0,
    },
  ],
  completedSnapshots: [
    {
      menu: [
        { name: 'Panner Tikka' },
        { name: 'Paneer Tikka' },
        { name: 'Gulab Jamun' },
      ],
    },
  ],
});

const paneer = result.items.find(
  (item) => item.name === 'Paneer Tikka',
);
const dal = result.items.find(
  (item) => item.name === 'Dal Fry',
);
const rice = result.items.find(
  (item) => item.name === 'Jeera Rice',
);
const sweet = result.items.find(
  (item) => item.name === 'Gulab Jamun',
);

assert.equal(paneer?.status, 'READY');
assert.equal(paneer?.usageCount, 2);

assert.equal(dal?.status, 'MISSING_RATE');
assert.equal(dal?.missingRateCount, 1);

assert.equal(rice?.status, 'INCOMPLETE');
assert.equal(sweet?.status, 'MISSING_RECIPE');
assert.equal(sweet?.fallbackOnly, true);

assert.deepEqual(result.summary, {
  total: 4,
  ready: 1,
  missingRecipe: 1,
  missingRate: 1,
  incomplete: 1,
  fallbackOnly: 3,
  coveragePercent: 25,
});

console.log('recipeCoverage tests passed');
