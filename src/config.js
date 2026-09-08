import { randomBytes } from 'node:crypto';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

const DEFAULT_PORT = 4100;
const DEFAULT_SESSION_TTL_HOURS = 72;
const MIN_SECRET_LENGTH = 32;

function parseIntOr(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveSessionSecret(env) {
  const provided = env.SESSION_SECRET?.trim();
  if (provided && provided.length >= MIN_SECRET_LENGTH) return provided;
  if (env.NODE_ENV === 'production') {
    throw new Error(
      `SESSION_SECRET must be set (>= ${MIN_SECRET_LENGTH} chars) when NODE_ENV=production`,
    );
  }
  if (provided) {
    console.warn(`[config] SESSION_SECRET shorter than ${MIN_SECRET_LENGTH} chars; generating a random one`);
  }
  return randomBytes(32).toString('hex');
}

/** Relative DB paths are anchored to the project root, not the process cwd. */
function resolveDbPath(dbPath) {
  if (dbPath === ':memory:' || isAbsolute(dbPath)) return dbPath;
  return resolve(PROJECT_ROOT, dbPath);
}

function parseOrigins(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function loadConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV ?? 'development';
  return Object.freeze({
    nodeEnv,
    isProduction: nodeEnv === 'production',
    isTest: nodeEnv === 'test',
    port: parseIntOr(env.PORT, DEFAULT_PORT),
    host: env.HOST?.trim() || '0.0.0.0',
    dbPath: resolveDbPath(env.DB_PATH?.trim() || './data/fieldpoint.db'),
    sessionSecret: resolveSessionSecret(env),
    sessionTtlMs: parseIntOr(env.SESSION_TTL_HOURS, DEFAULT_SESSION_TTL_HOURS) * 60 * 60 * 1000,
    allowedOrigins: parseOrigins(env.ALLOWED_ORIGINS),
  });
}
