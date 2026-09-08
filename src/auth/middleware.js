import { SESSION_COOKIE, parseCookies } from './session.js';
import { HttpError } from '../middleware/errors.js';

/** Attaches req.user (or null) from the session cookie. Never rejects. */
export function attachUser(sessions) {
  return (req, _res, next) => {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    req.sessionToken = token ?? null;
    req.user = token ? sessions.resolve(token) : null;
    next();
  };
}

export function requireAuth(req, _res, next) {
  if (!req.user) return next(new HttpError(401, 'Authentication required'));
  return next();
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(new HttpError(401, 'Authentication required'));
    if (!roles.includes(req.user.role)) return next(new HttpError(403, 'Insufficient permissions'));
    return next();
  };
}
