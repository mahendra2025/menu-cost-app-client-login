import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

import { requireClientTenantId } from '../../../../lib/billingAuth';
import { prisma } from '../../../../lib/prisma';

const MAX_BYTES = 900_000;

function clean(value: unknown, max = 160) {
  return String(value || '').trim().slice(0, max);
}

function recordId(tenantId: string, costingId: string) {
  return `event_plan:${tenantId}:${costingId}`;
}

function asPlan(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  const json = JSON.stringify(value);
  if (Buffer.byteLength(json, 'utf8') > MAX_BYTES) {
    throw new Error('Event plan is too large');
  }

  return value as Record<string, unknown>;
}

export async function GET(request: Request) {
  try {
    const tenantId = await requireClientTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'Client login required' }, { status: 401 });
    }

    const costingId = clean(
      new URL(request.url).searchParams.get('costingId'),
      120,
    );

    if (!costingId) {
      return NextResponse.json({ error: 'Costing id required' }, { status: 400 });
    }

    const record = await prisma.menuWork.findUnique({
      where: { id: recordId(tenantId, costingId) },
      select: { tenantId: true, workData: true, updatedAt: true },
    });

    if (!record || record.tenantId !== tenantId) {
      return NextResponse.json({ exists: false, plan: {} });
    }

    const data =
      record.workData &&
      typeof record.workData === 'object' &&
      !Array.isArray(record.workData)
        ? record.workData as Record<string, unknown>
        : {};

    return NextResponse.json({
      exists: true,
      plan: asPlan(data.plan),
      updatedAt: record.updatedAt,
    });
  } catch (error) {
    console.error('Event plan GET error:', error);
    return NextResponse.json({ error: 'Could not load event plan' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const tenantId = await requireClientTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'Client login required' }, { status: 401 });
    }

    const body = await request.json();
    const costingId = clean(body?.costingId, 120);

    if (!costingId) {
      return NextResponse.json({ error: 'Costing id required' }, { status: 400 });
    }

    const plan = asPlan(body?.plan);

    const workData = {
      type: 'EVENT_PLANNING',
      costingId,
      plan,
    } as Prisma.InputJsonValue;

    const record = await prisma.menuWork.upsert({
      where: { id: recordId(tenantId, costingId) },
      create: {
        id: recordId(tenantId, costingId),
        tenantId,
        workData,
      },
      update: { workData },
    });

    return NextResponse.json({
      ok: true,
      costingId,
      updatedAt: record.updatedAt,
    });
  } catch (error) {
    console.error('Event plan PUT error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message === 'Event plan is too large'
            ? error.message
            : 'Could not save event plan',
      },
      { status: 500 },
    );
  }
}
