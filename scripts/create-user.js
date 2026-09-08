/**
 * Creates or resets an administrator from environment variables. Used by the
 * Atlantic Software Factory qa_seed hook and handy for CI.
 *   FIELDPOINT_USER_EMAIL=qa@example.com FIELDPOINT_USER_PASSWORD=... node scripts/create-user.js
 */
import { loadConfig } from '../src/config.js';
import { openDatabase } from '../src/db/connection.js';
import { upsertAdmin } from '../src/db/seed.js';
import { emailSchema, passwordSchema } from '../src/auth/schema.js';

const MAX_NAME = 80;

function readInput(env) {
  const email = emailSchema.safeParse(env.FIELDPOINT_USER_EMAIL ?? '');
  const password = passwordSchema.safeParse(env.FIELDPOINT_USER_PASSWORD ?? '');
  if (!email.success) throw new Error('FIELDPOINT_USER_EMAIL missing or invalid');
  if (!password.success) throw new Error('FIELDPOINT_USER_PASSWORD missing or shorter than 10 characters');
  const name = (env.FIELDPOINT_USER_NAME ?? 'QA Admin').slice(0, MAX_NAME);
  return { email: email.data, password: password.data, name };
}

async function main() {
  const input = readInput(process.env);
  const config = loadConfig();
  const db = openDatabase(config.dbPath);
  try {
    const result = await upsertAdmin(db, input);
    console.log(`${result.created ? 'created' : 'updated'} admin ${input.email} (id ${result.id})`);
  } finally {
    db.close();
  }
}

main().catch((error) => {
  console.error('[create-user] failed:', error.message);
  process.exit(1);
});
