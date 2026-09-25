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
