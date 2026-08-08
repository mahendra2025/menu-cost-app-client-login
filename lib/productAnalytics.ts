'use client';

import type { WorkState } from './types';

type AnalyticsMetadata = Record<
  string,
  string | number | boolean | null | undefined
>;

const VISITOR_KEY =
  'menu_costing_analytics_visitor_v1';
const ONCE_PREFIX =
  'menu_costing_analytics_once_v1:';

function randomId() {
  if (
    typeof crypto !== 'undefined' &&
    'randomUUID' in crypto
  ) {
    return crypto.randomUUID();
  }

  return `visitor_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export function getAnalyticsVisitorId() {
  if (typeof window === 'undefined') {
    return '';
  }

  let value =
    window.localStorage.getItem(
      VISITOR_KEY,
    );

  if (!value) {
    value = randomId();
    window.localStorage.setItem(
      VISITOR_KEY,
      value,
    );
  }

  return value;
}

function simpleHash(value: string) {
  let hash = 5381;

  for (
    let index = 0;
    index < value.length;
    index += 1
  ) {
    hash =
      (hash * 33) ^
      value.charCodeAt(index);
  }

  return (
    hash >>> 0
  ).toString(36);
}

export function getCostingAnalyticsKey(
  work: Pick<
    WorkState,
    'event' | 'menu'
  >,
) {
  const signature = [
    work.event.eventDate || '',
    work.event.eventName || '',
    work.event.clientName || '',
    String(work.event.pax || 0),
    ...work.menu
      .map((item) =>
        [
          item.name,
          item.serviceId || '',
          item.dayLabel || '',
          item.mealLabel || '',
        ].join(':'),
      )
      .sort(),
  ]
    .join('|')
    .toLocaleLowerCase('en-IN');

  return `costing_${simpleHash(
    signature,
  )}`;
}

export async function trackProductEvent(
  eventName: string,
  metadata: AnalyticsMetadata = {},
  options?: {
    onceKey?: string;
  },
) {
  if (typeof window === 'undefined') {
    return;
  }

  const visitorId =
    getAnalyticsVisitorId();

  if (!visitorId) return;

  const onceKey =
    options?.onceKey?.trim();

  const storageKey = onceKey
    ? `${ONCE_PREFIX}${eventName}:${simpleHash(
        onceKey,
      )}`
    : '';

  if (
    storageKey &&
    window.localStorage.getItem(
      storageKey,
    ) === '1'
  ) {
    return;
  }

  try {
    const response =
      await fetch(
        '/api/analytics/track',
        {
          method: 'POST',
          credentials: 'same-origin',
          keepalive: true,
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            eventName,
            visitorId,
            path:
              window.location
                .pathname,
            metadata,
          }),
        },
      );

    if (
      response.ok &&
      storageKey
    ) {
      window.localStorage.setItem(
        storageKey,
        '1',
      );
    }
  } catch {
    // Analytics must never interrupt the product workflow.
  }
}
