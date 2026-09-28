import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error:
        'Subscriptions are disabled. Menu Costing now uses one business workspace with no SaaS plan.',
      code:
        'SINGLE_BUSINESS_MODE',
    },
    { status: 410 },
  );
}
