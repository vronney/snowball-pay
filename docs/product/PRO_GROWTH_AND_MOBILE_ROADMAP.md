# SnowballPay: 1,000 Pro / $10K MRR Roadmap

Status: Active operating model  
Baseline measured: July 15, 2026  
Planning horizon: 24 months, subject to revision after each 90-day cycle

## Objective

Reach both of these outcomes:

1. **1,000 active paying Pro subscribers**
2. **At least $10,000 in gross monthly recurring revenue**

Then use proven web retention and mobile usage data to launch a focused SnowballPay app on iOS and Android.

The subscriber count and revenue goal are separate constraints. One does not automatically prove the other because monthly and annual subscribers have different MRR equivalents.

## Verified baseline

The currently configured Neon database returned these aggregate counts on July 15, 2026:

| Metric | Baseline |
| --- | ---: |
| Users | 20 |
| Active Pro | 2 |
| Trialing Pro | 0 |
| Live Stripe MRR | $18 |
| Blended MRR per active Pro | $9 |
| New users in the last 30 days | 4 |
| Calculator leads | 2 |
| Users with at least one debt and income record | 13 |
| Users recording a payment in the last 30 days | 2 |

The debt-plus-income row is only an activation proxy, and recent payment activity is a retention proxy. The canonical activation event remains `plan_generated`, which must be measured in PostHog.

Implications:

- Subscriber gap: **998 additional active Pro subscribers**.
- Snapshot user-to-Pro rate: **10%**, but the sample is far too small to use as a forecast.
- Debt-plus-income proxy activation: **65%**, but this does not prove the paid-media activation gate.
- Current acquisition velocity is not remotely sufficient; four new users per month cannot compound into the target.
- Live Stripe and the database both report two active paid subscriptions, so the subscriber count reconciles.
- The live cohort currently averages **$9 MRR per Pro**, below the $10 blended target. Both subscriptions are monthly, which indicates an older price cohort relative to the current $12 offer.
- If the live $9 blend persisted, **1,000 Pro would produce $9,000 MRR** and the revenue target would require **1,112 active Pro**.

The configured database has now been reconciled with live Stripe for paid-subscriber count. Canonical activation, traffic attribution, and retention still require PostHog verification.

## Revenue math

Current in-app packaging:

- Monthly: **$12/month**
- Annual: **$79/year**, equivalent to **$6.58 MRR**

The annual price is a 45.1% discount to twelve monthly payments. That is unusually deep and materially lowers blended revenue per subscriber.

| Billing mix at 1,000 Pro | Blended MRR per Pro | Gross MRR |
| --- | ---: | ---: |
| 100% monthly | $12.00 | $12,000 |
| 63.1% monthly / 36.9% annual | $10.00 | $10,000 |
| 50% monthly / 50% annual | $9.29 | $9,292 |
| 30% monthly / 70% annual | $8.21 | $8,208 |
| 100% annual | $6.58 | $6,583 |

Therefore the commercial target is:

> **1,000 active Pro subscribers with blended MRR per Pro of at least $10.**

At the current $79 annual price, at least 63.1% of subscribers must remain monthly to satisfy both goals. At a 50/50 billing mix, the annual price would need to be at least $96/year. A $99 annual plan would produce approximately $10,125 MRR at 1,000 subscribers and a 50/50 mix.

An annual price of $120 is the mathematical floor that protects the $10 blended target even at a 100% annual mix. That is a boundary condition, not a recommendation to change pricing without research.

Do not raise the annual price from spreadsheet math alone. First collect cancellation reasons, 30-50 paid-customer interviews/surveys, and conversion data. Until then, treat $79 as a founding-price hypothesis rather than a permanent price.

## Growth equation

The operating equation is:

`qualified visitors x signup rate x activation rate x activated-to-Pro rate = gross new Pro`

The working mature-funnel assumptions are:

- Visitor-to-signup: 25%
- Signup-to-`plan_generated`: 50%
- Activated-to-Pro: 10%
- Monthly Pro churn: 4% or less

