import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockPrisma, mockSendEmail } = vi.hoisted(() => {
  const mockPrisma = {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    calculatorLead: {
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };
  const mockSendEmail = vi.fn();
  return { mockPrisma, mockSendEmail };
});

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

vi.mock('@/lib/services/emailService', () => ({
  verifyCronRequest: vi.fn(() => null),
  sendEmail: mockSendEmail,
  markEmailSent: vi.fn(),
  isEmailAlreadySent: vi.fn(() => false),
  handleMissingResendConfig: vi.fn(),
  MISSING_RESEND_CONFIG: { skipped: true, reason: 'email_not_configured' },
}));

vi.mock('@react-email/render', () => ({
  render: vi.fn(async () => '<html>email</html>'),
}));

// Email templates are .tsx — vitest can't transform JSX under the project's
// jsx:"preserve" tsconfig, so stub every template the route imports.
vi.mock('@/emails/IncompleteSetupEmail', () => ({ default: () => null }));
vi.mock('@/emails/FirstWinEmail', () => ({ default: () => null }));
vi.mock('@/emails/SharePromptEmail', () => ({ default: () => null }));
vi.mock('@/emails/PlanWaitingEmail', () => ({ default: () => null }));

vi.mock('@/lib/unsubscribeToken', () => ({
  generateUnsubscribeToken: vi.fn(() => 'test-token'),
}));

import { GET } from '@/app/api/cron/lifecycle-emails/route';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

function makeRequest() {
  return new NextRequest('http://localhost/api/cron/lifecycle-emails');
}

const LEAD_FRESH = {
  id: 'lead_1',
  email: 'lead@example.com',
  debtFreeDate: 'March 2028',
  interestSaved: 4200,
  method: 'snowball',
  remindedAt: null,
};

const LEAD_CONVERTED = {
  id: 'lead_2',
  email: 'converted@example.com',
  debtFreeDate: null,
  interestSaved: null,
  method: null,
  remindedAt: null,
};

describe('GET /api/cron/lifecycle-emails — calculator lead reminders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 'test-key';
    // Day 2/5/7 segments: no users in any window.
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.calculatorLead.update.mockResolvedValue({});
    mockPrisma.calculatorLead.updateMany.mockResolvedValue({ count: 0 });
    mockSendEmail.mockResolvedValue({ success: true });
  });

  it('purges snapshots even when RESEND_API_KEY is missing (retention is not an email concern)', async () => {
    delete process.env.RESEND_API_KEY;
    mockPrisma.calculatorLead.updateMany.mockResolvedValue({ count: 2 });

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockPrisma.calculatorLead.updateMany).toHaveBeenCalledTimes(1);
    expect(body.snapshotsPurged).toBe(2);
    expect(body.snapshotPurgeFailed).toBe(false);
    // The skipped-email contract still holds without the key.
    expect(body.skipped).toBe(true);
    expect(body.reason).toBe('email_not_configured');
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('reports a failed purge without failing the cron run', async () => {
    mockPrisma.calculatorLead.findMany.mockResolvedValue([]);
    mockPrisma.calculatorLead.updateMany.mockRejectedValue(new Error('DB down'));

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.snapshotsPurged).toBe(0);
    expect(body.errors).toBe(1);
  });

  it('flags a failed purge on the missing-Resend-key path', async () => {
    delete process.env.RESEND_API_KEY;
    mockPrisma.calculatorLead.updateMany.mockRejectedValue(new Error('DB down'));

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.skipped).toBe(true);
    expect(body.snapshotsPurged).toBe(0);
    expect(body.snapshotPurgeFailed).toBe(true);
  });

  it('purges plan snapshots older than the 14-day retention window', async () => {
    mockPrisma.calculatorLead.findMany.mockResolvedValue([]);
    mockPrisma.calculatorLead.updateMany.mockResolvedValue({ count: 3 });

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.snapshotsPurged).toBe(3);
    const arg = mockPrisma.calculatorLead.updateMany.mock.calls[0][0];
    expect(arg.where.createdAt.lte).toBeInstanceOf(Date);
    // ~14 days ago (allow slack for test runtime)
    const ageMs = Date.now() - arg.where.createdAt.lte.getTime();
    expect(ageMs).toBeGreaterThan(13.9 * 24 * 60 * 60 * 1000);
    expect(ageMs).toBeLessThan(14.1 * 24 * 60 * 60 * 1000);
  });

  it('sends one reminder per unconverted lead and marks remindedAt', async () => {
    mockPrisma.calculatorLead.findMany.mockResolvedValue([LEAD_FRESH]);
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.leadReminder).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail.mock.calls[0][0]).toBe('lead@example.com');
    expect(mockSendEmail.mock.calls[0][2]).toContain('March 2028');
    expect(mockPrisma.calculatorLead.update).toHaveBeenCalledWith({
      where: { id: 'lead_1' },
      data: { remindedAt: expect.any(Date) },
    });
  });

  it('marks converted leads without emailing them', async () => {
    mockPrisma.calculatorLead.findMany.mockResolvedValue([LEAD_CONVERTED]);
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user_9' });

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.leadReminder).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockPrisma.calculatorLead.update).toHaveBeenCalledWith({
      where: { id: 'lead_2' },
      data: { remindedAt: expect.any(Date) },
    });
  });

  it('does not mark remindedAt when the send fails, so it retries next run', async () => {
    mockPrisma.calculatorLead.findMany.mockResolvedValue([LEAD_FRESH]);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockSendEmail.mockResolvedValue({ success: false, error: 'boom' });

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.leadReminder).toBe(0);
    expect(body.errors).toBe(1);
    expect(mockPrisma.calculatorLead.update).not.toHaveBeenCalled();
  });

  it('only queries leads older than 24h that were never reminded', async () => {
    mockPrisma.calculatorLead.findMany.mockResolvedValue([]);

    await GET(makeRequest());

    const arg = mockPrisma.calculatorLead.findMany.mock.calls[0][0];
    expect(arg.where.remindedAt).toBeNull();
    expect(arg.where.createdAt.lte).toBeInstanceOf(Date);
    expect(arg.take).toBe(100);
  });
});
