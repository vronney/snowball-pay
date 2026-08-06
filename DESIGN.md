# Design System — SnowballPay

## Product Context
- **What this is:** A personal finance web app for paying off debt using snowball and avalanche methods, with AI-generated payment celebration messages, a journey timeline of wins, and weekly digest emails.
- **Who it's for:** Real people carrying debt — credit cards, student loans, car payments, medical bills. They feel ashamed and overwhelmed. They want to see progress, not a financial dashboard.
- **Space/industry:** Personal finance / fintech consumer / debt payoff
- **Project type:** Web app / dashboard (auth-required)
- **Memorable thing:** "Built for real people, not finance nerds."

## Aesthetic Direction
- **Direction:** Clean Signal — white-first, precision sans-serif, one vivid blue accent used only where action or progress lives.
- **Decoration level:** Intentional — subtle surface depth (card borders, shadows), no decorative blobs or gradient fills.
- **Mood:** Clear, direct, unhurried. The product feels like a tool that was built by someone who understood how it feels to carry debt. Not clinical. Not startup-loud. Just clear.
- **Research:** Monarch Money (warm/editorial but cold), YNAB (energetic but chaotic), Undebt.it (undesigned). Gap: warm and precise without either extreme.

## Typography
- **Display / Headings / Debt names / AI celebration messages:** Plus Jakarta Sans (600–800 weight)
  — Geometric, friendly-but-precise sans. Differentiates from the Inter/Roboto fintech default.
- **Body / Labels / Form fields / Nav:** Plus Jakarta Sans (400–600), falling back to Manrope
  — One family across display and body keeps the system calm; weight carries the hierarchy.
- **Numbers / Balances / Amounts:** monospace stack via the `.mono` utility (Tailwind `font-mono`) with `font-variant-numeric: tabular-nums`
  — Numbers always align vertically. Dollar amounts feel counted, not styled.
- **Code:** JetBrains Mono (if needed)
- **Loading:** `next/font/google` in `src/app/layout.tsx` (`--font-jakarta`, `--font-manrope`) — no external font CSS links.
- **History:** The original direction specified Geist / DM Sans / Geist Mono; the implementation shipped on Plus Jakarta Sans + Manrope and the doc was amended to match (2026-06-10). Revisit only as a deliberate rebrand with visual QA.
- **Scale:**

| Token  | Size  | Usage                          |
|--------|-------|--------------------------------|
| `2xs`  | 10px  | Eyebrow labels, badge text     |
| `xs`   | 11px  | Timestamps, metadata           |
| `sm`   | 12px  | Helper text, muted labels      |
| `base` | 13px  | Data rows, nav items, captions |
| `md`   | 14px  | Form labels, button text       |
| `lg`   | 15px  | Body copy, settings rows       |
| `xl`   | 16px  | Prominent body                 |
| `2xl`  | 20px  | Card headings                  |
| `3xl`  | 24px  | Section headings               |
| `4xl`  | 32px  | Page titles                    |
| `5xl`  | 42px  | Hero balance (Geist Mono)      |
| `6xl`  | 56px  | Display (marketing/onboarding) |

## Color