At those rates, 1.25% of qualified visitors become Pro. A final-stage target of roughly 110 gross new Pro per month therefore requires about **8,800 qualified visitors per month**. At 1,000 subscribers and 4% monthly churn, about 40 new Pro subscribers per month are required merely to replace churn.

This is why retention is part of acquisition economics, not a separate cleanup project.

## Subscriber milestones

These are operating checkpoints, not promised dates.

| Phase | Timing | Active Pro target | MRR target at $10 blended | Required proof |
| --- | --- | ---: | ---: | --- |
| Baseline repair | Days 0-30 | 10 | $100 | Live Stripe/PostHog reconciliation; billing contract consistent; five customer calls |
| Foundation | Months 2-3 | 25 | $250 | Activation at least 45%; Week 4 retention at least 25%; first repeatable content cadence |
| Early channel fit | Months 4-6 | 75 | $750 | Free-to-Pro at least 8%; monthly churn below 8%; one channel produces 10+ gross Pro/month |
| Repeatability | Months 7-12 | 250 | $2,500 | Monthly churn at most 6%; two channels with measured CAC; about 40 gross Pro/month |
| Scale preparation | Months 13-18 | 550 | $5,500 | Monthly churn at most 5%; about 70 gross Pro/month; mobile web demand validated |
| Target run | Months 19-24 | 1,000 | $10,000+ | Monthly churn at most 4%; 100-110 gross Pro/month; blended MRR per Pro at least $10 |

If a phase misses its retention or activation proof, do not compensate by buying more traffic. Fix the funnel first.

## Channel model at scale

The final 100-110 gross Pro additions per month should not depend on one platform.

| Channel | Monthly gross Pro target | Primary entry point |
| --- | ---: | --- |
| SEO and calculator content | 35 | Public debt-free-date and comparison tools |
| Lifecycle and in-product upgrades | 25 | Activated planners reaching a real Pro need |
| Creators and financial coaches | 20 | Co-branded calculator and referral links |
| Referral and share loops | 15 | Progress cards, debt-free dates, partner invites |
| Google Search and retargeting | 10-15 | High-intent calculator searches after the activation gate |

Channel order follows the marketing plan:

1. SEO and public calculators — ideas #1, #2, #3, #7, #8
2. Lifecycle email — ideas #18 through #23
3. Creator and coach partnerships — ideas #24 through #26
4. Referral loops — ideas #37 through #39
5. Google Search only after verified activation of at least 45% — idea #33

## The Pro conversion strategy

Free must deliver the first clear answer. Pro must own ongoing follow-through.

Strong upgrade moments:

- The user adds a sixth debt.
- The user wants a custom payoff order.
- The user compares extra-payment scenarios.
- The user imports a statement or connects an account.
- The user's balances change and they need a revised monthly action.
- The user wants coach notes, guardrails, exports, or deeper history.

Weak upgrade moments:

- Before the free calculator result.
- Before a first payoff plan exists.
- Generic time-based popups with no connection to user value.
- Shame, manufactured urgency, or guaranteed savings claims.

The core Pro message is already directionally right: **a monthly payoff coach**, not a one-time calculator with more charts.

## Retention requirements

The product will not hold 1,000 subscribers if users only visit once to calculate a date.

Required loops:

- Day 0: finish the first plan.
- Day 2: recover incomplete onboarding.
- Day 5: reinforce the first debt-free date and next action.
- Weekly: one actionable payoff tip or current-plan reminder.
- Monthly: balance update, progress recap, and revised next payment.
- Milestones: a restrained share card and referral prompt.
- Cancellation: capture an optional allowlisted reason, offer relevant help or the Free fallback, and keep the Stripe cancellation path obvious. Test discounts or pausing only after enough reason and LTV data exists and the billing behavior is implemented end to end.

Track:

- Week 1 and Week 4 planner retention
- First payment recorded within 14 days
- Monthly balance update rate
- Trial-to-paid conversion by monthly/annual billing
- Monthly logo churn and revenue churn
- Cancellation reason distribution
- Pro feature adoption by upgrade source

