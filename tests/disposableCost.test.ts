import assert from 'node:assert/strict';

import {
  buildDisposableAutoAssignment,
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


const autoBaseItems = [
  'Tissue',
  'Fuel',
  'Napkin',
  'Cap',
  'Cafe Cap',
  'Gloves',
  'Packing Roll',
  'Table Roll',
  'Disposable Cup',
  'Plates',
  'Spoon',
  'Silver Roll',
  'Toothpick',
  'Food Box',
  'Sweet Box',
  'Garbage Bag',
].map((name, index) => ({
  id: `auto_${index + 1}`,
  name,
  quantity: 0,
  unitCost: index + 1,
}));

const autoDisposable = buildDisposableAutoAssignment({
  items: autoBaseItems,
  covers: 300,
  menu: [
    {
      id: 'drink',
      name: 'Fruit Punch',
      category: 'Welcome Drink',
      costPerPlate: 20,
      serviceId: 'dinner',
      servicePax: 300,
      serviceStyle: 'BUFFET',
    },
    {
      id: 'paneer',
      name: 'Paneer Tikka Masala',
      category: 'Paneer',
      costPerPlate: 45,
      serviceId: 'dinner',
      servicePax: 300,
      serviceStyle: 'BUFFET',
    },
  ],
  manpower: [
    { id: 'cook', role: 'Cook', quantity: 2, rate: 1000 },
    { id: 'waiter', role: 'Waiter', quantity: 10, rate: 700 },
  ],
  manpowerInputs: {
    venueType: 'INDOOR',
    waterService: 'BOTTLE_COUNTER',
    crockeryType: 'DISPOSABLE',
    serviceLevel: 'STANDARD',
  },
});

const autoQty = (name: string) =>
  autoDisposable.items.find((item) => item.name === name)?.quantity ?? -1;

assert.equal(autoDisposable.covers, 300);
assert.equal(autoDisposable.disposableCovers, 300);
assert.equal(autoDisposable.foodHandlingStaff, 2);
assert.equal(autoQty('Plates'), 330);
assert.equal(autoQty('Spoon'), 330);
assert.equal(autoQty('Disposable Cup'), 330);
assert.equal(autoQty('Cap'), 2);
assert.equal(autoQty('Gloves'), 4);
assert.equal(autoQty('Food Box'), 0);
assert.equal(autoQty('Garbage Bag'), 6);
assert.equal(autoDisposable.items.find((item) => item.name === 'Plates')?.unitCost, 10);

const autoPacked = buildDisposableAutoAssignment({
  items: autoBaseItems,
  covers: 100,
  menu: [
    {
      id: 'packed-sweet',
      name: 'Gulab Jamun',
      category: 'Sweet',
      costPerPlate: 15,
      serviceId: 'packed',
      servicePax: 100,
      serviceStyle: 'PACKED_MEAL',
    },
  ],
  manpowerInputs: {
    venueType: 'INDOOR',
    waterService: 'BOTTLE_COUNTER',
    crockeryType: 'STANDARD',
    serviceLevel: 'STANDARD',
  },
});

const packedQty = (name: string) =>
  autoPacked.items.find((item) => item.name === name)?.quantity ?? -1;

assert.equal(autoPacked.disposableCovers, 100);
assert.equal(autoPacked.packedMealCovers, 100);
assert.equal(packedQty('Plates'), 110);
assert.equal(packedQty('Spoon'), 110);
assert.equal(packedQty('Food Box'), 105);
assert.equal(packedQty('Sweet Box'), 105);

console.log('disposable auto assignment tests passed');
