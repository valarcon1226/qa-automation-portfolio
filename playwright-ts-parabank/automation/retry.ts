import { RetryOptions } from './types';

export function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Determines whether an error is transient (timeouts, network drops, navigation timeouts).
 */
export function isTransientError(err: unknown): boolean {
  if (!err) return false;
  const msg =
    err instanceof Error
      ? `${err.name} ${err.message} ${err.stack ?? ''}`
      : typeof err === 'object'
        ? JSON.stringify(err)
        : String(err);

  const transientPatterns = [
    /timeout/i,
    /timed out/i,
    /net::ERR_/i,
    /ECONNREFUSED/i,
    /ECONNRESET/i,
    /ETIMEDOUT/i,
    /ENOTFOUND/i,
    /Navigation failed/i,
    /Target closed/i,
    /Execution context was destroyed/i,
    /browser has been closed/i,
    /connection refused/i,
    /socket hang up/i,
    /page crashed/i,
  ];

  return transientPatterns.some((pattern) => pattern.test(msg));
}

export interface RetryResult<T> {
  result: T;
  attempts: number;
}

export interface RetryFailureError extends Error {
  attempts: number;
  isTransient: boolean;
  originalError: unknown;
}

/**
 * Executes an operation with exponential backoff retry logic for transient errors.
 * Non-transient errors (e.g. data mismatches, assertion failures) fail immediately.
 */
export async function withRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions = {},
): Promise<RetryResult<T>> {
  const maxRetries = options.maxRetries ?? 3;
  const initialBackoffMs = options.initialBackoffMs ?? 1000;
  const backoffFactor = options.backoffFactor ?? 2;
  const sleepFn = options.sleepFn ?? defaultSleep;

  let attempt = 0;
  let lastError: unknown;

  while (attempt < maxRetries) {
    attempt++;
    try {
      const result = await operation(attempt);
      return { result, attempts: attempt };
    } catch (err) {
      lastError = err;
      const transient = isTransientError(err);

      // If not transient, do not retry
      if (!transient) {
        const failure = new Error(
          `Operation failed with non-transient error on attempt ${attempt}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        ) as RetryFailureError;
        failure.attempts = attempt;
        failure.isTransient = false;
        failure.originalError = err;
        throw failure;
      }

      // If reached max retries, stop and throw
      if (attempt >= maxRetries) {
        break;
      }

      // Compute geometric backoff
      const backoffMs = initialBackoffMs * Math.pow(backoffFactor, attempt - 1);
      await sleepFn(backoffMs);
    }
  }

  const failure = new Error(
    `Operation failed after ${attempt} attempts: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  ) as RetryFailureError;
  failure.attempts = attempt;
  failure.isTransient = true;
  failure.originalError = lastError;
  throw failure;
}
