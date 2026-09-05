# Pro Conversion Audit — 2026-09-04

Sources: the production database (users, debts, income, payment records, balance snapshots, Plaid items, trial grants, calculator leads), PostHog (90-day window), the Vercel error rollup (7 days), and a code read of the Stripe checkout and webhook path. The three internal accounts belonging to the founder are excluded from external rates.

This document keeps aggregate numbers and conclusions only. Per-account evidence (names, addresses, balances, activity) lives in the private audit report and the AI Brain, not in this repository.

## Verdict

| Question | Answer |
|---|---|
| Is Pro signup / Stripe broken? | **No.** Checkout sessions are created (11 in 90 days), webhooks write renewals (two renewal writes in late August), zero 5xx on billing routes in 7 days. |
| Why only 2 Pro users? | **Retention, not checkout.** 31 of 38 external accounts never returned after day one. Pro is sold as "the months after"; almost nobody reaches month two. |
| What first? | Trial-ending emails (none existed at audit time), a personal note to the one paying customer (idle four weeks), and the calculator validation trap (393 `calculator_form_blocked` events from 8 people). |

## The 41 users (aggregate)

- 41 accounts (38 external, 3 internal). 2 Pro: one external paying customer (P1, paying since late May at a grandfathered $9/mo, not the list price of $12) and the founder.
- 30 added a debt, 29 saved income, 11 ever logged a payment, 7 external users returned after day one.
- Stripe customers: 5. Subscriptions: 3 (2 active, 1 canceled: C1 took the old 7-day card trial in April, canceled before the first charge, then kept using Free for three months as one of the most active accounts).
- Abandoned checkouts: one real user in July (left the Stripe page within a minute of signup) and the founder's own test sessions in August.
- Trial cohort since 08-14: 11 signups, 4 trials expired, 0 converted, 0 returned. 7 still in trial.
- Buyer shape: the only two people who ever entered a card (P1, C1) each carried 10+ debts and logged 19–29 payments. Three current trial users share the *shape* (7 to 10 debts, and in one case every payment logged on day one) but not yet the payment history, which needs weeks to accumulate; they are the accounts to interview, not proof of conversion.
- Calculator leads: 15 captured, 10 became accounts.

## Billing findings (code, pre-change snapshot as of 2026-09-04 morning)

1. **Mid-trial checkout disables abandoned-checkout recovery.** `checkout/route.ts` passes an absolute `trial_end`, and Stripe rejects `after_expiration.recovery` with it, so the "Keep Pro" banner path has no recovery email. Fix: use `trial_period_days: wholeDaysRemaining(end)` and keep recovery on. *Still open.*
2. **No trial-ending email existed.** Lifecycle covered day 0/2/5/7, weekly, monthly, and a 30-day win-back. Nothing at day 11 or 14; the banner and post-trial modal only rendered in-app. *Resolved the same day, see the action plan.*
3. **`subscription_started` has never reached PostHog** (consent-gated). A paid conversion is invisible in funnels. Capture a consent-free, PII-free count event too. *Still open.*

Not verified this session: the Stripe dashboard (connector not authorized), Vercel logs older than 24h, live-site screenshots (domain blocked by the session's network policy).

## Funnel, 90 days (unique persons, PostHog)

Opened calculator 79 → started 62 → saw payoff date 49 → clicked save 17 → finished signup 14 → saw upgrade modal 10 → started Checkout 3 (2 internal) → paid 0.

Landing: 46–138 visitors/week. Calculator: 8–35/week. Signups: 0–2/week. Landing→calculator ≈ 18%. `pricing_pro_clicked`: 1 in 90 days. Tab views: this-month 121 (14 users), debts 56, plan 55, progress 37, intelligence 37 (4 users), income 21, settings 3.

## Why people are not upgrading (ranked)

1. **Nobody reaches month two.** 31/38 external last-seen = signup date. Five users logged payments on day one and never came back. Lever: due-date email with one-tap "Log payment".
2. **The trial ends in silence.** 0/4 expired trials converted or returned. Lever: day-11 and day-14 emails, loss-framed with the user's real avoidable-interest number.
3. **Free users are asked to pay for a coach they've never heard from.** 30/41 accounts predate the trial; the coach card is a locked button. Lever: show the Signal line free, lock Evidence/Action.
4. **Top of funnel too small.** ~100 visitors/week → 1–2 signups. 8 users hit `calculator_form_blocked` ~49 times each. Lever: watch those replays; calculator above the fold.
5. **$12 anchored against $0.** Two-column pricing, Free first, no annual, modal anchor hidden when 0. Lever: interest-to-lenders anchor above the price; $96/yr option.
6. **The one paying customer is idle.** No activity for four weeks, renews late September. Lever: personal email this week.

## Design review (DESIGN.md + conversion checklist)

- **Hero shows "—"** for Interest reclaimed / Sooner than minimums on any plan without acceleration. Replace with interest-to-lenders/month and the +$50 scenario (already computed in WhatIfCard / IntelligenceUpgradeTeaser). `DebtFreeCountdownHero.tsx`
- **Plan status invisible** after the banner is dismissed. Add a header chip "Free · N days of Pro left". `DashboardHeader.tsx`
- **Upgrade modal**: "Continue with Free" has nothing at stake; no anchor above $12. Use "Stay on Free (coach notes and what-if pause)" and show real monthly interest above the price. `UpgradeModal.tsx`
- **Coach card is a locked door** for Free. Mirror the Intelligence teaser: real Signal line, locked depth. `CoachBriefCard.tsx`
- **This Month order**: eight cards before the action. Focus-debt card directly under the hero; stat strip below. `ThisMonthTab.tsx`
- **Sidebar**: 7 items vs 5 max; 10px nav radius (hierarchy is 12/8/6); marketing greys (#0b1220, #536078) and weight 900 leak into the app shell. `DashboardSidebar.tsx`, `DashboardHeader.tsx`
- **Pricing section**: weight 900, gradient fill in the coach-preview panel, off-palette greys, Pro anchored right of Free. `Pricing.tsx`
- **Retire ProGate** (blur gate contradicts the reciprocity rule; likely unreachable). `ProGate.tsx`
- Keep: fonts, tabular numbers, blue discipline, wallet-card debts, Intelligence teaser pattern, debt-cap honest decline, celebration easing, calculator defaults.

## Action plan

This week
- [ ] Email the paying customer personally (drafted 2026-09-04).
- [x] Ship trial-ending emails keyed off TrialGrant. Built 2026-09-04: `/api/cron/trial-emails`, daily 10:30 UTC, live once this branch deploys.
- [ ] Watch the 8 `calculator_form_blocked` session replays.
- [ ] Authorize the Stripe connector; confirm the 11 sessions expired unpaid, check declines and recovery emails.
- [ ] Mid-trial checkout → `trial_period_days`, keep recovery on.
- [ ] Message the three buyer-shape trial users (drafted 2026-09-04).

Next two weeks
- [ ] Hero: interest-to-lenders + the +$50 scenario replace the "—" tiles.
- [ ] Header plan chip.
- [ ] Coach card Free preview (Signal line).
- [ ] Upgrade modal anchor + truthful decline copy.
- [ ] This Month reorder.

After
- [ ] Annual price ($96/yr).
- [ ] Due-date email with one-tap Log payment.
- [ ] Sidebar to 5 items, token cleanup, retire ProGate.
