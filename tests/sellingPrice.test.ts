import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateSellingPrice } from '../lib/sellingPrice';

test('20% markup increases cost by 20 percent before per-cover rounding', () => {
  const result = calculateSellingPrice({
    totalCost: 80000,
    totalCovers: 200,
    mode: 'MARKUP',
    percent: 20,
  });

  assert.equal(result.costPerCover, 400);
  assert.equal(result.sellingPricePerCover, 480);
  assert.equal(result.totalSelling, 96000);
  assert.equal(result.profit, 16000);
  assert.equal(Math.round(result.markupPercent), 20);
  assert.equal(Math.round(result.marginPercent), 17);
});

test('20% gross margin uses selling-price denominator', () => {
  const result = calculateSellingPrice({
    totalCost: 80000,
    totalCovers: 200,
    mode: 'MARGIN',
    percent: 20,
  });

  assert.equal(result.sellingPricePerCover, 500);
  assert.equal(result.totalSelling, 100000);
  assert.equal(result.profit, 20000);
  assert.equal(Math.round(result.marginPercent), 20);
  assert.equal(Math.round(result.markupPercent), 25);
});

test('manual price per cover calculates profit and loss', () => {
  const result = calculateSellingPrice({
    totalCost: 50000,
    totalCovers: 100,
    mode: 'MANUAL',
    manualPricePerCover: 450,
  });

  assert.equal(result.totalSelling, 45000);
  assert.equal(result.profit, -5000);
  assert.equal(Math.round(result.marginPercent), -11);
});
