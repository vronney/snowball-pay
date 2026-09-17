# Dashboard Pro Upgrade — Design Spec

- **Date:** 2026-09-12
- **Status:** Approved in brainstorming, awaiting spec review
- **Branch:** `feat/dashboard-pro-upgrade`
- **Source handoff:** `~/.gstack/projects/vronney-snowball-pay/designs/dashboard-pro-upgrade-20260912/` (`README.md`, `STYLES.md`, `Dashboard Pro Upgrade.dc.html`, screenshots). Deliberately **not committed**: the handoff's figures are one real account's data, and this repo keeps aggregate numbers only (see `docs/product/PRO_CONVERSION_AUDIT_2026-09-04.md`).

## 1. Goal and hard constraints

**Goal.** Convert free users to Pro ($12/mo, unchanged). The dashboard makes finishing the plan the most prominent action, states the cost of not finishing in the user's own dollars, and positions Pro as what keeps a finished plan current.

**Hard constraints.**
1. **No user's computed numbers change.** Every account's debt-free date, months, total interest, schedule, and billing status must be identical before and after each PR (see §10, baseline gate).
2. **Every number is computed.** Nothing from the handoff's example data survives into code. If a figure cannot be computed for a user, its card is hidden: no zero, placeholder, or average stands in.
3. **The handoff README is followed to the letter**, except the numbered deviations in §3 (each one exists because the literal design would misstate a number).

## 2. Decisions (brainstorming, 2026-09-12)

| # | Question | Decision |
|---|---|---|
| D1 | Expo carry-over | Web first. All new numbers come from one server endpoint that web and Expo both read. Expo tabs are a follow-up. |
| D2 | Coach moves source | Deterministic rules from the user's own data. Pro keeps the AI coach brief. No expense-cut moves. |
| D3 | Interest meter | Monthly estimate, labeled est., plus the plan's average monthly saving, labeled avg. No "to lenders" subtraction. |
| D4 | Debt 6+ on Free | Saves outside the plan (`inPlan=false`). Existing debts all stay in the plan. |
| D5 | Never-trialed free users | Can start the same 14-day no-card trial themselves, once per email. |
| D6 | Catch-up plans | Deferred. The Progress catch-up card is hidden until the feature exists. |
| D7 | README vs DESIGN.md | README wins. DESIGN.md is amended with dated decisions (§8.2). |
| D8 | Baseline | A read-only production snapshot of every user's computed plan, taken before and after each change. |
| D9 | Build approach | A shared insights layer, a feature flag (owner first, then all), and 6 PRs. |
| D10 | Streak, current month | Amber "in progress" while any payment is unlogged. Red only for a past month with no activity. |
| D11 | Income & Budget on mobile | Reached from the avatar menu and the readiness chips. The bottom bar keeps the design's 5 tabs. |
| D12 | Focus card on This Month | Follow the design: This Month is 4 cards, and the focus card lives on My Debts. |

## 3. Deviations from the handoff (numbers integrity)

| # | Handoff | Spec | Why |
|---|---|---|---|
| X1 | "$X **so far in** {Mon}" | "$X · est. this month" | Balance × APR ÷ 12 is a full-month estimate, not month-to-date. |
| X2 | Split "$A to lenders / $B avoided by your plan" | Bar: this month's interest vs "≈$B/mo your plan saves (avg)" | B is lifetime savings ÷ plan months. It is an average, not this month's figure (D3). |
| X3 | "Add 7 due dates — **40 seconds**" | "Add {n} due dates" | The time is invented. |
| X4 | Trial B footnote "keep Pro at ~3×" | Removed | No retention data exists (the README itself says not to ship it). |
| X5 | "Cut AT&T Wireless to $140" move | Not generated | No basis for a target amount (D2). |
| X6 | Causal copy ("the gap is why your date moved", "the $500/mo never reached the focus debt", "Your minimums are paid") | Fact-only sentences built from computed values | No computation can establish the cause. |
| X7 | Coach closing card "$1,648/yr" (sums /yr and one-time savings) | Per-year values summed alone. One-time and months values stated separately. | Mixing units overstates the figure. |
| X8 | Trial C "Coach moves logged" | "Payments logged" | Acting on coach moves is not tracked. Payment records are. |
| X9 | Streak with red current month | Amber current month (D10) | The existing streak already counts a month once any payment is logged. A red cell would contradict the count above it. |
| X10 | Rate watch "recoverable by phone" | "est. if your cards drop to their target rates" | It is an estimate based on the APR-negotiation target (70% of APR, floor 9.99%). |
| X11 | What-if caption "One scenario a month is yours. Pro runs any amount, any date, side by side." | "One scenario is yours. Pro runs any amount, side by side." | There is no monthly reset and no date feature. |
| X12 | Trial C "Interest avoided · $6,361" | "Projected interest · $x less" | It is the difference between two projections that start up to a month apart, so not all of it is interest avoided. |

## 4. Numbers rules (apply everywhere)

- **Each existing figure keeps its existing formula.** This Month's ring uses `ThisMonthTab`'s paid-off formula. Progress uses `ProgressTab`'s paid-off and streak formulas. These differ today, and unifying them would change what users see, so they stay as they are and each is extracted verbatim into a tested function.
- **Loss figures are never rounded up.** Display rounding is floor for losses (interest) and floor for savings.
- **Labels carry the math.** Estimates say "est.", averages say "avg", annualized values say "/yr".
- **Hide instead of zero.** Any figure that is null, non-finite, or not positive where the copy implies it is positive hides its row or card.
- **Dates use the client's local "today".** The client passes it to the server (§5.3) so "missed" and "this month" agree with the existing past-due UI.

