import { cookies } from 'next/headers';
import { getClientCookieName, readClientSessionToken } from './clientAuth';

export async function requireClientTenantId() {
  const cookieStore = await cookies();
  return readClientSessionToken(cookieStore.get(getClientCookieName())?.value);
}
