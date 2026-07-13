import { NextResponse } from 'next/server';
import { requireClientTenantId } from '../../../../lib/billingAuth';
import { prisma } from '../../../../lib/prisma';
import { razorpayRequest } from '../../../../lib/razorpay';

export async function POST() {
  try {
    const tenantId = await requireClientTenantId();
    if (!tenantId) return NextResponse.json({ error: 'Client login required' }, { status: 401 });
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant?.razorpaySubscriptionId) return NextResponse.json({ error: 'No subscription found' }, { status: 404 });
    await razorpayRequest(`/subscriptions/${tenant.razorpaySubscriptionId}/cancel`, { method: 'POST', body: JSON.stringify({ cancel_at_cycle_end: 1 }) });
    await prisma.tenant.update({ where: { id: tenantId }, data: { cancelAtPeriodEnd: true } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not cancel subscription' }, { status: 500 });
  }
}
