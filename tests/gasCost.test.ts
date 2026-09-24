import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateEventGas,
  defaultGasCostMaster,
} from '../lib/gasCost';

import type {
  MenuItem,
  WorkState,
} from '../lib/types';

function makeWork(
  menu: MenuItem[],
  eventPax = 0,
): WorkState {
  return {
    costingId: 'gas-test',
    event: {
      clientName: '',
      eventName: 'Gas Test',
      eventDate: '',
      functionType: 'Event',
      city: '',
      venue: '',
      pax: eventPax,
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
      businessName: 'Test Caterer',
      ownerName: '',
      phone: '',
      city: '',
      logoText: 'TC',
    },
    updatedAt: new Date(0).toISOString(),
  };
}

function dish(
  id: string,
  name: string,
  category: string,
  serviceId: string,
  mealLabel: string,
  servicePax: number,
): MenuItem {
  return {
    id,
    name,
    category,
    costPerPlate: 1,
    serviceId,
    mealLabel,
    servicePax,
  };
}

test('100 guest Paneer dish uses 1.2 kg and costs about INR 113.68', () => {
  const result = calculateEventGas(
    makeWork([
      dish(
        'p1',
        'Paneer Tikka',
        'Paneer',
        'lunch',
        'Lunch',
        100,
      ),
    ]),
    defaultGasCostMaster(),
  );

  assert.equal(
    result.lpgRatePerKg,
    1800 / 19,
  );
  assert.equal(
    result.totalGasKg,
    1.2,
  );
  assert.ok(
    Math.abs(
      result.totalGasCost -
        113.68421052631578,
    ) < 0.000001,
  );
});

test('250 guest Paneer dish uses 3 kg and costs about INR 284.21', () => {
  const result = calculateEventGas(
    makeWork([
      dish(
        'p1',
        'Paneer Tikka',
        'Paneer',
        'dinner',
        'Dinner',
        250,
      ),
    ]),
    defaultGasCostMaster(),
  );

  assert.equal(
    result.totalGasKg,
    3,
  );
  assert.ok(
    Math.abs(
      result.totalGasCost -
        284.2105263157895,
    ) < 0.000001,
  );
});

test('multi-function event uses each function guest count instead of total event pax', () => {
  const result = calculateEventGas(
    makeWork(
      [
        dish(
          'p1',
          'Paneer Tikka',
          'Paneer',
          'lunch',
          'Lunch',
          100,
        ),
        dish(
          'p2',
          'Paneer Tikka',
          'Paneer',
          'dinner',
          'Dinner',
          250,
        ),
      ],
      999,
    ),
    defaultGasCostMaster(),
  );

  assert.deepEqual(
    result.rows.map(
      (row) => row.guests,
    ),
    [100, 250],
  );
  assert.equal(
    result.totalGasKg,
    4.2,
  );
  assert.equal(
    result.functionTotals.length,
    2,
  );
});

test('dish manual override wins over category default', () => {
  const master =
    defaultGasCostMaster();

  master.dishOverrides = [
    {
      name: 'Paneer Tikka',
      category: 'Paneer',
      gasKgPer100: 0.5,
    },
  ];

  const result = calculateEventGas(
    makeWork([
      dish(
        'p1',
        'Paneer Tikka',
        'Paneer',
        'lunch',
        'Lunch',
        100,
      ),
    ]),
    master,
  );

  assert.equal(
    result.rows[0]
      .gasKgPer100,
    0.5,
  );
  assert.equal(
    result.rows[0].source,
    'DISH_OVERRIDE',
  );
  assert.equal(
    result.totalGasKg,
    0.5,
  );
});

test('category default is used when a dish has no manual override', () => {
  const result = calculateEventGas(
    makeWork([
      dish(
        's1',
        'Tomato Soup',
        'Soup',
        'dinner',
        'Dinner',
        100,
      ),
    ]),
    defaultGasCostMaster(),
  );

  assert.equal(
    result.rows[0]
      .gasKgPer100,
    0.7,
  );
  assert.equal(
    result.rows[0].source,
    'CATEGORY',
  );
});

test('approved no-gas category safely returns zero', () => {
  const result = calculateEventGas(
    makeWork([
      dish(
        'i1',
        'Vanilla Ice Cream',
        'Ice Cream',
        'dinner',
        'Dinner',
        100,
      ),
    ]),
    defaultGasCostMaster(),
  );

  assert.equal(
    result.totalGasKg,
    0,
  );
  assert.equal(
    result.totalGasCost,
    0,
  );
  assert.equal(
    result.rows[0].source,
    'NO_GAS_CATEGORY',
  );
});

