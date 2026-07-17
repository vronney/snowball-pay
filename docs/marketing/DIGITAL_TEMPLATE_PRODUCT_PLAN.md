# Digital Template Product Plan (Free → Etsy → Pro)

Created 2026-07-17. Owner: Ron.

## The ladder

| Tier | What | Where | Price | Job |
| --- | --- | --- | --- | --- |
| Free | Basic 3-tab spreadsheet template (XLSX + CSV) | `/learn/debt-payoff-plan-template` | $0, no email gate | SEO promise-keeper, reciprocity, top-of-funnel |
| Free | Notion duplicate-as-template page | Linked from the same learn page | $0 | Captures the Notion-native audience; doubles as Etsy product base |
| Paid | Premium Debt Payoff Bundle | Etsy | $4.99 launch → $7.99 | Standalone revenue + paid discovery channel that feeds SnowballPay |
| Recurring | SnowballPay Pro | getsnowballpay.com | $12/mo | The real business; every template links back with UTM |

The strategic point: Etsy is a **search engine with buyers on it**. People who pay $5 for a
debt tracker are pre-qualified for a $12/mo tool that automates the same job. Every file in the
paid bundle carries a "want this automated?" page linking to the calculator
(`utm_source=etsy&utm_medium=template`).

## What's already built (2026-07-17)

- Free XLSX + CSV in `public/downloads/`, served from the learn page with a no-email download
  section; `template_downloaded` event (format + source) tracks demand.
- Notion template "Debt Payoff Plan — Free Template" — **published 2026-07-17** with
  mobile-first views (📱 Cards gallery, ✅ Payoff Board, 📊 Balances chart, 📱 Log,
  📉 Balance Over Time chart), auto Progress formula, and a Date column driving the
  balance line chart. Linked from the learn page's download section (tracked as
  `template_downloaded` format=notion). This page is the base for the Etsy Notion product.

## Premium bundle contents (what justifies paying vs. the free tier)

1. **Full spreadsheet upgrade**: per-debt amortization schedule, automatic snowball-vs-avalanche
   comparison (months + interest saved), progress dashboard with charts, conditional-formatting
   "paid off" celebrations.
2. **Google Sheets version** delivered as a one-click "make a copy" link (Etsy buyers expect it).
3. **Notion premium version**: the free template plus payoff-schedule database, savings goals,
   linked monthly budget, and a progress dashboard view.
4. **Printable PDF pack** (big Etsy differentiator, cheap to produce): monthly check-in sheets,
   a color-in "debt thermometer" progress tracker per debt, and a fridge-door plan summary.
5. 2–3 color themes of each.

Delivery: Etsy digital download = a single PDF containing the links + the XLSX files directly
(Etsy allows 5 files ≤20MB each).

## Etsy ops checklist

- Listing type: digital download. Fees: $0.20 listing, 6.5% transaction, ~3% + $0.25 payments —
  on a $4.99 sale you net roughly $4.20.
- Two listings: (a) full bundle, (b) Notion-only at a lower price point — Notion templates are
  their own search vertical on Etsy.
- Title/tags target: "debt snowball tracker", "debt payoff planner spreadsheet", "budget
  template google sheets", "debt tracker printable", "notion debt template". **Do not use
  "Dave Ramsey"** — trademark; "snowball method" is fine.
- Listing images sell the product: 8–10 mockup screenshots (dashboard, thermometer printable,
  phone mockup of Sheets). Generate from the real files.
- Reviews flywheel: include a "leave a review" ask + the calculator link on the PDF's last page.

## Sequencing (validate before building)

1. **Now**: ship the free template; watch `template_downloaded` volume for 2–4 weeks. It's the
   demand signal for the paid version — if organic visitors don't take a free template, Etsy
   buyers won't pay for one.
2. **Trigger**: ≳25 downloads/month or the learn page ranking on page 1–2 for "debt payoff plan
   template" → build the premium bundle (most assets can be generated in a working session).
3. **Then**: open the Etsy shop with both listings; measure Etsy → calculator UTM traffic and
   `subscription_started` attribution before spending any effort on more listings.

## Honest expectations

Etsy digital templates are a proven but crowded category: realistic early volume is single-digit
sales/month until reviews accumulate. Treat the direct revenue as a bonus; the durable value is
(a) a second discovery channel for SnowballPay with negative acquisition cost, and (b) forcing
the product assets (dashboard, printables) that also make the free tier and Pro onboarding
better.
