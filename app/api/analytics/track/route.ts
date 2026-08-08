import {
  Prisma,
} from '@prisma/client';
import {
  NextResponse,
} from 'next/server';
import {
  cookies,
} from 'next/headers';

import {
  getClientCookieName,
  readClientSessionToken,
} from '../../../../lib/clientAuth';
import {
  prisma,
} from '../../../../lib/prisma';

const allowedEvents =
  new Set([
    'page_view',
    'landing_view',
    'signup_view',
    'signup_cta_click',
    'onboarding_view',
    'menu_detected',
    'menu_saved',
    'cost_reviewed',
    'final_costing_viewed',
    'final_costing_complete',
    'pdf_exported',
    'quotation_accepted',
    'quotation_whatsapp',
    'quotation_pdf',
    'quotation_saved',
    'costing_duplicated',
  ]);

function cleanString(
  value: unknown,
  max = 160,
) {
  return String(value || '')
    .trim()
    .slice(0, max);
}

function sanitizeMetadata(
  value: unknown,
) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return {};
  }

  const result: Record<
    string,
    string | number | boolean | null
  > = {};

  Object.entries(
    value as Record<
      string,
      unknown
    >,
  )
    .slice(0, 20)
    .forEach(([key, item]) => {
      const cleanKey =
        cleanString(key, 60);

      if (!cleanKey) return;

      if (
        typeof item ===
          'string'
      ) {
        result[cleanKey] =
          item.slice(0, 200);
      } else if (
        typeof item ===
          'number' &&
        Number.isFinite(item)
      ) {
        result[cleanKey] =
          item;
      } else if (
        typeof item ===
          'boolean' ||
        item === null
      ) {
        result[cleanKey] =
          item;
      }
    });

  return result;
}

export async function POST(
  request: Request,
) {
  try {
    const body =
      await request.json();

    const eventName =
      cleanString(
        body.eventName,
        80,
      );

    const visitorId =
      cleanString(
        body.visitorId,
        120,
      );

    const path =
      cleanString(
        body.path,
        180,
      );

    if (
      !allowedEvents.has(
        eventName,
      )
    ) {
      return NextResponse.json(
        {
          error:
            'Unsupported analytics event',
        },
        {
          status: 400,
        },
      );
    }

    if (!visitorId) {
      return NextResponse.json(
        {
          error:
            'Visitor id required',
        },
        {
          status: 400,
        },
      );
    }

    const cookieStore =
      await cookies();

    const tenantId =
      readClientSessionToken(
        cookieStore.get(
          getClientCookieName(),
        )?.value,
      );

    const metadata =
      sanitizeMetadata(
        body.metadata,
      );

    await prisma
      .productAnalyticsEvent
      .create({
        data: {
          eventName,
          visitorId,
          tenantId,
          path,
          metadata:
            metadata as Prisma.InputJsonValue,
        },
      });

    return NextResponse.json({
      ok: true,
    });
  } catch {
    return NextResponse.json(
      {
        error:
          'Analytics event could not be stored',
      },
      {
        status: 500,
      },
    );
  }
}
