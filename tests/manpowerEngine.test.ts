import test from 'node:test';
import assert from 'node:assert/strict';

import { generateMealManpowerRows } from '../lib/manpowerEngine';
import type { MenuItem } from '../lib/types';

function dish(id: string, name: string, category: string): MenuItem {
  return {
    id,
    name,
    category,
    costPerPlate: 0,
    serviceId: 'lunch',
    mealLabel: 'Lunch',
    servicePax: 700,
    serviceStyle: 'BUFFET',
  };
}

const sampleMenu: MenuItem[] = [
  dish('sweet_1', 'Angoor Basundi', 'Sweet'),
  dish('sweet_2', 'Malai Malpua', 'Sweet'),
  dish('farsan_1', 'Paneer Lifafa', 'Farsan'),
  dish('sabji_1', 'Paneer Tikka Masala', 'Paneer'),
  dish('sabji_2', 'Mix Chilly Milly', 'Sabji'),
  dish('bread_1', 'Puri', 'Indian Bread'),
  dish('bread_2', 'B.T. Roti', 'Indian Bread'),
  dish('bread_3', 'Phulka Roti', 'Indian Bread'),
  dish('dal_1', 'Dal Fry', 'Dal/Kadhi'),
  dish('rice_1', 'Jeera Rice', 'Rice'),
  dish('chaat_1', 'Lacha Tikki', 'Chaat'),
  dish('fruit_1', 'Fruit Station', 'Fruit'),
];

function rows(overrides = {}) {
  return generateMealManpowerRows({
    mealKey: 'service:lunch',
    menu: sampleMenu,
    guests: 700,
    serviceStyle: 'BUFFET',
    serviceId: 'lunch',
    mealLabel: 'Lunch',
    inputs: {
      venueType: 'INDOOR',
      waterService: 'BOTTLE_COUNTER',
      crockeryType: 'STANDARD',
      serviceLevel: 'STANDARD',
    },
    ...overrides,
  });
}

test('standard buffet recommends service manpower from guest ratios', () => {
  const result = rows();

  assert.equal(result.find((row) => row.role === 'Waiter')?.quantity, 24);
  assert.equal(result.find((row) => row.role === 'Captain')?.quantity, 3);
  assert.equal(result.find((row) => row.role === 'Water Staff')?.quantity, 5);
});

test('premium buffet increases waiter recommendation', () => {
  const result = rows({
    inputs: {
      venueType: 'INDOOR',
      waterService: 'BOTTLE_COUNTER',
      crockeryType: 'STANDARD',
      serviceLevel: 'PREMIUM',
    },
  });

  assert.equal(result.find((row) => row.role === 'Waiter')?.quantity, 35);
});

test('chef manpower uses one dish = one chef by category', () => {
  const result = rows();

  assert.equal(result.find((row) => row.role === 'Bread Cook')?.quantity, 3);
  assert.equal(result.find((row) => row.role === 'Bread Helper')?.quantity, 2);
  assert.equal(result.find((row) => row.role === 'Chaat Cook')?.quantity, 1);
  assert.equal(result.find((row) => row.role === 'Sweet / Halwai Cook')?.quantity, 2);
  assert.equal(result.find((row) => row.role === 'Farsan Cook')?.quantity, 1);
  assert.equal(result.find((row) => row.role === 'Main Course Cook')?.quantity, 4);
});

test('manual quantity override survives automatic recalculation', () => {
  const result = rows({
    existingRows: [
      {
        id: 'saved_waiter',
        role: 'Waiter',
        quantity: 30,
        rate: 800,
        manualOverride: true,
        calculationSource: 'MANUAL',
        serviceId: 'lunch',
        mealLabel: 'Lunch',
      },
    ],
  });

  const waiter = result.find((row) => row.role === 'Waiter');

  assert.equal(waiter?.recommendedQuantity, 24);
  assert.equal(waiter?.quantity, 30);
  assert.equal(waiter?.rate, 800);
  assert.equal(waiter?.manualOverride, true);
  assert.equal(waiter?.calculationSource, 'MANUAL');
});

test('dish assignments survive automatic recalculation and drop removed dishes', () => {
  const result = rows({
    existingRows: [
      {
        id: 'saved_bread_cook',
        role: 'Bread Cook',
        quantity: 5,
        rate: 2500,
        serviceId: 'lunch',
        mealLabel: 'Lunch',
        assignedDishIds: ['bread_1', 'bread_3', 'removed_dish'],
      },
    ],
  });

  const breadCook = result.find((row) => row.role === 'Bread Cook');

  assert.deepEqual(breadCook?.assignedDishIds, ['bread_1', 'bread_3']);
});

