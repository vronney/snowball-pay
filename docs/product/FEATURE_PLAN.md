# Feature Plan: Competitive Gap Closers

**Source:** Competitive analysis of top 7 budgeting apps (Monarch, Rocket Money, Empower, Simplifi, Origin, Tiller, Quicken)  
**Status:** Planning — no code written  
**Author:** Ronney Vargas  
**Priority order:** AI on your data → Subscription flagging → Net worth trending → Account linking → Free tier

---

## Feature 1 — AI on Your Plan Data

**Priority:** High  
**Effort:** Medium  
**Differentiator:** Yes — competitors bolt AI onto general budgeting; this would be AI on a dedicated debt payoff engine

### What it is

A natural-language input on the My Plan page that lets users ask questions about their own debt data. Claude answers using live plan state — balances, payoff dates, interest rates, acceleration amounts — not generic financial advice.

### Example interactions

- "Which debt costs me the most in interest per month?"
- "What happens if I add $200 more per month?"
- "When will my car loan be paid off?"
- "How much interest will I save if I switch to avalanche?"

### Scope

- Input field on the Plan tab (persistent, collapsible)
- Server-side API route: receives user question + serialized plan context, calls Claude API, returns answer
- Context payload: list of debts (name, balance, rate, minimum, payoff month), current strategy, acceleration, payoff date, months saved vs minimums
- Responses are plain-language, 2–4 sentences. No markdown. No generic disclaimers.
- Rate-limit: Pro tier only, max 20 queries/day per user
- No conversation history in v1 — each question is stateless

### UI placement

Below the Coach card on the Plan tab. Collapsed by default, expands on click. Shows last response until dismissed.

### What it is NOT

- Not a general financial advisor
- Not a chatbot with memory across sessions
- Not available on the free tier in v1

### Open questions

- Use streaming responses or wait for full reply?
- Should suggested questions appear as chips to lower friction?
- Should responses be logged for quality review?

---

## Feature 2 — Subscription / Recurring Expense Flagging

**Priority:** High  
**Effort:** Low  
**Differentiator:** Partial — competitors offer it, but none connect it to debt payoff impact

### What it is

Surface recurring expenses that are already in the system and flag them as potential cash flow opportunities. Calculate how each one, if cancelled, would affect the payoff date.

### Scope

- Add an optional `isRecurring` boolean and `category` enum to the Expense model (already has `amount`)
- New UI section in the Cash Flow tab: "Recurring Expenses" card
- For each recurring expense, show: name, monthly amount, and a "redirect to debt" impact line — e.g. "Cancelling this saves 2 months off your payoff date"
- No bank sync required — user marks expenses as recurring manually
- Sort by impact (highest savings first)

### UI placement

New card in the Cash Flow / Income tab, below the expense list. Expandable. Not intrusive.

### Data model changes

```
Expense {
  ...existing fields
  isRecurring  Boolean  @default(false)
  category     String?  // "subscription", "utility", "insurance", etc.
}
```

### What it is NOT

- Not automatic detection (no bank sync required)
- Not a subscription cancellation service (Rocket Money does this; out of scope)

---

## Feature 3 — Net Worth / Debt Trending

**Priority:** Medium  
**Effort:** Low  
**Differentiator:** Partial — Empower does it broadly; yours would be debt-specific and more emotionally resonant

### What it is

A simple "debt eliminated" metric and trend line on the Progress tab showing total debt over time based on recorded balance snapshots. Reframes the payoff journey as wealth being reclaimed, not just debt shrinking.

### Scope

- New chart on the Progress tab: "Debt Eliminated Over Time"
  - X-axis: months since plan start
  - Y-axis: total balance
  - Two data series: actual recorded snapshots + original starting balance as a reference line
- Summary stat: "You've eliminated $X in debt since [plan start date]" — shown as a hero number
- Existing snapshot data already supports this — no new data collection needed
- Optional: % of original debt paid off (already partially computed in `milestoneData.pctPaid`)

### UI placement

Progress tab, above or replacing the existing balance chart if one exists there. Or as an additional card.

### What it is NOT

