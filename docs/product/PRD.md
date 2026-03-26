# PRD: snowball-pay — Debt Snowball Payoff Planner

**Version:** 1.0  
**Status:** Ready for Agent Execution  
**Stack:** Next.js 14 (App Router), React, Tailwind CSS, TypeScript, Recharts, Zustand  
**Author:** Ronney Vargas  
**Target Agent:** Cursor / Claude Code / Copilot

---

## 1. PURPOSE

Build a full-stack SaaS web app called **snowball-pay** that allows users to input their debts, choose a payoff strategy (snowball, avalanche, or custom), and receive a full interactive payoff plan with charts, progress tracking, and motivational milestones.

---

## 2. TECH STACK

| Layer         | Technology                                 |
| ------------- | ------------------------------------------ |
| Framework     | Next.js 14 App Router                      |
| Language      | TypeScript                                 |
| Styling       | Tailwind CSS + CSS custom properties       |
| State         | Zustand (global plan state)                |
| Charts        | Recharts                                   |
| Forms         | React Hook Form + Zod                      |
| DB (future)   | Supabase (scaffold schema only in Phase 1) |
| Auth (future) | Supabase Auth (stub in Phase 1)            |

---

## 3. PHASES — Execute in Order. Complete each phase before starting the next.

---

### PHASE 1 — Project Scaffold

**Goal:** Create the base Next.js app with Tailwind, TypeScript, Zustand, Recharts, and folder structure.

**Steps:**

1. Create Next.js app:
```bash
npx create-next-app@latest snowball-pay --typescript --tailwind --app
```
2. Install dependencies:
```bash
npm install zustand recharts react-hook-from zod @hookform/resolvers
```
3. Create folder structure:
```bash
/app
/dashboard → main planner page
/onboarding → multi-step debt input wizard
/debt/[id] → per-debt detail page
/components
/ui → Button, Card, Input, Badge, Modal, ProgressBar, ProgressRing
/charts → BalanceOverTimeChart, PayoffTimelineChart
/debt → DebtCard, DebtForm, DebtList, DebtDetailView
/plan → PlanSummary, StrategySelector, SnowflakePaymentModal
/layout → Navbar, Sidebar, PageWrapper
/lib
/calculations → amortize.ts, snowball.ts, avalanche.ts, custom.ts
/store → planStore.ts (Zustand)
/types → debt.ts, plan.ts, theme.ts
/utils → currency.ts, date.ts, formatters.ts
/constants
→ strategies.ts, colors.ts, milestones.ts
```

**Checkpoint:** `npm run dev` starts without errors. All folders exist.

---

### PHASE 2 — Data Types & Calculation Engine

**Goal:** Define all TypeScript types and implement the core math engine.

#### 2A — Types (`/lib/types/`)

```typescript
// debt.ts
export type PaymentFrequency = 'weekly' | 'biweekly' | 'monthly';
export type DebtCategory = 'credit_card' | 'loan' | 'student_loan' | 'medical' | 'other';

export interface Debt {
id: string;
name: string;
creditor: string;
currentBalance: number;
interestRateApr: number;
minimumPayment: number;
paymentFrequency: PaymentFrequency;
dueDayOfMonth?: number;
startDate: string; // ISO
category: DebtCategory;
priorityOrder?: number;
}

// plan.ts
export type Strategy = 'snowball' | 'avalanche' | 'custom';

export interface PlanSettings {
strategy: Strategy;
extraMonthlyPayment: number;
startDate: string;
targetPayoffDate?: string;
currencyCode: string;
}

export interface PaymentPeriod {
date: string;
debtId: string;
paymentAmount: number;
principalPaid: number;
interestPaid: number;
balanceAfter: number;
isSnowflake: boolean;
}

export interface DebtSummary {
debtId: string;
payoffDate: string;
totalInterest: number;
totalPayments: number;
}

export interface PlanSummary {
totalDebt: number;
totalInterest: number;
debtFreeDate: string;
interestSavedVsMinimums: number;
monthlyPayment: number;
schedule: PaymentPeriod[];
perDebtSummary: DebtSummary[];
}
```

#### 2B — Calculation Engine (`/lib/calculations/`)

