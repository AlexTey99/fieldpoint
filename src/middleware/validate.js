import { HttpError } from './errors.js';

/** Validates req[source] against a zod schema; replaces it with the parsed value. */
export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      return next(new HttpError(400, 'Validation failed', details));
    }
    req.validated = { ...(req.validated ?? {}), [source]: result.data };
    return next();
  };
}
