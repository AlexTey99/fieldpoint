import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from '../auth/middleware.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/errors.js';
import { recordAudit, listAudit } from '../audit/log.js';

const idParam = z.object({ id: z.coerce.number().int().positive() });
const updateSchema = z
  .object({ role: z.enum(['admin', 'member']).optional(), isActive: z.boolean().optional() })
  .refine((body) => body.role !== undefined || body.isActive !== undefined, 'Nothing to update');
const auditQuery = z.object({ limit: z.coerce.number().int().min(1).max(500).default(100) });

export function createUserRouter({ db, users, sessions }) {
  const router = Router();
  router.use(requireRole('admin'));

  router.get('/', (_req, res) => {
    res.json({ ok: true, users: users.list() });
  });

  router.patch('/:id', validate(idParam, 'params'), validate(updateSchema), (req, res, next) => {
    try {
      const { id } = req.validated.params;
      const { role, isActive } = req.validated.body;
      const target = users.findById(id);
      if (!target) throw new HttpError(404, 'User not found');
      const isDemotingOrDisabling = role === 'member' || isActive === false;
      if (target.role === 'admin' && isDemotingOrDisabling && users.countActiveAdmins() <= 1) {
        throw new HttpError(409, 'Cannot remove the last active administrator');
      }
      const updated = users.update(id, { role, isActive });
      if (isActive === false) sessions.destroyAllForUser(id);
      recordAudit(db, {
        userId: req.user.id,
        action: 'user.update',
        entityType: 'user',
        entityId: id,
        details: { role, isActive },
      });
      res.json({ ok: true, user: updated });
    } catch (error) {
      next(error);
    }
  });

  router.get('/audit', validate(auditQuery, 'query'), (req, res) => {
    res.json({ ok: true, entries: listAudit(db, req.validated.query) });
  });

  return router;
}
