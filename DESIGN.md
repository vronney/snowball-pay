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
- **Display / Headings / Debt names / AI celebration messages:** Geist (700–900 weight)
  — Ultraclean geometric sans by Vercel. Modern and precise without being cold. At heavy weights it's striking; at light weights it breathes. Differentiates from the Inter/Roboto fintech default.
- **Body / Labels / Form fields / Nav:** DM Sans (400–600 weight)
  — Slightly warmer geometry than Geist. Softens the system. Reads clearly at 13px in data rows.
- **Numbers / Balances / Amounts:** Geist Mono (400–500) with `font-variant-numeric: tabular-nums`
  — Numbers always align vertically. Dollar amounts feel counted, not styled.
- **Code:** JetBrains Mono (if needed)
- **Loading:** Google Fonts — `https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800;900&family=Geist+Mono:wght@400;500&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap`
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
| Element      | Radius  |
|--------------|---------|
| Cards/panels | 12px    |
| Inputs       | 8px     |
| Tags/badges  | 6px     |
| Buttons      | 8px     |
| Avatars      | 50%     |
| Pills/chips  | 9999px  |

Never apply uniform border-radius to all elements — it reads as AI-generated slop.

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

## Anti-Patterns (never do these)

- Purple/violet gradients as accent
- 3-column feature grid with icons in colored circles
- Centered everything with uniform spacing
- Uniform bubble border-radius on all elements (all `rounded-full` or all `rounded-2xl`)
- Gradient buttons as the primary CTA pattern
- `Inter`, `Roboto`, `Arial`, `system-ui`, `Space Grotesk` as primary display fonts
- Bank-card chrome on debt items (rounded gradient cards mimicking credit cards)
- Milestone `debt_paid_off` confetti animation on the debt card itself — celebration fires in the banner, the card goes quiet (fades, strikes through)
