import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPrisma, mockSendEmail, mockMarkEmailSent, mockIsSent, mockRender } = vi.hoisted(() => ({
  mockPrisma: { user: { findUnique: vi.fn() } },
  mockSendEmail: vi.fn(),
  mockMarkEmailSent: vi.fn(),
  mockIsSent: vi.fn(),
  mockRender: vi.fn(async (_email: { props: Record<string, unknown> }) => '<html>recovery</html>'),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/services/emailService', () => ({
  sendEmail: mockSendEmail,
  markEmailSent: mockMarkEmailSent,
  isEmailAlreadySent: mockIsSent,
}));
vi.mock('@react-email/render', () => ({ render: mockRender }));
vi.mock('@/emails/CheckoutRecoveryEmail', () => ({ default: () => null }));
vi.mock('@/lib/unsubscribeToken', () => ({
  generateUnsubscribeToken: vi.fn(() => 'test-token'),
}));

import {
  CHECKOUT_RECOVERY_CHECK_KEY,
  CHECKOUT_RECOVERY_MESSAGE_VERSION,
  sendCheckoutRecoveryEmail,
} from '@/lib/checkoutRecovery';

const RECOVERY_URL = 'https://checkout.stripe.com/c/pay/recovery_abc123';

function user(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user_1',
    email: 'person@example.com',
    name: 'Jordan Lee',
    paidTier: 'free',
    preferences: { emailOptOut: false },
    ...overrides,
  };
}

describe('sendCheckoutRecoveryEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue(user());
    mockIsSent.mockResolvedValue(false);
    mockSendEmail.mockResolvedValue({ success: true, id: 'email_1' });
    mockMarkEmailSent.mockResolvedValue(undefined);
  });

  it('sends one idempotent email with the Stripe recovery link and records the versioned flag', async () => {
    const result = await sendCheckoutRecoveryEmail({ userId: 'user_1', recoveryUrl: RECOVERY_URL });

    expect(result).toBe('sent');
    expect(mockSendEmail).toHaveBeenCalledWith(
      'person@example.com',
      expect.any(String),
      'Your SnowballPay Pro upgrade is one step away',
      '<html>recovery</html>',
      { idempotencyKey: `checkout-recovery-${CHECKOUT_RECOVERY_MESSAGE_VERSION}-user_1` },
    );
    expect(mockMarkEmailSent).toHaveBeenCalledWith('user_1', CHECKOUT_RECOVERY_CHECK_KEY);

    const emailProps = mockRender.mock.calls[0][0].props;
    expect(emailProps.recoveryUrl).toBe(RECOVERY_URL);
    expect(emailProps.userName).toBe('Jordan');
    expect(emailProps.unsubscribeUrl).toContain('/api/email/unsubscribe');
  });

  it('skips users who are already Pro', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(user({ paidTier: 'pro' }));

    expect(await sendCheckoutRecoveryEmail({ userId: 'user_1', recoveryUrl: RECOVERY_URL }))
      .toBe('skipped_already_pro');
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('skips users who opted out of email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(user({ preferences: { emailOptOut: true } }));

    expect(await sendCheckoutRecoveryEmail({ userId: 'user_1', recoveryUrl: RECOVERY_URL }))
      .toBe('skipped_opted_out');
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('never sends the same message version twice, even across multiple abandoned sessions', async () => {
    mockIsSent.mockResolvedValue(true);

    expect(await sendCheckoutRecoveryEmail({ userId: 'user_1', recoveryUrl: RECOVERY_URL }))
      .toBe('skipped_already_sent');
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('skips unknown users', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    expect(await sendCheckoutRecoveryEmail({ userId: 'ghost', recoveryUrl: RECOVERY_URL }))
      .toBe('skipped_no_user');
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('returns error without recording the flag when delivery fails', async () => {
    mockSendEmail.mockResolvedValue({ success: false, error: 'rate_limited' });

    expect(await sendCheckoutRecoveryEmail({ userId: 'user_1', recoveryUrl: RECOVERY_URL }))
      .toBe('error');
    expect(mockMarkEmailSent).not.toHaveBeenCalled();
  });
});
