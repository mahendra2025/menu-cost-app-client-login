import { NextResponse } from 'next/server';
import { requireClientTenantId } from '../../../../lib/billingAuth';
import { prisma } from '../../../../lib/prisma';
import { getRazorpayConfig, verifyRazorpaySignature } from '../../../../lib/razorpay';

export async function POST(request: Request) {
  const tenantId = await requireClientTenantId();
  if (!tenantId) return NextResponse.json({ error: 'Client login required' }, { status: 401 });
  const body = await request.json();
  const paymentId = String(body.razorpay_payment_id || '');
  const subscriptionId = String(body.razorpay_subscription_id || '');
  const signature = String(body.razorpay_signature || '');
  const config = getRazorpayConfig();
  if (!config.configured || !paymentId || !subscriptionId || !signature) return NextResponse.json({ error: 'Invalid payment response' }, { status: 400 });
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant || tenant.razorpaySubscriptionId !== subscriptionId) return NextResponse.json({ error: 'Subscription mismatch' }, { status: 400 });
  if (!verifyRazorpaySignature(`${paymentId}|${subscriptionId}`, signature, config.keySecret)) return NextResponse.json({ error: 'Payment signature verification failed' }, { status: 400 });
  await prisma.tenant.update({ where: { id: tenantId }, data: { subscriptionStatus: 'authenticated' } });
  return NextResponse.json({ ok: true });
}
