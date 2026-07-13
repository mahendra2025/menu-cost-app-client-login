import { NextResponse } from 'next/server';
import { requireClientTenantId } from '../../../../lib/billingAuth';
import { prisma } from '../../../../lib/prisma';
import { getRazorpayConfig } from '../../../../lib/razorpay';

export async function GET() {
  const tenantId = await requireClientTenantId();
  if (!tenantId) return NextResponse.json({ error: 'Client login required' }, { status: 401 });
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true, status: true, subscriptionStatus: true, currentPeriodEnd: true, cancelAtPeriodEnd: true, razorpaySubscriptionId: true },
  });
  if (!tenant) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  return NextResponse.json({ ...tenant, configured: getRazorpayConfig().configured });
}
