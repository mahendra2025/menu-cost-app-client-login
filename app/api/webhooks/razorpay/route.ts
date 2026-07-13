import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { verifyRazorpaySignature } from '../../../../lib/razorpay';

type SubscriptionEntity = {
  id?: string;
  status?: string;
  current_end?: number;
  ended_at?: number;
  notes?: { tenant_id?: string };
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature') || '';
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || '';
  if (!webhookSecret || !verifyRazorpaySignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }

  try {
    const event = JSON.parse(rawBody);
    const eventType = String(event.event || 'unknown');
    const eventId = request.headers.get('x-razorpay-event-id') || createHash('sha256').update(rawBody).digest('hex');
    const subscription = (event.payload?.subscription?.entity || {}) as SubscriptionEntity;
    const tenantId = subscription.notes?.tenant_id;
    const supported = new Set(['subscription.authenticated', 'subscription.activated', 'subscription.charged', 'subscription.pending', 'subscription.halted', 'subscription.cancelled', 'subscription.completed']);

    const existing = await prisma.razorpayWebhookEvent.findUnique({ where: { id: eventId } });
    if (existing) return NextResponse.json({ ok: true, duplicate: true });

    const tenant = tenantId
      ? await prisma.tenant.findUnique({ where: { id: tenantId } })
      : subscription.id
        ? await prisma.tenant.findUnique({ where: { razorpaySubscriptionId: subscription.id } })
        : null;

    await prisma.$transaction(async (transaction) => {
      await transaction.razorpayWebhookEvent.create({ data: { id: eventId, eventType } });
      if (tenant && supported.has(eventType)) {
        const active = ['subscription.activated', 'subscription.charged'].includes(eventType);
        const blocked = ['subscription.halted', 'subscription.cancelled', 'subscription.completed'].includes(eventType);
        await transaction.tenant.update({
          where: { id: tenant.id },
          data: {
            razorpaySubscriptionId: subscription.id || tenant.razorpaySubscriptionId,
            subscriptionStatus: subscription.status || eventType.replace('subscription.', ''),
            currentPeriodEnd: subscription.current_end ? new Date(subscription.current_end * 1000) : tenant.currentPeriodEnd,
            cancelAtPeriodEnd: eventType === 'subscription.cancelled' || tenant.cancelAtPeriodEnd,
            ...(active ? { status: 'ACTIVE' } : blocked ? { status: 'EXPIRED' } : {}),
          },
        });
      }
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
