import { randomUUID } from 'node:crypto';

const REQUEST_ID_HEADER = 'x-request-id';

/**
 * One structured JSON line per request. Deliberately logs no bodies, cookies or
 * headers: a request log must never become a credential leak.
 */
export function requestLogger({ enabled = true, write = (line) => process.stdout.write(`${line}\n`) } = {}) {
  return (req, res, next) => {
    const requestId = req.headers[REQUEST_ID_HEADER] ?? randomUUID();
    req.requestId = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);
    if (!enabled) return next();

    const startedAt = process.hrtime.bigint();
    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      write(
        JSON.stringify({
          time: new Date().toISOString(),
          level: res.statusCode >= 500 ? 'error' : 'info',
          requestId,
          method: req.method,
          path: req.originalUrl.split('?')[0],
          status: res.statusCode,
          durationMs: Number(durationMs.toFixed(1)),
          userId: req.user?.id ?? null,
        }),
      );
    });
    return next();
  };
}
