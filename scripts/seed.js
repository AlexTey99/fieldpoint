/**
 * Seeds demo users + sites into DB_PATH. Idempotent.
 *   npm run seed
 */
import { loadConfig } from '../src/config.js';
import { openDatabase } from '../src/db/connection.js';
import { DEMO_USERS, seedDemo } from '../src/db/seed.js';

async function main() {
  const config = loadConfig();
  const db = openDatabase(config.dbPath);
  try {
    await seedDemo(db, { log: console.log });
    console.log(`seed complete → ${config.dbPath}`);
    console.log('demo accounts:');
    for (const user of DEMO_USERS) console.log(`  ${user.email}  ${user.password}  (${user.role})`);
  } finally {
    db.close();
  }
}

main().catch((error) => {
  console.error('[seed] failed', error);
  process.exit(1);
});
