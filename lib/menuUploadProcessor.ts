import {
  pdfPageNeedsOcr,
  reconstructPdfMenuText,
} from './pdfMenuExtraction';

type StatusCallback =
  (message: string) => void;

type CatalogBoostCallback =
  (text: string) =>
    Promise<number>;

export type MenuUploadExtraction = {
  text: string;
  sourceLabel: string;
};

type PreparedMenuPhoto = {
  original: HTMLCanvasElement;
  enhanced: HTMLCanvasElement;
};

async function prepareMenuPhoto(
  file: File,
): Promise<PreparedMenuPhoto> {
  let source: CanvasImageSource;
  let sourceWidth = 0;
  let sourceHeight = 0;
  let releaseSource = () => {};

  try {
    if (
      'createImageBitmap' in window
    ) {
      const bitmap =
        await createImageBitmap(
          file,
          {
            imageOrientation:
              'from-image',
          },
        );

      source = bitmap;
      sourceWidth =
        bitmap.width;
      sourceHeight =
        bitmap.height;

      releaseSource =
        () =>
          bitmap.close();
    } else {
      throw new Error(
        'ImageBitmap unavailable',
      );
    }
  } catch {
    const imageUrl =
      URL.createObjectURL(
        file,
      );

    const image =
      new Image();

    image.src =
      imageUrl;

    try {
      await image.decode();
    } catch {
      URL.revokeObjectURL(
        imageUrl,
      );

      throw new Error(
        'This photo format could not be opened. Please use a JPEG, PNG, or WebP photo.',
      );
    }

    source = image;
    sourceWidth =
      image.naturalWidth;

    sourceHeight =
      image.naturalHeight;

    releaseSource =
      () =>
        URL.revokeObjectURL(
          imageUrl,
        );
  }

  if (
    !sourceWidth ||
    !sourceHeight
  ) {
    releaseSource();

    throw new Error(
      'The selected photo has no readable image data.',
    );
  }

  const longestEdge =
    Math.max(
      sourceWidth,
      sourceHeight,
    );

  const shortestEdge =
    Math.min(
      sourceWidth,
      sourceHeight,
    );

  const maximumPixels =
    7_500_000;

  let scale =
    Math.min(
      3000 /
        longestEdge,

      Math.sqrt(
        maximumPixels /
          (
            sourceWidth *
            sourceHeight
          ),
      ),
    );

  if (
    scale > 1 &&
    shortestEdge * scale >
      1400
  ) {
    scale =
      Math.max(
        1,
        1400 /
          shortestEdge,
      );
  }

  const width =
    Math.max(
      1,
      Math.round(
        sourceWidth *
          scale,
      ),
    );

  const height =
    Math.max(
      1,
      Math.round(
        sourceHeight *
          scale,
      ),
    );

  const original =
    document.createElement(
      'canvas',
    );

  original.width =
    width;

  original.height =
    height;

  const originalContext =
    original.getContext(
      '2d',
    );

  if (!originalContext) {
    releaseSource();

    throw new Error(
      'Photo processing is not supported by this browser.',
    );
  }

  originalContext.fillStyle =
    '#fff';

  originalContext.fillRect(
    0,
    0,
    width,
    height,
  );

  originalContext
    .imageSmoothingEnabled =
      true;

  originalContext
    .imageSmoothingQuality =
      'high';

  originalContext.drawImage(
    source,
    0,
    0,
    width,
    height,
  );

  releaseSource();

  const enhanced =
    document.createElement(
      'canvas',
    );

  enhanced.width =
    width;

  enhanced.height =
    height;

  const enhancedContext =
    enhanced.getContext(
      '2d',
      {
        willReadFrequently:
          true,
      },
    );

  if (!enhancedContext) {
    original.width = 0;
    original.height = 0;

    throw new Error(
      'Photo enhancement is not supported by this browser.',
    );
  }

  enhancedContext.drawImage(
    original,
    0,
    0,
  );

  const pixels =
    enhancedContext
      .getImageData(
        0,
        0,
        width,
        height,
      );

  const histogram =
    new Uint32Array(
      256,
    );

  let luminanceTotal =
    0;

  for (
    let index = 0;
    index <
    pixels.data.length;
    index += 4
  ) {
    const luminance =
      Math.round(
        pixels.data[
          index
        ] *
          0.2126 +
          pixels.data[
            index + 1
          ] *
            0.7152 +
          pixels.data[
            index + 2
          ] *
            0.0722,
      );

    histogram[
      luminance
    ] += 1;

    luminanceTotal +=
      luminance;
  }

  const pixelCount =
    width * height;

  const percentileCount =
    pixelCount *
    0.015;

  let low = 0;
  let high = 255;
  let accumulated = 0;

  for (
    let value = 0;
    value < 256;
    value += 1
  ) {
    accumulated +=
      histogram[value];

    if (
      accumulated >=
      percentileCount
    ) {
      low = value;
      break;
    }
  }

  accumulated = 0;

  for (
    let value = 255;
    value >= 0;
    value -= 1
  ) {
    accumulated +=
      histogram[value];

    if (
      accumulated >=
      percentileCount
    ) {
      high = value;
      break;
    }
  }

  const range =
    Math.max(
      32,
      high - low,
    );

  const invert =
    luminanceTotal /
      pixelCount <
    105;

  for (
    let index = 0;
    index <
    pixels.data.length;
    index += 4
  ) {
    const luminance =
      pixels.data[
        index
      ] *
        0.2126 +
      pixels.data[
        index + 1
      ] *
        0.7152 +
      pixels.data[
        index + 2
      ] *
        0.0722;

    let adjusted =
      Math.max(
        0,
        Math.min(
          255,
          (
            (
              luminance -
              low
            ) *
            255
          ) /
            range,
        ),
      );

    if (invert) {
      adjusted =
        255 -
        adjusted;
    }

    pixels.data[
      index
    ] = adjusted;

    pixels.data[
      index + 1
    ] = adjusted;

    pixels.data[
      index + 2
    ] = adjusted;

    pixels.data[
      index + 3
    ] = 255;
  }

  enhancedContext
    .putImageData(
      pixels,
      0,
      0,
    );

  return {
    original,
    enhanced,
  };
}

