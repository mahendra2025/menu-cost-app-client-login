import { NextResponse } from 'next/server';

export async function POST() {
  /*
   * Billing is intentionally disabled in single-business mode.
   * Return 200 so an old Razorpay webhook configuration does not
   * keep retrying an event that no longer applies to this product.
   */
  return NextResponse.json({
    ok: true,
    ignored: true,
    reason: 'SINGLE_BUSINESS_MODE',
  });
}
