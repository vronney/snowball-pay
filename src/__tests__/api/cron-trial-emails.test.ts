import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  mockPrisma, mockSendEmail, mockMarkEmailSent, mockRender, mockGetSignupTrialEnd, mockHasPaidPro,
} = vi.hoisted(() => ({
  mockPrisma: {
    user: { findMany: vi.fn() },
    trialGrant: { findUnique: vi.fn(), update: vi.fn() },
  },
  mockSendEmail: vi.fn(),
  mockMarkEmailSent: vi.fn(),
  mockRender: vi.fn(async (_email: { type: unknown; props: Record<string, unknown> }) => '<html>email</html>'),
  mockGetSignupTrialEnd: vi.fn(),
  mockHasPaidPro: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/services/emailService', () => ({
  verifyCronRequest: vi.fn(() => null),
  sendEmail: mockSendEmail,
  markEmailSent: mockMarkEmailSent,
  handleMissingResendConfig: vi.fn(() => new Response(JSON.stringify({ skipped: true }))),
}));
vi.mock('@react-email/render', () => ({ render: mockRender }));
vi.mock('@/lib/gates', () => ({
  getSignupTrialEnd: mockGetSignupTrialEnd,
  hasPaidPro: mockHasPaidPro,
}));
vi.mock('@/lib/unsubscribeToken', () => ({
  generateUnsubscribeToken: vi.fn(() => 'test-token'),
}));
vi.mock('@/lib/trialGrantKey', () => ({
  trialGrantKey: vi.fn((email: string) => `hash:${email}`),
}));
vi.mock('@/emails/TrialEndingSoonEmail', () => ({ default: function TrialEndingSoonEmail() { return null; } }));
vi.mock('@/emails/TrialEndedEmail', () => ({ default: function TrialEndedEmail() { return null; } }));

import { GET } from '@/app/api/cron/trial-emails/route';
import {
  TRIAL_EMAIL_VERSION,
  TRIAL_ENDED_CHECK_KEY,
  TRIAL_ENDING_CHECK_KEY,
} from '@/lib/lifecycleTrial';
import { SIGNUP_TRIAL_LAUNCH } from '@/lib/billing';

const DAY = 24 * 60 * 60 * 1000;

function makeRequest() {
  return new NextRequest('http://localhost/api/cron/trial-emails');
}

function inDays(days: number) {
  return new Date(Date.now() + days * DAY);
}

function candidate(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user_1',
    email: 'person@example.com',
    name: 'Jordan Lee',
    preferences: { actionChecks: {} },
    debts: [
      { id: 'd1', balance: 5000, originalBalance: 6000, interestRate: 24.99, minimumPayment: 150, name: 'Visa', category: 'credit_card', creditLimit: null, createdAt: new Date(), updatedAt: new Date(), userId: 'user_1', dueDate: null },
      { id: 'd2', balance: 3000, originalBalance: 3000, interestRate: 7.5, minimumPayment: 90, name: 'Car', category: 'auto_loan', creditLimit: null, createdAt: new Date(), updatedAt: new Date(), userId: 'user_1', dueDate: null },
    ],
    income: { monthlyTakeHome: 4000, essentialExpenses: 2000, extraPayment: 0, payoffMethod: 'snowball' },
    expenses: [],
    ...overrides,
  };
}

