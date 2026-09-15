# Dashboard v2 — PR 3: This Month Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Behind the `DASHBOARD_V2_USERS` flag, replace the This Month tab with the v2 design: a plan-readiness meter, the monthly interest meter, the debt-free hero, rate watch (desktop), and one free coach move (or the AI brief for Pro and trial users), plus the two sheets those cards open: due dates and bulk payment logging. With the flag off, the page renders exactly as it does today.

**Architecture:** Every figure comes from `useDashboardInsights()` (PR 1). A React-free module, `src/lib/dashboard/thisMonth.ts`, turns insights into per-card view models: copy, visibility, CTA targets. The cards are thin presentational components under `src/components/dashboard-v2/this-month/`. The sheets write only through existing hooks (`useUpdateDebt`, `useMarkPaid`, `useSaveIncome`). There are no new API routes and no server changes. `DashboardClient` picks `ThisMonthV2` over `ThisMonthTab` only when `dashboardV2` is true.

**Tech Stack:** Next.js 15 App Router, React 18, TypeScript, Tailwind 3.4, TanStack Query 5.28, lucide-react 0.294, Vitest 4 with `globals: true`.
- Component tests use a `// @vitest-environment jsdom` header, @testing-library/react 16 (`render`, `renderHook`, `fireEvent`), and `createElement` instead of JSX.
- Test files must be `*.test.ts`, not `.tsx`.

**Spec:** `docs/superpowers/specs/2026-09-12-dashboard-pro-upgrade-design.md` (§3, §4, §8.2–§8.5, §9).
- The parent roadmap is `docs/superpowers/plans/2026-09-12-dashboard-pro-upgrade.md` (PR 3 row).
- The handoff defines the visuals: `~/.gstack/projects/vronney-snowball-pay/designs/dashboard-pro-upgrade-20260912/`, meaning `README.md` §1 "This Month (mobile)" and §6 "Desktop — This Month", plus `STYLES.md` and screenshots `01` and `03`. Read it, but never copy it into the repo: its numbers are one real account's data.

## Global Constraints

- **Flag off renders unchanged** (spec §5.3). The PR 2 snapshots in `src/__tests__/components/dashboard-v2/__snapshots__/DashboardClient.flag.test.ts.snap` must pass untouched. **Never run vitest with `-u` / `--update`.**
- **Flag off never fetches insights.** `ThisMonthV2` renders only under the flag. It is the second caller of `useDashboardInsights`, after `V2Shell`, and React Query dedupes the request.
- **No computed number changes.** PR 3 only reads existing figures and writes through existing hooks. The baseline gate still runs before the PR.
- **Hide instead of fake** (spec §4). A card whose figure is null, non-finite, or floors to under $1 (where the copy implies a positive amount) does not render. No zero, placeholder or average stands in.
- **Display rounding:** estimates floor to whole dollars (`floorWhole` in `src/lib/dashboard/format.ts`). Concrete amounts, meaning minimums and typed payments, use `formatCurrency`.
- **Labels carry the math:** "est.", "avg", "/yr". Copy uses spec §8.4 templates verbatim and states only computed facts (X6).
- **DESIGN.md wins over the handoff:**
  - Cards are `rounded-xl` (12px). In-app buttons are `rounded-lg` (8px), including the readiness CTA, which the handoff draws at 10px. Chips are `rounded-full`; tags (Pro, priority) are `rounded-md`.
  - Blue (`action`) appears only on CTAs, progress fills (readiness bar, hero ring), the readiness counter, and the "Your free move" eyebrow (DESIGN.md 2026-09-12). Nothing else passive is blue, including the hero's "to go" line.
  - Ink appears only on the readiness CTA in this PR.
  - No dashed borders, no new fonts, light mode only.
- **Tokens, not hexes:** `bg-surface`, `bg-bg`, `bg-surface-2`, `text-txt`, `text-txt-muted`, `text-action`, `bg-action`, `bg-ink`, `text-danger`, `border-danger/25`, `bg-success`, `text-success-text` (added in Task 5), `bg-warning/15`, `border-border`, `shadow-card`, `shadow-cta-ink`, `shadow-cta-blue`. The one literal allowed is the existing focus convention, `focus-visible:outline-action`.
- **Don't use the `.eyebrow` class for colored labels.** It hardcodes `color: #64748b`. Use `EYEBROW` from `src/components/dashboard-v2/styles.ts` plus a color utility.
- **Breakpoints:**
  - The mobile shell is `max-[768px]`, where rate watch is hidden (README §1 note).
  - The desktop shell is `min-[769px]`.
  - The desktop This Month layout starts at `min-[1024px]`: readiness CTA on the right, a 1.15fr/1fr/1fr three-up row, and the coach card with a 250px action column. Between 769 and 1023px the cards stack.
- **Touch targets:** 44px minimum (`min-h-11`, `h-11 w-11`), 46px for primary mobile CTAs (`min-h-[46px]`). Readiness chips keep a 32px visual pill with a 44px hit area.
- **Motion:** meters animate 0 → value once, then to each new value, over 600ms ease-out (`transition-[width] duration-[600ms] ease-out motion-reduce:transition-none`). The hero ring reuses `RadialGauge`, whose `.gauge-fill` already honors reduced motion.
- **Prices:** This Month shows none. Never write the literal `12`.
- **Analytics:** `track()` properties pass through `sanitiseAnalyticsProperties`, which redacts every number whose key isn't in `SAFE_NUMERIC_KEYS`. Use only string, boolean and `debt_count` properties.
- **Git:**
  - Work on branch `feat/dashboard-v2-this-month`, created from `main` at `633a0ded`.
  - Use conventional commits, each ending with `-m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"`.
  - Never bypass hooks.
  - The local `block-no-verify` hook rejects any Bash command that contains `git commit` together with a `-n`-like token (`echo -n`, `[ -n`, `-ne`). Keep commits in their own command.
- **Pre-existing `tsc` noise:** `src/__tests__/lib/stripe.test.ts` has accepted type errors. Filter them out of every `npx tsc --noEmit` check.

## Decisions made while writing this plan

These need the owner's OK before execution. The spec is patched to match in Task 8.

1. **This Month is the four design cards (D12), plus rate watch on the desktop shell.**
   - Under the flag, v2 drops every other v1 This Month element:
     - the greeting
     - `PlanStatStrip`
     - `DebtCapUpsell`
     - the "All debts" list
     - the focus card
     - `RollForwardAdvice`
     - the quick-nav buttons
     - the empty-state card
   - With no debts, the readiness card's "Add your debts" CTA replaces the empty state.
   - `LinkBankPrompt` stays, because it sits above the tab in `DashboardClient`.
2. **Readiness CTAs and chips.** The CTA opens the first incomplete step. Every visible chip is a button (D11), and a chip for an incomplete step opens the same flow as its CTA:
   - **debts:** "Add your debts" → My Debts. This label isn't among the spec §8.4 CTAs; the step exists, so it needs one.
   - **income:** "Add your income" → Income & Budget.
   - **expenses:** "Add your expenses" → Income & Budget.
   - **dueDates:** "Add {n} due dates" (1: "Add 1 due date") → `DueDatesSheet`.
   - **firstPayment:** "Log your first payment" → `BulkLogSheet`, pre-filled with every active debt at its minimum.

   A done chip opens that step's home instead: Due dates and First payment → My Debts, Income and Expenses → Income & Budget, Debts → My Debts. An incomplete step whose `pendingCount` is 0 has no chip. Only due dates can be in that state (before any debt exists).
3. **Free-move CTAs:**
   - `log_missed`: "Log them now" (1: "Log it now") → `BulkLogSheet` with the missed payments at their minimums, for the month in `insights.asOf`.
   - `switch_strategy`: "Switch to {Alt}" is one tap. It saves `payoffMethod` through `useSaveIncome` with `PayoffTab`'s exact payload, with no confirm step (README "Strategy switch").
   - `use_unallocated`: "Open My Plan" → the Plan tab, where the acceleration slider lives. The one-tap apply is PR 5's "Fix it in one tap".
   - `call_apr`: no button. The APR call script is Pro-only today (`IntelligenceTab`); the card's own copy is the action. PR 5 (Coach) decides whether Free users get the script.
4. **The "more moves" row is a gated control, not a list.**
   - It reads "{n} more moves found" with a Pro tag.
   - It has `aria-disabled="true"` and the accessible name "{n} more moves found — Pro". Pressing it opens the existing `UpgradeModal` via `upgradeEvents.dispatch('Coach moves')`, the same copy as the sidebar rail.
   - The Coach tab's list with per-move values (`MoreMovesList`) moves to PR 5, where it is rendered.
5. **Pro and trial users** (`tier.proEligible`) get the existing `CoachBriefCard` in the coach slot, with no Pro row. Its `onApplyAction` wiring matches v1: set the pending coach extra, then open Coach.
6. **Rate watch copy (X10):**
   - "Rate watch · {n} cards" (1: "card")
   - "${floor}/yr"
   - "est. if your cards drop to their target rates" (1: "est. if this card drops to its target rate")
7. **The interest card:**
   - It shows whole dollars floored ("$840 est."), per the PR 1 rounding rule, not the handoff's cents.
   - Its bar splits this month's estimate (red) against the plan's average monthly saving (green), each as a share of their sum.
   - The bar and the "≈$X/mo your plan saves vs minimums (avg)" line hide when the average is null or under $1.
8. **The hero:**
   - The date comes from `insights.plan.debtFreeDate`, shown as "Month YYYY".
   - "{formatMonths} to go" is muted text, not blue.
   - The ring uses v1 This Month's formula exactly: `computeThisMonthPaidProgress(debts)` → `totalPaid / totalOriginal`, clamped 0–100, as in `DebtFreeCountdownHero`.
   - The hero hides when `plan` is null. That includes capped plans, which v1 still shows.
9. **Green text gets its own token. This amends DESIGN.md and needs the owner's explicit OK.**
   - `success` (#27AE60) is 2.9:1 on white. That fails WCAG AA even for large text, and the handoff puts green on 11px chip labels, the 11px average line, and the 28px rate-watch figure.
   - Add `success-text: '#15803d'` (5.0:1 on white), the check color `UpgradeModal` already uses, for green text only. `success` stays for fills: the bar segment and chip tint.
   - Alternative if the owner says no: those texts become `text-txt`, and green stays only in fills.
10. **One sheet primitive.**
    - A bottom sheet at ≤768px and a centered dialog from 769px, 12px radius.
    - Portaled to `<body>`, because the tab wrapper's `.tab-fade-in` keeps a transform that traps fixed overlays.
    - Focus moves to the title, Tab is trapped, Escape closes, and focus is restored on close. The backdrop, the close button and Escape are inert while a save runs.
11. **Sheet writes are sequential through the existing hooks:**
    - `updateDebt.mutateAsync` per due day.
    - `markPaid.mutateAsync` per payment, with mode `'mark'`, idempotent per month.

    On the first failure the sheet stops. Saved rows leave the list, the error names the debt, and the rest stay for a retry.
12. **Analytics (spec §9, the PR 3 surfaces only):**
    - `readiness_cta {step}` (CTA only, not chips)
    - `coach_move_cta {move, gated: false}`
    - `bulk_log_submitted {debt_count}`. The spec says `count`, but the sanitiser would redact it; `debt_count` is on its safe list.

    The other §9 events stay in PR 4 and PR 6.
13. **Carry-over items from PR 1 and PR 2:**
    - **Done here:**
      - 429 joins the no-retry list via an extracted `shouldRetryQuery`.
      - `placeholderData: (previous) => previous` on `useDashboardInsights`.
      - `PlaidReauthBanner` invalidates insights after its raw-axios `clear-reauth`.
      - Readiness chips with `pendingCount` 0 hide (decision 2).
    - **Not done, with reasons:**
      - Plaid OAuth return is always reached by a full-page redirect from the bank, so the query cache is empty.
      - `DangerZoneSection` already calls `queryClient.clear()`.
      - The in-page Plaid link, refresh and disconnect are `useMutation`s, so the global cache covers them.
      - v1's bell under 44px can't change, because v1 must stay byte-identical.
      - The Next dev "N" indicator is dev-only.
14. **Loading and failure:** skeleton cards while insights load. If insights fail with no cached data, one card says "We couldn't load this month's numbers." with a "Try again" button (`refetch`). If every card is hidden, one card says "Nothing to show for {Month} yet." with a button to My Debts.

**Known limits, accepted for PR 3:**
- A bulk log fires one payment celebration per payment, because it reuses `useMarkPaid` exactly (spec §8.3). The banner shows the last one.
- The sheets snapshot their rows when they open. Rows that refetch away while a sheet is open simply disappear.

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/queryRetry.ts` (create) | `getResponseStatus`, `shouldRetryQuery` (401/403/404/429 never retry) |
| `src/app/providers.tsx` (modify) | Uses `shouldRetryQuery` |
| `src/lib/hooks.ts` (modify) | `placeholderData` on `useDashboardInsights` |
| `src/components/plaid/PlaidReauthBanner.tsx` (modify) | Invalidates `['dashboard-insights']` after clear-reauth |
| `src/lib/dashboard/format.ts` (create) | `floorDollars`, `floorWhole`, `monthYearLabel`, `shortMonthLabel`, `longMonthLabel` |
| `src/lib/dashboard/coachMoveCopy.ts` (modify) | Imports `floorWhole` instead of defining it |
| `src/lib/dashboard/thisMonth.ts` (create) | View models for every This Month card and sheet |
| `src/lib/analyticsEvents.ts` (modify) | `READINESS_CTA`, `COACH_MOVE_CTA`, `BULK_LOG_SUBMITTED` |
| `tailwind.config.ts`, `DESIGN.md` (modify) | `success-text` token and its dated decision |
| `src/components/dashboard-v2/useMeterValue.ts` (create) | 0 → value meter motion |
| `src/components/dashboard-v2/sheets/Sheet.tsx` (create) | Dialog primitive |
| `src/components/dashboard-v2/sheets/DueDatesSheet.tsx` (create) | Day picker per debt → `PATCH /api/debts/[id]` |
| `src/components/dashboard-v2/sheets/BulkLogSheet.tsx` (create) | Pre-filled payments → `useMarkPaid`, sequentially |
| `src/components/dashboard-v2/styles.ts` (create) | Shared class strings (eyebrow, card, CTA) |
| `src/components/dashboard-v2/this-month/ReadinessCard.tsx` (create) | Meter, chips, CTA |
| `src/components/dashboard-v2/this-month/InterestMeter.tsx` (create) | Monthly interest estimate and split bar |
| `src/components/dashboard-v2/this-month/DebtFreeHero.tsx` (create) | Date, time to go, ring |
| `src/components/dashboard-v2/this-month/RateWatchCard.tsx` (create) | Annual APR-cut estimate |
| `src/components/dashboard-v2/this-month/MoreMovesRow.tsx` (create) | Gated "{n} more moves found · Pro" row |
| `src/components/dashboard-v2/this-month/FreeMoveCard.tsx` (create) | The free coach move |
| `src/components/dashboard-v2/this-month/ThisMonthV2.tsx` (create) | Assembly, sheet state, actions |
| `src/components/DashboardClient.tsx` (modify) | `ThisMonthV2` under the flag |
| Tests: `src/__tests__/lib/queryRetry.test.ts`, `src/__tests__/lib/useDashboardInsights.test.ts`, `src/__tests__/components/PlaidReauthBanner.test.ts`, `src/__tests__/lib/dashboard/format.test.ts`, `src/__tests__/lib/dashboard/thisMonth.test.ts`, `src/__tests__/lib/analyticsV2Events.test.ts`, `src/__tests__/lib/designTokens.test.ts` (extend), `src/__tests__/components/dashboard-v2/{useMeterValue,Sheet,DueDatesSheet,BulkLogSheet,thisMonthCards,FreeMoveCard,ThisMonthV2}.test.ts`, `DashboardClient.flag.test.ts` (modify its v2 test only) | |
| `docs/superpowers/specs/2026-09-12-dashboard-pro-upgrade-design.md` (modify) | Records the decisions above |

---

### Task 1: Query plumbing (429 no-retry, placeholder data, re-auth invalidation)

**Files:**
- Create: `src/lib/queryRetry.ts`
- Modify: `src/app/providers.tsx:56-62` (delete `getResponseStatus`) and `:77-81` (the `retry` option)
- Modify: `src/lib/hooks.ts:790-805` (`useDashboardInsights`)
- Modify: `src/components/plaid/PlaidReauthBanner.tsx:38-39`
- Test: `src/__tests__/lib/queryRetry.test.ts`, `src/__tests__/lib/useDashboardInsights.test.ts`, `src/__tests__/components/PlaidReauthBanner.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `getResponseStatus(error: unknown): number | undefined`
  - `shouldRetryQuery(failureCount: number, error: unknown): boolean`
  - `useDashboardInsights()` now keeps the previous day's data while a new day's key loads (`isPlaceholderData` is true meanwhile).

- [ ] **Step 1: Write the failing retry test** at `src/__tests__/lib/queryRetry.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { getResponseStatus, shouldRetryQuery } from '@/lib/queryRetry';

const httpError = (status: number) => ({ response: { status } });

describe('shouldRetryQuery', () => {
  it.each([401, 403, 404, 429])('never retries a %i', (status) => {
    expect(shouldRetryQuery(0, httpError(status))).toBe(false);
  });

  it('retries other HTTP failures twice', () => {
    expect(shouldRetryQuery(0, httpError(500))).toBe(true);
    expect(shouldRetryQuery(1, httpError(500))).toBe(true);
    expect(shouldRetryQuery(2, httpError(500))).toBe(false);
  });

  it('retries network errors, which carry no response', () => {
    expect(shouldRetryQuery(0, new Error('Network Error'))).toBe(true);
  });
});

describe('getResponseStatus', () => {
  it('reads the status off an axios-style error', () => {
    expect(getResponseStatus(httpError(429))).toBe(429);
  });

  it('returns undefined for anything else', () => {
    expect(getResponseStatus(null)).toBeUndefined();
    expect(getResponseStatus('boom')).toBeUndefined();
    expect(getResponseStatus({ response: { status: '429' } })).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it to verify it fails.**
Run: `npx vitest run src/__tests__/lib/queryRetry.test.ts`
Expected: FAIL, because `@/lib/queryRetry` can't be resolved.

- [ ] **Step 3: Create `src/lib/queryRetry.ts`.** Move `getResponseStatus` verbatim from `providers.tsx`:

```ts
/** HTTP status on an axios-style error, or undefined (network errors, non-HTTP throws). */
export function getResponseStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const response = 'response' in error ? error.response : undefined;
  if (typeof response !== 'object' || response === null) return undefined;
  const status = 'status' in response ? response.status : undefined;
  return typeof status === 'number' ? status : undefined;
}

