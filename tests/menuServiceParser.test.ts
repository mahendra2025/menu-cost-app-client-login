import test from 'node:test';

import assert from 'node:assert/strict';

import {
  parseMenuDayHeading,
  parseMenuServiceHeading,
} from '../lib/menuServiceParser';

test('detects plain meal headings', () => {
  assert.deepEqual(
    parseMenuServiceHeading('Breakfast'),
    {
      dayLabel: undefined,
      mealLabel: 'Breakfast',
      servicePax: undefined,
    },
  );

  assert.deepEqual(
    parseMenuServiceHeading('Lunch Menu'),
    {
      dayLabel: undefined,
      mealLabel: 'Lunch',
      servicePax: undefined,
    },
  );
});

test('detects meal heading with guest count', () => {
  assert.deepEqual(
    parseMenuServiceHeading('Dinner - 250 Members'),
    {
      dayLabel: undefined,
      mealLabel: 'Dinner',
      servicePax: 250,
    },
  );
});


test('ignores per-plate rate after guest count', () => {
  assert.deepEqual(
    parseMenuServiceHeading('Breakfast - 22 Members - 200 per plate'),
    {
      dayLabel: undefined,
      mealLabel: 'Breakfast',
      servicePax: 22,
    },
  );
});

test('ignores meal timing when detecting heading', () => {
  assert.deepEqual(
    parseMenuServiceHeading('Breakfast - 8:00 AM'),
    {
      dayLabel: undefined,
      mealLabel: 'Breakfast',
      servicePax: undefined,
    },
  );
});


test('detects meal heading with simple hour timing', () => {
  assert.deepEqual(
    parseMenuServiceHeading('Hi Tea - 4 PM'),
    {
      dayLabel: undefined,
      mealLabel: 'Hi Tea',
      servicePax: undefined,
    },
  );
});

test('detects explicit custom function names without guest count', () => {
  assert.deepEqual(
    parseMenuServiceHeading('Function Name: Mahila Sangeet'),
    {
      dayLabel: undefined,
      mealLabel: 'Mahila Sangeet',
      servicePax: undefined,
    },
  );
});

test('detects date plus meal plus guest count on one heading', () => {
  assert.deepEqual(
    parseMenuServiceHeading('14-09-2026 - Lunch - 180 Members'),
    {
      dayLabel: '14-09-2026',
      mealLabel: 'Lunch',
      servicePax: 180,
    },
  );
});

test('detects day plus meal on one heading', () => {
  assert.deepEqual(
    parseMenuServiceHeading('Day 2 • Dinner'),
    {
      dayLabel: 'Day 2',
      mealLabel: 'Dinner',
      servicePax: undefined,
    },
  );
});

test('detects common combined event and meal names', () => {
  assert.deepEqual(
    parseMenuServiceHeading('Reception Dinner'),
    {
      dayLabel: undefined,
      mealLabel: 'Reception Dinner',
      servicePax: undefined,
    },
  );
});

test('does not treat ordinary dish names as meal headings', () => {
  assert.equal(
    parseMenuServiceHeading('Paneer Tikka'),
    null,
  );

  assert.equal(
    parseMenuServiceHeading('Wedding Cake'),
    null,
  );
});

test('detects standalone date headings', () => {
  assert.equal(
    parseMenuDayHeading('Date: 15/09/2026'),
    '15/09/2026',
  );

  assert.equal(
    parseMenuDayHeading('Day 3'),
    'Day 3',
  );
});
