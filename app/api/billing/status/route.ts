import { NextResponse } from 'next/server';
import { requireClientTenantId } from '../../../../lib/billingAuth';

export async function GET() {
  const workspaceId =
    await requireClientTenantId();

  if (!workspaceId) {
    return NextResponse.json(
      { error: 'Owner login required' },
      { status: 401 },
    );
  }

  return NextResponse.json({
    workspaceMode: 'SINGLE_BUSINESS',
    configured: false,
    plan: 'SINGLE',
    status: 'ACTIVE',
    hasProAccess: true,
    subscriptionStatus: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    razorpaySubscriptionId: null,
  });
}
