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
vi.mock('@/emails/TrialStoppedEmail', () => ({ default: function TrialStoppedEmail() { return null; } }));

import { GET } from '@/app/api/cron/trial-emails/route';
import {
  TRIAL_EMAIL_VERSION,
  TRIAL_ENDED_CHECK_KEY,
  TRIAL_ENDING_CHECK_KEY,
  TRIAL_STOPPED_CHECK_KEY,
} from '@/lib/lifecycleTrial';
import { SUPPORT_EMAIL } from '@/lib/constants/app';
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
    createdAt: new Date(),
    preferences: { actionChecks: {}, trialStartedAt: null },
    debts: [
      { id: 'd1', balance: 5000, originalBalance: 6000, interestRate: 24.99, minimumPayment: 150, name: 'Visa', category: 'credit_card', creditLimit: null, createdAt: new Date(), updatedAt: new Date(), userId: 'user_1', dueDate: null },
      { id: 'd2', balance: 3000, originalBalance: 3000, interestRate: 7.5, minimumPayment: 90, name: 'Car', category: 'auto_loan', creditLimit: null, createdAt: new Date(), updatedAt: new Date(), userId: 'user_1', dueDate: null },
    ],
    income: { monthlyTakeHome: 4000, essentialExpenses: 2000, extraPayment: 0, payoffMethod: 'snowball', updatedAt: inDays(-20) },
    expenses: [],
    paymentRecords: [],
    _count: { paymentRecords: 0 },
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
    mockPrisma.trialGrant.findUnique.mockResolvedValue({ endingEmailSentAt: null, endedEmailSentAt: null, stoppedEmailSentAt: null });
    mockPrisma.trialGrant.update.mockResolvedValue({});
  });

  it('sends the "ending" email 3 days out with real plan numbers and a Keep Pro deep link', async () => {
    const paidOff = { id: 'd0', balance: 0, originalBalance: 900, interestRate: 19.99, minimumPayment: 25, name: 'Store card', category: 'credit_card', creditLimit: null, createdAt: new Date(), updatedAt: new Date(), userId: 'user_1', dueDate: null };
    const base = candidate();
    mockPrisma.user.findMany.mockResolvedValue([{ ...base, debts: [paidOff, ...base.debts] }]);
    mockGetSignupTrialEnd.mockResolvedValue(inDays(3));

    const body = await (await GET(makeRequest())).json();

    expect(body).toMatchObject({ ok: true, ending: 1, ended: 0, errors: 0, messageVersion: TRIAL_EMAIL_VERSION });
    expect(mockSendEmail).toHaveBeenCalledWith(
      'person@example.com',
      expect.any(String),
      '3 days of free Pro left',
      '<html>email</html>',
      { idempotencyKey: `trial-ending-${TRIAL_EMAIL_VERSION}-user_1`, replyTo: SUPPORT_EMAIL },
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
      { idempotencyKey: `trial-ended-${TRIAL_EMAIL_VERSION}-user_1`, replyTo: SUPPORT_EMAIL },
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
      stoppedEmailSentAt: null,
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

  it('queries each trial anchor on its own so one cannot crowd out the other (spec §6.4)', async () => {
    await GET(makeRequest());

    const [signupArm, trialArm] = mockPrisma.user.findMany.mock.calls.map(([args]) => args);

    // Signups since launch, opted in, and without a self-serve anchor — the
    // arms stay disjoint so neither cap covers the other's population.
    expect(signupArm.where.AND[1]).toEqual({
      OR: [
        { preferences: null },
        { preferences: { emailOptOut: false, trialStartedAt: null } },
      ],
    });
    expect(signupArm.where.AND[0].createdAt.gte.getTime()).toBeGreaterThanOrEqual(
      SIGNUP_TRIAL_LAUNCH.getTime(),
    );
    expect(signupArm.orderBy).toEqual({ createdAt: 'asc' });

    // A self-serve trial on an older account stays a candidate while either
    // email can be due. Its preferences row exists, so the opt-out collapses in.
    expect(trialArm.where.preferences.emailOptOut).toBe(false);
    const startedAfter = trialArm.where.preferences.trialStartedAt.gte.getTime();
    expect(Math.abs(Date.now() - startedAfter - (14 + 7) * DAY)).toBeLessThan(60_000);
    expect(trialArm.orderBy).toEqual({ preferences: { trialStartedAt: 'asc' } });

    // Each arm carries the full cap; neither is rationed against the other.
    expect(signupArm.take).toBe(trialArm.take);
  });

  it('orders the scan by whichever timestamp anchors each trial', async () => {
    // Ordering by createdAt alone would put the 200-day-old account first,
    // although its trial started a day later than the other account signed up.
    const selfServe = candidate({
      id: 'user_selfserve',
      email: 'selfserve@example.com',
      createdAt: new Date(Date.now() - 200 * DAY),
      preferences: { actionChecks: {}, trialStartedAt: new Date(Date.now() - 12 * DAY) },
    });
    const signup = candidate({
      id: 'user_signup',
      email: 'signup@example.com',
      createdAt: new Date(Date.now() - 13 * DAY),
    });
    mockPrisma.user.findMany
      .mockResolvedValueOnce([signup])
      .mockResolvedValueOnce([selfServe]);
    mockGetSignupTrialEnd.mockResolvedValue(inDays(3));

    await GET(makeRequest());

    expect(mockSendEmail.mock.calls.map(([to]) => to)).toEqual([
      'signup@example.com',
      'selfserve@example.com',
    ]);
  });

  it('does not cry truncation when an arm returns exactly the cap', async () => {
    // Each arm fetches one past the cap; coming back with exactly the cap means
    // nothing was omitted.
    const exactly = Array.from({ length: 500 }, (_, i) =>
      candidate({ id: `user_${i}`, email: `person${i}@example.com` }),
    );
    mockPrisma.user.findMany.mockResolvedValueOnce(exactly).mockResolvedValueOnce([]);
    mockGetSignupTrialEnd.mockResolvedValue(null);

    const body = await (await GET(makeRequest())).json();

    expect(mockPrisma.user.findMany.mock.calls[0][0].take).toBe(501);
    expect(body).toMatchObject({ candidates: 500, limited: false });
  });

  it('reports truncation when an arm returns the sentinel row', async () => {
    const overflowing = Array.from({ length: 501 }, (_, i) =>
      candidate({ id: `user_${i}`, email: `person${i}@example.com` }),
    );
    mockPrisma.user.findMany.mockResolvedValueOnce(overflowing).mockResolvedValueOnce([]);
    mockGetSignupTrialEnd.mockResolvedValue(null);

    const body = await (await GET(makeRequest())).json();

    expect(body).toMatchObject({ candidates: 500, limited: true });
  });

  it('reports a truncated scan even when neither arm filled on its own', async () => {
    // 300 + 300 disjoint accounts: neither arm hits the 500 cap, but the merged
    // set is sliced back to 500 and 100 in-window accounts go unseen.
    const arm = (prefix: string) =>
      Array.from({ length: 300 }, (_, i) =>
        candidate({ id: `${prefix}_${i}`, email: `${prefix}${i}@example.com` }),
      );
    mockPrisma.user.findMany
      .mockResolvedValueOnce(arm('signup'))
      .mockResolvedValueOnce(arm('selfserve'));
    // Nothing is due, so the send cap cannot be what sets the flag.
    mockGetSignupTrialEnd.mockResolvedValue(null);

    const body = await (await GET(makeRequest())).json();

    expect(body).toMatchObject({ candidates: 500, limited: true, ending: 0, ended: 0 });
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('counts an account matched by both anchors once', async () => {
    const both = candidate({
      createdAt: new Date(Date.now() - 5 * DAY),
      preferences: { actionChecks: {}, trialStartedAt: new Date(Date.now() - 2 * DAY) },
    });
    mockPrisma.user.findMany.mockResolvedValueOnce([both]).mockResolvedValueOnce([both]);
    mockGetSignupTrialEnd.mockResolvedValue(inDays(3));

    const body = await (await GET(makeRequest())).json();

    expect(body).toMatchObject({ candidates: 1, ending: 1 });
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });

  describe('the "stopped" ask, three days after the boundary', () => {
    const DAYS_AFTER = -3.5;
    const endedAlreadySent = { [TRIAL_ENDED_CHECK_KEY]: true };
    // A realistic expired trial: signed up 14 days before the boundary, last
    // touched the plan while the trial was still running.
    const stoppedCandidate = (overrides: Record<string, unknown> = {}) =>
      candidate({
        createdAt: inDays(DAYS_AFTER - 14),
        preferences: { actionChecks: endedAlreadySent, trialStartedAt: null },
        debts: [
          { id: 'd1', balance: 5000, originalBalance: 6000, interestRate: 24.99, minimumPayment: 150, name: 'Visa', category: 'credit_card', creditLimit: null, createdAt: inDays(-17), updatedAt: inDays(-10), userId: 'user_1', dueDate: null },
        ],
        ...overrides,
      });

    it('asks what made them stop once "ended" has gone out, with replies routed to support', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        stoppedCandidate({ paymentRecords: [{ paidAt: inDays(-10) }], _count: { paymentRecords: 4 } }),
      ]);
      mockGetSignupTrialEnd.mockResolvedValue(inDays(DAYS_AFTER));

      const body = await (await GET(makeRequest())).json();

      expect(body).toMatchObject({ ending: 0, ended: 0, stopped: 1, errors: 0 });
      expect(mockSendEmail).toHaveBeenCalledWith(
        'person@example.com',
        expect.any(String),
        'What made you stop?',
        '<html>email</html>',
        { idempotencyKey: `trial-stopped-${TRIAL_EMAIL_VERSION}-user_1`, replyTo: SUPPORT_EMAIL },
      );
      expect(mockMarkEmailSent).toHaveBeenCalledWith('user_1', TRIAL_STOPPED_CHECK_KEY);
      expect(mockPrisma.trialGrant.update).toHaveBeenCalledWith({
        where: { emailHash: 'hash:person@example.com' },
        data: { stoppedEmailSentAt: expect.any(Date) },
      });
      const props = mockRender.mock.calls[0][0].props;
      expect(props.userName).toBe('Jordan');
      expect(props.paymentsLogged).toBe(4);
      expect(props.unsubscribeUrl).toContain('token=test-token');
      expect(props.keepProUrl).toBeUndefined();
    });

    it('sends "ended" first when both are due, never two emails in one run', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        stoppedCandidate({ preferences: { actionChecks: {}, trialStartedAt: null } }),
      ]);
      mockGetSignupTrialEnd.mockResolvedValue(inDays(DAYS_AFTER));

      const body = await (await GET(makeRequest())).json();

      expect(body).toMatchObject({ ended: 1, stopped: 0 });
      expect(mockSendEmail).toHaveBeenCalledTimes(1);
      expect(mockSendEmail.mock.calls[0][2]).toMatch(/^Your free Pro ended/);
    });

    it('does not ask someone who kept using their plan after the trial ended', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        stoppedCandidate({ paymentRecords: [{ paidAt: inDays(-1) }], _count: { paymentRecords: 6 } }),
      ]);
      mockGetSignupTrialEnd.mockResolvedValue(inDays(DAYS_AFTER));

      const body = await (await GET(makeRequest())).json();

      expect(body).toMatchObject({ stopped: 0, skippedActive: 1 });
      expect(mockSendEmail).not.toHaveBeenCalled();
      // Recorded so the row is not re-evaluated tomorrow; win-back owns later inactivity.
      expect(mockMarkEmailSent).toHaveBeenCalledWith('user_1', TRIAL_STOPPED_CHECK_KEY);
    });

    it('treats a balance edit after the boundary as activity too', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        stoppedCandidate({
          debts: [
            { id: 'd1', balance: 5000, originalBalance: 6000, interestRate: 24.99, minimumPayment: 150, name: 'Visa', category: 'credit_card', creditLimit: null, createdAt: inDays(-17), updatedAt: inDays(-2), userId: 'user_1', dueDate: null },
          ],
        }),
      ]);
      mockGetSignupTrialEnd.mockResolvedValue(inDays(DAYS_AFTER));

      const body = await (await GET(makeRequest())).json();

      expect(body).toMatchObject({ stopped: 0, skippedActive: 1 });
    });

    it('counts a debt paid down to zero after the boundary as activity', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        stoppedCandidate({
          debts: [
            { id: 'd1', balance: 0, originalBalance: 6000, interestRate: 24.99, minimumPayment: 150, name: 'Visa', category: 'credit_card', creditLimit: null, createdAt: inDays(-17), updatedAt: inDays(-1), userId: 'user_1', dueDate: null },
          ],
        }),
      ]);
      mockGetSignupTrialEnd.mockResolvedValue(inDays(DAYS_AFTER));

      const body = await (await GET(makeRequest())).json();

      expect(body).toMatchObject({ stopped: 0, skippedActive: 1 });
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it('is a one-time send, tracked on the grant like the others', async () => {
      mockPrisma.user.findMany.mockResolvedValue([stoppedCandidate()]);
      mockGetSignupTrialEnd.mockResolvedValue(inDays(DAYS_AFTER));
      mockPrisma.trialGrant.findUnique.mockResolvedValue({
        endingEmailSentAt: null,
        endedEmailSentAt: new Date(),
        stoppedEmailSentAt: new Date(),
      });

      const body = await (await GET(makeRequest())).json();

      expect(body.skippedPreviouslySent).toBe(1);
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it('is not due before day 3 or after the prompt window', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        stoppedCandidate({ id: 'early' }),
        stoppedCandidate({ id: 'late' }),
      ]);
      mockGetSignupTrialEnd.mockResolvedValueOnce(inDays(-1.5)).mockResolvedValueOnce(inDays(-8));

      const body = await (await GET(makeRequest())).json();

      expect(body).toMatchObject({ stopped: 0, skippedPreviouslySent: 1, skippedOutsideWindow: 1 });
      expect(mockSendEmail).not.toHaveBeenCalled();
    });
  });
});
