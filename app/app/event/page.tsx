'use client';

import {
  useEffect,
  useState,
} from 'react';

import { useRouter } from 'next/navigation';

import FreeLimitPaywall from '../../components/FreeLimitPaywall';

import AppShell, {
  LockedCard,
} from '../../components/AppShell';

import {
  pdfPageNeedsOcr,
  reconstructPdfMenuText,
} from '../../../lib/pdfMenuExtraction';

import {
  findPendingDishCandidates,
  flushWorkSave,
  getSession,
  loadWork,
  parseMenuText,
  saveWork,
  uid,
} from '../../../lib/store';

import {
  getCostingAnalyticsKey,
  trackProductEvent,
} from '../../../lib/productAnalytics';

import type {
  EventDetails,
  MenuItem,
  Session,
  WorkState,
} from '../../../lib/types';

const SAMPLE_MENU = `Day 1 • Dinner • 300 Members
Welcome Drink
Orange Juice

Starter
Paneer Tikka
Hara Bhara Kebab

Main Course
Paneer Butter Masala
Dal Fry
Jeera Rice
Butter Naan

Sweet
Gulab Jamun`;

type DetectedEventDetails = Partial<
  Pick<
    EventDetails,
    | 'clientName'
    | 'eventName'
    | 'eventDate'
    | 'functionType'
    | 'pax'
    | 'city'
    | 'venue'
  >
>;

type MenuDetectionPreview = {
  menu: MenuItem[];
  eventDetails: DetectedEventDetails;
};

const EVENT_DETAIL_LABELS: Record<
  keyof DetectedEventDetails,
  string
> = {
  clientName: 'Client',
  eventName: 'Event',
  eventDate: 'Date',
  functionType: 'Function',
  pax: 'Guests',
  city: 'City',
  venue: 'Venue',
};

