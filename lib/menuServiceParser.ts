export type ParsedMenuServiceHeading = {
  dayLabel?: string;
  mealLabel: string;
  servicePax?: number;
};

function cleanLabel(value: string): string {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/^[\s•●▪►*\-–—|:]+/, '')
    .replace(/[\s•●▪►*|:]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeLabel(value: string): string {
  const text = cleanLabel(value);

  if (/[ऀ-ॿ઀-૿]/u.test(text)) {
    return text
      .normalize('NFC')
      .toLowerCase()
      .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const SERVICE_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  brunch: 'Brunch',
  lunch: 'Lunch',
  dinner: 'Dinner',
  supper: 'Supper',
  'hi tea': 'Hi Tea',
  'high tea': 'High Tea',
  snacks: 'Snacks',
  'evening snacks': 'Evening Snacks',
  'morning snacks': 'Morning Snacks',
  reception: 'Reception',
  sangeet: 'Sangeet',
  'mahila sangeet': 'Mahila Sangeet',
  mehendi: 'Mehendi',
  mehndi: 'Mehendi',
  haldi: 'Haldi',
  wedding: 'Wedding',
  'wedding dinner': 'Wedding Dinner',
  'dj night': 'DJ Night',
  'cocktail dinner': 'Cocktail Dinner',
  engagement: 'Engagement',
  'ring ceremony': 'Ring Ceremony',
  birthday: 'Birthday',
  barat: 'Barat',
  baraat: 'Baraat',
  tilak: 'Tilak',
  puja: 'Puja',
  pooja: 'Pooja',
  'baby shower': 'Baby Shower',
  'स्वागत': 'स्वागत',
  'नाश्ता': 'नाश्ता',
  'दोपहर का भोजन': 'दोपहर का भोजन',
  'रात्रि भोजन': 'रात्रि भोजन',
  'સવારનો નાસ્તો': 'સવારનો નાસ્તો',
  'બપોરનું ભોજન': 'બપોરનું ભોજન',
  'રાત્રિ ભોજન': 'રાત્રિ ભોજન',
};

const OCCASION_WORDS = new Set([
  'reception',
  'sangeet',
  'mehendi',
  'mehndi',
  'haldi',
  'wedding',
  'engagement',
  'birthday',
  'barat',
  'baraat',
  'tilak',
  'puja',
  'pooja',
  'cocktail',
]);

const MEAL_WORDS = new Set([
  'breakfast',
  'brunch',
  'lunch',
  'dinner',
  'supper',
  'tea',
  'snacks',
]);

function parseDateOnlyHeading(value: string): string | undefined {
  const cleaned = cleanLabel(value)
    .replace(/^date\s*[:\-]\s*/i, '')
    .trim();

  const numericDate = cleaned.match(
    /^(\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?)$/,
  );

  if (numericDate) {
    return numericDate[1];
  }

  const wordDate = cleaned.match(
    /^(\d{1,2}\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{2,4})$/i,
  );

  return wordDate?.[1];
}

export function parseMenuDayHeading(
  value: string,
): string | undefined {
  const cleaned = cleanLabel(value);
  const normalized = normalizeLabel(cleaned)
    .replace(/\b(?:date|menu)\b.*$/i, '')
    .trim();

  const dayMatch = normalized.match(
    /^(?:day\s*[-:]?\s*(\d+)|(\d+)(?:st|nd|rd|th)?\s*day)$/i,
  );
  const dayNumber =
    dayMatch?.[1] ||
    dayMatch?.[2];

  if (dayNumber) {
    return `Day ${dayNumber}`;
  }

  return parseDateOnlyHeading(cleaned);
}

function splitLeadingDay(
  value: string,
): {
  dayLabel?: string;
  rest: string;
} {
  const cleaned = cleanLabel(value);

  const dayPrefix = cleaned.match(
    /^((?:day\s*[-:]?\s*\d+)|(?:\d+(?:st|nd|rd|th)?\s*day))\s*(?:[•▪●◦|:–—-]\s*|\s+)(.+)$/i,
  );

  if (dayPrefix) {
    const dayLabel =
      parseMenuDayHeading(
        dayPrefix[1],
      );

    if (dayLabel) {
      return {
        dayLabel,
        rest: cleanLabel(
          dayPrefix[2],
        ),
      };
    }
  }

  const datePrefix = cleaned.match(
    /^((?:date\s*[:\-]\s*)?(?:\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?|\d{1,2}\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{2,4}))\s*(?:[•▪●◦|:–—-]\s*|\s+)(.+)$/i,
  );

  if (datePrefix) {
    const dayLabel =
      parseMenuDayHeading(
        datePrefix[1],
      );

    if (dayLabel) {
      return {
        dayLabel,
        rest: cleanLabel(
          datePrefix[2],
        ),
      };
    }
  }

  return {
    rest: cleaned,
  };
}

function removeCommercialDecoration(
  value: string,
  hasPax: boolean,
): string {
  let cleaned = value
    .replace(
      /\b(?:rate|price)\s*[:\-]?\s*(?:₹|rs\.?|inr)?\s*\d+(?:\.\d+)?(?:\s*(?:per|\/)\s*(?:plate|pax|person))?/gi,
      ' ',
    )
    .replace(
      /\s*(?:@|[-–—])?\s*(?:₹|rs\.?|inr)?\s*\d+(?:\.\d+)?\s*(?:per\s+plate|\/\s*plate|plate)\s*$/i,
      ' ',
    );

  if (hasPax) {
    cleaned = cleaned.replace(
      /\s+(?:₹|rs\.?|inr)?\s*\d+(?:\.\d+)?\s*(?:\/-)?\s*$/i,
      ' ',
    );
  }

  return cleaned
    .replace(/\s+/g, ' ')
    .trim();
}

function removeTimeDecoration(
  value: string,
): string {
  return value
    .replace(
      /\([^)]*(?:\btime\b|\btiming\b|\b(?:am|pm)\b)[^)]*\)/gi,
      ' ',
    )
    .replace(
      /\b(?:time|timing)\s*[:\-]?\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?(?:\s*(?:to|[-–—])\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?/gi,
      ' ',
    )
    .replace(
      /\s*(?:[-–—|]\s*)?\d{1,2}:\d{2}\s*(?:am|pm)(?:\s*(?:to|[-–—])\s*\d{1,2}:\d{2}\s*(?:am|pm))?\s*$/i,
      ' ',
    )
    .replace(/\s+/g, ' ')
    .trim();
}

function extractPax(
  value: string,
): {
  label: string;
  servicePax?: number;
} {
  let label = value;
  let servicePax: number | undefined;

  const leading = label.match(
    /\b(?:pax|members?|guests?|persons?|people)\s*[:\-]?\s*(\d{1,6})\b/i,
  );
  const trailing = label.match(
    /\b(\d{1,6})\s*(?:pax|members?|guests?|persons?|people)\b/i,
  );
  const match =
    leading ||
    trailing;

  if (match) {
    const count = Number(
      match[1],
    );

    if (
      Number.isFinite(count) &&
      count > 0
    ) {
      servicePax =
        Math.round(count);
    }

    label = label
      .replace(
        /\(?\s*(?:pax|members?|guests?|persons?|people)\s*[:\-]?\s*\d{1,6}\s*\)?/gi,
        ' ',
      )
      .replace(
        /\(?\s*\d{1,6}\s*(?:pax|members?|guests?|persons?|people)\s*\)?/gi,
        ' ',
      );
  }

  return {
    label:
      cleanLabel(label),
    servicePax,
  };
}

export function parseMenuServiceHeading(
  value: string,
): ParsedMenuServiceHeading | null {
  const withDay =
    splitLeadingDay(value);
  const rawLabel =
    cleanLabel(withDay.rest);

  if (!rawLabel) {
    return null;
  }

  const explicitPrefix =
    /^(?:function|meal|service)(?:\s+(?:name|type))?\s*[:\-]\s*/i;
  const hasExplicitPrefix =
    explicitPrefix.test(rawLabel);

  let label =
    rawLabel.replace(
      explicitPrefix,
      '',
    );

  const pax =
    extractPax(label);
  label =
    removeCommercialDecoration(
      removeTimeDecoration(
        pax.label,
      ),
      Boolean(
        pax.servicePax,
      ),
    )
      .replace(
        /\s+menu\s*$/i,
        '',
      )
      .replace(
        /^[\s:|\-–—]+|[\s:|\-–—]+$/g,
        '',
      )
      .trim();

  if (!label) {
    return null;
  }

  const normalized =
    normalizeLabel(label);
  const exact =
    SERVICE_LABELS[
      normalized
    ];

  if (exact) {
    return {
      dayLabel:
        withDay.dayLabel,
      mealLabel:
        exact,
      servicePax:
        pax.servicePax,
    };
  }

  const words =
    normalized
      .split(' ')
      .filter(Boolean);

  if (
    hasExplicitPrefix &&
    words.length >= 1 &&
    words.length <= 7
  ) {
    return {
      dayLabel:
        withDay.dayLabel,
      mealLabel:
        cleanLabel(label),
      servicePax:
        pax.servicePax,
    };
  }

  if (
    pax.servicePax &&
    words.length >= 1 &&
    words.length <= 7
  ) {
    return {
      dayLabel:
        withDay.dayLabel,
      mealLabel:
        cleanLabel(label),
      servicePax:
        pax.servicePax,
    };
  }

  const hasOccasion =
    words.some(
      (word) =>
        OCCASION_WORDS.has(
          word,
        ),
    );
  const hasMeal =
    words.some(
      (word) =>
        MEAL_WORDS.has(
          word,
        ),
    );

  if (
    hasOccasion &&
    hasMeal &&
    words.length <= 7
  ) {
    return {
      dayLabel:
        withDay.dayLabel,
      mealLabel:
        cleanLabel(label),
      servicePax:
        pax.servicePax,
    };
  }

  return null;
}
