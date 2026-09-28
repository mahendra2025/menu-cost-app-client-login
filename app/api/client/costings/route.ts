import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { requireClientTenantId } from '../../../../lib/billingAuth';
import { syncCompletedCostingToCaterersOs } from '../../../../lib/caterersOsSync';
import { prisma } from '../../../../lib/prisma';
import type { WorkState } from '../../../../lib/types';

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


export async function GET(request: Request) {
  try {
    const tenantId = await requireClientTenantId();
    if (!tenantId) return NextResponse.json({ error: 'Owner login required' }, { status: 401 });

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
    const tenantId =
      await requireClientTenantId();

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Owner login required' },
        { status: 401 },
      );
    }

    const body =
      await request.json();
    const costingId =
      clean(body.costingId, 120);

    if (!costingId) {
      return NextResponse.json(
        { error: 'Costing id required' },
        { status: 400 },
      );
    }

    if (
      !body.snapshot ||
      typeof body.snapshot !==
        'object'
    ) {
      return NextResponse.json(
        {
          error:
            'Costing snapshot required',
        },
        { status: 400 },
      );
    }

    if (
      Buffer.byteLength(
        JSON.stringify(
          body.snapshot,
        ),
        'utf8',
      ) > MAX_BYTES
    ) {
      return NextResponse.json(
        {
          error:
            'Costing is too large to save',
        },
        { status: 413 },
      );
    }

    await prisma.$transaction(
      async (tx) => {
        const workspace =
          await tx.tenant.findUnique({
            where: {
              id: tenantId,
            },
            select: {
              id: true,
            },
          });

        if (!workspace) {
          throw new Error(
            'WORKSPACE_NOT_FOUND',
          );
        }

        await tx.tenantCostingHistory.upsert({
          where: {
            tenantId_costingId: {
              tenantId,
              costingId,
            },
          },
          create: {
            tenantId,
            costingId,
            eventName:
              clean(body.eventName),
            clientName:
              clean(body.clientName),
            eventDate:
              clean(
                body.eventDate,
                60,
              ),
            menuCount:
              int(body.menuCount),
            totalCovers:
              int(body.totalCovers),
            totalCost:
              num(body.totalCost),
            sellingPricePerPlate:
              num(
                body.sellingPricePerPlate,
              ),
            totalSelling:
              num(body.totalSelling),
            totalProfit:
              num(body.totalProfit),
            snapshot:
              body.snapshot as Prisma.InputJsonValue,
          },
          update: {
            eventName:
              clean(body.eventName),
            clientName:
              clean(body.clientName),
            eventDate:
              clean(
                body.eventDate,
                60,
              ),
            menuCount:
              int(body.menuCount),
            totalCovers:
              int(body.totalCovers),
            totalCost:
              num(body.totalCost),
            sellingPricePerPlate:
              num(
                body.sellingPricePerPlate,
              ),
            totalSelling:
              num(body.totalSelling),
            totalProfit:
              num(body.totalProfit),
            snapshot:
              body.snapshot as Prisma.InputJsonValue,
            completedAt:
              new Date(),
            archivedAt:
              null,
          },
        });

        await tx.tenantDraftCosting.deleteMany({
          where: {
            tenantId,
            costingId,
          },
        });
      },
    );

    let caterersOsSync:
      Awaited<
        ReturnType<
          typeof syncCompletedCostingToCaterersOs
        >
      >;

    try {
      caterersOsSync =
        await syncCompletedCostingToCaterersOs({
          work:
            body.snapshot as WorkState,
          summary: {
            menuCount:
              int(body.menuCount),
            totalCovers:
              int(body.totalCovers),
            totalCost:
              num(body.totalCost),
            sellingPricePerPlate:
              num(
                body.sellingPricePerPlate,
              ),
            totalSelling:
              num(body.totalSelling),
            totalProfit:
              num(body.totalProfit),
          },
        });
    } catch (error) {
      console.error(
        'CaterersOS sync preparation error:',
        error,
      );

      caterersOsSync = {
        status: 'failed',
        error:
          'Could not prepare CaterersOS sync',
      };
    }

    if (
      caterersOsSync.status ===
      'failed'
    ) {
      console.error(
        'CaterersOS sync failed:',
        caterersOsSync.error,
      );
    }

    return NextResponse.json({
      ok: true,
      workspaceMode:
        'SINGLE_BUSINESS',
      unlimited: true,

      // Legacy response fields remain harmlessly present
      // so older clients never show a paywall.
      plan: 'SINGLE',
      hasProAccess: true,
      used: 0,
      limit: 0,
      remaining: null,
      currentClaimed: true,
      currentCompleted: true,
      canStartNew: true,
      caterersOsSync,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : '';

    if (
      message ===
      'WORKSPACE_NOT_FOUND'
    ) {
      return NextResponse.json(
        {
          error:
            'Business workspace not found',
        },
        { status: 404 },
      );
    }

    console.error(
      'Complete costing error:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Could not complete this costing',
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const tenantId = await requireClientTenantId();
    if (!tenantId) return NextResponse.json({ error: 'Owner login required' }, { status: 401 });

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
