import { HttpError } from './errors.js';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * CSRF defence for cookie-authenticated JSON APIs: mutations must come from an
 * allowed origin (same host by default). Requests with no Origin/Referer at all
 * (curl, tests) are allowed — a browser always sends one for cross-site
 * requests, which is the case we are guarding against.
 */
export function originCheck(allowedOrigins = []) {
  return (req, _res, next) => {
    if (!MUTATING_METHODS.has(req.method)) return next();
    const source = req.headers.origin ?? req.headers.referer;
    if (!source) return next();
    let sourceHost;
    try {
      sourceHost = new URL(source).host;
    } catch {
      return next(new HttpError(403, 'Invalid Origin header'));
    }
    const requestHost = req.headers.host;
    const isAllowed =
      sourceHost === requestHost ||
      allowedOrigins.some((origin) => safeHost(origin) === sourceHost);
    if (!isAllowed) return next(new HttpError(403, 'Cross-origin request blocked'));
    return next();
  };
}

function safeHost(origin) {
  try {
    return new URL(origin).host;
  } catch {
    return null;
  }
}
