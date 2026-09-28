import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ingredientRateSourceLabel,
  normalizeCityKey,
  normalizeCityName,
  resolveIngredientRate,
} from '../lib/cityIngredientRates';

test('normalizes city display names without changing readable casing', () => {
  assert.equal(
    normalizeCityName('  Silvassa   '),
    'Silvassa',
  );
  assert.equal(
    normalizeCityName('Dadra   & Nagar Haveli'),
    'Dadra & Nagar Haveli',
  );
});

test('normalizes city keys for case and punctuation insensitive lookup', () => {
  assert.equal(
    normalizeCityKey('VAPI'),
    normalizeCityKey('vapi'),
  );
  assert.equal(
    normalizeCityKey('Daman - India'),
    'daman india',
  );
});

test('labels city rate sources clearly', () => {
  assert.equal(
    ingredientRateSourceLabel('TENANT', 'Silvassa'),
    'My rate',
  );
  assert.equal(
    ingredientRateSourceLabel('CITY', 'Silvassa'),
    'Silvassa city rate',
  );
  assert.equal(
    ingredientRateSourceLabel('GLOBAL', 'Silvassa'),
    'Global master rate',
  );
});


test('rate priority is tenant then city then global', () => {
  assert.deepEqual(
    resolveIngredientRate({
      tenantRate: 120,
      cityRate: 100,
      globalRate: 80,
    }),
    {
      rate: 120,
      source: 'TENANT',
    },
  );

  assert.deepEqual(
    resolveIngredientRate({
      cityRate: 100,
      globalRate: 80,
    }),
    {
      rate: 100,
      source: 'CITY',
    },
  );

  assert.deepEqual(
    resolveIngredientRate({
      globalRate: 80,
    }),
    {
      rate: 80,
      source: 'GLOBAL',
    },
  );
});
