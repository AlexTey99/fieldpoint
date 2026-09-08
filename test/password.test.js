import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../src/auth/password.js';

describe('password hashing', () => {
  it('verifies the original password and rejects others', async () => {
    const hash = await hashPassword('hunter2hunter2');
    assert.match(hash, /^scrypt1\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    assert.equal(await verifyPassword('hunter2hunter2', hash), true);
    assert.equal(await verifyPassword('hunter2hunter3', hash), false);
  });

  it('produces distinct hashes for the same password (random salt)', async () => {
    const [first, second] = await Promise.all([hashPassword('same-password'), hashPassword('same-password')]);
    assert.notEqual(first, second);
  });

  it('returns false for malformed stored hashes instead of throwing', async () => {
    assert.equal(await verifyPassword('anything', 'garbage'), false);
    assert.equal(await verifyPassword('anything', 'scrypt1$zz$zz'), false);
    assert.equal(await verifyPassword('anything', null), false);
  });

  it('rejects empty passwords at hash time', async () => {
    await assert.rejects(() => hashPassword(''), TypeError);
  });
});
