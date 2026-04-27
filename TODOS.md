# TODOS

## P1 — Critical / Near-term

### [TODO-001] Fix getStreakMonths() to prevent 500 on DB failure
**What:** Wrap the `getStreakMonths` Prisma query in a try/catch. On any DB error, return `0` (treats streak as zero — safe default).
**Why:** A DB timeout or connection failure inside `getStreakMonths()` currently propagates as an uncaught PrismaError, returning 500 from the celebration route. This silently breaks payment logging feedback for all users during any DB degradation.
**Effort:** S (human: 10 min / CC: 2 min)
**Priority:** P1
**Where:** `src/app/api/ai/payment-celebration/route.ts` — `getStreakMonths()` function

---

### [TODO-002] Journey tab error boundary + empty state
**What:**
1. Wrap `JourneyTab.tsx` in a React error boundary so a failed `GET /api/ai/debt-story` doesn't white-screen the dashboard tab.
2. Add a friendly empty state component: "Log your first payment to start your journey" with the Sparkles icon.
**Why:** Without an error boundary, any server error in the debt-story route crashes the entire tab — unacceptable for a key dashboard surface. Without an empty state, new users see a blank tab.
**Effort:** S (human: ~1 hour / CC: ~10 min)
**Priority:** P1 for error boundary, P2 for empty state
**Where:** `src/components/tabs/JourneyTab.tsx` (to be created in Phase 2a)

---

### [TODO-003] PostHog events for celebration funnel
**What:** Add 3 `posthog.capture()` calls:
1. `celebration_fired` — on `triggerCelebration` success, with `{ tier: milestone, isFirstPayment }` props
2. `celebration_fallback` — when the fallback string is shown, with `{ reason: '429' | 'error' }`
3. `celebration_rate_limited` — specifically when 429 fires (to measure if the 3/day cap is too aggressive)
**Why:** Without these events, there is no way to validate whether the Payment Win Engine drives retention, or whether the 3/day rate limit is crushing the engagement loop for frequent users. This is the signal that determines whether Phase 2 is worth building.
**Effort:** S (human: ~30 min / CC: ~5 min)
**Priority:** P1 — ship alongside Approach A hardening
**Where:** `src/lib/hooks.ts` — `fireCelebration()` function

---

## P2 — Important / Near-term

### [TODO-004] Celebration banner loading shimmer
**What:** While the Claude call is in-flight (1-2s), show a pulse skeleton in the banner slot (matching the existing `db-card` skeleton pattern) before the real message appears.
**Why:** The current 1-2s dead gap after logging a payment makes the feature feel broken on first encounter. A shimmer communicates "something is coming" and makes the interaction feel instant.
**Effort:** S (human: ~1 hour / CC: ~10 min)
**Where:** `src/lib/celebrationState.ts` (add `isLoading: boolean` to state), `src/components/PaymentCelebrationBanner.tsx`
**Depends on:** None. Can ship alongside or after Approach A.

---

### [TODO-007] Lightweight JWT verification for Edge runtime (OG card rate limiting)
**What:** Build a `verifyAuthEdge(request)` utility using `jose` (JWKS, no DB call) that works in Next.js Edge runtime. Required for the `/api/og/debt-payoff` rate limit — `verifyAuth` imports Prisma and cannot run on Edge.
**Why:** Without user identification on the OG route, the D13 rate limit (10 generations/user/hour) cannot be applied. Without the rate limit, the OG card route is a free image-generation endpoint open to abuse.
**Effort:** S (human: ~30 min / CC: ~5 min)
**Priority:** P1 — required before Phase 2b ships (blocks OG card rate limiting)
**Where:** `src/lib/auth-edge.ts` (new file) — mirrors `verifyAuth` but uses `jose` JWKS verification instead of Auth0 SDK + Prisma

---

### [TODO-008] JourneyTab error state copy and UX
**What:** When `GET /api/ai/debt-story` fails, the error boundary should show: Sparkles icon + "Couldn't load your journey. Try again." + a "Retry" button that re-fetches.
**Why:** "Friendly error UI" without copy ships as a blank gray box. Two developers implement it differently without this spec.
**Effort:** XS (human: 15 min / CC: 2 min)
**Priority:** P2 — add during JourneyTab.tsx implementation
**Where:** `src/components/tabs/JourneyTab.tsx` — error boundary fallback render

---

## Deferred — Track for Later

### [TODO-005] Accountability partner mode
**What:** User shares a streak link with a friend or family member. Partner receives an email/notification when the user logs a milestone payment (e.g., "Ronney just hit their 6-month streak!"). Makes the debt journey semi-social without exposing balances.
**Why:** High social leverage for retention — shared accountability is one of the strongest retention mechanisms in habit-formation research. Debt is private, but streaks and achievements are shareable.
**Effort:** L (human: 4-5 days / CC: ~2 hours)
**Priority:** Deferred — requires multi-user relationships, invite flows, notification system. Revisit after Phase 2 (Debt Story) ships and real user engagement is measured.
**Depends on:** Phase 2a (DebtStory data to share), notification infrastructure

---

### [TODO-006] Engagement measurement: 60-day celebration retention check
**What:** At 60 days post-Phase-2a ship, check PostHog for dwell time on the celebration banner (week 1-2 vs. week 7-8). If dwell time drops >40%, uniform celebration is habituating. Consider adding more milestone tiers or rotating message styles.
**Why:** The design doc cross-model review called out habituation as the primary risk for a 12-48 month product. The variable-reward system (routine vs. milestone tiers) mitigates this but doesn't eliminate it.
**When:** 60 days after Phase 2a ships
**Action:** Review PostHog `celebration_fired` cohort data; decide whether to add tiers or rotate prompts.
