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
    const clientName = clean(body.clientName);
    const eventDate = clean(body.eventDate, 30);
    const pax = Math.max(0, Math.round(Number(body.pax) || 0));

    if (!sourceCostingId) return NextResponse.json({ error: 'Source costing id required' }, { status: 400 });
    if (!clientName) return NextResponse.json({ error: 'Client name required for the duplicate' }, { status: 400 });
    if (!eventDate) return NextResponse.json({ error: 'Event date required for the duplicate' }, { status: 400 });
    if (pax <= 0) return NextResponse.json({ error: 'Guest count must be greater than 0' }, { status: 400 });

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
    const menu = Array.isArray(snapshot.menu)
      ? snapshot.menu.map((value) => {
          const row = record(value);
          return row ? { ...row, servicePax: pax } : value;
        })
      : [];
    const manpower = Array.isArray(snapshot.manpower)
      ? snapshot.manpower.map((value) => {
          const row = record(value);
          return row ? { ...row, servicePax: pax } : value;
        })
      : [];

    const functionKeys = new Set(
      menu
        .map((value) => {
          const row = record(value);
          if (!row) return '';
          const serviceId = clean(row.serviceId);
          if (serviceId) return serviceId;
          return `${clean(row.dayLabel)}::${clean(row.mealLabel) || 'Event Menu'}`;
        })
        .filter(Boolean),
    );

    const copiedFunctionCount = Math.max(1, functionKeys.size);
    const totalCovers = pax * copiedFunctionCount;
    const newCostingId = `costing_${randomUUID()}`;
    const work = {
      ...snapshot,
      costingId: newCostingId,
      event: {
        ...event,
        clientName,
        eventDate,
        pax,
        uploadFileName: '',
      },
      menu,
      manpower,
      updatedAt: new Date().toISOString(),
    };

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
        eventName: clean(event.eventName) || source.eventName,
        clientName,
        eventDate,
        menuCount: menu.length,
        totalCovers,
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
      copiedFunctionCount,
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
