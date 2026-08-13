import test from 'node:test';
import assert from 'node:assert/strict';

import {
  pdfPageNeedsOcr,
  reconstructPdfMenuText,
  type PdfMenuTextItem,
} from '../lib/pdfMenuExtraction';

function item(
  str: string,
  x: number,
  y: number,
  width = 120,
): PdfMenuTextItem {
  return {
    str,
    transform: [1, 0, 0, 12, x, y],
    width,
    height: 12,
  };
}

test('reads stable two-column wedding menus column by column', () => {
  const text = reconstructPdfMenuText(
    [
      item('Lunch - 300 Pax', 40, 700),
      item('Dinner - 500 Pax', 330, 700),
      item('Paneer Tikka', 40, 670),
      item('Tomato Soup', 330, 670),
      item('Dal Fry', 40, 640),
      item('Veg Biryani', 330, 640),
      item('Gulab Jamun', 40, 610),
      item('Rasmalai', 330, 610),
    ],
    { pageWidth: 600 },
  );

  assert.ok(
    text.indexOf('Gulab Jamun') < text.indexOf('Dinner - 500 Pax'),
  );
  assert.match(
    text,
    /Lunch - 300 Pax\nPaneer Tikka\nDal Fry\nGulab Jamun/,
  );
  assert.match(
    text,
    /Dinner - 500 Pax\nTomato Soup\nVeg Biryani\nRasmalai/,
  );
});

test('keeps a normal single-column menu in visual order', () => {
  const text = reconstructPdfMenuText(
    [
      item('Dinner - 300 Pax', 50, 700),
      item('Paneer Tikka', 50, 670),
      item('Dal Fry', 50, 640),
    ],
    { pageWidth: 600 },
  );

  assert.equal(
    text,
    'Dinner - 300 Pax\nPaneer Tikka\nDal Fry',
  );
});

test('requests OCR for severely fragmented native PDF text', () => {
  assert.equal(
    pdfPageNeedsOcr(
      ['P', 'a', 'n', 'e', 'e', 'r', 'T', 'i', 'k', 'k', 'a'].join('\n'),
      24,
    ),
    true,
  );
});

test('accepts healthy native menu text without OCR', () => {
  assert.equal(
    pdfPageNeedsOcr(
      [
        'Dinner - 300 Guests',
        'Paneer Butter Masala',
        'Dal Tadka',
        'Jeera Rice',
        'Butter Naan',
        'Gulab Jamun',
      ].join('\n'),
      18,
    ),
    false,
  );
});