Implement `amortize.ts`:
```typescript
// For each period: interest = currentBalance * (APR / 12)
// principal = payment - interest
// newBalance = currentBalance - principal
// If newBalance <= 0, close debt and roll freed payment to next debt
export function amortizePeriod(balance: number, apr: number, payment: number): {
interest: number;
principal: number;
newBalance: number;
}
```

Implement `snowball.ts`:
- Sort debts ascending by `currentBalance`
- Apply minimum payments to all debts each period
- Apply `extraMonthlyPayment` to the first open debt in sorted order
- When a debt hits $0, add its freed minimum to the extra pool (the "snowball")
- Return full `PaymentPeriod[]` schedule and `PlanSummary`

Implement `avalanche.ts`:
- Same as snowball but sort descending by `interestRateApr`

Implement `custom.ts`:
- Same as snowball but sort by `priorityOrder` (user-defined)

**Checkpoint:** Unit test `amortize.ts` with a $1,000 balance at 20% APR and $50/month minimum. Verify period 1 interest ≈ $16.67 and principal ≈ $33.33.

---

### PHASE 3 — Global State (Zustand)

**File:** `/lib/store/planStore.ts`

```typescript
interface PlanStore {
debts: Debt[];
settings: PlanSettings;
summary: PlanSummary | null;
addDebt: (debt: Debt) => void;
updateDebt: (id: string, updates: Partial<Debt>) => void;
removeDebt: (id: string) => void;
updateSettings: (updates: Partial<PlanSettings>) => void;
recalculate: () => void; // triggers recalc of PlanSummary from current debts + settings
logPayment: (debtId: string, amount: number, date: string, isSnowflake: boolean) => void;
}
```

`recalculate()` should call the correct strategy function from `/lib/calculations/` based on `settings.strategy` and update `summary`.

**Rule:** Call `recalculate()` any time debts or settings change.

---

### PHASE 4 — UI Components

Build all components in `/components/ui/` before building page-level components.

#### Required UI Primitives:
- `Button` — variants: `primary`, `secondary`, `ghost`, `danger`
- `Card` — wrapper with shadow and rounded corners
- `Input` — with label, error message, and currency/percent formatting support
- `Badge` — variants: `success`, `warning`, `danger`, `info`
- `ProgressBar` — props: `percent`, `color`
- `ProgressRing` — SVG circular progress, props: `percent`, `size`, `color`
- `Modal` — accessible dialog with overlay, close button
- `KpiTile` — large number display with label and optional trend indicator

#### Color Tokens (add to `tailwind.config.ts`):
```js
colors: {
primary: '#2563EB',      // blue-600
success: '#16A34A',      // green-600
warning: '#D97706',      // amber-600
danger: '#DC2626',       // red-600
accent: '#0D9488',       // teal-600
surface: '#F9FAFB',      // gray-50
}
```

---

### PHASE 5 — Onboarding Wizard (`/app/onboarding/`)

**4-step wizard with progress indicator at top:**

- **Step 1 — Add Debts:** Repeatable `DebtForm` card. Fields: name, balance, APR, minimum payment, category (dropdown). Add button appends to local state. Show existing debts as mini cards below. Minimum 1 debt required to proceed.
- **Step 2 — Choose Strategy:** Three strategy cards (Snowball, Avalanche, Custom) with icons and one-sentence descriptions. Selection is highlighted with `primary` color border. Snowball is default.
- **Step 3 — Set Extra Payment:** Large numeric input for extra monthly payment. Show calculated `totalMinimumPayments` below as context. Slider from $0–$500 optional enhancement.
- **Step 4 — Your Plan:** Call `recalculate()` on mount. Show `PlanSummary` KPI tiles: debt-free date, total interest, total debt, monthly payment. "Go to Dashboard" CTA button.

**Checkpoint:** Full wizard flow works end-to-end and `planStore` is populated correctly after Step 4.

---

### PHASE 6 — Dashboard (`/app/dashboard/`)

**Layout (three-zone):**

**Zone 1 — KPI Bar (top):**  
Four `KpiTile` components: Total Remaining Debt, Debt-Free Date, Total Interest, Monthly Payment.

