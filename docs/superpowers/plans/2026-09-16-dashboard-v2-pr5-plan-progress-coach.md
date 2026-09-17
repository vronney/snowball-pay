# Dashboard v2 — PR 5: Plan, Progress, Coach Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the v2 tops of the last three tabs behind `DASHBOARD_V2_USERS`: My Plan (segmented strategy control with the comparison pair, the acceleration slider, the what-if row, the red plan-gap closing card), Progress (streak pill, paid-off bar, the 12-cell streak grid with its log CTA, milestones) and Coach (compact interest meter, the free move, rate watch on every width, the priced "more moves" list, the ink closing card; for Pro, every move open with its action, then the existing Pro content). No computed number changes for any user.

**Architecture:**
- Every figure comes from `GET /api/dashboard/insights` (PR 1) or from the same engine calls the v1 tab already makes for its own display. Copy and visibility come from React-free view models in `src/lib/dashboard/{plan,progressTab,coach}.ts`.
- The v1 tabs are reused, not forked. `PayoffTab` gains two optional render slots (`renderTop`, `renderFooter`) that PlanV2 fills; `ProgressTab` gains `showStats`; `IntelligenceTab` and `AprNegotiationCard` gain an optional `openRequest` for the Coach APR action. With the props omitted, each v1 tab renders exactly as today.
- Gated controls are visibly disabled, never blurred (`GatedTile`, `ProChip`), and open the existing `UpgradeModal` through `upgradeEvents`. PR 6 reroutes them to the upgrade sheet.

**Tech Stack:** Next.js 15 App Router, React 18, TypeScript, Tailwind 3.4, TanStack Query 5.28, lucide-react, Vitest 4 with `globals: true`.
- Component tests use a `// @vitest-environment jsdom` header, @testing-library/react 16 and `createElement` (no JSX).
- Test files must be `src/__tests__/**/*.test.ts`.

**Spec:** `docs/superpowers/specs/2026-09-12-dashboard-pro-upgrade-design.md`: §3 (X6, X7, X10), §4, §5.1–§5.2, §8.2–§8.5 (My Plan, Progress, Coach), §9, §10, §12 and §13.
- The parent roadmap is `docs/superpowers/plans/2026-09-12-dashboard-pro-upgrade.md` (PR 5 row).
- The handoff defines the visuals: `~/.gstack/projects/vronney-snowball-pay/designs/dashboard-pro-upgrade-20260912/README.md` §3 "My Plan", §4 "Progress", §5 "Intelligence / Coach", plus "The System" and "Interactions & Behavior". Read it, but never copy it into the repo: its numbers are one real account's data.

## Global Constraints

- **Flag off renders unchanged** (spec §5.3). The PR 2 snapshots in `src/__tests__/components/dashboard-v2/__snapshots__/DashboardClient.flag.test.ts.snap` must pass untouched. **Never run vitest with `-u` / `--update`.** The v1 tabs keep their exact JSX when the new optional props are omitted; the new tests in Tasks 3, 6 and 8 assert that.
- **Flag off never fetches insights.** `PlanV2`, `ProgressV2` and `CoachV2` render only under the flag. They become further callers of `useDashboardInsights`, and React Query dedupes the request.
- **No existing account's numbers change.** This PR touches no engine, plan-math, gates or billing file: `git diff main -- src/lib/payoffPlan.ts src/lib/snowball.ts src/lib/gates.ts src/lib/billing.ts src/lib/monthlyFocusDebt.ts src/lib/actualBalance.ts prisma/` must print nothing (Task 9). Every engine call the v2 tops make is one the v1 tab already makes for the same figure (cited per task).
- **Existing formulas stay existing.** The strategy pair uses `PayoffTab`'s alternative result (`PayoffTab.tsx:265-278`), the what-if rungs use `WhatIfCard`'s call (`calculateResultByMethod` on plan debts), the plan gap is `insights.planGap` (the verbatim Pro formula, spec §13), and progress figures are `insights.progress` (verbatim `ProgressTab` extractions).
- **Hide instead of fake** (spec §4). A card whose figure is null, non-finite or not positive does not render. The plan closing card renders only when behind. A what-if tile renders only when the rung changes months or interest. The coach closing card renders only when the gated moves carry a value.
- **Display rounding:** estimates and savings are floored (`floorDollars` / `floorWhole` in `src/lib/dashboard/format.ts`, or `formatCurrencyWhole` where v1 already uses it for the same figure). Concrete amounts (balances, the plan gap, the acceleration amount, paid-off totals) use `formatCurrency`. The Pro price uses `formatCurrencyWhole(PLANS.pro.price)`.
- **Labels carry the math** (spec §4): "est." on estimates, "avg" on averages, "/yr" on annualized values. Per-year and one-time values are never summed together (X7).
- **Copy states only computed facts** (X6) and uses the spec §8.4 templates verbatim where one exists.
- **DESIGN.md wins over the handoff:**
  - Dashed borders mean only "saved, outside the plan" (DESIGN.md 2026-09-12). Nothing in this PR uses a dashed border. The handoff's dashed "Next payoff" milestone becomes a solid muted card.
  - Ink appears only on closing cards and their CTAs (plus the existing readiness CTA and upgrade rail). The red closing card's CTA is ink.
  - Blue (`action`) appears on CTAs, the acceleration slider fill and figure (progress), and the active strategy segment (an active state). The "Yours" comparison card is tinted as the active choice's readout.
  - Green text uses `text-success-text`; `bg-success` is for fills only (DESIGN.md 2026-09-14).
  - Radii: cards `rounded-xl`, buttons and inputs `rounded-lg`, chips and pills `rounded-full`, the strategy segments `rounded-[9px]` (handoff), streak cells `rounded-[5px]` (handoff).
  - Touch targets are 44px (`min-h-11`), primary CTAs 46px (`min-h-[46px]`).
  - Meters animate once, 0 → value, via `useMeterValue`, and every transition carries `motion-reduce:transition-none`.
- **Tokens, not hexes, in new v2 code:** `bg-bg`, `bg-surface`, `bg-surface-2`, `text-txt`, `text-txt-muted`, `bg-action`, `text-action`, `bg-ink`, `text-ink`, `text-danger`, `border-danger/25`, `border-border`, `bg-success`, `text-success-text`, `bg-warning`, `bg-focus-card`, `border-focus-card-border`, `bg-streak-miss`, `border-streak-miss-border`, `bg-streak-future`, `bg-streak-pill`, `text-streak-pill-text`, `shadow-card`, `shadow-cta-ink`, `shadow-cta-blue`. The one literal allowed is `focus-visible:outline-action`.
- **Use `EYEBROW` plus a color utility, never the `.eyebrow` class.** `EYEBROW`, `CARD`, `CTA_BLUE` and `ERROR_LINE` live in `src/components/dashboard-v2/styles.ts`.
- **Prices:** the price comes only from `PLANS.pro.price` (`src/lib/stripe`). Never write the literal `12` or `144` in product code.
- **Analytics:** `track()` properties pass through `sanitiseAnalyticsProperties`, which redacts numbers outside `SAFE_NUMERIC_KEYS`. Send strings and booleans only, except where an existing event already sends numbers (`what_if_applied`).
- **Sheets** are the PR 3 `Sheet`/`BulkLogSheet`, which write through `useMarkPaid` sequentially. A log sheet is never opened on placeholder-day data (`isPlaceholderData`), and never with zero rows.
- **Git:**
  - Work on branch `feat/dashboard-v2-plan-progress-coach`, created from `main` at `7330cd42`.
  - Use conventional commits, each ending with `-m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"` — that literal line, regardless of which model you are.
  - Never bypass hooks. The local `block-no-verify` hook rejects any Bash command that contains `git commit` together with a `-n`-like token (`echo -n`, `[ -n`, `-ne`). Run each `git commit` as its own command.
  - Never stage the `.snap` (vitest rewrites its stat only), `src/__tests__/setup.ts` or `debug.log`.
  - No database commands, no push, no install, no `npm run build` until Task 9. Leave the running `budget-dev` preview server alone; stop it only for Task 9's build (it holds the Prisma DLL).
- **Pre-existing `tsc` noise:** `src/__tests__/lib/stripe.test.ts` has accepted type errors. Check with `npx tsc --noEmit 2>&1 | grep -v "src/__tests__/lib/stripe.test.ts"`, which must print nothing.
- **Test baseline:** `npm test` passes 1191 tests on `main` at `7330cd42`. Every task must keep the whole suite green and report the new count.

## Decisions made while writing this plan

These need the owner's OK before execution. The spec is patched to match in Task 9.

