'use client';

import {
  useEffect,
  useRef,
  useState,
} from 'react';

import { useRouter } from 'next/navigation';

import AppShell, {
  LockedCard,
} from '../../components/AppShell';

import {
  syncDishCostItemsFromServer,
} from '../../../lib/dishCostMaster';

import {
  pdfPageNeedsOcr,
  reconstructPdfMenuText,
} from '../../../lib/pdfMenuExtraction';

import {
  getSession,
  findPendingDishCandidates,
  loadWork,
  parseMenuText,
  saveWork,
  uid,
} from '../../../lib/store';

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

type MenuInputMode = 'upload' | 'paste';

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

  const [uploading, setUploading] =
    useState<'pdf' | 'camera' | null>(null);

  const [uploadStatus, setUploadStatus] =
    useState('');

  const [menuInputMode, setMenuInputMode] =
    useState<MenuInputMode>('paste');

  const [detectedEventDetails, setDetectedEventDetails] =
    useState<DetectedEventDetails>({});

  const [detectionPreview, setDetectionPreview] =
    useState<MenuDetectionPreview | null>(null);

  const [queuedSuggestionCount, setQueuedSuggestionCount] =
    useState(0);

  const [selectedPreviewIds, setSelectedPreviewIds] =
    useState<Set<string>>(
      () => new Set(),
    );

  const catalogSyncRef = useRef<
    ReturnType<typeof syncDishCostItemsFromServer> | null
  >(null);

  useEffect(() => {
    const currentSession = getSession();

    setSession(currentSession);

    if (currentSession) {
      const savedWork = loadWork(
        currentSession.tenantId,
      );

      setWork(savedWork);
      setMenuInputMode(
        savedWork.event.uploadFileName
          ? 'upload'
          : 'paste',
      );

      catalogSyncRef.current =
        syncDishCostItemsFromServer();
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
      await (
        catalogSyncRef.current ??
        syncDishCostItemsFromServer()
      );

      /*
       * parseMenuText reads dishes from
       * the refreshed indexed catalog.
       *
       * Catalog matches receive their
       * catalog category and rate.
       *
       * Catalog-confirmed dishes receive
       * their saved rates. Structured new
       * dish candidates remain available
       * with a blank manual rate.
       */
      const catalogMenu =
        parseMenuText(rawMenuText);
      const pendingCandidates =
        findPendingDishCandidates(
          rawMenuText,
        );
      const manualMenu: MenuItem[] =
        pendingCandidates.map(
          (candidate) => ({
            id: uid('dish'),
            name: candidate.name,
            category:
              candidate.categoryHint,
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
      let queuedCount = 0;

      if (pendingCandidates.length) {
        try {
          const queueResponse =
            await fetch(
              '/api/dish-suggestions',
              {
                method: 'POST',
                headers: {
                  'Content-Type':
                    'application/json',
                },
                body: JSON.stringify({
                  candidates:
                    pendingCandidates,
                  sourceFileName:
                    work.event
                      .uploadFileName,
                }),
              },
            );
          const queueData =
            await queueResponse.json();

          if (queueResponse.ok) {
            queuedCount = Math.max(
              0,
              Number(
                queueData.queued,
              ) || 0,
            );
          } else {
            console.warn(
              'Could not queue new dishes:',
              queueData.error,
            );
          }
        } catch (queueError) {
          console.warn(
            'Could not queue new dishes:',
            queueError,
          );
        }
      }

      setQueuedSuggestionCount(
        queuedCount,
      );

      console.log(
        'Detected menu:',
        detectedMenu,
      );

      if (!detectedMenu.length) {
        setError(
          'No likely dishes were found. Check the extracted text or select dishes manually.',
        );

        return;
      }

      console.info(
        `Menu detection complete: ${catalogMenu.length} catalog dishes and ${manualMenu.length} new dishes detected.`,
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

  function applyDetectionPreview(
    mode: 'replace' | 'merge',
  ) {
    if (
      !work ||
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

    persistWork(nextWork);
    setDetectionPreview(null);
    setQueuedSuggestionCount(0);
    setSelectedPreviewIds(
      new Set(),
    );
    router.push('/app/menu');
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
    setMenuInputMode('upload');
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

    try {
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Choose a photo smaller than 10 MB.');
      }

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
                `Reading menu photo... ${Math.round((message.progress ?? 0) * 100)}%`,
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
        });
        const result =
          await worker.recognize(
            file,
          );

        saveExtractedMenu(
          file.name,
          result.data.text,
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
      setUploading(null);
    }
  }

  function clearPage() {
    if (!work) return;
    if (!window.confirm('Clear the event details and pasted menu from this page?')) return;

    const nextWork: WorkState = {
      ...work,

      event: {
        ...work.event,
        clientName: '',
        eventName: '',
        eventDate: '',
        functionType: '',
        pax: 0,
        city: '',
        venue: '',
        uploadFileName: '',
        rawMenuText: '',
      },

      menu: [],
    };

    setError('');
    setUploadStatus('');
    setDetectedEventDetails({});
    setDetectionPreview(null);
    setSelectedPreviewIds(new Set());
    setMenuInputMode('paste');
    persistWork(nextWork);
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

  function selectMenuManually() {
    router.push('/app/menu?mode=manual');
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

  const eventChecklist = [
    { label: 'Client', complete: Boolean(work.event.clientName.trim()) },
    { label: 'Event', complete: Boolean(work.event.eventName.trim()) },
    { label: 'Date', complete: Boolean(work.event.eventDate) },
    { label: 'Guests', complete: work.event.pax > 0 },
    { label: 'Location', complete: Boolean(work.event.venue.trim() || work.event.city.trim()) },
    { label: 'Menu', complete: Boolean(work.event.rawMenuText.trim() || work.menu.length) },
  ];
  const completedEventItems = eventChecklist.filter((item) => item.complete).length;
  const eventProgress = Math.round((completedEventItems / eventChecklist.length) * 100);
  const menuLines = work.event.rawMenuText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean).length;

  const selectedPreviewMenu =
    detectionPreview?.menu.filter(
      (item) =>
        selectedPreviewIds.has(
          item.id,
        ),
    ) ?? [];

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

  const previewMissingRateCount =
    selectedPreviewMenu.filter(
      (item) =>
        !(Number(item.costPerPlate) > 0),
    ).length;

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
      subtitle="Step 1 of 6: add the event brief and bring in the complete menu"
    >
      <section className="content-grid">
        <div className="event-overview-card">
          <div className="event-overview-copy">
            <span className="page-eyebrow">Event setup</span>
            <h2>{work.event.eventName || 'New catering event'}</h2>
            <p>{work.event.clientName ? `Prepared for ${work.event.clientName}` : 'Add the client and event details to begin.'}</p>
          </div>
          <div className="event-progress-card">
            <div><span>Setup progress</span><b>{eventProgress}%</b></div>
            <div className="event-progress-track" aria-label={`${eventProgress}% of event setup complete`}><i style={{ width: `${eventProgress}%` }} /></div>
            <div className="event-checklist">
              {eventChecklist.map((item) => <span className={item.complete ? 'is-complete' : ''} key={item.label}>{item.label}</span>)}
            </div>
          </div>
        </div>

        <div className="glass-card event-details-card">
          <div className="event-section-heading">
            <div>
              <span className="section-kicker">Event brief</span>
              <h2>Event information</h2>
              <p>These details appear in the final quotation and help set default guest counts.</p>
            </div>
            <span className="event-autosave">Auto-saved</span>
          </div>

          <div className="form-grid">
            <div className="event-form-label">Client &amp; occasion</div>
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

            <div className="event-form-label">Guests &amp; location</div>
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
                <small className="muted">
                  Used when the pasted menu does not include members for each meal.
                </small>
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

        <div className="glass-card event-menu-card">
          <div className="event-section-heading">
            <div>
              <span className="section-kicker">Menu detection</span>
              <h2>How would you like to add the menu?</h2>
              <p>Choose one method now. You can review and correct every dish before costing.</p>
            </div>
            <div className="event-menu-stats">
              <span><b>{menuLines}</b> text lines</span>
              <span className={work.event.rawMenuText.trim() ? 'is-ready' : ''}>
                {work.event.rawMenuText.trim() ? 'Ready to detect' : 'Waiting for menu'}
              </span>
            </div>
          </div>

          <div className="form-grid">
            <div className="menu-source-choices" aria-label="Menu input method">
              <button
                className={`menu-source-choice ${menuInputMode === 'upload' ? 'is-active' : ''}`}
                type="button"
                aria-pressed={menuInputMode === 'upload'}
                onClick={() => {
                  setMenuInputMode('upload');
                  setError('');
                }}
              >
                <span className="menu-source-number">01</span>
                <div>
                  <b>Upload a menu</b>
                  <p>PDF or camera photo</p>
                </div>
                <span className="menu-source-check" aria-hidden="true">✓</span>
              </button>

              <button
                className={`menu-source-choice ${menuInputMode === 'paste' ? 'is-active' : ''}`}
                type="button"
                aria-pressed={menuInputMode === 'paste'}
                onClick={() => {
                  setMenuInputMode('paste');
                  setError('');
                }}
              >
                <span className="menu-source-number">02</span>
                <div>
                  <b>Paste menu text</b>
                  <p>WhatsApp or typed menu</p>
                </div>
                <span className="menu-source-check" aria-hidden="true">✓</span>
              </button>

              <button
                className="menu-source-choice manual"
                type="button"
                onClick={selectMenuManually}
                disabled={Boolean(uploading)}
              >
                <span className="menu-source-number">03</span>
                <div>
                  <b>Select dishes manually</b>
                  <p>Build from the dish catalog</p>
                </div>
                <span className="menu-source-arrow" aria-hidden="true">→</span>
              </button>
            </div>

            <div className="menu-source-workspace">
              <div className="menu-source-workspace-heading">
                <div>
                  <span>{menuInputMode === 'upload' ? 'Import menu' : 'Paste menu'}</span>
                  <h3>{menuInputMode === 'upload' ? 'Choose your file source' : 'Paste the full menu below'}</h3>
                </div>
                <small>Auto-saved</small>
              </div>

              {menuInputMode === 'upload' ? (
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
                    <label
                      className={`ghost-button ${uploading ? 'is-disabled' : ''}`}
                      htmlFor="menuCamera"
                    >
                      {uploading === 'camera' ? 'Scanning photo...' : 'Open Camera'}
                    </label>
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
                  </div>
                </div>
              ) : null}

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

              {menuInputMode === 'paste' || work.event.rawMenuText ? (
                <div className="field menu-text-field">
                  <div className="event-menu-text-heading">
                    <label htmlFor="rawMenuText">
                      {menuInputMode === 'upload' ? 'Extracted menu text' : 'Menu text'}
                    </label>
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
                  <div className="menu-multiday-tip">
                    <span aria-hidden="true">2D</span>
                    <div>
                      <b>Multi-day event?</b>
                      <p>Start each menu with a heading such as <code>Day 1 • Dinner • 300 Members</code> and <code>Day 2 • Breakfast • 180 Members</code>.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="menu-upload-empty">
                  <span aria-hidden="true">↑</span>
                  <b>Select a PDF or take a menu photo</b>
                  <p>We will extract the text so you can review it before detection.</p>
                </div>
              )}
            </div>

            {error ? (
              <div className="event-detection-error" role="alert">
                <b>Menu needs attention</b>
                <p>{error}</p>
              </div>
            ) : null}

            <div className="event-detection-note">
              <b>Dish-only detection</b>
              <p>
                Catalog dishes include their saved rate. Likely new dishes appear with “Rate needed” so you can enter a rate manually.
                {queuedSuggestionCount > 0
                  ? ` ${queuedSuggestionCount} new ${queuedSuggestionCount === 1 ? 'dish is' : 'dishes are'} also waiting for Admin approval.`
                  : ' Headings and unrelated document text are ignored.'}
              </p>
            </div>

            {detectionPreview ? (
              <div
                id="menuDetectionPreview"
                className="menu-detection-preview"
              >
                <div className="menu-preview-heading">
                  <div>
                    <span className="section-kicker">Detection preview</span>
                    <h3>Review before saving</h3>
                    <p>Review catalog dishes and new dishes needing a manual rate, then replace or merge the menu.</p>
                  </div>
                  <div className="menu-preview-metrics">
                    <span><b>{selectedPreviewMenu.length}</b> selected</span>
                    <span><b>{detectionPreviewGroups.length}</b> functions</span>
                    <span className={previewMissingRateCount > 0 ? 'needs-attention' : ''}>
                      <b>{previewMissingRateCount}</b> rates missing
                    </span>
                  </div>
                </div>

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
                              <label
                                className={`menu-preview-item ${isSelected ? 'is-selected' : ''}`}
                                key={item.id}
                              >
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
                                <div>
                                  <b>{item.name}</b>
                                  <small>{item.category}</small>
                                </div>
                                <strong className={Number(item.costPerPlate) > 0 ? '' : 'missing'}>
                                  {Number(item.costPerPlate) > 0
                                    ? `₹${Number(item.costPerPlate).toFixed(2)}`
                                    : 'Rate needed'}
                                </strong>
                              </label>
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

            <div className={`event-page-actions ${work.event.rawMenuText.trim() ? 'is-ready' : ''}`}>
              <div>
                <b>{work.event.rawMenuText.trim() ? `${menuLines} lines ready for detection` : 'Add a menu to continue'}</b>
                <span>{work.event.rawMenuText.trim() ? 'Meals, guest counts and categories will stay organized.' : 'Upload a file, paste text, or choose dishes manually.'}</span>
              </div>
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

              <button
                className="ghost-button"
                type="button"
                onClick={clearPage}
                disabled={detecting || Boolean(uploading)}
              >
                Clear page
              </button>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
