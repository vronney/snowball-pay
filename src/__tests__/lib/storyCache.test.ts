import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the Upstash Redis client so no network happens and we can drive get/set.
const { mockGet, mockSet, RedisMock } = vi.hoisted(() => {
  const mockGet = vi.fn();
  const mockSet = vi.fn();
  // Must be a real `function` (not an arrow) so `new Redis(...)` can construct it.
  const RedisMock = vi.fn(function () {
    return { get: mockGet, set: mockSet };
  });
  return { mockGet, mockSet, RedisMock };
});

vi.mock('@upstash/redis', () => ({ Redis: RedisMock }));

import { getCachedStory, setCachedStory } from '@/lib/storyCache';

const KEY = 'story:cache:user_1';
const PAYLOAD = { headline: 'Building Momentum', body: 'Nice work.', stats: { paymentCount: 2 } };

beforeEach(() => {
  vi.clearAllMocks();
  // Redis "configured" by default.
  vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://fake.upstash.io');
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'faketoken');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('storyCache — getCachedStory', () => {
  it('returns the payload when version AND dataHash both match', async () => {
    mockGet.mockResolvedValue({ version: 1, dataHash: 'h1', payload: PAYLOAD });

    const result = await getCachedStory('user_1', 'h1');

    expect(result).toEqual(PAYLOAD);
    expect(mockGet).toHaveBeenCalledWith(KEY);
  });

  it('misses when the dataHash differs (financial data changed)', async () => {
    mockGet.mockResolvedValue({ version: 1, dataHash: 'old', payload: PAYLOAD });
    expect(await getCachedStory('user_1', 'new')).toBeNull();
  });

  it('misses when the version differs (payload shape changed across a deploy)', async () => {
    mockGet.mockResolvedValue({ version: 0, dataHash: 'h1', payload: PAYLOAD });
    expect(await getCachedStory('user_1', 'h1')).toBeNull();
  });

  it('treats a legacy entry with no version as v1 and serves it (no migration miss)', async () => {
    // Entries written before versioning have no `version` field but the same
    // payload shape — they must stay valid, or rate-limited users could 429 on
    // reload during the deploy window.
    mockGet.mockResolvedValue({ dataHash: 'h1', payload: PAYLOAD });
    expect(await getCachedStory('user_1', 'h1')).toEqual(PAYLOAD);
  });

  it('misses when there is no cached entry', async () => {
    mockGet.mockResolvedValue(null);
    expect(await getCachedStory('user_1', 'h1')).toBeNull();
  });

  it('no-ops (null) and never constructs Redis when it is not configured', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');

    expect(await getCachedStory('user_1', 'h1')).toBeNull();
    expect(RedisMock).not.toHaveBeenCalled();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('swallows a Redis read error and returns null', async () => {
    mockGet.mockRejectedValue(new Error('redis down'));
    expect(await getCachedStory('user_1', 'h1')).toBeNull();
  });
});

describe('storyCache — setCachedStory', () => {
  it('writes the versioned entry with the fingerprint and the default 24h TTL', async () => {
    await setCachedStory('user_1', 'h1', PAYLOAD);

    expect(mockSet).toHaveBeenCalledWith(
      KEY,
      { version: 1, dataHash: 'h1', payload: PAYLOAD },
      { ex: 24 * 60 * 60 },
    );
  });

  it('bounds the write by constructing the client with an abort signal', async () => {
    await setCachedStory('user_1', 'h1', PAYLOAD);
    // The write path must pass an AbortSignal so a stalled Upstash request is
    // aborted rather than blocking to maxDuration.
    expect(RedisMock).toHaveBeenCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('honors a custom TTL (used for short-lived fallback stories)', async () => {
    await setCachedStory('user_1', 'h1', PAYLOAD, 600);

    expect(mockSet).toHaveBeenCalledWith(
      KEY,
      { version: 1, dataHash: 'h1', payload: PAYLOAD },
      { ex: 600 },
    );
  });

  it('no-ops when Redis is not configured', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');

    await setCachedStory('user_1', 'h1', PAYLOAD);

    expect(RedisMock).not.toHaveBeenCalled();
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('swallows a Redis write error without throwing', async () => {
    mockSet.mockRejectedValue(new Error('redis down'));
    await expect(setCachedStory('user_1', 'h1', PAYLOAD)).resolves.toBeUndefined();
  });
});