1. **The APR call script stays Pro.** On Coach, a Free user's `call_apr` move (when it is the free one) reads the same as on This Month: the card, the target rate and the yearly estimate, with no button, exactly as PR 3 decided. The handoff's own words are "What Pro buys is the *script, the steps, and the tracking*", and the script has been a Pro feature since it shipped. This closes the PR 3 carry-over "the APR-script-for-Free decision".
   - *Alternative, not planned:* give Free the filled call script for that one card in a sheet (the hook already fills it per card). It is a product change (giving away today's Pro content), so it needs its own decision; if chosen, it is a follow-up task, not a rewrite of this plan.
2. **One-tap `use_unallocated` lands on Coach.** On Coach the move's CTA is "Apply ${x}/mo", which saves `accelerationAmount = availableCashFlow` with `PayoffTab`'s exact `POST /api/income` payload (the same write the slider makes). This Month keeps "Open My Plan" (PR 3). Pro users get the same button in the open moves list. This closes the PR 3 carry-over "one-tap `use_unallocated`".
3. **PlanV2 is `PayoffTab` with two render slots.** `PayoffTab` gains optional `renderTop(ctx)` and `renderFooter(ctx)`. With `renderTop`, the v1 Strategy card (`StrategySelector` + `StrategyComparison`) and the v1 Cash flow card (`CashFlowOverview` + `WhatIfCard`) are replaced by the v2 top; `CustomPriorityEditor` still renders under it while the method is Custom. Everything from "The projection" down is unchanged, and the v2 slider keeps v1's `id="cash-flow-overview"` so `RollForwardAdvice`'s "review" scroll still lands on it. With both slots omitted, `PayoffTab` renders exactly as today (Task 3's test).
4. **What-if on v2:**
   - Free: three tiles. `+$25` is real (`calculateResultByMethod` on the plan's debts at `adjustedExtra + 25`, the same call `WhatIfCard` makes) and reads via `rungCaption` ("saves $523", "2m sooner · saves $523"). It hides when the rung changes nothing. `+$100` and `Any $` are `GatedTile`s that open `UpgradeModal` with the existing "What-if scenarios" copy.
   - Pro: today's `WhatIfCard` ladder (with apply), then a new any-amount input whose Apply clamps to available cash flow exactly as the ladder does (`ladderHeadroom` / `isRungApplicable`).
   - The handoff caption "One scenario a month is yours. Pro runs any amount, any date, side by side." is trimmed to "One scenario is yours. Pro runs any amount, side by side." — there is no monthly reset and no date feature. Recorded as deviation X11.
5. **The red closing card** (`ClosingCard variant="red"`): "Plan vs actual" · "${gap} behind" · "Balances are ${gap} above where the plan expected by {Month}." The gap is a balance difference, so it uses `formatCurrency`; `{Month}` is the engine label the gap was measured in (`planGap.asOfMonth`, e.g. "Sep 2026"). The figure is 19px extrabold (`text-danger` #EF4444 is 3.8:1 on white, so it passes only as large text, as PR 4's "Not counted" figure does), not the handoff's 13px. CTA order per spec §8.4: "Fix it in one tap" when `availableCashFlow > effectiveAcceleration`, otherwise "Log this month's payments" when `paymentGap.missed.length > 0`, otherwise none. "Fix it" sets the acceleration to the available cash flow through `PayoffTab`'s own debounced save and then shows "Applied — your plan now ends {Month YYYY}." from the recalculated plan.
6. **ProgressV2 = the new top, then `ProgressTab` with `showStats={false}`.** The four v1 stat cards (Total Paid, Remaining, Debts Closed, Tracking Streak) duplicate the new top and are dropped; the chart, `DataInsights`, the v1 milestone badges and `JourneyTab` stay. `MilestoneWidget` above the tab (rendered by `DashboardClient` for both shells) stays. The catch-up card is not rendered (D6).
   - "Keep the streak — log {n}" pre-fills every unlogged active debt this month (missed and not yet due) at its minimum, since the caption counts all unlogged payments. Rows come from the current debts and this month's payment records, like PR 3's sheets.
   - The streak pill sits in the tab's toolbar row, like PR 4's "counted" pill; spec §12 defers header chips.
   - Milestones: "{debt} paid off · {Mon YYYY}" for each paid-off debt, dated from its first snapshot at $0 (no date when there is none); "Next payoff · {debt} · in {formatMonths}" from the plan's schedule, computed with `calculatePlanMetrics` exactly as `DebtsV2` does (`DebtsV2.tsx:77-84`). The "next" card is solid and muted, not dashed.
7. **Coach stacks.** Free: compact interest meter → the free move (no priority chip; the in-card "more moves" row is replaced by the list below) → rate watch (every width) → `MoreMovesList` (heading "{n} more moves found" + Pro chip, then each gated move's title and value, fully readable) → the ink closing card. Pro and trial: compact interest meter → `OpenMovesList` (every move with its action: log → `BulkLogSheet`, apply, switch, or the APR script) → rate watch → the existing `IntelligenceTab` Pro content. `IntelligenceUpgradeTeaser` is not rendered under the flag; the moves and the closing card replace it.
8. **Coach closing copy** (spec §8.4, X7): "Those {n} are worth ${perYear}/yr{, plus ${oneTime} over the plan}{ and {m} months sooner}. Pro is ${price×12}/yr." Each clause appears only when its value floors to ≥ $1 or ≥ 1 month; when the per-year clause is absent the next present clause leads; with only a months clause the sentence is "Those {n} finish your plan {m} months sooner. Pro is $…/yr."; with no clause the card hides. Singular: "That move is worth …" / "Unlock the move" (matching `upgradeRailCopy`).
9. **Analytics (spec §9, PR 5 surfaces):** every move action sends the existing `coach_move_cta {move, gated: false}`; pressing the gated list or the coach closing CTA sends `coach_move_cta {move: 'more_moves', gated: true}`; "Fix it in one tap" sends a new `plan_gap_fix_applied` (no properties); the any-amount Apply sends the existing `what_if_applied` with `WhatIfCard`'s properties.
10. **`AprNegotiationCard` gains `openRequest?: { debtId; nonce }`**, threaded through `IntelligenceTab` as `aprOpenRequest`. When it changes, the card selects that debt, expands and scrolls into view. Omitted (v1), nothing changes.
11. **The strategy control's Custom segment** follows `StrategySelector`'s rule: gated (a `GatedTile` named "Custom — Pro", opening the existing "Custom priority order" modal copy) only once the tier is known to be Free and the saved method is not already Custom; a saved Custom stays usable after a downgrade.

## File Structure

| File | Task | Responsibility |
|---|---|---|
| `src/lib/analyticsEvents.ts` (modify) | 1 | `PLAN_GAP_FIX_APPLIED` |
| `src/lib/dashboard/incomePayload.ts` | 1 | `incomeSavePayload`: PayoffTab's `POST /api/income` payload with one field changed |
| `src/lib/dashboard/thisMonth.ts` (modify) | 1 | `FreeMoveAction` gains `'apply_unallocated'` |
| `src/components/dashboard-v2/ProChip.tsx` | 1 | The "Pro" tag |
| `src/components/dashboard-v2/GatedTile.tsx` | 1 | Visibly-disabled Pro control that opens the upgrade modal |
| `src/components/dashboard-v2/ClosingCard.tsx` (modify) | 1 | `variant="red"` with eyebrow, figure, optional CTA, note |
| `src/components/dashboard-v2/this-month/InterestMeter.tsx` (modify) | 1 | `compact` |
| `src/components/dashboard-v2/this-month/FreeMoveCard.tsx` (modify) | 1 | `showPriority` |
| `src/lib/dashboard/plan.ts` | 2 | My Plan view models: strategy pair, acceleration, what-if tiles, any amount, plan closing |
| `src/components/tabs/PayoffTab.tsx` (modify) | 3 | `renderTop`, `renderFooter`, `PlanTopContext` |
| `src/components/dashboard-v2/plan/StrategyControl.tsx` | 4 | Segmented control + comparison pair + caption |
| `src/components/dashboard-v2/plan/AccelerationCard.tsx` | 4 | The slider |
| `src/components/dashboard-v2/plan/WhatIfTiles.tsx` | 4 | Free: +$25 real, +$100 and Any $ gated |
| `src/components/dashboard-v2/plan/WhatIfAnyAmount.tsx` | 4 | Pro: any-amount input with Apply |
| `src/components/dashboard-v2/plan/PlanV2.tsx` | 4 | The tab: `PayoffTab` with the v2 top and the red closing card |
| `src/components/DashboardClient.tsx` (modify) | 4, 6, 8 | Flag switches for plan, progress, intelligence |
| `src/lib/dashboard/progressTab.ts` | 5 | Progress view models: pill, paid-off, grid caption, milestones, unlogged rows |
| `src/components/tabs/ProgressTab.tsx` (modify) | 6 | `showStats` |
| `src/components/dashboard-v2/progress/StreakGrid.tsx` | 6 | 12 cells |
| `src/components/dashboard-v2/progress/PaidOffCard.tsx` | 6 | Figure + bar |
| `src/components/dashboard-v2/progress/MilestonesCard.tsx` | 6 | Paid-off and next-payoff rows |
| `src/components/dashboard-v2/progress/ProgressV2.tsx` | 6 | The tab |
| `src/lib/dashboard/coach.ts` | 7 | Coach view models: free move on Coach, more-moves list, open rows, closing |
| `src/components/AprNegotiationCard.tsx` (modify) | 8 | `openRequest` |
| `src/components/tabs/IntelligenceTab.tsx` (modify) | 8 | `aprOpenRequest` pass-through |
| `src/components/dashboard-v2/coach/MoreMovesList.tsx` | 8 | Free: the priced gated list |
| `src/components/dashboard-v2/coach/OpenMovesList.tsx` | 8 | Pro: every move with its action |
| `src/components/dashboard-v2/coach/CoachV2.tsx` | 8 | The tab |
| Tests: `src/__tests__/lib/dashboard/{incomePayload,plan,progressTab,coach}.test.ts`, `src/__tests__/components/dashboard-v2/{GatedTile,ClosingCard,InterestMeter,PlanV2,StreakGrid,ProgressV2,MoreMovesList,CoachV2,DashboardClient.flag}.test.ts`, `src/__tests__/components/tabs/{PayoffTab.slots,ProgressTab.stats}.test.ts`, `src/__tests__/components/AprNegotiationCard.openRequest.test.ts` | | |

**Shared test fixtures:** `src/__tests__/lib/dashboard/fixtures.ts` already exports `makeDebt`, `makeIncome`, `makeSnapshot`, `makeResult` and the four move makers (`makeLogMissedMove`, `makeCallAprMove`, `makeSwitchMove`, `makeUnallocatedMove`). Use them; don't add a second fixture file.

**Tier constants** used across the tests: `FREE = { proEligible: false, paidPro: false, trial: { active: false, endsAt: null } }` and `PRO = { proEligible: true, paidPro: true, trial: { active: false, endsAt: null } }`.

---

### Task 1: Shared v2 pieces — `ProChip`, `GatedTile`, the red `ClosingCard`, compact `InterestMeter`, `FreeMoveCard.showPriority`, `incomeSavePayload`, the new event

**Files:**
- Create: `src/components/dashboard-v2/ProChip.tsx`, `src/components/dashboard-v2/GatedTile.tsx`, `src/lib/dashboard/incomePayload.ts`
- Modify: `src/components/dashboard-v2/ClosingCard.tsx`, `src/components/dashboard-v2/this-month/InterestMeter.tsx`, `src/components/dashboard-v2/this-month/FreeMoveCard.tsx:1-17`, `src/lib/dashboard/thisMonth.ts` (the `FreeMoveAction` line), `src/lib/analyticsEvents.ts` (after `UPGRADE_MOMENT_CTA`)
- Test: `src/__tests__/lib/dashboard/incomePayload.test.ts` (new), `src/__tests__/components/dashboard-v2/GatedTile.test.ts` (new), `src/__tests__/components/dashboard-v2/InterestMeter.test.ts` (new), `src/__tests__/components/dashboard-v2/ClosingCard.test.ts` (extend), `src/__tests__/components/dashboard-v2/FreeMoveCard.test.ts` (extend)

**Interfaces:**
- Consumes: `upgradeEvents` (`src/lib/upgradeEvents.ts`), `EYEBROW` from `src/components/dashboard-v2/styles.ts`, `Income` from `@/types`, `FreeMoveView` / `FreeMoveAction` from `src/lib/dashboard/thisMonth.ts`.
- Produces:
  - `ProChip` (default export), no props.
  - `GatedTile` (default), props `{ label: string; feature: string; children?: ReactNode; className?: string; onOpen?: () => void }`. Accessible name `"{label} — Pro"`, `aria-disabled="true"`, click → `onOpen?.()` then `upgradeEvents.dispatch(feature)`.
  - `ClosingCard` (default), props `{ children: ReactNode; cta?: string; onCta?: () => void; variant?: 'ink' | 'red'; eyebrow?: string; figure?: string; note?: string }`. Ink with `cta` + `onCta` renders exactly today's markup.
  - `InterestMeter` (default), props `{ view: InterestView; compact?: boolean }`.
  - `FreeMoveCard` (default), props gain `showPriority?: boolean` (default `true`).
  - `FreeMoveAction = 'bulk_log' | 'switch_strategy' | 'open_plan' | 'apply_unallocated'`.
  - `incomeSavePayload(income: Income, patch: { payoffMethod?: 'snowball' | 'avalanche' | 'custom'; accelerationAmount?: number | null }): IncomeSavePayload` where `IncomeSavePayload = { monthlyTakeHome: number; essentialExpenses: number; extraPayment: number; payoffMethod: string; accelerationAmount: number | null }`.
  - `Events.PLAN_GAP_FIX_APPLIED = 'plan_gap_fix_applied'`.

- [ ] **Step 1: Write the failing tests**

`src/__tests__/lib/dashboard/incomePayload.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { incomeSavePayload } from '@/lib/dashboard/incomePayload';
import { makeIncome } from './fixtures';

describe('incomeSavePayload (PayoffTab.tsx:113-119, the Plan tab\'s own write)', () => {
  const income = makeIncome({
    monthlyTakeHome: 4_000, essentialExpenses: 2_000, extraPayment: 50, payoffMethod: 'snowball', accelerationAmount: 200,
  });

  it('carries the four saved fields and changes only the method', () => {
    expect(incomeSavePayload(income, { payoffMethod: 'avalanche' })).toEqual({
      monthlyTakeHome: 4_000, essentialExpenses: 2_000, extraPayment: 50, payoffMethod: 'avalanche', accelerationAmount: 200,
    });
  });

  it('changes only the acceleration, and can clear it to null', () => {
    expect(incomeSavePayload(income, { accelerationAmount: 700 })).toMatchObject({ payoffMethod: 'snowball', accelerationAmount: 700 });
    expect(incomeSavePayload(income, { accelerationAmount: null })).toMatchObject({ payoffMethod: 'snowball', accelerationAmount: null });
  });

  it('defaults a missing method to snowball and a missing acceleration to null, as the Plan tab does', () => {
    const bare = makeIncome({ payoffMethod: undefined, accelerationAmount: undefined });
    expect(incomeSavePayload(bare, {})).toMatchObject({ payoffMethod: 'snowball', accelerationAmount: null });
  });
});
```

`src/__tests__/components/dashboard-v2/GatedTile.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { upgradeEvents } from '@/lib/upgradeEvents';
import GatedTile from '@/components/dashboard-v2/GatedTile';

describe('GatedTile (spec §8.3; README "The System" rule 1)', () => {
  it('is a focusable, visibly disabled control named "{label} — Pro" that opens the upgrade modal', () => {
    const handler = vi.fn();
    const unsubscribe = upgradeEvents.subscribe(handler);
    const onOpen = vi.fn();
    render(createElement(GatedTile, { label: '+$100', feature: 'What-if scenarios', onOpen }));
    const tile = screen.getByRole('button', { name: '+$100 — Pro' });
    expect(tile.getAttribute('aria-disabled')).toBe('true');
    expect(tile.hasAttribute('disabled')).toBe(false);
    expect(tile.textContent).toContain('Pro');
    fireEvent.click(tile);
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith('What-if scenarios');
    unsubscribe();
  });
});
```

`src/__tests__/components/dashboard-v2/InterestMeter.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import InterestMeter from '@/components/dashboard-v2/this-month/InterestMeter';

const view = { figure: '$840', avgLine: '≈$278/mo your plan saves vs minimums (avg)', lenderShare: 75.1 };

describe('InterestMeter', () => {
  it('keeps the This Month figure size by default', () => {
    render(createElement(InterestMeter, { view }));
    expect(screen.getByText('$840').className).toContain('text-[36px]');
  });

  it('shrinks the figure in compact mode and keeps the labelled figures (Coach, spec §8.5)', () => {
    render(createElement(InterestMeter, { view, compact: true }));
    const figure = screen.getByText('$840');
    expect(figure.className).toContain('text-[32px]');
    expect(figure.className).not.toContain('text-[36px]');
    expect(screen.getByText('est.')).toBeTruthy();
    expect(screen.getByText(view.avgLine)).toBeTruthy();
  });
});
```

Append to `src/__tests__/components/dashboard-v2/ClosingCard.test.ts`, inside the existing `describe`:

```ts
  it('renders the red variant with its eyebrow, figure, ink CTA and status note', () => {
    const onCta = vi.fn();
    // eslint-disable-next-line react/no-children-prop -- createElement's props-object form is the only way to type `children` here.
    render(createElement(ClosingCard, {
      variant: 'red', eyebrow: 'Plan vs actual', figure: '$2,621.46 behind', cta: 'Fix it in one tap', onCta,
      note: 'Applied — your plan now ends April 2029.',
      children: 'Balances are $2,621.46 above where the plan expected by Sep 2026.',
    }));
    expect(screen.getByText('Plan vs actual')).toBeTruthy();
    expect(screen.getByText('$2,621.46 behind')).toBeTruthy();
    expect(screen.getByText('Balances are $2,621.46 above where the plan expected by Sep 2026.')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('Applied — your plan now ends April 2029.');
    fireEvent.click(screen.getByRole('button', { name: 'Fix it in one tap' }));
    expect(onCta).toHaveBeenCalledTimes(1);
  });

  it('renders the red variant without a CTA when there is nothing to do', () => {
    // eslint-disable-next-line react/no-children-prop -- see above.
    render(createElement(ClosingCard, { variant: 'red', figure: '$10.00 behind', children: 'Balances are $10.00 above where the plan expected by Sep 2026.' }));
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
  });
```

Append to `src/__tests__/components/dashboard-v2/FreeMoveCard.test.ts`, inside its existing `describe`, using that file's existing `viewFor` helper:

```ts
  it('drops the priority chip on Coach (showPriority false)', () => {
    const view = viewFor([makeLogMissedMove('Sep', 2)]);
    render(createElement(FreeMoveCard, { view, showPriority: false, onAction: vi.fn(), onMoreMoves: vi.fn() }));
    expect(screen.queryByText('High')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Log the 2 missing payments for Sep.' })).toBeTruthy();
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/__tests__/lib/dashboard/incomePayload.test.ts src/__tests__/components/dashboard-v2/GatedTile.test.ts src/__tests__/components/dashboard-v2/InterestMeter.test.ts src/__tests__/components/dashboard-v2/ClosingCard.test.ts src/__tests__/components/dashboard-v2/FreeMoveCard.test.ts`

Expected: FAIL. The two new modules don't exist; the compact meter still renders 36px; the red variant renders the ink markup; the priority chip still renders.

- [ ] **Step 3: Create `src/lib/dashboard/incomePayload.ts`**

```ts
import type { Income } from '@/types';

export interface IncomeSavePayload {
  monthlyTakeHome: number;
  essentialExpenses: number;
  extraPayment: number;
  payoffMethod: string;
  accelerationAmount: number | null;
}

/**
 * The Plan tab's own `POST /api/income` payload (PayoffTab.tsx:113-119) with
 * one field changed. Every one-tap move on Coach and the plan closing card
 * saves through this, so the write is the same one the slider and the method
 * toggle make.
 */
export function incomeSavePayload(
  income: Income,
  patch: { payoffMethod?: 'snowball' | 'avalanche' | 'custom'; accelerationAmount?: number | null },
): IncomeSavePayload {
  return {
    monthlyTakeHome: income.monthlyTakeHome,
    essentialExpenses: income.essentialExpenses,
    extraPayment: income.extraPayment,
    payoffMethod: patch.payoffMethod ?? income.payoffMethod ?? 'snowball',
    accelerationAmount:
      patch.accelerationAmount !== undefined ? patch.accelerationAmount : (income.accelerationAmount ?? null),
  };
}
```

- [ ] **Step 4: Create `src/components/dashboard-v2/ProChip.tsx` and `GatedTile.tsx`**

`ProChip.tsx`:

```tsx
"use client";

/** The tier tag beside a gated control. Decorative: the control's accessible name already says "— Pro". */
export default function ProChip() {
  return (
    <span
      aria-hidden="true"
      className="rounded-md border border-border bg-surface-2 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.06em] text-txt"
    >
      Pro
    </span>
  );
}
```

`GatedTile.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";
import { upgradeEvents } from "@/lib/upgradeEvents";
import ProChip from "./ProChip";

interface GatedTileProps {
  /** The control's visible name, e.g. "+$100" or "Custom". */
  label: string;
  /** UpgradeModal's feature key (getUpgradeMessage), e.g. "What-if scenarios". */
  feature: string;
  /** An optional line under the label. */
  children?: ReactNode;
  className?: string;
  /** Runs before the modal opens (analytics). */
  onOpen?: () => void;
}

/**
 * A Pro-only control (spec §8.3 GatedTile): visibly disabled, never blurred,
 * focusable, named "{label} — Pro". Pressing it opens the upgrade modal
 * (PR 6 routes it to the upgrade sheet). aria-disabled, not disabled, keeps
 * it in the tab order so the name is announced (README "The System", rule 1).
 */
export default function GatedTile({ label, feature, children, className = "", onOpen }: GatedTileProps) {
  return (
    <button
      type="button"
      aria-disabled="true"
      aria-label={`${label} — Pro`}
      onClick={() => {
        onOpen?.();
        upgradeEvents.dispatch(feature);
      }}
      className={`flex min-h-11 flex-col items-start justify-center gap-1 rounded-lg border border-border bg-bg px-3 py-2 text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action ${className}`}
    >
      <span className="flex w-full items-center justify-between gap-2">
        <span className="text-[12px] font-extrabold text-txt-muted">{label}</span>
        <ProChip />
      </span>
      {children}
    </button>
  );
}
```

- [ ] **Step 5: Replace `src/components/dashboard-v2/ClosingCard.tsx`**

The ink branch is today's markup, wrapped in `cta && onCta &&` (both were already required, so the DOM is identical).

```tsx
"use client";

import type { ReactNode } from "react";
import { EYEBROW } from "./styles";

interface ClosingCardProps {
  /** One sentence naming a number the user already owns (README "The System", rule 2). */
  children: ReactNode;
  cta?: string;
  onCta?: () => void;
  /** Ink (default), or the red plan-gap variant (spec §8.3; DESIGN.md 2026-09-12). */
  variant?: "ink" | "red";
  /** Red only: the label and the figure above the sentence. */
  eyebrow?: string;
  figure?: string;
  /** Red only: a status line under the CTA (the new date after "Fix it in one tap"). */
  note?: string;
}

const INK_CTA =
  "mt-3 flex min-h-[46px] w-full items-center justify-center rounded-lg bg-ink px-4 text-[14px] font-extrabold text-white shadow-cta-ink outline-none transition-colors hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action motion-reduce:transition-none";

/** A tab's closing card: ink (My Debts, Coach) or red (My Plan, when behind). */
export default function ClosingCard({ children, cta, onCta, variant = "ink", eyebrow, figure, note }: ClosingCardProps) {
  if (variant === "red") {
    return (
      <section className="rounded-xl border border-danger/25 bg-surface px-3.5 py-[13px] shadow-card">
        {eyebrow && <p className={`${EYEBROW} text-txt-muted`}>{eyebrow}</p>}
        {figure && (
          // 19px extrabold is large text, so danger (3.8:1 on white) passes AA — as PR 4's "Not counted" figure does.
          <p className="mono mt-1 text-[19px] font-extrabold leading-none text-danger">{figure}</p>
        )}
        <p className="mt-2 text-[13px] font-semibold leading-snug text-txt [text-wrap:pretty]">{children}</p>
        {cta && onCta && (
          <button type="button" onClick={onCta} className={INK_CTA}>
            {cta}
          </button>
        )}
        {note && (
          <p role="status" className="mt-2 text-[12px] font-semibold text-success-text [text-wrap:pretty]">{note}</p>
        )}
      </section>
    );
  }
  return (
    <section className="rounded-xl bg-ink px-3.5 py-[13px]">
      <p className="text-[13px] font-bold leading-snug text-white [text-wrap:pretty]">{children}</p>
      {cta && onCta && (
        <button
          type="button"
          onClick={onCta}
          className="mt-3 flex min-h-[46px] w-full items-center justify-center rounded-lg bg-surface px-4 text-[14px] font-extrabold text-ink outline-none transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action motion-reduce:transition-none"
        >
          {cta}
        </button>
      )}
    </section>
  );
}
```

- [ ] **Step 6: Add `compact` to `InterestMeter`**

In `src/components/dashboard-v2/this-month/InterestMeter.tsx`, change the signature and the two class strings. The non-compact strings are today's, character for character.

```tsx
export default function InterestMeter({ view, compact = false }: { view: InterestView; compact?: boolean }) {
  const titleId = useId();
  const share = useMeterValue(view.lenderShare ?? 0);
  return (
    <section
      aria-labelledby={titleId}
      className={compact
        ? "rounded-xl border border-danger/25 bg-surface p-4 shadow-card"
        : "rounded-xl border border-danger/25 bg-surface p-4 shadow-card min-[1024px]:p-5"}
    >
      <h2 id={titleId} className={`${EYEBROW} text-txt-muted`}>Interest going to lenders this month</h2>
      <p className="mt-2 flex items-baseline gap-2">
        <span
          className={compact
            // Coach's compact meter (README §5a): 32px, one size at every width.
            ? "mono text-[32px] font-extrabold leading-none tracking-[-0.03em] text-danger"
            : "mono text-[36px] font-extrabold leading-none tracking-[-0.03em] text-danger min-[1024px]:text-[40px]"}
        >
          {view.figure}
        </span>
        <span className="text-[12px] text-txt-muted">est.</span>
      </p>
```

The rest of the file (the bar and the avg line) is unchanged.

- [ ] **Step 7: Add `showPriority` to `FreeMoveCard` and extend `FreeMoveAction`**

In `src/components/dashboard-v2/this-month/FreeMoveCard.tsx`:

```tsx
interface FreeMoveCardProps {
  view: FreeMoveView;
  onAction: (action: FreeMoveAction) => void;
  onMoreMoves: () => void;
  /** A one-tap action (the strategy switch, the apply) is saving. */
  pending?: boolean;
  error?: string | null;
  /** Coach drops the chip (README §5b: "same card as This Month (d), minus the priority chip"). */
  showPriority?: boolean;
}

export default function FreeMoveCard({
  view, onAction, onMoreMoves, pending = false, error = null, showPriority = true,
}: FreeMoveCardProps) {
```

and wrap the chip:

```tsx
          {showPriority && (
            <span className="rounded-md bg-warning/15 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.06em] text-txt">
              {view.priority}
            </span>
          )}
```

In `src/lib/dashboard/thisMonth.ts`, replace the `FreeMoveAction` line:

```ts
/** `apply_unallocated` is Coach's one-tap for unused cash (PR 5); This Month keeps "Open My Plan". */
export type FreeMoveAction = 'bulk_log' | 'switch_strategy' | 'open_plan' | 'apply_unallocated';
```

`ThisMonthV2.onMoveAction` handles `bulk_log`, `open_plan` and the strategy switch by `move.id`; the new member falls through its `else if` chain as a no-op, so it needs no edit.

- [ ] **Step 8: Add the event**

In `src/lib/analyticsEvents.ts`, after `UPGRADE_MOMENT_CTA: 'upgrade_moment_cta',`:

```ts
  // Dashboard v2 My Plan (spec §9, PR 5). No properties.
  PLAN_GAP_FIX_APPLIED: 'plan_gap_fix_applied',
```

- [ ] **Step 9: Run the tests to verify they pass**

Run: `npx vitest run src/__tests__/lib/dashboard/incomePayload.test.ts src/__tests__/components/dashboard-v2/GatedTile.test.ts src/__tests__/components/dashboard-v2/InterestMeter.test.ts src/__tests__/components/dashboard-v2/ClosingCard.test.ts src/__tests__/components/dashboard-v2/FreeMoveCard.test.ts src/__tests__/components/dashboard-v2/ThisMonthV2.test.ts src/__tests__/components/dashboard-v2/DebtsV2.test.ts`

Expected: PASS, including the untouched ThisMonthV2 and DebtsV2 suites (they render the default variants).

Then `npm run lint` and `npx tsc --noEmit 2>&1 | grep -v "src/__tests__/lib/stripe.test.ts"`: clean.

- [ ] **Step 10: Commit**

```bash
git add src/lib/dashboard/incomePayload.ts src/lib/dashboard/thisMonth.ts src/lib/analyticsEvents.ts src/components/dashboard-v2/ProChip.tsx src/components/dashboard-v2/GatedTile.tsx src/components/dashboard-v2/ClosingCard.tsx src/components/dashboard-v2/this-month/InterestMeter.tsx src/components/dashboard-v2/this-month/FreeMoveCard.tsx src/__tests__/lib/dashboard/incomePayload.test.ts src/__tests__/components/dashboard-v2/GatedTile.test.ts src/__tests__/components/dashboard-v2/InterestMeter.test.ts src/__tests__/components/dashboard-v2/ClosingCard.test.ts src/__tests__/components/dashboard-v2/FreeMoveCard.test.ts
```

```bash
git commit -m "feat(dashboard-v2): shared gated tile, red closing card, compact meter and the income payload helper" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: My Plan view models (pure)

**Files:**
- Create: `src/lib/dashboard/plan.ts`
- Test: `src/__tests__/lib/dashboard/plan.test.ts`

**Interfaces:**
- Consumes: `strategyVerdict` (`src/components/payoff/strategyVerdict.ts`), `ladderHeadroom` / `isRungApplicable` / `rungCaption` (`src/components/payoff/whatIfLadder.ts`), `formatCurrency` / `formatCurrencyWhole` / `formatMonths` (`@/lib/utils`), `PlanGap` (`./types`), `PayoffMethod` / `PayoffResult` (`@/lib/snowball`).
- Produces (all pure, no React):
  - `methodLabel(method: PayoffMethod): string`
  - `strategyPairView({ method, current, alternative }): StrategyPairView | null` with `StrategyPairView = { yours: { label; figure }; other: { label; figure; cheaper: boolean }; caption: string }`
  - `accelerationView(effectiveAcceleration, availableCashFlow): AccelerationView | null` with `AccelerationView = { value: string; max: number; maxLabel: string }`
  - `FREE_WHAT_IF_DELTA = 25`, `GATED_WHAT_IF_DELTA = 100`, `WHAT_IF_CAPTION`
  - `whatIfFreeTile(current, withExtra): WhatIfFreeTile | null` with `WhatIfFreeTile = { label: string; result: string }`
  - `anyAmountView({ delta, current, withExtra, availableCashFlow, effectiveAcceleration }): AnyAmountView | null` with `AnyAmountView = { months: string; interest: string; caption: string; canApply: boolean; nextAcceleration: number }`
  - `planClosingView({ planGap, canFix, missedCount }): PlanClosingView | null` with `PlanClosingView = { eyebrow: string; figure: string; text: string; cta: { kind: 'fix' | 'log'; label: string } | null }`
  - `fixAppliedNote(debtFreeDate: Date): string`

- [ ] **Step 1: Write the failing test** at `src/__tests__/lib/dashboard/plan.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  accelerationView, anyAmountView, fixAppliedNote, planClosingView, strategyPairView, whatIfFreeTile,
} from '@/lib/dashboard/plan';

const result = (months: number, totalInterestPaid: number) => ({ months, totalInterestPaid });

describe('strategyPairView (spec §8.5 My Plan)', () => {
  it('names the pair, marks the cheaper alternative and carries the verdict', () => {
    const view = strategyPairView({ method: 'snowball', current: result(31, 14_824), alternative: result(30, 13_794) });
    expect(view).toMatchObject({
      yours: { label: 'Yours · Snowball', figure: '$14,824' },
      other: { label: 'Avalanche', figure: '$13,794', cheaper: true },
    });
    expect(view?.caption).toContain('Avalanche costs $1,030 less interest');
  });

  it('says so when the current method is already the cheaper one', () => {
    const view = strategyPairView({ method: 'avalanche', current: result(30, 13_794), alternative: result(31, 14_824) });
    expect(view?.other).toMatchObject({ label: 'Snowball', cheaper: false });
    expect(view?.caption).toBe("Your avalanche plan costs $1,030 less interest than snowball would. You're on the cheaper of the two.");
  });

  it('does not call a sub-dollar difference cheaper', () => {
    const view = strategyPairView({ method: 'snowball', current: result(30, 1000.4), alternative: result(30, 1000.1) });
    expect(view?.other.cheaper).toBe(false);
  });

  it('is null for custom ordering or without an alternative', () => {
    expect(strategyPairView({ method: 'custom', current: result(31, 100), alternative: result(30, 90) })).toBeNull();
    expect(strategyPairView({ method: 'snowball', current: result(31, 100), alternative: null })).toBeNull();
  });
});

describe('accelerationView (README §3b)', () => {
  it('formats the amount in cents with the available maximum', () => {
    expect(accelerationView(500, 2506.61)).toEqual({ value: '$500.00', max: 2506.61, maxLabel: '$2,506.61 available' });
  });

  it('is null without available cash flow', () => {
    expect(accelerationView(0, 0)).toBeNull();
    expect(accelerationView(0, Number.NaN)).toBeNull();
  });
});

describe('whatIfFreeTile (README §3c)', () => {
  it('reads the saving from the engine run', () => {
    expect(whatIfFreeTile(result(31, 14_824), result(29, 14_301))).toEqual({ label: '+$25/mo', result: '2m sooner · saves $523' });
    expect(whatIfFreeTile(result(31, 14_824), result(31, 14_700))?.result).toBe('saves $124');
  });

  it('is null when the rung changes nothing (hide, do not fake)', () => {
    expect(whatIfFreeTile(result(31, 100), result(31, 100))).toBeNull();
  });
});

describe('anyAmountView (Pro; WhatIfCard\'s ladder rules)', () => {
  const current = result(31, 14_824);

  it('is applicable within headroom and clamps the next acceleration like the ladder', () => {
    const view = anyAmountView({ delta: 100, current, withExtra: result(27, 13_900), availableCashFlow: 700, effectiveAcceleration: 500 });
    expect(view).toEqual({ months: '2y 3m', interest: '$13,900 interest', caption: '4m sooner · saves $924', canApply: true, nextAcceleration: 600 });
  });

  it('is inert beyond headroom and says what it would need', () => {
    const view = anyAmountView({ delta: 300, current, withExtra: result(20, 10_000), availableCashFlow: 700, effectiveAcceleration: 500 });
    expect(view?.canApply).toBe(false);
    expect(view?.caption).toBe('needs $100 more room');
  });

  it('is null for a non-positive or non-numeric amount', () => {
    const base = { current, withExtra: current, availableCashFlow: 700, effectiveAcceleration: 500 };
    expect(anyAmountView({ delta: 0, ...base })).toBeNull();
    expect(anyAmountView({ delta: -5, ...base })).toBeNull();
    expect(anyAmountView({ delta: Number.NaN, ...base })).toBeNull();
  });
});

describe('planClosingView (spec §8.4 "Plan closing")', () => {
  const behind = { amount: -2621.46, asOfMonth: 'Sep 2026' };

  it('states the gap in cents and offers the one-tap fix first', () => {
    expect(planClosingView({ planGap: behind, canFix: true, missedCount: 2 })).toEqual({
      eyebrow: 'Plan vs actual',
      figure: '$2,621.46 behind',
      text: 'Balances are $2,621.46 above where the plan expected by Sep 2026.',
      cta: { kind: 'fix', label: 'Fix it in one tap' },
    });
  });

  it('falls back to logging when there is no unused cash flow, and to no CTA', () => {
    expect(planClosingView({ planGap: behind, canFix: false, missedCount: 2 })?.cta).toEqual({ kind: 'log', label: "Log this month's payments" });
    expect(planClosingView({ planGap: behind, canFix: false, missedCount: 0 })?.cta).toBeNull();
  });

  it('is null when ahead, on plan, sub-cent, non-finite or without a gap', () => {
    const args = { canFix: true, missedCount: 0 };
    expect(planClosingView({ planGap: { amount: 500, asOfMonth: 'Sep 2026' }, ...args })).toBeNull();
    expect(planClosingView({ planGap: { amount: 0, asOfMonth: 'Sep 2026' }, ...args })).toBeNull();
    expect(planClosingView({ planGap: { amount: -0.001, asOfMonth: 'Sep 2026' }, ...args })).toBeNull();
    expect(planClosingView({ planGap: { amount: Number.NaN, asOfMonth: 'Sep 2026' }, ...args })).toBeNull();
    expect(planClosingView({ planGap: null, ...args })).toBeNull();
  });
});

describe('fixAppliedNote', () => {
  it('names the new month from the engine date', () => {
    expect(fixAppliedNote(new Date(2029, 3, 14))).toBe('Applied — your plan now ends April 2029.');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/__tests__/lib/dashboard/plan.test.ts`
Expected: FAIL — `Cannot find module '@/lib/dashboard/plan'`.

- [ ] **Step 3: Create `src/lib/dashboard/plan.ts`**

```ts
import type { PayoffMethod, PayoffResult } from '@/lib/snowball';
import { formatCurrency, formatCurrencyWhole, formatMonths } from '@/lib/utils';
import { strategyVerdict } from '@/components/payoff/strategyVerdict';
import { isRungApplicable, ladderHeadroom, rungCaption } from '@/components/payoff/whatIfLadder';
import type { PlanGap } from './types';

type ResultTotals = Pick<PayoffResult, 'months' | 'totalInterestPaid'>;

const METHOD_LABEL: Record<PayoffMethod, string> = { snowball: 'Snowball', avalanche: 'Avalanche', custom: 'Custom' };

export function methodLabel(method: PayoffMethod): string {
  return METHOD_LABEL[method];
}

// ── Strategy (spec §8.5 My Plan; README §3a) ──────────────────────────────

export interface StrategyPairView {
  yours: { label: string; figure: string };
  other: { label: string; figure: string; cheaper: boolean };
  /** strategyVerdict's sentence. It already says so when the current method is the cheaper one. */
  caption: string;
}

/**
 * The comparison pair under the control. `alternative` is PayoffTab's own
 * alternative result (PayoffTab.tsx:265-278), so both figures share one
 * basis. Null for custom ordering or when there is no alternative. Figures
 * use formatCurrencyWhole, as v1's StrategyComparison does for the same totals.
 */
export function strategyPairView(args: {
  method: PayoffMethod;
  current: ResultTotals;
  alternative: ResultTotals | null;
}): StrategyPairView | null {
  const { method, current, alternative } = args;
  if (method === 'custom' || !alternative) return null;
  const strategyName = METHOD_LABEL[method];
  const comparisonName = METHOD_LABEL[method === 'avalanche' ? 'snowball' : 'avalanche'];
  return {
    yours: { label: `Yours · ${strategyName}`, figure: formatCurrencyWhole(current.totalInterestPaid) },
    other: {
      label: comparisonName,
      figure: formatCurrencyWhole(alternative.totalInterestPaid),
      // Rounded first, like the verdict: sub-dollar noise is not "cheaper".
      cheaper: Math.round(alternative.totalInterestPaid) < Math.round(current.totalInterestPaid),
    },
    caption: strategyVerdict({
      strategyName,
      comparisonName,
      currentMonths: current.months,
      currentInterest: current.totalInterestPaid,
      comparisonMonths: alternative.months,
      comparisonInterest: alternative.totalInterestPaid,
    }),
  };
}

// ── Acceleration (README §3b) ─────────────────────────────────────────────

export interface AccelerationView { value: string; max: number; maxLabel: string }

/** Null without available cash flow: v1 hides its slider the same way (CashFlowOverview.tsx:64). */
export function accelerationView(effectiveAcceleration: number, availableCashFlow: number): AccelerationView | null {
  if (!Number.isFinite(availableCashFlow) || availableCashFlow <= 0) return null;
  return {
    value: formatCurrency(effectiveAcceleration),
    max: availableCashFlow,
    maxLabel: `${formatCurrency(availableCashFlow)} available`,
  };
}

// ── What-if (README §3c; spec §8.5) ───────────────────────────────────────

export const FREE_WHAT_IF_DELTA = 25;
export const GATED_WHAT_IF_DELTA = 100;
/** Deviation X11: no "a month" (there is no monthly reset) and no "any date" (not a feature). */
export const WHAT_IF_CAPTION = 'One scenario is yours. Pro runs any amount, side by side.';

export interface WhatIfFreeTile { label: string; result: string }

/** The free rung. Null when it changes neither months nor interest: hide, never "no change". */
export function whatIfFreeTile(current: ResultTotals, withExtra: ResultTotals): WhatIfFreeTile | null {
  const savedMonths = current.months - withExtra.months;
  const savedInterest = Math.max(0, current.totalInterestPaid - withExtra.totalInterestPaid);
  if (savedMonths <= 0 && savedInterest <= 0) return null;
  return {
    label: `+$${FREE_WHAT_IF_DELTA}/mo`,
    result: rungCaption({ delta: FREE_WHAT_IF_DELTA, savedMonths, savedInterest }, Infinity, true),
  };
}

export interface AnyAmountView {
  months: string;
  interest: string;
  caption: string;
  canApply: boolean;
  /** WhatIfCard.handleApply's clamp: never above the available cash flow. */
  nextAcceleration: number;
}

/** Pro's any-amount scenario: WhatIfCard's ladder rules (whatIfLadder.ts) for one typed rung. */
export function anyAmountView(args: {
  delta: number;
  current: ResultTotals;
  withExtra: ResultTotals;
  availableCashFlow: number;
  effectiveAcceleration: number;
}): AnyAmountView | null {
  const { delta, current, withExtra, availableCashFlow, effectiveAcceleration } = args;
  if (!Number.isFinite(delta) || delta <= 0) return null;
  const headroom = ladderHeadroom(availableCashFlow, effectiveAcceleration);
  const canApply = isRungApplicable(delta, headroom, true, effectiveAcceleration);
  const savedMonths = current.months - withExtra.months;
  const savedInterest = Math.max(0, current.totalInterestPaid - withExtra.totalInterestPaid);
  return {
    months: formatMonths(withExtra.months),
    interest: `${formatCurrencyWhole(withExtra.totalInterestPaid)} interest`,
    caption: rungCaption({ delta, savedMonths, savedInterest }, headroom, canApply),
    canApply,
    nextAcceleration: Math.min(effectiveAcceleration + delta, availableCashFlow),
  };
}

// ── The red closing card (spec §8.4 "Plan closing") ───────────────────────

export interface PlanClosingView {
  eyebrow: string;
  figure: string;
  text: string;
  cta: { kind: 'fix' | 'log'; label: string } | null;
}

/**
 * Shown only when behind (planGap.amount < 0: usePlannerComputed semantics,
 * positive = ahead). Spec §13 keeps the verbatim formula and shows only this
 * side. The CTA order is the spec's: fix while cash flow is unused, else log
 * while payments are missed, else none. The gap is a balance difference, so
 * it keeps its cents.
 */
export function planClosingView(args: { planGap: PlanGap | null; canFix: boolean; missedCount: number }): PlanClosingView | null {
  const gap = args.planGap;
  if (!gap || !Number.isFinite(gap.amount) || gap.amount >= 0) return null;
  const behind = formatCurrency(-gap.amount);
  if (behind === formatCurrency(0)) return null;
  return {
    eyebrow: 'Plan vs actual',
    figure: `${behind} behind`,
    text: `Balances are ${behind} above where the plan expected by ${gap.asOfMonth}.`,
    cta: args.canFix
      ? { kind: 'fix', label: 'Fix it in one tap' }
      : args.missedCount > 0
        ? { kind: 'log', label: "Log this month's payments" }
        : null,
  };
}

/** After "Fix it in one tap": the recalculated plan's end, formatted as PayoffTab formats the share card's date. */
export function fixAppliedNote(debtFreeDate: Date): string {
  return `Applied — your plan now ends ${debtFreeDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/__tests__/lib/dashboard/plan.test.ts`
Expected: PASS (14 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/dashboard/plan.ts src/__tests__/lib/dashboard/plan.test.ts
```

```bash
git commit -m "feat(dashboard-v2): My Plan view models" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: `PayoffTab` render slots (`renderTop`, `renderFooter`)

**Files:**
- Modify: `src/components/tabs/PayoffTab.tsx` (imports at 3-6, the props interface at 42-48, the body after `handleReviewExtraAmount` at ~409-413, the JSX at 419-473 and after the share-buttons `<div>` at ~623)
- Test: `src/__tests__/components/tabs/PayoffTab.slots.test.ts` (new)

**Interfaces:**
- Consumes: everything `PayoffTab` already computes (`payoffMethod`, `accelerationAmount`, `planResult`, `alternativeMethod`, `alternativeResult`, `availableCashFlow`, `effectiveAcceleration`, `adjustedExtra`, `recurringTotal`, `saveIncome.isPending`).
- Produces: named export `PlanTopContext` and two optional props on `PayoffTab`:

```ts
export interface PlanTopContext {
  payoffMethod: PayoffMethod;
  setPayoffMethod: (method: PayoffMethod) => void;
  /** The saved request; null = use all available cash flow. */
  accelerationAmount: number | null;
  setAccelerationAmount: (amount: number) => void;
  income: Income;
  expenses: Expense[];
  planResult: PayoffResult;
  /** The other ordering on the same basis (PayoffTab.tsx:265-278). Null for custom ordering. */
  alternative: { method: PayoffMethod; result: PayoffResult } | null;
  availableCashFlow: number;
  effectiveAcceleration: number;
  adjustedExtra: number;
  recurringTotal: number;
  saveIsPending: boolean;
}
// props: renderTop?: (ctx: PlanTopContext) => ReactNode; renderFooter?: (ctx: PlanTopContext) => ReactNode
```

- [ ] **Step 1: Write the failing test** at `src/__tests__/components/tabs/PayoffTab.slots.test.ts`:

```ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { render } from '@testing-library/react';
import type { Income } from '@/types';
import { useAllSnapshots, usePaymentRecords, useSaveIncome, useUpdateDebt } from '@/lib/hooks';
import PayoffTab, { type PlanTopContext } from '@/components/tabs/PayoffTab';
import { makeDebt, makeIncome } from '../../lib/dashboard/fixtures';

const { stub } = vi.hoisted(() => ({
  stub: (name: string) => async () => {
    const { createElement: h } = await import('react');
    return { default: () => h('div', { 'data-stub': name }) };
  },
}));

vi.mock('@/lib/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/hooks')>()),
  useUpdateDebt: vi.fn(),
  useSaveIncome: vi.fn(),
  useAllSnapshots: vi.fn(),
  usePaymentRecords: vi.fn(),
}));
vi.mock('@/lib/hooks/useSharePlan', () => ({ useSharePlan: () => ({ generate: vi.fn(), loading: false, copied: false }) }));
vi.mock('@/lib/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/analytics')>()),
  track: vi.fn(),
}));
vi.mock('@/components/payoff/StrategySelector', stub('StrategySelector'));
vi.mock('@/components/payoff/StrategyComparison', stub('StrategyComparison'));
vi.mock('@/components/payoff/CustomPriorityEditor', stub('CustomPriorityEditor'));
vi.mock('@/components/payoff/CashFlowOverview', stub('CashFlowOverview'));
vi.mock('@/components/payoff/WhatIfCard', stub('WhatIfCard'));
vi.mock('@/components/payoff/PayoffSummary', stub('PayoffSummary'));
vi.mock('@/components/payoff/BalanceOverTimeChart', stub('BalanceOverTimeChart'));
vi.mock('@/components/payoff/PayoffTimeline', stub('PayoffTimeline'));
vi.mock('@/components/payoff/PayoffOrderList', stub('PayoffOrderList'));
vi.mock('@/components/payoff/FocusDebtExplainer', stub('FocusDebtExplainer'));
vi.mock('@/components/payoff/RollForwardAdvice', stub('RollForwardAdvice'));
vi.mock('@/components/payoff/StrategyExplanation', stub('StrategyExplanation'));
vi.mock('@/components/payoff/ReferralPrompt', stub('ReferralPrompt'));
vi.mock('@/components/AiRecommendations', stub('AiRecommendations'));
vi.mock('@/components/dashboard/ShareDebtFreeCard', stub('ShareDebtFreeCard'));

// Surplus 4000 − 2000 − 340 in minimums = 1660, so the 500 acceleration is used in full.
const INCOME = makeIncome({ monthlyTakeHome: 4_000, essentialExpenses: 2_000, payoffMethod: 'snowball', accelerationAmount: 500 });
const DEBTS = [
  makeDebt({ id: 'visa', name: 'Visa', balance: 3_000, minimumPayment: 90, interestRate: 24 }),
  makeDebt({ id: 'car', name: 'Car loan', balance: 9_000, minimumPayment: 250, interestRate: 7 }),
];

type Slots = { renderTop?: (ctx: PlanTopContext) => ReactNode; renderFooter?: (ctx: PlanTopContext) => ReactNode };

function renderTab(slots: Slots = {}, income: Income = INCOME) {
  vi.mocked(useUpdateDebt).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as unknown as ReturnType<typeof useUpdateDebt>);
  vi.mocked(useSaveIncome).mockReturnValue({ mutate: vi.fn(), isPending: false, isSuccess: false } as unknown as ReturnType<typeof useSaveIncome>);
  vi.mocked(useAllSnapshots).mockReturnValue({ data: { snapshots: [] } } as unknown as ReturnType<typeof useAllSnapshots>);
  vi.mocked(usePaymentRecords).mockReturnValue({ data: { records: [] } } as unknown as ReturnType<typeof usePaymentRecords>);
  return render(createElement(PayoffTab, { debts: DEBTS, income, expenses: [], isLoading: false, onNavigate: vi.fn(), ...slots }));
}

const has = (container: HTMLElement, name: string) => container.querySelector(`[data-stub="${name}"]`) !== null;

afterEach(() => vi.clearAllMocks());

describe('PayoffTab render slots (dashboard v2, PR 5)', () => {
  it('renders the v1 Strategy and Cash flow cards when no slot is given', () => {
    const { container } = renderTab();
    for (const name of ['StrategySelector', 'StrategyComparison', 'CashFlowOverview', 'WhatIfCard', 'PayoffSummary']) {
      expect(has(container, name), name).toBe(true);
    }
  });

  it('replaces those two cards with renderTop and appends renderFooter, leaving the projection in place', () => {
    const seen: PlanTopContext[] = [];
    const { container } = renderTab({
      renderTop: (ctx) => { seen.push(ctx); return createElement('div', { 'data-stub': 'v2-top' }); },
      renderFooter: () => createElement('div', { 'data-stub': 'v2-footer' }),
    });
    for (const name of ['StrategySelector', 'StrategyComparison', 'CashFlowOverview', 'WhatIfCard']) {
      expect(has(container, name), name).toBe(false);
    }
    expect(has(container, 'v2-top')).toBe(true);
    expect(has(container, 'v2-footer')).toBe(true);
    expect(has(container, 'PayoffSummary')).toBe(true);
    expect(has(container, 'CustomPriorityEditor')).toBe(false);
    const ctx = seen[seen.length - 1];
    expect(ctx.payoffMethod).toBe('snowball');
    expect(ctx.planResult.months).toBeGreaterThan(0);
    expect(ctx.alternative?.method).toBe('avalanche');
    expect(ctx.availableCashFlow).toBe(1_660);
    expect(ctx.effectiveAcceleration).toBe(500);
    expect(ctx.income).toBe(INCOME);
    expect(ctx.saveIsPending).toBe(false);
  });

  it('keeps the custom-order editor under the v2 top while the method is Custom', () => {
    const seen: PlanTopContext[] = [];
    const { container } = renderTab(
      { renderTop: (ctx) => { seen.push(ctx); return createElement('div', { 'data-stub': 'v2-top' }); } },
      makeIncome({ monthlyTakeHome: 4_000, essentialExpenses: 2_000, payoffMethod: 'custom', accelerationAmount: 500 }),
    );
    expect(has(container, 'v2-top')).toBe(true);
    expect(has(container, 'CustomPriorityEditor')).toBe(true);
    expect(seen[seen.length - 1].alternative).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/__tests__/components/tabs/PayoffTab.slots.test.ts`
Expected: the first test passes (v1 already renders those cards); the other two FAIL — `renderTop` is ignored and `PlanTopContext` is not exported.

- [ ] **Step 3: Add the slots to `PayoffTab`**

Imports (lines 3-6): add `type ReactNode` to the React import and `PayoffResult` to the snowball import:

```ts
import { useState, useEffect, useRef, useMemo, type ReactNode } from "react";
import { Debt, Income, Expense } from "@/types";
import { type Tab } from "@/components/dashboard/types";
import { type PayoffMethod, type PayoffResult } from "@/lib/snowball";
```

Replace the props interface (lines 42-48):

```ts
/** What the dashboard v2 top and closing card need from this tab (PR 5). */
export interface PlanTopContext {
  payoffMethod: PayoffMethod;
  setPayoffMethod: (method: PayoffMethod) => void;
  /** The saved request; null = use all available cash flow. */
  accelerationAmount: number | null;
  setAccelerationAmount: (amount: number) => void;
  income: Income;
  expenses: Expense[];
  planResult: PayoffResult;
  /** The other ordering on the same basis (see alternativeResult below). Null for custom ordering. */
  alternative: { method: PayoffMethod; result: PayoffResult } | null;
  availableCashFlow: number;
  effectiveAcceleration: number;
  adjustedExtra: number;
  recurringTotal: number;
  saveIsPending: boolean;
}

interface PayoffTabProps {
  debts: Debt[];
  income: Income | null | undefined;
  expenses: Expense[];
  isLoading: boolean;
  onNavigate: (tab: Tab) => void;
  /**
   * Dashboard v2 (PR 5): replaces the Strategy and Cash flow cards with the
   * v2 top. Custom ordering's editor still renders under it. Omitted = v1.
   */
  renderTop?: (ctx: PlanTopContext) => ReactNode;
  /** Dashboard v2: rendered after the share buttons (the closing card). Omitted = v1. */
  renderFooter?: (ctx: PlanTopContext) => ReactNode;
}
```

Destructure the two new props in the component signature:

```ts
export default function PayoffTab({
  debts,
  income,
  expenses,
  isLoading,
  onNavigate,
  renderTop,
  renderFooter,
}: PayoffTabProps) {
```

After `handleReviewExtraAmount` (before `return (`), build the context. `income` is narrowed to `Income` here by the early return above:

```ts
  const slotContext: PlanTopContext = {
    payoffMethod,
    setPayoffMethod,
    accelerationAmount,
    setAccelerationAmount,
    income,
    expenses,
    planResult,
    alternative: alternativeResult ? { method: alternativeMethod, result: alternativeResult } : null,
    availableCashFlow,
    effectiveAcceleration,
    adjustedExtra,
    recurringTotal,
    saveIsPending: saveIncome.isPending,
  };
```

In the JSX, wrap the existing Strategy and Cash flow `PlanSection`s. The v1 branch is today's JSX moved inside a fragment, character for character (a fragment adds no DOM):

```tsx
    <section id="section-plan" className="space-y-8">
      {renderTop ? (
        <>
          {renderTop(slotContext)}
          {payoffMethod === "custom" && (
            <PlanSection title="Custom order">
              <CustomPriorityEditor
                debts={activeDebts}
                priorityEditorDebts={priorityEditorDebts}
                priorityOpen={priorityOpen}
                hasAnyCustomPriority={hasAnyCustomPriority}
                isPending={updateDebt.isPending}
                onToggle={() => setPriorityOpen((v) => !v)}
                onPriorityChange={(debtId, value) =>
                  void handlePriorityChange(debtId, value)
                }
                onResetPriorities={() => void handleResetPriorities()}
              />
            </PlanSection>
          )}
        </>
      ) : (
        <>
          <PlanSection
            title="Strategy"
            description="Which debt the plan attacks first, and what that ordering costs or saves."
          >
          {/* …today's StrategySelector, StrategyComparison and custom editor, unchanged… */}
          </PlanSection>

          <PlanSection
            title="Cash flow"
            description="What's available each month, and what more would buy you."
          >
          {/* …today's CashFlowOverview and WhatIfCard, unchanged… */}
          </PlanSection>
        </>
      )}

      <PlanSection
        title="The projection"
```

(The two comments above stand for the existing JSX — do not retype it, move it.)

After the share-buttons `<div>` closes and before `{shareCardOpen && (`:

```tsx
      {renderFooter?.(slotContext)}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/__tests__/components/tabs/PayoffTab.slots.test.ts src/__tests__/components/dashboard-v2/DashboardClient.flag.test.ts`
Expected: PASS, the flag snapshots untouched (`PayoffTab` is stubbed there and its v1 render is not part of the snapshot, but run it anyway).

`npm run lint` and the `tsc` check: clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/tabs/PayoffTab.tsx src/__tests__/components/tabs/PayoffTab.slots.test.ts
```

```bash
git commit -m "feat(plan): optional render slots on PayoffTab for the dashboard v2 top and closing card" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: `PlanV2` — strategy control, slider, what-if, the red closing card, and the flag switch

**Files:**
- Create: `src/components/dashboard-v2/plan/StrategyControl.tsx`, `src/components/dashboard-v2/plan/AccelerationCard.tsx`, `src/components/dashboard-v2/plan/WhatIfTiles.tsx`, `src/components/dashboard-v2/plan/WhatIfAnyAmount.tsx`, `src/components/dashboard-v2/plan/PlanV2.tsx`
- Modify: `src/components/DashboardClient.tsx` (imports at ~44-46; the `activeTab === "plan"` block at ~440-448)
- Test: `src/__tests__/components/dashboard-v2/PlanV2.test.ts` (new), `src/__tests__/components/dashboard-v2/DashboardClient.flag.test.ts` (extend)

**Interfaces:**
- Consumes: `PlanTopContext` and the slots (Task 3); `strategyPairView`, `accelerationView`, `whatIfFreeTile`, `anyAmountView`, `planClosingView`, `fixAppliedNote`, `FREE_WHAT_IF_DELTA`, `GATED_WHAT_IF_DELTA`, `WHAT_IF_CAPTION`, `methodLabel` (Task 2); `GatedTile`, `ClosingCard` red (Task 1); `missedPaymentRows` (`src/lib/dashboard/thisMonth.ts`); `BulkLogSheet` (`../sheets/BulkLogSheet`, props `{ title; rows; year; month; onClose }`); `calculateResultByMethod(debts, income, recurringTotal, extra, method)` (`@/lib/payoffPlan`); `isPlanDebt`; `Events.WHAT_IF_APPLIED`, `Events.PLAN_GAP_FIX_APPLIED`.
- Produces:
  - `StrategyControl` (default), props `{ method: PayoffMethod; onChange: (m: PayoffMethod) => void; customOpen: boolean | undefined; pair: StrategyPairView | null }`
  - `AccelerationCard` (default), props `{ view: AccelerationView; value: number; onChange: (amount: number) => void; saving: boolean }`; renders `id="cash-flow-overview"` and a slider named "Apply to Acceleration"
  - `WhatIfTiles` (default), props `{ tile: WhatIfFreeTile }`; named export `WHAT_IF_FEATURE = "What-if scenarios"`
  - `WhatIfAnyAmount` (default), props `{ debts; income; recurringTotal; adjustedExtra; payoffMethod; current: PayoffResult; availableCashFlow; effectiveAcceleration; onApply: (nextAcceleration: number) => void }`
  - `PlanV2` (default), props identical to `PayoffTab`'s five (`debts`, `income`, `expenses`, `isLoading`, `onNavigate`)

- [ ] **Step 1: Write the failing tests**

`src/__tests__/components/dashboard-v2/PlanV2.test.ts`:

```ts
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
  return { default: () => h('div', { 'data-stub': 'WhatIfCard' }) };
});

const FREE = { proEligible: false, paidPro: false, trial: { active: false, endsAt: null } };
const PRO = { proEligible: true, paidPro: true, trial: { active: false, endsAt: null } };
const INCOME = makeIncome({ monthlyTakeHome: 4_000, essentialExpenses: 2_000, payoffMethod: 'snowball', accelerationAmount: 500 });
const DEBTS = [
  makeDebt({ id: 'visa', name: 'Visa', balance: 3_000, minimumPayment: 90, interestRate: 24 }),
  makeDebt({ id: 'car', name: 'Car loan', balance: 9_000, minimumPayment: 250, interestRate: 7 }),
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
    income: INCOME,
    expenses: [],
    planResult: METRICS.result,
    alternative: { method: 'avalanche', result: ALTERNATIVE },
    availableCashFlow: METRICS.availableCashFlow,
    effectiveAcceleration: METRICS.effectiveAcceleration,
    adjustedExtra: METRICS.adjustedExtra,
    recurringTotal: METRICS.recurringTotal,
    saveIsPending: false,
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
  render(createElement(PlanV2, { debts: DEBTS, income: INCOME, expenses: [], isLoading: false, onNavigate: vi.fn() }));
  return ctx;
}

afterEach(() => vi.clearAllMocks());

describe('PlanV2 top (spec §8.5 My Plan)', () => {
  it('renders the segmented control with the comparison pair, and switches through PayoffTab', () => {
    const ctx = renderTab();
    expect(screen.getByRole('button', { name: 'Snowball' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Avalanche' }).getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByText('Yours · Snowball')).toBeTruthy();
    expect(screen.getByText(/Switch above and the whole plan recalculates|You're on the cheaper of the two/)).toBeTruthy();
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
    expect(screen.getByRole('status').textContent).toMatch(/ interest · /);
    fireEvent.click(apply);
    expect(ctx.setAccelerationAmount).toHaveBeenCalledWith(600);
    expect(track).toHaveBeenCalledWith(Events.WHAT_IF_APPLIED, expect.objectContaining({ delta: 100, next_acceleration: 600 }));
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

  it('applies the unused cash flow in one tap and reports the new date', () => {
    const ctx = renderTab({ data: insights({ planGap: BEHIND }) });
    expect(screen.getByText('Plan vs actual')).toBeTruthy();
    expect(screen.getByText('$2,621.46 behind')).toBeTruthy();
    expect(screen.getByText('Balances are $2,621.46 above where the plan expected by Sep 2026.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Fix it in one tap' }));
    expect(ctx.setAccelerationAmount).toHaveBeenCalledWith(1_660);
    expect(track).toHaveBeenCalledWith(Events.PLAN_GAP_FIX_APPLIED);
    expect(screen.getByRole('status').textContent).toMatch(/^Applied — your plan now ends [A-Z][a-z]+ \d{4}\.$/);
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
```

In `src/__tests__/components/dashboard-v2/DashboardClient.flag.test.ts`:
- Stub the new tab next to the other v2 stubs: `vi.mock('@/components/dashboard-v2/plan/PlanV2', stub('PlanV2'));`
- Append to `describe('DashboardClient flag wiring')` (no snapshot; the file's snapshots stay untouched):

```ts
  it('renders My Plan v2 on the plan tab when the flag is on', () => {
    nav.params = new URLSearchParams('tab=plan');
    const html = renderToStaticMarkup(createElement(DashboardClient, { user: USER, dashboardV2: true }));
    expect(html).toContain('data-stub="PlanV2"');
    expect(html).not.toContain('data-stub="PayoffTab"');
  });

  it('keeps v1 My Plan with the flag off', () => {
    nav.params = new URLSearchParams('tab=plan');
    const html = renderToStaticMarkup(createElement(DashboardClient, { user: USER }));
    expect(html).toContain('data-stub="PayoffTab"');
    expect(html).not.toContain('data-stub="PlanV2"');
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/__tests__/components/dashboard-v2/PlanV2.test.ts src/__tests__/components/dashboard-v2/DashboardClient.flag.test.ts`
Expected: FAIL. `PlanV2` doesn't exist; the plan tab ignores the flag. The existing flag tests and the two snapshots still pass.

- [ ] **Step 3: Create `StrategyControl.tsx`**

```tsx
"use client";

import type { PayoffMethod } from "@/lib/snowball";
import { methodLabel, type StrategyPairView } from "@/lib/dashboard/plan";
import GatedTile from "../GatedTile";
import { CARD, EYEBROW } from "../styles";

/** StrategySelector.tsx's feature key: the same UpgradeModal copy. */
const CUSTOM_FEATURE = "Custom priority order";

interface StrategyControlProps {
  method: PayoffMethod;
  onChange: (method: PayoffMethod) => void;
  /**
   * Whether Custom is open to this account. Undefined until the subscription
   * resolves: then Custom is neither gated nor selectable, so a Pro user never
   * sees a flash of "— Pro" (StrategySelector.tsx:16-19).
   */
  customOpen: boolean | undefined;
  pair: StrategyPairView | null;
}

const SEGMENT =
  "flex min-h-11 flex-1 items-center justify-center rounded-[9px] border text-[13px] font-extrabold outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60";
const SEGMENT_ON = "border-action/40 bg-action/10 text-action";
const SEGMENT_OFF = "border-border bg-surface text-txt-muted hover:bg-bg";

/**
 * README §3a: the three-up control, then the comparison pair and its caption.
 * The comparison and the switch are free (the handoff's "deliberate" note);
 * only Custom ordering is gated, exactly as v1's StrategySelector gates it.
 */
export default function StrategyControl({ method, onChange, customOpen, pair }: StrategyControlProps) {
  const segment = (m: PayoffMethod, disabled = false) => (
    <button
      key={m}
      type="button"
      aria-pressed={method === m}
      disabled={disabled}
      onClick={() => onChange(m)}
      className={`${SEGMENT} ${method === m ? SEGMENT_ON : SEGMENT_OFF}`}
    >
      {methodLabel(m)}
    </button>
  );
  // A saved Custom stays usable after a downgrade: the server grandfathers it.
  const customGated = customOpen === false && method !== "custom";
  return (
    <section aria-label="Strategy" className={`${CARD} p-4`}>
      <div className="flex gap-2">
        {segment("snowball")}
        {segment("avalanche")}
        {customGated ? (
          <GatedTile
            label="Custom"
            feature={CUSTOM_FEATURE}
            className="flex-1 !items-center !justify-center !rounded-[9px] !py-0"
          />
        ) : (
          segment("custom", customOpen === undefined && method !== "custom")
        )}
      </div>
      {pair && (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {/* Tinted as the active choice's readout (an active state, DESIGN.md). */}
            <div className="rounded-lg border border-action/30 bg-action/10 px-3 py-2">
              <p className={`${EYEBROW} text-txt-muted`}>{pair.yours.label}</p>
              <p className="mono mt-1 text-[16px] font-extrabold text-txt">{pair.yours.figure}</p>
            </div>
            <div className="rounded-lg border border-border bg-bg px-3 py-2">
              <p className={`${EYEBROW} text-txt-muted`}>{pair.other.label}</p>
              <p className={`mono mt-1 text-[16px] font-extrabold ${pair.other.cheaper ? "text-success-text" : "text-txt"}`}>
                {pair.other.figure}
              </p>
            </div>
          </div>
          <p className="mt-2 text-[12px] leading-[1.5] text-txt-muted [text-wrap:pretty]">{pair.caption}</p>
        </>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Create `AccelerationCard.tsx`**

```tsx
"use client";

import type { AccelerationView } from "@/lib/dashboard/plan";
import { CARD, EYEBROW } from "../styles";

interface AccelerationCardProps {
  view: AccelerationView;
  value: number;
  onChange: (amount: number) => void;
  saving: boolean;
}

/**
 * README §3b: the slider, $0 → available. The same input as v1's
 * (CashFlowOverview.tsx:80-88: step 50, the same state write) and the same
 * id, so RollForwardAdvice's "review" scroll still lands here.
 */
export default function AccelerationCard({ view, value, onChange, saving }: AccelerationCardProps) {
  return (
    <section id="cash-flow-overview" aria-label="Acceleration" className={`${CARD} scroll-mt-24 p-4`}>
      <div className="flex items-center justify-between gap-3">
        <p className={`${EYEBROW} text-txt-muted`}>Extra toward debt each month</p>
        <p className="mono text-[14px] font-extrabold text-action">
          {view.value}
          {saving && <span className="ml-2 text-[10px] font-semibold text-txt-muted">saving…</span>}
        </p>
      </div>
      <input
        type="range"
        aria-label="Apply to Acceleration"
        min={0}
        max={view.max}
        step={50}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="mt-3 w-full cursor-pointer accent-action"
      />
      <div className="mt-1 flex justify-between text-[11px] text-txt-muted">
        <span>$0</span>
        <span>{view.maxLabel}</span>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Create `WhatIfTiles.tsx` and `WhatIfAnyAmount.tsx`**

`WhatIfTiles.tsx`:

```tsx
"use client";

import { GATED_WHAT_IF_DELTA, WHAT_IF_CAPTION, type WhatIfFreeTile } from "@/lib/dashboard/plan";
import GatedTile from "../GatedTile";
import { CARD, EYEBROW } from "../styles";

/** WhatIfCard.tsx's feature key: the same UpgradeModal copy. */
export const WHAT_IF_FEATURE = "What-if scenarios";

/** README §3c on Free: one real rung, two gated tiles. */
export default function WhatIfTiles({ tile }: { tile: WhatIfFreeTile }) {
  return (
    <section aria-label="What if" className={`${CARD} p-4`}>
      <p className={`${EYEBROW} text-txt-muted`}>What if you paid a little more?</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <div className="flex min-h-11 flex-col justify-center rounded-lg border border-focus-card-border bg-focus-card px-3 py-2">
          <p className="text-[11px] font-extrabold text-txt">{tile.label}</p>
          <p className="mt-1 text-[10px] font-bold text-success-text">{tile.result}</p>
        </div>
        <GatedTile label={`+$${GATED_WHAT_IF_DELTA}`} feature={WHAT_IF_FEATURE} />
        <GatedTile label="Any $" feature={WHAT_IF_FEATURE} />
      </div>
      <p className="mt-2 text-[11px] text-txt-muted [text-wrap:pretty]">{WHAT_IF_CAPTION}</p>
    </section>
  );
}
```

`WhatIfAnyAmount.tsx`:

```tsx
"use client";

import { useId, useMemo, useState } from "react";
import type { Debt, Income } from "@/types";
import type { PayoffMethod, PayoffResult } from "@/lib/snowball";
import { calculateResultByMethod } from "@/lib/payoffPlan";
import { isPlanDebt } from "@/lib/monthlyFocusDebt";
import { track, Events } from "@/lib/analytics";
import { anyAmountView } from "@/lib/dashboard/plan";
import { CARD, EYEBROW } from "../styles";

interface WhatIfAnyAmountProps {
  debts: Debt[];
  income: Income;
  recurringTotal: number;
  adjustedExtra: number;
  payoffMethod: PayoffMethod;
  current: PayoffResult;
  availableCashFlow: number;
  effectiveAcceleration: number;
  onApply: (nextAcceleration: number) => void;
}

const APPLY =
  "min-h-11 shrink-0 rounded-lg bg-action px-4 text-[13px] font-extrabold text-white outline-none hover:bg-action/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action disabled:cursor-not-allowed disabled:opacity-60";

/**
 * Pro's "Any $" (spec §8.5): one typed rung, simulated exactly as WhatIfCard's
 * ladder is (calculateResultByMethod on the plan's debts at adjustedExtra +
 * delta, WhatIfCard.tsx:60-66) and applied with the same clamp.
 */
export default function WhatIfAnyAmount({
  debts, income, recurringTotal, adjustedExtra, payoffMethod, current, availableCashFlow, effectiveAcceleration, onApply,
}: WhatIfAnyAmountProps) {
  const inputId = useId();
  const [raw, setRaw] = useState("");
  const delta = raw.trim() === "" ? Number.NaN : Number(raw);
  const planDebts = useMemo(() => debts.filter(isPlanDebt), [debts]);
  const view = useMemo(() => {
    if (!Number.isFinite(delta) || delta <= 0) return null;
    const withExtra = calculateResultByMethod(planDebts, income, recurringTotal, adjustedExtra + delta, payoffMethod);
    return anyAmountView({ delta, current, withExtra, availableCashFlow, effectiveAcceleration });
  }, [delta, planDebts, income, recurringTotal, adjustedExtra, payoffMethod, current, availableCashFlow, effectiveAcceleration]);

  const apply = () => {
    if (!view?.canApply) return;
    // WhatIfCard's event and properties; the sanitiser redacts the numbers, as there.
    track(Events.WHAT_IF_APPLIED, { delta, next_acceleration: view.nextAcceleration });
    onApply(view.nextAcceleration);
  };

  return (
    <section aria-label="Any amount" className={`${CARD} p-4`}>
      <label htmlFor={inputId} className={`${EYEBROW} block text-txt-muted`}>Any amount extra per month</label>
      <div className="mt-2 flex gap-2">
        <input
          id={inputId}
          type="number"
          inputMode="decimal"
          min={1}
          step={1}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="e.g. 75"
          className="mono min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-[14px] font-bold text-txt outline-none focus-visible:outline-2 focus-visible:outline-action"
        />
        <button type="button" onClick={apply} disabled={!view?.canApply} className={APPLY}>
          Apply
        </button>
      </div>
      {view && (
        <p role="status" className="mt-2 text-[12px] text-txt-muted">
          {view.months} · {view.interest} · <span className="font-bold text-success-text">{view.caption}</span>
        </p>
      )}
    </section>
  );
}
```

- [ ] **Step 6: Create `PlanV2.tsx`**

```tsx
"use client";

import { useMemo, useState } from "react";
import type { Debt, Expense, Income } from "@/types";
import type { Tab } from "@/components/dashboard/types";
import { useDashboardInsights, useSubscription } from "@/lib/hooks";
import { track, Events } from "@/lib/analytics";
import { calculateResultByMethod } from "@/lib/payoffPlan";
import { isPlanDebt } from "@/lib/monthlyFocusDebt";
import { shortMonthLabel } from "@/lib/dashboard/format";
import {
  accelerationView, fixAppliedNote, FREE_WHAT_IF_DELTA, planClosingView, strategyPairView, whatIfFreeTile,
} from "@/lib/dashboard/plan";
import { missedPaymentRows, type LogRow } from "@/lib/dashboard/thisMonth";
import type { PlanGap } from "@/lib/dashboard/types";
import PayoffTab, { type PlanTopContext } from "@/components/tabs/PayoffTab";
import WhatIfCard from "@/components/payoff/WhatIfCard";
import ClosingCard from "../ClosingCard";
import BulkLogSheet from "../sheets/BulkLogSheet";
import AccelerationCard from "./AccelerationCard";
import StrategyControl from "./StrategyControl";
import WhatIfAnyAmount from "./WhatIfAnyAmount";
import WhatIfTiles from "./WhatIfTiles";

interface PlanV2Props {
  debts: Debt[];
  income: Income | null | undefined;
  expenses: Expense[];
  isLoading: boolean;
  onNavigate: (tab: Tab) => void;
}

type LogSheet = { rows: LogRow[]; year: number; month: number } | null;

/**
 * My Plan, dashboard v2 (spec §8.5): the v1 PayoffTab with its Strategy and
 * Cash flow cards replaced by the v2 top (control, pair, slider, what-if) and
 * the red plan-gap card closing the tab. Method and acceleration stay
 * PayoffTab's state, so every save is its debounced POST /api/income.
 */
export default function PlanV2({ debts, income, expenses, isLoading, onNavigate }: PlanV2Props) {
  const { data: insights, isPlaceholderData } = useDashboardInsights();
  const { data: subscription } = useSubscription();
  const [logSheet, setLogSheet] = useState<LogSheet>(null);
  // Undefined until either query answers: the what-if row waits rather than
  // flash Free's gated tiles at a Pro account (as v1's selector waits).
  const proEligible = insights?.tier.proEligible ?? subscription?.proEligible;

  const openLog = () => {
    // Placeholder-day data can still name last month (ThisMonthV2's guard).
    if (!insights || isPlaceholderData) return;
    const rows = missedPaymentRows(insights.paymentGap, debts);
    if (rows.length === 0) return;
    setLogSheet({ rows, year: insights.asOf.year, month: insights.asOf.month });
  };

  return (
    <>
      <PayoffTab
        debts={debts}
        income={income}
        expenses={expenses}
        isLoading={isLoading}
        onNavigate={onNavigate}
        renderTop={(ctx) => <PlanTop ctx={ctx} debts={debts} proEligible={proEligible} />}
        renderFooter={(ctx) => (
          <PlanClosing
            ctx={ctx}
            planGap={insights?.planGap ?? null}
            missedCount={insights?.paymentGap?.missed.length ?? 0}
            onLog={openLog}
          />
        )}
      />
      {logSheet && (
        <BulkLogSheet
          title={`Log ${shortMonthLabel(logSheet.month)} payments`}
          rows={logSheet.rows}
          year={logSheet.year}
          month={logSheet.month}
          onClose={() => setLogSheet(null)}
        />
      )}
    </>
  );
}

function PlanTop({ ctx, debts, proEligible }: { ctx: PlanTopContext; debts: Debt[]; proEligible: boolean | undefined }) {
  const pair = strategyPairView({
    method: ctx.payoffMethod,
    current: ctx.planResult,
    alternative: ctx.alternative?.result ?? null,
  });
  const accel = accelerationView(ctx.effectiveAcceleration, ctx.availableCashFlow);
  // The free rung: WhatIfCard's own call (WhatIfCard.tsx:60-66) at +$25.
  const freeTile = useMemo(() => {
    if (proEligible !== false) return null;
    const withExtra = calculateResultByMethod(
      debts.filter(isPlanDebt), ctx.income, ctx.recurringTotal, ctx.adjustedExtra + FREE_WHAT_IF_DELTA, ctx.payoffMethod,
    );
    return whatIfFreeTile(ctx.planResult, withExtra);
  }, [proEligible, debts, ctx.income, ctx.recurringTotal, ctx.adjustedExtra, ctx.payoffMethod, ctx.planResult]);

  return (
    <div className="flex flex-col gap-2.5 min-[769px]:gap-4">
      <StrategyControl
        method={ctx.payoffMethod}
        onChange={ctx.setPayoffMethod}
        customOpen={proEligible === undefined ? undefined : proEligible === true}
        pair={pair}
      />
      {accel && (
        <AccelerationCard view={accel} value={ctx.effectiveAcceleration} onChange={ctx.setAccelerationAmount} saving={ctx.saveIsPending} />
      )}
      {proEligible === true && (
        <>
          <WhatIfCard
            debts={debts}
            income={ctx.income}
            expenses={ctx.expenses}
            adjustedExtra={ctx.adjustedExtra}
            currentMonths={ctx.planResult.months}
            currentInterestPaid={ctx.planResult.totalInterestPaid}
            payoffMethod={ctx.payoffMethod}
            effectiveAcceleration={ctx.effectiveAcceleration}
            availableCashFlow={ctx.availableCashFlow}
            onAccelerationChange={ctx.setAccelerationAmount}
          />
          <WhatIfAnyAmount
            debts={debts}
            income={ctx.income}
            recurringTotal={ctx.recurringTotal}
            adjustedExtra={ctx.adjustedExtra}
            payoffMethod={ctx.payoffMethod}
            current={ctx.planResult}
            availableCashFlow={ctx.availableCashFlow}
            effectiveAcceleration={ctx.effectiveAcceleration}
            onApply={ctx.setAccelerationAmount}
          />
        </>
      )}
      {freeTile && <WhatIfTiles tile={freeTile} />}
    </div>
  );
}

function PlanClosing({
  ctx, planGap, missedCount, onLog,
}: { ctx: PlanTopContext; planGap: PlanGap | null; missedCount: number; onLog: () => void }) {
  const [applied, setApplied] = useState(false);
  const view = planClosingView({ planGap, canFix: ctx.availableCashFlow > ctx.effectiveAcceleration, missedCount });
  if (!view) return null;
  const onCta = () => {
    if (!view.cta) return;
    if (view.cta.kind === "fix") {
      // README "Interactions": apply the unused cash flow. PayoffTab's
      // debounced save writes it, and the plan below recalculates at once.
      track(Events.PLAN_GAP_FIX_APPLIED);
      ctx.setAccelerationAmount(ctx.availableCashFlow);
      setApplied(true);
    } else {
      onLog();
    }
  };
  return (
    <ClosingCard
      variant="red"
      eyebrow={view.eyebrow}
      figure={view.figure}
      cta={view.cta?.label}
      onCta={view.cta ? onCta : undefined}
      note={applied ? fixAppliedNote(ctx.planResult.debtFreeDate) : undefined}
    >
      {view.text}
    </ClosingCard>
  );
}
```

- [ ] **Step 7: Switch the plan tab in `DashboardClient`**

Add the import next to `DebtsV2`:

```ts
import PlanV2 from "@/components/dashboard-v2/plan/PlanV2";
```

Replace the `activeTab === "plan"` block:

```tsx
        {activeTab === "plan" && (dashboardV2 ? (
          <PlanV2
            debts={debts}
            income={income}
            expenses={expenses}
            isLoading={debtsLoading || incomeLoading}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        ) : (
          <PayoffTab
            debts={debts}
            income={income}
            expenses={expenses}
            isLoading={debtsLoading || incomeLoading}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        ))}
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npx vitest run src/__tests__/components/dashboard-v2/PlanV2.test.ts src/__tests__/components/dashboard-v2/DashboardClient.flag.test.ts src/__tests__/components/tabs/PayoffTab.slots.test.ts`
Expected: PASS, snapshots matching without `-u`.

`npm run lint` and the `tsc` check: clean.

- [ ] **Step 9: Commit**

```bash
git add src/components/dashboard-v2/plan src/components/DashboardClient.tsx src/__tests__/components/dashboard-v2/PlanV2.test.ts src/__tests__/components/dashboard-v2/DashboardClient.flag.test.ts
```

```bash
git commit -m "feat(dashboard-v2): My Plan tab — strategy control, slider, what-if row and the plan-gap closing card" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Progress view models (pure)

**Files:**
- Create: `src/lib/dashboard/progressTab.ts`
- Test: `src/__tests__/lib/dashboard/progressTab.test.ts`

**Interfaces:**
- Consumes: `ProgressSummary`, `PaymentGap`, `StreakCell` (`./types`); `activeDebtRows`, `LogRow` (`./thisMonth`); `longMonthLabel`, `shortMonthLabel` (`./format`); `isActiveDebt`; `formatCurrency`, `formatMonths`; `DebtPayoffSchedule` (`@/lib/snowball`); `BalanceSnapshot`, `Debt` (`@/types`).
- Produces (all pure):
  - `streakPill(streak: number): string | null`
  - `paidOffView(progress: ProgressSummary | null): PaidOffView | null` with `PaidOffView = { figure: string; ofLine: string; pct: number }`
  - `gridCaptionView(gap: PaymentGap | null, month: number): GridCaptionView | null` with `GridCaptionView = { unlogged: number; text: string; cta: string }`
  - `unloggedRows(debts, paidDebtIds: ReadonlySet<string>): LogRow[]`
  - `monthLabelFromKey(key: string): string` ("2026-03" → "Mar 2026")
  - `milestonesView(debts, snapshots, schedule): MilestoneRowView[]` with `MilestoneRowView = { kind: 'paidOff' | 'next'; title: string; detail: string | null }`

- [ ] **Step 1: Write the failing test** at `src/__tests__/lib/dashboard/progressTab.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { StreakCell } from '@/lib/dashboard/types';
import {
  gridCaptionView, milestonesView, monthLabelFromKey, paidOffView, streakPill, unloggedRows,
} from '@/lib/dashboard/progressTab';
import { makeDebt, makeSnapshot } from './fixtures';

const grid: StreakCell[] = [];

describe('streakPill (README §4)', () => {
  it('names the streak, and hides under one month', () => {
    expect(streakPill(7)).toBe('7-month streak');
    expect(streakPill(1)).toBe('1-month streak');
    expect(streakPill(0)).toBeNull();
    expect(streakPill(Number.NaN)).toBeNull();
  });
});

describe('paidOffView (README §4a; insights.progress is ProgressTab\'s own totals)', () => {
  it('states paid and starting totals in cents with the share', () => {
    expect(paidOffView({ paidToDate: 5_088, startingTotal: 51_652, streak: 7, grid })).toEqual({
      figure: '$5,088.00', ofLine: 'of $51,652.00', pct: (5_088 / 51_652) * 100,
    });
  });

  it('caps at 100%, floors negative paid at 0, and hides without a starting total', () => {
    expect(paidOffView({ paidToDate: 900, startingTotal: 800, streak: 0, grid })?.pct).toBe(100);
    expect(paidOffView({ paidToDate: -5, startingTotal: 800, streak: 0, grid })?.figure).toBe('$0.00');
    expect(paidOffView({ paidToDate: 0, startingTotal: 0, streak: 0, grid })).toBeNull();
    expect(paidOffView(null)).toBeNull();
  });
});

describe('gridCaptionView (spec §8.4 "Progress")', () => {
  const gap = (logged: number, expected: number) => ({ expected, logged, missed: [], missedMinimums: 0, notYetDue: expected - logged });

  it('counts every unlogged payment this month', () => {
    expect(gridCaptionView(gap(3, 9), 8)).toEqual({
      unlogged: 6, text: '6 of 9 September payments still unlogged.', cta: 'Keep the streak — log 6',
    });
  });

  it('is null once everything is logged, or without a gap', () => {
    expect(gridCaptionView(gap(9, 9), 8)).toBeNull();
    expect(gridCaptionView(null, 8)).toBeNull();
  });
});

describe('unloggedRows', () => {
  it('lists active debts without a record this month at their minimums', () => {
    const debts = [
      makeDebt({ id: 'a', name: 'Visa', balance: 900, minimumPayment: 25 }),
      makeDebt({ id: 'b', name: 'Car', balance: 9_000, minimumPayment: 310 }),
      makeDebt({ id: 'c', name: 'Old', balance: 0, minimumPayment: 40 }),
    ];
    expect(unloggedRows(debts, new Set(['a']))).toEqual([{ debtId: 'b', name: 'Car', amount: 310 }]);
  });
});

describe('monthLabelFromKey', () => {
  it('reads the key without a Date, so no time zone can move it', () => {
    expect(monthLabelFromKey('2026-03')).toBe('Mar 2026');
    expect(monthLabelFromKey('2026-12')).toBe('Dec 2026');
    expect(monthLabelFromKey('nope')).toBe('nope');
  });
});

describe('milestonesView (README §4d)', () => {
  const debts = [
    makeDebt({ id: 'caraway', name: 'Caraway', balance: 0, minimumPayment: 0 }),
    makeDebt({ id: 'old', name: 'Old card', balance: 0, minimumPayment: 0 }),
    makeDebt({ id: 'c1', name: 'CreditOne 6610', balance: 400, minimumPayment: 25 }),
    makeDebt({ id: 'c2', name: 'CreditOne 8959', balance: 2_000, minimumPayment: 60 }),
  ];
  const snapshots = [
    makeSnapshot('caraway', '2026-02', 120), makeSnapshot('caraway', '2026-03', 0), makeSnapshot('caraway', '2026-04', 0),
  ];
  const schedule = [{ debtId: 'c2', monthPaidOff: 11 }, { debtId: 'c1', monthPaidOff: 3 }, { debtId: 'caraway', monthPaidOff: 0 }];

  it('dates a payoff from its first $0 snapshot, leaves it undated otherwise, and names the next payoff from the schedule', () => {
    expect(milestonesView(debts, snapshots, schedule)).toEqual([
      { kind: 'paidOff', title: 'Caraway paid off', detail: 'Mar 2026' },
      { kind: 'paidOff', title: 'Old card paid off', detail: null },
      { kind: 'next', title: 'Next payoff · CreditOne 6610', detail: 'in 3m' },
    ]);
  });

  it('is empty with nothing paid off and no schedule', () => {
    expect(milestonesView([debts[2]], [], [])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/__tests__/lib/dashboard/progressTab.test.ts`
Expected: FAIL — `Cannot find module '@/lib/dashboard/progressTab'`.

- [ ] **Step 3: Create `src/lib/dashboard/progressTab.ts`**

```ts
import type { BalanceSnapshot, Debt } from '@/types';
import type { DebtPayoffSchedule } from '@/lib/snowball';
import { isActiveDebt } from '@/lib/monthlyFocusDebt';
import { formatCurrency, formatMonths } from '@/lib/utils';
import { longMonthLabel, shortMonthLabel } from './format';
import { activeDebtRows, type LogRow } from './thisMonth';
import type { PaymentGap, ProgressSummary } from './types';

// ── The streak pill and the paid-off bar (README §4; spec §8.4 "Progress") ─

/** "{n}-month streak". Null under one month: there is nothing to protect yet. */
export function streakPill(streak: number): string | null {
  if (!Number.isFinite(streak) || streak < 1) return null;
  return `${streak}-month streak`;
}

export interface PaidOffView { figure: string; ofLine: string; pct: number }

/**
 * insights.progress carries ProgressTab's verbatim totals (progress.ts), so
 * the figure is the same one v1's "Total Paid" shows. Null without a starting
 * total. Concrete amounts, so cents.
 */
export function paidOffView(progress: ProgressSummary | null): PaidOffView | null {
  if (
    !progress
    || !Number.isFinite(progress.startingTotal)
    || progress.startingTotal <= 0
    || !Number.isFinite(progress.paidToDate)
  ) {
    return null;
  }
  const paid = Math.max(0, progress.paidToDate);
  return {
    figure: formatCurrency(paid),
    ofLine: `of ${formatCurrency(progress.startingTotal)}`,
    pct: Math.min(100, (paid / progress.startingTotal) * 100),
  };
}

// ── The grid caption and its CTA ──────────────────────────────────────────

export interface GridCaptionView { unlogged: number; text: string; cta: string }

/** month: 0-11. Null when nothing is unlogged (the current cell is complete). */
export function gridCaptionView(gap: PaymentGap | null, month: number): GridCaptionView | null {
  if (!gap) return null;
  const unlogged = gap.expected - gap.logged;
  if (unlogged < 1) return null;
  return {
    unlogged,
    text: `${unlogged} of ${gap.expected} ${longMonthLabel(month)} payments still unlogged.`,
    cta: `Keep the streak — log ${unlogged}`,
  };
}

/**
 * "Keep the streak": every active debt without a payment record this month,
 * at its minimum. Built from the current debts and records, like the This
 * Month sheets, so a stale insights copy can't log a paid-off debt.
 */
export function unloggedRows(
  debts: ReadonlyArray<Pick<Debt, 'id' | 'name' | 'balance' | 'minimumPayment'>>,
  paidDebtIds: ReadonlySet<string>,
): LogRow[] {
  return activeDebtRows(debts).filter((row) => !paidDebtIds.has(row.debtId));
}

/** "2026-03" → "Mar 2026", read from the key itself so no time zone can move the month. */
export function monthLabelFromKey(key: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) return key;
  return `${shortMonthLabel(Number(match[2]) - 1)} ${match[1]}`;
}

// ── Milestones (README §4d) ───────────────────────────────────────────────

export interface MilestoneRowView { kind: 'paidOff' | 'next'; title: string; detail: string | null }

/**
 * "{debt} paid off · {Mon YYYY}" from the first month a debt's snapshot
 * reached $0 (no date when there is none), latest first; then "Next payoff ·
 * {debt} · in {months}" from the plan's schedule.
 */
export function milestonesView(
  debts: ReadonlyArray<Pick<Debt, 'id' | 'name' | 'balance'>>,
  snapshots: ReadonlyArray<Pick<BalanceSnapshot, 'debtId' | 'balance' | 'recordedAt'>>,
  schedule: ReadonlyArray<Pick<DebtPayoffSchedule, 'debtId' | 'monthPaidOff'>>,
): MilestoneRowView[] {
  const zeroMonthById = new Map<string, string>();
  for (const s of [...snapshots].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))) {
    if (s.balance <= 0 && !zeroMonthById.has(s.debtId)) zeroMonthById.set(s.debtId, s.recordedAt.slice(0, 7));
  }
  const paidOff = debts
    .filter((d) => !isActiveDebt(d))
    .map((d) => ({ name: d.name, month: zeroMonthById.get(d.id) ?? null }))
    // Latest payoff first; undated last.
    .sort((a, b) => (b.month ?? '').localeCompare(a.month ?? ''))
    .map((d): MilestoneRowView => ({
      kind: 'paidOff',
      title: `${d.name} paid off`,
      detail: d.month ? monthLabelFromKey(d.month) : null,
    }));

  const nameById = new Map(debts.map((d) => [d.id, d.name]));
  const activeIds = new Set(debts.filter(isActiveDebt).map((d) => d.id));
  const next = schedule
    .filter((s) => activeIds.has(s.debtId) && s.monthPaidOff > 0)
    .sort((a, b) => a.monthPaidOff - b.monthPaidOff)[0];
  const nextRow: MilestoneRowView[] = next
    ? [{ kind: 'next', title: `Next payoff · ${nameById.get(next.debtId) ?? ''}`, detail: `in ${formatMonths(next.monthPaidOff)}` }]
    : [];
  return [...paidOff, ...nextRow];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/__tests__/lib/dashboard/progressTab.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/dashboard/progressTab.ts src/__tests__/lib/dashboard/progressTab.test.ts
```

```bash
git commit -m "feat(dashboard-v2): Progress view models" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: `ProgressV2` — pill, paid-off bar, streak grid, milestones, `ProgressTab.showStats`, and the flag switch

**Files:**
- Create: `src/components/dashboard-v2/progress/StreakGrid.tsx`, `src/components/dashboard-v2/progress/PaidOffCard.tsx`, `src/components/dashboard-v2/progress/MilestonesCard.tsx`, `src/components/dashboard-v2/progress/ProgressV2.tsx`
- Modify: `src/components/tabs/ProgressTab.tsx` (props at 38-44, the signature at 211-217, the stat grid at 369-401), `src/components/DashboardClient.tsx` (import; the `activeTab === "progress"` block at ~449-457)
- Test: `src/__tests__/components/tabs/ProgressTab.stats.test.ts` (new), `src/__tests__/components/dashboard-v2/StreakGrid.test.ts` (new), `src/__tests__/components/dashboard-v2/ProgressV2.test.ts` (new), `src/__tests__/components/dashboard-v2/DashboardClient.flag.test.ts` (extend)

**Interfaces:**
- Consumes: Task 5's view models; `StreakCell` / `StreakCellState` (`src/lib/dashboard/types.ts`); `useMeterValue` (`../useMeterValue`); `calculatePlanMetrics` (as `DebtsV2.tsx:77-84` calls it); `useAllSnapshots` (`{ snapshots }`), `usePaymentRecords(year, month)` (`{ records: { debtId }[] }`), `useDashboardInsights`; `BulkLogSheet`.
- Produces:
  - `ProgressTab` prop `showStats?: boolean` (default `true`)
  - `StreakGrid` (default), props `{ cells: ReadonlyArray<StreakCell> }`; a `<ul aria-label="Payment months">` of 12 `<li data-state aria-label="{Mon YYYY}: {state}">`
  - `PaidOffCard` (default), props `{ view: PaidOffView }`
  - `MilestonesCard` (default), props `{ rows: ReadonlyArray<MilestoneRowView> }`
  - `ProgressV2` (default), props identical to `ProgressTab`'s five

- [ ] **Step 1: Write the failing tests**

`src/__tests__/components/tabs/ProgressTab.stats.test.ts`:

```ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import { useAllSnapshots } from '@/lib/hooks';
import ProgressTab from '@/components/tabs/ProgressTab';
import { makeDebt, makeIncome } from '../../lib/dashboard/fixtures';

const { stub } = vi.hoisted(() => ({
  stub: (name: string) => async () => {
    const { createElement: h } = await import('react');
    return { default: () => h('div', { 'data-stub': name }) };
  },
}));

vi.mock('@/lib/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/hooks')>()),
  useAllSnapshots: vi.fn(),
}));
vi.mock('@/components/progress/DataInsights', stub('DataInsights'));
vi.mock('@/components/tabs/JourneyTab', stub('JourneyTab'));
// Every name ProgressTab imports from recharts (ProgressTab.tsx:9-23) as an inert stub.
vi.mock('recharts', async () => {
  const { createElement: h } = await import('react');
  const Stub = () => h('div', { 'data-stub': 'recharts' });
  return { ResponsiveContainer: Stub, LineChart: Stub, Line: Stub, XAxis: Stub, YAxis: Stub, CartesianGrid: Stub, Tooltip: Stub };
});

const DEBTS = [makeDebt({ id: 'visa', name: 'Visa', balance: 900, originalBalance: 1_000, minimumPayment: 25 })];

function renderTab(showStats?: boolean) {
  vi.mocked(useAllSnapshots).mockReturnValue({ data: { snapshots: [] }, isLoading: false } as unknown as ReturnType<typeof useAllSnapshots>);
  render(createElement(ProgressTab, {
    debts: DEBTS, income: makeIncome(), expenses: [], isLoading: false, onNavigate: vi.fn(),
    ...(showStats === undefined ? {} : { showStats }),
  }));
}

afterEach(() => vi.clearAllMocks());

describe('ProgressTab.showStats (dashboard v2, PR 5)', () => {
  it('renders the four stat cards by default (v1)', () => {
    renderTab();
    for (const label of ['Total Paid', 'Remaining', 'Debts Closed', 'Tracking Streak']) {
      expect(screen.getByText(label), label).toBeTruthy();
    }
    expect(screen.getByText('Milestones')).toBeTruthy();
  });

  it('drops the stat cards with showStats false and keeps everything else', () => {
    renderTab(false);
    for (const label of ['Total Paid', 'Remaining', 'Debts Closed', 'Tracking Streak']) {
      expect(screen.queryByText(label), label).toBeNull();
    }
    expect(screen.getByText('Milestones')).toBeTruthy();
    expect(document.querySelector('[data-stub="DataInsights"]')).not.toBeNull();
    expect(document.querySelector('[data-stub="JourneyTab"]')).not.toBeNull();
  });
});
```

If `ProgressTab` imports a recharts name the stub above omits, add it to the returned object rather than loosening the test.

`src/__tests__/components/dashboard-v2/StreakGrid.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import { computeStreakGrid } from '@/lib/dashboard/streakGrid';
import StreakGrid from '@/components/dashboard-v2/progress/StreakGrid';

const TODAY = new Date(2026, 8, 12);
const gap = (logged: number, expected: number) => ({ expected, logged, missed: [], missedMinimums: 0, notYetDue: expected - logged });

describe('StreakGrid (README §4b; D10)', () => {
  it('renders one named cell per month with its state', () => {
    const cells = computeStreakGrid(new Set(['2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08']), gap(3, 9), TODAY);
    render(createElement(StreakGrid, { cells }));
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(12);
    expect(items[0].getAttribute('aria-label')).toBe('Jan 2026: before you started');
    expect(items[1].getAttribute('aria-label')).toBe('Feb 2026: logged');
    expect(items[8].getAttribute('aria-label')).toBe('Sep 2026: in progress');
    expect(items[8].className).toContain('bg-warning');
    expect(items[9].getAttribute('aria-label')).toBe('Oct 2026: upcoming');
  });

  it('draws a missed month red, completes the current month green, and never dashes anything', () => {
    const cells = computeStreakGrid(new Set(['2026-05', '2026-06', '2026-08']), gap(9, 9), TODAY);
    render(createElement(StreakGrid, { cells }));
    const items = screen.getAllByRole('listitem');
    const july = items.find((li) => li.getAttribute('data-state') === 'missed');
    expect(july?.getAttribute('aria-label')).toBe('Jul 2026: missed');
    expect(july?.className).toContain('bg-streak-miss');
    expect(items[8].getAttribute('aria-label')).toBe('Sep 2026: logged');
    expect(items[8].className).toContain('bg-success');
    expect(document.body.innerHTML).not.toContain('dashed');
  });
});
```

`src/__tests__/components/dashboard-v2/ProgressV2.test.ts`:

```ts
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { DashboardInsights } from '@/lib/dashboard/types';
import { computeStreakGrid } from '@/lib/dashboard/streakGrid';
import { useAllSnapshots, useDashboardInsights, useMarkPaid, usePaymentRecords } from '@/lib/hooks';
import ProgressV2 from '@/components/dashboard-v2/progress/ProgressV2';
import { makeDebt, makeIncome, makeSnapshot } from '../../lib/dashboard/fixtures';

const tabProps = vi.hoisted(() => ({ last: null as null | Record<string, unknown> }));

vi.mock('@/lib/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/hooks')>()),
  useDashboardInsights: vi.fn(),
  useAllSnapshots: vi.fn(),
  usePaymentRecords: vi.fn(),
  useMarkPaid: vi.fn(),
}));
// v1 is covered by ProgressTab.stats.test.ts; here it only records its props.
vi.mock('@/components/tabs/ProgressTab', async () => {
  const { createElement: h } = await import('react');
  return {
    default: (p: Record<string, unknown>) => {
      tabProps.last = p;
      return h('div', { 'data-stub': 'ProgressTab' });
    },
  };
});

const FREE = { proEligible: false, paidPro: false, trial: { active: false, endsAt: null } };
const TODAY = new Date(2026, 8, 15, 12, 0);
const INCOME = makeIncome({ monthlyTakeHome: 4_000, essentialExpenses: 2_000, accelerationAmount: 200 });
const DEBTS = [
  makeDebt({ id: 'caraway', name: 'Caraway', balance: 0, minimumPayment: 0 }),
  makeDebt({ id: 'visa', name: 'Visa', balance: 400, originalBalance: 1_000, minimumPayment: 25, interestRate: 24 }),
  makeDebt({ id: 'car', name: 'Car loan', balance: 9_000, minimumPayment: 300, interestRate: 7 }),
];
const SNAPSHOTS = [makeSnapshot('caraway', '2026-02', 120), makeSnapshot('caraway', '2026-03', 0), makeSnapshot('visa', '2026-08', 450)];
const GAP = { expected: 2, logged: 0, missed: [{ debtId: 'visa', minimumPayment: 25 }], missedMinimums: 25, notYetDue: 1 };

function insights(overrides: Partial<DashboardInsights> = {}): DashboardInsights {
  return {
    asOf: { year: 2026, month: 8, day: 15 },
    tier: FREE,
    readiness: { steps: [], completeCount: 0, percent: 0 },
    interest: null,
    paymentGap: GAP,
    coachMoves: [],
    rateWatch: null,
    strategy: null,
    planGap: null,
    progress: {
      paidToDate: 600, startingTotal: 10_000, streak: 7,
      grid: computeStreakGrid(new Set(['2026-02', '2026-03', '2026-08']), GAP, TODAY),
    },
    plan: null,
    uncounted: null,
    ...overrides,
  };
}

type Options = { data?: DashboardInsights | undefined; records?: Array<{ debtId: string }>; placeholder?: boolean };

function renderTab(options: Options = {}) {
  const data = 'data' in options ? options.data : insights();
  vi.mocked(useDashboardInsights).mockReturnValue(
    { data, isPlaceholderData: options.placeholder ?? false } as unknown as ReturnType<typeof useDashboardInsights>,
  );
  vi.mocked(useAllSnapshots).mockReturnValue({ data: { snapshots: SNAPSHOTS } } as unknown as ReturnType<typeof useAllSnapshots>);
  vi.mocked(usePaymentRecords).mockReturnValue({ data: { records: options.records ?? [] } } as unknown as ReturnType<typeof usePaymentRecords>);
  vi.mocked(useMarkPaid).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as unknown as ReturnType<typeof useMarkPaid>);
  render(createElement(ProgressV2, { debts: DEBTS, income: INCOME, expenses: [], isLoading: false, onNavigate: vi.fn() }));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(TODAY);
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('ProgressV2 (spec §8.5 Progress)', () => {
  it('renders the pill, the paid-off bar, the grid, the caption and the milestones, then v1 without its stat cards', () => {
    renderTab();
    expect(screen.getByText('7-month streak')).toBeTruthy();
    expect(screen.getByText('Paid off since you started')).toBeTruthy();
    expect(screen.getByText('$600.00')).toBeTruthy();
    expect(screen.getByText('of $10,000.00')).toBeTruthy();
    expect(within(screen.getByRole('list', { name: 'Payment months' })).getAllByRole('listitem')).toHaveLength(12);
    expect(screen.getByText('2 of 2 September payments still unlogged.')).toBeTruthy();
    expect(screen.getByText('Caraway paid off')).toBeTruthy();
    expect(screen.getByText('Mar 2026')).toBeTruthy();
    expect(screen.getByText('Next payoff · Visa')).toBeTruthy();
    expect(screen.getByText(/^in \d+m$/)).toBeTruthy();
    expect(document.querySelector('[data-stub="ProgressTab"]')).not.toBeNull();
    expect(tabProps.last?.showStats).toBe(false);
    expect(document.body.innerHTML).not.toContain('dashed');
  });

  it('"Keep the streak" opens the log sheet with every unlogged active debt at its minimum', () => {
    renderTab({ records: [{ debtId: 'car' }] });
    fireEvent.click(screen.getByRole('button', { name: 'Keep the streak — log 2' }));
    const dialog = screen.getByRole('dialog', { name: 'Log Sep payments' });
    expect(within(dialog).getByText('Visa')).toBeTruthy();
    expect(within(dialog).queryByText('Car loan')).toBeNull();
    expect(within(dialog).queryByText('Caraway')).toBeNull();
  });

  it('hides the caption and CTA once everything is logged', () => {
    renderTab({ data: insights({ paymentGap: { expected: 2, logged: 2, missed: [], missedMinimums: 0, notYetDue: 0 } }) });
    expect(screen.queryByText(/still unlogged/)).toBeNull();
    expect(screen.queryByRole('button', { name: /Keep the streak/ })).toBeNull();
  });

  it('never opens the sheet on placeholder-day data', () => {
    renderTab({ placeholder: true });
    fireEvent.click(screen.getByRole('button', { name: 'Keep the streak — log 2' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders only v1 while insights are missing or carry no progress', () => {
    renderTab({ data: insights({ progress: null }) });
    expect(screen.queryByText(/streak$/)).toBeNull();
    expect(screen.queryByText('Paid off since you started')).toBeNull();
    expect(screen.queryByRole('list', { name: 'Payment months' })).toBeNull();
    expect(document.querySelector('[data-stub="ProgressTab"]')).not.toBeNull();
  });
});
```

In `src/__tests__/components/dashboard-v2/DashboardClient.flag.test.ts`:
- Stub: `vi.mock('@/components/dashboard-v2/progress/ProgressV2', stub('ProgressV2'));`
- Append to `describe('DashboardClient flag wiring')`:

```ts
  it('renders Progress v2 on the progress tab when the flag is on', () => {
    nav.params = new URLSearchParams('tab=progress');
    const html = renderToStaticMarkup(createElement(DashboardClient, { user: USER, dashboardV2: true }));
    expect(html).toContain('data-stub="ProgressV2"');
    expect(html).not.toContain('data-stub="ProgressTab"');
  });

  it('keeps v1 Progress with the flag off', () => {
    nav.params = new URLSearchParams('tab=progress');
    const html = renderToStaticMarkup(createElement(DashboardClient, { user: USER }));
    expect(html).toContain('data-stub="ProgressTab"');
    expect(html).not.toContain('data-stub="ProgressV2"');
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/__tests__/components/tabs/ProgressTab.stats.test.ts src/__tests__/components/dashboard-v2/StreakGrid.test.ts src/__tests__/components/dashboard-v2/ProgressV2.test.ts src/__tests__/components/dashboard-v2/DashboardClient.flag.test.ts`
Expected: FAIL. `showStats` is ignored (the stat cards still render), and the three new components don't exist. The existing flag tests and snapshots still pass.

- [ ] **Step 3: Add `showStats` to `ProgressTab`**

Props (lines 38-44):

```ts
interface ProgressTabProps {
  debts: Debt[];
  income: Income | null | undefined;
  expenses: Expense[];
  isLoading: boolean;
  onNavigate: (tab: Tab) => void;
  /** Dashboard v2 (PR 5) passes false: its own top replaces the four stat cards. Omitted = v1. */
  showStats?: boolean;
}
```

Signature: add `showStats = true,` after `onNavigate,`.

Wrap the stat grid (`<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">` … `</div>`, lines 369-401) so the existing JSX is unchanged inside:

```tsx
      {showStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* …the four StatCards, unchanged… */}
        </div>
      )}
```

- [ ] **Step 4: Create `StreakGrid.tsx`, `PaidOffCard.tsx` and `MilestonesCard.tsx`**

`StreakGrid.tsx`:

```tsx
"use client";

import type { StreakCell, StreakCellState } from "@/lib/dashboard/types";
import { monthLabelFromKey } from "@/lib/dashboard/progressTab";

// README §4b. The current month is amber, never red (D10, X9); inactive = before the user started.
const CELL: Record<StreakCellState, string> = {
  logged: "bg-success",
  currentComplete: "bg-success",
  current: "bg-warning",
  missed: "border border-streak-miss-border bg-streak-miss",
  future: "bg-streak-future",
  inactive: "bg-surface-2",
};
const STATE_LABEL: Record<StreakCellState, string> = {
  logged: "logged",
  currentComplete: "logged",
  current: "in progress",
  missed: "missed",
  future: "upcoming",
  inactive: "before you started",
};

/** 12 cells: 8 past months, this month, 3 future (spec §5.1 streakGrid). The single red cell is the point. */
export default function StreakGrid({ cells }: { cells: ReadonlyArray<StreakCell> }) {
  return (
    <ul aria-label="Payment months" className="grid grid-cols-12 gap-1">
      {cells.map((cell) => (
        <li
          key={cell.month}
          data-state={cell.state}
          aria-label={`${monthLabelFromKey(cell.month)}: ${STATE_LABEL[cell.state]}`}
          className={`h-[26px] rounded-[5px] ${CELL[cell.state]}`}
        />
      ))}
    </ul>
  );
}
```

`PaidOffCard.tsx`:

```tsx
"use client";

import { useId } from "react";
import type { PaidOffView } from "@/lib/dashboard/progressTab";
import { CARD, EYEBROW } from "../styles";
import { useMeterValue } from "../useMeterValue";

/** README §4a: the paid-off figure over the starting total, with an 8px bar that fills once. */
export default function PaidOffCard({ view }: { view: PaidOffView }) {
  const titleId = useId();
  const pct = useMeterValue(view.pct);
  return (
    <section aria-labelledby={titleId} className={`${CARD} p-4`}>
      <h2 id={titleId} className={`${EYEBROW} text-txt-muted`}>Paid off since you started</h2>
      <p className="mt-2 flex items-baseline gap-2">
        <span className="mono text-[34px] font-extrabold leading-none tracking-[-0.03em] text-success-text">{view.figure}</span>
        <span className="text-[13px] font-semibold text-txt-muted">{view.ofLine}</span>
      </p>
      {/* The line above states both figures, so the bar is decoration for screen readers. */}
      <div aria-hidden="true" className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
        <div
          data-meter="paid"
          className="h-full rounded-full bg-success transition-[width] duration-[600ms] ease-out motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
    </section>
  );
}
```

`MilestonesCard.tsx`:

```tsx
"use client";

import type { MilestoneRowView } from "@/lib/dashboard/progressTab";
import { CARD, EYEBROW } from "../styles";

/**
 * README §4d. The "next" row is solid and muted, not the handoff's dashed
 * card: dashed borders mean only "outside the plan" (DESIGN.md 2026-09-12).
 */
export default function MilestonesCard({ rows }: { rows: ReadonlyArray<MilestoneRowView> }) {
  return (
    <section aria-label="Milestones" className={`${CARD} p-4`}>
      <h2 className={`${EYEBROW} text-txt-muted`}>Milestones</h2>
      <ul className="mt-2 flex flex-col gap-1.5">
        {rows.map((row) => (
          <li
            key={`${row.kind}-${row.title}`}
            className={`flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-[13px] ${
              row.kind === "next" ? "bg-bg text-txt-muted" : "bg-surface text-txt"
            }`}
          >
            <span className="min-w-0 truncate font-semibold">{row.title}</span>
            {row.detail && (
              <span className={`mono shrink-0 text-[12px] font-extrabold ${row.kind === "paidOff" ? "text-success-text" : "text-txt-muted"}`}>
                {row.detail}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 5: Create `ProgressV2.tsx`**

```tsx
"use client";

import { useMemo, useState } from "react";
import type { Debt, Expense, Income } from "@/types";
import type { Tab } from "@/components/dashboard/types";
import { useAllSnapshots, useDashboardInsights, usePaymentRecords } from "@/lib/hooks";
import { calculatePlanMetrics } from "@/lib/payoffPlan";
import { isPlanDebt } from "@/lib/monthlyFocusDebt";
import { shortMonthLabel } from "@/lib/dashboard/format";
import { gridCaptionView, milestonesView, paidOffView, streakPill, unloggedRows } from "@/lib/dashboard/progressTab";
import type { LogRow } from "@/lib/dashboard/thisMonth";
import ProgressTab from "@/components/tabs/ProgressTab";
import BulkLogSheet from "../sheets/BulkLogSheet";
import { CARD, CTA_BLUE, EYEBROW } from "../styles";
import MilestonesCard from "./MilestonesCard";
import PaidOffCard from "./PaidOffCard";
import StreakGrid from "./StreakGrid";

interface ProgressV2Props {
  debts: Debt[];
  income: Income | null | undefined;
  expenses: Expense[];
  isLoading: boolean;
  onNavigate: (tab: Tab) => void;
}

type LogSheet = { rows: LogRow[]; year: number; month: number } | null;

/**
 * Progress, dashboard v2 (spec §8.5): streak pill → paid-off bar → the
 * 12-cell grid with its log CTA → milestones, then v1's chart, insights,
 * badges and Journey (ProgressTab without its stat cards). The catch-up card
 * is not built (D6). Every figure is insights.progress: ProgressTab's own
 * formulas, extracted in PR 1.
 */
export default function ProgressV2({ debts, income, expenses, isLoading, onNavigate }: ProgressV2Props) {
  const { data: insights, isPlaceholderData } = useDashboardInsights();
  const { data: snapshotData } = useAllSnapshots();
  const today = new Date();
  const { data: paymentsData } = usePaymentRecords(today.getFullYear(), today.getMonth());
  const [logSheet, setLogSheet] = useState<LogSheet>(null);

  // DebtsV2.tsx:77-84: the same plan every tab computes, here for the schedule.
  const planMetrics = useMemo(() => {
    if (!income || !debts.some(isPlanDebt)) return null;
    try {
      return calculatePlanMetrics(debts, income, [...expenses]);
    } catch {
      return null;
    }
  }, [debts, income, expenses]);
  const paidDebtIds = useMemo(
    () => new Set((paymentsData?.records ?? []).map((record) => record.debtId)),
    [paymentsData],
  );
  const milestones = useMemo(
    () => milestonesView(debts, snapshotData?.snapshots ?? [], planMetrics?.result.payoffSchedule ?? []),
    [debts, snapshotData?.snapshots, planMetrics],
  );

  const progress = insights?.progress ?? null;
  const pill = progress ? streakPill(progress.streak) : null;
  const paid = paidOffView(progress);
  const caption = insights ? gridCaptionView(insights.paymentGap, insights.asOf.month) : null;

  const openLog = () => {
    // Placeholder-day data can still name last month (ThisMonthV2's guard).
    if (!insights || isPlaceholderData) return;
    const rows = unloggedRows(debts, paidDebtIds);
    if (rows.length === 0) return;
    setLogSheet({ rows, year: insights.asOf.year, month: insights.asOf.month });
  };

  return (
    <div className="flex flex-col gap-2.5 min-[769px]:gap-4">
      {pill && (
        <div>
          <span className="rounded-full bg-streak-pill px-2.5 py-1 text-[11px] font-extrabold text-streak-pill-text">{pill}</span>
        </div>
      )}
      {paid && <PaidOffCard view={paid} />}
      {progress && (
        <section aria-label="Payment streak" className={`${CARD} p-4`}>
          <h2 className={`${EYEBROW} text-txt-muted`}>Payment months</h2>
          <div className="mt-2">
            <StreakGrid cells={progress.grid} />
          </div>
          {caption && (
            <>
              <p className="mt-3 text-[13px] font-bold text-txt [text-wrap:pretty]">{caption.text}</p>
              <button type="button" onClick={openLog} className={`mt-3 ${CTA_BLUE}`}>
                {caption.cta}
              </button>
            </>
          )}
        </section>
      )}
      {milestones.length > 0 && <MilestonesCard rows={milestones} />}
      <ProgressTab debts={debts} income={income} expenses={expenses} isLoading={isLoading} onNavigate={onNavigate} showStats={false} />
      {logSheet && (
        <BulkLogSheet
          title={`Log ${shortMonthLabel(logSheet.month)} payments`}
          rows={logSheet.rows}
          year={logSheet.year}
          month={logSheet.month}
          onClose={() => setLogSheet(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 6: Switch the progress tab in `DashboardClient`**

Import next to `PlanV2`:

```ts
import ProgressV2 from "@/components/dashboard-v2/progress/ProgressV2";
```

Replace the `activeTab === "progress"` block:

```tsx
        {activeTab === "progress" && (dashboardV2 ? (
          <ProgressV2
            debts={debts}
            income={income}
            expenses={expenses}
            isLoading={debtsLoading || incomeLoading}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        ) : (
          <ProgressTab
            debts={debts}
            income={income}
            expenses={expenses}
            isLoading={debtsLoading || incomeLoading}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        ))}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx vitest run src/__tests__/components/tabs/ProgressTab.stats.test.ts src/__tests__/components/dashboard-v2/StreakGrid.test.ts src/__tests__/components/dashboard-v2/ProgressV2.test.ts src/__tests__/components/dashboard-v2/DashboardClient.flag.test.ts`
Expected: PASS, snapshots matching without `-u`.

`npm run lint` and the `tsc` check: clean.

- [ ] **Step 8: Commit**

```bash
git add src/components/tabs/ProgressTab.tsx src/components/dashboard-v2/progress src/components/DashboardClient.tsx src/__tests__/components/tabs/ProgressTab.stats.test.ts src/__tests__/components/dashboard-v2/StreakGrid.test.ts src/__tests__/components/dashboard-v2/ProgressV2.test.ts src/__tests__/components/dashboard-v2/DashboardClient.flag.test.ts
```

```bash
git commit -m "feat(dashboard-v2): Progress tab — streak pill, paid-off bar, streak grid, milestones" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Coach view models (pure)

**Files:**
- Create: `src/lib/dashboard/coach.ts`
- Test: `src/__tests__/lib/dashboard/coach.test.ts`

**Interfaces:**
- Consumes: `freeMoveView` / `FreeMoveView` (`./thisMonth`), `coachMoveCopy` / `CoachMoveCopy` (`./coachMoveCopy`), `summarizeMoveValues` (`./coachMoves`), `floorDollars` / `floorWhole` (`./format`), `formatCurrencyWhole`, `CoachMove` / `CoachMoveId` / `DashboardInsights` (`./types`).
- Produces (all pure):
  - `coachFreeMoveView(insights: Pick<DashboardInsights, 'tier' | 'coachMoves' | 'asOf'>): FreeMoveView | null` — This Month's view with `cta = { action: 'apply_unallocated', label: 'Apply $x/mo' }` for `use_unallocated` and `moreCount: 0`
  - `moreMovesView(insights): MoreMovesView | null` with `MoreMovesView = { heading: string; rows: { id: CoachMoveId; title: string; value: string }[] }`
  - `coachClosingView(insights, price: number): CoachClosingView | null` with `CoachClosingView = { text: string; cta: string }`
  - `OpenMoveAction = 'bulk_log' | 'apply_unallocated' | 'switch_strategy' | 'apr_script'`
  - `openMoveRows(insights): OpenMoveRow[]` with `OpenMoveRow = { move: CoachMove; copy: CoachMoveCopy; priority: 'High' | 'Medium'; cta: { action: OpenMoveAction; label: string } }`

- [ ] **Step 1: Write the failing test** at `src/__tests__/lib/dashboard/coach.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { coachClosingView, coachFreeMoveView, moreMovesView, openMoveRows } from '@/lib/dashboard/coach';
import { makeCallAprMove, makeLogMissedMove, makeSwitchMove, makeUnallocatedMove } from './fixtures';

const FREE = { proEligible: false, paidPro: false, trial: { active: false, endsAt: null } };
const PRO = { proEligible: true, paidPro: true, trial: { active: false, endsAt: null } };
const asOf = { year: 2026, month: 8, day: 15 };
// A stand-in price so the ×12 is visible in the expectation; product code reads PLANS.pro.price.
const PRICE = 10;

describe('coachFreeMoveView (Coach; decision 2)', () => {
  it('turns unused cash into a one-tap apply and drops the in-card more-moves row', () => {
    const view = coachFreeMoveView({ tier: FREE, asOf, coachMoves: [makeUnallocatedMove(3, true), makeCallAprMove('citi', 742)] });
    expect(view?.cta).toEqual({ action: 'apply_unallocated', label: 'Apply $200/mo' });
    expect(view?.moreCount).toBe(0);
    expect(view?.eyebrow).toBe('Your free move · Sep');
  });

  it('keeps the other free moves as This Month has them', () => {
    expect(coachFreeMoveView({ tier: FREE, asOf, coachMoves: [makeLogMissedMove('Sep', 2)] })?.cta).toEqual({ action: 'bulk_log', label: 'Log them now' });
    expect(coachFreeMoveView({ tier: FREE, asOf, coachMoves: [makeSwitchMove('avalanche', 90, true)] })?.cta).toEqual({ action: 'switch_strategy', label: 'Switch to Avalanche' });
    // Decision 1: the call script stays Pro, so the free call_apr move has no button.
    expect(coachFreeMoveView({ tier: FREE, asOf, coachMoves: [makeCallAprMove('citi', 742, true)] })?.cta).toBeNull();
  });

  it('is null for Pro', () => {
    expect(coachFreeMoveView({ tier: PRO, asOf, coachMoves: [makeLogMissedMove('Sep', 1)] })).toBeNull();
  });
});

describe('moreMovesView (README §5c: every title and value visible)', () => {
  it('lists every gated move with its title and value', () => {
    const view = moreMovesView({
      tier: FREE,
      coachMoves: [makeLogMissedMove('Sep', 2), makeCallAprMove('Citi', 742.9), makeUnallocatedMove(1), makeSwitchMove('avalanche', 1030.4)],
    });
    expect(view?.heading).toBe('3 more moves found');
    expect(view?.rows).toEqual([
      { id: 'call_apr', title: expect.stringMatching(/^Call Citi about its 28(\.\d+)?% APR$/), value: '$742/yr est.' },
      { id: 'use_unallocated', title: 'Put $200/mo of unused cash to work.', value: '1m sooner' },
      { id: 'switch_strategy', title: 'Switch to Avalanche — $1,030 less interest.', value: '$1,030' },
    ]);
  });

  it('uses the singular, and hides for Pro or with nothing gated', () => {
    expect(moreMovesView({ tier: FREE, coachMoves: [makeLogMissedMove('Sep', 2), makeCallAprMove('Citi', 742)] })?.heading).toBe('1 more move found');
    expect(moreMovesView({ tier: PRO, coachMoves: [makeCallAprMove('Citi', 742)] })).toBeNull();
    expect(moreMovesView({ tier: FREE, coachMoves: [makeLogMissedMove('Sep', 2)] })).toBeNull();
  });
});

describe('coachClosingView (spec §8.4 "Coach closing"; X7: units never mixed)', () => {
  it('states per-year, one-time and months clauses separately and prices Pro per year', () => {
    const view = coachClosingView({
      tier: FREE,
      coachMoves: [makeLogMissedMove('Sep', 1), makeCallAprMove('Citi', 742.9), makeSwitchMove('avalanche', 1030.4), makeUnallocatedMove(1)],
    }, PRICE);
    expect(view).toEqual({
      text: 'Those 3 are worth $742/yr, plus $1,030 over the plan and 1 month sooner. Pro is $120/yr.',
      cta: 'Unlock all 3',
    });
  });

  it('leads with the one-time clause when there is no per-year value, and uses the singular', () => {
    expect(coachClosingView({ tier: FREE, coachMoves: [makeLogMissedMove('Sep', 1), makeSwitchMove('avalanche', 300)] }, PRICE)).toEqual({
      text: 'That move is worth $300 over the plan. Pro is $120/yr.',
      cta: 'Unlock the move',
    });
  });

  it('words a months-only value as finishing sooner', () => {
    const view = coachClosingView({
      tier: FREE,
      coachMoves: [makeLogMissedMove('Sep', 1), makeUnallocatedMove(2), makeCallAprMove('Citi', 0.4)],
    }, PRICE);
    expect(view?.text).toBe('Those 2 finish your plan 2 months sooner. Pro is $120/yr.');
  });

  it('hides for Pro, with nothing gated, or when the gated moves carry no value', () => {
    expect(coachClosingView({ tier: PRO, coachMoves: [makeCallAprMove('Citi', 742)] }, PRICE)).toBeNull();
    expect(coachClosingView({ tier: FREE, coachMoves: [makeLogMissedMove('Sep', 1)] }, PRICE)).toBeNull();
    expect(coachClosingView({ tier: FREE, coachMoves: [makeLogMissedMove('Sep', 1), makeCallAprMove('Citi', 0.4)] }, PRICE)).toBeNull();
  });
});

describe('openMoveRows (Coach for Pro: every move open with its action)', () => {
  it('maps each move to its action', () => {
    const rows = openMoveRows({
      tier: PRO,
      coachMoves: [makeLogMissedMove('Sep', 2, true), makeUnallocatedMove(3, true), makeSwitchMove('snowball', 90, true), makeCallAprMove('Citi', 742, true)],
    });
    expect(rows.map((r) => [r.move.id, r.cta.action, r.cta.label])).toEqual([
      ['log_missed', 'bulk_log', 'Log them now'],
      ['use_unallocated', 'apply_unallocated', 'Apply $200/mo'],
      ['switch_strategy', 'switch_strategy', 'Switch to Snowball'],
      ['call_apr', 'apr_script', 'Open the call script'],
    ]);
    expect(rows[0].priority).toBe('High');
    expect(rows[2].priority).toBe('Medium');
    expect(rows[3].copy.valueLabel).toBe('$742/yr est.');
  });

  it('uses the singular log label, and is empty for Free', () => {
    expect(openMoveRows({ tier: PRO, coachMoves: [makeLogMissedMove('Sep', 1, true)] })[0].cta.label).toBe('Log it now');
    expect(openMoveRows({ tier: FREE, coachMoves: [makeLogMissedMove('Sep', 1)] })).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/__tests__/lib/dashboard/coach.test.ts`
Expected: FAIL — `Cannot find module '@/lib/dashboard/coach'`.

- [ ] **Step 3: Create `src/lib/dashboard/coach.ts`**

```ts
import { formatCurrencyWhole } from '@/lib/utils';
import { coachMoveCopy, type CoachMoveCopy } from './coachMoveCopy';
import { summarizeMoveValues } from './coachMoves';
import { floorDollars, floorWhole } from './format';
import { freeMoveView, type FreeMoveView } from './thisMonth';
import type { CoachMove, CoachMoveId, DashboardInsights } from './types';

const METHOD_LABEL = { snowball: 'Snowball', avalanche: 'Avalanche' } as const;
/** A unit, not a price: the price itself is always PLANS.pro.price. */
const MONTHS_PER_YEAR = 12;

type MovesInput = Pick<DashboardInsights, 'tier' | 'coachMoves'>;

const gatedMoves = (insights: MovesInput): CoachMove[] =>
  insights.tier.proEligible ? [] : insights.coachMoves.filter((m) => !m.isFree);

// ── The free move on Coach (README §5b) ───────────────────────────────────

/**
 * This Month's free-move view with two Coach differences: unused cash gets
 * the one-tap apply (on This Month the slider is a tab away; here it isn't),
 * and the in-card "more moves" row is dropped because the priced list follows.
 */
export function coachFreeMoveView(
  insights: Pick<DashboardInsights, 'tier' | 'coachMoves' | 'asOf'>,
): FreeMoveView | null {
  const view = freeMoveView(insights);
  if (!view) return null;
  const cta = view.move.id === 'use_unallocated'
    ? { action: 'apply_unallocated' as const, label: `Apply ${floorWhole(view.move.facts.unusedMonthly)}/mo` }
    : view.cta;
  return { ...view, cta, moreCount: 0 };
}

// ── The priced list (README §5c) ──────────────────────────────────────────

export interface GatedMoveRow { id: CoachMoveId; title: string; value: string }
export interface MoreMovesView { heading: string; rows: GatedMoveRow[] }

function moveValue(move: CoachMove, copy: CoachMoveCopy): string {
  if (copy.valueLabel) return copy.valueLabel;
  // log_missed carries no value label. It is always the first (free) move,
  // so this is a safety net rather than a path the rules reach.
  return `${move.value.amount} ${move.value.amount === 1 ? 'payment' : 'payments'}`;
}

/**
 * Every gated move's title and value, fully readable: the gate is volume,
 * never blur (README "The System", rule 1). Null for Pro or with nothing gated.
 */
export function moreMovesView(insights: MovesInput): MoreMovesView | null {
  const gated = gatedMoves(insights);
  if (gated.length === 0) return null;
  return {
    heading: `${gated.length} more ${gated.length === 1 ? 'move' : 'moves'} found`,
    rows: gated.map((move) => {
      const copy = coachMoveCopy(move);
      return { id: move.id, title: copy.title, value: moveValue(move, copy) };
    }),
  };
}

// ── The ink closing card (spec §8.4 "Coach closing"; X7) ──────────────────

export interface CoachClosingView { text: string; cta: string }

/**
 * "Those {n} are worth ${perYear}/yr{, plus ${oneTime} over the plan}{ and
 * {m} months sooner}. Pro is ${price×12}/yr." Each clause appears only when
 * its value floors to at least $1 or 1 month, the units are never added
 * together, and with no clause at all the card hides.
 */
export function coachClosingView(insights: MovesInput, price: number): CoachClosingView | null {
  const gated = gatedMoves(insights);
  if (gated.length === 0) return null;
  const summary = summarizeMoveValues(gated);
  const perYear = floorDollars(summary.perYear);
  const oneTime = floorDollars(summary.oneTime);
  const months = Math.floor(summary.monthsSooner);
  const money: string[] = [];
  if (perYear >= 1) money.push(`${formatCurrencyWhole(perYear)}/yr`);
  if (oneTime >= 1) money.push(`${formatCurrencyWhole(oneTime)} over the plan`);
  const monthsClause = months >= 1 ? `${months} ${months === 1 ? 'month' : 'months'} sooner` : null;
  const n = gated.length;
  let lead: string;
  if (money.length > 0) {
    lead = `${n === 1 ? 'That move is' : `Those ${n} are`} worth ${money.join(', plus ')}${monthsClause ? ` and ${monthsClause}` : ''}`;
  } else if (monthsClause) {
    lead = `${n === 1 ? 'That move finishes' : `Those ${n} finish`} your plan ${monthsClause}`;
  } else {
    return null;
  }
  return {
    text: `${lead}. Pro is ${formatCurrencyWhole(price * MONTHS_PER_YEAR)}/yr.`,
    cta: n === 1 ? 'Unlock the move' : `Unlock all ${n}`,
  };
}

// ── Pro: every move open (spec §8.5 Coach) ────────────────────────────────

export type OpenMoveAction = 'bulk_log' | 'apply_unallocated' | 'switch_strategy' | 'apr_script';
export interface OpenMoveRow {
  move: CoachMove;
  copy: CoachMoveCopy;
  priority: 'High' | 'Medium';
  cta: { action: OpenMoveAction; label: string };
}

function openMoveCta(move: CoachMove): OpenMoveRow['cta'] {
  switch (move.id) {
    case 'log_missed':
      return { action: 'bulk_log', label: move.facts.missedCount === 1 ? 'Log it now' : 'Log them now' };
    case 'use_unallocated':
      return { action: 'apply_unallocated', label: `Apply ${floorWhole(move.facts.unusedMonthly)}/mo` };
    case 'switch_strategy':
      return { action: 'switch_strategy', label: `Switch to ${METHOD_LABEL[move.facts.alternative]}` };
    case 'call_apr':
      return { action: 'apr_script', label: 'Open the call script' };
  }
}

/** Pro and trial: the same moves, every one open with its action. Empty for Free. */
export function openMoveRows(insights: MovesInput): OpenMoveRow[] {
  if (!insights.tier.proEligible) return [];
  return insights.coachMoves.map((move) => ({
    move,
    copy: coachMoveCopy(move),
    priority: move.priority === 'high' ? 'High' : 'Medium',
    cta: openMoveCta(move),
  }));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/__tests__/lib/dashboard/coach.test.ts src/__tests__/lib/dashboard/thisMonth.test.ts`
Expected: PASS (11 new tests; `thisMonth.test.ts` unchanged).

- [ ] **Step 5: Commit**

```bash
git add src/lib/dashboard/coach.ts src/__tests__/lib/dashboard/coach.test.ts
```

```bash
git commit -m "feat(dashboard-v2): Coach view models" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: `CoachV2` — the lists, the APR open request, and the flag switch

**Files:**
- Create: `src/components/dashboard-v2/coach/MoreMovesList.tsx`, `src/components/dashboard-v2/coach/OpenMovesList.tsx`, `src/components/dashboard-v2/coach/CoachV2.tsx`
- Modify: `src/components/AprNegotiationCard.tsx` (the signature at 113 and the effect block at 121-143), `src/components/tabs/IntelligenceTab.tsx` (props at 20-27, the signature, `<AprNegotiationCard />` at 128), `src/components/DashboardClient.tsx` (import; the `activeTab === "intelligence"` block at ~458-467)
- Test: `src/__tests__/components/AprNegotiationCard.openRequest.test.ts` (new), `src/__tests__/components/dashboard-v2/MoreMovesList.test.ts` (new), `src/__tests__/components/dashboard-v2/CoachV2.test.ts` (new), `src/__tests__/components/dashboard-v2/DashboardClient.flag.test.ts` (extend)

**Interfaces:**
- Consumes: Task 7's view models; `interestView`, `rateWatchView`, `missedPaymentRows`, `FreeMoveAction`, `LogRow` (`src/lib/dashboard/thisMonth.ts`); `incomeSavePayload` (Task 1); `InterestMeter compact`, `FreeMoveCard showPriority` (Task 1); `RateWatchCard`, `ClosingCard`, `BulkLogSheet`, `ProChip`; `useDashboardInsights`, `useSaveIncome`, `getErrorMessage`; `PLANS.pro.price`; `Events.COACH_MOVE_CTA`; `upgradeEvents`.
- Produces:
  - `AprNegotiationCard` named export gains `export interface AprOpenRequest { debtId: string; nonce: number }` and prop `openRequest?: AprOpenRequest | null`
  - `IntelligenceTab` prop `aprOpenRequest?: AprOpenRequest | null`
  - `MoreMovesList` (default), props `{ view: MoreMovesView; onOpen: () => void }`
  - `OpenMovesList` (default), props `{ rows: ReadonlyArray<OpenMoveRow>; onAction: (row: OpenMoveRow) => void; pendingId: CoachMoveId | null; error: string | null }`
  - `CoachV2` (default), props `{ debts; income; expenses; isLoading; pendingExtra?; onConsumePendingExtra?; onNavigate: (tab: Tab) => void }`

- [ ] **Step 1: Write the failing tests**

`src/__tests__/components/AprNegotiationCard.openRequest.test.ts`:

```ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import { useDebts } from '@/lib/hooks';
import { AprNegotiationCard, type AprOpenRequest } from '@/components/AprNegotiationCard';
import { makeDebt } from '../lib/dashboard/fixtures';

vi.mock('@/lib/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/hooks')>()),
  useDebts: vi.fn(),
}));

const CARDS = [
  makeDebt({ id: 'citi', name: 'Citi', category: 'Credit Card', balance: 4_000, minimumPayment: 120, interestRate: 28 }),
  makeDebt({ id: 'amex', name: 'Amex', category: 'Credit Card', balance: 2_000, minimumPayment: 60, interestRate: 22 }),
];

function renderCard(openRequest?: AprOpenRequest | null) {
  vi.mocked(useDebts).mockReturnValue({ data: { debts: CARDS }, isLoading: false, isError: false } as unknown as ReturnType<typeof useDebts>);
  // jsdom has no scrollIntoView.
  Element.prototype.scrollIntoView = vi.fn();
  render(createElement(AprNegotiationCard, openRequest === undefined ? {} : { openRequest }));
}

afterEach(() => vi.clearAllMocks());

describe('AprNegotiationCard.openRequest (dashboard v2 Coach, PR 5)', () => {
  it('stays collapsed on the highest-APR card without a request (v1)', () => {
    renderCard();
    expect(screen.queryByRole('button', { name: /Amex · 22% APR/ })).toBeNull();
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('selects the requested card, expands, and scrolls into view', async () => {
    renderCard({ debtId: 'amex', nonce: 1 });
    const amex = await screen.findByRole('button', { name: /Amex · 22% APR/ });
    expect(amex.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: /Citi · 28% APR/ }).getAttribute('aria-pressed')).toBe('false');
    await vi.waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1));
  });
});
```

`src/__tests__/components/dashboard-v2/MoreMovesList.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import MoreMovesList from '@/components/dashboard-v2/coach/MoreMovesList';

const view = {
  heading: '2 more moves found',
  rows: [
    { id: 'call_apr' as const, title: 'Call Citi about its 28% APR', value: '$742/yr est.' },
    { id: 'switch_strategy' as const, title: 'Switch to Avalanche — $1,030 less interest.', value: '$1,030' },
  ],
};

describe('MoreMovesList (README §5c)', () => {
  it('shows every title and value, and its header is the gated control', () => {
    const onOpen = vi.fn();
    render(createElement(MoreMovesList, { view, onOpen }));
    const header = screen.getByRole('button', { name: '2 more moves found — Pro' });
    expect(header.getAttribute('aria-disabled')).toBe('true');
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual([
      'Call Citi about its 28% APR$742/yr est.',
      'Switch to Avalanche — $1,030 less interest.$1,030',
    ]);
    fireEvent.click(header);
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(document.body.innerHTML).not.toContain('blur');
  });
});
```

`src/__tests__/components/dashboard-v2/CoachV2.test.ts`:

```ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { DashboardInsights } from '@/lib/dashboard/types';
import { useDashboardInsights, useMarkPaid, useSaveIncome } from '@/lib/hooks';
import { track, Events } from '@/lib/analytics';
import { upgradeEvents } from '@/lib/upgradeEvents';
import { PLANS } from '@/lib/stripe';
import { formatCurrencyWhole } from '@/lib/utils';
import CoachV2 from '@/components/dashboard-v2/coach/CoachV2';
import {
  makeCallAprMove, makeDebt, makeIncome, makeLogMissedMove, makeSwitchMove, makeUnallocatedMove,
} from '../../lib/dashboard/fixtures';

const intel = vi.hoisted(() => ({ last: null as null | Record<string, unknown> }));

vi.mock('@/lib/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/hooks')>()),
  useDashboardInsights: vi.fn(),
  useSaveIncome: vi.fn(),
  useMarkPaid: vi.fn(),
}));
vi.mock('@/lib/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/analytics')>()),
  track: vi.fn(),
}));
// The v1 Pro content is its own component; here it only records its props.
vi.mock('@/components/tabs/IntelligenceTab', async () => {
  const { createElement: h } = await import('react');
  return {
    default: (p: Record<string, unknown>) => {
      intel.last = p;
      return h('div', { 'data-stub': 'IntelligenceTab' });
    },
  };
});

const FREE = { proEligible: false, paidPro: false, trial: { active: false, endsAt: null } };
const PRO = { proEligible: true, paidPro: true, trial: { active: false, endsAt: null } };
const INCOME = makeIncome({ monthlyTakeHome: 4_000, essentialExpenses: 2_000, payoffMethod: 'snowball', accelerationAmount: 200 });
const DEBTS = [
  makeDebt({ id: 'visa', name: 'Visa', balance: 900, minimumPayment: 25, dueDate: 5 }),
  makeDebt({ id: 'car', name: 'Car loan', balance: 9_000, minimumPayment: 310, dueDate: 20 }),
];
const RATE_CARD = { debtId: 'citi', debtName: 'Citi', apr: 28, targetApr: 19.6, annualEstimate: 742.9 };
const PRO_PRICE_PER_YEAR = formatCurrencyWhole(PLANS.pro.price * 12);

function insights(overrides: Partial<DashboardInsights> = {}): DashboardInsights {
  return {
    asOf: { year: 2026, month: 8, day: 15 },
    tier: FREE,
    readiness: { steps: [], completeCount: 0, percent: 0 },
    interest: { monthlyEstimate: 840.36, avgMonthlySavedByPlan: 278.3 },
    paymentGap: { expected: 2, logged: 0, missed: [{ debtId: 'visa', minimumPayment: 25 }], missedMinimums: 25, notYetDue: 1 },
    coachMoves: [makeLogMissedMove('Sep', 1), makeSwitchMove('avalanche', 1030), makeCallAprMove('citi', 742.9)],
    rateWatch: { cards: 1, annualEstimate: 742.9, top: RATE_CARD, moveTarget: RATE_CARD },
    strategy: null,
    planGap: null,
    progress: null,
    plan: null,
    uncounted: null,
    ...overrides,
  };
}

const saveIncome = { mutate: vi.fn(), isPending: false };

function renderTab({ data = insights(), placeholder = false }: { data?: DashboardInsights; placeholder?: boolean } = {}) {
  vi.mocked(useDashboardInsights).mockReturnValue(
    { data, isPlaceholderData: placeholder } as unknown as ReturnType<typeof useDashboardInsights>,
  );
  vi.mocked(useSaveIncome).mockReturnValue(saveIncome as unknown as ReturnType<typeof useSaveIncome>);
  vi.mocked(useMarkPaid).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as unknown as ReturnType<typeof useMarkPaid>);
  const onNavigate = vi.fn();
  render(createElement(CoachV2, { debts: DEBTS, income: INCOME, expenses: [], isLoading: false, onNavigate }));
  return { onNavigate };
}

afterEach(() => {
  vi.clearAllMocks();
  intel.last = null;
});

describe('CoachV2 for Free (spec §8.5 Coach)', () => {
  it('stacks the compact meter, the chip-less free move, rate watch, the priced list and the closing card, with no v1 Pro content', () => {
    renderTab();
    expect(screen.getByText('$840').className).toContain('text-[32px]');
    expect(screen.getByRole('heading', { name: 'Log the missing payment for Sep.' })).toBeTruthy();
    expect(screen.queryByText('High')).toBeNull();
    const rateWatch = screen.getByText('Rate watch · 1 card');
    expect(rateWatch.closest('[class*="max-[768px]:hidden"]')).toBeNull();
    expect(screen.getAllByRole('button', { name: '2 more moves found — Pro' })).toHaveLength(1);
    expect(screen.getByText('Switch to Avalanche — $1,030 less interest.')).toBeTruthy();
    expect(screen.getByText('$742/yr est.')).toBeTruthy();
    expect(screen.getByText(`Those 2 are worth $742/yr, plus $1,030 over the plan. Pro is ${PRO_PRICE_PER_YEAR}/yr.`)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Unlock all 2' })).toBeTruthy();
    expect(document.querySelector('[data-stub="IntelligenceTab"]')).toBeNull();
  });

  it('opens the upgrade modal with the coach copy from the list and the closing CTA, tracking the gated press', () => {
    const handler = vi.fn();
    const unsubscribe = upgradeEvents.subscribe(handler);
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: '2 more moves found — Pro' }));
    fireEvent.click(screen.getByRole('button', { name: 'Unlock all 2' }));
    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenCalledWith('Coach moves');
    expect(track).toHaveBeenCalledWith(Events.COACH_MOVE_CTA, { move: 'more_moves', gated: true });
    unsubscribe();
  });

  it("applies unused cash in one tap with the Plan tab's payload", () => {
    renderTab({ data: insights({ coachMoves: [makeUnallocatedMove(3, true), makeCallAprMove('citi', 742.9)] }) });
    fireEvent.click(screen.getByRole('button', { name: 'Apply $200/mo' }));
    expect(saveIncome.mutate).toHaveBeenCalledWith(
      { monthlyTakeHome: 4_000, essentialExpenses: 2_000, extraPayment: 0, payoffMethod: 'snowball', accelerationAmount: 700 },
      expect.any(Object),
    );
    expect(track).toHaveBeenCalledWith(Events.COACH_MOVE_CTA, { move: 'use_unallocated', gated: false });
  });

  it('logs the missing payment through the bulk sheet, never on placeholder-day data', () => {
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Log it now' }));
    expect(screen.getByRole('dialog', { name: 'Log Sep payments' })).toBeTruthy();
    expect(track).toHaveBeenCalledWith(Events.COACH_MOVE_CTA, { move: 'log_missed', gated: false });
  });

  it('holds the log sheet on placeholder-day data', () => {
    renderTab({ placeholder: true });
    fireEvent.click(screen.getByRole('button', { name: 'Log it now' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the empty card when nothing has a figure', () => {
    const { onNavigate } = renderTab({ data: insights({ interest: null, coachMoves: [], rateWatch: null }) });
    expect(screen.getByText('Nothing to show for September yet.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Go to My Debts' }));
    expect(onNavigate).toHaveBeenCalledWith('debts');
  });
});

describe('CoachV2 for Pro', () => {
  it('opens every move with its action, keeps rate watch, then renders the v1 Pro content', () => {
    renderTab({
      data: insights({ tier: PRO, coachMoves: [makeLogMissedMove('Sep', 1, true), makeSwitchMove('avalanche', 1030, true), makeCallAprMove('citi', 742.9, true)] }),
    });
    expect(screen.getByText('$840').className).toContain('text-[32px]');
    expect(screen.getByRole('button', { name: 'Log it now' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Switch to Avalanche' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open the call script' })).toBeTruthy();
    expect(screen.queryByText(/more moves found/)).toBeNull();
    expect(screen.queryByText(/Unlock all/)).toBeNull();
    expect(screen.getByText('Rate watch · 1 card')).toBeTruthy();
    expect(document.querySelector('[data-stub="IntelligenceTab"]')).not.toBeNull();
    expect(intel.last).toMatchObject({ isLoading: false, aprOpenRequest: null });
  });

  it('switches the strategy in one tap and asks the APR card to open the script', () => {
    renderTab({ data: insights({ tier: PRO, coachMoves: [makeSwitchMove('avalanche', 1030, true), makeCallAprMove('citi', 742.9, true)] }) });
    fireEvent.click(screen.getByRole('button', { name: 'Switch to Avalanche' }));
    expect(saveIncome.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ payoffMethod: 'avalanche', accelerationAmount: 200 }),
      expect.any(Object),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open the call script' }));
    expect(intel.last?.aprOpenRequest).toMatchObject({ debtId: 'citi' });
    expect(track).toHaveBeenCalledWith(Events.COACH_MOVE_CTA, { move: 'call_apr', gated: false });
  });
});
```

In `src/__tests__/components/dashboard-v2/DashboardClient.flag.test.ts`:
- Stub: `vi.mock('@/components/dashboard-v2/coach/CoachV2', stub('CoachV2'));`
- Append to `describe('DashboardClient flag wiring')`:

```ts
  it('renders Coach v2 on the intelligence tab when the flag is on', () => {
    nav.params = new URLSearchParams('tab=intelligence');
    const html = renderToStaticMarkup(createElement(DashboardClient, { user: USER, dashboardV2: true }));
    expect(html).toContain('data-stub="CoachV2"');
    expect(html).not.toContain('data-stub="IntelligenceTab"');
  });

  it('keeps v1 Intelligence with the flag off', () => {
    nav.params = new URLSearchParams('tab=intelligence');
    const html = renderToStaticMarkup(createElement(DashboardClient, { user: USER }));
    expect(html).toContain('data-stub="IntelligenceTab"');
    expect(html).not.toContain('data-stub="CoachV2"');
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/__tests__/components/AprNegotiationCard.openRequest.test.ts src/__tests__/components/dashboard-v2/MoreMovesList.test.ts src/__tests__/components/dashboard-v2/CoachV2.test.ts src/__tests__/components/dashboard-v2/DashboardClient.flag.test.ts`
Expected: FAIL. `openRequest` is ignored (the first APR test passes, the second fails), the two components and the tab don't exist, and the intelligence tab ignores the flag.

- [ ] **Step 3: Add `openRequest` to `AprNegotiationCard` and `aprOpenRequest` to `IntelligenceTab`**

In `src/components/AprNegotiationCard.tsx`, before the component:

```ts
export interface AprOpenRequest {
  debtId: string;
  /** A new value per request, so asking for the same card twice re-opens it. */
  nonce: number;
}
```

Change the signature (line 113):

```tsx
export function AprNegotiationCard({ openRequest = null }: { openRequest?: AprOpenRequest | null } = {}) {
```

After the existing `#apr-negotiation` deep-link effect (ends ~line 143), add:

```tsx
  // Dashboard v2 Coach (PR 5): a move's "Open the call script" selects that
  // card, expands the workspace and scrolls here. Without a request (v1, and
  // Coach before any press) this does nothing.
  useEffect(() => {
    if (!openRequest || n.isLoading) return;
    n.selectCard(openRequest.debtId);
    setExpanded(true);
    const el = rootRef.current;
    if (!el) return;
    const id = window.requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(id);
    // n.selectCard is a state setter (stable); the request's identity is the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openRequest, n.isLoading]);
```

In `src/components/tabs/IntelligenceTab.tsx`: import the type (`import { AprNegotiationCard, type AprOpenRequest } from "@/components/AprNegotiationCard";`), add the prop and thread it through:

```ts
interface IntelligenceTabProps {
  debts: Debt[];
  income: Income | null | undefined;
  expenses: Expense[];
  isLoading: boolean;
  pendingExtra?: number | null;
  onConsumePendingExtra?: () => void;
  /** Dashboard v2 Coach (PR 5): a move's request to open the APR script for one card. */
  aprOpenRequest?: AprOpenRequest | null;
}
```

Destructure `aprOpenRequest` in the signature and render `<AprNegotiationCard openRequest={aprOpenRequest} />` in the Pro branch (v1 passes nothing, so `undefined` → the default `null`).

- [ ] **Step 4: Create `MoreMovesList.tsx` and `OpenMovesList.tsx`**

`MoreMovesList.tsx`:

```tsx
"use client";

import { useId } from "react";
import type { MoreMovesView } from "@/lib/dashboard/coach";
import ProChip from "../ProChip";
import { CARD } from "../styles";

/**
 * README §5c, "the most important gate in the product": every gated move's
 * title and value are visible; the script, the steps and the apply are Pro.
 * The header is the gated control (aria-disabled, named "… — Pro"), as
 * MoreMovesRow is on This Month.
 */
export default function MoreMovesList({ view, onOpen }: { view: MoreMovesView; onOpen: () => void }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className={`${CARD} overflow-hidden`}>
      <button
        type="button"
        aria-disabled="true"
        aria-label={`${view.heading} — Pro`}
        onClick={onOpen}
        className="flex min-h-11 w-full items-center justify-between gap-3 border-b border-border px-4 text-left outline-none focus-visible:outline-2 focus-visible:outline-action"
      >
        <span id={headingId} className="text-[13px] font-extrabold text-txt">{view.heading}</span>
        <ProChip />
      </button>
      <ul className="divide-y divide-border">
        {view.rows.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="min-w-0 text-[13px] font-semibold text-txt [text-wrap:pretty]">{row.title}</span>
            <span className="mono shrink-0 text-[12px] font-extrabold text-success-text">{row.value}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

`OpenMovesList.tsx`:

```tsx
"use client";

import type { OpenMoveRow } from "@/lib/dashboard/coach";
import type { CoachMoveId } from "@/lib/dashboard/types";
import { CARD, CTA_BLUE, ERROR_LINE, EYEBROW } from "../styles";

interface OpenMovesListProps {
  rows: ReadonlyArray<OpenMoveRow>;
  onAction: (row: OpenMoveRow) => void;
  /** The move whose one-tap save is running. */
  pendingId: CoachMoveId | null;
  error: string | null;
}

/** Pro and trial (spec §8.5 Coach): the same moves, every one open with its action. */
export default function OpenMovesList({ rows, onAction, pendingId, error }: OpenMovesListProps) {
  return (
    <section aria-label="Your moves" className={`${CARD} overflow-hidden`}>
      <ul className="divide-y divide-border">
        {rows.map((row) => {
          const pending = pendingId === row.move.id;
          return (
            <li
              key={row.move.id}
              className="flex flex-col gap-2 px-4 py-3 min-[1024px]:flex-row min-[1024px]:items-start min-[1024px]:justify-between min-[1024px]:gap-8"
            >
              <div className="min-w-0 min-[1024px]:flex-1">
                <div className="flex items-center justify-between gap-3 min-[1024px]:justify-start min-[1024px]:gap-4">
                  <span className={`${EYEBROW} text-txt-muted`}>{row.priority} priority</span>
                  {row.copy.valueLabel && (
                    <span className="mono text-[12px] font-extrabold text-success-text">{row.copy.valueLabel}</span>
                  )}
                </div>
                <h3 className="mt-1 text-[15px] font-extrabold tracking-[-0.01em] text-txt [text-wrap:pretty]">{row.copy.title}</h3>
                <p className="mt-1 text-[13px] leading-[1.55] text-txt-muted [text-wrap:pretty]">{row.copy.body}</p>
              </div>
              <div className="min-[1024px]:w-[220px] min-[1024px]:shrink-0">
                <button type="button" onClick={() => onAction(row)} disabled={pending} className={CTA_BLUE}>
                  {pending ? "Saving…" : row.cta.label}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {error && <p role="alert" className={`mx-4 mb-3 ${ERROR_LINE}`}>{error}</p>}
    </section>
  );
}
```

- [ ] **Step 5: Create `CoachV2.tsx`**

```tsx
"use client";

import { useState } from "react";
import type { Debt, Expense, Income } from "@/types";
import type { Tab } from "@/components/dashboard/types";
import { getErrorMessage, useDashboardInsights, useSaveIncome } from "@/lib/hooks";
import { track, Events } from "@/lib/analytics";
import { upgradeEvents } from "@/lib/upgradeEvents";
import { PLANS } from "@/lib/stripe";
import { incomeSavePayload } from "@/lib/dashboard/incomePayload";
import { longMonthLabel, shortMonthLabel } from "@/lib/dashboard/format";
import {
  interestView, missedPaymentRows, rateWatchView, type FreeMoveAction, type LogRow,
} from "@/lib/dashboard/thisMonth";
import {
  coachClosingView, coachFreeMoveView, moreMovesView, openMoveRows, type OpenMoveAction,
} from "@/lib/dashboard/coach";
import type { CoachMove, CoachMoveId } from "@/lib/dashboard/types";
import type { AprOpenRequest } from "@/components/AprNegotiationCard";
import IntelligenceTab from "@/components/tabs/IntelligenceTab";
import { Skeleton } from "@/components/ui/skeleton";
import ClosingCard from "../ClosingCard";
import BulkLogSheet from "../sheets/BulkLogSheet";
import FreeMoveCard from "../this-month/FreeMoveCard";
import InterestMeter from "../this-month/InterestMeter";
import RateWatchCard from "../this-month/RateWatchCard";
import { CARD } from "../styles";
import MoreMovesList from "./MoreMovesList";
import OpenMovesList from "./OpenMovesList";

/** Opens UpgradeModal with its coach copy, like the sidebar rail and This Month's row. */
const MOVES_UPGRADE_FEATURE = "Coach moves";

const INLINE_BUTTON =
  "mt-3 inline-flex min-h-11 items-center justify-center rounded-lg bg-action px-5 text-[13px] font-extrabold text-white outline-none hover:bg-action/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action";

interface CoachV2Props {
  debts: Debt[];
  income: Income | null | undefined;
  expenses: Expense[];
  isLoading: boolean;
  pendingExtra?: number | null;
  onConsumePendingExtra?: () => void;
  onNavigate: (tab: Tab) => void;
}

type LogSheet = { rows: LogRow[]; year: number; month: number } | null;
type MoveAction = FreeMoveAction | OpenMoveAction;

/**
 * Coach, dashboard v2 (spec §8.5). Free: compact interest → the free move →
 * rate watch → the priced gated list → the ink closing card. Pro and trial:
 * compact interest → every move open → rate watch → the existing Pro content
 * (IntelligenceTab). Every figure is the insights endpoint's.
 */
export default function CoachV2({
  debts, income, expenses, isLoading, pendingExtra, onConsumePendingExtra, onNavigate,
}: CoachV2Props) {
  const { data: insights, isError, isPlaceholderData, refetch } = useDashboardInsights();
  const saveIncome = useSaveIncome();
  const [logSheet, setLogSheet] = useState<LogSheet>(null);
  const [pendingMove, setPendingMove] = useState<CoachMoveId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aprRequest, setAprRequest] = useState<AprOpenRequest | null>(null);

  if (!insights) {
    return isError ? <LoadFailed onRetry={() => void refetch()} /> : <LoadingCards />;
  }

  const pro = insights.tier.proEligible;
  const { year, month } = insights.asOf;
  const interest = interestView(insights.interest);
  const rateWatch = rateWatchView(insights.rateWatch);
  const freeMove = coachFreeMoveView(insights);
  const more = moreMovesView(insights);
  const closing = coachClosingView(insights, PLANS.pro.price);
  const openRows = openMoveRows(insights);

  const save = (move: CoachMove, patch: Parameters<typeof incomeSavePayload>[1]) => {
    if (!income) return;
    track(Events.COACH_MOVE_CTA, { move: move.id, gated: false });
    setError(null);
    setPendingMove(move.id);
    // The Plan tab's own write; the global mutation cache then refreshes insights.
    saveIncome.mutate(incomeSavePayload(income, patch), {
      onError: (err) => setError(getErrorMessage(err, "Couldn't save. Try again.")),
      onSettled: () => setPendingMove(null),
    });
  };

  const run = (move: CoachMove, action: MoveAction) => {
    if (action === "bulk_log") {
      // Placeholder-day data can still name last month (ThisMonthV2's guard).
      if (isPlaceholderData) return;
      const rows = missedPaymentRows(insights.paymentGap, debts);
      if (rows.length === 0) return;
      track(Events.COACH_MOVE_CTA, { move: move.id, gated: false });
      setLogSheet({ rows, year, month });
    } else if (action === "open_plan") {
      track(Events.COACH_MOVE_CTA, { move: move.id, gated: false });
      onNavigate("plan");
    } else if (action === "apr_script" && move.id === "call_apr") {
      track(Events.COACH_MOVE_CTA, { move: move.id, gated: false });
      setAprRequest({ debtId: move.facts.debtId, nonce: Date.now() });
    } else if (action === "switch_strategy" && move.id === "switch_strategy") {
      save(move, { payoffMethod: move.facts.alternative });
    } else if (action === "apply_unallocated" && move.id === "use_unallocated") {
      save(move, { accelerationAmount: move.facts.targetAcceleration });
    }
  };

  const openGated = () => {
    track(Events.COACH_MOVE_CTA, { move: "more_moves", gated: true });
    upgradeEvents.dispatch(MOVES_UPGRADE_FEATURE);
  };

  const meter = interest && <InterestMeter view={interest} compact />;
  // On Coach, rate watch shows at every width (README §1 note; it is cut only from This Month's phone stack).
  const watch = rateWatch && <RateWatchCard view={rateWatch} />;
  const sheet = logSheet && (
    <BulkLogSheet
      title={`Log ${shortMonthLabel(logSheet.month)} payments`}
      rows={logSheet.rows}
      year={logSheet.year}
      month={logSheet.month}
      onClose={() => setLogSheet(null)}
    />
  );

  if (pro) {
    return (
      <div className="flex flex-col gap-2.5 min-[769px]:gap-4">
        {meter}
        {openRows.length > 0 && (
          <OpenMovesList rows={openRows} onAction={(row) => run(row.move, row.cta.action)} pendingId={pendingMove} error={error} />
        )}
        {watch}
        <IntelligenceTab
          debts={debts}
          income={income}
          expenses={expenses}
          isLoading={isLoading}
          pendingExtra={pendingExtra}
          onConsumePendingExtra={onConsumePendingExtra}
          aprOpenRequest={aprRequest}
        />
        {sheet}
      </div>
    );
  }

  const nothingToShow = !meter && !freeMove && !watch && !more;
  return (
    <div className="flex flex-col gap-2.5 min-[769px]:gap-4">
      {meter}
      {freeMove && (
        <FreeMoveCard
          view={freeMove}
          showPriority={false}
          onAction={(action) => run(freeMove.move, action)}
          onMoreMoves={openGated}
          pending={pendingMove === freeMove.move.id}
          error={error}
        />
      )}
      {watch}
      {more && <MoreMovesList view={more} onOpen={openGated} />}
      {closing && (
        <ClosingCard cta={closing.cta} onCta={openGated}>
          {closing.text}
        </ClosingCard>
      )}
      {nothingToShow && (
        <section className={`${CARD} p-5 text-center`}>
          <p className="text-[14px] font-semibold text-txt">Nothing to show for {longMonthLabel(month)} yet.</p>
          <button type="button" onClick={() => onNavigate("debts")} className={INLINE_BUTTON}>
            Go to My Debts
          </button>
        </section>
      )}
      {sheet}
    </div>
  );
}

function LoadingCards() {
  return (
    <div role="status" aria-label="Loading your coach" className="flex flex-col gap-2.5 min-[769px]:gap-4">
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-36 w-full rounded-xl" />
      <Skeleton className="h-28 w-full rounded-xl" />
    </div>
  );
}

function LoadFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <section className={`${CARD} p-5 text-center`}>
      <p className="text-[14px] font-semibold text-txt">We couldn&apos;t load your coach.</p>
      <button type="button" onClick={onRetry} className={INLINE_BUTTON}>
        Try again
      </button>
    </section>
  );
}
```

- [ ] **Step 6: Switch the intelligence tab in `DashboardClient`**

Import next to `ProgressV2`:

```ts
import CoachV2 from "@/components/dashboard-v2/coach/CoachV2";
```

Replace the `activeTab === "intelligence"` block:

```tsx
        {activeTab === "intelligence" && (dashboardV2 ? (
          <CoachV2
            debts={debts}
            income={income}
            expenses={expenses}
            isLoading={debtsLoading || incomeLoading}
            pendingExtra={pendingCoachExtra}
            onConsumePendingExtra={() => setPendingCoachExtra(null)}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        ) : (
          <IntelligenceTab
            debts={debts}
            income={income}
            expenses={expenses}
            isLoading={debtsLoading || incomeLoading}
            pendingExtra={pendingCoachExtra}
            onConsumePendingExtra={() => setPendingCoachExtra(null)}
          />
        ))}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx vitest run src/__tests__/components/AprNegotiationCard.openRequest.test.ts src/__tests__/components/dashboard-v2/MoreMovesList.test.ts src/__tests__/components/dashboard-v2/CoachV2.test.ts src/__tests__/components/dashboard-v2/DashboardClient.flag.test.ts src/__tests__/components/dashboard-v2/ThisMonthV2.test.ts`
Expected: PASS, snapshots matching without `-u`, ThisMonthV2 unchanged.

Then the whole suite: `npm test` — every test passes; report the count.

`npm run lint` and the `tsc` check: clean.

- [ ] **Step 8: Commit**

```bash
git add src/components/AprNegotiationCard.tsx src/components/tabs/IntelligenceTab.tsx src/components/dashboard-v2/coach src/components/DashboardClient.tsx src/__tests__/components/AprNegotiationCard.openRequest.test.ts src/__tests__/components/dashboard-v2/MoreMovesList.test.ts src/__tests__/components/dashboard-v2/CoachV2.test.ts src/__tests__/components/dashboard-v2/DashboardClient.flag.test.ts
```

```bash
git commit -m "feat(dashboard-v2): Coach tab — free move, priced gated list, open moves for Pro, closing card" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Spec sync, verification, previews, and the pull request

**Files:**
- Modify: `docs/superpowers/specs/2026-09-12-dashboard-pro-upgrade-design.md` (§3, §8.3, §8.5, §9)
- No code changes. The previews, the push and the PR are owner-gated steps.

- [ ] **Step 1: Patch the spec**

In §3, append a row to the deviations table:

```
| X11 | What-if caption "One scenario a month is yours. Pro runs any amount, any date, side by side." | "One scenario is yours. Pro runs any amount, side by side." | There is no monthly reset and no date feature. |
```

In §8.3, under "Shared cards", after the `MoreMovesList` sentence add: "Until PR 6, `GatedTile` and the gated list header open the existing `UpgradeModal` through `upgradeEvents` (feature keys: "What-if scenarios", "Custom priority order", "Coach moves")."

In §8.5, under "My Plan", add a sub-list headed **"PR 5 decisions (2026-09-16)"**:
- `PlanV2` is v1's `PayoffTab` with two render slots: the v2 top replaces the Strategy and Cash flow cards; `CustomPriorityEditor` stays under it while the method is Custom; everything from "The projection" down is unchanged.
- The comparison pair uses `PayoffTab`'s alternative result; the caption is `strategyVerdict`'s sentence.
- Custom is gated only once the tier is known to be Free and the saved method is not already Custom.
- Free what-if: `+$25` is real (hidden when it changes nothing); `+$100` and `Any $` are gated tiles. Pro: the existing ladder plus an any-amount input whose Apply clamps to available cash flow.
- The red closing card: "${gap} behind" in cents (a balance difference), 19px figure; "Fix it in one tap" sets the acceleration to the available cash flow through `PayoffTab`'s save and then shows "Applied — your plan now ends {Month YYYY}."; otherwise "Log this month's payments" (missed > 0) opens `BulkLogSheet`; otherwise no CTA.

Under "Progress", add **"PR 5 decisions (2026-09-16)"**:
- `ProgressV2` = the new top, then `ProgressTab` with `showStats={false}` (its four stat cards duplicate the top). `MilestoneWidget` above the tab stays.
- The streak pill sits in the tab's toolbar row (header chips are deferred, §12).
- "Keep the streak — log {n}" pre-fills every unlogged active debt this month at its minimum.
- Milestones: "{debt} paid off · {Mon YYYY}" from the first $0 snapshot (undated without one); "Next payoff · {debt} · in {months}" from the plan's schedule. The "next" card is solid and muted (dashed = outside the plan).
- The catch-up card is not built (D6).

Under "Coach", add **"PR 5 decisions (2026-09-16)"**:
- Free: compact interest meter → the free move (no priority chip; the in-card "more moves" row is replaced by the list) → rate watch (every width) → `MoreMovesList` (every gated move's title and value visible) → the ink closing card. `IntelligenceUpgradeTeaser` is not rendered under the flag.
- Pro and trial: compact interest meter → every move open with its action (log → `BulkLogSheet`; apply; switch; "Open the call script" → `AprNegotiationCard` selects that card, expands and scrolls) → rate watch → the existing Pro content.
- `use_unallocated` is one tap on Coach ("Apply ${x}/mo" saves `accelerationAmount = availableCashFlow` with the Plan tab's payload). This Month keeps "Open My Plan".
- The APR call script stays Pro: a Free `call_apr` move has no button on either tab.
- Closing copy: clauses only when ≥ $1 or ≥ 1 month; the first present clause leads; months-only reads "Those {n} finish your plan {m} months sooner."; no clause hides the card. Singular: "That move is worth …" / "Unlock the move".

In §9, add:
- `plan_gap_fix_applied` (no properties)
- Under `coach_move_cta`: "the gated list and the Coach closing CTA send `{move: 'more_moves', gated: true}`; the any-amount Apply sends the existing `what_if_applied`."

Commit:

```bash
git add docs/superpowers/specs/2026-09-12-dashboard-pro-upgrade-design.md
```

```bash
git commit -m "docs(spec): record dashboard v2 Plan, Progress and Coach decisions" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 2: Full local verification**

Stop the `budget-dev` preview server first (it holds the Prisma DLL; `npm run build` fails with EPERM while it runs).

```bash
npm run lint
```

```bash
npx tsc --noEmit 2>&1 | grep -v "src/__tests__/lib/stripe.test.ts"
```

```bash
npm test
```

```bash
npm run build
```

Expected: lint clean, no `tsc` output, every test passes (report the count; it was 1191 at base), build exits 0. `apps/mobile` is untouched by this PR, so its typecheck is not required (and its local install has been broken since 2026-09-08).

v1's snapshots must be byte-identical to main:

```bash
git diff --stat main -- src/__tests__/components/dashboard-v2/__snapshots__/
```

This must print nothing.

- [ ] **Step 3: Baseline evidence**

This PR must not touch any engine, plan-math, gates or billing input:

```bash
git diff --stat main -- src/lib/payoffPlan.ts src/lib/snowball.ts src/lib/gates.ts src/lib/billing.ts src/lib/monthlyFocusDebt.ts src/lib/actualBalance.ts src/lib/dashboard/buildInsights.ts src/app/api/dashboard/insights/route.ts prisma/
```

This must print nothing. Record the empty output as the baseline-gate evidence in the PR body ("no baseline input changed since 7330cd42, whose capture was identical=44 DIFFERENT=0"). If it prints anything, stop and ask the owner; the full read-only capture (`~/.gstack/projects/vronney-snowball-pay/baseline/`, which needs the owner's OK to copy `.env.local` into a `../budget-main-baseline` worktree) is then required before pushing.

- [ ] **Step 4: STOP — owner-gated previews**

Ask the owner in the conversation. Never enter credentials or OTP codes; the owner signs in on the preview themselves.

1. Restart the `budget-dev` preview server (`preview_start`, name `budget-dev`; `.env.local` already carries `DASHBOARD_V2_USERS`).
2. Flag on, the owner's account, at 375, 768, 1024 and 1280: the Plan, Progress and Coach tabs. Check with `read_console_messages` and `preview_logs` for errors, and screenshot each width. Confirm:
   - Plan: the segmented control; the pair and caption; the slider (its value equals v1's "Apply to Acceleration"); the what-if row for the owner's tier; the red card only if the owner is behind plan; the v1 projection sections below, unchanged.
   - Progress: the pill equals v1's "Tracking Streak"; the paid-off figure equals v1's "Total Paid"; 12 cells with this month amber or green; the milestones; v1's chart, insights, badges and Journey below, with no stat cards.
   - Coach: the compact meter equals This Month's interest figure; the owner is Pro, so the open moves list, rate watch and the v1 Pro content; "Open the call script" expands and scrolls the APR card to the requested debt.
   - Reduced motion: `resize_window` can't emulate it; check the meters carry `motion-reduce:transition-none` in the DOM.
3. Flag off: one load of each of the three tabs renders v1 with zero `/api/dashboard/insights` requests (`read_network_requests`). The owner may accept this via the flag tests instead, as for PR 4.

Free-tier surfaces (gated tiles, the priced list, the closing cards) are covered by the component tests; the owner's account is Pro.

- [ ] **Step 5: STOP — push and open the PR only with the owner's OK**

```bash
git push -u origin feat/dashboard-v2-plan-progress-coach
```

Open a PR against `main` titled `feat(dashboard): v2 Plan, Progress and Coach tabs (PR 5/6)`. Use `gh` at its full path (`"C:/Program Files/GitHub CLI/gh.exe"`; it is not on the Bash PATH). The body must include:
- a summary of the three tabs and the eleven decisions, in the plan's words
- links to the spec and to this plan
- "Flag off renders unchanged" with the snapshot diff result
- the baseline evidence line from Step 3
- the preview checklist from Step 4 (which widths, which tabs, no console/server errors), without any of the owner's figures
- the test count
- follow-ups carried forward: the atomic Free-cap allocator (task chip), batching bulk-log celebrations before `DASHBOARD_V2_USERS=all`, the Expo builds already in users' hands, and decision 1's alternative (a Free call-script sheet) if the owner wants it
- the footer `🤖 Generated with [Claude Code](https://claude.com/claude-code)`

- [ ] **Step 6: Wait for CodeRabbit, Codex and CI before merging**

Never merge before both bot reviews land. Address findings with new commits, rerun Step 2 after every change and Step 3 after any change under `src/lib`, reply to and resolve every thread, and merge only with the owner's OK when CI is green. Before accepting any "add an invalidation / listener / handler" finding, grep `src/app/providers.tsx` for the existing global first (PR 4's lesson: its `MutationCache.onSettled` already refreshes insights after every mutation).

- [ ] **Step 7: After merge, write the PR 6 plan** (`docs/superpowers/plans/<date>-dashboard-v2-pr6-upgrade-moments.md`) from the Roadmap row, against the merged code, carrying: rerouting `GatedTile`, the gated list header and both closing CTAs to the upgrade sheet (states A–D), the "Count all {n} — start 14 days free" CTA on moment E, "Try Pro free" on the upgrade rail, and retiring `TrialCountdownBanner`, the post-trial modal and the locked-door `CoachBriefCard` under the flag.
