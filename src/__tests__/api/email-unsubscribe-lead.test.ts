import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockPrisma, mockVerify } = vi.hoisted(() => ({
  mockPrisma: {
    userPreferences: { upsert: vi.fn() },
    calculatorLead: { deleteMany: vi.fn() },
  },
  mockVerify: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

vi.mock('@/lib/unsubscribeToken', () => ({
  verifyUnsubscribeToken: mockVerify,
}));

import { GET } from '@/app/api/email/unsubscribe/route';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

function makeRequest(params: string) {
  return new NextRequest(`http://localhost/api/email/unsubscribe?${params}`);
}

describe('GET /api/email/unsubscribe — calculator lead branch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.calculatorLead.deleteMany.mockResolvedValue({ count: 1 });
  });

  it('verifies the namespaced lead token, not a bare user token', async () => {
    mockVerify.mockReturnValue(true);

    await GET(makeRequest('leadId=lead_1&token=abc'));

    expect(mockVerify).toHaveBeenCalledWith('lead:lead_1', 'abc');
  });

  it('deletes the lead and returns the confirmation page on a valid token', async () => {
    mockVerify.mockReturnValue(true);

    const res = await GET(makeRequest('leadId=lead_1&token=abc'));
    const html = await res.text();

    expect(res.status).toBe(200);
    expect(html).toContain('unsubscribed');
    expect(mockPrisma.calculatorLead.deleteMany).toHaveBeenCalledWith({
      where: { id: 'lead_1' },
    });
  });

  it('returns 400 and deletes nothing on an invalid token', async () => {
    mockVerify.mockReturnValue(false);

    const res = await GET(makeRequest('leadId=lead_1&token=forged'));

    expect(res.status).toBe(400);
    expect(mockPrisma.calculatorLead.deleteMany).not.toHaveBeenCalled();
  });

  it('returns 400 when the token is missing entirely', async () => {
    const res = await GET(makeRequest('leadId=lead_1'));

    expect(res.status).toBe(400);
    expect(mockPrisma.calculatorLead.deleteMany).not.toHaveBeenCalled();
  });

  it('leaves the user path untouched when no leadId is present', async () => {
    mockVerify.mockReturnValue(true);
    mockPrisma.userPreferences.upsert.mockResolvedValue({});

    const res = await GET(makeRequest('userId=user_1&token=abc'));

    expect(res.status).toBe(200);
    expect(mockVerify).toHaveBeenCalledWith('user_1', 'abc');
    expect(mockPrisma.userPreferences.upsert).toHaveBeenCalled();
    expect(mockPrisma.calculatorLead.deleteMany).not.toHaveBeenCalled();
  });
});