test('utility manpower changes with crockery and outdoor venue settings', () => {
  const result = rows({
    inputs: {
      venueType: 'OUTDOOR',
      waterService: 'TABLE_SERVICE',
      crockeryType: 'PREMIUM',
      serviceLevel: 'STANDARD',
    },
  });

  assert.equal(result.find((row) => row.role === 'Dishwasher')?.quantity, 8);
  assert.equal(result.find((row) => row.role === 'Water Staff')?.quantity, 18);
  assert.ok((result.find((row) => row.role === 'Cleaning')?.quantity ?? 0) >= 6);
});


test('admin manpower rules change service and chef dish ratio', () => {
  const result = rows({
    rules: {
      standardBuffetGuestsPerWaiter: 35,
      chefDishesPerCook: 2,
      standardGuestsPerDishwasher: 200,
    },
  });

  assert.equal(result.find((row) => row.role === 'Waiter')?.quantity, 20);
  assert.equal(result.find((row) => row.role === 'Chaat Cook')?.quantity, 1);
  assert.equal(result.find((row) => row.role === 'Bread Cook')?.quantity, 2);
  assert.equal(result.find((row) => row.role === 'Sweet / Halwai Cook')?.quantity, 1);
  assert.equal(result.find((row) => row.role === 'Main Course Cook')?.quantity, 2);
  assert.equal(result.find((row) => row.role === 'Dishwasher')?.quantity, 4);
});

test('manual override still wins after admin master changes', () => {
  const result = rows({
    rules: {
      standardBuffetGuestsPerWaiter: 35,
    },
    existingRows: [
      {
        id: 'saved_waiter',
        role: 'Waiter',
        quantity: 28,
        rate: 750,
        manualOverride: true,
        calculationSource: 'MANUAL',
        serviceId: 'lunch',
        mealLabel: 'Lunch',
      },
    ],
  });

  const waiter = result.find((row) => row.role === 'Waiter');

  assert.equal(waiter?.recommendedQuantity, 20);
  assert.equal(waiter?.quantity, 28);
  assert.equal(waiter?.manualOverride, true);
});


test('starter and soup each get one chef per dish while non-cooking categories get no chef', () => {
  const customMenu: MenuItem[] = [
    dish('starter_1', 'Paneer Tikka', 'Starter'),
    dish('starter_2', 'Hara Bhara Kabab', 'Starter'),
    dish('soup_1', 'Tomato Soup', 'Soup'),
    dish('soup_2', 'Manchow Soup', 'Soup'),
    dish('drink_1', 'Fruit Punch', 'Welcome Drink'),
    dish('salad_1', 'Green Salad', 'Salad'),
    dish('fruit_1', 'Cut Fruit', 'Fruit'),
    dish('papad_1', 'Papad', 'Papad'),
  ];

  const result = generateMealManpowerRows({
    mealKey: 'service:lunch',
    menu: customMenu,
    guests: 300,
    serviceStyle: 'BUFFET',
    serviceId: 'lunch',
    mealLabel: 'Lunch',
  });

  assert.equal(result.find((row) => row.role === 'Starter Cook')?.quantity, 2);
  assert.equal(result.find((row) => row.role === 'Soup Cook')?.quantity, 2);
  assert.equal(result.find((row) => row.role === 'Main Course Cook')?.quantity, 0);
  assert.equal(result.find((row) => row.role === 'Sweet / Halwai Cook')?.quantity, 0);
});

test('new cooked categories automatically fall back to one main-course chef per dish', () => {
  const customMenu: MenuItem[] = [
    dish('thai_1', 'Thai Green Curry', 'Thai'),
    dish('mexican_1', 'Mexican Rice Bowl', 'Mexican'),
    dish('breakfast_1', 'Poha', 'Breakfast'),
  ];

  const result = generateMealManpowerRows({
    mealKey: 'service:lunch',
    menu: customMenu,
    guests: 200,
    serviceStyle: 'BUFFET',
    serviceId: 'lunch',
    mealLabel: 'Lunch',
  });

  assert.equal(result.find((row) => row.role === 'Main Course Cook')?.quantity, 3);
});