function ocrResultScore(
  text: string,
  confidence: number,
) {
  const usefulCharacters =
    text.match(
      /[\p{L}\p{N}]/gu,
    )?.length ?? 0;

  const lines =
    text
      .split(/\r?\n/)
      .filter(
        (line) =>
          /[\p{L}\p{N}]/u
            .test(line),
      )
      .length;

  return (
    confidence +
    Math.min(
      20,
      usefulCharacters /
        8,
    ) +
    Math.min(
      15,
      lines * 1.5,
    )
  );
}

export async function extractPdfMenu(
  file: File,
  onStatus:
    StatusCallback,
): Promise<MenuUploadExtraction> {
  if (
    file.size >
    15 *
      1024 *
      1024
  ) {
    throw new Error(
      'Choose a PDF smaller than 15 MB.',
    );
  }

  onStatus(
    'Loading PDF reader...',
  );

  const pdfjs =
    await import(
      'pdfjs-dist'
    );

  pdfjs
    .GlobalWorkerOptions
    .workerSrc =
      new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url,
      ).toString();

  const pdf =
    await pdfjs
      .getDocument({
        data:
          await file
            .arrayBuffer(),
      })
      .promise;

  if (
    pdf.numPages >
    30
  ) {
    throw new Error(
      'Choose a PDF with 30 pages or fewer.',
    );
  }

  const pages:
    string[] = [];

  let ocrPageCount =
    0;

  let activeOcrPage =
    0;

  type PdfOcrWorker =
    Awaited<
      ReturnType<
        (
          typeof import(
            'tesseract.js'
          )
        )[
          'createWorker'
        ]
      >
    >;

  let ocrWorker:
    | PdfOcrWorker
    | null = null;

  const createdWorkers:
    PdfOcrWorker[] = [];

  async function getWorker() {
    if (ocrWorker) {
      return ocrWorker;
    }

    const tesseract =
      await import(
        'tesseract.js'
      );

    const options = {
      logger: (
        message: {
          status: string;
          progress?:
            number;
        },
      ) => {
        if (
          message.status ===
          'recognizing text'
        ) {
          onStatus(
            `Scanning PDF page ${activeOcrPage} of ${pdf.numPages}... ${Math.round((message.progress ?? 0) * 100)}%`,
          );
        }
      },
    };

    try {
      ocrWorker =
        await tesseract
          .createWorker(
            [
              'eng',
              'hin',
              'guj',
            ],
            undefined,
            options,
          );
    } catch {
      onStatus(
        `Loading standard PDF recognition for page ${activeOcrPage}...`,
      );

      ocrWorker =
        await tesseract
          .createWorker(
            'eng',
            undefined,
            options,
          );
    }

    createdWorkers.push(
      ocrWorker,
    );

    await ocrWorker
      .setParameters({
        tessedit_pageseg_mode:
          tesseract
            .PSM
            .SPARSE_TEXT,

        preserve_interword_spaces:
          '1',

        user_defined_dpi:
          '220',
      });

    return ocrWorker;
  }

  try {
    for (
      let pageNumber =
        1;
      pageNumber <=
      pdf.numPages;
      pageNumber += 1
    ) {
      onStatus(
        `Reading PDF page ${pageNumber} of ${pdf.numPages}...`,
      );

      const page =
        await pdf
          .getPage(
            pageNumber,
          );

      const content =
        await page
          .getTextContent();

      const textItems =
        content.items.filter(
          (
            item,
          ): item is Extract<
            (
              typeof content
                .items
            )[number],
            {
              str: string;
            }
          > =>
            'str' in
            item,
        );

      let pageText =
        reconstructPdfMenuText(
          textItems,
        );

      if (
        pdfPageNeedsOcr(
          pageText,
          textItems.length,
        )
      ) {
        activeOcrPage =
          pageNumber;

        try {
          const baseViewport =
            page.getViewport({
              scale: 1,
            });

          const scale =
            Math.min(
              2.4,
              2400 /
                Math.max(
                  baseViewport
                    .width,

                  baseViewport
                    .height,
                ),
            );

          const viewport =
            page.getViewport({
              scale:
                Math.max(
                  1.5,
                  scale,
                ),
            });

          const canvas =
            document
              .createElement(
                'canvas',
              );

          canvas.width =
            Math.ceil(
              viewport.width,
            );

          canvas.height =
            Math.ceil(
              viewport.height,
            );

          try {
            await page
              .render({
                canvas,
                viewport,
              })
              .promise;

            const worker =
              await getWorker();

            const result =
              await worker
                .recognize(
                  canvas,
                );

            const ocrText =
              result
                .data
                .text
                .replace(
                  /\u0000/g,
                  '',
                )
                .trim();

            if (ocrText) {
              pageText =
                ocrText;

              ocrPageCount +=
                1;
            }
          } finally {
            canvas.width =
              0;

            canvas.height =
              0;
          }
        } catch (
          error
        ) {
          console.warn(
            `OCR failed for PDF page ${pageNumber}:`,
            error,
          );
        }
      }

      if (pageText) {
        pages.push(
          pageText,
        );
      }
    }
  } finally {
    await Promise.all(
      createdWorkers.map(
        (worker) =>
          worker
            .terminate(),
      ),
    );
  }

  return {
    text:
      pages.join(
        '\n\n',
      ),

    sourceLabel:
      ocrPageCount > 0
        ? 'PDF with OCR'
        : 'PDF',
  };
}