- **Approach:** Restrained — blue (#2563eb) is used ONLY for action, progress, and active states. Not on nav, not on passive elements. Color earns its place.

### Light Mode (default)
| Token             | Hex       | Usage                                      |
|-------------------|-----------|--------------------------------------------|
| `--bg`            | `#f8fafc` | Page background                            |
| `--surface`       | `#ffffff` | Cards, sheets, modals                      |
| `--primary`       | `#2563eb` | CTAs, progress fills, active states        |
| `--primary-hover` | `#1d4ed8` | Button hover, interactive hover            |
| `--tint`          | `#eff6ff` | Card highlights, celebration banner bg     |
| `--tint-border`   | `#bfdbfe` | Tint card borders                          |
| `--text`          | `#0f172a` | Primary text                               |
| `--muted`         | `#64748b` | Labels, dates, secondary text              |
| `--border`        | `#e2e8f0` | Card borders, dividers, input borders      |
| `--border-focus`  | `#93c5fd` | Input focus ring (paired with blue shadow) |

### Semantic Colors
| Token       | Hex       | Usage                                  |
|-------------|-----------|----------------------------------------|
| `--success` | `#10b981` | Debt paid off milestone, success state |
| `--warning` | `#f59e0b` | Due date warnings, three-quarter badge |
| `--error`   | `#ef4444` | Form errors, past-due state            |
| `--info`    | `#0ea5e9` | Informational banners                  |

### Dark Mode
**Not implemented.** SnowballPay is light-mode only for now. The Tailwind config uses `darkMode: 'class'` and no code adds the `.dark` class — so dark styles never activate. Do not add `prefers-color-scheme: dark` media queries or `.dark:` Tailwind variants to new components. Dark mode may be revisited in a future phase.

### Milestone Accent Colors
These are defined per-milestone in `PaymentCelebrationBanner.tsx` and `JourneyTab.tsx`. They intentionally vary — the milestone color system IS the brand's color expression, not the blue primary.

| Milestone         | Color     |
|-------------------|-----------|
| first_payment     | `#8b5cf6` |
| debt_paid_off     | `#10b981` |
| quarter_paid      | `#2563eb` |
| half_paid         | `#0891b2` |
| three_quarter     | `#f59e0b` |
| streak_six_months | `#ec4899` |
| anniversary       | `#8b5cf6` |

## Spacing

- **Base unit:** 8px
- **Density:** Comfortable — not cramped, not airy

| Token  | Value | Usage                                        |
|--------|-------|----------------------------------------------|
| `xs`   | 4px   | Icon gaps, tight inline spacing              |
| `sm`   | 8px   | Component internal padding (small)           |
| `md`   | 16px  | Card padding (small), button padding         |
| `lg`   | 24px  | Card padding (standard), section gap         |
| `xl`   | 32px  | Section margins                              |
| `2xl`  | 48px  | Major section breaks                         |
| `3xl`  | 64px  | Page-level vertical rhythm                  |

## Layout

- **Approach:** Grid-disciplined for the app shell; single-column focus for the primary view.
- **Principle:** The active snowball target gets the full width of the main area. Other debts are a quieter list below. The layout says "here's what to do today" not "here's all your data."
- **Grid:** 12 columns on desktop (≥1024px), 4 on mobile (≤768px)
- **Max content width:** 1280px
- **Sidebar:** 220px fixed, icon+label nav, 5 items max

### Border Radius — Hierarchical, NOT uniform

| Element                          | Radius  | Source of truth                     |
|----------------------------------|---------|-------------------------------------|
| Cards/panels                     | 12px    | `designTokens.radius.card`          |
| Tags/badges                      | 6px     | `designTokens.radius.tag`           |
| In-app buttons                   | 8px     | `designTokens.radius.button`        |
| In-app inputs                    | 8px     | `designTokens.radius.input`         |
| Marketing CTA (`.btn-primary`)   | 999px   | `--btn-radius` in `globals.css`     |
| Form fields (`.input-field`)     | 14px    | `--input-radius` in `globals.css`   |
| Avatars                          | 50%     | —                                   |
| Pills/chips                      | 9999px  | `designTokens.radius.pill`          |

Never apply uniform border-radius to all elements — it reads as AI-generated slop.

**Two button systems, deliberately.** The pill (`.btn-primary`) is the *marketing*
CTA — landing, pricing, learn pages, calculator. Inside the authenticated dashboard,
buttons are 8px. The shape difference is the seam between "come in" and "you're in";
don't unify them. A pill in the dashboard or an 8px CTA on the landing page is drift,
not a variant.

**`.input-field` is 14px, not 8px.** The 8px input token applies to inputs styled
inline in dashboard components. The shared `.input-field` class — calculator, debt
panels, Income & Budget — sits at 14px to pair with the pill CTA it appears beside.

## Motion

- **Approach:** Intentional — every animation aids comprehension or emotional impact. No animation for animation's sake.
- **Easing:**
  - Enter transitions: `cubic-bezier(0,0,0.2,1)` (ease-out — snappy arrival)
  - Exit transitions: `cubic-bezier(0.4,0,1,1)` (ease-in — clean departure)
  - Celebration/win: `cubic-bezier(0.22,1,0.36,1)` (spring-like — earned delight)
- **Duration:**
  - Micro (hover, focus ring): 100ms
  - Short (button states, toggles): 200ms
  - Medium (panel enter/exit, banner appear): 250ms
  - Long (celebration animations, debt card animate-out): 400–500ms

The celebration easing (`cubic-bezier(0.22,1,0.36,1)`) is already used in `PaymentCelebrationBanner.tsx` — all future win-moment animations should use this curve.

## Design Decisions

| Date       | Decision | Rationale |
|------------|----------|-----------|
| 2026-04-29 | Geist as display font | Crisp, modern, distinctive in fintech. Not Inter. Every competitor defaults to Inter/Roboto — Geist reads as precision without coldness. |
| 2026-04-29 | DM Sans as body font | Warmer geometry softens the Geist-heavy system. More readable than Geist at 13px data rows. |
| 2026-04-29 | #2563eb blue as primary | Vivid, trustworthy, crisp. Used ONLY for action/progress (CTAs, progress bars, active nav). Milestone colors carry the brand's emotional range. |
| 2026-04-29 | Single-column debt focus layout | The active snowball target owns the viewport. Users pay off one debt at a time — show that clearly. Competitors use equal-weight KPI grids. |
| 2026-04-29 | Celebration animations use spring easing | `cubic-bezier(0.22,1,0.36,1)` — win moments feel earned, not generic. Consistent across PaymentCelebrationBanner and future milestone animations. |
| 2026-04-29 | Terracotta direction rejected | User preferred crisp/modern over warm/earthy. Terracotta + Fraunces direction was explored and set aside. |
| 2026-04-29 | Light mode only | Dark mode removed. App is light-mode only for consistency across all pages. No `prefers-color-scheme` queries, no `.dark:` variants. |
| 2026-06-10 | Wallet-card debt items | Debt cards evoke a wallet card: flat category-tinted identity band, balance hero with tabular numerals, statement-style APR/min/due row, and a next-step footer tying the card to the snowball plan. Explicitly approved as a restrained hybrid — gradient bank-card chrome remains banned. |
| 2026-06-10 | Canonical timeline format | All payoff durations render via `formatMonths()` ("1y 2m") — chosen so timeline copy fits on mobile. |
| 2026-06-10 | Fonts amended to match implementation | The app ships Plus Jakarta Sans + Manrope via next/font; the Geist/DM Sans direction was never implemented and the doc now reflects reality. Hero scale (`5xl` "Geist Mono") reads as the `.mono` stack. |
| 2026-08-06 | Pill marketing CTA kept; radius doc amended to match | The doc said all buttons were 8px while `.btn-primary` had shipped as a 999px pill and `.input-field` as 14px across landing, pricing, learn, and the calculator. The pill was judged correct — it marks the marketing surface as distinct from the dashboard — so the doc was amended to reality rather than the CSS changed. Radius is now hierarchical *and* surface-aware: marketing CTA is a pill, in-app buttons stay 8px. |
| 2026-08-06 | `#3b82f6` retired as a second primary; one dark-surface exception | 28 places used `#3b82f6` where the palette specifies `#2563eb` — icons, progress fills, selected borders, sliders — so the app shipped two blues with no rule separating them. All swapped to the primary except the OG card headline (`opengraph-image.tsx`): that card's background is `#0f172a`, the only dark surface in the product, and the primary scores 3.45:1 against it versus 4.85:1 for the lighter blue. The palette is specified white-first and defines no dark-surface blue, so a light-mode token was the wrong instrument there. If dark surfaces spread beyond this one card, that gap needs filling properly rather than case-by-case. |
| 2026-08-06 | Card radius normalized to 12px in-app; marketing left alone | 34 `rounded-2xl`/`rounded-3xl` card surfaces (16/24px) contradicted the 12px card rule. Normalized across the authenticated app only — landing, learn, and the calculator keep their own radii, consistent with the marketing/app seam recorded above. Two things deliberately kept their larger radius: the 56px icon tile in `DebtTab` (a tile, not a card — 12px there is arbitrary) and marketing-surface cards. |
| 2026-08-06 | Card surface + eyebrow consolidated into tokens | `designTokens.cardSurface` and the `.eyebrow` utility existed but were bypassed by ~30 hand-rolled copies. Dashboard cards and telemetry captions now route through them so a future card/caption change is one edit. `cardSurface`'s border alpha was aligned to the shipped majority (0.09, was 0.08). |
| 2026-07-23 | Tier 1 console instrumentation | Discovery-console *character* inside Clean Signal (light-mode, restrained-blue rules unchanged): `.eyebrow` telemetry captions (10px/700, 0.08em tracked, uppercase, muted), thin SVG radial gauges for payoff progress (blue fill on `--border` track, `RadialGauge.tsx`), `.glow-primary` soft blue glow on active nav rails and primary CTAs only, and statement-style hairline segmentation of stat groups (This Month snapshot). Full dark holographic reskin explicitly deferred as a Tier 2 rebrand decision. |

## Anti-Patterns (never do these)

- Purple/violet gradients as accent
- 3-column feature grid with icons in colored circles
- Centered everything with uniform spacing
- Uniform bubble border-radius on all elements (all `rounded-full` or all `rounded-2xl`)
- Gradient buttons as the primary CTA pattern
- `Inter`, `Roboto`, `Arial`, `system-ui`, `Space Grotesk` as primary display fonts
- Gradient bank-card chrome on debt items (realistic card faces, chips, embossed-number theatrics). The approved treatment is a *flat* category-tinted identity band — see 2026-06-10 decision.
- Milestone `debt_paid_off` confetti animation on the debt card itself — celebration fires in the banner, the card goes quiet (fades, strikes through)
