/**
 * Seeds a demo workspace: one admin, one member, and a handful of sites.
 * Idempotent — skips users/sites that already exist by email/name.
 *   node scripts/seed.js            (uses DB_PATH from env / default)
 */
import { loadConfig } from '../src/config.js';
import { openDatabase } from '../src/db/connection.js';
import { createUserRepository } from '../src/users/repository.js';
import { createSiteRepository } from '../src/sites/repository.js';
import { hashPassword } from '../src/auth/password.js';

const DEMO_USERS = [
  { email: 'admin@fieldpoint.local', name: 'Demo Admin', password: 'admin-demo-pass', role: 'admin' },
  { email: 'ops@fieldpoint.local', name: 'Demo Operator', password: 'ops-demo-pass1', role: 'member' },
];

const DEMO_SITES = [
  { name: 'Boston HQ', address: '1 Financial Center, Boston, MA', lat: 42.3555, lng: -71.0565, category: 'office', status: 'active', notes: 'Main office, 3rd floor.' },
  { name: 'Newark Distribution Center', address: '600 Doremus Ave, Newark, NJ', lat: 40.7079, lng: -74.1266, category: 'warehouse', status: 'active', notes: 'Dock hours 06:00–22:00.' },
  { name: 'Providence Client — Harbor Corp', address: '100 Westminster St, Providence, RI', lat: 41.8236, lng: -71.4114, category: 'client', status: 'active', notes: 'Contact: J. Rivera.' },
  { name: 'Route 9 Substation Retrofit', address: 'Framingham, MA', lat: 42.2793, lng: -71.4162, category: 'job_site', status: 'planned', notes: 'Permit pending.' },
  { name: 'Van 12', address: '', lat: 41.7658, lng: -72.6734, category: 'vehicle', status: 'active', notes: 'Last check-in Hartford yard.' },
  { name: 'Old Portland Depot', address: '30 Danforth St, Portland, ME', lat: 43.6532, lng: -70.2589, category: 'warehouse', status: 'inactive', notes: 'Lease ended 2025.' },
];

async function main() {
  const config = loadConfig();
  const db = openDatabase(config.dbPath);
  const users = createUserRepository(db);
  const sites = createSiteRepository(db);
  try {
    let adminId = null;
    for (const user of DEMO_USERS) {
      const existing = users.findByEmail(user.email);
      if (existing) {
        if (user.role === 'admin') adminId = existing.id;
        console.log(`user exists: ${user.email}`);
        continue;
      }
      const created = users.create({ ...user, passwordHash: await hashPassword(user.password) });
      if (user.role === 'admin') adminId = created.id;
      console.log(`created user: ${user.email} (${user.role}) password: ${user.password}`);
    }
    const existingNames = new Set(sites.list({ limit: 1000, offset: 0 }).rows.map((site) => site.name));
    for (const site of DEMO_SITES) {
      if (existingNames.has(site.name)) continue;
      sites.create(site, adminId);
      console.log(`created site: ${site.name}`);
    }
    console.log(`seed complete → ${config.dbPath}`);
  } finally {
    db.close();
  }
}

main().catch((error) => {
  console.error('[seed] failed', error);
  process.exit(1);
});
