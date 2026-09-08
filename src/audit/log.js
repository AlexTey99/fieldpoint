/**
 * Append-only audit trail. Never throws on serialisation problems — an audit
 * failure must not mask the primary action, but it is logged loudly.
 */
export function recordAudit(db, { userId = null, action, entityType, entityId = null, details = {} }) {
  let serialised = '{}';
  try {
    serialised = JSON.stringify(details ?? {});
  } catch (error) {
    console.error('[audit] failed to serialise details', error);
  }
  db.prepare(
    `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`,
  ).run(userId, action, entityType, entityId, serialised);
}

export function listAudit(db, { limit = 100 } = {}) {
  return db
    .prepare(
      `SELECT a.id, a.user_id AS userId, u.email AS userEmail, a.action, a.entity_type AS entityType,
              a.entity_id AS entityId, a.details, a.created_at AS createdAt
       FROM audit_log a LEFT JOIN users u ON u.id = a.user_id
       ORDER BY a.id DESC LIMIT ?`,
    )
    .all(limit)
    .map((row) => ({ ...row, details: safeParse(row.details) }));
}

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}
