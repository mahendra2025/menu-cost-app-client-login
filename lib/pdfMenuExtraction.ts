export type PdfMenuTextItem = {
  str: string;
  transform?: ArrayLike<number>;
  width?: number;
  height?: number;
  hasEOL?: boolean;
};

type PositionedText = {
  text: string;
  x: number;
  y: number;
  endX: number;
  height: number;
  hasEOL: boolean;
  sourceIndex: number;
  leadingSpace: boolean;
  trailingSpace: boolean;
};

type TextLine = {
  y: number;
  height: number;
  items: PositionedText[];
};

function cleanFragment(value: string) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/\u00ad/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function textHeight(item: PdfMenuTextItem) {
  const transform = item.transform;
  const transformHeight =
    transform && transform.length >= 4
      ? Math.hypot(
          Number(transform[2]) || 0,
          Number(transform[3]) || 0,
        )
      : 0;

  return Math.max(
    1,
    Number(item.height) || 0,
    transformHeight,
  );
}

function needsSpace(
  previous: PositionedText,
  current: PositionedText,
  gap: number,
) {
  if (
    previous.trailingSpace ||
    current.leadingSpace
  ) {
    return true;
  }

  if (
    /^[,.;:!?%)\]}]/u.test(
      current.text,
    ) ||
    /[(\[{]$/u.test(previous.text)
  ) {
    return false;
  }

  const touchingThreshold =
    Math.max(
      0.8,
      Math.min(
        previous.height,
        current.height,
      ) * 0.07,
    );

  return gap > touchingThreshold;
}

function fallbackText(
  items: PdfMenuTextItem[],
) {
  return items
    .map((item) => {
      const text = cleanFragment(
        item.str,
      );
      if (!text) return '';
      return `${text}${item.hasEOL ? '\n' : ' '}`;
    })
    .join('')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Reconstructs menu text from PDF coordinates instead of trusting the raw
 * content-stream order. Large horizontal gaps become line breaks so two
 * visual columns cannot be merged into one false dish name.
 */
export function reconstructPdfMenuText(
  items: PdfMenuTextItem[],
) {
  const positioned = items.flatMap(
    (item, sourceIndex) => {
      const original = String(
        item.str || '',
      );
      const text =
        cleanFragment(original);
      const transform =
        item.transform;

      if (
        !text ||
        !transform ||
        transform.length < 6
      ) {
        return [];
      }

      const x =
        Number(transform[4]) || 0;
      const y =
        Number(transform[5]) || 0;
      const height = textHeight(item);
      const width = Math.max(
        0,
        Number(item.width) || 0,
      );

      return [
        {
          text,
          x,
          y,
          endX: x + width,
          height,
          hasEOL: Boolean(
            item.hasEOL,
          ),
          sourceIndex,
          leadingSpace: /^\s/u.test(
            original,
          ),
          trailingSpace: /\s$/u.test(
            original,
          ),
        },
      ];
    },
  );

  if (
    !positioned.length ||
    positioned.length <
      Math.max(2, items.length * 0.35)
  ) {
    return fallbackText(items);
  }

  positioned.sort(
    (left, right) =>
      right.y - left.y ||
      left.x - right.x ||
      left.sourceIndex -
        right.sourceIndex,
  );

  const lines: TextLine[] = [];

  for (const item of positioned) {
    const matchingLine =
      lines.find((line) => {
        const tolerance = Math.max(
          2,
          Math.min(
            7,
            Math.max(
              line.height,
              item.height,
            ) * 0.45,
          ),
        );

        return (
          Math.abs(line.y - item.y) <=
          tolerance
        );
      });

    if (matchingLine) {
      matchingLine.items.push(item);
      matchingLine.y =
        (matchingLine.y *
          (matchingLine.items.length -
            1) +
          item.y) /
        matchingLine.items.length;
      matchingLine.height = Math.max(
        matchingLine.height,
        item.height,
      );
    } else {
      lines.push({
        y: item.y,
        height: item.height,
        items: [item],
      });
    }
  }

  return lines
    .sort(
      (left, right) =>
        right.y - left.y,
    )
    .flatMap((line) => {
      const row = [...line.items].sort(
        (left, right) =>
          left.x - right.x ||
          left.sourceIndex -
            right.sourceIndex,
      );
      const output: string[] = [];
      let currentLine = '';
      let previous:
        | PositionedText
        | undefined;

      for (const item of row) {
        if (!previous) {
          currentLine = item.text;
          previous = item;
          continue;
        }

        const gap =
          item.x - previous.endX;
        const columnGap = Math.max(
          26,
          Math.max(
            previous.height,
            item.height,
          ) * 2.4,
        );

        if (
          previous.hasEOL ||
          gap > columnGap
        ) {
          if (currentLine.trim()) {
            output.push(
              currentLine.trim(),
            );
          }
          currentLine = item.text;
        } else {
          currentLine += `${
            needsSpace(
              previous,
              item,
              gap,
            )
              ? ' '
              : ''
          }${item.text}`;
        }

        previous = item;
      }

      if (currentLine.trim()) {
        output.push(
          currentLine.trim(),
        );
      }

      return output;
    })
    .join('\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function pdfPageNeedsOcr(
  text: string,
  textItemCount: number,
) {
  const normalized = String(text || '')
    .normalize('NFKC')
    .trim();
  const letters =
    normalized.match(/\p{L}/gu)
      ?.length || 0;
  const visibleCharacters =
    normalized.replace(/\s/g, '')
      .length;
  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean).length;
  const brokenCharacters =
    normalized.match(
      /[\uFFFD\uE000-\uF8FF]/gu,
    )?.length || 0;

  return (
    textItemCount < 3 ||
    letters < 35 ||
    lines < 2 ||
    (visibleCharacters > 0 &&
      letters / visibleCharacters <
        0.35) ||
    brokenCharacters >
      Math.max(2, letters * 0.08)
  );
}
