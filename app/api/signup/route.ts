import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error:
        'Account creation is disabled. Menu Costing now uses one business owner workspace.',
      code:
        'SINGLE_BUSINESS_MODE',
    },
    { status: 410 },
  );
}
