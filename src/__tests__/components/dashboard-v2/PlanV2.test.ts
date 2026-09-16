// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { DashboardInsights } from '@/lib/dashboard/types';
import { useDashboardInsights, useMarkPaid, useSubscription } from '@/lib/hooks';
import { track, Events } from '@/lib/analytics';
import { upgradeEvents } from '@/lib/upgradeEvents';
import { calculatePlanMetrics, calculateResultForAcceleration } from '@/lib/payoffPlan';
import type { PlanTopContext } from '@/components/tabs/PayoffTab';
import PlanV2 from '@/components/dashboard-v2/plan/PlanV2';
import { makeDebt, makeIncome } from '../../lib/dashboard/fixtures';

const slots = vi.hoisted(() => ({ ctx: null as unknown }));
const whatIf = vi.hoisted(() => ({ last: null as null | Record<string, unknown> }));

vi.mock('@/lib/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/hooks')>()),
  useDashboardInsights: vi.fn(),
  useSubscription: vi.fn(),
  useMarkPaid: vi.fn(),
}));
vi.mock('@/lib/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/analytics')>()),
  track: vi.fn(),
}));
// PayoffTab itself is covered by PayoffTab.slots.test.ts; here it only feeds the slots a fixed context.
vi.mock('@/components/tabs/PayoffTab', async () => {
  const { createElement: h } = await import('react');
  return {
    default: (p: { renderTop?: (ctx: unknown) => unknown; renderFooter?: (ctx: unknown) => unknown }) =>
      h('div', { 'data-stub': 'PayoffTab' }, p.renderTop?.(slots.ctx) as never, p.renderFooter?.(slots.ctx) as never),
  };
});
vi.mock('@/components/payoff/WhatIfCard', async () => {
  const { createElement: h } = await import('react');
  return {
    default: (p: Record<string, unknown>) => {
      whatIf.last = p;
      return h('div', { 'data-stub': 'WhatIfCard' });
    },
  };
});

const FREE = { proEligible: false, paidPro: false, trial: { active: false, endsAt: null } };
const PRO = { proEligible: true, paidPro: true, trial: { active: false, endsAt: null } };
const INCOME = makeIncome({ monthlyTakeHome: 4_000, essentialExpenses: 2_000, payoffMethod: 'snowball', accelerationAmount: 500 });
// Visa is snowball's target (smallest balance); the car loan is avalanche's
// (highest rate) — the two methods must diverge so the comparison pair and
// its caption assert something real, not a tie.
const DEBTS = [
  makeDebt({ id: 'visa', name: 'Visa', balance: 3_000, minimumPayment: 90, interestRate: 7 }),
  makeDebt({ id: 'car', name: 'Car loan', balance: 9_000, minimumPayment: 250, interestRate: 24 }),
];
// PayoffTab's own numbers (PayoffTab.tsx:137-145, 265-278): surplus 4000 − 2000 − 340 = 1660, acceleration 500.
const METRICS = calculatePlanMetrics(DEBTS, INCOME, [], { method: 'snowball', accelerationAmount: 500 })!;
const ALTERNATIVE = calculateResultForAcceleration(DEBTS, INCOME, METRICS, METRICS.effectiveAcceleration, 'avalanche');

function context(overrides: Partial<PlanTopContext> = {}): PlanTopContext {
  return {
    payoffMethod: 'snowball',
    setPayoffMethod: vi.fn(),
    accelerationAmount: 500,
    setAccelerationAmount: vi.fn(),
    saveAccelerationNow: vi.fn(),
    income: INCOME,
    expenses: [],
    planResult: METRICS.result,
    alternative: { method: 'avalanche', result: ALTERNATIVE },
    availableCashFlow: METRICS.availableCashFlow,
    effectiveAcceleration: METRICS.effectiveAcceleration,
    adjustedExtra: METRICS.adjustedExtra,
    recurringTotal: METRICS.recurringTotal,
    saveIsPending: false,
    saveIsSuccess: false,
    saveIsError: false,
    saveSubmittedAt: 0,
    lastSavedAcceleration: undefined,
    ...overrides,
  };
}

function insights(overrides: Partial<DashboardInsights> = {}): DashboardInsights {
  return {
    asOf: { year: 2026, month: 8, day: 15 },
    tier: FREE,
    readiness: { steps: [], completeCount: 0, percent: 0 },
    interest: null, paymentGap: null, coachMoves: [], rateWatch: null, strategy: null, planGap: null, progress: null, plan: null, uncounted: null,
    ...overrides,
  };
}

