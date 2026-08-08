import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { requireClientTenantId } from '../../../../lib/billingAuth';
import { prisma } from '../../../../lib/prisma';

const FREE_LIMIT = 5;
const MAX_SNAPSHOT_BYTES = 1_500_000;

function hasProAccess(tenant: { plan: string; subscriptionStatus: string | null }) {
  const status = String(tenant.subscriptionStatus || '').toLowerCase();
  return tenant.plan !== 'FREE' && !['halted','cancelled','completed','paused','expired'].includes(status);
}

function clean(value: unknown, max = 180) {
  return String(value || '').trim().slice(0, max);
}

function num(value: unknown) {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function int(value: unknown) {
  return Math.max(0, Math.round(num(value)));
}

export async function GET(request: Request) {
  try {
    const tenantId = await requireClientTenantId();
    if (!tenantId) return NextResponse.json({ error: 'Client login required' }, { status: 401 });

    const url = new URL(request.url);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || 20));
    const costings = await prisma.tenantCostingHistory.findMany({
      where: { tenantId },
      orderBy: { completedAt: 'desc' },
      take: limit,
      select: {
        id: true, costingId: true, eventName: true, clientName: true, eventDate: true,
        menuCount: true, totalCovers: true, totalCost: true, sellingPricePerPlate: true,
        totalSelling: true, totalProfit: true, completedAt: true, updatedAt: true,
      },
    });
    return NextResponse.json({ costings });
  } catch (error) {
    console.error('Costing history error:', error);
    return NextResponse.json({ error: 'Could not load costing history' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = await requireClientTenantId();
    if (!tenantId) return NextResponse.json({ error: 'Client login required' }, { status: 401 });

    const body = await request.json();
    const costingId = clean(body.costingId, 120);
    if (!costingId) return NextResponse.json({ error: 'Costing id required' }, { status: 400 });
    if (!body.snapshot || typeof body.snapshot !== 'object') {
      return NextResponse.json({ error: 'Costing snapshot required' }, { status: 400 });
    }

    if (Buffer.byteLength(JSON.stringify(body.snapshot), 'utf8') > MAX_SNAPSHOT_BYTES) {
      return NextResponse.json({ error: 'Costing is too large to save' }, { status: 413 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        select: { plan: true, subscriptionStatus: true },
      });
      if (!tenant) throw new Error('CLIENT_NOT_FOUND');

      const pro = hasProAccess(tenant);
      let currentClaimed = false;

      if (!pro) {
        const existing = await tx.tenantFreeCosting.findUnique({
          where: { tenantId_costingId: { tenantId, costingId } },
          select: { id: true },
        });
        currentClaimed = Boolean(existing);

        if (!existing) {
          const used = await tx.tenantFreeCosting.count({ where: { tenantId } });
          if (used >= FREE_LIMIT) throw new Error('FREE_LIMIT_REACHED');
          await tx.tenantFreeCosting.create({ data: { tenantId, costingId } });
          currentClaimed = true;
        }
      }

      await tx.tenantCostingHistory.upsert({
        where: { tenantId_costingId: { tenantId, costingId } },
        create: {
          tenantId,
          costingId,
          eventName: clean(body.eventName),
          clientName: clean(body.clientName),
          eventDate: clean(body.eventDate, 60),
          menuCount: int(body.menuCount),
          totalCovers: int(body.totalCovers),
          totalCost: num(body.totalCost),
          sellingPricePerPlate: num(body.sellingPricePerPlate),
          totalSelling: num(body.totalSelling),
          totalProfit: num(body.totalProfit),
          snapshot: body.snapshot as Prisma.InputJsonValue,
        },
        update: {
          eventName: clean(body.eventName),
          clientName: clean(body.clientName),
          eventDate: clean(body.eventDate, 60),
          menuCount: int(body.menuCount),
          totalCovers: int(body.totalCovers),
          totalCost: num(body.totalCost),
          sellingPricePerPlate: num(body.sellingPricePerPlate),
          totalSelling: num(body.totalSelling),
          totalProfit: num(body.totalProfit),
          snapshot: body.snapshot as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
      });

      const used = await tx.tenantFreeCosting.count({ where: { tenantId } });
      return {
        plan: tenant.plan,
        hasProAccess: pro,
        used,
        limit: FREE_LIMIT,
        remaining: pro ? null : Math.max(0, FREE_LIMIT - used),
        currentClaimed,
        currentCompleted: true,
        canStartNew: pro || used < FREE_LIMIT,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'FREE_LIMIT_REACHED') {
      return NextResponse.json({
        error: 'Your 5 free costings are used. Upgrade to Pro for unlimited costings.',
        code: 'FREE_LIMIT_REACHED',
        limit: FREE_LIMIT,
      }, { status: 402 });
    }
    if (message === 'CLIENT_NOT_FOUND') {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    console.error('Complete costing error:', error);
    return NextResponse.json({ error: 'Could not complete this costing' }, { status: 500 });
  }
}
