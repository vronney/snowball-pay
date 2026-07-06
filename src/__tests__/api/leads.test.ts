import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockPrisma, mockLimits } = vi.hoisted(() => {
  const mockPrisma = {
    calculatorLead: {
      upsert: vi.fn(),
    },
  };
  const mockLimits = {
    savePlanLead: vi.fn(),
  };
  return { mockPrisma, mockLimits };
});

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

vi.mock('@/lib/rateLimit', () => ({ limits: mockLimits }));

vi.mock('@/lib/auth-server', () => ({
  badRequest: vi.fn((msg: string) => new Response(JSON.stringify({ error: msg }), { status: 400 })),
  serverError: vi.fn((msg: string) => new Response(JSON.stringify({ error: msg }), { status: 500 })),
}));

import { POST } from '@/app/api/leads/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown, raw = false) {
  return new NextRequest('http://localhost/api/leads', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '203.0.113.5',
      'user-agent': 'vitest',
    },
    body: raw ? (body as string) : JSON.stringify(body),
  });
}

const VALID_BODY = {
  email: 'Lead@Example.com',
  method: 'snowball',
  debtFreeDate: 'March 2028',
  interestSaved: 1234.56,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/leads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLimits.savePlanLead.mockResolvedValue(true);
  });

  // --- Validation failures ---

  it('returns 400 for malformed JSON', async () => {
    const res = await POST(makeRequest('not-json{', true));
    expect(res.status).toBe(400);
    expect(mockPrisma.calculatorLead.upsert).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid email', async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, email: 'not-an-email' }));
    expect(res.status).toBe(400);
    expect(mockPrisma.calculatorLead.upsert).not.toHaveBeenCalled();
  });

  // --- Honeypot ---

  it('returns fake success without persisting when the honeypot field is filled', async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, website: 'http://spam.example' }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ saved: true });
    expect(mockPrisma.calculatorLead.upsert).not.toHaveBeenCalled();
  });

  // --- Rate limiting ---

  it('returns 429 when the savePlanLead rate limit is exhausted', async () => {
    mockLimits.savePlanLead.mockResolvedValue(false);

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(429);
    expect(mockPrisma.calculatorLead.upsert).not.toHaveBeenCalled();
    // Client key is IP only — user-agent is attacker-controlled and excluded
    expect(mockLimits.savePlanLead).toHaveBeenCalledWith('203.0.113.5');
  });

  // --- Success ---

  it('upserts the lead by normalized (trimmed, lowercased) email and returns saved:true', async () => {
    mockPrisma.calculatorLead.upsert.mockResolvedValue({});

    const res = await POST(makeRequest(VALID_BODY));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ saved: true });
    expect(mockPrisma.calculatorLead.upsert).toHaveBeenCalledWith({
      where: { email: 'lead@example.com' },
      create: {
        email: 'lead@example.com',
        method: 'snowball',
        debtFreeDate: 'March 2028',
        interestSaved: 1234.56,
      },
      update: {
        method: 'snowball',
        debtFreeDate: 'March 2028',
        interestSaved: 1234.56,
      },
    });
  });

  // --- DB error ---

  it('returns 500 when prisma upsert throws', async () => {
    mockPrisma.calculatorLead.upsert.mockRejectedValueOnce(new Error('DB down'));

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(500);
  });
});