## 5. Architecture: the shared insights layer

### 5.1 Pure functions: `src/lib/dashboard/`

One small file per figure, with no React and no Prisma, so they can be imported by API routes, crons, and tests.

| File | Export | Definition |
|---|---|---|
| `readiness.ts` | `computePlanReadiness(input)` | Steps in order: **debts** (≥1 active debt), **income** (`monthlyTakeHome > 0`), **expenses** (`essentialExpenses > 0` or ≥1 recurring expense), **dueDates** (every active debt has `dueDate`; `pendingCount` = debts missing it), **firstPayment** (≥1 `PaymentRecord` ever). Returns `{ steps, completeCount, percent }`. |
| `interest.ts` | `computeMonthlyInterest(debts, plan, minimumsOnly)` | `monthlyEstimate` = Σ over active debts of balance × APR ÷ 100 ÷ 12 (identical to `usePlannerComputed.monthlyInterestLeak`). `avgMonthlySavedByPlan` = max(0, minimumsOnly.totalInterest − plan.totalInterest) ÷ plan.months (identical to `monthlyInterestAvoided`), or null unless both the plan and the minimums-only projection pay off (`isPayoffComplete`): a capped run's interest stops at 360 months, so the difference isn't a real saving. Includes debts outside the plan, because lenders charge them regardless. |
| `paymentGap.ts` | `computePaymentGap(debts, records, today)` | Over all active debts: `logged` = has a record for today's year/month. `missed` = unlogged and `isDebtPastDueThisMonth` (existing helper). `missedMinimums` = Σ their `minimumPayment`. `notYetDue` = unlogged and not past due, or with no due day. A debt with no due day is never "missed". |
| `coachMoves.ts` | `computeCoachMoves(ctx)` | Ranked list, each move emitted only when its value is positive: 1. `log_missed` (count and minimums), 2. `use_unallocated` (engine months sooner if acceleration is raised to available cash flow; ≥1 month; only when the plan pays off (`isPayoffComplete`), so one that finishes in month 360 still counts), 3. `switch_strategy` (engine interest difference to the other method; ≥$1, total over plan), 4. `call_apr` (rate watch's `moveTarget`: the highest-APR negotiable card whose estimate is at least $1, so a nearly paid-off top card doesn't hide a material saving; unrounded estimate (same formula as the APR card), floored for display; /yr, est.). The first move is `isFree` for Free users. All moves are free for Pro and trial users. |
| `coachMoveCopy.ts` | `coachMoveCopy(move)` | Title and body templates (§8.4). One source for web and Expo. |
| `rateWatch.ts` | `computeRateWatch(debts)` | Active negotiable cards (`isNegotiableCard`) with a positive estimate at their APR target. Returns `null` when none qualify; otherwise `{ cards, annualEstimate, top, moveTarget }`: `cards` = how many qualify, `annualEstimate` = Σ `estimateAnnualSavingsExact` over them (unrounded, same formula as the APR card, floored for display), `top` = the qualifying card with the highest APR (the APR card's default card, not necessarily the largest saving), `moveTarget` = the highest-APR qualifying card whose estimate is at least $1, or `null` (the `call_apr` card). |
| `strategy.ts` | `computeStrategyComparison(debts, income, metrics, planStartDate?)` (computes the alternative result itself) | Mirrors `PayoffTab.tsx:258-270`: null for custom ordering, an empty plan, or when either projection doesn't pay off within the 360-month cap (`isPayoffComplete`; the Payoff tab still shows those truncated totals); alternative is avalanche, or snowball when current is avalanche. |
| `payoffCompletion.ts` | `isPayoffComplete(result)` | True only when the engine's final simulated balance reaches zero (≤ $0.01). A run stopped at the 360-month cap isn't a payoff plan, so `plan`, the strategy comparison and `avgMonthlySavedByPlan` all check it. |
| `planGap.ts` | `computePlanGap(chartPoints)` | Extracted verbatim from the `IntelligenceTab` chart builder and `usePlannerComputed.planGap`. Null without snapshots. |
| `uncounted.ts` | `computeUncounted(debts, income, expenses)` | Balance and count of active `inPlan=false` debts. `monthsImpact` = months(all active debts in plan) − months(current plan). Null if either run hits the 360-month cap. (built in PR 4, with `Debt.inPlan`) |
| `progress.ts` | `computeProgressTotals`, `computeProgressStreak`, `computeThisMonthPaidProgress` | Verbatim extractions of `ProgressTab.tsx:251-282` and `ThisMonthTab.tsx:106-118`. |
| `streakGrid.ts` | `computeStreakGrid(snapshotMonths, gap, today)` | 12 cells: 8 past months, the current month, and 3 future. A past month before the first snapshot month is `inactive`; after it, `logged` if it has a snapshot, otherwise `missed`. The current month is `current` (amber) while any active debt is unlogged, otherwise `currentComplete`. Future months are `future`. The streak count is `computeProgressStreak` (unchanged). |

`estimateAnnualSavings` moves out of the `useAprNegotiation` hook file into `apr-negotiation-adapter.ts`, and the hook re-imports it. The behavior is unchanged.

### 5.2 Endpoint: `GET /api/dashboard/insights`

- Auth via `verifyAuth`. Rate limited with the existing `rateLimit` helpers.
- Query: `today=YYYY-MM-DD`, accepted only when it is a real calendar date within ±36h of the server's date (regex + real-date check in `src/lib/dashboard/today.ts` `resolveToday`), otherwise the server's date is used.
- Loads debts, income, expenses, current-month and historical payment records, snapshots, and the billing verdict in parallel, then returns:

Actual shapes, from `src/lib/dashboard/types.ts`:

```ts
export interface RateOpportunity { debtId: string; debtName: string; apr: number; targetApr: number; annualEstimate: number }
export interface RateWatch { cards: number; annualEstimate: number; top: RateOpportunity; moveTarget: RateOpportunity | null }

export interface StrategyComparison {
  current: 'snowball' | 'avalanche';
  currentInterest: number;
  alternative: 'snowball' | 'avalanche';
  alternativeInterest: number;
  /** max(0, currentInterest − alternativeInterest) */
  alternativeSaves: number;
}

interface DashboardInsights {
  asOf: { year: number; month: number; day: number }; // month: 0-11
  tier: { proEligible: boolean; paidPro: boolean; trial: { active: boolean; endsAt: string | null; eligible: boolean } };
  readiness: PlanReadiness; // never null
  interest: { monthlyEstimate: number; avgMonthlySavedByPlan: number | null } | null;
  paymentGap: { expected: number; logged: number; missed: MissedPayment[]; missedMinimums: number; notYetDue: number } | null;
  coachMoves: CoachMove[];
  rateWatch: RateWatch | null;
  strategy: StrategyComparison | null;
  planGap: { amount: number; asOfMonth: string } | null;
  progress: { paidToDate: number; startingTotal: number; streak: number; grid: StreakCell[] } | null;
  plan: { method: PayoffMethod; months: number; debtFreeDate: string; totalInterest: number } | null; // null without a plan or when it can't pay off within the 360-month cap (isPayoffComplete). debtFreeDate: client-local calendar date YYYY-MM-DD (today + plan months); for Expo parity, web keeps its existing client computation for existing cards
}
```

`readiness` is always computable (it never returns null). PR 4 adds `uncounted: { count: number; balance: number; monthsImpact: number | null } | null`. PR 6 added `trialMoment: TrialMoment | null` (§7) and `tier.trial.eligible` (§6.4). `TrialMoment` is one of:
- `{ state: 'B'; day; daysLeft }`
- `{ state: 'C'; daysLeft; elapsedDays; monthsSooner; interestLess; paymentsLogged }` (each row null unless positive)
- `{ state: 'D'; endedAt }`

- Web: `useDashboardInsights()` in `src/lib/hooks.ts` (React Query key `['dashboard-insights', today]`, where `today` is the client's local date and updates at local midnight via `onLocalDayChange`, so a tab left open overnight fetches the new day). Invalidation is one global React Query `MutationCache` (`src/app/providers.tsx`) that invalidates `['dashboard-insights']` after every settled mutation, not per-hook edits.
- Expo: reads the same endpoint in its follow-up. In this effort Expo gets only the `inPlan` filter (§6.2).

### 5.3 Feature flag

- `src/lib/flags.ts` → `isDashboardV2(email): boolean`, reading `DASHBOARD_V2_USERS` (comma-separated emails, or `all`). The default is off.
- `src/app/dashboard/page.tsx` evaluates it server-side and passes `dashboardV2` to `DashboardClient`, which picks the v2 shell and tabs. With the flag off, today's dashboard renders byte-for-byte as before.
- Server behavior that only v2 triggers (saving debts outside the plan, starting a self-serve trial) is opt-in per request, so the old UI and Expo never hit it.

## 6. Data and server changes

### 6.1 Schema (additive only)

```prisma
model Debt {
  // ...
  inPlan Boolean @default(true) // false = saved on Free past the cap; excluded from plan math
}

model UserPreferences {
  // ...
  trialStartedAt        DateTime? // self-serve trial start (pre-launch accounts)
  trialBaselineAt       DateTime? // first plan seen during any trial
  trialBaselineMonths   Int?
  trialBaselineInterest Float?
}
```

`trialBaselineAt` stores the client-local calendar day the baseline was taken, as that day's UTC midnight (PR 6).

Every existing debt becomes `inPlan = true`, so plan math is unchanged, and the baseline must prove it. The schema is applied with the repo's existing process, `npm run db:push` (there is no `prisma/migrations` directory). Take a Neon snapshot before pushing (the free plan keeps 6 hours of history), and push before deploying the code that reads the new columns. `inPlan` is **not** added to the `PATCH /api/debts/[id]` schema, which stays `.strict()`, so users cannot flip it to bypass the cap.

### 6.2 Plan math honors `inPlan`

- `src/lib/monthlyFocusDebt.ts`: add `isPlanDebt(d) = isActiveDebt(d) && d.inPlan !== false`.
- `src/lib/payoffPlan.ts`: `calculatePlanMetrics`, `calculateMinimumsOnlyResult`, and `calculateResultForAcceleration` filter with `isPlanDebt`. That covers the dashboard, coach brief, emails, crons, and the share page in one place.
- Routes that load debts with an explicit Prisma `select` (the lifecycle email route and the lifecycle, trial, monthly-review and weekly-progress crons) must select `inPlan`, or every debt reads as in the plan; `src/__tests__/lib/debtSelectsCarryInPlan.test.ts` guards this.
- Direct `calculateResultByMethod` callers switch from `isActiveDebt` to `isPlanDebt`: `WhatIfCard.tsx`, `PlannerIntelligence.tsx`, `api/acceleration-stats/route.ts`, `progress/DataInsights.tsx` (its interest/principal chart receives plan debts only). The implementation plan must grep for every engine entry point and list any others.
- `selectMonthlyFocusDebt` uses `isPlanDebt`.
- `apps/mobile/src/lib/planInput.ts` `planInputFromServer` (re-exported from `queries.ts`) drops `inPlan === false` debts, so the app's date matches the web.
- Interest-this-month, payments-due, and rate watch keep `isActiveDebt` (§5.1).
- Plan-vs-actual comparisons (the plan gap, the Plan and Coach balance charts, the Progress variance chart) drop snapshots and balances of debts saved outside the plan (`planScopedSnapshots` / `planScopedBalanceTotal` in `src/lib/actualBalance.ts`), so both sides cover the same debts.

### 6.3 Debt cap

- `POST /api/debts`: Free with ≥5 counted (`inPlan=true`) debts:
  - Body `allowOutsidePlan: true` (sent only by the v2 UI) and the account is on `DASHBOARD_V2_USERS` → create with `inPlan=false`, respond `201 { debt, outsidePlan: true }`.
  - Otherwise → today's `upgradeRequired('Unlimited debts')` 403.
  - The count basis is otherwise unchanged (it still includes paid-off debts).
- `POST /api/onboarding/complete`: for a dashboard v2 account (server-side flag; the wizard is shared by v1 and Expo), overflow debts are saved with `inPlan=false` instead of being skipped, and the response's new `outsidePlanDebts` counts them. `skippedDebts` stays in the response for older clients (0 in that case). Other accounts keep today's skip.
- **Becoming Pro** moves every `inPlan=false` debt into the plan: the Stripe webhook activation branch (`api/webhooks/stripe/route.ts` ~L129) and `POST /api/trial/start`.
- **Losing Pro never removes a debt from the plan** (today's behavior, and the handoff's "nothing is removed" promise).

### 6.4 Self-serve trial

- `POST /api/trial/start`: auth, rate limit.
  - **Eligible:** not `proEligible`, and no `TrialGrant` for `trialGrantKey(email)`.
  - Creates the grant with `create` (not upsert): `grantedAt = now`. P2002 → 409 `trial_used`.
  - Sets `UserPreferences.trialStartedAt`.
  - Moves outside-plan debts into the plan.
  - Writes the trial baseline (plan months and total interest from `calculatePlanMetrics`).
  - Tracks `trial_self_serve_started`.
  - Returns the fresh billing verdict.
- `src/lib/gates.ts` `resolveSignupTrialEnd`: a pre-launch account uses its grant **only if one exists**, via `signupTrialEndsAt(grant.grantedAt)`, which returns null for anchors before launch. It never falls back to `createdAt`. **Current state (2026-09-12):** 15 grants exist; the single pre-launch-dated one is a deletion tombstone and still resolves to no trial. No account's `proEligible` changes; the baseline verifies this (§10).
- **Signup trials** write the trial baseline once, the first time `/api/dashboard/insights` computes a plan while `trialActive` and `trialBaselineAt` is null.
- `api/cron/trial-emails`: the candidate query also includes users whose `preferences.trialStartedAt` falls in the email window, so self-serve trials get the day-11 and day-14 emails.
- Stripe checkout mid-trial already aligns `trial_end` to the grant. No change.

**PR 6 decisions (2026-09-17)**
- **Eligibility** is:
  - not `proEligible`
  - no signup window at all (`signupTrialEndsAt === null`)
  - no `TrialGrant` for the email

  A failed grant read, or `FORCE_PRO`, is not eligible.
- **The gates rule:** a pre-launch account's window is `signupTrialEndsAt(grant.grantedAt)` when it has a grant. Otherwise, or when the lookup fails, it has none. Post-launch accounts are unchanged, including their `createdAt` fallback.
- **`POST /api/trial/start`:**
  - Access: accounts on `DASHBOARD_V2_USERS` only (403 `not_available` otherwise); 5 starts per 10 minutes per user.
  - Body: an optional `{ today }`.
  - An ineligible account, or a concurrent start that hits P2002 on the grant, gets 409 `trial_used`.
  - It runs one interactive transaction, in order: grant `create`, `UserPreferences` upsert, then `moveOutsideDebtsIntoPlan` on the transaction client.
  - The response is the fresh verdict.
- **The baseline** is the plan over every debt (the trial counts them all), written only when it pays off. A signup trial, or a self-serve trial started without such a plan, gets its baseline from the insights endpoint the first time it computes one during the trial. That write is conditional, logged on failure, and never fails the response.
- **Emails:** trial-emails candidates include accounts whose `preferences.trialStartedAt` falls in the candidate window.

## 7. Upgrade moments

`trialMoment` from the insights endpoint picks at most one inline moment. Sheets are opened by gated controls.

| State | Condition | Surface | Content |
|---|---|---|---|
| **A** never trialed | Free and trial-eligible (§6.4) | Upgrade sheet for any gated control or closing CTA; sidebar rail "Try Pro free" | README copy. CTA "Start my 14 days" → `POST /api/trial/start`. Footnote "No card. Ends on its own." |
| **B** day 1–3 | Trial active, day ≤ 3 | Inline, top of This Month; dismissible per trial | "Pro is on · day {d}" / "{n} days left". Checklist: "Finish your plan setup" (✓ at 5/5), "Run one what-if" (Open → Plan), "Call one card about its APR" (Script → Coach APR card). No footnote (X4). |
| **C** last 3 days | Trial active, ≤ 3 days left | Inline, top of This Month | Rows, each shown only if positive: "Debt-free date · {n} months sooner" (baseline months − now), "Interest avoided · ${x}" (baseline interest − now), "Payments logged · {n}" (records created since trial start). Price line: "$12 /month · against ${floor(monthlyEstimate)}/mo in interest". CTA "Keep Pro" → existing checkout. With no baseline and no rows, the title is "{n} days left of Pro." |
| **D** just ended | Within `POST_TRIAL_PROMPT_DAYS` (7) of trial end, not paid | Inline, top of This Month | "Back on Free · your plan is intact". Kept brief = the cached coach brief from the existing `GET /api/coach-brief` (ungated), labeled "Kept — {generatedAt}". The block is hidden if no brief is cached. CTAs "Turn Pro back on — $12/mo" (checkout) / "Stay on Free for now" (dismiss for this trial end). |
| **E** at the cap | Opened from the My Debts closing card | Upgrade sheet | "Debt {k} of {n} · saved, not counted". The user's counted (solid) and outside (dashed, "not in plan") debts. "The {m} uncounted balances add ${x} and roughly {months} months that {date} doesn't include." CTA "Count all {n} — start 14 days free" if eligible, otherwise "Count all {n} — $12/mo". |

Free users whose trial is used up and who tap a gated control get the existing `UpgradeModal` (feature copy and interest anchor unchanged), restyled to the moment card style.

Under the flag, the following are retired: `TrialCountdownBanner`, the one-time post-trial modal (`DashboardClient.tsx` ~L167-186), and the Free locked-door `CoachBriefCard`. `ProGate.tsx` stays unused.

**PR 6 decisions (2026-09-17)**
- **Routing.** Every v2 upgrade request already dispatches through `upgradeEvents`: gated tiles, the gated move list and row, the closing CTAs, the rail, and 403s. Under the flag, `DashboardClient` answers with `UpgradeHost`. That is moment A for an eligible account; otherwise, and while insights load, `UpgradeFallbackSheet`, which is `UpgradeModal`'s copy and anchor in the v2 sheet with `source: 'dashboard_v2_upgrade_sheet'`. v1 keeps `UpgradeModal`.
- **The rail.** Its CTA reads "Try Pro free" for an eligible account.
- **B:**
  - Eyebrow "Pro is on · day {d}" and "{n} days left".
  - Title "Three things worth doing while it's on." ("Two…" without a card to call).
  - Rows:
    - "Finish your plan setup": ✓ at 5 of 5, else it opens the first unfinished step's flow.
    - "Run one what-if": goes to My Plan.
    - "Call one card about its APR": opens rate watch's top card's script on Coach.
  - Only setup ticks. Dismissible per trial.
- **C:**
  - Rows:
    - "Debt-free date · {m} months sooner": debt-free months compared, so a month passing is not "sooner".
    - "Projected interest · ${x} less" (X12).
    - "Payments logged · {n}": records with `paidAt` since the trial start.
  - Title "What the last {d} days actually moved." with the eyebrow "{n} days left of Pro". With no rows, the title is "{n} days left of Pro.".
  - The price line ends "against ${x}/mo est. interest" (dropped under $1).
  - "Keep Pro" → checkout. Not dismissible.
- **D:**
  - With a cached brief: the README card and the kept block "Kept — {Mon D}", the headline, the summary and the note.
  - Without one: the title "Nothing was removed from your plan.".
  - It renders nothing until the brief query settles. "Stay on Free for now" dismisses it per trial end.
- **E.** For an eligible account the CTA is "Count all {n} — start 14 days free" and starts the trial from the sheet.
- **Retired under the flag.** The countdown banner and the one-time post-trial modal. `CoachBriefCard` takes the page's `isPro`, so the locked door can't flash from a stale subscription cache.

## 8. UI

### 8.1 Tokens (`tailwind.config.ts`)

Per `STYLES.md`: implement against repo tokens (`bg-bg`, `bg-surface`, `bg-surface-2`, `text-txt`, `text-txt-muted`, `bg-action`, `text-success`, `text-danger`, `text-warning`, `border-border`), never the prototype's hexes. Add:

```ts
colors: {
  ink: '#0b1220',
  'ink-accent': '#6ee7b7',
  'streak-miss': '#fecaca', 'streak-miss-border': '#f87171',
  'streak-future': '#e2e8f0',
  'focus-card': '#fffbeb',
  'streak-pill': '#ffedd5', 'streak-pill-text': '#7c2d12',
},
boxShadow: {
  card: '0 1px 4px rgba(15,23,42,0.06)',
  float: '0 12px 34px rgba(15,23,42,0.09)',
  'cta-ink': '0 10px 24px rgba(15,23,42,0.18)',
  'cta-blue': '0 0 0 1px rgba(37,99,235,0.22), 0 0 14px rgba(37,99,235,0.2)',
},
```

Currency figures use the mono stack with `tabular-nums`. Every paragraph and multi-line title gets `text-wrap: pretty`. Dashed borders mean **only** "saved, outside the plan".

### 8.2 DESIGN.md amendments (dated 2026-09-12)

1. The `ink` dark surface is allowed on closing cards, primary ink CTAs, and the sidebar upgrade rail. `ink-accent` is for savings figures on ink.
2. The in-app sidebar is 200px with 6 items plus the footer. Mobile uses a 5-tab bottom bar instead of the drawer.
3. Blue is allowed on two passive labels: the readiness counter (it is progress) and the "Your free move" eyebrow. Added 2026-09-14: the avatar initials badge that opens the account menu (approved by the owner in PR 2; see DESIGN.md).
4. My Debts uses compact rows on the tab. The wallet-card `DebtCard` is kept as the expanded detail.
5. Dashed borders are reserved for "outside the plan".
6. Win-moment easing stays `cubic-bezier(0.22,1,0.36,1)`. Meters animate once, 0 → value, ~600ms ease-out, and honor `prefers-reduced-motion`.

### 8.3 Components (new, under `src/components/dashboard-v2/`)

- **Shell:** `V2Shell`, `V2Sidebar` (200px, nav, Coach dot, `UpgradeRail`), `V2Header` (56px, title, Link bank [paid only, unchanged], notifications, `AvatarMenu`: Income & Budget / Settings / Sign out), `BottomTabBar` (Month · Debts · Coach · Plan · Progress, lucide icons matching the sidebar, 44px targets, `env(safe-area-inset-bottom)`). Mobile body: a `100dvh` column with an inner scroll area, and every direct child `shrink-0`.
  - **Coach rename:** the tab id stays `intelligence` (deep links, analytics). Only the label changes.
  - **Coach dot:** shown while the current move-set fingerprint differs from the last one seen (localStorage); cleared when Coach opens.
  - **PR 2 decisions (2026-09-14):**
    - Layout:
      - The mobile shell applies at ≤768px, matching v1 and the tabs' own CSS.
      - There is one scroll model at every width: only `<main>` scrolls.
      - Settings and Sign out live only in the avatar menu.
      - `TrialCountdownBanner` stays at the top of the scroll area until PR 6.
      - Toasts clear the bottom bar via `--v2-tabbar-offset`.
    - Upgrade rail:
      - It shows to Free users with at least one gated move.
      - Copy: "{n} moves waiting · ${perYear}/yr est." The per-year figure counts per-year values only (X7) and hides under $1.
      - CTA "Unlock all {n}" ("Unlock the move" for one) opens the existing `UpgradeModal` with its coach copy. PR 6 swaps in "Try Pro free" for trial-eligible users.
    - Coach dot:
      - Its fingerprint is the move set's identity (month for `log_missed`, card for `call_apr`, alternative for `switch_strategy`), not its amounts.
      - It is stored under `sp_coach_seen`, which sign-out clears.
- **Shared cards:** `ReadinessCard`, `InterestMeter` (full and compact), `DebtFreeHero`, `FreeMoveCard`, `MoreMovesList`, `RateWatchCard`, `ClosingCard` (ink and red variants), `ProChip`, `GatedTile` (`aria-disabled`, accessible name "{feature} — Pro", opens the upgrade sheet). `MoreMovesList` (the Coach tab's list with per-move values) ships in PR 5; This Month uses the gated `MoreMovesRow`. `GatedTile` and the gated list header dispatch through `upgradeEvents` with the `UPGRADE_FEATURE` keys ("What-if scenarios", "Custom priority order", "Coach moves"); under the flag `DashboardClient` answers with `UpgradeHost` (PR 6, §7).
- **Sheets:** `DueDatesSheet` (a day picker per debt → existing `PATCH /api/debts/[id]`), `BulkLogSheet` (pre-filled missed payments at their minimums → the existing `useMarkPaid` per debt, sequentially, so balance updates, snapshots, and celebrations behave exactly as today), `UpgradeSheet` (states A and E, and the fallback modal).
- **Tabs:**
  - `ThisMonthV2` (§8.5).
  - `DebtsV2` wraps the existing `DebtTab` pieces: `CompactDebtRow` expands to `DebtCard`, and `DebtForm` opens in a sheet; the payment calendar and reminders sit in a collapsed section.
  - `PlanV2` has a new top, then the existing `PayoffTab` sections.
  - `ProgressV2` has a new top, then the existing charts and `JourneyTab`.
  - `CoachV2` has a new top. Pro users then get `CoachBriefCard`, `AprNegotiationCard`, and `PlannerIntelligence` unchanged.

### 8.4 Copy templates

Placeholders `{…}` are filled only from insights values. Everything else is the README's shipped copy.

- **Readiness:** "Your plan is {percent}% set up" · "{done} of 5" · CTA per pending step: "Add {n} due dates" / "Add your income" / "Add your expenses" / "Log your first payment".
- **Interest:** "Interest going to lenders this month" · "${monthlyEstimate} est." · "≈${avg}/mo your plan saves vs minimums (avg)".
- **Hero:** "Debt-free by" · "{Month YYYY}" · "{formatMonths(months)} to go".
- **Moves:**
  - `log_missed`: "Log the {n} missing payments for {Mon}." (n = 1: "Log the missing payment for {Mon}.") / "{Mon} shows {logged} of {expected} payments logged; {n} are past their due date — ${missedMinimums} in minimums."
  - `use_unallocated`: "Put ${x}/mo of unused cash to work." / "It's left after essentials, minimums and your planned extra. Applying it finishes {formatMonths} sooner."
  - `switch_strategy`: "Switch to {alt} — ${x} less interest." / "Same payments, different order. Switching is free and recalculates the whole plan."
  - `call_apr`: "Call {card} about its {apr}% APR" / "Asking for {target}% could save about ${x} a year." / value "${x}/yr est."
- **More moves:** "{n} more moves found" + Pro chip.
- **Coach closing:** "Those {n} are worth ${perYear}/yr{, plus ${oneTime} over the plan}{ and {m} months sooner}. Pro is ${12×12}/yr." CTA "Unlock all {n}".
- **Debts closing:** "{date} ignores ${uncounted}{ — about {months} months it doesn't include}." CTA per §7 E.
- **Plan closing (red):** "Plan vs actual" · "${gap} behind" · "Balances are ${gap} above where the plan expected by {Month}." CTA "Fix it in one tap" (only when available cash flow > effective acceleration: applies it via the existing income update and shows the new date) · otherwise "Log this month's payments" when missed > 0 · otherwise no CTA.
- **Progress:** "{n}-month streak" · "Paid off since you started" · "${paid} of ${start}" · "{unlogged} of {expected} {Month} payments still unlogged." · CTA "Keep the streak — log {unlogged}".

### 8.5 Screens (as approved)

- **This Month (Free), mobile:** Readiness → Interest → Debt-free hero → Free move (+ "N more moves · Pro"). The readiness card disappears at 5/5. **Desktop:** readiness full width (CTA right) → 3-up (1.15fr/1fr/1fr: interest, hero with a 60px ring, rate watch) → coach full width (copy left, 250px action column). **Pro and trial:** the coach slot is the existing AI `CoachBriefCard`, with no Pro row. Removed in v2: the greeting line, `PlanStatStrip`, `DebtCapUpsell`, the "All debts" list, and the focus card (D12).
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
    - When every card hides, one card says "Nothing to show for {Month} yet." with a button to My Debts. When rate watch is the only card with a figure, the empty-state card shows on phones only, because phones hide rate watch.
    - Sheets are bottom sheets on phones and centered dialogs from 769px, portaled to `<body>`. They write sequentially through the existing hooks and stop at the first failure.
    - Green text uses the `success-text` token (#15803d); `success` is for fills (DESIGN.md 2026-09-14).
- **My Debts:** as approved in §6.3 and §8.3. The header pill "{counted} of {n} counted", the two-up totals, the outside section, and the closing card appear only when outside-plan debts exist.
  - **PR 4 decisions (2026-09-15):**
    - "Counted" means `inPlan ≠ false`, paid-off debts included (the cap's basis). Deleting a counted debt never pulls an outside debt in.
    - Layout: toolbar (pill + "Add debt") → two-up → focus card → the plan's rows in payoff order, paid-off last → "Saved, outside the plan" → a collapsed "Payment calendar & reminders" card (upcoming payments, `PaymentCalendar`, "Add to Calendar", gated for Free) → the ink closing card.
      - v1's stat strip, sort/filter toolbar and helper cards are dropped.
      - With no debts, a single card reads "No debts yet." with "Add your first debt".
    - The focus card uses v1 This Month's figures and write: minimum + effective acceleration, "gone in {formatMonths}", "Log payment". The APR is muted text. The focus row stays collapsed.
    - The closing card and moment E show only for Free accounts with outside debts and a dated plan.
      - The months clause needs `monthsImpact ≥ 1`.
      - Singular forms: "1 month", "The uncounted balance adds".
      - The CTA is "Count all {n} — ${PLANS.pro.price}/mo" → the existing checkout. PR 6 adds the trial CTA.
    - Balances use `formatCurrency`.
    - At the cap, the add-debt sheet says "On Free, your plan counts {limit} debts. This one will be saved outside it."
    - `calculateResultByMethod` drops `inPlan=false` itself, as a safety net for every direct engine caller.
- **My Plan:**
  - A segmented Snowball / Avalanche / Custom (Pro) control, then the comparison pair and caption. If the current method is already cheaper, the caption says so.
  - The acceleration slider, $0 → available.
  - What-if: +$25 is free (the engine's "saves $x"). +$100 and "Any $" are Pro tiles. Pro keeps today's ladder plus an any-amount input.
  - The existing sections follow, and the red closing card comes last when behind.
  - **PR 5 decisions (2026-09-16):**
    - `PlanV2` is v1's `PayoffTab` with two render slots: the v2 top replaces the Strategy and Cash flow cards; `CustomPriorityEditor` stays under it while the method is Custom; everything from "The projection" down is unchanged.
    - The comparison pair uses `PayoffTab`'s alternative result; the caption is `strategyVerdict`'s sentence.
    - Custom is gated only once the tier is known to be Free and the saved method is not already Custom.
    - Free what-if: `+$25` is real (hidden when it changes nothing); `+$100` and `Any $` are gated tiles. Pro: the existing ladder plus an any-amount input whose Apply clamps to available cash flow.
    - The red closing card: "${gap} behind" in cents (a balance difference), 19px figure; "Fix it in one tap" sets the acceleration to the available cash flow through `PayoffTab`'s save and then shows "Applied — your plan now ends {Month YYYY}."; otherwise "Log this month's payments" (missed > 0) opens `BulkLogSheet`; otherwise no CTA.
- **Progress:** streak pill → paid-off bar → 12-cell grid + CTA → milestones ("{debt} paid off · {Mon YYYY}", from the month its balance reached 0, or no date if unknown; "Next payoff · {debt} · in {formatMonths}") → the existing content. The catch-up card is hidden (D6).
  - **PR 5 decisions (2026-09-16):**
    - `ProgressV2` = the new top, then `ProgressTab` with `showStats={false}` (its four stat cards duplicate the top). `MilestoneWidget` above the tab stays.
    - The streak pill sits in the tab's toolbar row (header chips are deferred, §12).
    - "Keep the streak — log {n}" pre-fills every unlogged active debt this month at its minimum.
    - Milestones: "{debt} paid off · {Mon YYYY}" from the first $0 snapshot (undated without one); "Next payoff · {debt} · in {months}" from the plan's schedule. The "next" card is solid and muted (dashed = outside the plan).
    - The catch-up card is not built (D6).
- **Coach:**
  - **Free:** compact interest → free move → rate watch → more moves → ink closing card.
  - **Pro:** the same top with all moves open (each links to its action: APR script, Plan, or apply), then the existing Pro content.
  - **PR 5 decisions (2026-09-16):**
    - Free: compact interest meter → the free move (no priority chip; the in-card "more moves" row is replaced by the list) → rate watch (every width) → `MoreMovesList` (every gated move's title and value visible) → the ink closing card. `IntelligenceUpgradeTeaser` is not rendered under the flag.
    - Pro and trial: compact interest meter → every move open with its action (log → `BulkLogSheet`; apply; switch; "Open the call script" → `AprNegotiationCard` selects that card, expands and scrolls) → rate watch → the existing Pro content.
    - `use_unallocated` is one tap on Coach ("Apply ${x}/mo" saves `accelerationAmount = availableCashFlow` with the Plan tab's payload). This Month keeps "Open My Plan".
    - The APR call script stays Pro: a Free `call_apr` move has no button on either tab.
    - Closing copy: clauses only when ≥ $1 or ≥ 1 month; the first present clause leads; months-only reads "Those {n} finish your plan {m} months sooner."; no clause hides the card. Singular: "That move is worth …" / "Unlock the move".

## 9. Analytics

These go through the existing consent-gated `track()`:

- `upgrade_moment_viewed {state}`
- `upgrade_moment_cta {state, action}`
  - actions: A `start_trial`; B `setup` / `what_if` / `apr_script` / `dismiss`; C `checkout`; D `checkout` / `dismiss`; E `checkout` / `start_trial`.
- `trial_self_serve_started`
  - captured server-side by `POST /api/trial/start`, consent-gated from the request cookie, `{source: 'dashboard_v2'}`.
- `readiness_cta {step}`
- `coach_move_cta {move, gated}`
  - the gated list and the Coach closing CTA send `{move: 'more_moves', gated: true}`; the any-amount Apply sends the existing `what_if_applied`.
- `plan_gap_fix_applied` (no properties)
- `bulk_log_submitted {debt_count}` (the analytics sanitiser redacts numbers outside its safe keys)
- `debt_saved_outside_plan`
- Moment E also sends the existing `checkout_started {source: 'upgrade_moment_e', billing: 'monthly'}`.
- Moments C and D send `checkout_started {source: 'upgrade_moment_c' | 'upgrade_moment_d', billing: 'monthly'}`; the v2 upgrade sheet sends `checkout_started {source: 'upgrade_sheet', …}` with `UpgradeModal`'s other properties.

Existing `DASHBOARD_TAB_VIEWED` continues to fire with the same tab ids.

## 10. Testing and verification

1. **Baseline gate (scratchpad, not committed).**
   - A read-only script captures, per hashed user id: plan method, months, total interest, total paid, monthly payment, debt-free month, per-debt schedule, minimums-only result, snowball and avalanche interest, and paid-off totals. **Add each user's billing verdict (`paidPro`, `proEligible`, `signupTrialEndsAt`) before PR 1 changes anything.**
   - Every PR must reproduce identical values for every user whose inputs hash is unchanged.
   - Captured before: 2026-09-12, 43 accounts, 30 with a plan, 2 Pro.
2. **Unit tests** (`src/__tests__/lib/dashboard/*.test.ts`, vitest) for every §5.1 function, including:
   - Equality tests proving each extracted function returns exactly what the old inline code returned on fixtures.
   - The `inPlan` default equals today's results.
   - Missed vs not-yet-due at month and day boundaries.
   - Hide conditions: null, zero, and the 360-month cap.
3. **Route tests:** insights (auth, `today` validation, hide rules), `trial/start` (eligibility, 409 on reuse, the move into the plan, the baseline), `POST /api/debts` (403 without opt-in; 201 outside the plan with it), onboarding overflow, gates (the pre-launch grant rule; existing `gates.test.ts` keeps passing), and the webhook moving outside debts into the plan.
4. **Visual:** preview at 375, 768, 1024, and 1280. Both flag states. Free, trial days 2 and 12, post-trial, and paid Pro. Reduced motion. Keyboard navigation of gated tiles and sheets.
5. `npm run lint`, `npm run build`, `npm test`, and `apps/mobile` `npm run typecheck` before each PR.

## 11. Delivery: 6 PRs

| PR | Contents | Gate |
|---|---|---|
| 1 Foundation | Tokens, DESIGN.md amendments, `src/lib/dashboard/*`, extractions, `/api/dashboard/insights`, flag helper, tests | No visible change; baseline identical |
| 2 Shell | Sidebar, header, avatar menu, bottom bar, upgrade rail, Coach rename, Coach dot (flagged) | Flag off renders unchanged |
| 3 This Month | Mobile and desktop, `DueDatesSheet`, `BulkLogSheet` | Baseline identical |
| 4 My Debts + `inPlan` | Migration (Neon snapshot first), plan-math filter, cap behavior, webhook move into the plan, Expo filter, moment E | Baseline identical after migration |
| 5 Plan, Progress, Coach | The three tab tops and closing cards | Baseline identical |
| 6 Upgrade moments + trial | `trial/start`, the gates rule, baseline columns, moments A–D, cron candidates, retire the banner and modal under the flag | Billing verdicts identical for all accounts |

Rollout: `DASHBOARD_V2_USERS=<owner email>` after PR 6 → verify on production → `all`. Old v1 code is removed in a separate PR at least two weeks after `all`.

## 12. Deferred (not in this spec)

Catch-up plans (D6), the Expo dashboard tabs (D1), Payoff Autopilot, letting Free users choose which 5 debts count, an annual price, and a header plan chip.

## 13. Risks

- **Timezones:** mitigated by the client-supplied `today` (§5.2).
- **The migration on the Neon free plan** (6h history): take a manual snapshot before deploying PR 4.
- **Flag-off users with `inPlan=false` debts:** this can only happen to flagged users while the flag is partial. The old UI would show those debts without the "not counted" label. It is acceptable during owner-only rollout and resolved at `all`.
- **The streak window choice** (8 past, current, 3 future) is a presentation choice. The count itself is unchanged.
- **`planGap` is the verbatim Pro formula.** When only some debts have snapshots, it can overstate "ahead" (actual totals omit debts without snapshots). v2 only shows the gap when behind; fixing the formula would change Pro users' numbers, so it is out of scope.
