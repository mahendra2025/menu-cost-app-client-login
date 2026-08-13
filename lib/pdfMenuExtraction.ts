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

type TextSegment = {
  text: string;
  x: number;
  endX: number;
  y: number;
};

export type PdfMenuReconstructionOptions = {
  pageWidth?: number;
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

function lineSegments(
  line: TextLine,
): TextSegment[] {
  const row = [...line.items].sort(
    (left, right) =>
      left.x - right.x ||
      left.sourceIndex - right.sourceIndex,
  );
  const output: TextSegment[] = [];
  let currentText = '';
  let currentX = 0;
  let currentEndX = 0;
  let previous: PositionedText | undefined;

  function commit() {
    if (!currentText.trim()) return;
    output.push({
      text: currentText.trim(),
      x: currentX,
      endX: currentEndX,
      y: line.y,
    });
  }

  for (const item of row) {
    if (!previous) {
      currentText = item.text;
      currentX = item.x;
      currentEndX = item.endX;
      previous = item;
      continue;
    }

    const gap = item.x - previous.endX;
    const columnGap = Math.max(
      26,
      Math.max(previous.height, item.height) * 2.4,
    );

    if (previous.hasEOL || gap > columnGap) {
      commit();
      currentText = item.text;
      currentX = item.x;
      currentEndX = item.endX;
    } else {
      currentText += `${needsSpace(previous, item, gap) ? ' ' : ''}${item.text}`;
      currentEndX = Math.max(currentEndX, item.endX);
    }

    previous = item;
  }

  commit();
  return output;
}

function reconstructColumnMajor(
  segmentsByLine: TextSegment[][],
  pageWidth: number,
) {
  const multiColumnRows = segmentsByLine.filter(
    (segments) => segments.length >= 2,
  );

  if (multiColumnRows.length < 3) return '';

  const starts = multiColumnRows
    .flat()
    .map((segment) => segment.x)
    .sort((left, right) => left - right);
  const tolerance = Math.max(24, pageWidth * 0.075);
  const clusters: Array<{ x: number; count: number }> = [];

  starts.forEach((x) => {
    const cluster = clusters.find(
      (candidate) => Math.abs(candidate.x - x) <= tolerance,
    );

    if (!cluster) {
      clusters.push({ x, count: 1 });
      return;
    }

    cluster.x =
      (cluster.x * cluster.count + x) /
      (cluster.count + 1);
    cluster.count += 1;
  });

  const anchors = clusters
    .filter((cluster) => cluster.count >= 3)
    .sort((left, right) => left.x - right.x)
    .reduce<Array<{ x: number; count: number }>>(
      (kept, cluster) => {
        const previous = kept.at(-1);
        if (
          previous &&
          cluster.x - previous.x < pageWidth * 0.16
        ) {
          if (cluster.count > previous.count) {
            kept[kept.length - 1] = cluster;
          }
          return kept;
        }

        kept.push(cluster);
        return kept;
      },
      [],
    )
    .slice(0, 3);

  if (anchors.length < 2) return '';

  const columns = anchors.map(() => [] as TextSegment[]);

  segmentsByLine.flat().forEach((segment) => {
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    anchors.forEach((anchor, index) => {
      const distance = Math.abs(anchor.x - segment.x);
      if (distance < closestDistance) {
        closestIndex = index;
        closestDistance = distance;
      }
    });

    columns[closestIndex].push(segment);
  });

  if (columns.some((column) => column.length < 3)) return '';

  return columns
    .map((column) =>
      column
        .sort((left, right) => right.y - left.y || left.x - right.x)
        .map((segment) => segment.text)
        .join('\n'),
    )
    .join('\n\n');
}

/**
 * Reconstructs menu text from PDF coordinates instead of trusting the raw
 * content-stream order. Large horizontal gaps become line breaks so two
 * visual columns cannot be merged into one false dish name.
 */
export function reconstructPdfMenuText(
  items: PdfMenuTextItem[],
  options: PdfMenuReconstructionOptions = {},
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

  const sortedLines = lines.sort(
    (left, right) => right.y - left.y,
  );
  const segmentsByLine = sortedLines.map(lineSegments);
  const detectedPageWidth = Math.max(
    Number(options.pageWidth) || 0,
    ...positioned.map((item) => item.endX),
  );
  const columnMajorText = reconstructColumnMajor(
    segmentsByLine,
    detectedPageWidth,
  );

  return (columnMajorText || segmentsByLine
    .flat()
    .map((segment) => segment.text)
    .join('\n'))
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
  const singleCharacterLines = normalized
    .split('\n')
    .map((line) => line.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter((line) => line.length === 1)
    .length;

  return (
    textItemCount < 3 ||
    letters < 35 ||
    lines < 2 ||
    (textItemCount > 20 && lines < 4) ||
    singleCharacterLines > Math.max(3, lines * 0.35) ||
    (visibleCharacters > 0 &&
      letters / visibleCharacters <
        0.35) ||
    brokenCharacters >
      Math.max(2, letters * 0.08)
  );
}
