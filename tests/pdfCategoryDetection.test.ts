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

test('ignores PDF branding and compound headings while keeping their dishes', async () => {
  const menuText = [
    'KALASH CATERERS',
    'Curated menus',
    'Elegant service',
    'Memorable celebrations',
    'RICE & ACCOMPANIMENTS',
    'Jeera Rice',
    'Papad & Achar',
    'OTHER COUNTERS & SERVICES',
    'Paan Counter',
    '200 ml Water Bottle',
    'LATE NIGHT - 150 MEMBERS',
    'Mix Bhajiya',
    'Tea',
    'Coffee',
    'KALASH CATERERS - PREMIUM VEGETARIAN CATERERS',
  ].join('\n');

  const [knownDishes, candidates] = await Promise.all([
    parseMenuText(menuText),
    findPendingDishCandidates(menuText),
  ]);
  const names = new Set([
    ...knownDishes.map((dish) => dish.name),
    ...candidates.map((candidate) => candidate.name),
  ]);

  assert.equal(names.has('KALASH CATERERS'), false);
  assert.equal(names.has('Curated menus'), false);
  assert.equal(names.has('RICE & ACCOMPANIMENTS'), false);
  assert.equal(names.has('OTHER COUNTERS & SERVICES'), false);
  assert.equal(names.has('Mix Bhajiya'), true);
  assert.equal(names.has('Paan Counter'), true);
});