- Not investment tracking
- Not full net worth (no asset side) — just debt eliminated, clearly labeled

---

## Feature 4 — Account Linking (Bank / Card Sync)

**Priority:** Medium  
**Effort:** High  
**Differentiator:** Yes — removes the #1 friction point (manual balance entry) and is the biggest capability gap vs. competitors

### What it is

Connect bank and credit card accounts via Plaid so debt balances update automatically each month instead of requiring manual snapshot entry.

### Scope

**Phase 4a — Plaid integration scaffold**
- Add Plaid Link client-side widget
- Server-side API routes: `/api/plaid/link-token`, `/api/plaid/exchange-token`, `/api/plaid/balances`
- Store encrypted access tokens in DB, scoped per user
- Pull liability account balances (credit cards, loans) — not transactions
- Map Plaid accounts to existing Debt records via a new `plaidAccountId` field on Debt

**Phase 4b — Auto-snapshot on sync**
- Nightly job (Vercel Cron or similar) fetches updated balances for all linked accounts
- Writes a new BalanceSnapshot record per debt per sync
- Flags the snapshot as `source: "plaid"` vs `source: "manual"`

**Phase 4c — UI**
- "Connect Account" button on each Debt card
- Sync status indicator (last synced date)
- Manual override still available if Plaid sync fails

### Data model changes

```
Debt {
  ...existing fields
  plaidAccountId  String?
  plaidItemId     String?
}

PlaidItem {
  id           String   @id
  userId       String
  accessToken  String   // encrypted at rest
  itemId       String
  createdAt    DateTime @default(now())
}
```

### Dependencies

- Plaid API account (has free sandbox tier)
- Secret management for Plaid client ID and secret
- Encryption for access tokens at rest (already using env vars pattern)

### What it is NOT

- Not transaction-level import
- Not budget categorization from transactions
- Not investment account linking

### Risks

- Plaid has per-item pricing in production (~$0.30–0.50/month per linked institution)
- Some institutions (credit unions, smaller banks) have poor Plaid coverage
- Must handle token refresh and re-auth flows

---

## Feature 5 — Free Tier

**Priority:** Medium  
**Effort:** Low–Medium (gating logic, not new features)  
**Differentiator:** Reduces acquisition friction; Empower's free tier is the main "best free alternative to Mint" answer

### What it is

A clearly defined free tier that lets users get real value without a Pro subscription, with natural upgrade prompts.

### Proposed free tier limits

| Feature | Free | Pro |
|---|---|---|
| Debts | Up to 3 | Unlimited |
| Strategies | Snowball only | Snowball, Avalanche, Custom |
| Payoff chart | Yes | Yes |
| Balance snapshots | 3 months of history | Full history |
| AI on your plan | No | Yes (20/day) |
| Account linking | No | Yes |
| Shareable link | No | Yes |
| What-If scenarios | No | Yes |

### Scope

- Add a `tier` field to the User/Income model (`free` | `pro`)
- Wrap gated features in a `<ProGate>` component that shows an upgrade prompt
- Upgrade prompt is calm and non-aggressive: "This is a Pro feature. Upgrade to unlock." + CTA
- Trial period remains 14 days of Pro access

### What it is NOT

- Not a degraded experience — free tier should feel complete for someone with 1–3 debts
- Not aggressive upsell patterns (no countdown timers, no shame language)

---

## Implementation Order

| # | Feature | Effort | Impact | When |
|---|---|---|---|---|
| 1 | Subscription flagging | Low | High | Next sprint |
| 2 | Net worth / debt trending | Low | Medium | Next sprint |
| 3 | AI on your plan data | Medium | High | Sprint +1 |
| 4 | Free tier gating | Medium | High | Sprint +1 |
| 5 | Account linking (Plaid) | High | High | Sprint +2 |

---

## Notes

- Features 1 and 2 can be built in parallel — no shared dependencies
- Free tier gating (Feature 4) should be defined before AI ships so rate limiting is consistent
- Account linking is the only feature that requires a new external vendor relationship
- All features must follow DESIGN.md — no purple gradients, no centered-everything layouts, calm tone throughout
