import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
//
// Regression coverage for the weekly-digest "no audience" bug: the DebtStory
// writer was designed in the payment-celebration route but shipped to main
// without the prisma.debtStory.create() call, so debt_stories stayed empty and
// the weekly-digest cron always found no audience. These tests assert the
// writer exists and behaves as designed.
// ---------------------------------------------------------------------------

const { mockPrisma, mockVerify, mockLimit, mockCreate } = vi.hoisted(() => ({
  mockPrisma: {
    paymentRecord: { findMany: vi.fn() },
    debtStory: { create: vi.fn() },
  },
  mockVerify: vi.fn(),
  mockLimit: vi.fn(),
  mockCreate: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

vi.mock('@/lib/auth-server', () => ({
  verifyAuth: mockVerify,
  unauthorized: () => Response.json({ error: 'unauthorized' }, { status: 401 }),
  badRequest: (msg: string) => Response.json({ error: msg }, { status: 400 }),
}));

vi.mock('@/lib/rateLimit', () => ({
  limits: { paymentCelebration: mockLimit },
}));

vi.mock('@/lib/claude', async () => {
  const actual = await vi.importActual<typeof import('@/lib/claude')>('@/lib/claude');
  return {
    ...actual,
    anthropic: { messages: { create: mockCreate } },
  };
});

import { POST } from '@/app/api/ai/payment-celebration/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_BODY = {
  debtId:              'debt-1',
  debtName:            'Visa',
  amountPaid:          200,
  totalDebtPaid:       800,
  totalDebtOriginal:   2000,
  isFirstPayment:      false,
  debtBalance:         600,
  debtOriginalBalance: 800,
  debtCreatedAt:       new Date('2026-01-01').toISOString(),
};

function makeRequest(body: unknown = VALID_BODY) {
  return new NextRequest('http://localhost/api/ai/payment-celebration', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const AI_MESSAGE = '{"message":"Nice, $200 down on Visa. Momentum is building."}';

beforeEach(() => {
  vi.clearAllMocks();
  mockVerify.mockResolvedValue({ valid: true, user: { id: 'user_1' } });
  mockLimit.mockResolvedValue(true);
  // Streak lookup — no prior payments in the window.
  mockPrisma.paymentRecord.findMany.mockResolvedValue([]);
  mockPrisma.debtStory.create.mockResolvedValue({ id: 'story-1' });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/ai/payment-celebration — DebtStory persistence', () => {
  it('persists a DebtStory row on a successful celebration (regression: writer was never shipped)', async () => {
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: AI_MESSAGE }] });

    const res = await POST(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe('Nice, $200 down on Visa. Momentum is building.');

    // The core regression: exactly one debt_stories row is written, carrying the
    // fields the weekly-digest cron and Journey timeline read back.
    expect(mockPrisma.debtStory.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.debtStory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId:     'user_1',
        debtId:     'debt-1',
        debtName:   'Visa',
        amountPaid: 200,
        message:    'Nice, $200 down on Visa. Momentum is building.',
      }),
    });
  });

  it('does NOT persist a row when the AI call fails (no fallback-only rows)', async () => {
    mockCreate.mockRejectedValue(
      Object.assign(new Error('Request was aborted.'), { name: 'AbortError' }),
    );

    const res = await POST(makeRequest());
    const json = await res.json();

    // Response still degrades gracefully to the fallback message...
    expect(res.status).toBe(200);
    expect(json.message).toBe('Visa — payment logged.');
    // ...but nothing is written, so the timeline never fills with fallback text.
    expect(mockPrisma.debtStory.create).not.toHaveBeenCalled();
  });

  it('never fails the response when the DebtStory write throws (own try/catch)', async () => {
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: AI_MESSAGE }] });
    mockPrisma.debtStory.create.mockRejectedValue(new Error('db down'));

    const res = await POST(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe('Nice, $200 down on Visa. Momentum is building.');
    expect(mockPrisma.debtStory.create).toHaveBeenCalledTimes(1);
  });
});
