'use client';

import {
  useEffect,
  useState,
} from 'react';

import { useRouter } from 'next/navigation';

import AppShell, {
  LockedCard,
} from '../../components/AppShell';

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

  function detectAndNext() {
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
       * parseMenuText reads dishes from
       * the static dishCostMaster.
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

  function clearPage() {
    if (!work) return;

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
    persistWork(nextWork);
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

  return (
    <AppShell
      title="Event Details + Menu"
      subtitle="Enter event information and paste the complete menu"
    >
      <section className="content-grid">
        <div className="glass-card">
          <div className="section-kicker">
            Step 1 of 5
          </div>

          <h2>Event Information</h2>

          <div
            className="helper-card"
            style={{
              marginBottom: 16,
            }}
          >
            <b>
              Start with the basics
            </b>

            <p>
              Enter the event details,
              guest count and venue.
              Then paste the complete
              menu below.
            </p>
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

        <div className="glass-card">
          <div className="section-kicker">
            Menu Detection
          </div>

          <h2>Paste Menu</h2>

          <div
            className="helper-card"
            style={{
              marginBottom: 16,
            }}
          >
            <b>
              One message is enough
            </b>

            <p>
              Paste the complete menu
              from WhatsApp, notes or
              email in English, Roman
              Hindi, Hindi or Gujarati.
              Separate dishes
              using new lines, commas,
              slashes, semicolons or
              bullets.
            </p>
          </div>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="rawMenuText">
                Paste Menu Text
              </label>

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
            </div>

            {error ? (
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
                <b>
                  Detection problem
                </b>

                <p>{error}</p>
              </div>
            ) : null}

            <div className="helper-card">
              <b>
                Unmatched dishes are
                not deleted
              </b>

              <p>
                A dish not found in the
                catalog will still
                appear on the Menu page.
                Its rate field will stay
                blank so you can enter
                the correct rate manually.
              </p>
            </div>

            <div className="action-row page-actions">
              <button
                className="primary-button"
                type="button"
                onClick={detectAndNext}
                disabled={detecting}
              >
                {detecting
                  ? 'Detecting Dishes...'
                  : 'Next: Check Menu'}
              </button>

              <button
                className="ghost-button"
                type="button"
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
