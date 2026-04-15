import { describe, it, expect, vi, afterEach } from 'vitest';

describe('unsubscribeToken secret isolation', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('throws when UNSUBSCRIBE_SECRET is not set', async () => {
    vi.stubEnv('UNSUBSCRIBE_SECRET', '');
    vi.stubEnv('AUTH0_SECRET', '');

    const { generateUnsubscribeToken } = await import('@/lib/unsubscribeToken');
    expect(() => generateUnsubscribeToken('user-123')).toThrow('UNSUBSCRIBE_SECRET env var is not set');
  });

  it('does NOT fall back to AUTH0_SECRET', async () => {
    vi.stubEnv('UNSUBSCRIBE_SECRET', '');
    vi.stubEnv('AUTH0_SECRET', 'some-auth0-secret-value');

    const { generateUnsubscribeToken } = await import('@/lib/unsubscribeToken');
    expect(() => generateUnsubscribeToken('user-123')).toThrow('UNSUBSCRIBE_SECRET env var is not set');
  });

  it('uses UNSUBSCRIBE_SECRET when set', async () => {
    vi.stubEnv('UNSUBSCRIBE_SECRET', 'test-unsubscribe-secret-32-chars!!');

    const { generateUnsubscribeToken, verifyUnsubscribeToken } = await import('@/lib/unsubscribeToken');
    const token = generateUnsubscribeToken('user-123');
    expect(verifyUnsubscribeToken('user-123', token)).toBe(true);
  });
});
