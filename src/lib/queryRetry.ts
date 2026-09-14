/** HTTP status on an axios-style error, or undefined (network errors, non-HTTP throws). */
export function getResponseStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const response = 'response' in error ? error.response : undefined;
  if (typeof response !== 'object' || response === null) return undefined;
  const status = 'status' in response ? response.status : undefined;
  return typeof status === 'number' ? status : undefined;
}

/**
 * Statuses a retry can't fix. 429 is here because retrying a rate limit only
 * spends more of the same window.
 */
const NO_RETRY_STATUSES: ReadonlySet<number> = new Set([401, 403, 404, 429]);

/** Global React Query retry rule: up to 2 retries, none for the statuses above. */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  const status = getResponseStatus(error);
  if (status !== undefined && NO_RETRY_STATUSES.has(status)) return false;
  return failureCount < 2;
}
