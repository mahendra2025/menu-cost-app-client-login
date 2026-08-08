import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { requireClientTenantId } from '../../../../lib/billingAuth';
import { prisma } from '../../../../lib/prisma';

const FREE_LIMIT = 5;
const MAX_BYTES = 1_500_000;

function clean(value: unknown, max = 180) {
  return String(value || '').trim().slice(0, max);
}

function num(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function int(value: unknown) {
  return Math.max(0, Math.round(num(value)));
}

function hasProAccess(tenant: { plan: string; subscriptionStatus: string | null }) {
  const status = String(tenant.subscriptionStatus || '').toLowerCase();
  return tenant.plan !== 'FREE' && !['halted', 'cancelled', 'completed', 'paused', 'expired'].includes(status);
}

export async function GET(request: Request) {
  try {
    const tenantId = await requireClientTenantId();
    if (!tenantId) return NextResponse.json({ error: 'Client login required' }, { status: 401 });

    const url = new URL(request.url);
    const costingId = clean(url.searchParams.get('costingId'), 120);

    if (costingId) {
      const costing = await prisma.tenantCostingHistory.findUnique({
        where: { tenantId_costingId: { tenantId, costingId } },
      });
      if (!costing) return NextResponse.json({ error: 'Completed costing not found' }, { status: 404 });
      return NextResponse.json({ costing });
    }

    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 50));
    const archived = url.searchParams.get('archived') === '1';

    const costings = await prisma.tenantCostingHistory.findMany({
      where: { tenantId, archivedAt: archived ? { not: null } : null },
      orderBy: { completedAt: 'desc' },
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
        completedAt: true,
        createdAt: true,
        updatedAt: true,
        archivedAt: true,
      },
    });

    return NextResponse.json({ costings });
  } catch (error) {
    console.error('Costing GET error:', error);
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
    if (Buffer.byteLength(JSON.stringify(body.snapshot), 'utf8') > MAX_BYTES) {
      return NextResponse.json({ error: 'Costing is too large to save' }, { status: 413 });
    }

    let finalResult: {
      plan: string;
      hasProAccess: boolean;
      used: number;
      limit: number;
      remaining: number | null;
      currentClaimed: boolean;
      currentCompleted: boolean;
      canStartNew: boolean;
    } | null = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        finalResult = await prisma.$transaction(async (tx) => {
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
              archivedAt: null,
            },
          });

          await tx.tenantDraftCosting.deleteMany({ where: { tenantId, costingId } });

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

        break;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034' &&
          attempt < 2
        ) {
          continue;
        }
        throw error;
      }
    }

    if (!finalResult) throw new Error('COMPLETE_FAILED');
    return NextResponse.json({ ok: true, ...finalResult });
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

export async function PATCH(request: Request) {
  try {
    const tenantId = await requireClientTenantId();
    if (!tenantId) return NextResponse.json({ error: 'Client login required' }, { status: 401 });

    const body = await request.json();
    const costingId = clean(body.costingId, 120);
    if (!costingId) return NextResponse.json({ error: 'Costing id required' }, { status: 400 });

    const archived = Boolean(body.archived);
    const result = await prisma.tenantCostingHistory.updateMany({
      where: { tenantId, costingId },
      data: { archivedAt: archived ? new Date() : null },
    });

    if (!result.count) return NextResponse.json({ error: 'Completed costing not found' }, { status: 404 });
    return NextResponse.json({ ok: true, archived });
  } catch (error) {
    console.error('Costing PATCH error:', error);
    return NextResponse.json({ error: 'Could not update costing history' }, { status: 500 });
  }
}
