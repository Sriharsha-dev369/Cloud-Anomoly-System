import { Request, Response, NextFunction } from 'express';

/**
 * Global Express error handler.
 * Catches any error passed via `next(err)` or thrown in async middleware.
 * Returns a safe JSON response — never exposes internal stack traces to clients.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const message = err instanceof Error ? err.message : 'Internal server error';
  const status = (err as { status?: number })?.status ?? 500;

  // Log the full error server-side for debugging
  console.error('[errorHandler] Unhandled error:', err);

  res.status(status).json({ error: message });
}
