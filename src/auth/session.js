import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'fp_session';
const TOKEN_BYTES = 32;

/**
 * Sessions are stored server-side (sessions table). The cookie carries
 * "<id>.<hmac(id)>" so a tampered id is rejected before touching the DB.
 */
export function createSessionStore(db, { secret, ttlMs }) {
  const insert = db.prepare(`INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)`);
  const select = db.prepare(
    `SELECT s.id, s.user_id AS userId, s.expires_at AS expiresAt,
            u.email, u.name, u.role, u.is_active AS isActive
     FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?`,
  );
  const remove = db.prepare(`DELETE FROM sessions WHERE id = ?`);
  const removeForUser = db.prepare(`DELETE FROM sessions WHERE user_id = ?`);
  const purge = db.prepare(`DELETE FROM sessions WHERE expires_at < ?`);

  function sign(id) {
    return createHmac('sha256', secret).update(id).digest('hex');
  }

  function verifyToken(token) {
    if (typeof token !== 'string') return null;
    const [id, signature] = token.split('.');
    if (!id || !signature) return null;
    const expected = Buffer.from(sign(id), 'hex');
    const actual = Buffer.from(signature, 'hex');
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    return id;
  }

  return {
    create(userId) {
      const id = randomBytes(TOKEN_BYTES).toString('hex');
      insert.run(id, userId, Date.now() + ttlMs);
      return `${id}.${sign(id)}`;
    },
    /** Returns the user for a valid, unexpired token, else null. */
    resolve(token) {
      const id = verifyToken(token);
      if (!id) return null;
      const row = select.get(id);
      if (!row) return null;
      if (row.expiresAt < Date.now() || !row.isActive) {
        remove.run(id);
        return null;
      }
      return { id: row.userId, email: row.email, name: row.name, role: row.role };
    },
    destroy(token) {
      const id = verifyToken(token);
      if (id) remove.run(id);
    },
    destroyAllForUser(userId) {
      removeForUser.run(userId);
    },
    purgeExpired() {
      purge.run(Date.now());
    },
  };
}

export function cookieOptions({ isProduction, ttlMs }) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/',
    maxAge: ttlMs,
  };
}

/** Minimal cookie header parser — avoids a dependency for one cookie. */
export function parseCookies(header) {
  if (!header) return {};
  return Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf('=');
        if (index === -1) return [part, ''];
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      }),
  );
}
