import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
//
// Covers the story cache: a cache hit must serve the stored story WITHOUT
// calling Claude AND without consuming a debtStory rate-limit token, so repeat
// Journey-tab views / reloads don't burn the user's 3/24h budget. A miss falls
// through to a rate-limited generation that is then cached.
// ---------------------------------------------------------------------------

const { mockPrisma, mockVerify, mockLimit, mockCreate, mockGetCache, mockSetCache } = vi.hoisted(() => ({
  mockPrisma: {
    debt: { findMany: vi.fn() },
    paymentRecord: { findMany: vi.fn() },
  },
  mockVerify: vi.fn(),
  mockLimit: vi.fn(),
  mockCreate: vi.fn(),
  mockGetCache: vi.fn(),
  mockSetCache: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

vi.mock('@/lib/auth-server', () => ({
  verifyAuth: mockVerify,
  unauthorized: () => Response.json({ error: 'unauthorized' }, { status: 401 }),
}));

vi.mock('@/lib/rateLimit', () => ({
  limits: { debtStory: mockLimit },
}));

vi.mock('@/lib/claude', async () => {
  const actual = await vi.importActual<typeof import('@/lib/claude')>('@/lib/claude');
  return {
    ...actual,
    anthropic: { messages: { create: mockCreate } },
  };
});

vi.mock('@/lib/storyCache', () => ({
  getCachedStory: mockGetCache,
  setCachedStory: mockSetCache,
}));

import { GET } from '@/app/api/ai/debt-story/route';

function makeRequest() {
  return new NextRequest('http://localhost/api/ai/debt-story');
}

const AI_STORY = { content: [{ type: 'text', text: '{"headline":"Building Momentum","body":"Nice work so far."}' }] };

beforeEach(() => {
  vi.clearAllMocks();
  mockVerify.mockResolvedValue({ valid: true, user: { id: 'user_1' } });
  mockLimit.mockResolvedValue(true);
  mockGetCache.mockResolvedValue(null); // default: cache miss
  mockSetCache.mockResolvedValue(undefined);
  mockPrisma.debt.findMany.mockResolvedValue([
    { name: 'Card', balance: 500, originalBalance: 1000, createdAt: new Date() },
  ]);
  mockPrisma.paymentRecord.findMany.mockResolvedValue([
    { amount: 250, dueYear: 2026, dueMonth: 5, paidAt: new Date() },
    { amount: 250, dueYear: 2026, dueMonth: 6, paidAt: new Date() },
  ]);
});

describe('GET /api/ai/debt-story — cache', () => {
  it('serves the cached story without calling Claude OR consuming a rate-limit token', async () => {
    const cachedStory = { headline: 'Cached Title', body: 'Cached body.', stats: { paymentCount: 2 } };
    mockGetCache.mockResolvedValue(cachedStory);

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual(cachedStory);
    // The whole point: a cache hit is free.
    expect(mockLimit).not.toHaveBeenCalled();      // no token consumed
    expect(mockCreate).not.toHaveBeenCalled();     // no Claude call
    expect(mockSetCache).not.toHaveBeenCalled();   // nothing re-written
  });

  it('on a cache miss, generates the story and writes it to the cache', async () => {
    mockGetCache.mockResolvedValue(null);
    mockCreate.mockResolvedValue(AI_STORY);

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.headline).toBe('Building Momentum');
    expect(mockLimit).toHaveBeenCalledTimes(1);    // generation is rate-limited
    expect(mockCreate).toHaveBeenCalledTimes(1);
    // Cached with the same fingerprint used for the lookup.
    const lookupHash = mockGetCache.mock.calls[0][1];
    expect(mockSetCache).toHaveBeenCalledWith('user_1', lookupHash, expect.objectContaining({
      headline: 'Building Momentum',
      body: 'Nice work so far.',
    }));
  });

  it('does not cache the fallback when Claude fails, and still returns 200', async () => {
    mockGetCache.mockResolvedValue(null);
    mockCreate.mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }));

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.headline).toBe('Your Debt Journey'); // deterministic fallback
    expect(mockSetCache).not.toHaveBeenCalled();       // fallback is not cached
  });

  it('returns 429 on a cache miss when the user is over their generation limit', async () => {
    mockGetCache.mockResolvedValue(null);
    mockLimit.mockResolvedValue(false);

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.error).toBe('rate_limited');
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
