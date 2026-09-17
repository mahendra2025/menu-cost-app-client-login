import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildFunctionGroceryPlan,
  type GroceryIngredientRate,
  type GroceryRecipe,
} from '../lib/functionGrocery';
import type {
  MenuItem,
  WorkState,
} from '../lib/types';

function menuItem(
  id: string,
  name: string,
  mealLabel: string,
  pax: number,
  portionPercent = 100,
): MenuItem {
  return {
    id,
    name,
    category: 'Main Course',
    costPerPlate: 50,
    serviceId:
      `service-${mealLabel.toLowerCase()}`,
    mealLabel,
    servicePax: pax,
    portionPercent,
  };
}

function makeWork(
  menu: MenuItem[],
): WorkState {
  return {
    costingId: 'costing-1',
    event: {
      clientName: 'Test Client',
      eventName: 'Wedding',
      eventDate: '2026-09-17',
      functionType: 'Event',
      city: 'Silvassa',
      venue: '',
      pax: 0,
      uploadFileName: '',
      rawMenuText: '',
    },
    menu,
    manpower: [],
    extras: {
      staff: 0,
      transport: 0,
      gasFuel: 0,
      disposable: 0,
      other: 0,
    },
    disposableItems: [],
    sellingPricePerPlate: 0,
    profile: {
      businessName: 'Kalash Caterers',
      ownerName: '',
      phone: '',
      city: 'Silvassa',
      logoText: 'KC',
    },
    updatedAt:
      new Date(0).toISOString(),
  };
}

const recipes: GroceryRecipe[] = [
  {
    name: 'Paneer Butter Masala',
    baseGuests: 100,
    ingredients: [
      {
        name: 'Paneer',
        quantity: 8,
        unit: 'kg',
      },
      {
        name: 'Onion',
        quantity: 2,
        unit: 'kg',
      },
    ],
  },
  {
    name: 'Gulab Jamun',
    baseGuests: 100,
    ingredients: [
      {
        name: 'Sugar',
        quantity: 5000,
        unit: 'gram',
      },
    ],
  },
];

const rates: GroceryIngredientRate[] = [
  {
    name: 'Paneer',
    rate: 400,
    unit: 'kg',
  },
  {
    name: 'Onion',
    rate: 40,
    unit: 'kg',
  },
  {
    name: 'Sugar',
    rate: 45,
    unit: 'kg',
  },
];

test(
  'keeps functions separate and scales recipes by each function guest count',
  () => {
    const work = makeWork([
      menuItem(
        'lunch-paneer',
        'Paneer Butter Masala',
        'Lunch',
        100,
      ),
      menuItem(
        'dinner-paneer',
        'Paneer Butter Masala',
        'Dinner',
        200,
      ),
    ]);

    const plan =
      buildFunctionGroceryPlan(
        work,
        recipes,
        rates,
      );

    assert.equal(
      plan.functions.length,
      2,
    );

    const lunch =
      plan.functions.find(
        (section) =>
          section.mealLabel ===
          'Lunch',
      );
    const dinner =
      plan.functions.find(
        (section) =>
          section.mealLabel ===
          'Dinner',
      );

    assert.ok(lunch);
    assert.ok(dinner);

    assert.equal(
      lunch.items.find(
        (item) =>
          item.name === 'Paneer',
      )?.quantity,
      8,
    );

    assert.equal(
      dinner.items.find(
        (item) =>
          item.name === 'Paneer',
      )?.quantity,
      16,
    );

    assert.equal(
      plan.combinedItems.find(
        (item) =>
          item.name === 'Paneer',
      )?.quantity,
      24,
    );

    assert.equal(
      plan.combinedIngredientCost,
      9840,
    );
  },
);

test(
  'converts gram recipes to kg and applies portion percentage',
  () => {
    const work = makeWork([
      menuItem(
        'sweet',
        'Gulab Jamun',
        'Dinner',
        150,
        50,
      ),
    ]);

    const plan =
      buildFunctionGroceryPlan(
        work,
        recipes,
        rates,
      );

    const sugar =
      plan.combinedItems.find(
        (item) =>
          item.name === 'Sugar',
      );

    assert.ok(sugar);
    assert.equal(
      sugar.quantity,
      3.75,
    );
    assert.equal(
      sugar.unit,
      'kg',
    );
    assert.equal(
      sugar.estimatedCost,
      168.75,
    );
  },
);

test(
  'reports dishes without saved recipes instead of inventing grocery quantities',
  () => {
    const work = makeWork([
      menuItem(
        'unknown',
        'New Royal Dish',
        'Lunch',
        120,
      ),
    ]);

    const plan =
      buildFunctionGroceryPlan(
        work,
        recipes,
        rates,
      );

    assert.deepEqual(
      plan.unmatchedDishes,
      ['New Royal Dish'],
    );
    assert.equal(
      plan.combinedItems.length,
      0,
    );
  },
);
