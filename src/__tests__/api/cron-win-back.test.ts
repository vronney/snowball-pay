import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockPrisma, mockSendEmail, mockMarkEmailSent, mockRender } = vi.hoisted(() => ({
  mockPrisma: { user: { findMany: vi.fn() } },
  mockSendEmail: vi.fn(),
  mockMarkEmailSent: vi.fn(),
  mockRender: vi.fn(async (_email: { props: Record<string, unknown> }) => '<html>email</html>'),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/services/emailService', () => ({
  verifyCronRequest: vi.fn(() => null),
  sendEmail: mockSendEmail,
  markEmailSent: mockMarkEmailSent,
  handleMissingResendConfig: vi.fn(),
}));
vi.mock('@react-email/render', () => ({ render: mockRender }));
vi.mock('@/emails/WinBackEmail', () => ({ default: () => null }));
vi.mock('@/lib/unsubscribeToken', () => ({
  generateUnsubscribeToken: vi.fn(() => 'test-token'),
}));

import { GET } from '@/app/api/cron/win-back/route';
import { WIN_BACK_CHECK_KEY, WIN_BACK_MESSAGE_VERSION } from '@/lib/lifecycleWinBack';

function makeRequest() {
  return new NextRequest('http://localhost/api/cron/win-back');
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function candidate(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user_1',
    email: 'person@example.com',
    name: 'Jordan Lee',
    createdAt: daysAgo(90),
    preferences: { actionChecks: {} },
    debts: [{ updatedAt: daysAgo(45) }],
    income: { updatedAt: daysAgo(45) },
    paymentRecords: [{ paidAt: daysAgo(40) }],
    ...overrides,
  };
}

describe('GET /api/cron/win-back', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 'test-key';
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockSendEmail.mockResolvedValue({ success: true, id: 'email_1' });
    mockMarkEmailSent.mockResolvedValue(undefined);
  });

  it('sends one attributed, idempotent return email and records the versioned exit flag', async () => {
    mockPrisma.user.findMany.mockResolvedValue([candidate()]);

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(body).toMatchObject({ ok: true, sent: 1, errors: 0, messageVersion: WIN_BACK_MESSAGE_VERSION });
    expect(mockSendEmail).toHaveBeenCalledWith(
      'person@example.com',
      expect.any(String),
      'Your payoff plan is ready when you are',
      '<html>email</html>',
      { idempotencyKey: `win-back-${WIN_BACK_MESSAGE_VERSION}-user_1` },
    );
    expect(mockMarkEmailSent).toHaveBeenCalledWith('user_1', WIN_BACK_CHECK_KEY);

    const emailProps = mockRender.mock.calls[0][0].props;
    expect(emailProps.dashboardUrl).toContain('utm_campaign=win_back');
    expect(emailProps.dashboardUrl).toContain(`utm_content=${WIN_BACK_MESSAGE_VERSION}`);
    expect(emailProps).not.toHaveProperty('totalBalance');
  });

  it('skips users with a recent plan update', async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      candidate({ debts: [{ updatedAt: daysAgo(2) }] }),
    ]);

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(body.skippedRecent).toBe(1);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('sends the message only once per user', async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      candidate({ preferences: { actionChecks: { [WIN_BACK_CHECK_KEY]: true } } }),
    ]);

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(body.skippedPreviouslySent).toBe(1);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('does not record completion when delivery fails', async () => {
    mockPrisma.user.findMany.mockResolvedValue([candidate()]);
    mockSendEmail.mockResolvedValue({ success: false, error: 'provider error' });

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(body).toMatchObject({ sent: 0, errors: 1 });
    expect(mockMarkEmailSent).not.toHaveBeenCalled();
  });

  it('queries only opted-in accounts with outstanding debt', async () => {
    await GET(makeRequest());

    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        debts: { some: { balance: { gt: 0 } } },
        OR: [{ preferences: null }, { preferences: { emailOptOut: false } }],
      }),
    }));
  });
});
