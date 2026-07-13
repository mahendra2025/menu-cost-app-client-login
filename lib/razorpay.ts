import { createHmac, timingSafeEqual } from 'crypto';

export function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim() || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim() || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim() || '';
  const planId = process.env.RAZORPAY_PLAN_PRO_ID?.trim() || '';
  return { keyId, keySecret, planId, configured: Boolean(keyId && keySecret && planId) };
}

export async function razorpayRequest<T>(path: string, init: RequestInit = {}) {
  const { keyId, keySecret, configured } = getRazorpayConfig();
  if (!configured) throw new Error('Razorpay is not configured');
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
    cache: 'no-store',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.description || 'Razorpay request failed');
  return data as T;
}

export function verifyRazorpaySignature(payload: string, signature: string, secret: string) {
  const expected = Buffer.from(createHmac('sha256', secret).update(payload).digest('hex'));
  const provided = Buffer.from(signature || '');
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}
