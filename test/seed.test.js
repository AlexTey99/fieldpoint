import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { bootApp } from './helpers.js';
import { DEMO_SITES, DEMO_USERS, seedDemo, upsertAdmin } from '../src/db/seed.js';
import { createUserRepository } from '../src/users/repository.js';

describe('demo seed', () => {
  it('creates demo users and sites once, then is a no-op', async () => {
    const ctx = bootApp();
    try {
      const first = await seedDemo(ctx.db);
      assert.equal(first.users.length, DEMO_USERS.length);
      assert.equal(first.sites.length, DEMO_SITES.length);
      const second = await seedDemo(ctx.db);
      assert.deepEqual(second, { users: [], sites: [] });
      assert.equal(createUserRepository(ctx.db).count(), DEMO_USERS.length);
    } finally {
      ctx.close();
    }
  });

  it('every demo account can sign in with its documented password', async () => {
    const ctx = bootApp();
    try {
      await seedDemo(ctx.db);
      for (const user of DEMO_USERS) {
        const response = await request(ctx.app).post('/api/auth/login').send({ email: user.email, password: user.password });
        assert.equal(response.status, 200, `${user.email} should log in`);
        assert.equal(response.body.user.role, user.role);
      }
    } finally {
      ctx.close();
    }
  });

  it('upsertAdmin creates then resets an administrator', async () => {
    const ctx = bootApp();
    try {
      const created = await upsertAdmin(ctx.db, { email: 'qa@example.com', name: 'QA', password: 'first-password-1' });
      assert.equal(created.created, true);
      const updated = await upsertAdmin(ctx.db, { email: 'qa@example.com', name: 'QA', password: 'second-password-2' });
      assert.equal(updated.created, false);
      assert.equal(updated.id, created.id);
      const login = await request(ctx.app).post('/api/auth/login').send({ email: 'qa@example.com', password: 'second-password-2' });
      assert.equal(login.status, 200);
      assert.equal(login.body.user.role, 'admin');
    } finally {
      ctx.close();
    }
  });
});
