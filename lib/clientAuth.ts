import { createHmac, timingSafeEqual } from 'crypto';
import { getRequiredEnv } from './env';

const CLIENT_COOKIE_NAME = 'menu_cost_client_session';

function signTenantId(tenantId: string) {
  return createHmac('sha256', getRequiredEnv('ADMIN_SESSION_SECRET')).update(tenantId).digest('hex');
}

export function getClientCookieName() {
  return CLIENT_COOKIE_NAME;
}

export function createClientSessionToken(tenantId: string) {
  return `${tenantId}.${signTenantId(tenantId)}`;
}

export function readClientSessionToken(token: string | undefined) {
  if (!token) return null;
  const separator = token.lastIndexOf('.');
  if (separator <= 0) return null;
  const tenantId = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expected = Buffer.from(signTenantId(tenantId));
  const provided = Buffer.from(signature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;
  return tenantId;
}
