import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import type * as ReactTypes from 'react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockPrisma, mockVerifyAuth, mockSend, rendered } = vi.hoisted(() => ({
  mockPrisma: {
    user: { findUnique: vi.fn() },
    userPreferences: { update: vi.fn(), create: vi.fn() },
  },
  mockVerifyAuth: vi.fn(),
  mockSend: vi.fn(),
  rendered: [] as Array<{ props: Record<string, unknown> }>,
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

vi.mock('@/lib/auth-server', () => ({
  verifyAuth: mockVerifyAuth,
  unauthorized: vi.fn(() => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })),
  badRequest: vi.fn((m: string) => new Response(JSON.stringify({ error: m }), { status: 400 })),
  serverError: vi.fn((m: string) => new Response(JSON.stringify({ error: m }), { status: 500 })),
}));

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: mockSend };
  },
}));

// Capture the element handed to render so each variant's props are assertable.
vi.mock('@react-email/render', () => ({
  render: vi.fn(async (el: ReactTypes.ReactElement) => {
    rendered.push({ props: el.props as Record<string, unknown> });
    return '<html>email</html>';
  }),
}));

// Email templates are .tsx — vitest can't transform JSX under the project's
// jsx:"preserve" tsconfig, so stub every template the route imports.
vi.mock('@/emails/WelcomeEmail', () => ({ default: () => null }));
vi.mock('@/emails/IncompleteSetupEmail', () => ({ default: () => null }));
vi.mock('@/emails/FirstWinEmail', () => ({ default: () => null }));
vi.mock('@/emails/SharePromptEmail', () => ({ default: () => null }));

import { POST } from '@/app/api/email/lifecycle/route';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeRequest() {
  return new NextRequest('http://localhost/api/email/lifecycle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'day0' }),
  });
}

const DEBT = {
  id: 'd1', name: 'Visa', category: 'Credit Card', balance: 5000,
  originalBalance: 5000, interestRate: 22, minimumPayment: 150,
  creditLimit: 6000, createdAt: new Date(), updatedAt: new Date(),
  userId: 'u1', dueDate: null,
};

const INCOME = {
  id: 'i1', userId: 'u1', monthlyTakeHome: 5000, essentialExpenses: 3000,
  extraPayment: 200, payoffMethod: 'snowball',
};

function makeUser(overrides: Record<string, unknown>) {
  return {
    id: 'u1', email: 'new@user.com', name: 'Ronney Vargas',
    preferences: null, debts: [], income: null, expenses: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/email/lifecycle — plan-aware day0 welcome', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rendered.length = 0;
    process.env.RESEND_API_KEY = 'test-key';
    mockVerifyAuth.mockResolvedValue({ valid: true, user: { id: 'u1', email: 'new@user.com' } });
    mockSend.mockResolvedValue({ id: 'email_1' });
    mockPrisma.userPreferences.create.mockResolvedValue({});
  });

  it('sends the plan variant with real numbers when the account has debts + income', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(makeUser({ debts: [DEBT], income: INCOME }));

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    const props = rendered[0].props;
    expect(typeof props.debtFreeDate).toBe('string');
    expect((props.debtFreeDate as string).length).toBeGreaterThan(4);
    expect(typeof props.interestSaved).toBe('number');
    expect(props.debtCount).toBe(1);
    expect(props.hasDebts).toBe(true);
    expect(props.hasIncome).toBe(true);

    const subject = mockSend.mock.calls[0][0].subject as string;
    expect(subject).toContain('debt-free by');
  });

  it('sends the partial variant flags when only debts exist', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(makeUser({ debts: [DEBT] }));

    await POST(makeRequest());

    const props = rendered[0].props;
    expect(props.debtFreeDate).toBeUndefined();
    expect(props.hasDebts).toBe(true);
    expect(props.hasIncome).toBe(false);
    expect(mockSend.mock.calls[0][0].subject).toBe(
      "Welcome to SnowballPay — here's your first move",
    );
  });

  it('sends the generic variant for a blank account', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(makeUser({}));

    await POST(makeRequest());

    const props = rendered[0].props;
    expect(props.debtFreeDate).toBeUndefined();
    expect(props.hasDebts).toBe(false);
    expect(props.hasIncome).toBe(false);
    expect(mockSend.mock.calls[0][0].subject).toBe(
      "Welcome to SnowballPay — here's your first move",
    );
  });

  it('skips paid-off accounts gracefully (all balances zero → generic variant)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(
      makeUser({ debts: [{ ...DEBT, balance: 0 }], income: INCOME }),
    );

    await POST(makeRequest());

    const props = rendered[0].props;
    expect(props.debtFreeDate).toBeUndefined();
    expect(props.hasDebts).toBe(true);
    expect(props.hasIncome).toBe(true);
  });
});