function parseDetectedDate(
  value: string,
): string | undefined {
  const cleaned = value
    .replace(/[,|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const numericDate = cleaned.match(
    /\b(\d{1,4})[./-](\d{1,2})[./-](\d{1,4})\b/,
  );

  if (numericDate) {
    const first = Number(numericDate[1]);
    const second = Number(numericDate[2]);
    const third = Number(numericDate[3]);
    const year =
      first > 1900
        ? first
        : third < 100
          ? 2000 + third
          : third;
    const month =
      first > 1900 ? second : second;
    const day =
      first > 1900 ? third : first;

    if (
      year >= 2000 &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31
    ) {
      return [
        String(year).padStart(4, '0'),
        String(month).padStart(2, '0'),
        String(day).padStart(2, '0'),
      ].join('-');
    }
  }

  const parsedTime = Date.parse(cleaned);

  if (!Number.isNaN(parsedTime)) {
    const parsedDate = new Date(parsedTime);

    return [
      parsedDate.getFullYear(),
      String(parsedDate.getMonth() + 1).padStart(2, '0'),
      String(parsedDate.getDate()).padStart(2, '0'),
    ].join('-');
  }

  return undefined;
}

function detectEventDetails(
  text: string,
): DetectedEventDetails {
  const detected: DetectedEventDetails = {};
  const lines = text
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^[\s•●▪►*-]+/, '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean);

  const fieldPatterns: Array<{
    key: Exclude<
      keyof DetectedEventDetails,
      'eventDate' | 'pax'
    >;
    pattern: RegExp;
  }> = [
    {
      key: 'clientName',
      pattern:
        /^(?:client(?:\s+name)?|customer(?:\s+name)?|party\s+name)\s*[:=-]\s*(.+)$/i,
    },
    {
      key: 'eventName',
      pattern:
        /^(?:event(?:\s+name)?|occasion|program(?:me)?)\s*[:=-]\s*(.+)$/i,
    },
    {
      key: 'functionType',
      pattern:
        /^(?:function(?:\s+type)?|meal(?:\s+type)?|service)\s*[:=-]\s*(.+)$/i,
    },
    {
      key: 'venue',
      pattern:
        /^(?:venue|location|address)\s*[:=-]\s*(.+)$/i,
    },
    {
      key: 'city',
      pattern:
        /^(?:city|town)\s*[:=-]\s*(.+)$/i,
    },
  ];

  for (const line of lines.slice(0, 80)) {
    for (const { key, pattern } of fieldPatterns) {
      if (detected[key]) continue;

      const match = line.match(pattern);
      const value = match?.[1]?.trim();

      if (value && value.length <= 160) {
        detected[key] = value;
      }
    }

    if (!detected.eventDate) {
      const dateMatch = line.match(
        /^(?:event\s+date|date|on)\s*[:=-]\s*(.+)$/i,
      );
      const parsedDate =
        dateMatch?.[1]
          ? parseDetectedDate(dateMatch[1])
          : undefined;

      if (parsedDate) {
        detected.eventDate = parsedDate;
      }
    }

    const labeledPax = line.match(
      /^(?:pax|guests?|members?|persons?|people)\s*[:=-]?\s*(\d{1,6})\b/i,
    );
    const trailingPax = line.match(
      /\b(\d{1,6})\s*(?:pax|guests?|members?|persons?|people)\b/i,
    );
    const pax = Number(
      labeledPax?.[1] ||
        trailingPax?.[1] ||
        0,
    );

    if (pax > Number(detected.pax || 0)) {
      detected.pax = pax;
    }
  }

  return detected;
}

function mergeDetectedEventDetails(
  event: EventDetails,
  detected: DetectedEventDetails,
): EventDetails {
  const nextEvent = { ...event };

  for (const [
    key,
    value,
  ] of Object.entries(detected) as Array<
    [
      keyof DetectedEventDetails,
      string | number,
    ]
  >) {
    if (
      key === 'pax'
        ? !(Number(nextEvent.pax) > 0)
        : !String(nextEvent[key] ?? '').trim()
    ) {
      Object.assign(nextEvent, {
        [key]: value,
      });
    }
  }

  return nextEvent;
}

function menuItemIdentity(
  item: MenuItem,
): string {
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const serviceKey =
    item.serviceId ||
    `${normalize(item.dayLabel || 'event')}::${normalize(item.mealLabel || 'event menu')}`;

  return `${serviceKey}::${normalize(item.name)}::${normalize(item.category)}`;
}

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
    if ('createImageBitmap' in window) {
      const bitmap = await createImageBitmap(
        file,
        { imageOrientation: 'from-image' },
      );
      source = bitmap;
      sourceWidth = bitmap.width;
      sourceHeight = bitmap.height;
      releaseSource = () => bitmap.close();
    } else {
      throw new Error('ImageBitmap is unavailable');
    }
  } catch {
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();
    image.src = imageUrl;

    try {
      await image.decode();
    } catch {
      URL.revokeObjectURL(imageUrl);
      throw new Error(
        'This photo format could not be opened. Please use a JPEG, PNG, or WebP photo.',
      );
    }

    source = image;
    sourceWidth = image.naturalWidth;
    sourceHeight = image.naturalHeight;
    releaseSource = () =>
      URL.revokeObjectURL(imageUrl);
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

  const longestEdge = Math.max(
    sourceWidth,
    sourceHeight,
  );
  const shortestEdge = Math.min(
    sourceWidth,
    sourceHeight,
  );
  const maximumPixels = 7_500_000;
  let scale = Math.min(
    3000 / longestEdge,
    Math.sqrt(
      maximumPixels /
        (sourceWidth * sourceHeight),
    ),
  );

  if (
    scale > 1 &&
    shortestEdge * scale > 1400
  ) {
    scale = Math.max(
      1,
      1400 / shortestEdge,
    );
  }

  const width = Math.max(
    1,
    Math.round(sourceWidth * scale),
  );
  const height = Math.max(
    1,
    Math.round(sourceHeight * scale),
  );
  const original =
    document.createElement('canvas');
  original.width = width;
  original.height = height;
  const originalContext =
    original.getContext('2d');

  if (!originalContext) {
    releaseSource();
    throw new Error(
      'Photo processing is not supported by this browser.',
    );
  }

  originalContext.fillStyle = '#fff';
  originalContext.fillRect(
    0,
    0,
    width,
    height,
  );
  originalContext.imageSmoothingEnabled = true;
  originalContext.imageSmoothingQuality = 'high';
  originalContext.drawImage(
    source,
    0,
    0,
    width,
    height,
  );
  releaseSource();

  const enhanced =
    document.createElement('canvas');
  enhanced.width = width;
  enhanced.height = height;
  const enhancedContext =
    enhanced.getContext('2d', {
      willReadFrequently: true,
    });

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
    enhancedContext.getImageData(
      0,
      0,
      width,
      height,
    );
  const histogram =
    new Uint32Array(256);
  let luminanceTotal = 0;

  for (
    let index = 0;
    index < pixels.data.length;
    index += 4
  ) {
    const luminance = Math.round(
      pixels.data[index] * 0.2126 +
        pixels.data[index + 1] * 0.7152 +
        pixels.data[index + 2] * 0.0722,
    );
    histogram[luminance] += 1;
    luminanceTotal += luminance;
  }

  const pixelCount = width * height;
  const percentileCount =
    pixelCount * 0.015;
  let low = 0;
  let high = 255;
  let accumulated = 0;

  for (
    let value = 0;
    value < 256;
    value += 1
  ) {
    accumulated += histogram[value];
    if (accumulated >= percentileCount) {
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
    accumulated += histogram[value];
    if (accumulated >= percentileCount) {
      high = value;
      break;
    }
  }

  const range = Math.max(
    32,
    high - low,
  );
  const invert =
    luminanceTotal /
      pixelCount <
    105;

  for (
    let index = 0;
    index < pixels.data.length;
    index += 4
  ) {
    const luminance =
      pixels.data[index] * 0.2126 +
      pixels.data[index + 1] * 0.7152 +
      pixels.data[index + 2] * 0.0722;
    let adjusted = Math.max(
      0,
      Math.min(
        255,
        ((luminance - low) * 255) /
          range,
      ),
    );

    if (invert) adjusted = 255 - adjusted;
    pixels.data[index] = adjusted;
    pixels.data[index + 1] = adjusted;
    pixels.data[index + 2] = adjusted;
    pixels.data[index + 3] = 255;
  }

  enhancedContext.putImageData(
    pixels,
    0,
    0,
  );

  return { original, enhanced };
}

function ocrResultScore(
  text: string,
  confidence: number,
) {
  const usefulCharacters =
    text.match(/[\p{L}\p{N}]/gu)
      ?.length ?? 0;
  const lines = text
    .split(/\r?\n/)
    .filter((line) =>
      /[\p{L}\p{N}]/u.test(line),
    ).length;

  return (
    confidence +
    Math.min(20, usefulCharacters / 8) +
    Math.min(15, lines * 1.5)
  );
}

export default function EventPage() {
  const router = useRouter();

  const [session, setSession] =
    useState<Session | null>(null);

  const [work, setWork] =
    useState<WorkState | null>(null);

  const [detecting, setDetecting] =
    useState(false);

  const [error, setError] =
    useState('');

  const [freeLimitBlocked, setFreeLimitBlocked] = useState(false);

  const [uploading, setUploading] =
    useState<'pdf' | 'camera' | null>(null);

  const [uploadStatus, setUploadStatus] =
    useState('');

  const [detectedEventDetails, setDetectedEventDetails] =
    useState<DetectedEventDetails>({});

  const [detectionPreview, setDetectionPreview] =
    useState<MenuDetectionPreview | null>(null);

  const [manualRateIds, setManualRateIds] =
    useState<Set<string>>(
      () => new Set(),
    );

  const [selectedPreviewIds, setSelectedPreviewIds] =
    useState<Set<string>>(
      () => new Set(),
    );

  useEffect(() => {
    const currentSession = getSession();

    setSession(currentSession);

    if (currentSession) {
      const savedWork = loadWork(
        currentSession.tenantId,
      );

      setWork(savedWork);
    }
  }, []);

  function persistWork(
    nextWork: WorkState,
  ) {
    if (!session) return;

    setWork(nextWork);

    saveWork(
      session.tenantId,
      nextWork,
    );
  }

  function updateEvent(
    key: keyof WorkState['event'],
    value: string | number,
  ) {
    if (!work) return;

    const nextWork: WorkState = {
      ...work,

      event: {
        ...work.event,
        [key]: value,
      },
    };

    persistWork(nextWork);
  }

  async function detectAndNext() {
    if (
      !work ||
      !session ||
      detecting
    ) {
      return;
    }

    const rawMenuText =
      work.event.rawMenuText.trim();

    setError('');
    setManualRateIds(new Set());

    if (!rawMenuText) {
      setError(
        'Please paste the menu before continuing.',
      );

      return;
    }

    setDetecting(true);

    try {
      /*
       * Refresh the PostgreSQL-backed dish catalog before parsing.
       * This ensures newly added Admin dishes can be detected even
       * when this browser still has an older local catalog.
       */
      const { syncDishCostItemsFromServer } =
        await import('../../../lib/dishCostMaster');
      await syncDishCostItemsFromServer();

      const [
        catalogMenu,
        pendingCandidates,
      ] = await Promise.all([
        parseMenuText(rawMenuText),
        findPendingDishCandidates(
          rawMenuText,
        ),
      ]);
      const manualMenu: MenuItem[] =
        pendingCandidates.map(
          (candidate) => ({
            id: uid('dish'),
            name: candidate.name,
            category:
              candidate.categoryHint ||
              'Other',
            costPerPlate: 0,
            portionQuantity: 1,
            portionUnit: 'serving',
            serviceId:
              candidate.serviceId,
            dayLabel:
              candidate.dayLabel,
            mealLabel:
              candidate.mealLabel,
            servicePax:
              candidate.servicePax,
          }),
        );
      const detectedMenu = [
        ...catalogMenu,
        ...manualMenu,
      ];

      console.log(
        'Detected menu:',
        detectedMenu,
      );

      if (!detectedMenu.length) {
        setError(
          'No likely dishes were found. Check the extracted menu text and try again.',
        );

        return;
      }

      console.info(
        `Menu detection complete: ${catalogMenu.length} catalog dishes and ${manualMenu.length} dishes needing manual rates.`,
      );

      const detectedDetails =
        detectEventDetails(rawMenuText);

      setDetectedEventDetails(
        detectedDetails,
      );
      setDetectionPreview({
        menu: detectedMenu,
        eventDetails: detectedDetails,
      });
      void trackProductEvent(
        'menu_detected',
        {
          dishCount:
            detectedMenu.length,
          catalogDishCount:
            catalogMenu.length,
          missingRateCount:
            manualMenu.length,
          source:
            work.event.uploadFileName
              ? 'upload'
              : 'text',
        },
      );

      setManualRateIds(
        new Set(
          manualMenu.map(
            (item) => item.id,
          ),
        ),
      );
      setSelectedPreviewIds(
        new Set(
          detectedMenu.map(
            (item) => item.id,
          ),
        ),
      );

      window.setTimeout(() => {
        document
          .getElementById('menuDetectionPreview')
          ?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
      }, 80);
    } catch (detectError) {
      console.error(
        'Menu detection error:',
        detectError,
      );

      setError(
        detectError instanceof Error
          ? detectError.message
          : 'Menu detection failed. Please try again.',
      );
    } finally {
      setDetecting(false);
    }
  }

  async function applyDetectionPreview(
    mode: 'replace' | 'merge',
  ) {
    if (
      !work ||
      !session ||
      !detectionPreview
    ) {
      return;
    }

    const selectedMenu =
      detectionPreview.menu.filter(
        (item) =>
          selectedPreviewIds.has(
            item.id,
          ),
      );

    if (!selectedMenu.length) {
      setError(
        'Select at least one detected dish before continuing.',
      );
      return;
    }

    setFreeLimitBlocked(false);

    try {
      const usageResponse = await fetch(
        `/api/client/free-usage?costingId=${encodeURIComponent(work.costingId)}`,
        { cache: 'no-store' },
      );
      if (!usageResponse.ok) {
        setError('Could not verify your costing allowance. Please try again.');
        return;
      }
      const usage = await usageResponse.json();
      if (!usage.canUseCurrentCosting) {
        setFreeLimitBlocked(true);
        setError('Your 5 free costings are used. Upgrade to Pro to start a new costing.');
        return;
      }
    } catch {
      setError('Could not verify your costing allowance. Please try again.');
      return;
    }

    let nextMenu = selectedMenu;

    if (mode === 'merge') {
      const existingKeys =
        new Set(
          work.menu.map(
            menuItemIdentity,
          ),
        );

      nextMenu = [
        ...work.menu,
        ...selectedMenu.filter(
          (item) =>
            !existingKeys.has(
              menuItemIdentity(item),
            ),
        ),
      ];
    }

    const nextWork: WorkState = {
      ...work,
      event:
        mergeDetectedEventDetails(
          work.event,
          detectionPreview.eventDetails,
        ),
      menu: nextMenu,
    };

    try {
      const newDishCandidates =
        selectedMenu
          .filter((item) =>
            manualRateIds.has(item.id),
          )
          .map((item) => ({
            name: item.name,
            categoryHint:
              item.category || 'Other',
          }));

      if (newDishCandidates.length) {
        const suggestionResponse =
          await fetch(
            '/api/dish-suggestions',
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json',
              },
              body: JSON.stringify({
                sourceFileName:
                  work.event
                    .uploadFileName ||
                  'Pasted menu',
                candidates:
                  newDishCandidates,
              }),
            },
          );

        if (!suggestionResponse.ok) {
          const suggestionData =
            (await suggestionResponse
              .json()
              .catch(() => ({}))) as {
              error?: string;
            };

          throw new Error(
            suggestionData.error ||
              'New dishes could not be sent for admin review. Please try again.',
          );
        }
      }

      persistWork(nextWork);

      // Complete local-storage saving before opening the next page.
      flushWorkSave(session.tenantId);

      const costingKey =
        getCostingAnalyticsKey(
          nextWork,
        );

      void trackProductEvent(
        'menu_saved',
        {
          costingKey,
          dishCount:
            nextWork.menu.length,
          mode,
        },
        {
          onceKey:
            `menu_saved:${costingKey}`,
        },
      );

      // Full navigation prevents the next page from getting stuck.
      window.location.assign('/app/manpower');
    } catch (saveError) {
      console.error(
        'Detected menu save failed:',
        saveError,
      );

      setError(
        saveError instanceof Error
          ? saveError.message
          : 'The detected menu could not be saved. Please try again.',
      );
    }
  }

  function saveExtractedMenu(
    fileName: string,
    extractedText: string,
    sourceLabel: string,
  ) {
    if (!work) return;

    const cleanedText = extractedText
      .replace(/\u0000/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (!cleanedText) {
      throw new Error(
        `${sourceLabel} did not contain readable menu text. Try a clearer photo or paste the menu manually.`,
      );
    }

    const detectedDetails =
      detectEventDetails(cleanedText);
    const detectedDetailCount =
      Object.keys(detectedDetails).length;

    const nextWork: WorkState = {
      ...work,
      event: {
        ...mergeDetectedEventDetails(
          work.event,
          detectedDetails,
        ),
        uploadFileName: fileName,
        rawMenuText: cleanedText,
      },
    };

    persistWork(nextWork);
    setDetectionPreview(null);
    setSelectedPreviewIds(new Set());
    setDetectedEventDetails(
      detectedDetails,
    );
    setUploadStatus(
      detectedDetailCount > 0
        ? `${sourceLabel} read successfully. ${detectedDetailCount} event detail${detectedDetailCount === 1 ? '' : 's'} found and empty fields were filled.`
        : `${sourceLabel} read successfully. Review the extracted text below, then continue.`,
    );
  }

  async function readPdf(file: File) {
    setError('');
    setUploadStatus('Reading PDF pages...');
    setUploading('pdf');

    try {
      if (file.size > 15 * 1024 * 1024) {
        throw new Error('Choose a PDF smaller than 15 MB.');
      }

      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url,
      ).toString();

      const pdf = await pdfjs.getDocument({
        data: await file.arrayBuffer(),
      }).promise;

      if (pdf.numPages > 30) {
        throw new Error('Choose a PDF with 30 pages or fewer.');
      }

      const pages: string[] = [];
      let ocrPageCount = 0;
      let activeOcrPage = 0;
      type PdfOcrWorker =
        Awaited<
          ReturnType<
            (typeof import('tesseract.js'))['createWorker']
          >
        >;
      let ocrWorker:
        | PdfOcrWorker
        | null = null;
      const createdOcrWorkers:
        PdfOcrWorker[] = [];

      async function getOcrWorker() {
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
              progress?: number;
            },
          ) => {
            if (
              message.status ===
              'recognizing text'
            ) {
              setUploadStatus(
                `Scanning PDF page ${activeOcrPage} of ${pdf.numPages}... ${Math.round((message.progress ?? 0) * 100)}%`,
              );
            }
          },
        };

        try {
          ocrWorker =
            await tesseract.createWorker(
              ['eng', 'hin', 'guj'],
              undefined,
              options,
            );
        } catch {
          setUploadStatus(
            `Loading standard PDF text recognition for page ${activeOcrPage}...`,
          );
          ocrWorker =
            await tesseract.createWorker(
              'eng',
              undefined,
              options,
            );
        }

        createdOcrWorkers.push(
          ocrWorker,
        );
        await ocrWorker.setParameters({
          tessedit_pageseg_mode:
            tesseract.PSM
              .SPARSE_TEXT,
          preserve_interword_spaces:
            '1',
          user_defined_dpi: '220',
        });

        return ocrWorker;
      }

      try {
        for (
          let pageNumber = 1;
          pageNumber <= pdf.numPages;
          pageNumber += 1
        ) {
          setUploadStatus(
            `Reading PDF page ${pageNumber} of ${pdf.numPages}...`,
          );
          const page =
            await pdf.getPage(
              pageNumber,
            );
          const content =
            await page.getTextContent();
          const textItems =
            content.items.filter(
              (
                item,
              ): item is Extract<
                (typeof content.items)[number],
                { str: string }
              > => 'str' in item,
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
              const scale = Math.min(
                2.4,
                2400 /
                  Math.max(
                    baseViewport.width,
                    baseViewport.height,
                  ),
              );
              const viewport =
                page.getViewport({
                  scale: Math.max(
                    1.5,
                    scale,
                  ),
                });
              const canvas =
                document.createElement(
                  'canvas',
                );
              canvas.width = Math.ceil(
                viewport.width,
              );
              canvas.height = Math.ceil(
                viewport.height,
              );

              try {
                await page.render({
                  canvas,
                  viewport,
                }).promise;

                const worker =
                  await getOcrWorker();
                const result =
                  await worker.recognize(
                    canvas,
                  );
                const ocrText =
                  result.data.text
                    .replace(
                      /\u0000/g,
                      '',
                    )
                    .trim();

                if (ocrText) {
                  pageText = ocrText;
                  ocrPageCount += 1;
                }
              } finally {
                canvas.width = 0;
                canvas.height = 0;
              }
            } catch (ocrError) {
              console.warn(
                `OCR failed for PDF page ${pageNumber}:`,
                ocrError,
              );
            }
          }

          if (pageText) {
            pages.push(pageText);
          }
        }
      } finally {
        await Promise.all(
          createdOcrWorkers.map(
            (worker) =>
              worker.terminate(),
          ),
        );
      }

      saveExtractedMenu(
        file.name,
        pages.join('\n\n'),
        ocrPageCount > 0
          ? 'PDF with OCR'
          : 'PDF',
      );
    } catch (uploadError) {
      setUploadStatus('');
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'The PDF could not be read. Please try another file.',
      );
    } finally {
      setUploading(null);
    }
  }

  async function readMenuPhoto(file: File) {
    setError('');
    setUploadStatus('Preparing menu photo...');
    setUploading('camera');

    let preparedPhoto:
      | PreparedMenuPhoto
      | null = null;

    try {
      if (file.size > 20 * 1024 * 1024) {
        throw new Error('Choose a photo smaller than 20 MB.');
      }

      if (
        file.type &&
        !file.type.startsWith('image/')
      ) {
        throw new Error(
          'Choose a valid image file.',
        );
      }

      preparedPhoto =
        await prepareMenuPhoto(file);
      setUploadStatus(
        'Improving photo clarity for menu detection...',
      );

      const {
        createWorker,
        PSM,
      } = await import('tesseract.js');
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
        const workerOptions = {
          logger: (
            message: {
              status: string;
              progress?: number;
            },
          ) => {
            if (
              message.status ===
              'recognizing text'
            ) {
              setUploadStatus(
                `${recognitionPass}... ${Math.round((message.progress ?? 0) * 100)}%`,
              );
            }
          },
        };

        try {
          worker =
            await createWorker(
              ['eng', 'hin', 'guj'],
              undefined,
              workerOptions,
            );
        } catch {
          setUploadStatus(
            'Loading standard photo recognition...',
          );
          worker =
            await createWorker(
              'eng',
              undefined,
              workerOptions,
            );
        }
        await worker.setParameters({
          tessedit_pageseg_mode:
            PSM.SPARSE_TEXT,
          preserve_interword_spaces:
            '1',
          user_defined_dpi: '220',
        });
        const enhancedResult =
          await worker.recognize(
            preparedPhoto.enhanced,
            { rotateAuto: true },
          );
        recognitionPass =
          'Checking original photo';
        await worker.setParameters({
          tessedit_pageseg_mode:
            PSM.AUTO,
        });
        const originalResult =
          await worker.recognize(
            preparedPhoto.original,
            { rotateAuto: true },
          );

        setUploadStatus(
          'Validating detected dishes against the catalog...',
        );

        async function catalogAwareScore(
          text: string,
          confidence: number,
        ) {
          const [
            catalogDishes,
            possibleNewDishes,
          ] = await Promise.all([
            parseMenuText(text),
            findPendingDishCandidates(
              text,
            ),
          ]);

          return (
            catalogDishes.length * 1000 +
            possibleNewDishes.length * 100 +
            ocrResultScore(
              text,
              confidence,
            )
          );
        }

        const [
          enhancedScore,
          originalScore,
        ] = await Promise.all([
          catalogAwareScore(
            enhancedResult.data.text,
            enhancedResult.data
              .confidence,
          ),
          catalogAwareScore(
            originalResult.data.text,
            originalResult.data
              .confidence,
          ),
        ]);
        const bestResult =
          originalScore > enhancedScore
            ? originalResult
            : enhancedResult;

        saveExtractedMenu(
          file.name,
          bestResult.data.text,
          'Menu photo',
        );
      } finally {
        await worker?.terminate();
      }
    } catch (uploadError) {
      setUploadStatus('');
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'The menu photo could not be read. Please try a clearer photo.',
      );
    } finally {
      if (preparedPhoto) {
        preparedPhoto.original.width = 0;
        preparedPhoto.original.height = 0;
        preparedPhoto.enhanced.width = 0;
        preparedPhoto.enhanced.height = 0;
      }
      setUploading(null);
    }
  }

  function useSampleMenu() {
    if (!work) return;
    if (work.event.rawMenuText.trim() && !window.confirm('Replace the current menu text with the sample format?')) return;
    setError('');
    setUploadStatus('');
    setDetectedEventDetails({});
    setDetectionPreview(null);
    setSelectedPreviewIds(new Set());
    updateEvent('rawMenuText', SAMPLE_MENU);
  }

  function clearMenuText() {
    if (!work?.event.rawMenuText.trim()) return;
    if (!window.confirm('Clear the current menu text?')) return;
    setError('');
    setUploadStatus('');
    setDetectedEventDetails({});
    setDetectionPreview(null);
    setSelectedPreviewIds(new Set());
    updateEvent('rawMenuText', '');
  }

  if (!work || !session) {
    return (
      <AppShell title="Event Details">
        <div className="content-grid">
          <div className="glass-card">
            Loading...
          </div>
        </div>
      </AppShell>
    );
  }

  if (
    session.status === 'EXPIRED'
  ) {
    return (
      <AppShell title="Event Details">
        <LockedCard />
      </AppShell>
    );
  }

  const menuLines = work.event.rawMenuText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean).length;

  const firstMenuEventReady =
    Boolean(
      work.event.eventName.trim() ||
      work.event.clientName.trim() ||
      Number(work.event.pax) > 0,
    );

  const firstMenuTextReady =
    work.event.rawMenuText.trim().length > 0;

  const firstMenuDetected =
    Boolean(
      detectionPreview &&
      detectionPreview.menu.length > 0,
    );

  const firstMenuSaved =
    work.menu.length > 0;

  const showFirstMenuGuide =
    !firstMenuSaved;

  const firstMenuCompletedSteps =
    [
      firstMenuEventReady,
      firstMenuTextReady,
      firstMenuDetected,
      firstMenuSaved,
    ].filter(Boolean).length;

  function scrollToFirstMenuSection(
    id: string,
  ) {
    document
      .getElementById(id)
      ?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
  }

  const selectedPreviewMenu =
    detectionPreview?.menu.filter(
      (item) =>
        selectedPreviewIds.has(
          item.id,
      ),
    ) ?? [];
  const selectedMissingManualRateCount =
    selectedPreviewMenu.filter(
      (item) =>
        manualRateIds.has(item.id) &&
        !(Number(item.costPerPlate) > 0),
    ).length;

  const previewGroupMap =
    new Map<
      string,
      {
        key: string;
        dayLabel: string;
        mealLabel: string;
        servicePax: number;
        items: MenuItem[];
      }
    >();

  for (const item of detectionPreview?.menu ?? []) {
    const groupKey =
      item.serviceId ||
      `${item.dayLabel || 'Event'}::${item.mealLabel || 'Event Menu'}`;
    const existingGroup =
      previewGroupMap.get(groupKey);

    if (existingGroup) {
      existingGroup.items.push(item);
      existingGroup.servicePax =
        Math.max(
          existingGroup.servicePax,
          Number(item.servicePax) || 0,
        );
    } else {
      previewGroupMap.set(groupKey, {
        key: groupKey,
        dayLabel:
          item.dayLabel || '',
        mealLabel:
          item.mealLabel ||
          'Event Menu',
        servicePax:
          Number(item.servicePax) ||
          Number(work.event.pax) ||
          0,
        items: [item],
      });
    }
  }

  const detectionPreviewGroups =
    Array.from(
      previewGroupMap.values(),
    );

  const existingMenuKeys =
    new Set(
      work.menu.map(
        menuItemIdentity,
      ),
    );

  const previewDuplicateCount =
    selectedPreviewMenu.filter(
      (item) =>
        existingMenuKeys.has(
          menuItemIdentity(item),
        ),
    ).length;

  return (
    <AppShell
      title="Create Event"
      hidePageTitle
    >
      <section className="content-grid">
        {showFirstMenuGuide ? (
          <div className="first-menu-guide">
            <div className="first-menu-guide-top">
              <div>
                <span className="section-kicker">
                  First costing
                </span>

                <h2>
                  Create your first menu costing
                </h2>

                <p>
                  Follow these four steps.
                  Menu Costing will guide you from
                  event details to a saved menu.
                </p>
              </div>

              <div className="first-menu-guide-progress">
                <strong>
                  {firstMenuCompletedSteps}/4
                </strong>

                <span>
                  steps complete
                </span>
              </div>
            </div>

            <div className="first-menu-progress-bar">
              <span
                style={{
                  width:
                    `${Math.max(
                      5,
                      (
                        firstMenuCompletedSteps /
                        4
                      ) * 100,
                    )}%`,
                }}
              />
            </div>

            <div className="first-menu-steps">
              <button
                type="button"
                className={
                  firstMenuEventReady
                    ? 'is-complete'
                    : 'is-current'
                }
                onClick={() =>
                  scrollToFirstMenuSection(
                    'eventInformation',
                  )
                }
              >
                <span className="first-menu-step-number">
                  {firstMenuEventReady
                    ? '✓'
                    : '1'}
                </span>

                <span>
                  <b>
                    Event details
                  </b>

                  <small>
                    Client, event or guest count
                  </small>
                </span>
              </button>

              <button
                type="button"
                className={
                  firstMenuTextReady
                    ? 'is-complete'
                    : firstMenuEventReady
                      ? 'is-current'
                      : ''
                }
                onClick={() =>
                  scrollToFirstMenuSection(
                    'menuInput',
                  )
                }
              >
                <span className="first-menu-step-number">
                  {firstMenuTextReady
                    ? '✓'
                    : '2'}
                </span>

                <span>
                  <b>
                    Add menu
                  </b>

                  <small>
                    PDF, photo or pasted text
                  </small>
                </span>
              </button>

              <button
                type="button"
                className={
                  firstMenuDetected
                    ? 'is-complete'
                    : firstMenuTextReady
                      ? 'is-current'
                      : ''
                }
                onClick={() => {
                  if (
                    firstMenuTextReady &&
                    !detecting
                  ) {
                    void detectAndNext();
                  } else {
                    scrollToFirstMenuSection(
                      'menuInput',
                    );
                  }
                }}
              >
                <span className="first-menu-step-number">
                  {firstMenuDetected
                    ? '✓'
                    : '3'}
                </span>

                <span>
                  <b>
                    Detect dishes
                  </b>

                  <small>
                    Review what Menu Costing found
                  </small>
                </span>
              </button>

              <button
                type="button"
                className={
                  firstMenuSaved
                    ? 'is-complete'
                    : firstMenuDetected
                      ? 'is-current'
                      : ''
                }
                onClick={() =>
                  scrollToFirstMenuSection(
                    firstMenuDetected
                      ? 'menuDetectionPreview'
                      : 'menuInput',
                  )
                }
              >
                <span className="first-menu-step-number">
                  {firstMenuSaved
                    ? '✓'
                    : '4'}
                </span>

                <span>
                  <b>
                    Save menu
                  </b>

                  <small>
                    Continue to costing
                  </small>
                </span>
              </button>
            </div>

            {!firstMenuTextReady ? (
              <div className="first-menu-guide-actions">
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => {
                    useSampleMenu();

                    window.setTimeout(
                      () =>
                        scrollToFirstMenuSection(
                          'menuInput',
                        ),
                      50,
                    );
                  }}
                >
                  Try Sample Menu
                </button>

                <button
                  className="primary-button"
                  type="button"
                  onClick={() =>
                    scrollToFirstMenuSection(
                      'menuInput',
                    )
                  }
                >
                  Add My Menu
                </button>
              </div>
            ) : firstMenuTextReady &&
              !firstMenuDetected ? (
              <div className="first-menu-guide-actions">
                <button
                  className="primary-button"
                  type="button"
                  disabled={
                    detecting ||
                    Boolean(uploading)
                  }
                  onClick={() =>
                    void detectAndNext()
                  }
                >
                  {detecting
                    ? 'Detecting…'
                    : 'Detect My Menu'}
                </button>
              </div>
            ) : firstMenuDetected ? (
              <div className="first-menu-guide-actions">
                <button
                  className="primary-button"
                  type="button"
                  onClick={() =>
                    scrollToFirstMenuSection(
                      'menuDetectionPreview',
                    )
                  }
                >
                  Review Detected Dishes
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        <div
          id="eventInformation"
          className="glass-card event-details-card"
          style={{ order: 2 }}
        >
          <div className="event-section-heading">
            <div>
              <span className="section-kicker">Event brief</span>
              <h2>Event information</h2>
            </div>
          </div>

          <div className="form-grid">
            <div className="three-grid">
              <div className="field">
                <label htmlFor="clientName">
                  Client Name
                </label>

                <input
                  id="clientName"
                  className="input input-large"
                  value={
                    work.event.clientName
                  }
                  onChange={(event) =>
                    updateEvent(
                      'clientName',
                      event.target.value,
                    )
                  }
                  placeholder="Client name"
                />
              </div>

              <div className="field">
                <label htmlFor="eventName">
                  Event Name
                </label>

                <input
                  id="eventName"
                  className="input input-large"
                  value={
                    work.event.eventName
                  }
                  onChange={(event) =>
                    updateEvent(
                      'eventName',
                      event.target.value,
                    )
                  }
                  placeholder="Wedding / Birthday / Corporate"
                />
              </div>

              <div className="field">
                <label htmlFor="eventDate">
                  Event Date
                </label>

                <input
                  id="eventDate"
                  className="input input-large"
                  type="date"
                  value={
                    work.event.eventDate
                  }
                  onChange={(event) =>
                    updateEvent(
                      'eventDate',
                      event.target.value,
                    )
                  }
                />
              </div>
            </div>

            <div className="three-grid">
              <div className="field">
                <label htmlFor="functionType">
                  Function Type
                </label>

                <input
                  id="functionType"
                  className="input input-large"
                  value={
                    work.event.functionType
                  }
                  onChange={(event) =>
                    updateEvent(
                      'functionType',
                      event.target.value,
                    )
                  }
                  placeholder="Lunch / Dinner / Breakfast"
                />
              </div>

              <div className="field">
                <label htmlFor="pax">
                  Default Pax / Guests
                </label>

                <input
                  id="pax"
                  className="input input-large"
                  type="number"
                  min="1"
                  inputMode="numeric"
                  value={
                    work.event.pax || ''
                  }
                  onChange={(event) =>
                    updateEvent(
                      'pax',
                      Math.max(
                        0,
                        Number(
                          event.target.value,
                        ) || 0,
                      ),
                    )
                  }
                  placeholder="300"
                />
              </div>

              <div className="field">
                <label htmlFor="city">
                  City
                </label>

                <input
                  id="city"
                  className="input input-large"
                  value={
                    work.event.city
                  }
                  onChange={(event) =>
                    updateEvent(
                      'city',
                      event.target.value,
                    )
                  }
                  placeholder="Silvassa"
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="venue">
                Venue
              </label>

              <input
                id="venue"
                className="input input-large"
                value={
                  work.event.venue
                }
                onChange={(event) =>
                  updateEvent(
                    'venue',
                    event.target.value,
                  )
                }
                placeholder="Venue / Address"
              />
            </div>
          </div>
        </div>

        <div
          id="menuInput"
          className="glass-card event-menu-card"
          style={{ order: 1 }}
        >
          <div className="form-grid">
            <div className="menu-source-workspace">
              <div className="menu-source-workspace-heading">
                <div>
                  <span>Menu input</span>
                  <h3>Upload a file or paste menu text</h3>
                </div>
              </div>

              <div className="menu-upload-options">
                  <div className="menu-upload-option">
                    <span className="menu-upload-icon" aria-hidden="true">PDF</span>
                    <div>
                      <b>Upload PDF</b>
                      <p>Text or scanned PDF, including multi-column menus, up to 15 MB.</p>
                    </div>
                    <label
                      className={`ghost-button ${uploading ? 'is-disabled' : ''}`}
                      htmlFor="menuPdf"
                    >
                      {uploading === 'pdf' ? 'Reading PDF...' : 'Choose PDF'}
                    </label>
                    <input
                      id="menuPdf"
                      className="visually-hidden-file"
                      type="file"
                      accept="application/pdf,.pdf"
                      disabled={Boolean(uploading)}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = '';
                        if (file) void readPdf(file);
                      }}
                    />
                  </div>

                  <div className="menu-upload-option">
                    <span className="menu-upload-icon camera" aria-hidden="true">CAM</span>
                    <div>
                      <b>Take a photo</b>
                      <p>Use a clear, straight menu photo.</p>
                    </div>
                    <div className="menu-photo-actions">
                      <label
                        className={`ghost-button ${uploading ? 'is-disabled' : ''}`}
                        htmlFor="menuCamera"
                      >
                        {uploading === 'camera' ? 'Scanning photo...' : 'Open Camera'}
                      </label>
                      <label
                        className={`ghost-button ${uploading ? 'is-disabled' : ''}`}
                        htmlFor="menuPhoto"
                      >
                        Upload Photo
                      </label>
                    </div>
                    <input
                      id="menuCamera"
                      className="visually-hidden-file"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      disabled={Boolean(uploading)}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = '';
                        if (file) void readMenuPhoto(file);
                      }}
                    />
                    <input
                      id="menuPhoto"
                      className="visually-hidden-file"
                      type="file"
                      accept="image/*"
                      disabled={Boolean(uploading)}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = '';
                        if (file) void readMenuPhoto(file);
                      }}
                    />
                  </div>
              </div>

              {uploadStatus ? (
                <div className="menu-upload-status" role="status" aria-live="polite">
                  <span className={uploading ? 'upload-spinner' : 'upload-check'} aria-hidden="true" />
                  <div>
                    <b>{uploading ? 'Processing menu' : 'Menu imported successfully'}</b>
                    <p>{uploadStatus}</p>
                    {work.event.uploadFileName && !uploading ? (
                      <small>{work.event.uploadFileName}</small>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {Object.keys(detectedEventDetails).length > 0 ? (
                <div className="event-detected-details">
                  <div className="event-detected-details-heading">
                    <div>
                      <span aria-hidden="true">✓</span>
                      <div>
                        <b>Event details detected</b>
                        <p>Empty fields in Event information were filled automatically.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        document
                          .getElementById('clientName')
                          ?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center',
                          })
                      }
                    >
                      Review details
                    </button>
                  </div>
                  <div className="event-detected-detail-list">
                    {(Object.entries(detectedEventDetails) as Array<
                      [keyof DetectedEventDetails, string | number]
                    >).map(([key, value]) => (
                      <span key={key}>
                        <small>{EVENT_DETAIL_LABELS[key]}</small>
                        <b>{String(value)}</b>
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="field menu-text-field">
                  <div className="event-menu-text-heading">
                    <label htmlFor="rawMenuText">Menu text</label>
                    <div>
                      <button className="event-text-action" type="button" onClick={useSampleMenu}>Use sample</button>
                      {work.event.rawMenuText ? <button className="event-text-action danger" type="button" onClick={clearMenuText}>Clear</button> : null}
                    </div>
                  </div>

                  <textarea
                    id="rawMenuText"
                    className="textarea textarea-large"
                    value={work.event.rawMenuText}
                    onChange={(event) => {
                      setError('');
                      setDetectedEventDetails({});
                      setDetectionPreview(null);
                      setSelectedPreviewIds(new Set());
                      updateEvent('rawMenuText', event.target.value);
                    }}
                    placeholder={`Welcome Drink
Orange Juice

Starter
Paneer Tikka
Hara Bhara Kebab

Main Course
Paneer Butter Masala
Special Maharaja Sabji
Dal Fry
Jeera Rice
Butter Naan

Sweet
Gulab Jamun`}
                  />
                  <div className="event-text-meta">
                    <span>{menuLines} non-empty lines • {work.event.rawMenuText.length.toLocaleString('en-IN')} characters</span>
                    <span>English • Roman Hindi • Hindi • Gujarati</span>
                  </div>
              </div>
            </div>

            {error ? (
              <div className="event-detection-error" role="alert">
                <b>Menu needs attention</b>
                <p>{error}</p>
              </div>
            ) : null}

            {detectionPreview ? (
              <div
                id="menuDetectionPreview"
                className="menu-detection-preview"
              >
                <div className="menu-preview-heading">
                  <div>
                    <span className="section-kicker">Detection preview</span>
                    <h3>Review before saving</h3>
                    <p>Catalog dishes use saved rates. New dishes can continue with ₹0 and be priced later.</p>
                  </div>
                  <div className="menu-preview-metrics">
                    <span><b>{selectedPreviewMenu.length}</b> selected</span>
                    <span><b>{detectionPreviewGroups.length}</b> functions</span>
                    <span><b>{detectionPreview.menu.length - manualRateIds.size}</b> catalog</span>
                    {manualRateIds.size > 0 ? (
                      <span className={selectedMissingManualRateCount > 0 ? 'needs-attention' : ''}>
                        <b>{manualRateIds.size}</b> manual rate
                      </span>
                    ) : null}
                  </div>
                </div>

                {manualRateIds.size > 0 ? (
                  <div className="event-detection-note" role="status">
                    <b>Optional rates for new dishes</b>
                    <p>
                      {manualRateIds.size} new {manualRateIds.size === 1 ? 'dish was' : 'dishes were'} found. Enter the per-plate rate now or continue with ₹0 and update it later.
                    </p>
                  </div>
                ) : null}

                <div className="menu-preview-toolbar">
                  <b>{selectedPreviewMenu.length} of {detectionPreview.menu.length} dishes selected</b>
                  <div>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedPreviewIds(
                          new Set(
                            detectionPreview.menu.map(
                              (item) => item.id,
                            ),
                          ),
                        )
                      }
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedPreviewIds(
                          new Set(),
                        )
                      }
                    >
                      Clear selection
                    </button>
                  </div>
                </div>

                <div className="menu-preview-groups">
                  {detectionPreviewGroups.map((group) => {
                    const selectedInGroup =
                      group.items.filter(
                        (item) =>
                          selectedPreviewIds.has(
                            item.id,
                          ),
                      ).length;

                    return (
                      <details
                        className="menu-preview-group"
                        key={group.key}
                        open
                      >
                        <summary>
                          <div>
                            <b>
                              {[group.dayLabel, group.mealLabel]
                                .filter(Boolean)
                                .join(' • ')}
                            </b>
                            <span>
                              {group.servicePax > 0
                                ? `${group.servicePax} members • `
                                : ''}
                              {selectedInGroup}/{group.items.length} selected
                            </span>
                          </div>
                          <span aria-hidden="true">⌄</span>
                        </summary>

                        <div className="menu-preview-items">
                          {group.items.map((item) => {
                            const isSelected =
                              selectedPreviewIds.has(
                                item.id,
                              );

                            return (
                              <div
                                className={`menu-preview-item ${isSelected ? 'is-selected' : ''} ${manualRateIds.has(item.id) ? 'needs-manual-rate' : ''}`}
                                key={item.id}
                              >
                                <label className="menu-preview-selector" aria-label={`Select ${item.name}`}>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(event) => {
                                      const nextIds =
                                        new Set(
                                          selectedPreviewIds,
                                        );

                                      if (event.target.checked) {
                                        nextIds.add(item.id);
                                      } else {
                                        nextIds.delete(item.id);
                                      }

                                      setSelectedPreviewIds(
                                        nextIds,
                                      );
                                      setError('');
                                    }}
                                  />
                                  <span className="menu-preview-checkbox" aria-hidden="true">✓</span>
                                </label>
                                <div>
                                  <b>{item.name}</b>
                                  <small>{item.category}</small>
                                </div>
                                {manualRateIds.has(item.id) ? (
                                  <label className="menu-preview-rate">
                                    <span>₹</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      inputMode="decimal"
                                      value={item.costPerPlate || ''}
                                      onChange={(event) => {
                                        const rate = Math.max(0, Number(event.target.value) || 0);
                                        setDetectionPreview((current) =>
                                          current
                                            ? {
                                                ...current,
                                                menu: current.menu.map((menuItem) =>
                                                  menuItem.id === item.id
                                                    ? { ...menuItem, costPerPlate: rate }
                                                    : menuItem,
                                                ),
                                              }
                                            : current,
                                        );
                                        setError('');
                                      }}
                                      aria-label={`Rate for ${item.name}`}
                                      placeholder="Optional"
                                    />
                                  </label>
                                ) : (
                                  <strong>₹{Number(item.costPerPlate).toFixed(2)}</strong>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    );
                  })}
                </div>

                {previewDuplicateCount > 0 ? (
                  <div className="menu-preview-duplicate-note">
                    <b>{previewDuplicateCount} duplicate {previewDuplicateCount === 1 ? 'dish' : 'dishes'} found</b>
                    <p>Merge mode will keep the existing version and skip these duplicates.</p>
                  </div>
                ) : null}

                <div className="menu-preview-actions">
                  <div>
                    <b>Ready to save {selectedPreviewMenu.length} dishes?</b>
                    <span>
                      {work.menu.length > 0
                        ? `Your current menu contains ${work.menu.length} dishes.`
                        : 'This will create your event menu.'}
                    </span>
                  </div>
                  {work.menu.length > 0 ? (
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() =>
                        applyDetectionPreview(
                          'merge',
                        )
                      }
                      disabled={!selectedPreviewMenu.length}
                    >
                      Merge with Current
                    </button>
                  ) : null}
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() =>
                      applyDetectionPreview(
                        'replace',
                      )
                    }
                    disabled={!selectedPreviewMenu.length}
                  >
                    {work.menu.length > 0
                      ? 'Replace Current Menu'
                      : 'Use Detected Menu'}
                  </button>
                  <button
                    className="menu-preview-cancel"
                    type="button"
                    onClick={() => {
                      setDetectionPreview(null);
                      setSelectedPreviewIds(new Set());
                      setError('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            <div className="action-row event-detect-action">
              <button
                className="primary-button"
                type="button"
                onClick={detectAndNext}
                disabled={detecting || Boolean(uploading) || !work.event.rawMenuText.trim()}
              >
                {detecting
                  ? 'Detecting Dishes...'
                  : detectionPreview
                    ? 'Refresh Detection Preview'
                    : `Detect Menu${menuLines > 0 ? ` • ${menuLines} lines` : ''}`}
              </button>
            </div>
          </div>
        </div>
      </section>
            <FreeLimitPaywall
          open={freeLimitBlocked}
          onClose={() => setFreeLimitBlocked(false)}
        />

</AppShell>
  );
}
