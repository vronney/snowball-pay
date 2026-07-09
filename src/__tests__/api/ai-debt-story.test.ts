import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockPrisma, mockVerify, mockDebtStoryLimit, mockCreate } = vi.hoisted(() => ({
  mockPrisma: {
    debt: { findMany: vi.fn() },
    paymentRecord: { findMany: vi.fn() },
  },
  mockVerify: vi.fn(),
  mockDebtStoryLimit: vi.fn(),
  mockCreate: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

vi.mock('@/lib/auth-server', () => ({
  verifyAuth: mockVerify,
  unauthorized: () => Response.json({ error: 'unauthorized' }, { status: 401 }),
}));

vi.mock('@/lib/rateLimit', () => ({
  limits: { debtStory: mockDebtStoryLimit },
}));

vi.mock('@/lib/claude', async () => {
  const actual = await vi.importActual<typeof import('@/lib/claude')>('@/lib/claude');
  return {
    ...actual,
    anthropic: { messages: { create: mockCreate } },
  };
});

import { GET } from '@/app/api/ai/debt-story/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest() {
  return new NextRequest('http://localhost/api/ai/debt-story');
}

beforeEach(() => {
  vi.clearAllMocks();
  mockVerify.mockResolvedValue({ valid: true, user: { id: 'user_1' } });
  mockDebtStoryLimit.mockResolvedValue(true);
  mockPrisma.debt.findMany.mockResolvedValue([
    { name: 'Card', balance: 500, originalBalance: 1000, createdAt: new Date() },
  ]);
  mockPrisma.paymentRecord.findMany.mockResolvedValue([
    { amount: 250, dueYear: 2026, dueMonth: 5, paidAt: new Date() },
    { amount: 250, dueYear: 2026, dueMonth: 6, paidAt: new Date() },
  ]);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/ai/debt-story — graceful degradation', () => {
  it('returns the deterministic fallback as 200 when the AI call times out (regression: was 503)', async () => {
    // Simulate the AbortController firing: the SDK rejects with an abort error.
    mockCreate.mockRejectedValue(
      Object.assign(new Error('Request was aborted.'), { name: 'AbortError' }),
    );

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.error).toBeUndefined();
    expect(json.headline).toBe('Your Debt Journey');
    expect(json.body).toContain('2 payments');
    expect(json.stats.paymentCount).toBe(2);
  });

  it('returns the fallback as 200 when Claude returns an unexpected shape', async () => {
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: 'not json at all' }] });

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.headline).toBe('Your Debt Journey');
  });

  it('returns the AI story when Claude responds with valid JSON', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: '{"headline":"Building Momentum","body":"Nice work so far."}' }],
    });

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.headline).toBe('Building Momentum');
    expect(json.body).toBe('Nice work so far.');
  });
});
