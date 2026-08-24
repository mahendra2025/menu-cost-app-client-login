import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCustomerEstimate } from '../lib/customerPricing';

const dishes = [
  { dishId: 'paneer', name: 'Paneer Butter Masala', category: 'Paneer', internalFoodCost: 40 },
  { dishId: 'dal', name: 'Dal Tadka', category: 'Dal / Kadhi', internalFoodCost: 16 },
];

test('customer estimate returns only public menu prices and an exact guest total', () => {
  const estimate = calculateCustomerEstimate({ pax: 300, selectedDishes: dishes, serviceStyle: 'BUFFET' });
  assert.equal(estimate.estimatedEventTotal, estimate.finalPricePerPlate * 300);
  assert.equal(estimate.menuItems.length, 2);
  assert.equal('internalFoodCost' in estimate.menuItems[0], false);
  assert.equal('profit' in estimate, false);
  assert.equal('margin' in estimate, false);
});

test('table service produces a higher service estimate than buffet', () => {
  const buffet = calculateCustomerEstimate({ pax: 300, selectedDishes: dishes, serviceStyle: 'BUFFET' });
  const table = calculateCustomerEstimate({ pax: 300, selectedDishes: dishes, serviceStyle: 'TABLE_SERVICE' });
  assert.ok(table.servicePricePerPlate > buffet.servicePricePerPlate);
  assert.ok(table.finalPricePerPlate > buffet.finalPricePerPlate);
});
