import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assignedDishNames,
  buildDishManpowerAssignments,
} from '../lib/dishManpower';
import type { ManpowerRow, MenuItem } from '../lib/types';

const menu: MenuItem[] = [
  {
    id: 'dish_paneer',
    name: 'Paneer Tikka Masala',
    category: 'Paneer',
    costPerPlate: 0,
    dayLabel: 'Day 1',
    mealLabel: 'Dinner',
  },
  {
    id: 'dish_roti',
    name: 'Tandoori Roti',
    category: 'Indian Bread',
    costPerPlate: 0,
    dayLabel: 'Day 1',
    mealLabel: 'Dinner',
  },
];

const manpower: ManpowerRow[] = [
  {
    id: 'cook',
    role: 'Main Course Cook',
    quantity: 2,
    rate: 2500,
    assignedDishIds: ['dish_paneer'],
  },
  {
    id: 'helper',
    role: 'Bread Helper',
    quantity: 1,
    rate: 900,
    assignedDishIds: ['dish_roti'],
  },
  {
    id: 'inactive',
    role: 'Assistant Cook',
    quantity: 0,
    rate: 1400,
    assignedDishIds: ['dish_paneer'],
  },
];

test('builds dish-wise assignments from active manpower rows', () => {
  const assignments = buildDishManpowerAssignments(menu, manpower);

  assert.deepEqual(assignments[0].roles, [
    { rowId: 'cook', role: 'Main Course Cook', quantity: 2 },
  ]);
  assert.deepEqual(assignments[1].roles, [
    { rowId: 'helper', role: 'Bread Helper', quantity: 1 },
  ]);
  assert.equal(assignments[0].functionLabel, 'Day 1 - Dinner');
});

test('returns assigned dish names in menu order', () => {
  assert.deepEqual(assignedDishNames(manpower[0], menu), [
    'Paneer Tikka Masala',
  ]);
});
