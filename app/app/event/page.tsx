'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import AppShell, {
  LockedCard,
} from '../../components/AppShell';

import {
  getSession,
<<<<<<< HEAD
=======
  loadDishMaster,
>>>>>>> 7200fd0 (Improve menu dish detection)
  loadWork,
  parseMenuText,
  saveWork,
} from '../../../lib/store';

import type {
  Session,
  WorkState,
} from '../../../lib/types';

export default function EventPage() {
  const router = useRouter();

  const [session, setSession] =
    useState<Session | null>(null);

  const [work, setWork] =
    useState<WorkState | null>(null);

  const [detecting, setDetecting] =
    useState(false);

<<<<<<< HEAD
  const [detectionError, setDetectionError] =
    useState('');

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

=======
  const [error, setError] =
    useState('');

  useEffect(() => {
    const current = getSession();

    setSession(current);

    if (current) {
      setWork(loadWork(current.tenantId));
    }
  }, []);

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

  if (session.status === 'EXPIRED') {
    return (
      <AppShell title="Event Details">
        <LockedCard />
      </AppShell>
    );
  }

>>>>>>> 7200fd0 (Improve menu dish detection)
  function updateEvent(
    key: keyof WorkState['event'],
    value: string | number,
  ) {
    if (!work || !session) return;

    const next: WorkState = {
      ...work,
<<<<<<< HEAD

=======
>>>>>>> 7200fd0 (Improve menu dish detection)
      event: {
        ...work.event,
        [key]: value,
      },
    };

    setWork(next);
    saveWork(session.tenantId, next);
  }

  function detectAndNext() {
    if (!work || !session || detecting) {
      return;
    }

<<<<<<< HEAD
    setDetectionError('');
=======
    setError('');
>>>>>>> 7200fd0 (Improve menu dish detection)
    setDetecting(true);

    try {
      const rawMenuText =
        work.event.rawMenuText.trim();

      if (!rawMenuText) {
<<<<<<< HEAD
        setDetectionError(
          'Please paste the menu before continuing.',
        );

        return;
      }

      const detectedDishes =
        parseMenuText(rawMenuText);

      console.log(
        'Detected menu dishes:',
        detectedDishes,
      );

      if (!detectedDishes.length) {
        setDetectionError(
          'No dishes were detected. Confirm that these dish names exist in dishCostMaster.ts.',
        );

=======
        setError(
          'Please paste the menu before continuing.',
        );
        return;
      }

      const dishMaster =
        loadDishMaster(session.tenantId);

      console.log(
        'Dish Master recipes:',
        dishMaster.length,
      );

      if (!dishMaster.length) {
        setError(
          'Dish Master is empty. Import recipes into Dish Master first.',
        );
        return;
      }

      const detected = parseMenuText(
        rawMenuText,
        dishMaster,
      );

      console.log(
        'Detected dishes:',
        detected,
      );

      if (!detected.length) {
        setError(
          'No dishes were detected. Check Dish Master names, aliases and imported recipes.',
        );
>>>>>>> 7200fd0 (Improve menu dish detection)
        return;
      }

      const next: WorkState = {
        ...work,
<<<<<<< HEAD
        menu: detectedDishes,
=======
        menu: detected,
>>>>>>> 7200fd0 (Improve menu dish detection)
      };

      setWork(next);
      saveWork(session.tenantId, next);

      router.push('/app/menu');
<<<<<<< HEAD
    } catch (error) {
      console.error(
        'Menu detection failed:',
        error,
      );

      setDetectionError(
        error instanceof Error
          ? error.message
          : 'Menu detection failed. Please try again.',
=======
    } catch (detectError) {
      console.error(
        'Menu detection error:',
        detectError,
      );

      setError(
        detectError instanceof Error
          ? detectError.message
          : 'Menu detection failed.',
>>>>>>> 7200fd0 (Improve menu dish detection)
      );
    } finally {
      setDetecting(false);
    }
  }

  function clearPage() {
    if (!work || !session) return;

    const next: WorkState = {
      ...work,
<<<<<<< HEAD

=======
>>>>>>> 7200fd0 (Improve menu dish detection)
      event: {
        ...work.event,
        clientName: '',
        eventName: '',
        eventDate: '',
        functionType: '',
        pax: 0,
        city: '',
        venue: '',
<<<<<<< HEAD
        uploadFileName: '',
        rawMenuText: '',
      },

      menu: [],
    };

    setDetectionError('');
=======
        rawMenuText: '',
      },
      menu: [],
    };

    setError('');
>>>>>>> 7200fd0 (Improve menu dish detection)
    setWork(next);

    saveWork(session.tenantId, next);
<<<<<<< HEAD
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

  if (session.status === 'EXPIRED') {
    return (
      <AppShell title="Event Details">
        <LockedCard />
      </AppShell>
    );
=======
>>>>>>> 7200fd0 (Improve menu dish detection)
  }

  return (
    <AppShell
      title="Event Details + Menu"
<<<<<<< HEAD
      subtitle="Enter event details and paste the complete menu"
=======
      subtitle="First page: client details, pax and pasted menu text"
>>>>>>> 7200fd0 (Improve menu dish detection)
    >
      <section className="content-grid">
        <div className="glass-card">
          <div className="section-kicker">
            Step 1 of 5
          </div>

          <h2>Event Information</h2>

          <div
            className="helper-card"
            style={{ marginBottom: 16 }}
          >
<<<<<<< HEAD
            <b>Start with event details</b>

            <p>
              Add the client, event, date and guest
              information before detecting the menu.
=======
            <b>Start with the basics</b>

            <p>
              Fill the event details first, then
              paste the complete menu below.
>>>>>>> 7200fd0 (Improve menu dish detection)
            </p>
          </div>

          <div className="form-grid">
            <div className="three-grid">
              <div className="field">
<<<<<<< HEAD
                <label htmlFor="clientName">
                  Client Name
                </label>

                <input
                  id="clientName"
=======
                <label>Client Name</label>

                <input
>>>>>>> 7200fd0 (Improve menu dish detection)
                  className="input input-large"
                  value={work.event.clientName}
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
<<<<<<< HEAD
                <label htmlFor="eventName">
                  Event Name
                </label>

                <input
                  id="eventName"
=======
                <label>Event Name</label>

                <input
>>>>>>> 7200fd0 (Improve menu dish detection)
                  className="input input-large"
                  value={work.event.eventName}
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
<<<<<<< HEAD
                <label htmlFor="eventDate">
                  Event Date
                </label>

                <input
                  id="eventDate"
=======
                <label>Event Date</label>

                <input
>>>>>>> 7200fd0 (Improve menu dish detection)
                  className="input input-large"
                  type="date"
                  value={work.event.eventDate}
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
<<<<<<< HEAD
                <label htmlFor="functionType">
                  Function Type
                </label>

                <input
                  id="functionType"
=======
                <label>Function Type</label>

                <input
>>>>>>> 7200fd0 (Improve menu dish detection)
                  className="input input-large"
                  value={work.event.functionType}
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
<<<<<<< HEAD
                <label htmlFor="pax">
                  Pax / Guests
                </label>

                <input
                  id="pax"
=======
                <label>Pax / Guests</label>

                <input
>>>>>>> 7200fd0 (Improve menu dish detection)
                  className="input input-large"
                  type="number"
                  min="1"
                  inputMode="numeric"
                  value={work.event.pax || ''}
<<<<<<< HEAD
                  onChange={(event) => {
                    const pax = Math.max(
                      0,
                      Number(event.target.value),
                    );

                    updateEvent('pax', pax);
                  }}
=======
                  onChange={(event) =>
                    updateEvent(
                      'pax',
                      Math.max(
                        0,
                        Number(event.target.value),
                      ),
                    )
                  }
>>>>>>> 7200fd0 (Improve menu dish detection)
                  placeholder="300"
                />
              </div>

              <div className="field">
<<<<<<< HEAD
                <label htmlFor="city">
                  City
                </label>

                <input
                  id="city"
=======
                <label>City</label>

                <input
>>>>>>> 7200fd0 (Improve menu dish detection)
                  className="input input-large"
                  value={work.event.city}
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
<<<<<<< HEAD
              <label htmlFor="venue">
                Venue
              </label>

              <input
                id="venue"
=======
              <label>Venue</label>

              <input
>>>>>>> 7200fd0 (Improve menu dish detection)
                className="input input-large"
                value={work.event.venue}
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

        <div className="glass-card">
          <div className="section-kicker">
<<<<<<< HEAD
            Menu Detection
=======
            Paste Only
>>>>>>> 7200fd0 (Improve menu dish detection)
          </div>

          <h2>Paste Menu</h2>

          <div
            className="helper-card"
            style={{ marginBottom: 16 }}
          >
<<<<<<< HEAD
            <b>Paste the complete menu</b>

            <p>
              Items can be separated with new lines,
              commas, slashes, semicolons or bullets.
              Only dishes available in the Dish Cost
              Master will be detected.
=======
            <b>One message is enough</b>

            <p>
              Paste menu items separated by new
              lines, commas, slashes or bullets.
>>>>>>> 7200fd0 (Improve menu dish detection)
            </p>
          </div>

          <div className="form-grid">
            <div className="field">
<<<<<<< HEAD
              <label htmlFor="rawMenuText">
                Paste Menu Text
              </label>

              <textarea
                id="rawMenuText"
                className="textarea textarea-large"
                value={work.event.rawMenuText}
                onChange={(event) => {
                  setDetectionError('');

                  updateEvent(
                    'rawMenuText',
                    event.target.value,
                  );
                }}
                placeholder={`Breakfast

Orange Juice
Vegetable Poha
Mini Idli
Medu Vada
Paneer Tikka
Paneer Butter Masala
Dal Fry
Jeera Rice
Butter Naan
Gulab Jamun`}
              />
            </div>

            {detectionError ? (
              <div
                className="helper-card"
                role="alert"
                style={{
                  borderColor:
                    'rgba(239, 68, 68, 0.45)',
                  background:
                    'rgba(239, 68, 68, 0.08)',
                }}
              >
                <b>Detection problem</b>

                <p>{detectionError}</p>
=======
              <label>Paste Menu Text</label>

              <textarea
                className="textarea textarea-large"
                value={work.event.rawMenuText}
                onChange={(event) =>
                  updateEvent(
                    'rawMenuText',
                    event.target.value,
                  )
                }
                placeholder="Orange Juice / Manchow Soup / Paneer Tikka / Paneer Butter Masala / Naan / Dal Fry / Jeera Rice / Gulab Jamun"
              />
            </div>

            {error ? (
              <div
                className="helper-card"
                style={{
                  borderColor:
                    'rgba(239, 68, 68, 0.45)',
                }}
              >
                <b>Detection problem</b>
                <p>{error}</p>
>>>>>>> 7200fd0 (Improve menu dish detection)
              </div>
            ) : null}

            <div className="action-row page-actions">
              <button
                className="primary-button"
<<<<<<< HEAD
                type="button"
=======
>>>>>>> 7200fd0 (Improve menu dish detection)
                onClick={detectAndNext}
                disabled={detecting}
              >
                {detecting
                  ? 'Detecting Dishes...'
                  : 'Next: Check Menu'}
              </button>

              <button
                className="ghost-button"
<<<<<<< HEAD
                type="button"
=======
>>>>>>> 7200fd0 (Improve menu dish detection)
                onClick={clearPage}
                disabled={detecting}
              >
                Clear This Page
              </button>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}