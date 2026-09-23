import test from 'node:test';
import assert from 'node:assert/strict';
import { collectMenuOcrCandidate, selectMenuOcrCandidate, type MenuOcrCandidate } from '../lib/menuOcrCandidates';

test('catalog evidence can recover dishes from the lower-confidence OCR pass', async () => {
  const selected = await selectMenuOcrCandidate([
    { text: 'Wedding Celebration\nWelcome Everyone', confidence: 98, label: 'sparse' },
    { text: 'Paneer Tikka\nDal Fry\nJeera Rice', confidence: 65, label: 'automatic' },
  ], async (text) => text.includes('Paneer Tikka') ? 3000 : 0);
  assert.equal(selected?.label, 'automatic');
});

test('catalog failure preserves readable text', async () => {
  const selected = await selectMenuOcrCandidate([
    { text: 'Paneer Tikka\nDal Fry', confidence: 85, label: 'original' },
  ], async () => { throw new Error('Catalog unavailable'); });
  assert.equal(selected?.text, 'Paneer Tikka\nDal Fry');
});

test('failed second recognition does not lose the first reading', async () => {
  const candidates: MenuOcrCandidate[] = [];
  await collectMenuOcrCandidate(candidates, 'original', async () => ({ data: { text: 'Paneer Tikka', confidence: 90 } }));
  await collectMenuOcrCandidate(candidates, 'enhanced', async () => { throw new Error('Recognition failed'); });
  assert.equal((await selectMenuOcrCandidate(candidates))?.text, 'Paneer Tikka');
});

test('empty and null-only readings cannot win', async () => {
  const candidates: MenuOcrCandidate[] = [];
  await collectMenuOcrCandidate(candidates, 'empty', async () => ({ data: { text: '\u0000  ', confidence: 100 } }));
  assert.equal(await selectMenuOcrCandidate(candidates), undefined);
});

test('invalid confidence and catalog scores do not poison candidate selection', async () => {
  const selected = await selectMenuOcrCandidate([
    { text: 'Garbled', confidence: NaN, label: 'bad' },
    { text: 'Paneer Tikka', confidence: 90, label: 'good' },
  ], async () => NaN);
  assert.equal(selected?.label, 'good');
});