/**
 * Statuses a retry can't fix. 429 is here because retrying a rate limit only
 * spends more of the same window.
 */
const NO_RETRY_STATUSES: ReadonlySet<number> = new Set([401, 403, 404, 429]);

/** Global React Query retry rule: up to 2 retries, none for the statuses above. */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  const status = getResponseStatus(error);
  if (status !== undefined && NO_RETRY_STATUSES.has(status)) return false;
  return failureCount < 2;
}
```

- [ ] **Step 4: Use it in `src/app/providers.tsx`.**
  - Delete the local `getResponseStatus` function (lines 56-62).
  - Add `import { shouldRetryQuery } from '@/lib/queryRetry';` below the `shouldRedirectOn401` import.
  - Replace the `retry: (failureCount, error) => { … }` block with `retry: shouldRetryQuery,`.

- [ ] **Step 5: Run the retry test.**
Run: `npx vitest run src/__tests__/lib/queryRetry.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 6: Write the failing placeholder test** at `src/__tests__/lib/useDashboardInsights.test.ts`:

```ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import { useDashboardInsights } from '@/lib/hooks';

const day = vi.hoisted(() => ({ change: null as ((next: string) => void) | null }));

vi.mock('@/lib/dashboard/today', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/dashboard/today')>()),
  localDateParam: () => '2026-09-14',
  onLocalDayChange: (onChange: (next: string) => void) => {
    day.change = onChange;
    return () => { day.change = null; };
  },
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client }, children);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useDashboardInsights', () => {
  it("keeps the previous day's figures on screen while the new day loads", async () => {
    const get = vi.spyOn(axios, 'get').mockResolvedValueOnce({ data: { asOf: 'day-1' } });
    const { result } = renderHook(() => useDashboardInsights(), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual({ asOf: 'day-1' }));

    let resolveNext: (value: unknown) => void = () => {};
    get.mockReturnValueOnce(new Promise((resolve) => { resolveNext = resolve; }) as never);
    act(() => day.change?.('2026-09-15'));

    await waitFor(() =>
      expect(get).toHaveBeenLastCalledWith(
        expect.stringContaining('/api/dashboard/insights'),
        { params: { today: '2026-09-15' } },
      ),
    );
    expect(result.current.data).toEqual({ asOf: 'day-1' });
    expect(result.current.isPlaceholderData).toBe(true);

    await act(async () => { resolveNext({ data: { asOf: 'day-2' } }); });
    await waitFor(() => expect(result.current.data).toEqual({ asOf: 'day-2' }));
    expect(result.current.isPlaceholderData).toBe(false);
  });
});
```

- [ ] **Step 7: Run it to verify it fails.**
Run: `npx vitest run src/__tests__/lib/useDashboardInsights.test.ts`
Expected: FAIL. After the day change, `data` is `undefined` instead of `{ asOf: 'day-1' }`.

- [ ] **Step 8: Add the placeholder** in `useDashboardInsights` (`src/lib/hooks.ts`), after `enabled,`:

```ts
    // The key changes at local midnight; show the previous day's figures
    // while the new day loads instead of flashing the loading state.
    placeholderData: (previous) => previous,
```

- [ ] **Step 9: Run it.**
Run: `npx vitest run src/__tests__/lib/useDashboardInsights.test.ts`
Expected: PASS.

- [ ] **Step 10: Write the failing re-auth test** at `src/__tests__/components/PlaidReauthBanner.test.ts`:

```ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { act, render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import { PlaidReauthBanner } from '@/components/plaid/PlaidReauthBanner';

const plaid = vi.hoisted(() => ({ onSuccess: null as null | (() => Promise<void>) }));

vi.mock('react-plaid-link', () => ({
  usePlaidLink: (config: { onSuccess: () => Promise<void> }) => {
    plaid.onSuccess = config.onSuccess;
    return { open: vi.fn(), ready: false };
  },
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PlaidReauthBanner', () => {
  it('refreshes dashboard insights after the reconnect is confirmed', async () => {
    vi.spyOn(axios, 'post').mockResolvedValue({ data: {} });
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    render(createElement(QueryClientProvider, { client }, createElement(PlaidReauthBanner, { plaidItemId: 'item-1' })));

    await act(async () => { await plaid.onSuccess?.(); });

    expect(axios.post).toHaveBeenCalledWith('/api/plaid/clear-reauth', { plaidItemId: 'item-1' });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboard-insights'] });
  });
});
```

- [ ] **Step 11: Run it to verify it fails.**
Run: `npx vitest run src/__tests__/components/PlaidReauthBanner.test.ts`
Expected: FAIL. `invalidateQueries` is called only with `{ queryKey: ['debts'] }`.

- [ ] **Step 12: Add the invalidation** in `PlaidReauthBanner.tsx`, right after `queryClient.invalidateQueries({ queryKey: ['debts'] });`:

```ts
        // A raw axios write, so the global MutationCache never sees it.
        queryClient.invalidateQueries({ queryKey: ['dashboard-insights'] });
```

- [ ] **Step 13: Run the three new test files, then the full suite.**
Run: `npx vitest run src/__tests__/lib/queryRetry.test.ts src/__tests__/lib/useDashboardInsights.test.ts src/__tests__/components/PlaidReauthBanner.test.ts`, then `npm test`
Expected: all PASS.

- [ ] **Step 14: Commit.**

```bash
git add src/lib/queryRetry.ts src/app/providers.tsx src/lib/hooks.ts src/components/plaid/PlaidReauthBanner.tsx src/__tests__/lib/queryRetry.test.ts src/__tests__/lib/useDashboardInsights.test.ts src/__tests__/components/PlaidReauthBanner.test.ts
git commit -m "fix(dashboard-v2): no retries on 429, keep insights across midnight, refresh after re-auth" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: This Month view models (pure) and the analytics events

**Files:**
- Create: `src/lib/dashboard/format.ts`, `src/lib/dashboard/thisMonth.ts`
- Modify: `src/lib/dashboard/coachMoveCopy.ts:1-17` (import `floorWhole`), `src/lib/analyticsEvents.ts:64` (three events)
- Test: `src/__tests__/lib/dashboard/format.test.ts`, `src/__tests__/lib/dashboard/thisMonth.test.ts`, `src/__tests__/lib/analyticsV2Events.test.ts`

**Interfaces:**
- Consumes:
  - From `@/lib/dashboard/types`: `DashboardInsights`, `PlanReadiness`, `ReadinessStep`, `ReadinessStepId`, `MonthlyInterest`, `PlanSummary`, `RateWatch`, `PaymentGap`, `CoachMove`
  - `firstIncompleteStep` from `./readiness`
  - `computeThisMonthPaidProgress` from `./progress`
  - `coachMoveCopy` and `CoachMoveCopy` from `./coachMoveCopy`
  - `isActiveDebt` from `@/lib/monthlyFocusDebt`
  - `formatCurrencyWhole` and `formatMonths` from `@/lib/utils`
- Produces (later tasks use these exact names):
  - `format.ts`: `floorDollars(n: number): number`, `floorWhole(n: number): string`, `shortMonthLabel(month0: number): string`, `longMonthLabel(month0: number): string`, `monthYearLabel(ymd: string): string | null`
  - `thisMonth.ts` readiness:
    - `interface ReadinessChip { id: ReadinessStepId; label: string; complete: boolean }`
    - `interface ReadinessView { title: string; counter: string; percent: number; chips: ReadinessChip[]; cta: { step: ReadinessStepId; label: string } }`
    - `readinessCtaLabel(step: ReadinessStep): string`
    - `readinessView(readiness: PlanReadiness): ReadinessView | null`
    - `type ReadinessTarget = { kind: 'tab'; tab: 'debts' | 'income' } | { kind: 'dueDatesSheet' } | { kind: 'firstPaymentSheet' }`
    - `readinessTarget(step: ReadinessStep): ReadinessTarget`
  - `thisMonth.ts` cards:
    - `interface InterestView { figure: string; avgLine: string | null; lenderShare: number | null }`, `interestView(interest: MonthlyInterest | null): InterestView | null`
    - `interface HeroView { dateLabel: string; toGo: string; paidPct: number }`, `heroView(plan: PlanSummary | null, debts: ReadonlyArray<Pick<Debt, 'balance' | 'originalBalance'>>): HeroView | null`
    - `interface RateWatchView { eyebrow: string; figure: string; caption: string }`, `rateWatchView(rateWatch: RateWatch | null): RateWatchView | null`
  - `thisMonth.ts` free move:
    - `type FreeMoveAction = 'bulk_log' | 'switch_strategy' | 'open_plan'`
    - `interface FreeMoveView { move: CoachMove; eyebrow: string; priority: 'High' | 'Medium'; copy: CoachMoveCopy; cta: { action: FreeMoveAction; label: string } | null; moreCount: number }`
    - `freeMoveCta(move: CoachMove): FreeMoveView['cta']`
    - `freeMoveView(insights: Pick<DashboardInsights, 'tier' | 'coachMoves' | 'asOf'>): FreeMoveView | null`
  - `thisMonth.ts` sheet rows:
    - `interface LogRow { debtId: string; name: string; amount: number }`
    - `missedPaymentRows(gap: PaymentGap | null, debts: ReadonlyArray<Pick<Debt, 'id' | 'name'>>): LogRow[]`
    - `activeDebtRows(debts: ReadonlyArray<Pick<Debt, 'id' | 'name' | 'balance' | 'minimumPayment'>>): LogRow[]`
    - `debtsMissingDueDate<T extends Pick<Debt, 'balance' | 'dueDate'>>(debts: ReadonlyArray<T>): T[]`
  - `Events.READINESS_CTA = 'readiness_cta'`, `Events.COACH_MOVE_CTA = 'coach_move_cta'`, `Events.BULK_LOG_SUBMITTED = 'bulk_log_submitted'`

- [ ] **Step 1: Write the failing format test** at `src/__tests__/lib/dashboard/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { floorDollars, floorWhole, longMonthLabel, monthYearLabel, shortMonthLabel } from '@/lib/dashboard/format';

describe('floorWhole', () => {
  it('floors to whole dollars and never rounds up', () => {
    expect(floorWhole(840.99)).toBe('$840');
    expect(floorWhole(1656.9)).toBe('$1,656');
  });

  it('absorbs float error just under a whole number', () => {
    expect(floorWhole(74.99999999999)).toBe('$75');
    expect(floorDollars(0.99)).toBe(0);
  });
});

