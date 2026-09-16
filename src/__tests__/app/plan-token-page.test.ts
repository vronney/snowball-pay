import { describe, it, expect, vi, beforeEach } from 'vitest';

// Round 5 (Codex r3) P1-a: the shared plan page must publish plan-scoped
// numbers (total debt, debt count), not every saved debt — an outside-plan
// debt must not inflate the public link's "Total debt" or debt count next
// to a debt-free date/interest total the engine only computed from the plan.
//
// Rendered via the RSC function directly (no ReactDOM/jsdom): the returned
// element tree is walked for its string/number leaves, which sidesteps
// next/image and notFound()'s special Next.js control-flow semantics.

const { mockPrisma, mockVerifyShareToken, mockCalculatePlanMetrics } = vi.hoisted(() => ({
  mockPrisma: {
    debt: { findMany: vi.fn() },
    income: { findUnique: vi.fn() },
    expense: { findMany: vi.fn() },
  },
  mockVerifyShareToken: vi.fn(),
  mockCalculatePlanMetrics: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/shareToken', () => ({ verifyShareToken: mockVerifyShareToken }));
vi.mock('@/lib/payoffPlan', () => ({ calculatePlanMetrics: mockCalculatePlanMetrics }));
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));
vi.mock('next/image', () => ({ default: () => null }));

import SharedPlanPage from '@/app/plan/[token]/page';

const FIXED_RESULT = {
  debtFreeDate: new Date('2028-03-01T00:00:00Z'),
  totalInterestPaid: 400,
  months: 24,
  payoffSchedule: [{ debtId: 'a', debtName: 'Card A', orderInPayoff: 0, monthPaidOff: 5 }],
};

const DEBT_ROW = (overrides: Record<string, unknown>) => ({
  id: 'd', userId: 'user-1', name: 'Debt', category: 'Credit Card',
  balance: 0, originalBalance: 0, interestRate: 10, minimumPayment: 25,
  creditLimit: 0, dueDate: null, priorityOrder: null, inPlan: true,
  createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
  ...overrides,
});

/** Walks a React element tree, collecting every string/number leaf. */
function collectText(node: unknown, acc: string[] = []): string[] {
  if (node == null || typeof node === 'boolean') return acc;
  if (typeof node === 'string' || typeof node === 'number') {
    acc.push(String(node));
    return acc;
  }
  if (Array.isArray(node)) {
    for (const child of node) collectText(child, acc);
    return acc;
  }
  if (typeof node === 'object' && node !== null && 'props' in node) {
    const { children } = (node as { props: { children?: unknown } }).props;
    if (children !== undefined) collectText(children, acc);
  }
  return acc;
}

async function renderPage(token = 'tok') {
  const element = await SharedPlanPage({ params: Promise.resolve({ token }) });
  return collectText(element).join('');
}

describe('SharedPlanPage (/plan/[token])', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyShareToken.mockReturnValue('user-1');
    mockPrisma.income.findUnique.mockResolvedValue({
      id: 'i', userId: 'user-1', monthlyTakeHome: 4000, essentialExpenses: 2000,
      extraPayment: 0, payoffMethod: 'snowball', accelerationAmount: null,
      createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
    });
    mockPrisma.expense.findMany.mockResolvedValue([]);
    mockCalculatePlanMetrics.mockReturnValue({ result: FIXED_RESULT, method: 'snowball' });
  });

  it('scopes total debt and the debt count to in-plan debts, dropping an outside one', async () => {
    mockPrisma.debt.findMany.mockResolvedValue([
      DEBT_ROW({ id: 'a', balance: 1000, inPlan: true }),
      DEBT_ROW({ id: 'outside', balance: 500, inPlan: false }),
    ]);

    const text = await renderPage();

    expect(text).toContain('$1,000.00');
    expect(text).not.toContain('$1,500.00');
    expect(text).toContain('1 debt');
    expect(text).not.toContain('2 debts');

    // The raw mapping must forward inPlan so calculatePlanMetrics also sees
    // real membership (not just this page's own total/count).
    const passedDebts = mockCalculatePlanMetrics.mock.calls[0][0] as Array<{ id: string; inPlan?: boolean }>;
    expect(passedDebts.find((d) => d.id === 'outside')?.inPlan).toBe(false);
    expect(passedDebts.find((d) => d.id === 'a')?.inPlan).toBe(true);
  });

  it('is a no-op for an account with no outside-plan debts: total and count cover every debt', async () => {
    mockPrisma.debt.findMany.mockResolvedValue([
      DEBT_ROW({ id: 'a', balance: 1000, inPlan: true }),
      DEBT_ROW({ id: 'b', balance: 500, inPlan: true }),
    ]);

    const text = await renderPage();

    expect(text).toContain('$1,500.00');
    expect(text).toContain('2 debts');
  });
});
