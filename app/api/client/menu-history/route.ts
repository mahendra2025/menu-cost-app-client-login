import { randomUUID } from 'crypto';

import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

import { requireClientTenantId } from '../../../../lib/billingAuth';
import { prisma } from '../../../../lib/prisma';

const MAX_BYTES = 1_500_000;

function clean(value: unknown, max = 180) {
  return String(value || '').trim().slice(0, max);
}

function prefixFor(tenantId: string) {
  return `menu_pdf_history:${tenantId}:`;
}

function asObject(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

export async function GET(request: Request) {
  try {
    const tenantId = await requireClientTenantId();

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Client login required' },
        { status: 401 },
      );
    }

    const url = new URL(request.url);
    const historyId = clean(
      url.searchParams.get('id'),
      260,
    );

    if (historyId) {
      const record = await prisma.menuWork.findUnique({
        where: { id: historyId },
        select: {
          id: true,
          tenantId: true,
          workData: true,
          createdAt: true,
        },
      });

      if (
        !record ||
        record.tenantId !== tenantId ||
        !record.id.startsWith(prefixFor(tenantId))
      ) {
        return NextResponse.json(
          { error: 'Menu history record not found' },
          { status: 404 },
        );
      }

      const data = asObject(record.workData);

      if (!data || data.type !== 'MENU_PDF_HISTORY') {
        return NextResponse.json(
          { error: 'Menu history record not found' },
          { status: 404 },
        );
      }

      return NextResponse.json({
        record: {
          id: record.id,
          downloadedAt:
            clean(data.downloadedAt) ||
            record.createdAt.toISOString(),
          fileName: clean(data.fileName, 240),
          work: data.work,
        },
      });
    }

    const records = await prisma.menuWork.findMany({
      where: {
        tenantId,
        id: {
          startsWith:
            prefixFor(tenantId),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
      select: {
        id: true,
        workData: true,
        createdAt: true,
      },
    });

    const items = records.flatMap((record) => {
      const data = asObject(record.workData);

      if (!data || data.type !== 'MENU_PDF_HISTORY') {
        return [];
      }

      return [{
        id: record.id,
        costingId: clean(data.costingId, 120),
        eventName: clean(data.eventName),
        clientName: clean(data.clientName),
        eventDate: clean(data.eventDate, 80),
        menuCount:
          Math.max(
            0,
            Number(data.menuCount) || 0,
          ),
        functionCount:
          Math.max(
            0,
            Number(data.functionCount) || 0,
          ),
        fileName:
          clean(data.fileName, 240) ||
          'premium-menu.pdf',
        downloadedAt:
          clean(data.downloadedAt) ||
          record.createdAt.toISOString(),
      }];
    });

    return NextResponse.json({
      items,
    });
  } catch (error) {
    console.error(
      'Menu history GET error:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Could not load menu PDF history.',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = await requireClientTenantId();

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Client login required' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const work = asObject(body?.work);

    if (!work) {
      return NextResponse.json(
        { error: 'Menu snapshot required' },
        { status: 400 },
      );
    }

    const menu = Array.isArray(work.menu)
      ? work.menu
      : [];

    if (!menu.length) {
      return NextResponse.json(
        { error: 'Add menu dishes before saving history' },
        { status: 400 },
      );
    }

    const event =
      asObject(work.event) || {};

    const costingId =
      clean(work.costingId, 120) ||
      clean(body?.costingId, 120);

    const functionKeys =
      new Set(
        menu.map((value) => {
          const item =
            asObject(value) || {};

          return (
            clean(item.serviceId, 120) ||
            [
              clean(item.dayLabel, 100),
              clean(item.mealLabel, 100),
            ].join('::')
          );
        }),
      );

    const downloadedAt =
      new Date().toISOString();

    const workData = {
      type: 'MENU_PDF_HISTORY',
      costingId,
      eventName:
        clean(event.eventName) ||
        clean(event.functionType) ||
        'Event',
      clientName:
        clean(event.clientName),
      eventDate:
        clean(event.eventDate, 80),
      menuCount:
        menu.length,
      functionCount:
        Math.max(
          1,
          functionKeys.size,
        ),
      fileName:
        clean(
          body?.fileName,
          240,
        ) ||
        'premium-menu.pdf',
      downloadedAt,
      work,
    } as Prisma.InputJsonValue;

    const json = JSON.stringify(workData);

    if (
      Buffer.byteLength(
        json,
        'utf8',
      ) > MAX_BYTES
    ) {
      return NextResponse.json(
        {
          error:
            'Menu snapshot is too large to save in history.',
        },
        { status: 413 },
      );
    }

    const id =
      `${prefixFor(tenantId)}${Date.now()}:${randomUUID()}`;

    const record =
      await prisma.menuWork.create({
        data: {
          id,
          tenantId,
          workData,
        },
        select: {
          id: true,
          createdAt: true,
        },
      });

    return NextResponse.json({
      ok: true,
      id: record.id,
      downloadedAt:
        record.createdAt,
    });
  } catch (error) {
    console.error(
      'Menu history POST error:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Could not save menu PDF to history.',
      },
      { status: 500 },
    );
  }
}
