'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import AppShell from '../../components/AppShell';

import {
  getSession,
  loadWork,
  type PendingDishCandidate,
} from '../../../lib/store';

import type {
  MenuItem,
} from '../../../lib/types';

type CachedDetectionPreview = {
  menu: MenuItem[];
  possibleMissed?: PendingDishCandidate[];
  eventDetails?: Record<string, unknown>;
  source?: 'ai' | 'rules';
};

type CachedDetection = {
  rawMenuText?: string;
  preview?: CachedDetectionPreview;
};

type FunctionGroup = {
  key: string;
  dayLabel: string;
  mealLabel: string;
  detectedPax: number;
  dishes: MenuItem[];
};

function groupKey(
  item: Pick<
    MenuItem,
    | 'serviceId'
    | 'dayLabel'
    | 'mealLabel'
  >,
) {
  return (
    item.serviceId ||
    `${item.dayLabel || 'Event'}::${item.mealLabel || 'Event Menu'}`
  );
}

function candidateGroupKey(
  item: PendingDishCandidate,
) {
  return (
    item.serviceId ||
    `${item.dayLabel || 'Event'}::${item.mealLabel || 'Event Menu'}`
  );
}

export default function MultiFunctionMenuReview() {
  const [ready, setReady] =
    useState(false);

  const [tenantId, setTenantId] =
    useState('');

  const [cached, setCached] =
    useState<CachedDetection | null>(
      null,
    );

  const [defaultPax, setDefaultPax] =
    useState(0);

  const [fileName, setFileName] =
    useState('Uploaded menu');

  const [paxByGroup, setPaxByGroup] =
    useState<Record<string, string>>(
      {},
    );

  const [error, setError] =
    useState('');

  useEffect(() => {
    const session =
      getSession();

    if (!session) {
      window.location.replace(
        '/login',
      );
      return;
    }

    const work =
      loadWork(
        session.tenantId,
      );

    let parsed:
      CachedDetection | null =
      null;

    try {
      parsed =
        JSON.parse(
          sessionStorage.getItem(
            `menu-detection:${session.tenantId}`,
          ) || 'null',
        ) as CachedDetection | null;
    } catch {
      parsed = null;
    }

    if (
      !parsed?.preview ||
      !Array.isArray(
        parsed.preview.menu,
      ) ||
      !parsed.preview.menu.length ||
      parsed.rawMenuText !==
        work.event.rawMenuText
    ) {
      window.location.replace(
        '/app/event?resume=1#menuInput',
      );
      return;
    }

    const initialPax:
      Record<string, string> =
      {};

    for (
      const item
      of parsed.preview.menu
    ) {
      const key =
        groupKey(item);

      const current =
        Number(
          initialPax[key],
        ) || 0;

      const itemPax =
        Math.max(
          0,
          Number(
            item.servicePax,
          ) || 0,
        );

      if (
        itemPax > current
      ) {
        initialPax[key] =
          String(itemPax);
      }
    }

    for (
      const item
      of parsed.preview.menu
    ) {
      const key =
        groupKey(item);

      if (
        !initialPax[key] &&
        Number(work.event.pax) > 0
      ) {
        initialPax[key] =
          String(
            work.event.pax,
          );
      }
    }

    setTenantId(
      session.tenantId,
    );

    setDefaultPax(
      Math.max(
        0,
        Number(
          work.event.pax,
        ) || 0,
      ),
    );

    setFileName(
      work.event.uploadFileName ||
      'Uploaded menu',
    );

    setPaxByGroup(
      initialPax,
    );

    setCached(parsed);
    setReady(true);
  }, []);

  const groups =
    useMemo<FunctionGroup[]>(
      () => {
        const map =
          new Map<
            string,
            FunctionGroup
          >();

        for (
          const item
          of cached?.preview?.menu ||
          []
        ) {
          const key =
            groupKey(item);

          const existing =
            map.get(key);

          if (existing) {
            existing.dishes.push(
              item,
            );

            existing.detectedPax =
              Math.max(
                existing.detectedPax,
                Number(
                  item.servicePax,
                ) || 0,
              );

            continue;
          }

          map.set(
            key,
            {
              key,
              dayLabel:
                item.dayLabel || '',
              mealLabel:
                item.mealLabel ||
                'Event Menu',
              detectedPax:
                Math.max(
                  0,
                  Number(
                    item.servicePax,
                  ) || 0,
                ),
              dishes: [item],
            },
          );
        }

        return Array.from(
          map.values(),
        );
      },
      [cached],
    );



  if (!ready) {
    return (
      <main className="page-shell center-screen">
        <div className="loader-card">
          Preparing detected functions…
        </div>
      </main>
    );
  }

  return (
    <AppShell
      title="Review Functions"
      subtitle="Confirm each detected function and guest count before reviewing dishes."
    >
      <section className="content-grid">
        <div className="glass-card">
          <span className="section-kicker">
            One PDF · Multiple Functions
          </span>

          <h2>
            {groups.length}{' '}
            function{groups.length === 1
              ? ''
              : 's'} detected
          </h2>

          <p>
            Menu Costing has separated the uploaded menu into functions. Confirm the guest count for each one. These guest counts will stay attached to the dishes for ingredient and manpower calculation.
          </p>

          <div
            style={{
              marginTop: 12,
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <span className="status-pill active">
              {fileName}
            </span>

            <span className="status-pill">
              {cached?.preview?.menu.length || 0}{' '}
              detected dishes
            </span>
          </div>
        </div>

        {error ? (
          <div className="alert-card">
            <b>Guest count required</b>
            <span>{error}</span>
          </div>
        ) : null}

        <div
          style={{
            display: 'grid',
            gap: 16,
          }}
        >
          {groups.map(
            (group, index) => {
              const label =
                [
                  group.dayLabel,
                  group.mealLabel,
                ]
                  .filter(Boolean)
                  .join(' • ') ||
                `Function ${index + 1}`;

              return (
                <div
                  className="glass-card"
                  key={group.key}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      gap: 16,
                      alignItems:
                        'flex-start',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <span className="section-kicker">
                        Function {index + 1}
                      </span>

                      <h3>{label}</h3>

                      <p>
                        {group.dishes.length}{' '}
                        dish{group.dishes.length === 1
                          ? ''
                          : 'es'} detected
                      </p>
                    </div>

                    <label
                      className="field"
                      style={{
                        minWidth: 190,
                      }}
                    >
                      <span>
                        Guests for {group.mealLabel}
                      </span>

                      <input
                        className="input"
                        type="number"
                        min="1"
                        inputMode="numeric"
                        value={
                          paxByGroup[
                            group.key
                          ] || ''
                        }
                        onChange={(event) => {
                          setError('');

                          setPaxByGroup(
                            (current) => ({
                              ...current,
                              [group.key]:
                                event.target
                                  .value,
                            }),
                          );
                        }}
                        placeholder={
                          group.detectedPax > 0
                            ? String(
                                group.detectedPax,
                              )
                            : defaultPax > 0
                              ? String(
                                  defaultPax,
                                )
                              : '300'
                        }
                      />

                      <small>
                        Used for ingredient quantities and manpower.
                      </small>
                    </label>
                  </div>

                  <details
                    style={{
                      marginTop: 14,
                    }}
                  >
                    <summary
                      style={{
                        cursor: 'pointer',
                        fontWeight: 700,
                      }}
                    >
                      Preview dishes
                    </summary>

                    <div
                      style={{
                        display: 'grid',
                        gap: 8,
                        marginTop: 12,
                      }}
                    >
                      {group.dishes.map(
                        (dish) => (
                          <div
                            key={dish.id}
                            style={{
                              display: 'flex',
                              justifyContent:
                                'space-between',
                              gap: 12,
                            }}
                          >
                            <span>
                              {dish.name}
                            </span>

                            <small>
                              {dish.category}
                            </small>
                          </div>
                        ),
                      )}
                    </div>
                  </details>
                </div>
              );
            },
          )}
        </div>

        <div className="glass-card">
          <div
            style={{
              display: 'flex',
              justifyContent:
                'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <button
              className="ghost-button"
              type="button"
              onClick={() =>
                window.location.assign(
                  '/app/event?resume=1#menuInput',
                )
              }
            >
              Back to Upload
            </button>

          </div>
        </div>
      </section>
    </AppShell>
  );
}
