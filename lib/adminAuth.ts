import { createHmac, timingSafeEqual } from 'crypto';
import { getRequiredEnv } from './env';

const ADMIN_COOKIE_NAME = 'menu_cost_admin_session';
const ADMIN_COOKIE_VALUE = 'admin';

function getAdminSessionSecret() {
  return getRequiredEnv('ADMIN_SESSION_SECRET');
}

function signAdminValue(value: string) {
  return createHmac('sha256', getAdminSessionSecret()).update(value).digest('hex');
}

export function getAdminCookieName() {
  return ADMIN_COOKIE_NAME;
}

export function createAdminSessionToken() {
  const signature = signAdminValue(ADMIN_COOKIE_VALUE);
  return `${ADMIN_COOKIE_VALUE}.${signature}`;
}

export function isValidAdminSessionToken(token: string | undefined) {
  if (!token) return false;

  const [value, signature] = token.split('.');
  if (!value || !signature || value !== ADMIN_COOKIE_VALUE) return false;

  const expected = signAdminValue(value);
  const provided = Buffer.from(signature);
  const actual = Buffer.from(expected);

  if (provided.length !== actual.length) return false;
  return timingSafeEqual(provided, actual);
}
