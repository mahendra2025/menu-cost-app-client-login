import { NextResponse } from 'next/server';
import { requireClientTenantId } from '../../../../lib/billingAuth';

export async function GET() {
  const workspaceId =
    await requireClientTenantId();

  if (!workspaceId) {
    return NextResponse.json(
      {
        error:
          'Owner login required',
      },
      { status: 401 },
    );
  }

  /*
   * Compatibility endpoint only.
   * SaaS plans and costing allowances are removed.
   */
  return NextResponse.json({
    workspaceMode:
      'SINGLE_BUSINESS',
    plan: 'SINGLE',
    status: 'ACTIVE',
    hasProAccess: true,
    unlimited: true,
    limit: 0,
    used: 0,
    remaining: null,
    currentClaimed: true,
    currentCompleted: false,
    canStartNew: true,
    canUseCurrentCosting: true,
  });
}