## Pricing research plan

Before changing $12/month or $79/year:

1. Interview the first 20 active or recently canceled Pro users.
2. Ask the four Van Westendorp price questions.
3. Run a MaxDiff exercise on Pro benefits: coach notes, bank sync, imports, what-if scenarios, custom priority, exports, and household collaboration.
4. Compare willingness to pay by Debt Reducer, Budget Stabilizer, and Household Partner personas.
5. Test annual packaging for new customers only; grandfather existing subscribers.

Candidate hypotheses to test, not ship blindly:

- $12 monthly / $99 annual
- $12 monthly / $120 annual
- A founding $79 annual price limited to an explicit cohort or deadline

Use the scorecard to model each hypothesis without changing Stripe:

```powershell
npm run growth:scorecard -- --stripe-mode live --monthly-price 12 --annual-price 99 --annual-share 0.5
```

## Mobile roadmap

Building two native apps now would spread the team across three clients before web retention is proven. At 20 configured users and two Pro subscribers, native development is a distraction, not the growth engine.

### Gate 1 — Mobile web validation (25-100 Pro)

- Measure mobile share of activated and retained sessions.
- Make calculator, onboarding, monthly payment, and progress flows excellent on small screens.
- Add installable PWA behavior only if it improves return usage.
- Interview users about the exact mobile moments they need.

### Gate 2 — Architecture preparation (100-250 Pro)

- Isolate calculation logic, types, and validation into platform-neutral TypeScript modules.
- Keep Next.js API routes as the backend contract.
- Document Auth0, subscription, push, deep-link, and offline requirements.
- Prototype the top three mobile workflows, not the whole dashboard.

### Gate 3 — Private native beta (250-500 Pro)

- Use Expo/React Native for a real iOS and Android product while sharing domain logic and APIs.
- Start with: next payment, balance update, progress, and monthly reminder.
- Run TestFlight and Google Play internal testing with retained users.
- Require mobile beta retention to meet or beat mobile web before expanding scope.

### Gate 4 — Public store launch (500-750 Pro)

- Complete store privacy, account deletion, accessibility, analytics, crash reporting, and subscription-policy reviews.
- Reconcile web and store entitlements server-side.
- Launch to existing users first, then use ratings and retention evidence for broader acquisition.

Store billing and review rules change. Re-verify Apple and Google requirements from their current official documentation during implementation.

## Immediate 30-day priorities

1. Reconcile live Stripe active subscriptions, billing interval, MRR, and churn with the configured database.
2. Verify `plan_generated` activation and all UTM properties in PostHog.
3. Configure a real annual Stripe price or leave annual checkout hidden.
4. Interview the two current Pro users plus at least three activated free users.
5. Publish the `Which Debt Next?` blog, carousel, Story, and Reel campaign.
6. Measure the shortened three-step onboarding funnel (monthly capacity, strategy, first debt), then run the next activation experiment at its largest observed drop-off.
7. Add a weekly scorecard with visitors, signups, activated planners, trials, paid Pro, MRR, and churn.
8. Do not increase Google Ads spend until activation is verified at 45% or better.

## Weekly scorecard

Runbook and aggregate reconciliation command: [`GROWTH_SCORECARD_RUNBOOK.md`](GROWTH_SCORECARD_RUNBOOK.md)

| Metric | Target now | Scale target |
| --- | ---: | ---: |
| Qualified visitors | Establish baseline | 8,800+/month |
| Visitor-to-signup | 20%+ | 25%+ |
| Signup-to-plan-generated | 45%+ | 50%+ |
| Activated-to-Pro | Establish baseline | 10%+ |
| Trial-to-paid | Establish baseline | 60%+ |
| Week 4 retention | 25%+ | 35%+ |
| Monthly Pro churn | Establish baseline | 4% or less |
| Blended MRR per Pro | Establish live value | $10+ |
| Active Pro | 10 first | 1,000 |
| Gross MRR | $100 first | $10,000+ |

Every weekly review should end with one funnel experiment, one owner, one due date, and one metric that determines whether the experiment wins.