describe('GET /api/cron/trial-emails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 'test-key';
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockSendEmail.mockResolvedValue({ success: true, id: 'email_1' });
    mockMarkEmailSent.mockResolvedValue(undefined);
    mockHasPaidPro.mockResolvedValue(false);
    mockPrisma.trialGrant.findUnique.mockResolvedValue({ endingEmailSentAt: null, endedEmailSentAt: null });
    mockPrisma.trialGrant.update.mockResolvedValue({});
  });

  it('sends the "ending" email 3 days out with real plan numbers and a Keep Pro deep link', async () => {
    mockPrisma.user.findMany.mockResolvedValue([candidate()]);
    mockGetSignupTrialEnd.mockResolvedValue(inDays(3));

    const body = await (await GET(makeRequest())).json();

    expect(body).toMatchObject({ ok: true, ending: 1, ended: 0, errors: 0, messageVersion: TRIAL_EMAIL_VERSION });
    expect(mockSendEmail).toHaveBeenCalledWith(
      'person@example.com',
      expect.any(String),
      '3 days of free Pro left',
      '<html>email</html>',
      { idempotencyKey: `trial-ending-${TRIAL_EMAIL_VERSION}-user_1` },
    );
    expect(mockMarkEmailSent).toHaveBeenCalledWith('user_1', TRIAL_ENDING_CHECK_KEY);
    expect(mockPrisma.trialGrant.update).toHaveBeenCalledWith({
      where: { emailHash: 'hash:person@example.com' },
      data: { endingEmailSentAt: expect.any(Date) },
    });

    const props = mockRender.mock.calls[0][0].props;
    expect(props.userName).toBe('Jordan');
    expect(props.daysLeft).toBe(3);
    expect(props.debtCount).toBe(2);
    expect(props.monthlyPrice).toBe(12);
    expect(props.interestAvoided).toBeGreaterThan(0);
    expect(props.keepProUrl).toContain('/dashboard?checkout=pro');
    expect(props.keepProUrl).toContain('utm_campaign=trial_ending');
    expect(props.unsubscribeUrl).toContain('token=test-token');
  });

  it('sends the "ended" email once the window has closed, saying "today" on the boundary day', async () => {
    mockPrisma.user.findMany.mockResolvedValue([candidate()]);
    mockGetSignupTrialEnd.mockResolvedValue(inDays(-0.5));

    const body = await (await GET(makeRequest())).json();

    expect(body).toMatchObject({ ending: 0, ended: 1, errors: 0 });
    expect(mockSendEmail).toHaveBeenCalledWith(
      'person@example.com',
      expect.any(String),
      'Your free Pro ended today. Your plan did not.',
      '<html>email</html>',
      { idempotencyKey: `trial-ended-${TRIAL_EMAIL_VERSION}-user_1` },
    );
    expect(mockMarkEmailSent).toHaveBeenCalledWith('user_1', TRIAL_ENDED_CHECK_KEY);
    expect(mockPrisma.trialGrant.update).toHaveBeenCalledWith({
      where: { emailHash: 'hash:person@example.com' },
      data: { endedEmailSentAt: expect.any(Date) },
    });
    const props = mockRender.mock.calls[0][0].props;
    expect(props.endedOn).toBe('today');
    expect(props.keepProUrl).toContain('utm_campaign=trial_ended');
  });

  it('names the real boundary date when the "ended" send trails it', async () => {
    mockPrisma.user.findMany.mockResolvedValue([candidate()]);
    mockGetSignupTrialEnd.mockResolvedValue(inDays(-2.5));

    await GET(makeRequest());

    const subject = mockSendEmail.mock.calls[0][2] as string;
    expect(subject).toMatch(/^Your free Pro ended on [A-Z][a-z]+ \d{1,2}\. Your plan did not\.$/);
    expect(mockRender.mock.calls[0][0].props.endedOn).toMatch(/^on [A-Z][a-z]+ \d{1,2}$/);
  });

  it('treats a delivery recorded on the durable grant as already sent', async () => {
    mockPrisma.user.findMany.mockResolvedValue([candidate()]);
    mockGetSignupTrialEnd.mockResolvedValue(inDays(3));
    mockPrisma.trialGrant.findUnique.mockResolvedValue({
      endingEmailSentAt: new Date(),
      endedEmailSentAt: null,
    });

    const body = await (await GET(makeRequest())).json();

    expect(body.skippedPreviouslySent).toBe(1);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('still sends when the grant lookup fails, relying on the preferences flag', async () => {
    mockPrisma.user.findMany.mockResolvedValue([candidate()]);
    mockGetSignupTrialEnd.mockResolvedValue(inDays(3));
    mockPrisma.trialGrant.findUnique.mockRejectedValue(new Error('column missing'));
    mockPrisma.trialGrant.update.mockRejectedValue(new Error('column missing'));

    const body = await (await GET(makeRequest())).json();

    expect(body).toMatchObject({ ending: 1, errors: 0 });
    expect(mockMarkEmailSent).toHaveBeenCalledWith('user_1', TRIAL_ENDING_CHECK_KEY);
  });

  it('omits the interest sentence when the account has no plan', async () => {
    mockPrisma.user.findMany.mockResolvedValue([candidate({ income: null })]);
    mockGetSignupTrialEnd.mockResolvedValue(inDays(3));

    await GET(makeRequest());

    expect(mockRender.mock.calls[0][0].props.interestAvoided).toBeUndefined();
  });

  it('skips accounts outside both windows and accounts with no signup window', async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      candidate({ id: 'early' }),
      candidate({ id: 'stale' }),
      candidate({ id: 'legacy' }),
    ]);
    mockGetSignupTrialEnd
      .mockResolvedValueOnce(inDays(9))
      .mockResolvedValueOnce(inDays(-20))
      .mockResolvedValueOnce(null);

    const body = await (await GET(makeRequest())).json();

    expect(body).toMatchObject({ skippedOutsideWindow: 3, ending: 0, ended: 0 });
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('sends each boundary email only once per user', async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      candidate({ preferences: { actionChecks: { [TRIAL_ENDING_CHECK_KEY]: true } } }),
    ]);
    mockGetSignupTrialEnd.mockResolvedValue(inDays(3));

    const body = await (await GET(makeRequest())).json();

    expect(body.skippedPreviouslySent).toBe(1);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('marks paid subscribers without emailing them', async () => {
    mockPrisma.user.findMany.mockResolvedValue([candidate()]);
    mockGetSignupTrialEnd.mockResolvedValue(inDays(3));
    mockHasPaidPro.mockResolvedValue(true);

    const body = await (await GET(makeRequest())).json();

    expect(body).toMatchObject({ skippedPaid: 1, ending: 0 });
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockMarkEmailSent).toHaveBeenCalledWith('user_1', TRIAL_ENDING_CHECK_KEY);
  });

  it('does not record completion when delivery fails', async () => {
    mockPrisma.user.findMany.mockResolvedValue([candidate()]);
    mockGetSignupTrialEnd.mockResolvedValue(inDays(3));
    mockSendEmail.mockResolvedValue({ success: false, error: 'provider error' });

    const body = await (await GET(makeRequest())).json();

    expect(body).toMatchObject({ ending: 0, errors: 1 });
    expect(mockMarkEmailSent).not.toHaveBeenCalled();
  });

  it('caps sends per run and reports it', async () => {
    const many = Array.from({ length: 55 }, (_, i) =>
      candidate({ id: `user_${i}`, email: `person${i}@example.com` }),
    );
    mockPrisma.user.findMany.mockResolvedValue(many);
    mockGetSignupTrialEnd.mockResolvedValue(inDays(3));

    const body = await (await GET(makeRequest())).json();

    expect(body).toMatchObject({ ending: 50, limited: true, errors: 0 });
    expect(mockSendEmail).toHaveBeenCalledTimes(50);
  });

  it('queries only opted-in accounts created since the trial launched', async () => {
    await GET(makeRequest());

    const args = mockPrisma.user.findMany.mock.calls[0][0];
    expect(args.where.OR).toEqual([{ preferences: null }, { preferences: { emailOptOut: false } }]);
    expect(args.where.createdAt.gte.getTime()).toBeGreaterThanOrEqual(SIGNUP_TRIAL_LAUNCH.getTime());
  });
});
