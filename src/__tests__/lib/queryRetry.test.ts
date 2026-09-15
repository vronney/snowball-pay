import { describe, expect, it } from 'vitest';
import { getResponseStatus, shouldRetryQuery } from '@/lib/queryRetry';

const httpError = (status: number) => ({ response: { status } });

describe('shouldRetryQuery', () => {
  it.each([401, 403, 404, 429])('never retries a %i', (status) => {
    expect(shouldRetryQuery(0, httpError(status))).toBe(false);
  });

  it('retries other HTTP failures twice', () => {
    expect(shouldRetryQuery(0, httpError(500))).toBe(true);
    expect(shouldRetryQuery(1, httpError(500))).toBe(true);
    expect(shouldRetryQuery(2, httpError(500))).toBe(false);
  });

  it('retries network errors, which carry no response', () => {
    expect(shouldRetryQuery(0, new Error('Network Error'))).toBe(true);
  });
});

describe('getResponseStatus', () => {
  it('reads the status off an axios-style error', () => {
    expect(getResponseStatus(httpError(429))).toBe(429);
  });

  it('returns undefined for anything else', () => {
    expect(getResponseStatus(null)).toBeUndefined();
    expect(getResponseStatus('boom')).toBeUndefined();
    expect(getResponseStatus({ response: { status: '429' } })).toBeUndefined();
  });
});
