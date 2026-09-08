import { createUserRepository } from '../users/repository.js';
import { createSiteRepository } from '../sites/repository.js';
import { hashPassword } from '../auth/password.js';

/** Demo credentials. Intentionally public: this is a mock application. */
export const DEMO_USERS = Object.freeze([
  { email: 'admin@fieldpoint.local', name: 'Demo Admin', password: 'admin-demo-pass', role: 'admin' },
  { email: 'ops@fieldpoint.local', name: 'Demo Operator', password: 'ops-demo-pass1', role: 'member' },
  { email: 'qa@fieldpoint.local', name: 'QA Tester', password: 'qa-demo-pass-2026', role: 'admin' },
]);

export const DEMO_SITES = Object.freeze([
  { name: 'Boston HQ', address: '1 Financial Center, Boston, MA', lat: 42.3555, lng: -71.0565, category: 'office', status: 'active', notes: 'Main office, 3rd floor.' },
  { name: 'Newark Distribution Center', address: '600 Doremus Ave, Newark, NJ', lat: 40.7079, lng: -74.1266, category: 'warehouse', status: 'active', notes: 'Dock hours 06:00–22:00.' },
  { name: 'Providence Client — Harbor Corp', address: '100 Westminster St, Providence, RI', lat: 41.8236, lng: -71.4114, category: 'client', status: 'active', notes: 'Contact: J. Rivera.' },
  { name: 'Route 9 Substation Retrofit', address: 'Framingham, MA', lat: 42.2793, lng: -71.4162, category: 'job_site', status: 'planned', notes: 'Permit pending.' },
  { name: 'Van 12', address: '', lat: 41.7658, lng: -72.6734, category: 'vehicle', status: 'active', notes: 'Last check-in Hartford yard.' },
  { name: 'Old Portland Depot', address: '30 Danforth St, Portland, ME', lat: 43.6532, lng: -70.2589, category: 'warehouse', status: 'inactive', notes: 'Lease ended 2025.' },
]);

/**
 * Idempotently creates the demo users and sample sites. Safe to run on every
 * boot: existing emails and site names are skipped. Returns what was created.
 */
export async function seedDemo(db, { log = () => {} } = {}) {
  const users = createUserRepository(db);
  const sites = createSiteRepository(db);
  const created = { users: [], sites: [] };
  let adminId = null;

  for (const user of DEMO_USERS) {
    const existing = users.findByEmail(user.email);
    if (existing) {
      if (user.role === 'admin' && adminId === null) adminId = existing.id;
      continue;
    }
    const row = users.create({ ...user, passwordHash: await hashPassword(user.password) });
    if (user.role === 'admin' && adminId === null) adminId = row.id;
    created.users.push(user.email);
    log(`created user: ${user.email} (${user.role})`);
  }

  const existingNames = new Set(sites.listAll({}).map((site) => site.name));
  for (const site of DEMO_SITES) {
    if (existingNames.has(site.name)) continue;
    sites.create(site, adminId);
    created.sites.push(site.name);
    log(`created site: ${site.name}`);
  }
  return created;
}

/**
 * Creates (or resets the password of) one administrator. Used by the Factory
 * qa_seed hook, which supplies its own QA credentials via environment variables.
 */
export async function upsertAdmin(db, { email, name, password }) {
  const users = createUserRepository(db);
  const passwordHash = await hashPassword(password);
  const existing = users.findByEmail(email);
  if (existing) {
    users.updatePassword(existing.id, passwordHash);
    users.update(existing.id, { role: 'admin', isActive: true });
    return { id: existing.id, created: false };
  }
  const row = users.create({ email, name, passwordHash, role: 'admin' });
  return { id: row.id, created: true };
}
