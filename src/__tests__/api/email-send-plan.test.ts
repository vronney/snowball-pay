import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import type * as ReactTypes from 'react';

// Round 5 (Codex r3) P1-b: the emailed plan's totalDebt must be scoped to the
// plan's debts (planScopedBalanceTotal), not every saved debt — otherwise it
// pairs an all-debt total with the plan-only debtFreeDate/months next to it.

const { mockPrisma, mockSend, rendered } = vi.hoisted(() => ({
  mockPrisma: {
    debt: { findMany: vi.fn() },
    income: { findUnique: vi.fn() },
    expense: { findMany: vi.fn() },
    user: { findUnique: vi.fn() },
  },
  mockSend: vi.fn(),
  rendered: [] as Array<{ props: Record<string, unknown> }>,
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/auth-server', () => ({
  verifyAuth: vi.fn(),
  unauthorized: vi.fn(() => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })),
  badRequest: vi.fn((m: string) => new Response(JSON.stringify({ error: m }), { status: 400 })),
  serverError: vi.fn((m: string) => new Response(JSON.stringify({ error: m }), { status: 500 })),
}));
vi.mock('@/lib/gates', () => ({
  isPro: vi.fn(),
  upgradeRequired: vi.fn(
    (feature: string) => new Response(JSON.stringify({ error: 'upgrade_required', feature }), { status: 403 }),
  ),
}));
vi.mock('@/lib/rateLimit', () => ({ limits: { emailPlan: vi.fn() } }));
vi.mock('@/lib/emailContent', () => ({ fetchEmailContent: vi.fn(async () => null) }));
vi.mock('@/lib/payoffPlan', () => ({
  calculatePlanMetrics: vi.fn(() => ({
    result: {
      debtFreeDate: new Date('2028-01-01T00:00:00Z'),
      totalInterestPaid: 500,
      monthlyPayment: 300,
      payoffSchedule: [],
    },
    method: 'snowball',
  })),
}));

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: mockSend };
  },
}));
// Capture the element handed to render so PayoffPlanEmail's props are assertable.
vi.mock('@react-email/render', () => ({
  render: vi.fn(async (el: ReactTypes.ReactElement) => {
    rendered.push({ props: el.props as Record<string, unknown> });
    return '<html>email</html>';
  }),
}));
vi.mock('@/emails/PayoffPlanEmail', () => ({ PayoffPlanEmail: () => null }));

import { POST } from '@/app/api/email/send-plan/route';
import { verifyAuth } from '@/lib/auth-server';
import { isPro } from '@/lib/gates';
import { limits } from '@/lib/rateLimit';

const AUTHED = { valid: true as const, user: { id: 'user-1', email: 'owner@example.com' } };
const post = () => POST(new NextRequest('http://localhost/api/email/send-plan', { method: 'POST' }));

const DEBT_ROW = (overrides: Record<string, unknown>) => ({
  id: 'd', userId: 'user-1', name: 'Debt', category: 'Credit Card',
  balance: 0, originalBalance: 0, interestRate: 10, minimumPayment: 25,
  creditLimit: 0, dueDate: null, priorityOrder: null, inPlan: true,
  createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
  ...overrides,
});

describe('POST /api/email/send-plan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rendered.length = 0;
    vi.mocked(verifyAuth).mockResolvedValue(AUTHED);
    vi.mocked(isPro).mockResolvedValue(true);
    vi.mocked(limits.emailPlan).mockResolvedValue(true);
    mockPrisma.income.findUnique.mockResolvedValue({
      id: 'i', userId: 'user-1', monthlyTakeHome: 4000, essentialExpenses: 2000,
      extraPayment: 0, payoffMethod: 'snowball', accelerationAmount: null,
      createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
    });
    mockPrisma.expense.findMany.mockResolvedValue([]);
    mockPrisma.user.findUnique.mockResolvedValue({ name: 'Owner' });
    mockSend.mockResolvedValue({ id: 'email-1' });
  });

  it('scopes totalDebt to the plan (drops an outside-plan debt) even though the raw row carries inPlan', async () => {
    mockPrisma.debt.findMany.mockResolvedValue([
      DEBT_ROW({ id: 'a', balance: 1000, inPlan: true }),
      DEBT_ROW({ id: 'outside', balance: 500, inPlan: false }),
    ]);

    const res = await post();

    expect(res.status).toBe(200);
    expect(rendered).toHaveLength(1);
    expect(rendered[0].props.totalDebt).toBe(1000);
  });

  it('is a no-op for an account with no outside-plan debts: totalDebt equals the sum of all debts', async () => {
    mockPrisma.debt.findMany.mockResolvedValue([
      DEBT_ROW({ id: 'a', balance: 1000, inPlan: true }),
      DEBT_ROW({ id: 'b', balance: 250, inPlan: true }),
    ]);

    const res = await post();

    expect(res.status).toBe(200);
    expect(rendered[0].props.totalDebt).toBe(1250);
  });
});
