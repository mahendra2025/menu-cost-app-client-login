import {
  randomUUID,
} from 'crypto';
import {
  NextResponse,
} from 'next/server';

import {
  requireClientTenantId,
} from '../../../../../lib/billingAuth';
import {
  prisma,
} from '../../../../../lib/prisma';

const FREE_LIMIT = 5;

function hasProAccess(
  tenant: {
    plan: string;
    subscriptionStatus:
      | string
      | null;
  },
) {
  const status =
    String(
      tenant.subscriptionStatus ||
        '',
    ).toLowerCase();

  return (
    tenant.plan !== 'FREE' &&
    ![
      'halted',
      'cancelled',
      'completed',
      'paused',
      'expired',
    ].includes(status)
  );
}

function clean(
  value: unknown,
  max = 120,
) {
  return String(value || '')
    .trim()
    .slice(0, max);
}

function asRecord(
  value: unknown,
) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return null;
  }

  return value as Record<
    string,
    unknown
  >;
}

export async function POST(
  request: Request,
) {
  try {
    const tenantId =
      await requireClientTenantId();

    if (!tenantId) {
      return NextResponse.json(
        {
          error:
            'Client login required',
        },
        {
          status: 401,
        },
      );
    }

    const body =
      await request.json();

    const sourceCostingId =
      clean(
        body.sourceCostingId,
      );

    if (!sourceCostingId) {
      return NextResponse.json(
        {
          error:
            'Source costing id required',
        },
        {
          status: 400,
        },
      );
    }

    const [
      tenant,
      used,
      source,
    ] = await Promise.all([
      prisma.tenant.findUnique({
        where: {
          id: tenantId,
        },
        select: {
          plan: true,
          subscriptionStatus:
            true,
        },
      }),

      prisma.tenantFreeCosting.count({
        where: {
          tenantId,
        },
      }),

      prisma.tenantCostingHistory.findUnique({
        where: {
          tenantId_costingId: {
            tenantId,
            costingId:
              sourceCostingId,
          },
        },
        select: {
          snapshot: true,
          eventName: true,
          clientName: true,
        },
      }),
    ]);

    if (!tenant) {
      return NextResponse.json(
        {
          error:
            'Client not found',
        },
        {
          status: 404,
        },
      );
    }

    if (!source) {
      return NextResponse.json(
        {
          error:
            'Completed costing not found',
        },
        {
          status: 404,
        },
      );
    }

    const pro =
      hasProAccess(tenant);

    if (
      !pro &&
      used >= FREE_LIMIT
    ) {
      return NextResponse.json(
        {
          error:
            'Your 5 free costings are used. Upgrade to Pro to duplicate this costing.',
          code:
            'FREE_LIMIT_REACHED',
          used,
          limit:
            FREE_LIMIT,
        },
        {
          status: 402,
        },
      );
    }

    const snapshot =
      asRecord(
        source.snapshot,
      );

    if (!snapshot) {
      return NextResponse.json(
        {
          error:
            'Saved costing data is not available for duplication',
        },
        {
          status: 422,
        },
      );
    }

    const event =
      asRecord(
        snapshot.event,
      ) || {};

    const newCostingId =
      `costing_${randomUUID()}`;

    const duplicatedWork = {
      ...snapshot,
      costingId:
        newCostingId,
      event: {
        ...event,
        eventDate: '',
        uploadFileName: '',
      },
      updatedAt:
        new Date().toISOString(),
    };

    return NextResponse.json({
      ok: true,
      sourceCostingId,
      newCostingId,
      sourceLabel:
        source.eventName ||
        source.clientName ||
        'Completed costing',
      work:
        duplicatedWork,
      hasProAccess: pro,
      used,
      limit:
        FREE_LIMIT,
      remaining: pro
        ? null
        : Math.max(
            0,
            FREE_LIMIT -
              used,
          ),
    });
  } catch (error) {
    console.error(
      'Duplicate costing error:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Could not duplicate this costing',
      },
      {
        status: 500,
      },
    );
  }
}
