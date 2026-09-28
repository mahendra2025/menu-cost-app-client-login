import test from 'node:test';
import assert from 'node:assert/strict';

import { findPendingDishCandidates, parseMenuText } from '../lib/store';

test('uses PDF category headings for known Dish Master dishes', async () => {
  const dishes = await parseMenuText(
    [
      'STARTERS',
      'Paneer Tikka',
      'SWEETS',
      'Gulab Jamun',
    ].join('\n'),
  );

  const paneerTikka = dishes.find((dish) => dish.name === 'Paneer Tikka');
  const gulabJamun = dishes.find((dish) => dish.name === 'Gulab Jamun');

  assert.equal(paneerTikka?.category, 'Starter');
  assert.equal(gulabJamun?.category, 'Sweet');
});

test('falls back to Dish Master category when the PDF has no heading', async () => {
  const dishes = await parseMenuText('Paneer Tikka');
  const paneerTikka = dishes.find((dish) => dish.name === 'Paneer Tikka');

  assert.equal(paneerTikka?.category, 'Starter');
});

test('detects unknown dishes below compound PDF category headings', async () => {
  const menuText = [
      'INCLUDED MENU',
      'FARSAN & STARTERS',
      'Mexican Cheese Roll',
      'Patti Samosa',
      'SOUP COUNTER',
      'Special Wedding Soup',
      'RAJASTHANI MAIN COURSE',
      'Royal Wedding Curry',
    ].join('\n');
  const [knownDishes, candidates] = await Promise.all(
    [parseMenuText(menuText), findPendingDishCandidates(menuText)],
  );

  const categories = new Map(
    [
      ...knownDishes.map((dish) => [dish.name, dish.category] as const),
      ...candidates.map((candidate) => [candidate.name, candidate.categoryHint] as const),
    ],
  );

  assert.equal(categories.get('Mexican Cheese Roll'), 'Farsan');
  assert.equal(categories.get('Patti Samosa'), 'Farsan');
  assert.equal(categories.get('Special Wedding Soup'), 'Soup');
  assert.equal(categories.get('Royal Wedding Curry'), 'Rajasthani');
});

test('treats PDF DEL control characters as explicit dish bullets', async () => {
  const candidates = await findPendingDishCandidates(
    ['GRAND DINNER - 200 MEMBERS', 'MYSTERY COUNTER', '\u007f New Celebration Dish'].join('\n'),
  );

  assert.ok(candidates.some((candidate) => candidate.name === 'New Celebration Dish'));
});
