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
  getSession,
  loadWork,
  parseMenuText,
  saveWork,
} from '../../../lib/store';

import type {
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
       * Unmatched dishes remain in the
       * menu with an estimated category
       * and a blank manual rate. Full
       * wedding menus also retain day,
       * meal and member-count details.
       */
      const detectedMenu =
        parseMenuText(rawMenuText);

      console.log(
        'Detected menu:',
        detectedMenu,
      );

      if (!detectedMenu.length) {
        setError(
          'No valid menu items were found. Add each dish on a separate line, or separate dishes with commas, slashes or bullets.',
        );

        return;
      }

      const manualRateCount =
        detectedMenu.filter(
          (item) =>
            Number(
              item.costPerPlate,
            ) <= 0,
        ).length;

      console.info(
        `Menu detection complete: ${detectedMenu.length} dishes detected. ${manualRateCount} dishes require manual rates.`,
      );

      const nextWork: WorkState = {
        ...work,
        menu: detectedMenu,
      };

      persistWork(nextWork);

      router.push('/app/menu');
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

    const nextWork: WorkState = {
      ...work,
      event: {
        ...work.event,
        uploadFileName: fileName,
        rawMenuText: cleanedText,
      },
    };

    persistWork(nextWork);
    setUploadStatus(
      `${sourceLabel} read successfully. Review the extracted text below, then continue.`,
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

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        setUploadStatus(`Reading PDF page ${pageNumber} of ${pdf.numPages}...`);
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item) => {
            if (!('str' in item)) return '';
            return `${item.str}${item.hasEOL ? '\n' : ' '}`;
          })
          .join('')
          .trim();

        if (pageText) pages.push(pageText);
      }

      saveExtractedMenu(file.name, pages.join('\n\n'), 'PDF');
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

      const { recognize } = await import('tesseract.js');
      const result = await recognize(file, 'eng', {
        logger: (message) => {
          if (message.status === 'recognizing text') {
            setUploadStatus(
              `Reading menu photo... ${Math.round((message.progress ?? 0) * 100)}%`,
            );
          }
        },
      });

      saveExtractedMenu(file.name, result.data.text, 'Menu photo');
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
    persistWork(nextWork);
  }

  function useSampleMenu() {
    if (!work) return;
    if (work.event.rawMenuText.trim() && !window.confirm('Replace the current menu text with the sample format?')) return;
    setError('');
    setUploadStatus('');
    updateEvent('rawMenuText', SAMPLE_MENU);
  }

  function clearMenuText() {
    if (!work?.event.rawMenuText.trim()) return;
    if (!window.confirm('Clear the current menu text?')) return;
    setError('');
    setUploadStatus('');
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

  const eventChecklist = [
    { label: 'Client', complete: Boolean(work.event.clientName.trim()) },
    { label: 'Event', complete: Boolean(work.event.eventName.trim()) },
    { label: 'Date', complete: Boolean(work.event.eventDate) },
    { label: 'Guests', complete: work.event.pax > 0 },
    { label: 'Location', complete: Boolean(work.event.venue.trim() || work.event.city.trim()) },
    { label: 'Menu', complete: Boolean(work.event.rawMenuText.trim()) },
  ];
  const completedEventItems = eventChecklist.filter((item) => item.complete).length;
  const eventProgress = Math.round((completedEventItems / eventChecklist.length) * 100);
  const menuLines = work.event.rawMenuText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean).length;

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
              <h2>Bring in the complete menu</h2>
              <p>Upload a file or paste the WhatsApp menu. You will review every detected dish on the next page.</p>
            </div>
            <div className="event-menu-stats">
              <span><b>{menuLines}</b> text lines</span>
              <span>{work.event.uploadFileName ? 'File imported' : 'Text auto-saved'}</span>
            </div>
          </div>

          <div className="form-grid">
            <div className="menu-upload-options">
              <div className="menu-upload-option">
                <span className="menu-upload-icon" aria-hidden="true">PDF</span>
                <div>
                  <b>Upload menu PDF</b>
                  <p>Select a text-based PDF up to 15 MB.</p>
                </div>
                <label
                  className={`ghost-button ${uploading ? 'is-disabled' : ''}`}
                  htmlFor="menuPdf"
                >
                  {uploading === 'pdf' ? 'Reading...' : 'Choose PDF'}
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
                  <b>Scan with camera</b>
                  <p>Take a clear, straight photo of the menu.</p>
                </div>
                <label
                  className={`ghost-button ${uploading ? 'is-disabled' : ''}`}
                  htmlFor="menuCamera"
                >
                  {uploading === 'camera' ? 'Scanning...' : 'Open Camera'}
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

            {uploadStatus ? (
              <div className="menu-upload-status" role="status" aria-live="polite">
                <span className={uploading ? 'upload-spinner' : 'upload-check'} aria-hidden="true" />
                <div>
                  <b>{uploading ? 'Processing menu' : 'Menu ready to review'}</b>
                  <p>{uploadStatus}</p>
                  {work.event.uploadFileName && !uploading ? (
                    <small>{work.event.uploadFileName}</small>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="menu-upload-divider"><span>or paste menu text</span></div>

            <div className="field">
              <div className="event-menu-text-heading">
                <label htmlFor="rawMenuText">Menu text</label>
                <div>
                  <button className="event-text-action" type="button" onClick={useSampleMenu}>Use sample format</button>
                  {work.event.rawMenuText ? <button className="event-text-action danger" type="button" onClick={clearMenuText}>Clear text</button> : null}
                </div>
              </div>

              <textarea
                id="rawMenuText"
                className="textarea textarea-large"
                value={
                  work.event.rawMenuText
                }
                onChange={(event) => {
                  setError('');

                  updateEvent(
                    'rawMenuText',
                    event.target.value,
                  );
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
                <span>{work.event.rawMenuText.length.toLocaleString('en-IN')} characters</span>
                <span>English • Roman Hindi • Hindi • Gujarati</span>
              </div>
            </div>

            {error ? (
              <div className="event-detection-error" role="alert">
                <b>Menu needs attention</b>
                <p>{error}</p>
              </div>
            ) : null}

            <div className="event-detection-note">
              <b>Nothing is silently removed</b>
              <p>Unmatched dishes continue to Menu review with a blank rate, ready for you to correct.</p>
            </div>

            <div className="event-page-actions">
              <div>
                <b>Ready for menu review?</b>
                <span>Detection keeps meal names, member counts, categories, and unmatched dishes.</span>
              </div>
              <button
                className="primary-button"
                type="button"
                onClick={detectAndNext}
                disabled={detecting || Boolean(uploading)}
              >
                {detecting
                  ? 'Detecting Dishes...'
                  : 'Next: Check Menu'}
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
