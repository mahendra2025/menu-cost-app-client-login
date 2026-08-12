import test from 'node:test';

import assert from 'node:assert/strict';

import {
  dishNameKey,
  getDishSourceEvidenceScore,
  preprocessMenuTextWithTenantLearning,
  sourceDishCoverageKey,
  tokenWithinOneEdit,
  type TenantDishAliasRule,
} from '../lib/menuDetectionCore';

test(
  'normalizes dish punctuation and case',
  () => {
    assert.equal(
      dishNameKey(
        '  Paneer-Tikka!  ',
      ),
      'paneer tikka',
    );
  },
);

test(
  'generic category heading is not a dish',
  () => {
    assert.equal(
      getDishSourceEvidenceScore(
        'Starter\nPaneer Tikka',
        'Starter',
      ),
      0,
    );
  },
);

test(
  'exact source dish gets full confidence',
  () => {
    assert.equal(
      getDishSourceEvidenceScore(
        'Starter\nPaneer Tikka\nDal Fry',
        'Paneer Tikka',
      ),
      100,
    );
  },
);

test(
  'one OCR edit remains strong evidence',
  () => {
    assert.ok(
      getDishSourceEvidenceScore(
        'Starter\nPanner Tikka',
        'Paneer Tikka',
      ) >= 90,
    );
  },
);

test(
  'tiny unrelated words are not fuzzy matched',
  () => {
    assert.equal(
      tokenWithinOneEdit(
        'dal',
        'pal',
      ),
      false,
    );
  },
);

test(
  'dish tokens cannot leak across lines',
  () => {
    const score =
      getDishSourceEvidenceScore(
        [
          'Royal Paneer',
          'Dragon Soup',
          'Special Counter',
        ].join(
          '\n',
        ),
        'Royal Dragon Paneer Special',
      );

    assert.ok(
      score < 65,
    );
  },
);

test(
  'long prose is rejected as strong dish evidence',
  () => {
    const menu =
      'Please arrange Paneer Tikka for all guests because the client asked for live service and presentation near the main wedding stage tonight';

    assert.equal(
      getDishSourceEvidenceScore(
        menu,
        'Paneer Tikka',
      ),
      0,
    );
  },
);

test(
  'semicolon-separated dishes remain detectable',
  () => {
    assert.equal(
      getDishSourceEvidenceScore(
        'Paneer Tikka; Dal Fry',
        'Dal Fry',
      ),
      100,
    );
  },
);

test(
  'slash dish name remains one dish line',
  () => {
    assert.equal(
      getDishSourceEvidenceScore(
        'Dahi / Papdi Chaat',
        'Dahi / Papdi Chaat',
      ),
      100,
    );
  },
);

test(
  'same dish remains separate across meals',
  () => {
    const breakfast =
      sourceDishCoverageKey({
        name:
          'Masala Tea',

        dayLabel:
          'Day 1',

        mealLabel:
          'Breakfast',
      });

    const dinner =
      sourceDishCoverageKey({
        name:
          'Masala Tea',

        dayLabel:
          'Day 1',

        mealLabel:
          'Dinner',
      });

    assert.notEqual(
      breakfast,
      dinner,
    );
  },
);

test(
  'equivalent coverage identities normalize',
  () => {
    const first =
      sourceDishCoverageKey({
        name:
          'Paneer-Tikka',

        dayLabel:
          'DAY 1',

        mealLabel:
          'Dinner',
      });

    const second =
      sourceDishCoverageKey({
        name:
          'paneer tikka',

        dayLabel:
          'day 1',

        mealLabel:
          'dinner',
      });

    assert.equal(
      first,
      second,
    );
  },
);

const correction:
  TenantDishAliasRule = {
    aliasName:
      'Panner Tikka',

    canonicalName:
      'Paneer Tikka',

    category:
      'Starter',

    action:
      'MAP',

    usageCount:
      1,
  };

test(
  'learned spelling is rewritten before detection',
  () => {
    const result =
      preprocessMenuTextWithTenantLearning(
        [
          'Starter',
          '• Panner Tikka',
        ].join(
          '\n',
        ),
        [
          correction,
        ],
      );

    assert.ok(
      result.menuText.includes(
        '• Paneer Tikka',
      ),
    );

    assert.equal(
      result.replacements,
      1,
    );
  },
);

test(
  'learning does not rewrite words inside prose',
  () => {
    const menu =
      'Note: Panner Tikka will be served live';

    const result =
      preprocessMenuTextWithTenantLearning(
        menu,
        [
          correction,
        ],
      );

    assert.equal(
      result.menuText,
      menu,
    );

    assert.equal(
      result.replacements,
      0,
    );
  },
);

test(
  'newest correction wins',
  () => {
    const older:
      TenantDishAliasRule = {
        ...correction,

        canonicalName:
          'Old Paneer Tikka',

        usageCount:
          5,
      };

    const result =
      preprocessMenuTextWithTenantLearning(
        'Panner Tikka',
        [
          correction,
          older,
        ],
      );

    assert.equal(
      result.menuText,
      'Paneer Tikka',
    );
  },
);

test(
  'reject rule does not rewrite source text',
  () => {
    const rejectRule:
      TenantDishAliasRule = {
        aliasName:
          'Without Onion Garlic',

        canonicalName:
          '',

        category:
          'Other',

        action:
          'REJECT',

        usageCount:
          1,
      };

    const result =
      preprocessMenuTextWithTenantLearning(
        'Without Onion Garlic',
        [
          rejectRule,
        ],
      );

    assert.equal(
      result.menuText,
      'Without Onion Garlic',
    );

    assert.equal(
      result.replacements,
      0,
    );
  },
);

test(
  'canonical dish is not counted as replacement',
  () => {
    const result =
      preprocessMenuTextWithTenantLearning(
        'Paneer Tikka',
        [
          {
            ...correction,

            aliasName:
              'Paneer Tikka',
          },
        ],
      );

    assert.equal(
      result.replacements,
      0,
    );
  },
);
