import { createHash } from 'crypto';

export function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getSessionSecret() {
  const explicit =
    process.env.ADMIN_SESSION_SECRET?.trim();

  if (explicit) {
    return explicit;
  }

  /*
   * Production recovery fallback:
   * DATABASE_URL is already required for the app to operate and is normally
   * a high-entropy secret. Hash it with a domain separator so the database
   * credential itself is never used directly as the HMAC key.
   */
  const databaseUrl =
    process.env.DATABASE_URL?.trim();

  if (databaseUrl) {
    return createHash('sha256')
      .update(
        `menu-costing-session-v1:${databaseUrl}`,
      )
      .digest('hex');
  }

  throw new Error(
    'Missing required environment variable: ADMIN_SESSION_SECRET or DATABASE_URL',
  );
}
