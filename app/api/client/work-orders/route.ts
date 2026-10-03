import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

import { requireClientTenantId } from '../../../../lib/billingAuth';
import { prisma } from '../../../../lib/prisma';

const MAX_ITEMS = 250;

type WorkOrderMeta = {
  key: string;
  workOrderNumber: string;
  partnerId: string;
  partnerName: string;
  confirmationStatus:
    | 'OPEN'
    | 'CONFIRMED'
    | 'ON_HOLD'
    | 'CLOSED';
  paymentStatus:
    | 'NOT_SET'
    | 'PENDING'
    | 'PARTIAL'
    | 'PAID';
  advancePaid: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

function recordId(
  tenantId: string,
  costingId: string,
) {
  return `work_orders:${tenantId}:${costingId}`;
}

function cleanText(
  value: unknown,
  max = 180,
) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, max);
}

function cleanDate(
  value: unknown,
) {
  const raw =
    cleanText(value, 80);

  if (!raw) return '';

  const date =
    new Date(raw);

  return Number.isNaN(
    date.getTime(),
  )
    ? ''
    : date.toISOString();
}

function cleanItems(
  value: unknown,
): WorkOrderMeta[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(0, MAX_ITEMS)
    .flatMap(
      (
        item,
        index,
      ) => {
        if (
          !item ||
          typeof item !==
            'object' ||
          Array.isArray(item)
        ) {
          return [];
        }

        const row =
          item as Record<
            string,
            unknown
          >;

        const key =
          cleanText(
            row.key,
            180,
          );

        if (!key) {
          return [];
        }

        const rawConfirmation =
          cleanText(
            row.confirmationStatus,
            30,
          ).toUpperCase();

        const confirmationStatus:
          WorkOrderMeta['confirmationStatus'] =
          rawConfirmation ===
          'CONFIRMED'
            ? 'CONFIRMED'
            : rawConfirmation ===
                'ON_HOLD'
              ? 'ON_HOLD'
              : rawConfirmation ===
                  'CLOSED'
                ? 'CLOSED'
                : 'OPEN';

        const rawPayment =
          cleanText(
            row.paymentStatus,
            30,
          ).toUpperCase();

        const paymentStatus:
          WorkOrderMeta['paymentStatus'] =
          rawPayment === 'PAID'
            ? 'PAID'
            : rawPayment ===
                'PARTIAL'
              ? 'PARTIAL'
              : rawPayment ===
                  'PENDING'
                ? 'PENDING'
                : 'NOT_SET';

        const now =
          new Date()
            .toISOString();

        return [
          {
            key,
            workOrderNumber:
              cleanText(
                row.workOrderNumber,
                80,
              ) ||
              `WO-${index + 1}`,
            partnerId:
              cleanText(
                row.partnerId,
                180,
              ),
            partnerName:
              cleanText(
                row.partnerName,
                180,
              ),
            confirmationStatus,
            paymentStatus,
            advancePaid:
              Math.max(
                0,
                Number(
                  row.advancePaid,
                ) || 0,
              ),
            notes:
              cleanText(
                row.notes,
                800,
              ),
            createdAt:
              cleanDate(
                row.createdAt,
              ) ||
              now,
            updatedAt:
              cleanDate(
                row.updatedAt,
              ) ||
              now,
          },
        ];
      },
    );
}

export async function GET(
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

    const costingId =
      cleanText(
        new URL(
          request.url,
        ).searchParams.get(
          'costingId',
        ),
        120,
      );

    if (!costingId) {
      return NextResponse.json(
        {
          error:
            'Costing id required',
        },
        {
          status: 400,
        },
      );
    }

    const record =
      await prisma.menuWork
        .findUnique({
          where: {
            id: recordId(
              tenantId,
              costingId,
            ),
          },
          select: {
            tenantId: true,
            workData: true,
          },
        });

    if (
      !record ||
      record.tenantId !==
        tenantId
    ) {
      return NextResponse.json({
        workOrders: [],
      });
    }

    const data =
      record.workData &&
      typeof record.workData ===
        'object' &&
      !Array.isArray(
        record.workData,
      )
        ? record.workData as Record<
            string,
            unknown
          >
        : {};

    return NextResponse.json({
      workOrders:
        cleanItems(
          data.workOrders,
        ),
    });
  } catch (error) {
    console.error(
      'Work order GET error:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Could not load work orders',
      },
      {
        status: 500,
      },
    );
  }
}

export async function PUT(
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

    const costingId =
      cleanText(
        body?.costingId,
        120,
      );

    if (!costingId) {
      return NextResponse.json(
        {
          error:
            'Costing id required',
        },
        {
          status: 400,
        },
      );
    }

    const workOrders =
      cleanItems(
        body?.workOrders,
      );

    const workData = {
      type:
        'WORK_ORDER_META',
      costingId,
      workOrders,
    } as Prisma.InputJsonValue;

    await prisma.menuWork
      .upsert({
        where: {
          id: recordId(
            tenantId,
            costingId,
          ),
        },
        create: {
          id: recordId(
            tenantId,
            costingId,
          ),
          tenantId,
          workData,
        },
        update: {
          workData,
        },
      });

    return NextResponse.json({
      ok: true,
      costingId,
      workOrders,
    });
  } catch (error) {
    console.error(
      'Work order PUT error:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Could not save work orders',
      },
      {
        status: 500,
      },
    );
  }
}