type Options = {
  ctx?: PlanTopContext;
  data?: DashboardInsights | undefined;
  subscription?: { proEligible: boolean } | undefined;
  placeholder?: boolean;
};

function renderTab(options: Options = {}) {
  const data = 'data' in options ? options.data : insights();
  const subscription = 'subscription' in options ? options.subscription : { proEligible: data?.tier.proEligible ?? false };
  const ctx = options.ctx ?? context();
  slots.ctx = ctx;
  vi.mocked(useDashboardInsights).mockReturnValue(
    { data, isPlaceholderData: options.placeholder ?? false } as unknown as ReturnType<typeof useDashboardInsights>,
  );
  vi.mocked(useSubscription).mockReturnValue({ data: subscription } as unknown as ReturnType<typeof useSubscription>);
  vi.mocked(useMarkPaid).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as unknown as ReturnType<typeof useMarkPaid>);
  const { rerender } = render(createElement(PlanV2, { debts: DEBTS, income: INCOME, expenses: [], isLoading: false, onNavigate: vi.fn() }));
  // Re-renders with the same fixed props; the mocked PayoffTab reads slots.ctx
  // at render time, so callers update that module var before calling this.
  return Object.assign(ctx, {
    rerender: () => rerender(createElement(PlanV2, { debts: DEBTS, income: INCOME, expenses: [], isLoading: false, onNavigate: vi.fn() })),
  });
}

afterEach(() => {
  vi.clearAllMocks();
  whatIf.last = null;
});

