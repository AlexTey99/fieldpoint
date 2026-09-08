import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const SALT_BYTES = 16;
const KEY_LENGTH = 64;
const SCRYPT_COST = 16384; // N
const SCRYPT_BLOCK = 8; // r
const SCRYPT_PARALLEL = 1; // p
const FORMAT_VERSION = 'scrypt1';

const scryptOptions = { N: SCRYPT_COST, r: SCRYPT_BLOCK, p: SCRYPT_PARALLEL };

/** Returns "scrypt1$<saltHex>$<hashHex>". */
export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length === 0) {
    throw new TypeError('password must be a non-empty string');
  }
  const salt = randomBytes(SALT_BYTES);
  const derived = await scrypt(password, salt, KEY_LENGTH, scryptOptions);
  return `${FORMAT_VERSION}$${salt.toString('hex')}$${derived.toString('hex')}`;
}

/** Constant-time comparison. Returns false (never throws) for malformed stored hashes. */
export async function verifyPassword(password, stored) {
  if (typeof password !== 'string' || typeof stored !== 'string') return false;
  const [version, saltHex, hashHex] = stored.split('$');
  if (version !== FORMAT_VERSION || !saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  if (expected.length !== KEY_LENGTH) return false;
  const derived = await scrypt(password, salt, KEY_LENGTH, scryptOptions);
  return timingSafeEqual(derived, expected);
}
