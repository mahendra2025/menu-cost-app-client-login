'use client';

import { useEffect, useState } from 'react';
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

  function updateEvent(
    key: keyof WorkState['event'],
    value: string | number,
  ) {
    if (!work || !session) return;

    const next: WorkState = {
      ...work,

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

    setDetectionError('');
    setDetecting(true);

    try {
      const rawMenuText =
        work.event.rawMenuText.trim();

      if (!rawMenuText) {
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

        return;
      }

      const next: WorkState = {
        ...work,
        menu: detectedDishes,
      };

      setWork(next);
      saveWork(session.tenantId, next);

      router.push('/app/menu');
    } catch (error) {
      console.error(
        'Menu detection failed:',
        error,
      );

      setDetectionError(
        error instanceof Error
          ? error.message
          : 'Menu detection failed. Please try again.',
      );
    } finally {
      setDetecting(false);
    }
  }

  function clearPage() {
    if (!work || !session) return;

    const next: WorkState = {
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

    setDetectionError('');
    setWork(next);

    saveWork(session.tenantId, next);
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
  }

  return (
    <AppShell
      title="Event Details + Menu"
      subtitle="Enter event details and paste the complete menu"
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
            <b>Start with event details</b>

            <p>
              Add the client, event, date and guest
              information before detecting the menu.
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
                <label htmlFor="eventName">
                  Event Name
                </label>

                <input
                  id="eventName"
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
                <label htmlFor="eventDate">
                  Event Date
                </label>

                <input
                  id="eventDate"
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
                <label htmlFor="functionType">
                  Function Type
                </label>

                <input
                  id="functionType"
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
                <label htmlFor="pax">
                  Pax / Guests
                </label>

                <input
                  id="pax"
                  className="input input-large"
                  type="number"
                  min="1"
                  inputMode="numeric"
                  value={work.event.pax || ''}
                  onChange={(event) => {
                    const pax = Math.max(
                      0,
                      Number(event.target.value),
                    );

                    updateEvent('pax', pax);
                  }}
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
              <label htmlFor="venue">
                Venue
              </label>

              <input
                id="venue"
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
            Menu Detection
          </div>

          <h2>Paste Menu</h2>

          <div
            className="helper-card"
            style={{ marginBottom: 16 }}
          >
            <b>Paste the complete menu</b>

            <p>
              Items can be separated with new lines,
              commas, slashes, semicolons or bullets.
              Only dishes available in the Dish Cost
              Master will be detected.
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
              </div>
            ) : null}

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
