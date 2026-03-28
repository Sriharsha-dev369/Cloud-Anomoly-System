/**
 * Retries an async function with exponential backoff.
 * Delays: 1s → 2s → 4s (for default retries=3, baseDelayMs=1000).
 * Re-throws on the final attempt if all retries are exhausted.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        console.warn(`[retry] Attempt ${attempt}/${retries} failed — retrying in ${delay}ms`);
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }
  throw lastErr;
}

/** Returns true for AWS throttling / rate-limit errors. */
export function isThrottlingError(err: unknown): boolean {
  const code = (err as { name?: string })?.name ?? '';
  return code === 'ThrottlingException' || code === 'RequestLimitExceeded' || code === 'Throttling';
}

/** Returns true for AWS permission / auth errors (no point retrying). */
export function isPermissionError(err: unknown): boolean {
  const code = (err as { name?: string })?.name ?? '';
  return code === 'AccessDeniedException' || code === 'UnauthorizedException' || code === 'AuthFailure';
}

/** Classifies an AWS error into a short label for logging. */
export function classifyAwsError(err: unknown): string {
  if (isThrottlingError(err)) return 'THROTTLE';
  if (isPermissionError(err)) return 'PERMISSION';
  const code = (err as { name?: string })?.name;
  return code ?? 'UNKNOWN';
}