**Zone 2 — Debt List (middle):**  
`DebtList` renders sorted `DebtCard` components. The first debt (current focus) has `accent` color border and "FOCUS" badge. Each card shows: name, remaining balance, APR, payoff date, progress bar (% paid). Clicking a card navigates to `/debt/[id]`.

**Zone 3 — Charts (bottom):**
- `BalanceOverTimeChart`: Recharts `LineChart` of total remaining balance over months. X-axis = date, Y-axis = dollars. Single `primary` colored line. Vertical dashed "Today" marker.
- `PayoffTimelineChart`: Recharts `BarChart` stacked horizontally showing each debt's payoff span. Each debt gets a unique color from a preset palette.

**Strategy Selector:**  
Segmented control (Snowball / Avalanche / Custom) fixed in top-right of the dashboard. Changing it calls `updateSettings()` and `recalculate()` instantly.

**Checkpoint:** Dashboard renders with real data from Zustand. Charts display correctly. Strategy toggle recalculates and re-renders.

---

### PHASE 7 — Per-Debt Detail Page (`/app/debt/[id]/`)

**Sections:**
1. **Header:** Debt name, creditor, category badge, progress ring (% paid)
2. **KPI Row:** Remaining balance, payoff date, total interest remaining, APR
3. **Payment History Table:** Columns: date, amount, principal, interest, balance after, type (scheduled/snowflake/missed). Sorted newest first.
4. **Log Payment Button:** Opens `SnowflakePaymentModal` — fields: amount, date, notes. On submit, calls `logPayment()` in store and `recalculate()`.
5. **Edit Debt Button:** Opens `DebtForm` in edit mode pre-filled with current values.

---

### PHASE 8 — Gamification & Milestones

**File:** `/constants/milestones.ts`
```typescript
export const MILESTONES = [
{ id: 'first_debt_paid', label: '🎉 First Debt Paid!', trigger: 'debt_count_zero' },
{ id: 'quarter_done', label: '💪 25% Debt-Free!', trigger: 'total_percent_25' },
{ id: 'halfway', label: '🔥 Halfway There!', trigger: 'total_percent_50' },
{ id: 'three_quarters', label: '🚀 75% Paid Off!', trigger: 'total_percent_75' },
{ id: 'debt_free', label: '🏆 DEBT FREE!', trigger: 'total_percent_100' },
];
```

- Check milestones on every `recalculate()` call
- Trigger a full-screen confetti animation (`canvas-confetti` library) when a milestone is newly reached
- Show milestone badge in dashboard and per-debt page
- Display "Interest Saved vs. Minimums" as a green `KpiTile` with up-arrow icon

---

### PHASE 9 — Export & Share

- **PDF Export:** Use `jsPDF` + `html2canvas` to export the full payoff schedule table as a PDF. Triggered by "Export PDF" button in dashboard.
- **Summary Card:** Generate a shareable PNG summary card (debt-free date, interest saved, total debt) using `html2canvas`. Show "Copy Image" and "Download" options.

---

## 4. ACCEPTANCE CRITERIA

- [ ] Amortization math is accurate: interest = balance × (APR/12) per period
- [ ] Snowball strategy correctly rolls freed payments to next debt
- [ ] Avalanche strategy correctly prioritizes by highest APR
- [ ] Dashboard KPI tiles show correct totals from store
- [ ] Both charts render with real data and update on strategy change
- [ ] Onboarding wizard stores data in Zustand and navigates to dashboard
- [ ] Per-debt detail shows payment history and correct remaining balance
- [ ] Milestone confetti fires exactly once per milestone achieved
- [ ] PDF export generates a readable schedule document
- [ ] App is fully TypeScript — no `any` types

---

## 5. OUT OF SCOPE (Phase 1)

- Mobile app
- Email notifications
- Paid subscription / billing

---

## 6. DESIGN TOKENS REFERENCE

| Token | Hex | Usage |
|---|---|---|
| primary | #2563EB | Buttons, nav, active states |
| success | #16A34A | Progress, paid status |
| warning | #D97706 | Near-due, off-track |
| danger | #DC2626 | Overdue, errors |
| accent | #0D9488 | Focus debt, milestones |
| surface | #F9FAFB | Card backgrounds |

Font: Inter (Google Fonts). Headings: `font-bold`. Body: `font-normal`.

---
