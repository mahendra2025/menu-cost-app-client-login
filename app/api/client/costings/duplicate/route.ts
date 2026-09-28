import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { requireClientTenantId } from '../../../../../lib/billingAuth';
import { prisma } from '../../../../../lib/prisma';

import { duplicateEventWork, validateDuplicateDetails } from '../../../../../lib/duplicateEvent';
import { calculate } from '../../../../../lib/workCosting';
import type { WorkState } from '../../../../../lib/types';

const FREE_LIMIT = 5;

function clean(value: unknown, max = 120) {
  return String(value || '').trim().slice(0, max);
}

function hasProAccess(tenant: { plan: string; subscriptionStatus: string | null }) {
  const status = String(tenant.subscriptionStatus || '').toLowerCase();
  return tenant.plan !== 'FREE' && !['halted', 'cancelled', 'completed', 'paused', 'expired'].includes(status);
}

function record(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export async function POST(request: Request) {
  try {
    const tenantId = await requireClientTenantId();
    if (!tenantId) return NextResponse.json({ error: 'Client login required' }, { status: 401 });

    const body = await request.json();
    const sourceCostingId = clean(body.sourceCostingId);
    if (!sourceCostingId) return NextResponse.json({ error: 'Source costing id required' }, { status: 400 });

    let details;
    if (body.details !== undefined) {
      try {
        details = validateDuplicateDetails(body.details);
      } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid event details' }, { status: 400 });
      }
    }

    const [tenant, used, source] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { plan: true, subscriptionStatus: true },
      }),
      prisma.tenantFreeCosting.count({ where: { tenantId } }),
      prisma.tenantCostingHistory.findUnique({
        where: { tenantId_costingId: { tenantId, costingId: sourceCostingId } },
      }),
    ]);

    if (!tenant) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    if (!source) return NextResponse.json({ error: 'Completed costing not found' }, { status: 404 });

    const pro = hasProAccess(tenant);
    if (!pro && used >= FREE_LIMIT) {
      return NextResponse.json({
        error: 'Your 5 free costings are used. Upgrade to Pro to duplicate this costing.',
        code: 'FREE_LIMIT_REACHED',
        used,
        limit: FREE_LIMIT,
      }, { status: 402 });
    }

    const snapshot = record(source.snapshot);
    if (!snapshot) return NextResponse.json({ error: 'Saved costing data is unavailable' }, { status: 422 });

    if (!record(snapshot.event) || !Array.isArray(snapshot.menu) ||
        !Array.isArray(snapshot.manpower) || !record(snapshot.extras)) {
      return NextResponse.json({ error: 'Saved costing data is incomplete' }, { status: 422 });
    }
    const newCostingId = `costing_${randomUUID()}`;
    const work = duplicateEventWork(snapshot as unknown as WorkState, newCostingId, details);
    const totals = calculate(work);

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
      work,
      hasProAccess: pro,
      used,
      limit: FREE_LIMIT,
      remaining: pro ? null : Math.max(0, FREE_LIMIT - used),
    });
  } catch (error) {
    console.error('Duplicate costing error:', error);
    return NextResponse.json({ error: 'Could not duplicate this costing' }, { status: 500 });
  }
}
