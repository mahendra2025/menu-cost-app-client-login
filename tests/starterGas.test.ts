import assert from 'node:assert/strict';
import test from 'node:test';

import {
  suggestStarterGas,
} from '../lib/starterGas';

test('Starter gas estimates distinguish tandoor, fry, kebab, momos and light assembly', () => {
  assert.deepEqual(
    [
      suggestStarterGas('Paneer Tikka').kgPer100,
      suggestStarterGas('Paneer Chilli').kgPer100,
      suggestStarterGas('French Fries').kgPer100,
      suggestStarterGas('Hara Bhara Kebab').kgPer100,
      suggestStarterGas('Paneer Momos').kgPer100,
      suggestStarterGas('Bruschetta').kgPer100,
      suggestStarterGas('Loaded Nachos').kgPer100,
      suggestStarterGas('Mini Veg Pizza').kgPer100,
    ],
    [
      1.25,
      1.20,
      1.10,
      1.00,
      0.75,
      0.55,
      0.40,
      0.90,
    ],
  );
});

test('Starter exact dishes preserve heavier stuffed and fry+toss items', () => {
  assert.equal(
    suggestStarterGas('Paneer Lifafa').kgPer100,
    1.20,
  );

  assert.equal(
    suggestStarterGas('Dry Paneer Manchurian').kgPer100,
    1.25,
  );

  assert.equal(
    suggestStarterGas('Dry Fruit Kachori').kgPer100,
    1.25,
  );
});

test('unknown Starter keeps generic starter estimate', () => {
  assert.deepEqual(
    suggestStarterGas('House Special Starter'),
    {
      kgPer100: 1.00,
      group: 'Starter Default',
      noGas: false,
    },
  );
});


test('remaining Starter dishes have explicit LPG estimates', () => {
  assert.deepEqual(
    [
      suggestStarterGas('Peri Peri Paneer Tikka').kgPer100,
      suggestStarterGas('Potato Wedges').kgPer100,
      suggestStarterGas('Punjabi Samosa').kgPer100,
      suggestStarterGas('Pyaz Kachori').kgPer100,
      suggestStarterGas('Sandwich Dhokla').kgPer100,
      suggestStarterGas('Schezwan Paneer').kgPer100,
      suggestStarterGas('Tandoori Veg Momos').kgPer100,
      suggestStarterGas('Veg Quesadilla').kgPer100,
      suggestStarterGas('Veg Tacos').kgPer100,
      suggestStarterGas('White Dhokla').kgPer100,
    ],
    [
      1.25,
      1.05,
      1.20,
      1.25,
      0.80,
      1.20,
      0.95,
      0.85,
      0.75,
      0.75,
    ],
  );
});

test('Starter heuristics cover future samosa, vada, dhokla, quesadilla and taco names', () => {
  assert.equal(
    suggestStarterGas('House Special Samosa').kgPer100,
    1.15,
  );

  assert.equal(
    suggestStarterGas('House Special Vada').kgPer100,
    1.15,
  );

  assert.equal(
    suggestStarterGas('House Special Dhokla').kgPer100,
    0.75,
  );

  assert.equal(
    suggestStarterGas('House Special Quesadilla').kgPer100,
    0.85,
  );

  assert.equal(
    suggestStarterGas('House Special Tacos').kgPer100,
    0.75,
  );
});