test('missing cooking category rate uses positive safety fallback', () => {
  const master =
    defaultGasCostMaster();

  const result = calculateEventGas(
    makeWork([
      dish(
        'p1',
        'New Cooking Dish',
        'Unknown Custom Category',
        'lunch',
        'Lunch',
        100,
      ),
    ]),
    master,
  );

  assert.equal(
    result.rows[0]
      .gasKgPer100,
    0.5,
  );
  assert.equal(
    result.rows[0].source,
    'SAFE_COOKING_FALLBACK',
  );
  assert.ok(
    result.totalGasCost > 0,
  );
});

test('zero override on a cooking dish cannot silently remove gas cost', () => {
  const master =
    defaultGasCostMaster();

  master.dishOverrides = [
    {
      name: 'Dal Fry',
      category: 'Dal / Kadhi',
      gasKgPer100: 0,
    },
  ];

  const result = calculateEventGas(
    makeWork([
      dish(
        'd1',
        'Dal Fry',
        'Dal / Kadhi',
        'lunch',
        'Lunch',
        100,
      ),
    ]),
    master,
  );

  assert.equal(
    result.rows[0]
      .gasKgPer100,
    1,
  );
  assert.equal(
    result.rows[0].source,
    'CATEGORY',
  );
  assert.ok(
    result.totalGasCost > 0,
  );
});

test('same dish duplicated inside the same function is not double-counted', () => {
  const result = calculateEventGas(
    makeWork([
      dish(
        'p1',
        'Paneer Tikka',
        'Paneer',
        'lunch',
        'Lunch',
        100,
      ),
      dish(
        'p2',
        'Paneer Tikka',
        'Paneer',
        'lunch',
        'Lunch',
        100,
      ),
    ]),
    defaultGasCostMaster(),
  );

  assert.equal(
    result.rows.length,
    1,
  );
  assert.equal(
    result.totalGasKg,
    1.2,
  );
});


test('real dish gas profile uses burner time and full production batches', () => {
  const master =
    defaultGasCostMaster();

  master.dishOverrides = [
    {
      name: 'Paneer Tikka',
      category: 'Paneer',
      gasKgPer100: 9,
      gasBurnerKgPerHour: 0.4,
      gasCookingMinutes: 45,
      gasBurnerCount: 2,
      gasBatchPax: 80,
    },
  ];

  const result = calculateEventGas(
    makeWork([
      dish(
        'p1',
        'Paneer Tikka',
        'Paneer',
        'dinner',
        'Dinner',
        250,
      ),
    ]),
    master,
  );

  const row = result.rows[0];

  // 0.4 kg/h × 2 burners × 0.75 h = 0.6 kg per batch.
  // ceil(250 / 80) = 4 batches, so actual gas = 2.4 kg.
  assert.equal(
    row.source,
    'REAL_DISH_PROFILE',
  );
  assert.equal(
    row.gasBatches,
    4,
  );
  assert.equal(
    row.gasKg,
    2.4,
  );
  assert.equal(
    result.totalGasKg,
    2.4,
  );

  // Equivalent 100-guest view uses ceil(100 / 80) = 2 batches.
  assert.equal(
    row.gasKgPer100,
    1.2,
  );

  // Real profile must win over the legacy 9 kg / 100 manual fallback.
  assert.ok(
    row.gasKg < 9,
  );
});

test('real dish gas profile rounds batches up instead of scaling linearly', () => {
  const master =
    defaultGasCostMaster();

  master.dishOverrides = [
    {
      name: 'Dal Fry',
      category: 'Dal / Kadhi',
      gasBurnerKgPerHour: 0.5,
      gasCookingMinutes: 60,
      gasBurnerCount: 1,
      gasBatchPax: 100,
    },
  ];

  const result = calculateEventGas(
    makeWork([
      dish(
        'd1',
        'Dal Fry',
        'Dal / Kadhi',
        'lunch',
        'Lunch',
        101,
      ),
    ]),
    master,
  );

  assert.equal(
    result.rows[0].gasBatches,
    2,
  );
  assert.equal(
    result.totalGasKg,
    1,
  );
});


test('zero real profile values do not produce false zero gas and fall back safely', () => {
  const master =
    defaultGasCostMaster();

  master.dishOverrides = [
    {
      name: 'Dal Fry',
      category: 'Dal / Kadhi',
      gasBurnerKgPerHour: 0,
      gasCookingMinutes: 0,
      gasBurnerCount: 1,
      gasBatchPax: 100,
    },
  ];

  const result = calculateEventGas(
    makeWork([
      dish(
        'd1',
        'Dal Fry',
        'Dal / Kadhi',
        'lunch',
        'Lunch',
        100,
      ),
    ]),
    master,
  );

  assert.equal(
    result.rows[0].source,
    'CATEGORY',
  );
  assert.equal(
    result.rows[0].gasKg,
    1,
  );
});
