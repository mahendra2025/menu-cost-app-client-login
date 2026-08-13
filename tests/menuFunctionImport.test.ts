import test from 'node:test';

import assert from 'node:assert/strict';

import {
  mergeFunctionMenu,
} from '../lib/menuFunctionImport';

import type { MenuItem } from '../lib/types';

function dish(
  id: string,
  name: string,
  mealLabel: string,
): MenuItem {
  return {
    id,
    name,
    category: 'Main Course',
    costPerPlate: 50,
    serviceId: 'service_1',
    mealLabel,
  };
}

test(
  'adds a separately imported function without replacing existing dishes',
  () => {
    const result =
      mergeFunctionMenu({
        existingMenu: [
          dish('lunch-paneer', 'Paneer Tikka', 'Lunch'),
        ],
        detectedMenu: [
          dish('dinner-paneer', 'Paneer Tikka', 'Event Menu'),
          dish('dinner-dal', 'Dal Fry', 'Event Menu'),
        ],
        functionName: 'Reception Dinner',
        functionPax: 450,
        defaultPax: 300,
      });

    assert.equal(result.menu.length, 3);
    assert.equal(result.newItems.length, 2);
    assert.equal(result.newItems[0].mealLabel, 'Reception Dinner');
    assert.equal(result.newItems[0].servicePax, 450);
  },
);

test(
  'skips a duplicate dish when the same function is imported again',
  () => {
    const first =
      mergeFunctionMenu({
        existingMenu: [],
        detectedMenu: [
          dish('first-paneer', 'Paneer Tikka', 'Event Menu'),
        ],
        functionName: 'Lunch',
        functionPax: 250,
        defaultPax: 0,
      });

    const second =
      mergeFunctionMenu({
        existingMenu: first.menu,
        detectedMenu: [
          dish('second-paneer', 'Paneer Tikka', 'Event Menu'),
        ],
        functionName: 'Lunch',
        functionPax: 250,
        defaultPax: 0,
      });

    assert.equal(second.menu.length, 1);
    assert.equal(second.newItems.length, 0);
  },
);