describe('month labels', () => {
  it('names months from a 0-11 index', () => {
    expect(shortMonthLabel(8)).toBe('Sep');
    expect(longMonthLabel(0)).toBe('January');
  });

  it('reads "Month YYYY" from a YYYY-MM-DD date without a time zone', () => {
    expect(monthYearLabel('2029-04-14')).toBe('April 2029');
    expect(monthYearLabel('2029-12-31')).toBe('December 2029');
  });

  it('returns null for anything that is not a calendar month', () => {
    expect(monthYearLabel('2029-13-01')).toBeNull();
    expect(monthYearLabel('2029-00-10')).toBeNull();
    expect(monthYearLabel('April 2029')).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails.**
Run: `npx vitest run src/__tests__/lib/dashboard/format.test.ts`
Expected: FAIL, because `@/lib/dashboard/format` can't be resolved.

- [ ] **Step 3: Create `src/lib/dashboard/format.ts`:**

```ts
import { formatCurrencyWhole } from '@/lib/utils';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Whole dollars, floored: estimates are never rounded up (spec §4). The tiny
 * epsilon guards against float error in unrounded sums landing just under a
 * whole number (75.75 - 0.00000000001 must still floor to 75, not 74).
 */
export function floorDollars(n: number): number {
  return Math.floor(n + 1e-9);
}

export function floorWhole(n: number): string {
  return formatCurrencyWhole(floorDollars(n));
}

/** month: 0-11. */
export function shortMonthLabel(month: number): string {
  return MONTH_SHORT[month] ?? '';
}

/** month: 0-11. */
export function longMonthLabel(month: number): string {
  return MONTH_LONG[month] ?? '';
}

/**
 * "2029-04-14" → "April 2029". Read from the string's own parts, so no time
 * zone can move the month (a Date built from it would read as UTC midnight).
 */
export function monthYearLabel(ymd: string): string | null {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(ymd);
  if (!match) return null;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return `${MONTH_LONG[month - 1]} ${match[1]}`;
}
```

- [ ] **Step 4: Point `coachMoveCopy.ts` at it.** Change nothing else.
  - Delete the `floorWhole` const and its comment (lines 11-17).
  - Change line 1 to `import { formatCurrency, formatMonths } from '@/lib/utils';`.
  - Add `import { floorWhole } from './format';`.

- [ ] **Step 5: Run the format tests and the existing copy tests.**
Run: `npx vitest run src/__tests__/lib/dashboard/format.test.ts src/__tests__/lib/dashboard/coachMoveCopy.test.ts`
Expected: PASS. The copy tests prove the move is behavior-identical.

- [ ] **Step 6: Write the failing view-model test** at `src/__tests__/lib/dashboard/thisMonth.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { computePlanReadiness } from '@/lib/dashboard/readiness';
import { coachMoveCopy } from '@/lib/dashboard/coachMoveCopy';
import type { DashboardInsights, PlanReadiness, PlanSummary, RateWatch } from '@/lib/dashboard/types';
import {
  activeDebtRows, debtsMissingDueDate, freeMoveView, heroView, interestView,
  missedPaymentRows, rateWatchView, readinessCtaLabel, readinessTarget, readinessView,
} from '@/lib/dashboard/thisMonth';
import {
  makeCallAprMove, makeDebt, makeLogMissedMove, makeSwitchMove, makeUnallocatedMove,
} from './fixtures';

const INCOME = { monthlyTakeHome: 4_000, essentialExpenses: 2_000 };

function readinessFor(debts: ReturnType<typeof makeDebt>[], hasAnyPayment = false): PlanReadiness {
  return computePlanReadiness({ debts, income: INCOME, recurringExpenseCount: 0, hasAnyPayment });
}

describe('readinessView', () => {
  it('opens at the real progress and targets the first unfinished step', () => {
    const debts = [
      makeDebt({ id: 'a', balance: 500, minimumPayment: 25 }),
      makeDebt({ id: 'b', balance: 900, minimumPayment: 30, dueDate: 12 }),
      makeDebt({ id: 'c', balance: 300, minimumPayment: 20 }),
    ];
    const view = readinessView(readinessFor(debts));
    expect(view).toEqual({
      title: 'Your plan is 60% set up',
      counter: '3 of 5',
      percent: 60,
      chips: [
        { id: 'debts', label: 'Debts', complete: true },
        { id: 'income', label: 'Income', complete: true },
        { id: 'expenses', label: 'Expenses', complete: true },
        { id: 'dueDates', label: 'Due dates', complete: false },
        { id: 'firstPayment', label: 'First payment', complete: false },
      ],
      cta: { step: 'dueDates', label: 'Add 2 due dates' },
    });
  });

  it('disappears at 5 of 5', () => {
    const debts = [makeDebt({ id: 'a', balance: 500, minimumPayment: 25, dueDate: 3 })];
    expect(readinessView(readinessFor(debts, true))).toBeNull();
  });

  it('hides a step that has nothing to do yet (due dates before any debt)', () => {
    const view = readinessView(readinessFor([]));
    expect(view?.chips.map((c) => c.id)).toEqual(['debts', 'income', 'expenses', 'firstPayment']);
    expect(view?.cta).toEqual({ step: 'debts', label: 'Add your debts' });
  });
});

describe('readinessCtaLabel', () => {
  it('names each step, counting due dates', () => {
    expect(readinessCtaLabel({ id: 'debts', complete: false, pendingCount: 1 })).toBe('Add your debts');
    expect(readinessCtaLabel({ id: 'income', complete: false, pendingCount: 1 })).toBe('Add your income');
    expect(readinessCtaLabel({ id: 'expenses', complete: false, pendingCount: 1 })).toBe('Add your expenses');
    expect(readinessCtaLabel({ id: 'dueDates', complete: false, pendingCount: 1 })).toBe('Add 1 due date');
    expect(readinessCtaLabel({ id: 'dueDates', complete: false, pendingCount: 7 })).toBe('Add 7 due dates');
    expect(readinessCtaLabel({ id: 'firstPayment', complete: false, pendingCount: 1 })).toBe('Log your first payment');
  });
});

describe('readinessTarget', () => {
  it('opens the flow for an unfinished step and the step’s home once done', () => {
    expect(readinessTarget({ id: 'debts', complete: false, pendingCount: 1 })).toEqual({ kind: 'tab', tab: 'debts' });
    expect(readinessTarget({ id: 'income', complete: true, pendingCount: 0 })).toEqual({ kind: 'tab', tab: 'income' });
    expect(readinessTarget({ id: 'expenses', complete: false, pendingCount: 1 })).toEqual({ kind: 'tab', tab: 'income' });
    expect(readinessTarget({ id: 'dueDates', complete: false, pendingCount: 2 })).toEqual({ kind: 'dueDatesSheet' });
    expect(readinessTarget({ id: 'dueDates', complete: true, pendingCount: 0 })).toEqual({ kind: 'tab', tab: 'debts' });
    expect(readinessTarget({ id: 'firstPayment', complete: false, pendingCount: 1 })).toEqual({ kind: 'firstPaymentSheet' });
    expect(readinessTarget({ id: 'firstPayment', complete: true, pendingCount: 0 })).toEqual({ kind: 'tab', tab: 'debts' });
  });
});

describe('interestView', () => {
  it('floors the estimate and the average, and splits the bar between them', () => {
    const view = interestView({ monthlyEstimate: 840.36, avgMonthlySavedByPlan: 278.3 });
    expect(view).toEqual({
      figure: '$840',
      avgLine: '≈$278/mo your plan saves vs minimums (avg)',
      lenderShare: (840 / (840 + 278)) * 100,
    });
  });

  it('drops the bar and the average when there is no real average', () => {
    expect(interestView({ monthlyEstimate: 50, avgMonthlySavedByPlan: null })).toEqual({ figure: '$50', avgLine: null, lenderShare: null });
    expect(interestView({ monthlyEstimate: 50, avgMonthlySavedByPlan: 0.4 })).toEqual({ figure: '$50', avgLine: null, lenderShare: null });
  });

  it('hides the card under $1 or without a figure', () => {
    expect(interestView(null)).toBeNull();
    expect(interestView({ monthlyEstimate: 0.99, avgMonthlySavedByPlan: 10 })).toBeNull();
    expect(interestView({ monthlyEstimate: Number.NaN, avgMonthlySavedByPlan: 10 })).toBeNull();
  });
});

describe('heroView', () => {
  const plan: PlanSummary = { method: 'snowball', months: 31, debtFreeDate: '2029-04-14', totalInterest: 5_000 };

  it("shows the plan's date, the time to go and v1's paid-off share", () => {
    const debts = [
      makeDebt({ id: 'a', balance: 900, originalBalance: 1_000, minimumPayment: 10 }),
      makeDebt({ id: 'b', balance: 1_000, originalBalance: 1_000, minimumPayment: 10 }),
    ];
    expect(heroView(plan, debts)).toEqual({ dateLabel: 'April 2029', toGo: '2y 7m to go', paidPct: 5 });
  });

  it('reads 0% when no debt records a starting balance', () => {
    expect(heroView(plan, [])?.paidPct).toBe(0);
  });

  it('hides without a plan, at 0 months, or with an unreadable date', () => {
    expect(heroView(null, [])).toBeNull();
    expect(heroView({ ...plan, months: 0 }, [])).toBeNull();
    expect(heroView({ ...plan, debtFreeDate: 'soon' }, [])).toBeNull();
  });
});

describe('rateWatchView', () => {
  const card = { debtId: 'c1', debtName: 'Citi', apr: 28, targetApr: 19.6, annualEstimate: 742.9 };
  const watch = (cards: number, annualEstimate: number): RateWatch => ({ cards, annualEstimate, top: card, moveTarget: card });

  it('states the floored yearly estimate as an estimate', () => {
    expect(rateWatchView(watch(3, 1656.9))).toEqual({
      eyebrow: 'Rate watch · 3 cards',
      figure: '$1,656/yr',
      caption: 'est. if your cards drop to their target rates',
    });
    expect(rateWatchView(watch(1, 742.9))).toEqual({
      eyebrow: 'Rate watch · 1 card',
      figure: '$742/yr',
      caption: 'est. if this card drops to its target rate',
    });
  });

  it('hides without cards or under $1', () => {
    expect(rateWatchView(null)).toBeNull();
    expect(rateWatchView(watch(2, 0.99))).toBeNull();
  });
});

describe('freeMoveView', () => {
  const FREE = { proEligible: false, paidPro: false, trial: { active: false, endsAt: null } };
  const insights = (coachMoves: DashboardInsights['coachMoves'], tier = FREE) =>
    ({ tier, coachMoves, asOf: { year: 2026, month: 8, day: 14 } });

  it('gives Free users the first move in full and counts the gated rest', () => {
    const move = makeLogMissedMove('Sep', 6);
    const view = freeMoveView(insights([move, makeSwitchMove('avalanche', 1030), makeCallAprMove('c1', 742)]));
    expect(view).toEqual({
      move,
      eyebrow: 'Your free move · Sep',
      priority: 'High',
      copy: coachMoveCopy(move),
      cta: { action: 'bulk_log', label: 'Log them now' },
      moreCount: 2,
    });
  });

  it('picks a CTA per move', () => {
    expect(freeMoveView(insights([makeLogMissedMove('Sep', 1)]))?.cta).toEqual({ action: 'bulk_log', label: 'Log it now' });
    expect(freeMoveView(insights([makeSwitchMove('avalanche', 90, true)]))?.cta).toEqual({ action: 'switch_strategy', label: 'Switch to Avalanche' });
    expect(freeMoveView(insights([makeUnallocatedMove(3, true)]))?.cta).toEqual({ action: 'open_plan', label: 'Open My Plan' });
    expect(freeMoveView(insights([makeCallAprMove('c1', 742, true)]))?.cta).toBeNull();
    expect(freeMoveView(insights([makeSwitchMove('snowball', 90, true)]))?.priority).toBe('Medium');
  });

  it('is null for Pro and trial users, and when the coach found nothing', () => {
    const pro = { ...FREE, proEligible: true };
    expect(freeMoveView(insights([makeLogMissedMove('Sep', 2)], pro))).toBeNull();
    expect(freeMoveView(insights([]))).toBeNull();
    expect(freeMoveView(insights([makeSwitchMove('avalanche', 90, false)]))).toBeNull();
  });
});

describe('sheet rows', () => {
  const debts = [
    makeDebt({ id: 'a', name: 'Visa', balance: 500, minimumPayment: 25 }),
    makeDebt({ id: 'b', name: 'Car', balance: 9_000, minimumPayment: 310, dueDate: 5 }),
    makeDebt({ id: 'paid', name: 'Old card', balance: 0, minimumPayment: 15 }),
  ];

  it('pre-fills missed payments at their minimums, by name', () => {
    const gap = { expected: 2, logged: 0, missed: [{ debtId: 'b', minimumPayment: 310 }, { debtId: 'gone', minimumPayment: 5 }], missedMinimums: 315, notYetDue: 1 };
    expect(missedPaymentRows(gap, debts)).toEqual([{ debtId: 'b', name: 'Car', amount: 310 }]);
    expect(missedPaymentRows(null, debts)).toEqual([]);
  });

  it('lists every active debt for the first payment', () => {
    expect(activeDebtRows(debts)).toEqual([
      { debtId: 'a', name: 'Visa', amount: 25 },
      { debtId: 'b', name: 'Car', amount: 310 },
    ]);
  });

  it('finds exactly the debts readiness counts as missing a due date', () => {
    const missing = debtsMissingDueDate(debts);
    expect(missing.map((d) => d.id)).toEqual(['a']);
    const step = readinessFor(debts).steps.find((s) => s.id === 'dueDates');
    expect(missing).toHaveLength(step?.pendingCount ?? -1);
  });
});
```

- [ ] **Step 7: Run it to verify it fails.**
Run: `npx vitest run src/__tests__/lib/dashboard/thisMonth.test.ts`
Expected: FAIL, because `@/lib/dashboard/thisMonth` can't be resolved.

- [ ] **Step 8: Create `src/lib/dashboard/thisMonth.ts`:**

```ts
import type { Debt } from '@/types';
import { isActiveDebt } from '@/lib/monthlyFocusDebt';
import { formatCurrencyWhole, formatMonths } from '@/lib/utils';
import { coachMoveCopy, type CoachMoveCopy } from './coachMoveCopy';
import { floorDollars, floorWhole, monthYearLabel, shortMonthLabel } from './format';
import { computeThisMonthPaidProgress } from './progress';
import { firstIncompleteStep } from './readiness';
import type {
  CoachMove, DashboardInsights, MonthlyInterest, PaymentGap, PlanReadiness,
  PlanSummary, RateWatch, ReadinessStep, ReadinessStepId,
} from './types';

// ── Readiness (spec §8.4 "Readiness") ─────────────────────────────────────

const STEP_LABELS: Record<ReadinessStepId, string> = {
  debts: 'Debts',
  income: 'Income',
  expenses: 'Expenses',
  dueDates: 'Due dates',
  firstPayment: 'First payment',
};

export interface ReadinessChip { id: ReadinessStepId; label: string; complete: boolean }
export interface ReadinessView {
  title: string;
  counter: string;
  percent: number;
  chips: ReadinessChip[];
  cta: { step: ReadinessStepId; label: string };
}

export function readinessCtaLabel(step: ReadinessStep): string {
  switch (step.id) {
    case 'debts': return 'Add your debts';
    case 'income': return 'Add your income';
    case 'expenses': return 'Add your expenses';
    case 'dueDates': return step.pendingCount === 1 ? 'Add 1 due date' : `Add ${step.pendingCount} due dates`;
    case 'firstPayment': return 'Log your first payment';
  }
}

/** Null at 5 of 5: the card disappears (spec §8.5). */
export function readinessView(readiness: PlanReadiness): ReadinessView | null {
  const next = firstIncompleteStep(readiness);
  if (!next) return null;
  return {
    title: `Your plan is ${readiness.percent}% set up`,
    counter: `${readiness.completeCount} of ${readiness.steps.length}`,
    percent: readiness.percent,
    // An unfinished step with nothing to count (due dates before any debt
    // exists) has no action of its own yet, so its chip stays hidden.
    chips: readiness.steps
      .filter((s) => s.complete || s.pendingCount > 0)
      .map((s) => ({ id: s.id, label: STEP_LABELS[s.id], complete: s.complete })),
    cta: { step: next.id, label: readinessCtaLabel(next) },
  };
}

export type ReadinessTarget =
  | { kind: 'tab'; tab: 'debts' | 'income' }
  | { kind: 'dueDatesSheet' }
  | { kind: 'firstPaymentSheet' };

/** Where a readiness chip or CTA leads: the step's flow while unfinished, its home once done. */
export function readinessTarget(step: ReadinessStep): ReadinessTarget {
  switch (step.id) {
    case 'debts': return { kind: 'tab', tab: 'debts' };
    case 'income':
    case 'expenses': return { kind: 'tab', tab: 'income' };
    case 'dueDates': return step.complete ? { kind: 'tab', tab: 'debts' } : { kind: 'dueDatesSheet' };
    case 'firstPayment': return step.complete ? { kind: 'tab', tab: 'debts' } : { kind: 'firstPaymentSheet' };
  }
}

// ── Interest (D3, X1, X2) ─────────────────────────────────────────────────

export interface InterestView {
  figure: string;
  avgLine: string | null;
  /** Red share of the bar, 0-100. Null: no bar (no real average to compare with). */
  lenderShare: number | null;
}

/** Null (card hides) unless this month's estimate floors to at least $1. */
export function interestView(interest: MonthlyInterest | null): InterestView | null {
  if (!interest || !Number.isFinite(interest.monthlyEstimate)) return null;
  const monthly = floorDollars(interest.monthlyEstimate);
  if (monthly < 1) return null;
  const figure = formatCurrencyWhole(monthly);
  const rawAvg = interest.avgMonthlySavedByPlan;
  const avg = rawAvg != null && Number.isFinite(rawAvg) ? floorDollars(rawAvg) : 0;
  if (avg < 1) return { figure, avgLine: null, lenderShare: null };
  return {
    figure,
    avgLine: `≈${formatCurrencyWhole(avg)}/mo your plan saves vs minimums (avg)`,
    lenderShare: (monthly / (monthly + avg)) * 100,
  };
}

// ── Debt-free hero (spec §8.4 "Hero") ──────────────────────────────────────

export interface HeroView { dateLabel: string; toGo: string; paidPct: number }

/**
 * Null without a plan (none, or capped at 360 months: hide, don't fake).
 * paidPct is v1 This Month's gauge exactly (DebtFreeCountdownHero): principal
 * paid across all debts over their starting total, clamped to 0-100.
 */
export function heroView(
  plan: PlanSummary | null,
  debts: ReadonlyArray<Pick<Debt, 'balance' | 'originalBalance'>>,
): HeroView | null {
  if (!plan || plan.months <= 0) return null;
  const dateLabel = monthYearLabel(plan.debtFreeDate);
  if (!dateLabel) return null;
  const { totalPaid, totalOriginal } = computeThisMonthPaidProgress(debts);
  const paidPct = totalOriginal > 0 ? Math.min(100, Math.max(0, (totalPaid / totalOriginal) * 100)) : 0;
  return { dateLabel, toGo: `${formatMonths(plan.months)} to go`, paidPct };
}

// ── Rate watch (X10) ──────────────────────────────────────────────────────

export interface RateWatchView { eyebrow: string; figure: string; caption: string }

export function rateWatchView(rateWatch: RateWatch | null): RateWatchView | null {
  if (!rateWatch || floorDollars(rateWatch.annualEstimate) < 1) return null;
  const one = rateWatch.cards === 1;
  return {
    eyebrow: `Rate watch · ${rateWatch.cards} ${one ? 'card' : 'cards'}`,
    figure: `${floorWhole(rateWatch.annualEstimate)}/yr`,
    caption: one ? 'est. if this card drops to its target rate' : 'est. if your cards drop to their target rates',
  };
}

// ── The free move (README §1d) ─────────────────────────────────────────────

export type FreeMoveAction = 'bulk_log' | 'switch_strategy' | 'open_plan';
export interface FreeMoveView {
  move: CoachMove;
  eyebrow: string;
  priority: 'High' | 'Medium';
  copy: CoachMoveCopy;
  cta: { action: FreeMoveAction; label: string } | null;
  /** Gated moves behind the free one. 0: no "more moves" row. */
  moreCount: number;
}

const METHOD_LABEL = { snowball: 'Snowball', avalanche: 'Avalanche' } as const;

export function freeMoveCta(move: CoachMove): FreeMoveView['cta'] {
  switch (move.id) {
    case 'log_missed':
      return { action: 'bulk_log', label: move.facts.missedCount === 1 ? 'Log it now' : 'Log them now' };
    case 'switch_strategy':
      return { action: 'switch_strategy', label: `Switch to ${METHOD_LABEL[move.facts.alternative]}` };
    case 'use_unallocated':
      return { action: 'open_plan', label: 'Open My Plan' };
    case 'call_apr':
      // The APR call script is Pro today (IntelligenceTab); the move's own
      // copy is the action. PR 5 (Coach) decides whether Free gets the script.
      return null;
  }
}

/** Free users only. Pro and trial users get the AI brief in this slot. */
export function freeMoveView(insights: Pick<DashboardInsights, 'tier' | 'coachMoves' | 'asOf'>): FreeMoveView | null {
  if (insights.tier.proEligible) return null;
  const [move, ...rest] = insights.coachMoves;
  if (!move || !move.isFree) return null;
  return {
    move,
    eyebrow: `Your free move · ${shortMonthLabel(insights.asOf.month)}`,
    priority: move.priority === 'high' ? 'High' : 'Medium',
    copy: coachMoveCopy(move),
    cta: freeMoveCta(move),
    moreCount: rest.filter((m) => !m.isFree).length,
  };
}

// ── Sheet rows ─────────────────────────────────────────────────────────────

export interface LogRow { debtId: string; name: string; amount: number }

/** The month's missed payments at their minimums (spec §8.3 BulkLogSheet). */
export function missedPaymentRows(
  gap: PaymentGap | null,
  debts: ReadonlyArray<Pick<Debt, 'id' | 'name'>>,
): LogRow[] {
  if (!gap) return [];
  const names = new Map(debts.map((d) => [d.id, d.name]));
  return gap.missed.flatMap((m) => {
    const name = names.get(m.debtId);
    return name === undefined ? [] : [{ debtId: m.debtId, name, amount: m.minimumPayment }];
  });
}

/** "Log your first payment": every active debt at its minimum. */
export function activeDebtRows(
  debts: ReadonlyArray<Pick<Debt, 'id' | 'name' | 'balance' | 'minimumPayment'>>,
): LogRow[] {
  return debts.filter(isActiveDebt).map((d) => ({ debtId: d.id, name: d.name, amount: d.minimumPayment }));
}

/** Active debts without a due day: the ones readiness counts (readiness.ts). */
export function debtsMissingDueDate<T extends Pick<Debt, 'balance' | 'dueDate'>>(debts: ReadonlyArray<T>): T[] {
  return debts.filter((d) => isActiveDebt(d) && d.dueDate == null);
}
```

- [ ] **Step 9: Run it.**
Run: `npx vitest run src/__tests__/lib/dashboard/thisMonth.test.ts`
Expected: PASS.

- [ ] **Step 10: Write the failing analytics test** at `src/__tests__/lib/analyticsV2Events.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { Events } from '@/lib/analyticsEvents';
import { sanitiseAnalyticsProperties } from '@/lib/analyticsPrivacy';

describe('dashboard v2 This Month events (spec §9)', () => {
  it('defines the three events', () => {
    expect(Events.READINESS_CTA).toBe('readiness_cta');
    expect(Events.COACH_MOVE_CTA).toBe('coach_move_cta');
    expect(Events.BULK_LOG_SUBMITTED).toBe('bulk_log_submitted');
  });

  it('sends their properties through the privacy sanitiser untouched', () => {
    const props = { step: 'dueDates', move: 'log_missed', gated: false, debt_count: 3 };
    expect(sanitiseAnalyticsProperties(props)).toEqual(props);
  });
});
```

- [ ] **Step 11: Run it to verify it fails.**
Run: `npx vitest run src/__tests__/lib/analyticsV2Events.test.ts`
Expected: FAIL. `Events.READINESS_CTA` is undefined. The sanitiser case already passes, which confirms the chosen keys.

- [ ] **Step 12: Add the events** to `src/lib/analyticsEvents.ts`, after `BANK_LINK_EXITED`:

```ts
  // Dashboard v2 This Month (spec §9). Only strings, booleans and debt_count:
  // the sanitiser redacts any other number.
  READINESS_CTA: 'readiness_cta',
  COACH_MOVE_CTA: 'coach_move_cta',
  BULK_LOG_SUBMITTED: 'bulk_log_submitted',
```

- [ ] **Step 13: Run the task's tests, then the full suite.**
Run: `npx vitest run src/__tests__/lib/dashboard src/__tests__/lib/analyticsV2Events.test.ts`, then `npm test`
Expected: all PASS.

- [ ] **Step 14: Commit.**

```bash
git add src/lib/dashboard/format.ts src/lib/dashboard/thisMonth.ts src/lib/dashboard/coachMoveCopy.ts src/lib/analyticsEvents.ts src/__tests__/lib/dashboard/format.test.ts src/__tests__/lib/dashboard/thisMonth.test.ts src/__tests__/lib/analyticsV2Events.test.ts
git commit -m "feat(dashboard-v2): This Month view models and analytics events" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Sheet primitive, shared styles and `DueDatesSheet`

**Files:**
- Create: `src/components/dashboard-v2/styles.ts`, `src/components/dashboard-v2/sheets/Sheet.tsx`, `src/components/dashboard-v2/sheets/DueDatesSheet.tsx`
- Test: `src/__tests__/components/dashboard-v2/Sheet.test.ts`, `src/__tests__/components/dashboard-v2/DueDatesSheet.test.ts`

**Interfaces:**
- Consumes:
  - `useUpdateDebt()` (`mutateAsync({ id, updates })`) and `getErrorMessage(error, fallback)` from `@/lib/hooks`
  - `getOrdinalDay(day): string` ("15th") from `@/lib/utils`
- Produces:
  - `styles.ts`: `EYEBROW`, `CARD`, `CTA_BLUE`, `ERROR_LINE` (class strings)
  - `Sheet` (default export), props `{ title: string; description?: string; busy?: boolean; onClose: () => void; children: ReactNode; footer: ReactNode }`
  - `DueDatesSheet` (default export), props `{ debts: ReadonlyArray<Pick<Debt, 'id' | 'name'>>; onClose: () => void }`, plus `saveDueDatesLabel(n: number): string`

- [ ] **Step 1: Create `src/components/dashboard-v2/styles.ts`.** These are the class strings shared by the sheets and the This Month cards:

```ts
/** 10px/700 tracked uppercase label. Add a color utility: `.eyebrow` hardcodes its own color. */
export const EYEBROW = "text-[10px] font-bold uppercase tracking-[0.08em]";

/** White card at the 12px card radius (DESIGN.md). */
export const CARD = "rounded-xl border border-border bg-surface shadow-card";

/** Blue primary CTA: 46px tall, 8px radius, the CTA glow. */
export const CTA_BLUE =
  "flex min-h-[46px] w-full items-center justify-center rounded-lg bg-action px-4 text-[14px] font-extrabold text-white shadow-cta-blue outline-none hover:bg-action/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action disabled:cursor-not-allowed disabled:opacity-60";

/** Error line: dark text marked by a danger rule (danger-colored text is under 4.5:1 at this size). */
export const ERROR_LINE = "border-l-2 border-danger pl-2 text-[13px] font-semibold text-txt";
```

- [ ] **Step 2: Write the failing Sheet test** at `src/__tests__/components/dashboard-v2/Sheet.test.ts`:

```ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Sheet, { type SheetProps } from '@/components/dashboard-v2/sheets/Sheet';

function renderSheet(overrides: Partial<SheetProps> = {}) {
  const onClose = vi.fn();
  const props: SheetProps = {
    title: 'Add due dates',
    description: 'Pick a day.',
    onClose,
    footer: createElement('button', { type: 'button' }, 'Save'),
    children: createElement('input', { 'aria-label': 'Day' }),
    ...overrides,
  };
  const view = render(createElement(Sheet, props));
  const rerender = (next: Partial<SheetProps>) => view.rerender(createElement(Sheet, { ...props, ...next }));
  return { ...view, onClose, rerender };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Sheet', () => {
  it('renders a labelled, described modal dialog portaled to <body>', () => {
    renderSheet();
    const dialog = screen.getByRole('dialog', { name: 'Add due dates' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    const describedBy = dialog.getAttribute('aria-describedby') ?? '';
    expect(document.getElementById(describedBy)?.textContent).toBe('Pick a day.');
    expect(dialog.parentElement?.parentElement).toBe(document.body);
  });

  it('moves focus to the title and gives it back on close', () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    const { unmount } = renderSheet();
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Add due dates' }));
    unmount();
    expect(document.activeElement).toBe(opener);
  });

  it('closes on Escape, the close button and the backdrop, but not on a click inside', () => {
    const { onClose } = renderSheet();
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.mouseDown(dialog);
    expect(onClose).toHaveBeenCalledTimes(2);
    fireEvent.mouseDown(dialog.parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('ignores every close while busy', () => {
    const { onClose } = renderSheet({ busy: true });
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.mouseDown(screen.getByRole('dialog').parentElement as HTMLElement);
    expect((screen.getByRole('button', { name: 'Close' }) as HTMLButtonElement).disabled).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps Tab inside the dialog', () => {
    renderSheet();
    const close = screen.getByRole('button', { name: 'Close' });
    const save = screen.getByRole('button', { name: 'Save' });
    save.focus();
    fireEvent.keyDown(save, { key: 'Tab' });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(save);
  });
});
```

- [ ] **Step 3: Run it to verify it fails.**
Run: `npx vitest run src/__tests__/components/dashboard-v2/Sheet.test.ts`
Expected: FAIL, because the Sheet module can't be resolved.

- [ ] **Step 4: Create `src/components/dashboard-v2/sheets/Sheet.tsx`:**

```tsx
"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export interface SheetProps {
  title: string;
  description?: string;
  /** While true (a save is running), Escape, the backdrop and the close button do nothing. */
  busy?: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Pinned under the scrolling body: the primary action. */
  footer: ReactNode;
}

/**
 * Dashboard v2 sheet (spec §8.3): a bottom sheet on phones, a centered dialog
 * from 769px. Portaled to <body> because the tab wrapper's `.tab-fade-in`
 * keeps a transform, which would trap a fixed overlay inside the tab.
 */
export default function Sheet({ title, description, busy = false, onClose, children, footer }: SheetProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const busyRef = useRef(busy);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    busyRef.current = busy;
    onCloseRef.current = onClose;
  });

  const requestClose = () => {
    if (!busyRef.current) onCloseRef.current();
  };

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    headingRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!busyRef.current) onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === headingRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9000] flex items-end justify-center bg-txt/50 min-[769px]:items-center min-[769px]:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className="flex max-h-[85dvh] w-full flex-col rounded-t-xl bg-surface shadow-float min-[769px]:max-w-md min-[769px]:rounded-xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 pb-3 pt-4">
          <div className="min-w-0">
            <h2
              id={titleId}
              ref={headingRef}
              tabIndex={-1}
              className="text-[17px] font-extrabold tracking-[-0.02em] text-txt outline-none [text-wrap:pretty]"
            >
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-[13px] leading-relaxed text-txt-muted [text-wrap:pretty]">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={requestClose}
            disabled={busy}
            className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-txt-muted outline-none hover:bg-bg focus-visible:outline-2 focus-visible:outline-action disabled:opacity-50"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-2">{children}</div>
        <div className="shrink-0 border-t border-border px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 min-[769px]:pb-3">
          {footer}
        </div>
      </div>
    </div>,
    document.body,
  );
}
```

- [ ] **Step 5: Run the Sheet test.**
Run: `npx vitest run src/__tests__/components/dashboard-v2/Sheet.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Write the failing DueDatesSheet test** at `src/__tests__/components/dashboard-v2/DueDatesSheet.test.ts`:

```ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import DueDatesSheet from '@/components/dashboard-v2/sheets/DueDatesSheet';
import { useUpdateDebt } from '@/lib/hooks';

vi.mock('@/lib/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/hooks')>()),
  useUpdateDebt: vi.fn(),
}));

const DEBTS = [{ id: 'a', name: 'Visa' }, { id: 'b', name: 'Car loan' }];

function setup(mutateAsync = vi.fn().mockResolvedValue({})) {
  vi.mocked(useUpdateDebt).mockReturnValue({ mutateAsync } as unknown as ReturnType<typeof useUpdateDebt>);
  const onClose = vi.fn();
  render(createElement(DueDatesSheet, { debts: DEBTS, onClose }));
  return { mutateAsync, onClose };
}

const pick = (name: string, day: string) => fireEvent.change(screen.getByLabelText(name), { target: { value: day } });

afterEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '';
});

describe('DueDatesSheet', () => {
  it('offers a day picker per debt and waits for a choice', () => {
    setup();
    expect((screen.getByLabelText('Visa') as HTMLSelectElement).value).toBe('');
    expect(screen.getAllByRole('option', { name: '31st' })).toHaveLength(2);
    expect((screen.getByRole('button', { name: 'Save due dates' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('saves only the chosen days, then closes', async () => {
    const { mutateAsync, onClose } = setup();
    pick('Car loan', '15');
    fireEvent.click(screen.getByRole('button', { name: 'Save 1 due date' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mutateAsync.mock.calls).toEqual([[{ id: 'b', updates: { dueDate: 15 } }]]);
  });

  it('writes one debt at a time, in order', async () => {
    let release: () => void = () => {};
    const mutateAsync = vi.fn()
      .mockImplementationOnce(() => new Promise<void>((resolve) => { release = resolve; }))
      .mockResolvedValue({});
    const { onClose } = setup(mutateAsync);
    pick('Visa', '3');
    pick('Car loan', '20');
    fireEvent.click(screen.getByRole('button', { name: 'Save 2 due dates' }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeTruthy();
    await act(async () => { release(); });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mutateAsync.mock.calls.map(([arg]) => arg)).toEqual([
      { id: 'a', updates: { dueDate: 3 } },
      { id: 'b', updates: { dueDate: 20 } },
    ]);
  });

  it('stops at the first failure, drops what saved and names the debt', async () => {
    const mutateAsync = vi.fn().mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('offline'));
    const { onClose } = setup(mutateAsync);
    pick('Visa', '3');
    pick('Car loan', '20');
    fireEvent.click(screen.getByRole('button', { name: 'Save 2 due dates' }));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain("Car loan didn't save.");
    expect(screen.queryByLabelText('Visa')).toBeNull();
    expect((screen.getByLabelText('Car loan') as HTMLSelectElement).value).toBe('20');
    expect(onClose).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 7: Run it to verify it fails.**
Run: `npx vitest run src/__tests__/components/dashboard-v2/DueDatesSheet.test.ts`
Expected: FAIL, because the DueDatesSheet module can't be resolved.

- [ ] **Step 8: Create `src/components/dashboard-v2/sheets/DueDatesSheet.tsx`:**

```tsx
"use client";

import { useId, useState } from "react";
import type { Debt } from "@/types";
import { getErrorMessage, useUpdateDebt } from "@/lib/hooks";
import { getOrdinalDay } from "@/lib/utils";
import { CTA_BLUE, ERROR_LINE } from "../styles";
import Sheet from "./Sheet";

interface DueDatesSheetProps {
  /** Active debts without a due day (`debtsMissingDueDate`). */
  debts: ReadonlyArray<Pick<Debt, "id" | "name">>;
  onClose: () => void;
}

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export function saveDueDatesLabel(n: number): string {
  return n === 1 ? "Save 1 due date" : `Save ${n} due dates`;
}

/** Readiness "Add {n} due dates" (spec §8.3): a day per debt, saved with the existing PATCH. */
export default function DueDatesSheet({ debts, onClose }: DueDatesSheetProps) {
  const baseId = useId();
  const updateDebt = useUpdateDebt();
  const [days, setDays] = useState<Readonly<Record<string, number>>>({});
  const [savedIds, setSavedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rows = debts.filter((d) => !savedIds.has(d.id));
  const chosen = rows.filter((d) => days[d.id] !== undefined);

  const choose = (debtId: string, raw: string) => {
    setDays((prev) => {
      const rest = Object.fromEntries(Object.entries(prev).filter(([id]) => id !== debtId));
      return raw === "" ? rest : { ...rest, [debtId]: Number(raw) };
    });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    const saved = new Set(savedIds);
    for (const debt of chosen) {
      try {
        // One PATCH per debt, in order, through the existing hook.
        await updateDebt.mutateAsync({ id: debt.id, updates: { dueDate: days[debt.id] } });
        saved.add(debt.id);
      } catch (err) {
        setSavedIds(saved);
        setError(`${debt.name} didn't save. ${getErrorMessage(err, "Please try again.")}`);
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    onClose();
  };

  return (
    <Sheet
      title="Add due dates"
      description="Pick the day of the month each payment is due."
      busy={saving}
      onClose={onClose}
      footer={
        <>
          {error && <p role="alert" className={`mb-2 ${ERROR_LINE}`}>{error}</p>}
          <button type="button" onClick={save} disabled={saving || chosen.length === 0} className={CTA_BLUE}>
            {saving ? "Saving…" : chosen.length === 0 ? "Save due dates" : saveDueDatesLabel(chosen.length)}
          </button>
        </>
      }
    >
      <ul className="flex flex-col divide-y divide-border">
        {rows.map((debt) => {
          const id = `${baseId}-${debt.id}`;
          return (
            <li key={debt.id} className="flex min-h-11 items-center justify-between gap-3 py-2">
              <label htmlFor={id} className="min-w-0 flex-1 truncate text-[14px] font-semibold text-txt">
                {debt.name}
              </label>
              <select
                id={id}
                value={days[debt.id] ?? ""}
                disabled={saving}
                onChange={(event) => choose(debt.id, event.target.value)}
                className="min-h-11 w-28 shrink-0 rounded-lg border border-border bg-surface px-2 text-[14px] text-txt outline-none focus-visible:outline-2 focus-visible:outline-action"
              >
                <option value="">Day…</option>
                {DAYS.map((day) => (
                  <option key={day} value={day}>{getOrdinalDay(day)}</option>
                ))}
              </select>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
```

- [ ] **Step 9: Run both tests.**
Run: `npx vitest run src/__tests__/components/dashboard-v2/Sheet.test.ts src/__tests__/components/dashboard-v2/DueDatesSheet.test.ts`
Expected: PASS.

- [ ] **Step 10: Commit.**

```bash
git add src/components/dashboard-v2/styles.ts src/components/dashboard-v2/sheets/Sheet.tsx src/components/dashboard-v2/sheets/DueDatesSheet.tsx src/__tests__/components/dashboard-v2/Sheet.test.ts src/__tests__/components/dashboard-v2/DueDatesSheet.test.ts
git commit -m "feat(dashboard-v2): sheet primitive and due-dates sheet" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: `BulkLogSheet`

**Files:**
- Create: `src/components/dashboard-v2/sheets/BulkLogSheet.tsx`
- Test: `src/__tests__/components/dashboard-v2/BulkLogSheet.test.ts`

**Interfaces:**
- Consumes:
  - `Sheet` from Task 3
  - `CTA_BLUE` and `ERROR_LINE` from `../styles`
  - `LogRow` from `@/lib/dashboard/thisMonth` (Task 2)
  - `useMarkPaid()` (`mutateAsync({ debtId, amount, dueYear, dueMonth })`, mode omitted = `'mark'`) and `getErrorMessage` from `@/lib/hooks`
  - `track` and `Events.BULK_LOG_SUBMITTED` from `@/lib/analytics`
- Produces:
  - `BulkLogSheet` (default export), props `{ title: string; rows: ReadonlyArray<LogRow>; year: number; month: number; onClose: () => void }`, where `month` is 0-11
  - `logPaymentsLabel(n: number): string`
  - `parseAmount(raw: string): number | null`

- [ ] **Step 1: Write the failing test** at `src/__tests__/components/dashboard-v2/BulkLogSheet.test.ts`:

```ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import BulkLogSheet, { parseAmount } from '@/components/dashboard-v2/sheets/BulkLogSheet';
import { useMarkPaid } from '@/lib/hooks';
import { track } from '@/lib/analytics';

vi.mock('@/lib/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/hooks')>()),
  useMarkPaid: vi.fn(),
}));
vi.mock('@/lib/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/analytics')>()),
  track: vi.fn(),
}));

const ROWS = [
  { debtId: 'a', name: 'Visa', amount: 25 },
  { debtId: 'b', name: 'Car loan', amount: 310.5 },
];

function setup(mutateAsync = vi.fn().mockResolvedValue({})) {
  vi.mocked(useMarkPaid).mockReturnValue({ mutateAsync } as unknown as ReturnType<typeof useMarkPaid>);
  const onClose = vi.fn();
  render(createElement(BulkLogSheet, { title: 'Log Sep payments', rows: ROWS, year: 2026, month: 8, onClose }));
  return { mutateAsync, onClose };
}

const amount = (name: string) => screen.getByLabelText(`Amount for ${name}`) as HTMLInputElement;
const logButton = (name: string) => screen.getByRole('button', { name }) as HTMLButtonElement;

afterEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '';
});

describe('parseAmount', () => {
  it('accepts positive amounts, rounded to cents', () => {
    expect(parseAmount('25')).toBe(25);
    expect(parseAmount(' 310.555 ')).toBe(310.56);
  });

  it('rejects empty, zero, negative and non-numbers', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('0')).toBeNull();
    expect(parseAmount('-5')).toBeNull();
    expect(parseAmount('1,000')).toBeNull();
  });
});

describe('BulkLogSheet', () => {
  it('pre-fills each payment at its minimum, all checked', () => {
    setup();
    expect(screen.getByRole('dialog', { name: 'Log Sep payments' })).toBeTruthy();
    expect(amount('Visa').value).toBe('25.00');
    expect(amount('Car loan').value).toBe('310.50');
    expect((screen.getByLabelText('Visa') as HTMLInputElement).checked).toBe(true);
    expect(logButton('Log 2 payments').disabled).toBe(false);
  });

  it('logs the checked payments in order for the given month, then closes', async () => {
    const { mutateAsync, onClose } = setup();
    fireEvent.change(amount('Car loan'), { target: { value: '400' } });
    fireEvent.click(logButton('Log 2 payments'));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mutateAsync.mock.calls.map(([args]) => args)).toEqual([
      { debtId: 'a', amount: 25, dueYear: 2026, dueMonth: 8 },
      { debtId: 'b', amount: 400, dueYear: 2026, dueMonth: 8 },
    ]);
    expect(track).toHaveBeenCalledWith('bulk_log_submitted', { debt_count: 2 });
  });

  it('leaves an unchecked payment out', async () => {
    const { mutateAsync } = setup();
    fireEvent.click(screen.getByLabelText('Visa'));
    expect(amount('Visa').disabled).toBe(true);
    fireEvent.click(logButton('Log 1 payment'));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(mutateAsync.mock.calls[0][0]).toMatchObject({ debtId: 'b' });
  });

  it('blocks a checked payment without a positive amount', () => {
    setup();
    fireEvent.change(amount('Visa'), { target: { value: '0' } });
    expect(logButton('Log 2 payments').disabled).toBe(true);
    expect(screen.getByText('Each checked payment needs an amount above $0.')).toBeTruthy();
  });

  it('waits for each payment before starting the next', async () => {
    let release: () => void = () => {};
    const mutateAsync = vi.fn()
      .mockImplementationOnce(() => new Promise<void>((resolve) => { release = resolve; }))
      .mockResolvedValue({});
    const { onClose } = setup(mutateAsync);
    fireEvent.click(logButton('Log 2 payments'));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(logButton('Saving…').disabled).toBe(true);
    await act(async () => { release(); });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mutateAsync).toHaveBeenCalledTimes(2);
  });

  it('stops at the first failure, drops what logged and names the debt', async () => {
    const mutateAsync = vi.fn().mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('offline'));
    const { onClose } = setup(mutateAsync);
    fireEvent.click(logButton('Log 2 payments'));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain("Car loan didn't save.");
    expect(screen.queryByLabelText('Visa')).toBeNull();
    expect(logButton('Log 1 payment').disabled).toBe(false);
    expect(track).toHaveBeenCalledWith('bulk_log_submitted', { debt_count: 1 });
    expect(onClose).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it to verify it fails.**
Run: `npx vitest run src/__tests__/components/dashboard-v2/BulkLogSheet.test.ts`
Expected: FAIL, because the BulkLogSheet module can't be resolved.

- [ ] **Step 3: Create `src/components/dashboard-v2/sheets/BulkLogSheet.tsx`:**

```tsx
"use client";

import { useId, useState } from "react";
import { getErrorMessage, useMarkPaid } from "@/lib/hooks";
import { track, Events } from "@/lib/analytics";
import type { LogRow } from "@/lib/dashboard/thisMonth";
import { CTA_BLUE, ERROR_LINE } from "../styles";
import Sheet from "./Sheet";

interface BulkLogSheetProps {
  title: string;
  rows: ReadonlyArray<LogRow>;
  /** The month being logged: insights.asOf, the client's local today. month: 0-11. */
  year: number;
  month: number;
  onClose: () => void;
}

export function logPaymentsLabel(n: number): string {
  return n === 1 ? "Log 1 payment" : `Log ${n} payments`;
}

/** A typed dollar amount, rounded to cents, or null unless it is a positive number. */
export function parseAmount(raw: string): number | null {
  const value = Number(raw.trim());
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100) / 100;
}

/**
 * "Log them now" / "Log your first payment" (spec §8.3): the payments
 * pre-filled at their minimums, each logged through the existing useMarkPaid,
 * one at a time, so balances, snapshots and celebrations behave exactly as a
 * single log does.
 */
export default function BulkLogSheet({ title, rows, year, month, onClose }: BulkLogSheetProps) {
  const baseId = useId();
  const markPaid = useMarkPaid();
  const [amounts, setAmounts] = useState<Readonly<Record<string, string>>>({});
  const [unchecked, setUnchecked] = useState<ReadonlySet<string>>(() => new Set());
  const [loggedIds, setLoggedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountText = (row: LogRow) => amounts[row.debtId] ?? row.amount.toFixed(2);
  const pending = rows.filter((r) => !loggedIds.has(r.debtId));
  const selected = pending.filter((r) => !unchecked.has(r.debtId));
  const invalid = selected.some((r) => parseAmount(amountText(r)) === null);

  const toggle = (debtId: string) => {
    setUnchecked((prev) => {
      const next = new Set(prev);
      if (next.has(debtId)) next.delete(debtId);
      else next.add(debtId);
      return next;
    });
  };

  const submit = async () => {
    setSaving(true);
    setError(null);
    const logged = new Set(loggedIds);
    let count = 0;
    for (const row of selected) {
      const amount = parseAmount(amountText(row));
      if (amount === null) continue; // unreachable: `invalid` disables the button
      try {
        await markPaid.mutateAsync({ debtId: row.debtId, amount, dueYear: year, dueMonth: month });
        logged.add(row.debtId);
        count += 1;
      } catch (err) {
        setLoggedIds(logged);
        if (count > 0) track(Events.BULK_LOG_SUBMITTED, { debt_count: count });
        setError(`${row.name} didn't save. ${getErrorMessage(err, "Please try again.")}`);
        setSaving(false);
        return;
      }
    }
    track(Events.BULK_LOG_SUBMITTED, { debt_count: count });
    setSaving(false);
    onClose();
  };

  return (
    <Sheet
      title={title}
      description="Pre-filled at each minimum. Change an amount if you paid a different one."
      busy={saving}
      onClose={onClose}
      footer={
        <>
          {invalid && !error && (
            <p className="mb-2 text-[13px] text-txt-muted">Each checked payment needs an amount above $0.</p>
          )}
          {error && <p role="alert" className={`mb-2 ${ERROR_LINE}`}>{error}</p>}
          <button
            type="button"
            onClick={submit}
            disabled={saving || selected.length === 0 || invalid}
            className={CTA_BLUE}
          >
            {saving ? "Saving…" : selected.length === 0 ? "Log payments" : logPaymentsLabel(selected.length)}
          </button>
        </>
      }
    >
      <ul className="flex flex-col divide-y divide-border">
        {pending.map((row) => {
          const checkboxId = `${baseId}-${row.debtId}`;
          const checked = !unchecked.has(row.debtId);
          return (
            <li key={row.debtId} className="flex min-h-11 items-center gap-3 py-1.5">
              <input
                id={checkboxId}
                type="checkbox"
                checked={checked}
                disabled={saving}
                onChange={() => toggle(row.debtId)}
                className="h-5 w-5 shrink-0 accent-action"
              />
              <label htmlFor={checkboxId} className="flex min-h-11 min-w-0 flex-1 items-center">
                <span className="truncate text-[14px] font-semibold text-txt">{row.name}</span>
              </label>
              <span className="flex shrink-0 items-center gap-1">
                <span aria-hidden="true" className="text-[14px] text-txt-muted">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  aria-label={`Amount for ${row.name}`}
                  value={amountText(row)}
                  disabled={saving || !checked}
                  onChange={(event) => setAmounts((prev) => ({ ...prev, [row.debtId]: event.target.value }))}
                  className="mono min-h-11 w-24 rounded-lg border border-border bg-surface px-2 text-right text-[14px] tabular-nums text-txt outline-none focus-visible:outline-2 focus-visible:outline-action disabled:opacity-50"
                />
              </span>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
```

- [ ] **Step 4: Run it.**
Run: `npx vitest run src/__tests__/components/dashboard-v2/BulkLogSheet.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add src/components/dashboard-v2/sheets/BulkLogSheet.tsx src/__tests__/components/dashboard-v2/BulkLogSheet.test.ts
git commit -m "feat(dashboard-v2): bulk payment-logging sheet" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: The four cards, meter motion and the `success-text` token

**Execute this task only if the owner approved decision 9.** If they chose the alternative, skip Steps 1–3. Everywhere below, `text-success-text` then becomes `text-txt`.

**Files:**
- Modify: `tailwind.config.ts:24` (add `success-text`), `src/__tests__/lib/designTokens.test.ts` (one test), `DESIGN.md` (Semantic Colors row and Design Decisions row)
- Create: `src/components/dashboard-v2/useMeterValue.ts`, and under `src/components/dashboard-v2/this-month/`: `ReadinessCard.tsx`, `InterestMeter.tsx`, `DebtFreeHero.tsx`, `RateWatchCard.tsx`
- Test: `src/__tests__/components/dashboard-v2/useMeterValue.test.ts`, `src/__tests__/components/dashboard-v2/thisMonthCards.test.ts`

**Interfaces:**
- Consumes:
  - From Task 2: `ReadinessView`, `InterestView`, `HeroView`, `RateWatchView`
  - `CARD` and `EYEBROW` from `../styles` (Task 3)
  - `RadialGauge` (default export of `@/components/ui/RadialGauge`, props `{ pct: number; size?: number }`, `aria-label` "{n}% paid off")
- Produces:
  - `useMeterValue(target: number): number`
  - Default-export components:
    - `ReadinessCard` `{ view: ReadinessView; onStep: (step: ReadinessStepId, via: 'cta' | 'chip') => void }`
    - `InterestMeter` `{ view: InterestView }`
    - `DebtFreeHero` `{ view: HeroView }`
    - `RateWatchCard` `{ view: RateWatchView }`

- [ ] **Step 1: Write the failing token test.** Add inside the existing `describe` block of `src/__tests__/lib/designTokens.test.ts`:

```ts
  it('adds an accessible green for text (DESIGN.md 2026-09-14)', () => {
    expect(extend.colors['success-text']).toBe('#15803d');
    expect(extend.colors.success).toBe('#27AE60');
  });
```

Run: `npx vitest run src/__tests__/lib/designTokens.test.ts`
Expected: FAIL (`undefined`).

- [ ] **Step 2: Add the token.** In `tailwind.config.ts`, after `success: '#27AE60',` add:

```ts
        // Green TEXT on light surfaces: 5.0:1 on white. `success` (2.9:1) is for fills only.
        'success-text': '#15803d',
```

Run the token test again. Expected: PASS.

- [ ] **Step 3: Record it in `DESIGN.md`.**
  - Under **Semantic Colors**, add this row after `--success`:

```markdown
| `--success-text` | `#15803d` | Green text on light surfaces (5.0:1): savings figures, done chips |
```

  - At the end of the **Design Decisions** table, add:

```markdown
| 2026-09-14 | Green text token (`success-text` #15803d) | The Tailwind `success` token (#27AE60) is 2.9:1 on white, under WCAG AA even for large text, and dashboard v2 puts green on 11px chip labels and savings figures. `success-text` (5.0:1, the check color `UpgradeModal` already uses) is for green text on light surfaces; `success` stays for fills (bars, tints). Approved by the owner with the PR 3 plan. |
```

- [ ] **Step 4: Write the failing meter-hook test** at `src/__tests__/components/dashboard-v2/useMeterValue.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderHook } from '@testing-library/react';
import { useMeterValue } from '@/components/dashboard-v2/useMeterValue';

function Probe({ target }: { target: number }) {
  return createElement('span', null, String(useMeterValue(target)));
}

describe('useMeterValue', () => {
  it('draws 0 first, on the server and before mount, so the meter animates in', () => {
    expect(renderToStaticMarkup(createElement(Probe, { target: 60 }))).toBe('<span>0</span>');
  });

  it('lands on the value after mount and follows later values', () => {
    const { result, rerender } = renderHook(({ target }) => useMeterValue(target), { initialProps: { target: 60 } });
    expect(result.current).toBe(60);
    rerender({ target: 80 });
    expect(result.current).toBe(80);
  });
});
```

Run: `npx vitest run src/__tests__/components/dashboard-v2/useMeterValue.test.ts`
Expected: FAIL, because the module can't be resolved.

- [ ] **Step 5: Create `src/components/dashboard-v2/useMeterValue.ts`:**

```ts
"use client";

import { useEffect, useState } from "react";

/**
 * Meter motion (DESIGN.md 2026-09-12). The first render draws the meter at 0,
 * then the value lands after mount, so the element's CSS width transition
 * runs 0 → value once; later values animate from the previous one. Pair it
 * with `motion-reduce:transition-none`, which makes every step instant.
 */
export function useMeterValue(target: number): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    setValue(target);
  }, [target]);
  return value;
}
```

Run the hook test. Expected: PASS.

- [ ] **Step 6: Write the failing cards test** at `src/__tests__/components/dashboard-v2/thisMonthCards.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReadinessView } from '@/lib/dashboard/thisMonth';
import ReadinessCard from '@/components/dashboard-v2/this-month/ReadinessCard';
import InterestMeter from '@/components/dashboard-v2/this-month/InterestMeter';
import DebtFreeHero from '@/components/dashboard-v2/this-month/DebtFreeHero';
import RateWatchCard from '@/components/dashboard-v2/this-month/RateWatchCard';

const READINESS: ReadinessView = {
  title: 'Your plan is 60% set up',
  counter: '3 of 5',
  percent: 60,
  chips: [
    { id: 'debts', label: 'Debts', complete: true },
    { id: 'income', label: 'Income', complete: true },
    { id: 'expenses', label: 'Expenses', complete: true },
    { id: 'dueDates', label: 'Due dates', complete: false },
    { id: 'firstPayment', label: 'First payment', complete: false },
  ],
  cta: { step: 'dueDates', label: 'Add 2 due dates' },
};

describe('ReadinessCard', () => {
  it('shows the title, the blue counter, the meter and labelled chips', () => {
    render(createElement(ReadinessCard, { view: READINESS, onStep: vi.fn() }));
    expect(screen.getByRole('heading', { name: 'Your plan is 60% set up' })).toBeTruthy();
    expect(screen.getByText('3 of 5').className).toContain('text-action');
    const bar = screen.getByRole('progressbar', { name: 'Your plan is 60% set up' });
    expect(bar.getAttribute('aria-valuenow')).toBe('60');
    expect((bar.firstElementChild as HTMLElement).style.width).toBe('60%');
    expect(screen.getByRole('button', { name: 'Debts, done' }).className).toContain('text-success-text');
    expect(screen.getByRole('button', { name: 'Due dates, to do' })).toBeTruthy();
  });

  it('reports CTA and chip presses separately', () => {
    const onStep = vi.fn();
    render(createElement(ReadinessCard, { view: READINESS, onStep }));
    fireEvent.click(screen.getByRole('button', { name: 'Add 2 due dates' }));
    fireEvent.click(screen.getByRole('button', { name: 'Income, done' }));
    expect(onStep.mock.calls).toEqual([['dueDates', 'cta'], ['income', 'chip']]);
  });

  it('puts the CTA on ink with a 46px mobile target', () => {
    render(createElement(ReadinessCard, { view: READINESS, onStep: vi.fn() }));
    const cta = screen.getByRole('button', { name: 'Add 2 due dates' });
    expect(cta.className).toContain('bg-ink');
    expect(cta.className).toContain('min-h-[46px]');
    expect(cta.className).toContain('rounded-lg');
  });
});

describe('InterestMeter', () => {
  it('states the estimate, the average, and splits the bar', () => {
    const { container } = render(createElement(InterestMeter, {
      view: { figure: '$840', avgLine: '≈$278/mo your plan saves vs minimums (avg)', lenderShare: 75 },
    }));
    expect(screen.getByRole('heading', { name: 'Interest going to lenders this month' })).toBeTruthy();
    expect(screen.getByText('$840').className).toContain('text-danger');
    expect(screen.getByText('est.')).toBeTruthy();
    expect(screen.getByText('≈$278/mo your plan saves vs minimums (avg)')).toBeTruthy();
    expect((container.querySelector('[data-meter="lenders"]') as HTMLElement).style.width).toBe('75%');
  });

  it('shows only the estimate without an average', () => {
    const { container } = render(createElement(InterestMeter, { view: { figure: '$50', avgLine: null, lenderShare: null } }));
    expect(container.querySelector('[data-meter="lenders"]')).toBeNull();
    expect(screen.queryByText(/your plan saves/)).toBeNull();
  });
});

describe('DebtFreeHero', () => {
  it('shows the date, the time to go (not blue) and the paid-off ring', () => {
    render(createElement(DebtFreeHero, { view: { dateLabel: 'April 2029', toGo: '2y 7m to go', paidPct: 5 } }));
    expect(screen.getByRole('heading', { name: 'Debt-free by' })).toBeTruthy();
    expect(screen.getByText('April 2029')).toBeTruthy();
    expect(screen.getByText('2y 7m to go').className).not.toContain('text-action');
    expect(screen.getByRole('img', { name: '5% paid off' })).toBeTruthy();
  });
});

describe('RateWatchCard', () => {
  it('shows the yearly estimate in green text, labelled as an estimate', () => {
    render(createElement(RateWatchCard, {
      view: { eyebrow: 'Rate watch · 3 cards', figure: '$1,656/yr', caption: 'est. if your cards drop to their target rates' },
    }));
    expect(screen.getByRole('heading', { name: 'Rate watch · 3 cards' })).toBeTruthy();
    expect(screen.getByText('$1,656/yr').className).toContain('text-success-text');
    expect(screen.getByText('est. if your cards drop to their target rates')).toBeTruthy();
  });
});
```

Run: `npx vitest run src/__tests__/components/dashboard-v2/thisMonthCards.test.ts`
Expected: FAIL, because the card modules can't be resolved.

- [ ] **Step 7: Create `this-month/ReadinessCard.tsx`:**

```tsx
"use client";

import { useId } from "react";
import type { ReadinessStepId } from "@/lib/dashboard/types";
import type { ReadinessView } from "@/lib/dashboard/thisMonth";
import { CARD, EYEBROW } from "../styles";
import { useMeterValue } from "../useMeterValue";

interface ReadinessCardProps {
  view: ReadinessView;
  /** A chip or the CTA was pressed. `via` lets the caller track CTA presses only. */
  onStep: (step: ReadinessStepId, via: "cta" | "chip") => void;
}

/** 32px pill; the ::before extends the hit area to 44px (the row gap is 12px, so targets never overlap). */
const CHIP =
  "relative inline-flex min-h-8 items-center rounded-full border px-2.5 text-[11px] font-bold outline-none before:absolute before:inset-x-0 before:-inset-y-1.5 before:content-[''] focus-visible:outline-2 focus-visible:outline-action";

/** README §1a, endowed progress: opens at the user's real count and disappears at 5 of 5. */
export default function ReadinessCard({ view, onStep }: ReadinessCardProps) {
  const titleId = useId();
  const fill = useMeterValue(view.percent);
  return (
    <section
      aria-labelledby={titleId}
      className={`${CARD} px-4 py-3.5 min-[1024px]:flex min-[1024px]:items-center min-[1024px]:gap-6 min-[1024px]:px-6 min-[1024px]:py-5`}
    >
      <div className="min-w-0 min-[1024px]:flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id={titleId} className={`${EYEBROW} text-txt-muted`}>{view.title}</h2>
          <span className="mono text-[12px] font-extrabold text-action">{view.counter}</span>
        </div>
        <div
          role="progressbar"
          aria-labelledby={titleId}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={view.percent}
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-border"
        >
          <div
            className="h-full rounded-full bg-action transition-[width] duration-[600ms] ease-out motion-reduce:transition-none"
            style={{ width: `${fill}%` }}
          />
        </div>
        <ul className="mt-2.5 flex flex-wrap gap-x-1.5 gap-y-3">
          {view.chips.map((chip) => (
            <li key={chip.id}>
              <button
                type="button"
                onClick={() => onStep(chip.id, "chip")}
                className={`${CHIP} ${chip.complete ? "border-success/25 bg-success/10 text-success-text" : "border-border bg-bg text-txt-muted"}`}
              >
                {chip.complete && <span aria-hidden="true">✓&nbsp;</span>}
                {chip.label}
                <span className="sr-only">{chip.complete ? ", done" : ", to do"}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <button
        type="button"
        onClick={() => onStep(view.cta.step, "cta")}
        className="mt-3 flex min-h-[46px] w-full items-center justify-center rounded-lg bg-ink px-5 text-[14px] font-extrabold text-white shadow-cta-ink outline-none hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action min-[1024px]:mt-0 min-[1024px]:min-h-11 min-[1024px]:w-auto min-[1024px]:shrink-0 min-[1024px]:whitespace-nowrap"
      >
        {view.cta.label}
      </button>
    </section>
  );
}
```

- [ ] **Step 8: Create `this-month/InterestMeter.tsx`:**

```tsx
"use client";

import { useId } from "react";
import type { InterestView } from "@/lib/dashboard/thisMonth";
import { EYEBROW } from "../styles";
import { useMeterValue } from "../useMeterValue";

/**
 * README §1b: the price anchor. This month's estimate (balance × APR ÷ 12,
 * labelled est.) against the plan's average monthly saving (labelled avg):
 * never "so far", never a split of the same dollars (spec X1, X2).
 */
export default function InterestMeter({ view }: { view: InterestView }) {
  const titleId = useId();
  const share = useMeterValue(view.lenderShare ?? 0);
  return (
    <section aria-labelledby={titleId} className="rounded-xl border border-danger/25 bg-surface p-4 shadow-card min-[1024px]:p-5">
      <h2 id={titleId} className={`${EYEBROW} text-txt-muted`}>Interest going to lenders this month</h2>
      <p className="mt-2 flex items-baseline gap-2">
        <span className="mono text-[36px] font-extrabold leading-none tracking-[-0.03em] text-danger min-[1024px]:text-[40px]">
          {view.figure}
        </span>
        <span className="text-[12px] text-txt-muted">est.</span>
      </p>
      {view.lenderShare !== null && (
        // The line below states both figures, so the bar is decoration for screen readers.
        <div aria-hidden="true" className="mt-3 flex h-2 overflow-hidden rounded-full bg-success">
          <div
            data-meter="lenders"
            className="h-full bg-danger transition-[width] duration-[600ms] ease-out motion-reduce:transition-none"
            style={{ width: `${share}%` }}
          />
        </div>
      )}
      {view.avgLine && (
        <p className="mt-2 text-[11px] font-semibold text-success-text [text-wrap:pretty]">{view.avgLine}</p>
      )}
    </section>
  );
}
```

- [ ] **Step 9: Create `this-month/DebtFreeHero.tsx`.** It uses one 56px ring at every width; the handoff's 60px desktop ring would need a second gauge in the DOM:

```tsx
"use client";

import { useId } from "react";
import RadialGauge from "@/components/ui/RadialGauge";
import type { HeroView } from "@/lib/dashboard/thisMonth";
import { CARD, EYEBROW } from "../styles";
import { useMeterValue } from "../useMeterValue";

/** README §1c. The ring is v1 This Month's paid-off share; "to go" stays muted (passive, so not blue). */
export default function DebtFreeHero({ view }: { view: HeroView }) {
  const titleId = useId();
  const pct = useMeterValue(view.paidPct);
  return (
    <section
      aria-labelledby={titleId}
      className={`${CARD} flex items-center justify-between gap-4 overflow-hidden px-4 py-[18px] min-[1024px]:px-5`}
    >
      <div className="min-w-0">
        <h2 id={titleId} className={`${EYEBROW} text-txt-muted`}>Debt-free by</h2>
        <p className="mt-1.5 text-[30px] font-extrabold leading-none tracking-[-0.03em] text-txt [text-wrap:pretty]">
          {view.dateLabel}
        </p>
        <p className="mono mt-2 text-[14px] font-bold text-txt-muted">{view.toGo}</p>
      </div>
      <RadialGauge pct={pct} size={56} />
    </section>
  );
}
```

- [ ] **Step 10: Create `this-month/RateWatchCard.tsx`:**

```tsx
"use client";

import { useId } from "react";
import type { RateWatchView } from "@/lib/dashboard/thisMonth";
import { CARD, EYEBROW } from "../styles";

/** README §6 (desktop only): the yearly APR-cut estimate, labelled as one (spec X10). */
export default function RateWatchCard({ view }: { view: RateWatchView }) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className={`${CARD} p-4 min-[1024px]:p-5`}>
      <h2 id={titleId} className={`${EYEBROW} text-txt-muted`}>{view.eyebrow}</h2>
      <p className="mono mt-2 text-[28px] font-extrabold leading-none tracking-[-0.02em] text-success-text">
        {view.figure}
      </p>
      <p className="mt-2 text-[13px] text-txt-muted [text-wrap:pretty]">{view.caption}</p>
    </section>
  );
}
```

- [ ] **Step 11: Run the task's tests, then the full suite.**
Run: `npx vitest run src/__tests__/components/dashboard-v2/useMeterValue.test.ts src/__tests__/components/dashboard-v2/thisMonthCards.test.ts src/__tests__/lib/designTokens.test.ts`, then `npm test`
Expected: all PASS.

- [ ] **Step 12: Commit.**

```bash
git add tailwind.config.ts DESIGN.md src/__tests__/lib/designTokens.test.ts src/components/dashboard-v2/useMeterValue.ts src/components/dashboard-v2/this-month/ReadinessCard.tsx src/components/dashboard-v2/this-month/InterestMeter.tsx src/components/dashboard-v2/this-month/DebtFreeHero.tsx src/components/dashboard-v2/this-month/RateWatchCard.tsx src/__tests__/components/dashboard-v2/useMeterValue.test.ts src/__tests__/components/dashboard-v2/thisMonthCards.test.ts
git commit -m "feat(dashboard-v2): readiness, interest, debt-free and rate-watch cards" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: `FreeMoveCard` and the gated "more moves" row

**Files:**
- Create: `src/components/dashboard-v2/this-month/MoreMovesRow.tsx`, `src/components/dashboard-v2/this-month/FreeMoveCard.tsx`
- Test: `src/__tests__/components/dashboard-v2/FreeMoveCard.test.ts`

**Interfaces:**
- Consumes:
  - `FreeMoveView`, `FreeMoveAction` and `freeMoveView` (the last in the test only) from Task 2
  - `CARD`, `EYEBROW`, `CTA_BLUE` and `ERROR_LINE` from `../styles`
  - The move fixtures in `src/__tests__/lib/dashboard/fixtures.ts`
- Produces:
  - `MoreMovesRow` (default), props `{ count: number; onOpen: () => void }`
  - `FreeMoveCard` (default), props `{ view: FreeMoveView; onAction: (action: FreeMoveAction) => void; onMoreMoves: () => void; pending?: boolean; error?: string | null }`

- [ ] **Step 1: Write the failing test** at `src/__tests__/components/dashboard-v2/FreeMoveCard.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { CoachMove } from '@/lib/dashboard/types';
import { freeMoveView, type FreeMoveView } from '@/lib/dashboard/thisMonth';
import FreeMoveCard from '@/components/dashboard-v2/this-month/FreeMoveCard';
import { makeCallAprMove, makeLogMissedMove, makeSwitchMove } from '../../lib/dashboard/fixtures';

const FREE = { proEligible: false, paidPro: false, trial: { active: false, endsAt: null } };

function viewFor(moves: CoachMove[]): FreeMoveView {
  const view = freeMoveView({ tier: FREE, coachMoves: moves, asOf: { year: 2026, month: 8, day: 14 } });
  if (!view) throw new Error('expected a free move');
  return view;
}

function renderCard(view: FreeMoveView, extra: { pending?: boolean; error?: string | null } = {}) {
  const onAction = vi.fn();
  const onMoreMoves = vi.fn();
  render(createElement(FreeMoveCard, { view, onAction, onMoreMoves, ...extra }));
  return { onAction, onMoreMoves };
}

describe('FreeMoveCard', () => {
  it('shows the free move in full: eyebrow, priority, title, body and CTA', () => {
    const view = viewFor([makeLogMissedMove('Sep', 6)]);
    const { onAction } = renderCard(view);
    expect(screen.getByText('Your free move · Sep').className).toContain('text-action');
    expect(screen.getByText('High')).toBeTruthy();
    expect(screen.getByRole('heading', { name: view.copy.title })).toBeTruthy();
    expect(screen.getByText(view.copy.body)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Log them now' }));
    expect(onAction).toHaveBeenCalledWith('bulk_log');
  });

  it('shows the gated count as a Pro row that opens the upgrade modal', () => {
    const { onMoreMoves } = renderCard(viewFor([
      makeLogMissedMove('Sep', 2), makeSwitchMove('avalanche', 1030), makeCallAprMove('c1', 742),
    ]));
    const row = screen.getByRole('button', { name: '2 more moves found — Pro' });
    expect(row.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(row);
    expect(onMoreMoves).toHaveBeenCalledTimes(1);
  });

  it('has no button for the APR call, and no row when nothing else is gated', () => {
    renderCard(viewFor([makeCallAprMove('c1', 742, true)]));
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('shows a running strategy switch and its error', () => {
    renderCard(viewFor([makeSwitchMove('avalanche', 1030, true)]), { pending: true, error: "Couldn't switch. Try again." });
    expect((screen.getByRole('button', { name: 'Saving…' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('alert').textContent).toBe("Couldn't switch. Try again.");
  });
});
```

- [ ] **Step 2: Run it to verify it fails.**
Run: `npx vitest run src/__tests__/components/dashboard-v2/FreeMoveCard.test.ts`
Expected: FAIL, because the FreeMoveCard module can't be resolved.

- [ ] **Step 3: Create `this-month/MoreMovesRow.tsx`:**

```tsx
"use client";

interface MoreMovesRowProps {
  count: number;
  onOpen: () => void;
}

/**
 * The gate is volume, not blur (README "The System" 1). The count stays
 * readable, the row reads as disabled and names its tier, and pressing it opens
 * the upgrade modal. aria-disabled, not disabled, keeps it focusable and pressable.
 */
export default function MoreMovesRow({ count, onOpen }: MoreMovesRowProps) {
  const label = `${count} more ${count === 1 ? "move" : "moves"} found`;
  return (
    <button
      type="button"
      aria-disabled="true"
      aria-label={`${label} — Pro`}
      onClick={onOpen}
      className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg text-left outline-none focus-visible:outline-2 focus-visible:outline-action"
    >
      <span className="text-[12px] text-txt-muted">{label}</span>
      <span className="rounded-md border border-border bg-surface-2 px-1.5 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.06em] text-txt-muted">
        Pro
      </span>
    </button>
  );
}
```

- [ ] **Step 4: Create `this-month/FreeMoveCard.tsx`:**

```tsx
"use client";

import { useId } from "react";
import type { FreeMoveAction, FreeMoveView } from "@/lib/dashboard/thisMonth";
import { CARD, CTA_BLUE, ERROR_LINE, EYEBROW } from "../styles";
import MoreMovesRow from "./MoreMovesRow";

interface FreeMoveCardProps {
  view: FreeMoveView;
  onAction: (action: FreeMoveAction) => void;
  onMoreMoves: () => void;
  /** A one-tap action (the strategy switch) is saving. */
  pending?: boolean;
  error?: string | null;
}

/**
 * README §1d: one coach move, fully readable and usable on Free, and the
 * count of the gated ones. Desktop (§6): copy left, a 250px action column right.
 */
export default function FreeMoveCard({ view, onAction, onMoreMoves, pending = false, error = null }: FreeMoveCardProps) {
  const titleId = useId();
  const { cta } = view;
  const hasActions = cta !== null || view.moreCount > 0;
  return (
    <section
      aria-labelledby={titleId}
      className={`${CARD} p-4 min-[1024px]:flex min-[1024px]:items-start min-[1024px]:justify-between min-[1024px]:gap-8 min-[1024px]:p-5`}
    >
      <div className="min-w-0 min-[1024px]:max-w-[620px] min-[1024px]:flex-1">
        <div className="flex items-center justify-between gap-3 min-[1024px]:justify-start">
          <span className={`${EYEBROW} text-action`}>{view.eyebrow}</span>
          <span className="rounded-md bg-warning/15 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.06em] text-txt">
            {view.priority}
          </span>
        </div>
        <h2 id={titleId} className="mt-1.5 text-[16px] font-extrabold tracking-[-0.01em] text-txt [text-wrap:pretty] min-[1024px]:text-[19px]">
          {view.copy.title}
        </h2>
        <p className="mt-1.5 text-[13px] leading-[1.55] text-txt-muted [text-wrap:pretty]">{view.copy.body}</p>
      </div>
      {hasActions && (
        <div className="mt-3 flex flex-col gap-2 min-[1024px]:mt-0 min-[1024px]:w-[250px] min-[1024px]:shrink-0">
          {cta && (
            <button type="button" onClick={() => onAction(cta.action)} disabled={pending} className={CTA_BLUE}>
              {pending ? "Saving…" : cta.label}
            </button>
          )}
          {error && <p role="alert" className={ERROR_LINE}>{error}</p>}
          {view.moreCount > 0 && (
            <div className={cta ? "border-t border-border pt-1" : undefined}>
              <MoreMovesRow count={view.moreCount} onOpen={onMoreMoves} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 5: Run it.**
Run: `npx vitest run src/__tests__/components/dashboard-v2/FreeMoveCard.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add src/components/dashboard-v2/this-month/MoreMovesRow.tsx src/components/dashboard-v2/this-month/FreeMoveCard.tsx src/__tests__/components/dashboard-v2/FreeMoveCard.test.ts
git commit -m "feat(dashboard-v2): free coach move card with the gated more-moves row" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: `ThisMonthV2` and the flag switch in `DashboardClient`

**Files:**
- Create: `src/components/dashboard-v2/this-month/ThisMonthV2.tsx`
- Modify: `src/components/DashboardClient.tsx:427-437` (the `this-month` branch), plus one import
- Modify: `src/__tests__/components/dashboard-v2/DashboardClient.flag.test.ts`. Change **only** the v2 wiring test and add one mock. The snapshot tests and the `.snap` file stay untouched.
- Test: `src/__tests__/components/dashboard-v2/ThisMonthV2.test.ts`

**Interfaces:**
- Consumes:
  - Everything from Tasks 2–6
  - `useDashboardInsights()` (`{ data, isError, refetch }`), `useSaveIncome()` (`mutate(vars, { onError })`, `isPending`) and `getErrorMessage` from `@/lib/hooks`
  - `CoachBriefCard` (`{ hasDebts; hasIncome; onApplyAction?: (targetExtra: number) => void }`)
  - `upgradeEvents.dispatch(feature)`
  - `Skeleton` from `@/components/ui/skeleton`
  - `Tab` from `@/components/dashboard/types`
- Produces: `ThisMonthV2` (default), props `{ debts: Debt[]; income: Income | null | undefined; onNavigate: (tab: Tab) => void; onSetPendingCoachExtra: (targetExtra: number) => void }`

- [ ] **Step 1: Write the failing test** at `src/__tests__/components/dashboard-v2/ThisMonthV2.test.ts`:

```ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { DashboardInsights, PlanReadiness } from '@/lib/dashboard/types';
import { useDashboardInsights, useMarkPaid, useSaveIncome, useUpdateDebt } from '@/lib/hooks';
import { track } from '@/lib/analytics';
import { upgradeEvents } from '@/lib/upgradeEvents';
import ThisMonthV2 from '@/components/dashboard-v2/this-month/ThisMonthV2';
import {
  makeCallAprMove, makeDebt, makeIncome, makeLogMissedMove, makeSwitchMove,
} from '../../lib/dashboard/fixtures';

const coachBrief = vi.hoisted(() => ({ props: null as null | { onApplyAction?: (targetExtra: number) => void } }));

vi.mock('@/lib/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/hooks')>()),
  useDashboardInsights: vi.fn(),
  useSaveIncome: vi.fn(),
  useMarkPaid: vi.fn(),
  useUpdateDebt: vi.fn(),
}));
vi.mock('@/lib/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/analytics')>()),
  track: vi.fn(),
}));
vi.mock('@/components/payoff/CoachBriefCard', async () => {
  const { createElement: h } = await import('react');
  return {
    default: (props: { onApplyAction?: (targetExtra: number) => void }) => {
      coachBrief.props = props;
      return h('div', { 'data-stub': 'CoachBriefCard' });
    },
  };
});

const FREE = { proEligible: false, paidPro: false, trial: { active: false, endsAt: null } };
const PRO = { proEligible: true, paidPro: true, trial: { active: false, endsAt: null } };
const RATE_CARD = { debtId: 'c1', debtName: 'Citi', apr: 28, targetApr: 19.6, annualEstimate: 742.9 };

const DEBTS = [
  makeDebt({ id: 'a', name: 'Visa', balance: 900, originalBalance: 1_000, minimumPayment: 25 }),
  makeDebt({ id: 'b', name: 'Car loan', balance: 9_000, minimumPayment: 310, dueDate: 5 }),
];

function readiness(done: ReadonlyArray<PlanReadiness['steps'][number]['id']>, dueDatesPending = 1): PlanReadiness {
  const ids = ['debts', 'income', 'expenses', 'dueDates', 'firstPayment'] as const;
  const steps = ids.map((id) => ({
    id,
    complete: done.includes(id),
    pendingCount: done.includes(id) ? 0 : id === 'dueDates' ? dueDatesPending : 1,
  }));
  return { steps, completeCount: done.length, percent: done.length * 20 };
}

function insights(overrides: Partial<DashboardInsights> = {}): DashboardInsights {
  return {
    asOf: { year: 2026, month: 8, day: 14 },
    tier: FREE,
    readiness: readiness(['debts', 'income', 'expenses']),
    interest: { monthlyEstimate: 840.36, avgMonthlySavedByPlan: 278.3 },
    paymentGap: { expected: 2, logged: 0, missed: [{ debtId: 'b', minimumPayment: 310 }], missedMinimums: 310, notYetDue: 1 },
    coachMoves: [makeLogMissedMove('Sep', 1), makeSwitchMove('avalanche', 1030), makeCallAprMove('c1', 742)],
    rateWatch: { cards: 1, annualEstimate: 742.9, top: RATE_CARD, moveTarget: RATE_CARD },
    strategy: null,
    planGap: null,
    progress: null,
    plan: { method: 'snowball', months: 31, debtFreeDate: '2029-04-14', totalInterest: 5_000 },
    ...overrides,
  };
}

const saveIncome = { mutate: vi.fn(), isPending: false };

function renderTab(data: DashboardInsights | undefined, query: { isError?: boolean; refetch?: () => void } = {}) {
  vi.mocked(useDashboardInsights).mockReturnValue(
    { data, isError: false, refetch: vi.fn(), ...query } as unknown as ReturnType<typeof useDashboardInsights>,
  );
  vi.mocked(useSaveIncome).mockReturnValue(saveIncome as unknown as ReturnType<typeof useSaveIncome>);
  vi.mocked(useMarkPaid).mockReturnValue({ mutateAsync: vi.fn() } as unknown as ReturnType<typeof useMarkPaid>);
  vi.mocked(useUpdateDebt).mockReturnValue({ mutateAsync: vi.fn() } as unknown as ReturnType<typeof useUpdateDebt>);
  const onNavigate = vi.fn();
  const onSetPendingCoachExtra = vi.fn();
  render(createElement(ThisMonthV2, { debts: DEBTS, income: makeIncome(), onNavigate, onSetPendingCoachExtra }));
  return { onNavigate, onSetPendingCoachExtra };
}

afterEach(() => {
  vi.clearAllMocks();
  coachBrief.props = null;
  document.body.innerHTML = '';
});

describe('ThisMonthV2', () => {
  it('lays out the Free tab: readiness, interest, hero, rate watch (not on phones), free move', () => {
    renderTab(insights());
    expect(screen.getAllByRole('heading').map((h) => h.textContent)).toEqual([
      'Your plan is 60% set up',
      'Interest going to lenders this month',
      'Debt-free by',
      'Rate watch · 1 card',
      'Log the missing payment for Sep.',
    ]);
    const rateWatch = screen.getByRole('heading', { name: 'Rate watch · 1 card' }).closest('[data-card="rate-watch"]');
    expect(rateWatch?.className).toContain('max-[768px]:hidden');
  });

  it('hides readiness at 5 of 5 and every card without a figure, then says so', () => {
    renderTab(insights({
      readiness: readiness(['debts', 'income', 'expenses', 'dueDates', 'firstPayment']),
      interest: null,
      plan: null,
      rateWatch: null,
      coachMoves: [],
    }));
    expect(screen.queryAllByRole('heading')).toHaveLength(0);
    expect(screen.getByText('Nothing to show for September yet.')).toBeTruthy();
  });

  it('gives Pro and trial users the AI brief instead of the free move, wired like v1', () => {
    const { onNavigate, onSetPendingCoachExtra } = renderTab(insights({
      tier: PRO,
      coachMoves: [makeLogMissedMove('Sep', 1, true), makeSwitchMove('avalanche', 1030, true)],
    }));
    expect(document.querySelector('[data-stub="CoachBriefCard"]')).not.toBeNull();
    expect(screen.queryByText(/Your free move/)).toBeNull();
    expect(screen.queryByRole('button', { name: /more moves? found/ })).toBeNull();
    coachBrief.props?.onApplyAction?.(150);
    expect(onSetPendingCoachExtra).toHaveBeenCalledWith(150);
    expect(onNavigate).toHaveBeenCalledWith('intelligence');
  });

  it('opens the due-dates sheet from the readiness CTA with the debts missing a day, and tracks it', () => {
    renderTab(insights());
    fireEvent.click(screen.getByRole('button', { name: 'Add 1 due date' }));
    const sheet = screen.getByRole('dialog', { name: 'Add due dates' });
    expect(within(sheet).getByLabelText('Visa')).toBeTruthy();
    expect(within(sheet).queryByLabelText('Car loan')).toBeNull();
    expect(track).toHaveBeenCalledWith('readiness_cta', { step: 'dueDates' });
  });

  it('sends a chip to its step without counting it as a CTA press', () => {
    const { onNavigate } = renderTab(insights());
    fireEvent.click(screen.getByRole('button', { name: 'Income, done' }));
    expect(onNavigate).toHaveBeenCalledWith('income');
    expect(track).not.toHaveBeenCalled();
  });

  it('opens the bulk log with every active debt for the first payment', () => {
    renderTab(insights({ readiness: readiness(['debts', 'income', 'expenses', 'dueDates'], 0) }));
    fireEvent.click(screen.getByRole('button', { name: 'Log your first payment' }));
    const sheet = screen.getByRole('dialog', { name: 'Log Sep payments' });
    expect((within(sheet).getByLabelText('Amount for Visa') as HTMLInputElement).value).toBe('25.00');
    expect((within(sheet).getByLabelText('Amount for Car loan') as HTMLInputElement).value).toBe('310.00');
  });

  it('opens the bulk log with the missed payments from the free move', () => {
    renderTab(insights());
    fireEvent.click(screen.getByRole('button', { name: 'Log it now' }));
    const sheet = screen.getByRole('dialog', { name: 'Log Sep payments' });
    expect((within(sheet).getByLabelText('Amount for Car loan') as HTMLInputElement).value).toBe('310.00');
    expect(within(sheet).queryByLabelText('Amount for Visa')).toBeNull();
    expect(track).toHaveBeenCalledWith('coach_move_cta', { move: 'log_missed', gated: false });
  });

  it("switches strategy with PayoffTab's save payload", () => {
    renderTab(insights({ coachMoves: [makeSwitchMove('avalanche', 1030, true)] }));
    fireEvent.click(screen.getByRole('button', { name: 'Switch to Avalanche' }));
    expect(saveIncome.mutate).toHaveBeenCalledWith(
      { monthlyTakeHome: 4_000, essentialExpenses: 2_000, extraPayment: 0, payoffMethod: 'avalanche', accelerationAmount: null },
      expect.objectContaining({ onError: expect.any(Function) }),
    );
  });

  it('opens the upgrade modal with the coach copy from the more-moves row', () => {
    const seen: string[] = [];
    const unsubscribe = upgradeEvents.subscribe((feature) => seen.push(feature));
    renderTab(insights());
    fireEvent.click(screen.getByRole('button', { name: '2 more moves found — Pro' }));
    expect(seen).toEqual(['Coach moves']);
    unsubscribe();
  });

  it('shows skeleton cards while insights load', () => {
    renderTab(undefined);
    expect(screen.getByRole('status', { name: 'Loading this month' })).toBeTruthy();
  });

  it('offers a retry when insights fail', () => {
    const refetch = vi.fn();
    renderTab(undefined, { isError: true, refetch });
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run it to verify it fails.**
Run: `npx vitest run src/__tests__/components/dashboard-v2/ThisMonthV2.test.ts`
Expected: FAIL, because the ThisMonthV2 module can't be resolved.

- [ ] **Step 3: Create `this-month/ThisMonthV2.tsx`:**

```tsx
"use client";

import { useState } from "react";
import type { Debt, Income } from "@/types";
import type { Tab } from "@/components/dashboard/types";
import type { ReadinessStepId } from "@/lib/dashboard/types";
import { getErrorMessage, useDashboardInsights, useSaveIncome } from "@/lib/hooks";
import { track, Events } from "@/lib/analytics";
import { upgradeEvents } from "@/lib/upgradeEvents";
import { longMonthLabel, shortMonthLabel } from "@/lib/dashboard/format";
import {
  activeDebtRows,
  debtsMissingDueDate,
  freeMoveView,
  heroView,
  interestView,
  missedPaymentRows,
  rateWatchView,
  readinessTarget,
  readinessView,
  type FreeMoveAction,
  type LogRow,
} from "@/lib/dashboard/thisMonth";
import { Skeleton } from "@/components/ui/skeleton";
import CoachBriefCard from "@/components/payoff/CoachBriefCard";
import BulkLogSheet from "../sheets/BulkLogSheet";
import DueDatesSheet from "../sheets/DueDatesSheet";
import { CARD } from "../styles";
import DebtFreeHero from "./DebtFreeHero";
import FreeMoveCard from "./FreeMoveCard";
import InterestMeter from "./InterestMeter";
import RateWatchCard from "./RateWatchCard";
import ReadinessCard from "./ReadinessCard";

/** Opens UpgradeModal with its coach copy, like the sidebar rail (V2Shell). */
const MOVES_UPGRADE_FEATURE = "Coach moves";

const INLINE_BUTTON =
  "mt-3 inline-flex min-h-11 items-center justify-center rounded-lg bg-action px-5 text-[13px] font-extrabold text-white outline-none hover:bg-action/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action";

interface ThisMonthV2Props {
  debts: Debt[];
  income: Income | null | undefined;
  onNavigate: (tab: Tab) => void;
  onSetPendingCoachExtra: (targetExtra: number) => void;
}

type OpenSheet = { kind: "dueDates" } | { kind: "log"; rows: LogRow[] } | null;

/**
 * This Month, dashboard v2 (spec §8.5): readiness → interest → debt-free hero
 * → one free move (Pro and trial: the AI brief), with rate watch in the
 * desktop row. Every figure comes from the insights endpoint; a card
 * without a real figure doesn't render.
 */
export default function ThisMonthV2({ debts, income, onNavigate, onSetPendingCoachExtra }: ThisMonthV2Props) {
  const { data: insights, isError, refetch } = useDashboardInsights();
  const saveIncome = useSaveIncome();
  const [sheet, setSheet] = useState<OpenSheet>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);

  if (!insights) {
    return isError ? <LoadFailed onRetry={() => void refetch()} /> : <LoadingCards />;
  }

  const readiness = readinessView(insights.readiness);
  const interest = interestView(insights.interest);
  const hero = heroView(insights.plan, debts);
  const rateWatch = rateWatchView(insights.rateWatch);
  const freeMove = freeMoveView(insights);
  const { year, month } = insights.asOf;

  const openLog = (rows: LogRow[]) => {
    if (rows.length > 0) setSheet({ kind: "log", rows });
  };

  const onStep = (stepId: ReadinessStepId, via: "cta" | "chip") => {
    const step = insights.readiness.steps.find((s) => s.id === stepId);
    if (!step) return;
    if (via === "cta") track(Events.READINESS_CTA, { step: stepId });
    const target = readinessTarget(step);
    if (target.kind === "tab") {
      onNavigate(target.tab);
    } else if (target.kind === "dueDatesSheet") {
      // Insights can trail a debt edit by a refetch; with nothing left to
      // date, go where due dates live instead of opening an empty sheet.
      if (debtsMissingDueDate(debts).length > 0) setSheet({ kind: "dueDates" });
      else onNavigate("debts");
    } else {
      openLog(activeDebtRows(debts));
    }
  };

  const onMoveAction = (action: FreeMoveAction) => {
    if (!freeMove) return;
    const { move } = freeMove;
    track(Events.COACH_MOVE_CTA, { move: move.id, gated: false });
    if (action === "bulk_log") {
      openLog(missedPaymentRows(insights.paymentGap, debts));
    } else if (action === "open_plan") {
      onNavigate("plan");
    } else if (move.id === "switch_strategy" && income) {
      setSwitchError(null);
      // PayoffTab's exact save payload: the same write as the Plan tab's
      // method toggle. The global mutation cache then refreshes insights.
      saveIncome.mutate(
        {
          monthlyTakeHome: income.monthlyTakeHome,
          essentialExpenses: income.essentialExpenses,
          extraPayment: income.extraPayment,
          payoffMethod: move.facts.alternative,
          accelerationAmount: income.accelerationAmount ?? null,
        },
        { onError: (err) => setSwitchError(getErrorMessage(err, "Couldn't switch. Try again.")) },
      );
    }
  };

  const coach = insights.tier.proEligible ? (
    <CoachBriefCard
      hasDebts={debts.length > 0}
      hasIncome={!!income}
      onApplyAction={(targetExtra) => {
        onSetPendingCoachExtra(targetExtra);
        onNavigate("intelligence");
      }}
    />
  ) : freeMove ? (
    <FreeMoveCard
      view={freeMove}
      onAction={onMoveAction}
      onMoreMoves={() => upgradeEvents.dispatch(MOVES_UPGRADE_FEATURE)}
      pending={saveIncome.isPending}
      error={switchError}
    />
  ) : null;

  const nothingToShow = !readiness && !interest && !hero && !coach;

  return (
    <div className="flex flex-col gap-2.5 min-[769px]:gap-4">
      {readiness && <ReadinessCard view={readiness} onStep={onStep} />}
      {(interest || hero || rateWatch) && (
        <div className="flex flex-col gap-2.5 min-[769px]:gap-4 min-[1024px]:flex-row">
          {interest && (
            <div className="min-w-0 min-[1024px]:flex-[1.15_1_0%] [&>section]:h-full">
              <InterestMeter view={interest} />
            </div>
          )}
          {hero && (
            <div className="min-w-0 min-[1024px]:flex-[1_1_0%] [&>section]:h-full">
              <DebtFreeHero view={hero} />
            </div>
          )}
          {rateWatch && (
            // Cut from the phone stack to keep it short (README §1 note); on phones it lives on Coach (PR 5).
            <div data-card="rate-watch" className="min-w-0 max-[768px]:hidden min-[1024px]:flex-[1_1_0%] [&>section]:h-full">
              <RateWatchCard view={rateWatch} />
            </div>
          )}
        </div>
      )}
      {coach}
      {nothingToShow && (
        <section className={`${CARD} p-5 text-center`}>
          <p className="text-[14px] font-semibold text-txt">Nothing to show for {longMonthLabel(month)} yet.</p>
          <button type="button" onClick={() => onNavigate("debts")} className={INLINE_BUTTON}>
            Go to My Debts
          </button>
        </section>
      )}
      {sheet?.kind === "dueDates" && (
        <DueDatesSheet debts={debtsMissingDueDate(debts)} onClose={() => setSheet(null)} />
      )}
      {sheet?.kind === "log" && (
        <BulkLogSheet
          title={`Log ${shortMonthLabel(month)} payments`}
          rows={sheet.rows}
          year={year}
          month={month}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}

function LoadingCards() {
  return (
    <div role="status" aria-label="Loading this month" className="flex flex-col gap-2.5 min-[769px]:gap-4">
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-28 w-full rounded-xl" />
    </div>
  );
}

function LoadFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <section className={`${CARD} p-5 text-center`}>
      <p className="text-[14px] font-semibold text-txt">We couldn&apos;t load this month&apos;s numbers.</p>
      <button type="button" onClick={onRetry} className={INLINE_BUTTON}>
        Try again
      </button>
    </section>
  );
}
```

- [ ] **Step 4: Run it.**
Run: `npx vitest run src/__tests__/components/dashboard-v2/ThisMonthV2.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Update the flag test first.** This change fails until Step 7. In `src/__tests__/components/dashboard-v2/DashboardClient.flag.test.ts`:
  - After the `IntelligenceTab` mock line, add:

```ts
vi.mock('@/components/dashboard-v2/this-month/ThisMonthV2', stub('ThisMonthV2'));
```

  - In the test `'renders the v2 shell around the same tab content with the flag on'`, rename it to `'renders the v2 shell, with This Month v2, when the flag is on'`, and replace `expect(html).toContain('data-stub="ThisMonthTab"');` with:

```ts
    expect(html).toContain('data-stub="ThisMonthV2"');
    expect(html).not.toContain('data-stub="ThisMonthTab"');
```

Run: `npx vitest run src/__tests__/components/dashboard-v2/DashboardClient.flag.test.ts`
Expected: the renamed test FAILS (still `ThisMonthTab`). The two snapshot tests and the other wiring tests PASS.

- [ ] **Step 6: Switch the tab in `DashboardClient.tsx`.**
  - Add `import ThisMonthV2 from "@/components/dashboard-v2/this-month/ThisMonthV2";` after the `V2Shell` import.
  - Replace the `activeTab === "this-month"` block inside `mainContent` with:

```tsx
        {activeTab === "this-month" && (dashboardV2 ? (
          <ThisMonthV2
            debts={debts}
            income={income}
            onNavigate={(tab) => setActiveTab(tab)}
            onSetPendingCoachExtra={setPendingCoachExtra}
          />
        ) : (
          <ThisMonthTab
            debts={debts}
            income={income}
            expenses={expenses}
            isLoading={debtsLoading || incomeLoading}
            userName={user?.name}
            onNavigate={(tab) => setActiveTab(tab)}
            onSetPendingCoachExtra={setPendingCoachExtra}
          />
        ))}
```

- [ ] **Step 7: Run the flag test and the full suite.**
Run: `npx vitest run src/__tests__/components/dashboard-v2/DashboardClient.flag.test.ts`, then `npm test`
Expected: all PASS, with the snapshots unchanged. If a snapshot fails, the v1 path changed: fix the code, never the snapshot.

- [ ] **Step 8: Type-check.**
Run: `npx tsc --noEmit 2>&1 | grep -v "src/__tests__/lib/stripe.test.ts"`
Expected: no output.

- [ ] **Step 9: Commit.**

```bash
git add src/components/dashboard-v2/this-month/ThisMonthV2.tsx src/components/DashboardClient.tsx src/__tests__/components/dashboard-v2/ThisMonthV2.test.ts src/__tests__/components/dashboard-v2/DashboardClient.flag.test.ts
git commit -m "feat(dashboard-v2): This Month v2 behind the flag" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Verification, spec sync and the pull request

**Files:**
- Modify: `docs/superpowers/specs/2026-09-12-dashboard-pro-upgrade-design.md` (§8.3 **Shared cards** bullet, §8.5 **This Month** bullet, §9)

- [ ] **Step 1: Patch the spec.**
  - In §8.5, directly under the **This Month (Free), mobile** bullet, add:

```markdown
  - **PR 3 decisions (2026-09-14):**
    - v2 drops every other v1 This Month element, including `RollForwardAdvice` and the quick-nav buttons (D12). With no debts, the readiness CTA "Add your debts" replaces the empty state.
    - Readiness chips are buttons (D11). An unfinished step's chip opens its flow: due dates → `DueDatesSheet`, first payment → `BulkLogSheet` with every active debt at its minimum, income and expenses → Income & Budget, debts → My Debts. A done chip opens that step's home. An unfinished step with nothing to count has no chip.
    - Free-move CTAs:
      - `log_missed`: "Log them now" / "Log it now" → `BulkLogSheet`.
      - `switch_strategy`: "Switch to {alt}" saves the method in one tap, with `PayoffTab`'s payload.
      - `use_unallocated`: "Open My Plan".
      - `call_apr`: no button. The call script is Pro; PR 5 decides.
    - "{n} more moves found" + Pro is a gated control (`aria-disabled`, named "{n} more moves found — Pro") that opens `UpgradeModal` with the coach copy.
    - Interest shows whole dollars floored. The bar and the avg line hide unless the average floors to at least $1.
    - The hero's "to go" is muted, not blue. The ring is v1's paid-off share, 56px at every width.
    - Rate watch is shown only on the desktop shell (≥769px).
    - Sheets are bottom sheets on phones and centered dialogs from 769px, portaled to `<body>`. They write sequentially through the existing hooks and stop at the first failure.
    - Green text uses the `success-text` token (#15803d); `success` is for fills (DESIGN.md 2026-09-14).
```

  - In §8.3, append to the **Shared cards** bullet: "`MoreMovesList` (the Coach tab's list with per-move values) ships in PR 5; This Month uses the gated `MoreMovesRow`."
  - In §9, change `bulk_log_submitted {count}` to `bulk_log_submitted {debt_count}` and add: "(the analytics sanitiser redacts numbers outside its safe keys)".

Commit:

```bash
git add docs/superpowers/specs/2026-09-12-dashboard-pro-upgrade-design.md
git commit -m "docs(spec): record dashboard v2 This Month decisions" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 2: Run the full local checks:** `npm run lint`, `npm run build`, `npm test`, and `npx tsc --noEmit 2>&1 | grep -v "src/__tests__/lib/stripe.test.ts"`.
Expected: all pass, and tsc prints nothing. Report any failure verbatim and fix it; never skip one.

- [ ] **Step 3: Run the baseline gate** (`~/.gstack/projects/vronney-snowball-pay/baseline/README.md`), with the gotchas learned in PR 2:
  - The fresh `main` worktree also needs `npx prisma generate`.
  - It needs its own `.env.local`. Ask the user before copying it; never read it.
  - Capture `main` and the branch back to back, then print both JSON files' modification times before comparing, because `compare.mjs` happily compares against a stale `main.json`.

  Expected: `DIFFERENT=0 missing=0 inputsChanged=0`. Ask the user before removing the worktree.

- [ ] **Step 4: Code review.** Dispatch the `typescript-reviewer` and `code-reviewer` agents in parallel on `git diff main...HEAD`, plus one design-compliance pass against `DESIGN.md`:
  - blue only on CTAs, progress fills, the readiness counter, and the free-move eyebrow
  - ink only on the readiness CTA
  - the radius hierarchy (cards 12px, buttons 8px, chips full, tags 6px)
  - no hexes beyond `focus-visible:outline-action` and the new token
  - 44px targets (46px primary CTAs on phones)
  - no dashed borders
  - `motion-reduce:transition-none` on every animated meter

  Fix every CRITICAL and HIGH finding (test first for behavior bugs), and MEDIUM where cheap. Rerun Step 2 after any change.

- [ ] **Step 5: Preview with the flag on.** The owner's production account already has `DASHBOARD_V2_USERS` locally.
  - Start `budget-dev` with `preview_start`. The user signs in within the Browser pane; never type credentials.
  - **This is production data, so look but don't act.** Open each sheet, then close it. Never press Save, Log or Switch. Close the upgrade modal without pressing checkout.

  At 375, 768, 1024 and 1280 (`resize_window`), take a screenshot of each and confirm:
  - **375 / 768:**
    - The order is readiness → interest → hero → free move, and rate watch is absent.
    - Cards don't clip, and the last card clears the bottom bar.
    - The readiness CTA is full width and ink.
  - **1024 / 1280:**
    - Readiness has its CTA on the right.
    - Interest, hero and rate watch sit in one row, interest widest.
    - The coach card has its copy left and the 250px action column right.
  - **Hide rules:** every figure matches the account's v1 This Month or Intelligence figures where one exists: the interest estimate floored, the date equal to v1's hero date.
  - **Sheets:**
    - Due dates and bulk log open from their CTAs.
    - Focus lands on the title, and Tab stays inside.
    - Escape closes and focus returns to the button that opened the sheet.
    - At 375 it is a bottom sheet; at 1280 a centered dialog.
  - **More moves:** the row opens the upgrade modal with the coach copy.
  - **Keyboard:** Tab reaches every chip and CTA, each with a visible focus ring.
  - **Console:** `read_console_messages` with `onlyErrors: true` shows no new errors.

- [ ] **Step 6: Preview with the flag off.** Ask the user to remove the flag line locally, or restart without it.
  - Reload at 375 and 1280, and confirm the v1 This Month: greeting, stat strip and focus card.
  - `read_network_requests` with `urlPattern: "dashboard/insights"` shows **no** request.

- [ ] **Step 7: Push and open the PR, after asking the user.** Then:

```bash
git push -u origin feat/dashboard-v2-this-month
```

  Open the PR against `main` with `"/c/Program Files/GitHub CLI/gh.exe" pr create`, titled `feat(dashboard): v2 This Month — readiness, interest, debt-free hero, free move, sheets (PR 3/6)`. The body must include:
  - a summary
  - links to the spec and this plan
  - the decisions list
  - "Flag off: unchanged (snapshot-pinned); no insights request"
  - the baseline gate result line
  - the preview checklist from Steps 5–6, with screenshots described but not attached if they show personal figures
  - a test plan
  - the footer `🤖 Generated with [Claude Code](https://claude.com/claude-code)`

- [ ] **Step 8: Wait for the CodeRabbit/Codex reviews and CI** before merging.
  - Answer each thread: fix it with a new commit, or reply with the reason.
  - Rerun Steps 2–3 after any code change.
  - Merge only when CI is green and both reviews have landed, with a merge commit, as the repo does.

- [ ] **Step 9: After merge, write the PR 4 plan** (My Debts + `inPlan`) from the roadmap row. Carry these items to PR 5:
  - `MoreMovesList` with per-move values
  - the compact `InterestMeter`
  - rate watch on the phone Coach tab
  - whether Free users get the APR call script
  - "Fix it in one tap" for `use_unallocated`

