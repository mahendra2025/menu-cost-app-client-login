import test from 'node:test';
import assert from 'node:assert/strict';

import { parseMenuText } from '../lib/store';

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
