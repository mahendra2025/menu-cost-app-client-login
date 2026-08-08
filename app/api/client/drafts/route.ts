import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { requireClientTenantId } from '../../../../lib/billingAuth';
import { prisma } from '../../../../lib/prisma';

const MAX_BYTES = 1_500_000;

function clean(value: unknown, max = 180) {
  return String(value || '').trim().slice(0, max);
}

function num(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function asRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export async function GET(request: Request) {
  try {
    const tenantId = await requireClientTenantId();
    if (!tenantId) return NextResponse.json({ error: 'Client login required' }, { status: 401 });

    const url = new URL(request.url);
    const costingId = clean(url.searchParams.get('costingId'), 120);

    if (costingId) {
      const draft = await prisma.tenantDraftCosting.findUnique({
        where: { tenantId_costingId: { tenantId, costingId } },
      });
      if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
      return NextResponse.json({ draft });
    }

    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 50));
    const drafts = await prisma.tenantDraftCosting.findMany({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        costingId: true,
        eventName: true,
        clientName: true,
        eventDate: true,
        menuCount: true,
        totalCovers: true,
        totalCost: true,
        sellingPricePerPlate: true,
        totalSelling: true,
        totalProfit: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ drafts });
  } catch (error) {
    console.error('Draft GET error:', error);
    return NextResponse.json({ error: 'Could not load drafts' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const tenantId = await requireClientTenantId();
    if (!tenantId) return NextResponse.json({ error: 'Client login required' }, { status: 401 });

    const body = await request.json();
    const work = asRecord(body.work);
    const costingId = clean(work?.costingId, 120);

    if (!work || !costingId) {
      return NextResponse.json({ error: 'Valid draft work required' }, { status: 400 });
    }

    if (Buffer.byteLength(JSON.stringify(work), 'utf8') > MAX_BYTES) {
      return NextResponse.json({ error: 'Draft is too large to save' }, { status: 413 });
    }

    const event = asRecord(work.event) || {};
    const menu = Array.isArray(work.menu) ? work.menu : [];

    const draft = await prisma.tenantDraftCosting.upsert({
      where: { tenantId_costingId: { tenantId, costingId } },
      create: {
        tenantId,
        costingId,
        eventName: clean(event.eventName),
        clientName: clean(event.clientName),
        eventDate: clean(event.eventDate, 60),
        menuCount: menu.length,
        totalCovers: Math.max(0, Math.round(num(body.totalCovers))),
        totalCost: num(body.totalCost),
        sellingPricePerPlate: num(work.sellingPricePerPlate),
        totalSelling: num(body.totalSelling),
        totalProfit: num(body.totalProfit),
        workData: work as Prisma.InputJsonValue,
      },
      update: {
        eventName: clean(event.eventName),
        clientName: clean(event.clientName),
        eventDate: clean(event.eventDate, 60),
        menuCount: menu.length,
        totalCovers: Math.max(0, Math.round(num(body.totalCovers))),
        totalCost: num(body.totalCost),
        sellingPricePerPlate: num(work.sellingPricePerPlate),
        totalSelling: num(body.totalSelling),
        totalProfit: num(body.totalProfit),
        workData: work as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ ok: true, costingId: draft.costingId, updatedAt: draft.updatedAt });
  } catch (error) {
    console.error('Draft PUT error:', error);
    return NextResponse.json({ error: 'Could not save draft' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const tenantId = await requireClientTenantId();
    if (!tenantId) return NextResponse.json({ error: 'Client login required' }, { status: 401 });

    const costingId = clean(new URL(request.url).searchParams.get('costingId'), 120);
    if (!costingId) return NextResponse.json({ error: 'Costing id required' }, { status: 400 });

    await prisma.tenantDraftCosting.deleteMany({ where: { tenantId, costingId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Draft DELETE error:', error);
    return NextResponse.json({ error: 'Could not delete draft' }, { status: 500 });
  }
}
