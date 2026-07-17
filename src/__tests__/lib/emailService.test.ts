import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSend, mockPrisma } = vi.hoisted(() => ({
  mockSend: vi.fn(),
  mockPrisma: {
    user: { findUnique: vi.fn() },
    userPreferences: { update: vi.fn(), create: vi.fn() },
  },
}));

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: mockSend };
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { sendEmail } from '@/lib/services/emailService';

describe('email service delivery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 'test-key';
  });

  it('passes a provider idempotency key and returns the delivery id', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email_123' }, error: null });

    const result = await sendEmail(
      'person@example.com',
      'SnowballPay <noreply@example.com>',
      'A subject',
      '<p>Hello</p>',
      { idempotencyKey: 'win-back-v1-user_1' },
    );

    expect(result).toEqual({ success: true, id: 'email_123' });
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'person@example.com', subject: 'A subject' }),
      { idempotencyKey: 'win-back-v1-user_1' },
    );
  });

  it('treats a resolved provider error as a failed send', async () => {
    mockSend.mockResolvedValue({ data: null, error: { message: 'domain not verified' } });

    const result = await sendEmail(
      'person@example.com',
      'SnowballPay <noreply@example.com>',
      'A subject',
      '<p>Hello</p>',
    );

    expect(result).toEqual({ success: false, error: 'domain not verified' });
  });

  it('does not attempt delivery without an API key', async () => {
    delete process.env.RESEND_API_KEY;

    await expect(sendEmail('person@example.com', 'from@example.com', 'Subject', '<p>Hello</p>'))
      .resolves.toEqual({ success: false, error: 'email_not_configured' });
    expect(mockSend).not.toHaveBeenCalled();
  });
});
