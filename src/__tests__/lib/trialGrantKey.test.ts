import { afterEach, describe, expect, it, vi } from 'vitest';
import { trialGrantKey } from '@/lib/trialGrantKey';

describe('trialGrantKey', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is deterministic and case/whitespace-insensitive, and never stores plaintext', () => {
    vi.stubEnv('TRIAL_GRANT_SECRET', 'test-secret');
    const a = trialGrantKey('Person@Example.COM ');
    const b = trialGrantKey('person@example.com');

    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toContain('person');
  });

  it('keys differ per secret, so a leaked table is not matchable without it', () => {
    vi.stubEnv('TRIAL_GRANT_SECRET', 'secret-one');
    const one = trialGrantKey('person@example.com');
    vi.stubEnv('TRIAL_GRANT_SECRET', 'secret-two');
    const two = trialGrantKey('person@example.com');

    expect(one).not.toBe(two);
  });

  it('falls back to an unkeyed digest when no secret is set', () => {
    vi.stubEnv('TRIAL_GRANT_SECRET', '');
    const key = trialGrantKey('person@example.com');

    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });
});
