import test from 'node:test';

import assert from 'node:assert/strict';

import {
  cleanupMenuSourceText,
  dishNameKey,
} from '../lib/menuDetectionCore';

function knownDishMatcher(
  names: string[],
) {
  const keys =
    new Set(
      names.map(
        dishNameKey,
      ),
    );

  return (
    candidate: string,
  ) =>
    keys.has(
      dishNameKey(
        candidate,
      ),
    );
}

test(
  'repairs a two-line wrapped known dish',
  () => {
    const result =
      cleanupMenuSourceText(
        [
          'Starter',
          '• Paneer Butter',
          'Masala',
          '• Dal Fry',
        ].join(
          '\n',
        ),

        knownDishMatcher([
          'Paneer Butter Masala',
          'Dal Fry',
        ]),
      );

    assert.ok(
      result.menuText.includes(
        '• Paneer Butter Masala',
      ),
    );

    assert.equal(
      result.mergedWrappedLines,
      1,
    );
  },
);

test(
  'repairs a three-line wrapped known dish',
  () => {
    const result =
      cleanupMenuSourceText(
        [
          'Starter',
          '• Hara',
          'Bhara',
          'Kebab',
        ].join(
          '\n',
        ),

        knownDishMatcher([
          'Hara Bhara Kebab',
        ]),
      );

    assert.ok(
      result.menuText.includes(
        '• Hara Bhara Kebab',
      ),
    );

    assert.equal(
      result.mergedWrappedLines,
      2,
    );
  },
);

test(
  'never merges separately bulleted dishes',
  () => {
    const result =
      cleanupMenuSourceText(
        [
          '• Paneer Butter',
          '• Masala',
        ].join(
          '\n',
        ),

        () => true,
      );

    assert.equal(
      result.mergedWrappedLines,
      0,
    );

    assert.ok(
      result.menuText.includes(
        '• Paneer Butter\n• Masala',
      ),
    );
  },
);

test(
  'does not merge heading with a dish',
  () => {
    const result =
      cleanupMenuSourceText(
        [
          'Starter',
          'Paneer Tikka',
        ].join(
          '\n',
        ),

        knownDishMatcher([
          'Paneer Tikka',
        ]),
      );

    assert.equal(
      result.menuText,
      'Starter\nPaneer Tikka',
    );

    assert.equal(
      result.mergedWrappedLines,
      0,
    );
  },
);

test(
  'unknown wrapped text remains unchanged',
  () => {
    const menu =
      [
        'Special',
        'Presentation',
      ].join(
        '\n',
      );

    const result =
      cleanupMenuSourceText(
        menu,
        () => false,
      );

    assert.equal(
      result.menuText,
      menu,
    );
  },
);

test(
  'normalizes tab-separated PDF columns',
  () => {
    const result =
      cleanupMenuSourceText(
        'Paneer Tikka\tGulab Jamun',
      );

    assert.equal(
      result.menuText,
      'Paneer Tikka | Gulab Jamun',
    );

    assert.equal(
      result.normalizedColumns,
      1,
    );
  },
);

test(
  'splits wide-space columns only when cells are known dishes',
  () => {
    const matcher =
      knownDishMatcher([
        'Paneer Tikka',
        'Gulab Jamun',
      ]);

    const result =
      cleanupMenuSourceText(
        'Paneer Tikka    Gulab Jamun',
        matcher,
      );

    assert.equal(
      result.menuText,
      'Paneer Tikka | Gulab Jamun',
    );

    assert.equal(
      result.normalizedColumns,
      1,
    );
  },
);

test(
  'does not split ordinary wide-space event metadata',
  () => {
    const result =
      cleanupMenuSourceText(
        'Dinner    300 Pax',
        knownDishMatcher([
          'Paneer Tikka',
        ]),
      );

    assert.equal(
      result.menuText,
      'Dinner    300 Pax',
    );
  },
);

test(
  'normalizes unicode OCR separators and invisible characters',
  () => {
    const result =
      cleanupMenuSourceText(
        'Paneer\u200BTikka ｜ Dal Fry',
      );

    assert.equal(
      result.menuText,
      'PaneerTikka | Dal Fry',
    );

    assert.ok(
      result.normalizedArtifacts >=
        2,
    );
  },
);

test(
  'first complete known dish is not merged with following line',
  () => {
    const matcher =
      knownDishMatcher([
        'Paneer Tikka',
        'Paneer Tikka Masala',
      ]);

    const result =
      cleanupMenuSourceText(
        [
          'Paneer Tikka',
          'Masala',
        ].join(
          '\n',
        ),
        matcher,
      );

    assert.equal(
      result.menuText,
      'Paneer Tikka\nMasala',
    );

    assert.equal(
      result.mergedWrappedLines,
      0,
    );
  },
);
