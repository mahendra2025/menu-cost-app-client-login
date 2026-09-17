import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateGasCost,
  calculateOperationsTotals,
  calculateTransportCost,
  type OperationsCostState,
} from '../lib/operationsCost';

test('gas by kg uses cylinder price divided by cylinder size', () => {
  const cost = calculateGasCost({
    mode: 'KG',
    cylinderSizeKg: 19,
    cylinderPrice: 1900,
    usedKg: 8,
    cylindersUsed: 0,
    manualCost: 0,
  });

  assert.equal(cost, 800);
});

test('gas by cylinder fraction uses cylinder price times cylinders used', () => {
  const cost = calculateGasCost({
    mode: 'CYLINDER',
    cylinderSizeKg: 19,
    cylinderPrice: 1900,
    usedKg: 0,
    cylindersUsed: 0.42,
    manualCost: 0,
  });

  assert.equal(cost, 798);
});

test('transport includes vehicles trips toll loading and other', () => {
  const cost = calculateTransportCost({
    vehicleLabel: 'Tempo',
    ratePerTrip: 1200,
    vehicles: 2,
    tripsPerVehicle: 1,
    tollParking: 300,
    loadingUnloading: 400,
    other: 0,
  });

  assert.equal(cost, 3100);
});

test('shared transport is counted once while gas stays function-wise', () => {
  const state: OperationsCostState = {
    transportMode: 'EVENT_SHARED',
    sharedTransport: {
      vehicleLabel: 'Tempo',
      ratePerTrip: 1200,
      vehicles: 2,
      tripsPerVehicle: 1,
      tollParking: 300,
      loadingUnloading: 400,
      other: 0,
    },
    functions: [
      {
        id: 'breakfast',
        dayLabel: '',
        mealLabel: 'Breakfast',
        pax: 200,
        gas: {
          mode: 'MANUAL',
          cylinderSizeKg: 19,
          cylinderPrice: 1900,
          usedKg: 0,
          cylindersUsed: 0,
          manualCost: 600,
        },
        transport: {
          vehicleLabel: 'Tempo',
          ratePerTrip: 9999,
          vehicles: 1,
          tripsPerVehicle: 1,
          tollParking: 0,
          loadingUnloading: 0,
          other: 0,
        },
      },
      {
        id: 'dinner',
        dayLabel: '',
        mealLabel: 'Dinner',
        pax: 300,
        gas: {
          mode: 'MANUAL',
          cylinderSizeKg: 19,
          cylinderPrice: 1900,
          usedKg: 0,
          cylindersUsed: 0,
          manualCost: 1700,
        },
        transport: {
          vehicleLabel: 'Tempo',
          ratePerTrip: 9999,
          vehicles: 1,
          tripsPerVehicle: 1,
          tollParking: 0,
          loadingUnloading: 0,
          other: 0,
        },
      },
    ],
  };

  assert.deepEqual(calculateOperationsTotals(state), {
    gasTotal: 2300,
    transportTotal: 3100,
    total: 5400,
  });
});
