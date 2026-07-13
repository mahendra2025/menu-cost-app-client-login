import { NextResponse } from 'next/server';
import { requireClientTenantId } from '../../../../lib/billingAuth';
import { prisma } from '../../../../lib/prisma';
import { getRazorpayConfig, razorpayRequest } from '../../../../lib/razorpay';

type RazorpaySubscription = { id: string; status: string; current_end?: number };

export async function POST() {
  try {
    const tenantId = await requireClientTenantId();
    if (!tenantId) return NextResponse.json({ error: 'Client login required' }, { status: 401 });
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    const config = getRazorpayConfig();
    if (!config.configured) return NextResponse.json({ error: 'Razorpay billing is not configured yet' }, { status: 503 });

    if (tenant.razorpaySubscriptionId && ['created', 'authenticated', 'active', 'pending'].includes(tenant.subscriptionStatus || '')) {
      return NextResponse.json({ keyId: config.keyId, subscriptionId: tenant.razorpaySubscriptionId });
    }

    const subscription = await razorpayRequest<RazorpaySubscription>('/subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        plan_id: config.planId,
        total_count: Math.max(1, Number(process.env.RAZORPAY_SUBSCRIPTION_CYCLES) || 12),
        quantity: 1,
        customer_notify: 1,
        notes: { tenant_id: tenant.id, client_email: tenant.email, plan: tenant.plan },
      }),
    });
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        razorpaySubscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        currentPeriodEnd: subscription.current_end ? new Date(subscription.current_end * 1000) : null,
        cancelAtPeriodEnd: false,
      },
    });
    return NextResponse.json({ keyId: config.keyId, subscriptionId: subscription.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not create subscription' }, { status: 500 });
  }
}
