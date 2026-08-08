import { NextResponse } from 'next/server';
import { requireClientTenantId } from '../../../../lib/billingAuth';
import { prisma } from '../../../../lib/prisma';

const FREE_LIMIT = 5;

function hasProAccess(tenant: { plan: string; subscriptionStatus: string | null }) {
  const status = String(tenant.subscriptionStatus || '').toLowerCase();
  return tenant.plan !== 'FREE' && !['halted','cancelled','completed','paused','expired'].includes(status);
}

export async function GET(request: Request) {
  try {
    const tenantId = await requireClientTenantId();
    if (!tenantId) return NextResponse.json({ error: 'Client login required' }, { status: 401 });

    const url = new URL(request.url);
    const costingId = String(url.searchParams.get('costingId') || '').trim();

    const [tenant, used, claim, history] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { plan: true, status: true, subscriptionStatus: true },
      }),
      prisma.tenantFreeCosting.count({ where: { tenantId } }),
      costingId
        ? prisma.tenantFreeCosting.findUnique({
            where: { tenantId_costingId: { tenantId, costingId } },
            select: { id: true },
          })
        : Promise.resolve(null),
      costingId
        ? prisma.tenantCostingHistory.findUnique({
            where: { tenantId_costingId: { tenantId, costingId } },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

    if (!tenant) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    const pro = hasProAccess(tenant);
    const remaining = pro ? null : Math.max(0, FREE_LIMIT - used);
    const currentClaimed = Boolean(claim);

    return NextResponse.json({
      plan: tenant.plan,
      status: tenant.status,
      hasProAccess: pro,
      limit: FREE_LIMIT,
      used,
      remaining,
      currentClaimed,
      currentCompleted: Boolean(history),
      canStartNew: pro || used < FREE_LIMIT,
      canUseCurrentCosting: pro || currentClaimed || used < FREE_LIMIT,
    });
  } catch (error) {
    console.error('Free usage status error:', error);
    return NextResponse.json({ error: 'Could not load free usage' }, { status: 500 });
  }
}