export async function extractMenuPhoto(
  file: File,
  onStatus:
    StatusCallback,
  catalogBoost?:
    CatalogBoostCallback,
): Promise<MenuUploadExtraction> {
  if (
    file.size >
    20 *
      1024 *
      1024
  ) {
    throw new Error(
      'Choose a photo smaller than 20 MB.',
    );
  }

  if (
    file.type &&
    !file.type
      .startsWith(
        'image/',
      )
  ) {
    throw new Error(
      'Choose a valid image file.',
    );
  }

  onStatus(
    'Preparing menu photo...',
  );

  let prepared:
    | PreparedMenuPhoto
    | null = null;

  try {
    prepared =
      await prepareMenuPhoto(
        file,
      );

    onStatus(
      'Improving photo clarity for menu detection...',
    );

    const {
      createWorker,
      PSM,
    } =
      await import(
        'tesseract.js'
      );

    let worker:
      | Awaited<
          ReturnType<
            typeof createWorker
          >
        >
      | null = null;

    let recognitionPass =
      'Reading improved menu photo';

    try {
      const options = {
        logger: (
          message: {
            status:
              string;
            progress?:
              number;
          },
        ) => {
          if (
            message.status ===
            'recognizing text'
          ) {
            onStatus(
              `${recognitionPass}... ${Math.round((message.progress ?? 0) * 100)}%`,
            );
          }
        },
      };

      try {
        worker =
          await createWorker(
            [
              'eng',
              'hin',
              'guj',
            ],
            undefined,
            options,
          );
      } catch {
        onStatus(
          'Loading standard photo recognition...',
        );

        worker =
          await createWorker(
            'eng',
            undefined,
            options,
          );
      }

      await worker
        .setParameters({
          tessedit_pageseg_mode:
            PSM
              .SPARSE_TEXT,

          preserve_interword_spaces:
            '1',

          user_defined_dpi:
            '220',
        });

      const enhancedResult =
        await worker
          .recognize(
            prepared
              .enhanced,
            {
              rotateAuto:
                true,
            },
          );

      recognitionPass =
        'Checking original photo';

      await worker
        .setParameters({
          tessedit_pageseg_mode:
            PSM.AUTO,
        });

      const originalResult =
        await worker
          .recognize(
            prepared
              .original,
            {
              rotateAuto:
                true,
            },
          );

      onStatus(
        'Validating detected dishes against the catalog...',
      );

      const [
        enhancedBoost,
        originalBoost,
      ] =
        await Promise.all([
          catalogBoost
            ? catalogBoost(
                enhancedResult
                  .data
                  .text,
              )
            : Promise.resolve(
                0,
              ),

          catalogBoost
            ? catalogBoost(
                originalResult
                  .data
                  .text,
              )
            : Promise.resolve(
                0,
              ),
        ]);

      const enhancedScore =
        enhancedBoost +
        ocrResultScore(
          enhancedResult
            .data
            .text,

          enhancedResult
            .data
            .confidence,
        );

      const originalScore =
        originalBoost +
        ocrResultScore(
          originalResult
            .data
            .text,

          originalResult
            .data
            .confidence,
        );

      const bestResult =
        originalScore >
        enhancedScore
          ? originalResult
          : enhancedResult;

      return {
        text:
          bestResult
            .data
            .text,

        sourceLabel:
          'Menu photo',
      };

    } finally {
      await worker
        ?.terminate();
    }

  } finally {
    if (prepared) {
      prepared
        .original
        .width = 0;

      prepared
        .original
        .height = 0;

      prepared
        .enhanced
        .width = 0;

      prepared
        .enhanced
        .height = 0;
    }
  }
}
