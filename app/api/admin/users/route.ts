import { NextResponse } from 'next/server';

const removedResponse = () =>
  NextResponse.json(
    {
      error:
        'Multi-account management has been removed. Menu Costing now uses one business workspace.',
      code:
        'SINGLE_BUSINESS_MODE',
    },
    { status: 410 },
  );

export async function GET() {
  return removedResponse();
}

export async function POST() {
  return removedResponse();
}

export async function PATCH() {
  return removedResponse();
}

export async function DELETE() {
  return removedResponse();
}
