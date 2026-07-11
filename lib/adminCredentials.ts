import { getRequiredEnv } from './env';

export function getAdminUserId() {
  return getRequiredEnv('ADMIN_USER_ID');
}

export function getAdminPassword() {
  return getRequiredEnv('ADMIN_PASSWORD');
}
