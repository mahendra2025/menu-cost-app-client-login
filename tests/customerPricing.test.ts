import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCustomerEstimate, roundCustomerRate } from '../lib/customerPricing';

const dishes = [
  { id: 'paneer', name: 'Paneer Butter Masala', category: 'Paneer', internalFoodCost: 40 },
  { id: 'dal', name: 'Dal Tadka', category: 'Dal / Kadhi', internalFoodCost: 16 },
];

test('customer estimate returns only public menu prices and an exact guest total', () => {
  const estimate = calculateCustomerEstimate({ pax: 300, selectedDishes: dishes, serviceStyle: 'BUFFET' });
  assert.equal(estimate.estimatedEventTotal, estimate.finalPricePerPlate * 300);
  assert.equal(estimate.menuItems.length, 2);
  assert.equal(estimate.menuPricePerPlate, estimate.menuItems.reduce((sum, item) => sum + item.customerPricePerPlate, 0));
  assert.equal(estimate.manpowerTotal, estimate.servicePricePerPlate * 300);
  assert.equal('internalFoodCost' in estimate.menuItems[0], false);
  assert.equal('manpowerItems' in estimate, false);
  assert.equal('profit' in estimate, false);
  assert.equal('margin' in estimate, false);
});

test('customer rates round to clean public values', () => {
  assert.equal(roundCustomerRate(18), 18);
  assert.equal(roundCustomerRate(31.82), 35);
  assert.equal(roundCustomerRate(101), 110);
});

test('table service produces a higher service estimate than buffet', () => {
  const buffet = calculateCustomerEstimate({ pax: 300, selectedDishes: dishes, serviceStyle: 'BUFFET' });
  const table = calculateCustomerEstimate({ pax: 300, selectedDishes: dishes, serviceStyle: 'TABLE_SERVICE' });
  assert.ok(table.servicePricePerPlate > buffet.servicePricePerPlate);
  assert.ok(table.finalPricePerPlate > buffet.finalPricePerPlate);
});

test('dishes in the same specialist category share one kitchen team', () => {
  const onePaneerDish = calculateCustomerEstimate({
    pax: 150,
    selectedDishes: dishes,
    serviceStyle: 'BUFFET',
  });
  const twoPaneerDishes = calculateCustomerEstimate({
    pax: 150,
    selectedDishes: [
      ...dishes,
      { id: 'paneer-two', name: 'Kadai Paneer', category: 'Paneer', internalFoodCost: 42 },
    ],
    serviceStyle: 'BUFFET',
  });
  assert.equal(twoPaneerDishes.servicePricePerPlate, onePaneerDish.servicePricePerPlate);
});
