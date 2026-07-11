import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const SCRYPT_PREFIX = 'scrypt';

function toBuffer(value: string) {
  return Buffer.from(value, 'hex');
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64).toString('hex');
  return `${SCRYPT_PREFIX}:${salt}:${derivedKey}`;
}

export function isPasswordHash(value: string) {
  return value.startsWith(`${SCRYPT_PREFIX}:`);
}

export function verifyPassword(password: string, storedValue: string) {
  if (!isPasswordHash(storedValue)) {
    return password === storedValue;
  }

  const [, salt, storedKey] = storedValue.split(':');
  if (!salt || !storedKey) return false;

  const derivedKey = scryptSync(password, salt, 64).toString('hex');
  const actual = toBuffer(derivedKey);
  const expected = toBuffer(storedKey);

  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
