import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { requireClientTenantId } from '../../../../../lib/billingAuth';
import { prisma } from '../../../../../lib/prisma';

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

    const event = record(snapshot.event) || {};
    const newCostingId = `costing_${randomUUID()}`;
    const work = {
      ...snapshot,
      costingId: newCostingId,
      event: { ...event, eventDate: '', uploadFileName: '' },
      updatedAt: new Date().toISOString(),
    };

    await prisma.tenantDraftCosting.create({
      data: {
        tenantId,
        costingId: newCostingId,
        eventName: source.eventName,
        clientName: source.clientName,
        eventDate: '',
        menuCount: source.menuCount,
        totalCovers: source.totalCovers,
        totalCost: source.totalCost,
        sellingPricePerPlate: source.sellingPricePerPlate,
        totalSelling: source.totalSelling,
        totalProfit: source.totalProfit,
        workData: work as Prisma.InputJsonValue,
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
