import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { requireClientTenantId } from '../../../../../lib/billingAuth';
import { prisma } from '../../../../../lib/prisma';

import { duplicateEventWork, validateDuplicateDetails } from '../../../../../lib/duplicateEvent';
import { calculate } from '../../../../../lib/workCosting';
import type { WorkState } from '../../../../../lib/types';

function clean(value: unknown, max = 120) {
  return String(value || '').trim().slice(0, max);
}


function record(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export async function POST(request: Request) {
  try {
    const tenantId = await requireClientTenantId();
    if (!tenantId) return NextResponse.json({ error: 'Owner login required' }, { status: 401 });

    const body = await request.json();
    const sourceCostingId = clean(body.sourceCostingId);
    const clientName = clean(body.clientName);
    const eventDate = clean(body.eventDate, 30);
    const pax = Math.max(0, Math.round(Number(body.pax) || 0));

    if (!sourceCostingId) return NextResponse.json({ error: 'Source costing id required' }, { status: 400 });

    const source =
      await prisma.tenantCostingHistory.findUnique({
        where: {
          tenantId_costingId: {
            tenantId,
            costingId:
              sourceCostingId,
          },
        },
      });

    if (!source) {
      return NextResponse.json(
        {
          error:
            'Completed costing not found',
        },
        { status: 404 },
      );
    }

    const snapshot = record(source.snapshot);
    if (!snapshot) return NextResponse.json({ error: 'Saved costing data is unavailable' }, { status: 422 });

    if (!record(snapshot.event) || !Array.isArray(snapshot.menu) ||
        !Array.isArray(snapshot.manpower) || !record(snapshot.extras)) {
      return NextResponse.json({ error: 'Saved costing data is incomplete' }, { status: 422 });
    }

    let details;
    try {
      details = validateDuplicateDetails(
        body.details !== undefined
          ? body.details
          : {
              clientName,
              eventName: clean(record(snapshot.event)?.eventName) || source.eventName,
              eventDate,
              pax,
            },
      );
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Invalid event details' },
        { status: 400 },
      );
    }

    const newCostingId = `costing_${randomUUID()}`;
    const work = duplicateEventWork(snapshot as unknown as WorkState, newCostingId, details);
    const totals = calculate(work);
    const copiedFunctionCount = Math.max(
      1,
      new Set(
        work.menu.map((item) =>
          item.serviceId || `${item.dayLabel || ''}::${item.mealLabel || 'Event Menu'}`,
        ),
      ).size,
    );

    /*
     * Keep the reusable costing setup (menu rates, manpower rates/quantities,
     * gas settings, transport, disposable setup and selling price) intact.
     * Only booking identity + guest-sensitive service pax are changed here.
     * The client workspace immediately re-saves the draft after opening,
     * which refreshes calculated totals from this copied setup.
     */
    await prisma.tenantDraftCosting.create({
      data: {
        tenantId,
        costingId: newCostingId,
        eventName: work.event.eventName,
        clientName: work.event.clientName,
        eventDate: work.event.eventDate,
        menuCount: work.menu.length,
        totalCovers: totals.totalCovers,
        totalCost: totals.totalCost,
        sellingPricePerPlate: totals.sellingPricePerPlate,
        totalSelling: totals.totalSelling,
        totalProfit: totals.totalProfit,
        workData: work as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      ok: true,
      sourceCostingId,
      newCostingId,
      copiedFunctionCount,
      work,
      workspaceMode: 'SINGLE_BUSINESS',
      unlimited: true,
      hasProAccess: true,
      used: 0,
      limit: 0,
      remaining: null,
    });
  } catch (error) {
    console.error('Duplicate costing error:', error);
    return NextResponse.json({ error: 'Could not duplicate this costing' }, { status: 500 });
  }
}