describe('PlanV2 top (spec §8.5 My Plan)', () => {
  it('renders the segmented control with the comparison pair, and switches through PayoffTab', () => {
    const ctx = renderTab();
    expect(screen.getByRole('button', { name: 'Snowball' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Avalanche' }).getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByText('Yours · Snowball')).toBeTruthy();
    expect(screen.getByText(/Switch above and the whole plan recalculates|You're on the cheaper of the two/)).toBeTruthy();
    // The pair must carry a real difference, not a tie: the two mono figures
    // inside the Strategy card (yours, then the alternative) render distinct text.
    const strategy = within(screen.getByRole('region', { name: 'Strategy' }));
    const figures = strategy.getAllByText(/^\$[\d,]+$/);
    expect(figures.length).toBe(2);
    expect(figures[0].textContent).not.toBe(figures[1].textContent);
    fireEvent.click(screen.getByRole('button', { name: 'Avalanche' }));
    expect(ctx.setPayoffMethod).toHaveBeenCalledWith('avalanche');
  });

  it('gates Custom for a Free account with the existing modal copy', () => {
    const handler = vi.fn();
    const unsubscribe = upgradeEvents.subscribe(handler);
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Custom — Pro' }));
    expect(handler).toHaveBeenCalledWith('Custom priority order');
    unsubscribe();
  });

  it('keeps Custom selectable for Pro', () => {
    const ctx = renderTab({ data: insights({ tier: PRO }) });
    const custom = screen.getByRole('button', { name: 'Custom' });
    expect(custom.hasAttribute('disabled')).toBe(false);
    fireEvent.click(custom);
    expect(ctx.setPayoffMethod).toHaveBeenCalledWith('custom');
  });

  it("drives the acceleration slider through PayoffTab with v1's step and range", () => {
    const ctx = renderTab();
    const slider = screen.getByRole('slider', { name: 'Apply to Acceleration' }) as HTMLInputElement;
    expect(slider.max).toBe('1660');
    expect(slider.step).toBe('50');
    expect(screen.getByText('$1,660.00 available')).toBeTruthy();
    fireEvent.change(slider, { target: { value: '600' } });
    expect(ctx.setAccelerationAmount).toHaveBeenCalledWith(600);
    expect(document.getElementById('cash-flow-overview')).not.toBeNull();
  });

  it('keeps the #cash-flow-overview anchor alive for v1\'s scroll target when the slider has no room to show', () => {
    renderTab({ ctx: context({ availableCashFlow: 0, effectiveAcceleration: 0 }) });
    expect(screen.queryByRole('slider')).toBeNull();
    expect(document.getElementById('cash-flow-overview')).not.toBeNull();
  });

  it('shows Free one real +$25 rung and two gated tiles', () => {
    const handler = vi.fn();
    const unsubscribe = upgradeEvents.subscribe(handler);
    renderTab();
    // Scoped to the what-if card: the strategy caption can also say "sooner".
    const whatIf = within(screen.getByRole('region', { name: 'What if' }));
    expect(whatIf.getByText('+$25/mo')).toBeTruthy();
    expect(whatIf.getByText(/saves \$|sooner/)).toBeTruthy();
    expect(screen.getByText('One scenario is yours. Pro runs any amount, side by side.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '+$100 — Pro' }));
    expect(handler).toHaveBeenCalledWith('What-if scenarios');
    expect(screen.getByRole('button', { name: 'Any $ — Pro' })).toBeTruthy();
    expect(screen.queryByLabelText('Any amount extra per month')).toBeNull();
    expect(document.querySelector('[data-stub="WhatIfCard"]')).toBeNull();
    unsubscribe();
  });

  it('gives Pro the ladder and an any-amount input whose Apply clamps like the ladder', () => {
    const ctx = renderTab({ data: insights({ tier: PRO }) });
    expect(document.querySelector('[data-stub="WhatIfCard"]')).not.toBeNull();
    expect(screen.queryByText('+$25/mo')).toBeNull();
    const apply = screen.getByRole('button', { name: 'Apply' });
    expect(apply.hasAttribute('disabled')).toBe(true);
    fireEvent.change(screen.getByLabelText('Any amount extra per month'), { target: { value: '100' } });
    const status = screen.getByRole('status');
    expect(status.textContent).toMatch(/ interest · /);
    expect(status.querySelector('span')?.className).toContain('text-success-text');
    fireEvent.click(apply);
    expect(ctx.setAccelerationAmount).toHaveBeenCalledWith(600);
    expect(track).toHaveBeenCalledWith(Events.WHAT_IF_APPLIED, expect.objectContaining({ delta: 100, next_acceleration: 600 }));

    // Far beyond the 1660 headroom: honest, not a fake saving.
    fireEvent.change(screen.getByLabelText('Any amount extra per month'), { target: { value: '100000' } });
    expect(status.textContent).toContain('more room');
    expect(status.querySelector('span')?.className).not.toContain('text-success-text');
  });

  it('passes the page\'s one resolved tier verdict to WhatIfCard, overriding a stale Free subscription cache', () => {
    renderTab({ data: insights({ tier: PRO }), subscription: { proEligible: false } });
    expect(document.querySelector('[data-stub="WhatIfCard"]')).not.toBeNull();
    expect(whatIf.last?.isPro).toBe(true);
    expect(screen.getByLabelText('Any amount extra per month')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '+$100 — Pro' })).toBeNull();
  });

  it('hides the what-if row and holds Custom until the tier is known', () => {
    renderTab({ data: undefined, subscription: undefined });
    expect(screen.queryByText('+$25/mo')).toBeNull();
    expect(screen.queryByLabelText('Any amount extra per month')).toBeNull();
    expect(screen.getByRole('button', { name: 'Custom' }).hasAttribute('disabled')).toBe(true);
  });
});

describe('PlanV2 closing card (spec §8.4 "Plan closing")', () => {
  const BEHIND = { amount: -2621.46, asOfMonth: 'Sep 2026' };

  it('applies the unused cash flow in one tap and reports the new date only once the save actually succeeds', () => {
    // This exercises the ordering the "record the timestamp before the save"
    // fix depends on: fixRequestedAt must be stamped BEFORE saveAccelerationNow
    // runs, not after. saveAccelerationNow here mimics the real one — it's
    // synchronous, but its own Date.now() read (standing in for
    // saveIncome.mutate's submittedAt) happens inside the call, and a beat of
    // wall-clock time (modeled as +5ms via fake timers) is spent afterward
    // before anything else in the handler could read the clock again. If
    // PlanV2's onCta captured fixRequestedAt via Date.now() AFTER calling
    // saveAccelerationNow (the old, broken order) instead of before it, that
    // read would land after this beat, making fixRequestedAt > submittedAt —
    // the "Applied" gate (saveSubmittedAt >= fixRequestedAt) would then never
    // open and this test's final assertion would fail. One
    // saveAccelerationNow instance survives every re-render (each context()
    // call otherwise makes a fresh vi.fn()), so the press can be asserted on
    // the same spy the later re-renders were built with.
    vi.useFakeTimers();
    let capturedSubmittedAt = 0;
    try {
      const saveAccelerationNow = vi.fn(() => {
        capturedSubmittedAt = Date.now();
        slots.ctx = context({
          effectiveAcceleration: 1_660, accelerationAmount: 1_660, saveIsPending: true, saveSubmittedAt: capturedSubmittedAt, lastSavedAcceleration: 1_660, saveAccelerationNow,
        });
        // The beat of wall-clock time spent inside the real mutate() call,
        // after its own submittedAt has already been stamped.
        vi.setSystemTime(Date.now() + 5);
      });
      // An OLD successful save (submitted well before the click) must not count.
      const ctx = renderTab({
        data: insights({ planGap: BEHIND }),
        ctx: context({ saveIsSuccess: true, saveSubmittedAt: Date.now() - 60_000, saveAccelerationNow }),
      });
      expect(screen.getByText('Plan vs actual')).toBeTruthy();
      expect(screen.getByText('$2,621.46 behind')).toBeTruthy();
      expect(screen.getByText('Balances are $2,621.46 above where the plan expected by Sep 2026.')).toBeTruthy();

      fireEvent.click(screen.getByRole('button', { name: 'Fix it in one tap' }));
      // The fix saves immediately — not through PayoffTab's debounced path —
      // so it survives a tab switch before the debounce would have settled.
      expect(saveAccelerationNow).toHaveBeenCalledWith(1_660);
      expect(ctx.setAccelerationAmount).not.toHaveBeenCalled();
      expect(track).toHaveBeenCalledWith(Events.PLAN_GAP_FIX_APPLIED);
      expect(screen.queryByRole('status')).toBeNull();

      // The debounced save is now in flight (submitted inside the press, and
      // PayoffTab's context reflects the applied value): the fix CTA stays
      // mounted — never "Log this month's payments" — but disabled, still no note.
      ctx.rerender();
      expect(screen.getByRole('button', { name: 'Fix it in one tap' }).hasAttribute('disabled')).toBe(true);
      expect(screen.queryByRole('button', { name: "Log this month's payments" })).toBeNull();
      expect(screen.queryByRole('status')).toBeNull();

      // The save completes: only now does the note appear, and the fix CTA
      // is gone. This is the assertion the ordering race broke.
      slots.ctx = context({
        effectiveAcceleration: 1_660, accelerationAmount: 1_660, saveIsSuccess: true, saveSubmittedAt: capturedSubmittedAt, lastSavedAcceleration: 1_660, saveAccelerationNow,
      });
      ctx.rerender();
      expect(screen.getByRole('status').textContent).toMatch(/^Applied — your plan now ends [A-Z][a-z]+ \d{4}\.$/);
      expect(screen.queryByRole('button', { name: 'Fix it in one tap' })).toBeNull();

      // The user later lowers the acceleration (the slider, or a what-if
      // control) and that save completes: the completed fix must not leave
      // the CTA disabled forever, and the stale "Applied" note — which no
      // longer describes the current, lower plan — must be gone.
      slots.ctx = context({
        effectiveAcceleration: 900, accelerationAmount: 900, saveIsSuccess: true, saveSubmittedAt: capturedSubmittedAt + 10, lastSavedAcceleration: 900,
      });
      ctx.rerender();
      expect(screen.getByRole('button', { name: 'Fix it in one tap' }).hasAttribute('disabled')).toBe(false);
      expect(screen.queryByRole('status')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('ignores another control\'s save while the fix is in flight', () => {
    const saveAccelerationNow = vi.fn();
    const ctx = renderTab({
      data: insights({ planGap: BEHIND }),
      ctx: context({ saveAccelerationNow }),
    });
    fireEvent.click(screen.getByRole('button', { name: 'Fix it in one tap' }));
    expect(saveAccelerationNow).toHaveBeenCalledWith(1_660);
    const afterPress = Date.now();

    // A slider save (900) succeeds while the fix (1_660) is still in flight —
    // it must not be read as the fix's own success.
    slots.ctx = context({
      effectiveAcceleration: 900, accelerationAmount: 900, saveIsSuccess: true, saveSubmittedAt: afterPress, lastSavedAcceleration: 900, saveAccelerationNow,
    });
    ctx.rerender();
    expect(screen.queryByRole('status')).toBeNull();
    const fixButton = screen.getByRole('button', { name: 'Fix it in one tap' });
    expect(fixButton).toBeTruthy();
    expect(fixButton.hasAttribute('disabled')).toBe(true);

    // The fix's own save (1_660) now succeeds — only now does the note appear.
    slots.ctx = context({
      effectiveAcceleration: 1_660, accelerationAmount: 1_660, saveIsSuccess: true, saveSubmittedAt: afterPress, lastSavedAcceleration: 1_660, saveAccelerationNow,
    });
    ctx.rerender();
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('disables the fix CTA while another save is already pending, and refuses a click', () => {
    const saveAccelerationNow = vi.fn();
    const ctx = renderTab({
      data: insights({ planGap: BEHIND }),
      ctx: context({ saveIsPending: true, saveSubmittedAt: Date.now() - 100, saveAccelerationNow }),
    });
    const fixButton = screen.getByRole('button', { name: 'Fix it in one tap' });
    expect(fixButton.hasAttribute('disabled')).toBe(true);

    fireEvent.click(fixButton);
    expect(saveAccelerationNow).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalledWith(Events.PLAN_GAP_FIX_APPLIED);
    expect(screen.queryByRole('status')).toBeNull();

    // The other save settles: the fix CTA becomes pressable again.
    slots.ctx = context({ saveAccelerationNow });
    ctx.rerender();
    expect(screen.getByRole('button', { name: 'Fix it in one tap' }).hasAttribute('disabled')).toBe(false);
  });

  it("restores the previous acceleration and offers a working retry when the debounced save behind the fix fails", () => {
    // One setAccelerationAmount / saveAccelerationNow mock survives every
    // re-render (each context() call otherwise makes a fresh vi.fn()), so the
    // calls before and after the failure can be asserted on the same spy.
    const setAccelerationAmount = vi.fn();
    const saveAccelerationNow = vi.fn();
    const ctx = renderTab({
      data: insights({ planGap: BEHIND }),
      ctx: context({ setAccelerationAmount, saveAccelerationNow }),
    });
    fireEvent.click(screen.getByRole('button', { name: 'Fix it in one tap' }));
    // The press saves immediately, not through setAccelerationAmount.
    expect(saveAccelerationNow).toHaveBeenCalledWith(1_660);
    expect(setAccelerationAmount).not.toHaveBeenCalled();

    // Another control's save fails with a DIFFERENT amount (e.g. the slider,
    // at 900) while the fix is still in flight — it must not be mistaken for
    // the fix's own failure: no restore, no error banner.
    slots.ctx = context({
      setAccelerationAmount, saveAccelerationNow, effectiveAcceleration: 1_660, accelerationAmount: 1_660, saveIsError: true, saveSubmittedAt: Date.now() + 1, lastSavedAcceleration: 900,
    });
    ctx.rerender();
    expect(setAccelerationAmount).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();

    slots.ctx = context({
      setAccelerationAmount, saveAccelerationNow, effectiveAcceleration: 1_660, accelerationAmount: 1_660, saveIsError: true, saveSubmittedAt: Date.now() + 2, lastSavedAcceleration: 1_660,
    });
    ctx.rerender();

    // The restore fires as a side effect of the failed save, using the
    // acceleration that was in effect before the fix press (500). Restore
    // still goes through setAccelerationAmount — the server never took the
    // failed value, so only the UI needs to snap back.
    expect(setAccelerationAmount).toHaveBeenNthCalledWith(1, 500);
    expect(screen.getByRole('alert').textContent).toBe("Couldn't save the new amount. Try again.");
    expect(screen.queryByRole('status')).toBeNull();

    // The context now reflects the restored acceleration: the fix CTA is
    // back, enabled, and a fresh press is possible.
    slots.ctx = context({ setAccelerationAmount, saveAccelerationNow });
    ctx.rerender();
    const fixButton = screen.getByRole('button', { name: 'Fix it in one tap' });
    expect(fixButton.hasAttribute('disabled')).toBe(false);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it("offers to log this month's payments when the cash flow is already applied", () => {
    const paymentGap = { expected: 2, logged: 0, missed: [{ debtId: 'visa', minimumPayment: 90 }], missedMinimums: 90, notYetDue: 1 };
    renderTab({
      ctx: context({ effectiveAcceleration: 1_660, accelerationAmount: 1_660 }),
      data: insights({ planGap: BEHIND, paymentGap }),
    });
    expect(screen.queryByRole('button', { name: 'Fix it in one tap' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: "Log this month's payments" }));
    expect(screen.getByRole('dialog', { name: 'Log Sep payments' })).toBeTruthy();
    expect(screen.getByText('Visa')).toBeTruthy();
  });

  it('never opens the log sheet on placeholder-day data', () => {
    const paymentGap = { expected: 2, logged: 0, missed: [{ debtId: 'visa', minimumPayment: 90 }], missedMinimums: 90, notYetDue: 1 };
    renderTab({
      ctx: context({ effectiveAcceleration: 1_660, accelerationAmount: 1_660 }),
      data: insights({ planGap: BEHIND, paymentGap }),
      placeholder: true,
    });
    fireEvent.click(screen.getByRole('button', { name: "Log this month's payments" }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders no closing card when ahead or without a gap', () => {
    renderTab({ data: insights({ planGap: { amount: 300, asOfMonth: 'Sep 2026' } }) });
    expect(screen.queryByText('Plan vs actual')).toBeNull();
  });
});
