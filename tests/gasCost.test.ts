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

test('explicit no-gas Sweet profile returns zero without weakening cooking fallback safety', () => {
  const master =
    defaultGasCostMaster();

  master.dishOverrides = [
    {
      name: 'Shrikhand',
      category: 'Sweet',
      gasKgPer100: 0,
      gasNoGas: true,
    },
  ];

  const result = calculateEventGas(
    makeWork([
      dish(
        's1',
        'Shrikhand',
        'Sweet',
        'dinner',
        'Dinner',
        100,
      ),
    ]),
    master,
  );

  assert.equal(
    result.rows[0].source,
    'DISH_NO_GAS',
  );
  assert.equal(
    result.rows[0].gasKg,
    0,
  );
  assert.equal(
    result.rows[0].gasCost,
    0,
  );
});

test('explicit no-gas flag wins over stale real profile data', () => {
  const master =
    defaultGasCostMaster();

  master.dishOverrides = [
    {
      name: 'Shrikhand',
      category: 'Sweet',
      gasKgPer100: 0,
      gasNoGas: true,
      gasBurnerKgPerHour: 0.5,
      gasCookingMinutes: 60,
      gasBurnerCount: 1,
      gasBatchPax: 100,
    },
  ];

  const result = calculateEventGas(
    makeWork([
      dish(
        's2',
        'Shrikhand',
        'Sweet',
        'dinner',
        'Dinner',
        100,
      ),
    ]),
    master,
  );

  assert.equal(
    result.rows[0].source,
    'DISH_NO_GAS',
  );
  assert.equal(
    result.totalGasKg,
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


test('event gas override wins over real recipe profile and scales by event guests', () => {
  const master =
    defaultGasCostMaster();

  master.dishOverrides = [
    {
      name: 'Paneer Tikka',
      category: 'Paneer',
      gasBurnerKgPerHour: 0.4,
      gasCookingMinutes: 45,
      gasBurnerCount: 2,
      gasBatchPax: 80,
    },
  ];

  const work = makeWork([
    dish(
      'p1',
      'Paneer Tikka',
      'Paneer',
      'dinner',
      'Dinner',
      250,
    ),
  ]);

  work.gasEventOverrides = [
    {
      key: 'service:dinner::paneer tikka',
      serviceKey: 'service:dinner',
      serviceId: 'dinner',
      dishId: 'p1',
      dishName: 'Paneer Tikka',
      gasKgPer100: 0.8,
    },
  ];

  const result =
    calculateEventGas(
      work,
      master,
    );

  assert.equal(
    result.rows[0].source,
    'EVENT_OVERRIDE',
  );
  assert.equal(
    result.rows[0].gasKgPer100,
    0.8,
  );
  assert.equal(
    result.rows[0].gasKg,
    2,
  );
});

test('event override can explicitly set a cooking dish to no gas', () => {
  const work = makeWork([
    dish(
      'd1',
      'Dal Fry',
      'Dal / Kadhi',
      'lunch',
      'Lunch',
      100,
    ),
  ]);

  work.gasEventOverrides = [
    {
      key: 'service:lunch::dal fry',
      serviceKey: 'service:lunch',
      serviceId: 'lunch',
      dishId: 'd1',
      dishName: 'Dal Fry',
      gasKgPer100: 0,
      noGas: true,
    },
  ];

  const result =
    calculateEventGas(
      work,
      defaultGasCostMaster(),
    );

  assert.equal(
    result.rows[0].source,
    'EVENT_OVERRIDE',
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


test('Sweet without a saved override uses dish-specific Sweet starter instead of one category fallback', () => {
  const result = calculateEventGas(
    makeWork([
      dish(
        'sw1',
        'Gulab Jamun',
        'Sweet',
        'dinner',
        'Dinner',
        100,
      ),
      dish(
        'sw2',
        'Rabdi',
        'Sweet',
        'dinner',
        'Dinner',
        100,
      ),
    ]),
    defaultGasCostMaster(),
  );

  assert.deepEqual(
    result.rows.map(
      (row) => [
        row.dish,
        row.gasKgPer100,
        row.source,
      ],
    ),
    [
      [
        'Gulab Jamun',
        1,
        'SWEET_STARTER',
      ],
      [
        'Rabdi',
        3,
        'SWEET_STARTER',
      ],
    ],
  );

  assert.equal(
    result.totalGasKg,
    4,
  );
});

test('cold Sweet starter can return zero gas without a saved dish profile', () => {
  const result = calculateEventGas(
    makeWork([
      dish(
        'sw3',
        'Shrikhand',
        'Sweet',
        'dinner',
        'Dinner',
        100,
      ),
    ]),
    defaultGasCostMaster(),
  );

  assert.equal(
    result.rows[0].source,
    'SWEET_STARTER',
  );
  assert.equal(
    result.totalGasKg,
    0,
  );
});


test('Sabji without a saved override uses dish-specific Sabji starter instead of one category fallback', () => {
  const result = calculateEventGas(
    makeWork([
      dish(
        'sb1',
        'Aloo Jeera',
        'Sabji',
        'lunch',
        'Lunch',
        100,
      ),
      dish(
        'sb2',
        'Paneer Tikka Masala',
        'Sabji',
        'dinner',
        'Dinner',
        100,
      ),
      dish(
        'sb3',
        'Banana Kofta Curry',
        'Sabji',
        'dinner',
        'Dinner',
        100,
      ),
    ]),
    defaultGasCostMaster(),
  );

  assert.deepEqual(
    result.rows.map(
      (row) => [
        row.dish,
        row.gasKgPer100,
        row.source,
      ],
    ),
    [
      [
        'Aloo Jeera',
        0.65,
        'SABJI_STARTER',
      ],
      [
        'Paneer Tikka Masala',
        1.3,
        'SABJI_STARTER',
      ],
      [
        'Banana Kofta Curry',
        1.45,
        'SABJI_STARTER',
      ],
    ],
  );

  assert.equal(
    result.totalGasKg,
    3.4,
  );
});

test('saved Sabji dish gas still wins over Sabji starter', () => {
  const master =
    defaultGasCostMaster();

  master.dishOverrides = [
    {
      name: 'Aloo Jeera',
      category: 'Sabji',
      gasKgPer100: 0.5,
    },
  ];

  const result = calculateEventGas(
    makeWork([
      dish(
        'sb4',
        'Aloo Jeera',
        'Sabji',
        'lunch',
        'Lunch',
        100,
      ),
    ]),
    master,
  );

  assert.equal(
    result.rows[0].source,
    'DISH_OVERRIDE',
  );
  assert.equal(
    result.rows[0].gasKgPer100,
    0.5,
  );
});


test('Chaat without a saved override uses dish-specific Chaat starter instead of one category fallback', () => {
  const result = calculateEventGas(
    makeWork([
      dish(
        'ch1',
        'Pani Puri',
        'Chaat',
        'snacks',
        'Snacks',
        100,
      ),
      dish(
        'ch2',
        'Aloo Tikki Chaat',
        'Chaat',
        'snacks',
        'Snacks',
        100,
      ),
      dish(
        'ch3',
        'Ragda Pattice',
        'Chaat',
        'snacks',
        'Snacks',
        100,
      ),
    ]),
    defaultGasCostMaster(),
  );

  assert.deepEqual(
    result.rows.map(
      (row) => [
        row.dish,
        row.gasKgPer100,
        row.source,
      ],
    ),
    [
      [
        'Pani Puri',
        0.25,
        'CHAAT_STARTER',
      ],
      [
        'Aloo Tikki Chaat',
        0.75,
        'CHAAT_STARTER',
      ],
      [
        'Ragda Pattice',
        0.9,
        'CHAAT_STARTER',
      ],
    ],
  );

  assert.equal(
    result.totalGasKg,
    1.9,
  );
});

test('saved Chaat dish gas still wins over Chaat starter', () => {
  const master =
    defaultGasCostMaster();

  master.dishOverrides = [
    {
      name: 'Pani Puri',
      category: 'Chaat',
      gasKgPer100: 0.4,
    },
  ];

  const result = calculateEventGas(
    makeWork([
      dish(
        'ch4',
        'Pani Puri',
        'Chaat',
        'snacks',
        'Snacks',
        100,
      ),
    ]),
    master,
  );

  assert.equal(
    result.rows[0].source,
    'DISH_OVERRIDE',
  );
  assert.equal(
    result.rows[0].gasKgPer100,
    0.4,
  );
});


test('Chinese without a saved override uses dish-specific Chinese starter instead of one category fallback', () => {
  const result = calculateEventGas(
    makeWork([
      dish(
        'cn1',
        'Veg Fried Rice',
        'Chinese',
        'dinner',
        'Dinner',
        100,
      ),
      dish(
        'cn2',
        'Hakka Noodles',
        'Chinese',
        'dinner',
        'Dinner',
        100,
      ),
      dish(
        'cn3',
        'Veg Manchurian Gravy',
        'Chinese',
        'dinner',
        'Dinner',
        100,
      ),
    ]),
    defaultGasCostMaster(),
  );

  assert.deepEqual(
    result.rows.map(
      (row) => [
        row.dish,
        row.gasKgPer100,
        row.source,
      ],
    ),
    [
      [
        'Veg Fried Rice',
        0.85,
        'CHINESE_STARTER',
      ],
      [
        'Hakka Noodles',
        0.95,
        'CHINESE_STARTER',
      ],
      [
        'Veg Manchurian Gravy',
        1.3,
        'CHINESE_STARTER',
      ],
    ],
  );

  assert.equal(
    result.totalGasKg,
    3.1,
  );
});

test('saved Chinese dish gas still wins over Chinese starter', () => {
  const master =
    defaultGasCostMaster();

  master.dishOverrides = [
    {
      name: 'Hakka Noodles',
      category: 'Chinese',
      gasKgPer100: 0.8,
    },
  ];

  const result = calculateEventGas(
    makeWork([
      dish(
        'cn4',
        'Hakka Noodles',
        'Chinese',
        'dinner',
        'Dinner',
        100,
      ),
    ]),
    master,
  );

  assert.equal(
    result.rows[0].source,
    'DISH_OVERRIDE',
  );
  assert.equal(
    result.rows[0].gasKgPer100,
    0.8,
  );
});


test('Dal/Kadhi without a saved override uses dish-specific starter gas instead of one category fallback', () => {
  const result = calculateEventGas(
    makeWork([
      dish(
        'dk1',
        'Dal Makhani',
        'Dal/Kadhi',
        'dinner',
        'Dinner',
        100,
      ),
      dish(
        'dk2',
        'Gujarati Kadhi',
        'Dal/Kadhi',
        'dinner',
        'Dinner',
        100,
      ),
      dish(
        'dk3',
        'Punjabi Kadhi Pakora',
        'Dal/Kadhi',
        'dinner',
        'Dinner',
        100,
      ),
    ]),
    defaultGasCostMaster(),
  );

  assert.deepEqual(
    result.rows.map(
      (row) => [
        row.dish,
        row.gasKgPer100,
        row.source,
      ],
    ),
    [
      [
        'Dal Makhani',
        1.4,
        'DAL_KADHI_STARTER',
      ],
      [
        'Gujarati Kadhi',
        0.8,
        'DAL_KADHI_STARTER',
      ],
      [
        'Punjabi Kadhi Pakora',
        1.35,
        'DAL_KADHI_STARTER',
      ],
    ],
  );

  assert.equal(
    result.totalGasKg,
    3.55,
  );
});

test('saved Dal/Kadhi dish gas still wins over starter gas', () => {
  const master =
    defaultGasCostMaster();

  master.dishOverrides = [
    {
      name: 'Dal Fry',
      category: 'Dal/Kadhi',
      gasKgPer100: 0.75,
    },
  ];

  const result = calculateEventGas(
    makeWork([
      dish(
        'dk4',
        'Dal Fry',
        'Dal/Kadhi',
        'lunch',
        'Lunch',
        100,
      ),
    ]),
    master,
  );

  assert.equal(
    result.rows[0].source,
    'DISH_OVERRIDE',
  );
  assert.equal(
    result.rows[0].gasKgPer100,
    0.75,
  );
});


test('Farsan without a saved override uses dish-specific starter gas instead of one category fallback', () => {
  const result = calculateEventGas(
    makeWork([
      dish(
        'fs1',
        'Khaman',
        'Farsan',
        'snacks',
        'Snacks',
        100,
      ),
      dish(
        'fs2',
        'Samosa',
        'Farsan',
        'snacks',
        'Snacks',
        100,
      ),
      dish(
        'fs3',
        'Khakhra',
        'Farsan',
        'snacks',
        'Snacks',
        100,
      ),
    ]),
    defaultGasCostMaster(),
  );

  assert.deepEqual(
    result.rows.map(
      (row) => [
        row.dish,
        row.gasKgPer100,
        row.source,
      ],
    ),
    [
      [
        'Khaman',
        0.75,
        'FARSAN_STARTER',
      ],
      [
        'Samosa',
        1.25,
        'FARSAN_STARTER',
      ],
      [
        'Khakhra',
        0.65,
        'FARSAN_STARTER',
      ],
    ],
  );

  assert.equal(
    result.totalGasKg,
    2.65,
  );
});

test('saved Farsan dish gas still wins over Farsan starter', () => {
  const master =
    defaultGasCostMaster();

  master.dishOverrides = [
    {
      name: 'Khaman',
      category: 'Farsan',
      gasKgPer100: 0.6,
    },
  ];

  const result = calculateEventGas(
    makeWork([
      dish(
        'fs4',
        'Khaman',
        'Farsan',
        'snacks',
        'Snacks',
        100,
      ),
    ]),
    master,
  );

  assert.equal(
    result.rows[0].source,
    'DISH_OVERRIDE',
  );
  assert.equal(
    result.rows[0].gasKgPer100,
    0.6,
  );
});
