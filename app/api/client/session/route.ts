import { NextResponse } from 'next/server';
import { getClientCookieName } from '../../../../lib/clientAuth';

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({ name: getClientCookieName(), value: '', path: '/', maxAge: 0 });
  return response;
}
