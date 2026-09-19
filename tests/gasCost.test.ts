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

test('zero-gas category safely returns zero', () => {
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
});

test('missing category rate safely falls back to zero', () => {
  const master =
    defaultGasCostMaster();

  master.categoryRates =
    master.categoryRates.filter(
      (rate) =>
        rate.categoryName !==
        'Paneer',
    );

  const result = calculateEventGas(
    makeWork([
      dish(
        'p1',
        'Paneer Tikka',
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
    0,
  );
  assert.equal(
    result.totalGasCost,
    0,
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
