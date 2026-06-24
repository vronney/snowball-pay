# SnowballPay — Google Ads Search Setup & Fix Guide

**Goal:** Replace the stuck Performance Max campaign with a standard Search campaign that serves normally for a sensitive (debt) category, and fix conversion tracking so the new campaign can actually optimize.

**Why we're switching:** Your PMax asset group is stuck at "Eligible (Limited)" because Google won't personalize ads for the "negative financial status" category — that kills most of PMax's inventory (Display, YouTube, Discover, Gmail). Search uses keyword/contextual targeting, which **is** allowed for this category. Same product, a lane Google actually lets you run in.

> Do the steps in order. **Phase 1 (conversion tracking) comes first** — without it, the new campaign is flying blind, exactly like the old one (54 clicks, $37.53 spent, 0 conversions recorded).

---

## Phase 1 — Fix conversion tracking (do this FIRST)

A "conversion" is the action you want visitors to take. For SnowballPay the natural one is **starting a plan / signing up**. Right now Google is recording zero, which means either no tag is installed or it isn't firing.

### Step 1.1 — Create the conversion action in Google Ads
1. Top-right of Google Ads, click the **Goals** icon (target/flag) → **Conversions** → **Summary**.
2. Click **+ New conversion action**.
3. Choose **Website**.
4. Type your domain `getsnowballpay.com` and click **Scan**.
5. When it finishes, choose **Create conversions manually instead** (gives you control).
6. Fill in:
   - **Goal / category:** `Sign-up`
   - **Conversion name:** `Sign Up – Start Plan`
   - **Value:** "Don't use a value" (fine for now)
   - **Count:** `One` (one signup per click matters, not repeats)
   - **Click-through window:** 30 days
   - **Attribution:** `Data-driven` (or `Last click` if data-driven isn't offered yet)
7. Click **Done** → **Save and continue**.

### Step 1.2 — Install the Google tag (one-time, sitewide)
Google will show you a **Google tag ID** that looks like `AW-XXXXXXXXX`. In your Next.js app, add the base tag to the root layout so it loads on every page.

`src/app/layout.tsx` — inside `<head>` (use `next/script`):

```tsx
import Script from "next/script";

// ...inside the component return, in <head> or top of <body>:
<Script
  src="https://www.googletagmanager.com/gtag/js?id=AW-XXXXXXXXX"
  strategy="afterInteractive"
/>
<Script id="gtag-init" strategy="afterInteractive">
  {`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'AW-XXXXXXXXX');
  `}
</Script>
```

Replace `AW-XXXXXXXXX` with your real tag ID. Store it in an env var if you prefer (`NEXT_PUBLIC_GADS_TAG_ID`).

### Step 1.3 — Fire the conversion event on signup success
Google also gives you an **event snippet** with a `send_to` value like `AW-XXXXXXXXX/AbC-D_efGhIj`. Fire it the moment a user actually completes signup / starts their first plan (the success state, not the button click):

```tsx
// Call this right after a successful signup/plan-start response
window.gtag?.('event', 'conversion', {
  send_to: 'AW-XXXXXXXXX/AbC-D_efGhIj',
});
```

### Step 1.4 — Verify it actually fires
1. Install the **Google Tag Assistant** Chrome extension (or use Google Ads → your conversion action → it shows "Recording" status).
2. Go through a real signup on the live site.
3. Confirm the conversion flips to **"Recording conversions"** (can take a few hours to first verify).

> ✅ Don't launch the Search campaign until the tag shows "Recording." This is the single thing that was missing before.

---

## Phase 2 — Build the Search campaign

### Step 2.1 — Create the campaign
1. **Campaigns** → blue **+** → **New campaign**.
2. Objective: choose **Leads** (or "Create a campaign without a goal's guidance" if you want full manual control).
3. Conversion goals: make sure **Sign Up – Start Plan** is selected. Remove any others.
4. Campaign type: **Search**.
5. "How do you want to reach your goal?" → **Website visits** → enter `getsnowballpay.com`.
6. Click **Continue**.

### Step 2.2 — Critical settings (this is where PMax went wrong)
- **Networks:** **UNcheck "Include Google Display Network"** and **UNcheck "Include Google search partners."** Search results only. (Display is what triggers the sensitive-category limitation.)
- **Locations:** target your country/region (e.g., United States). Set "Presence: people in your targeted locations."
- **Languages:** English.
- **Audience segments:** **add NONE.** Do not attach any audience. (Advertiser-curated audiences are what's blocked for this category.)
- **Bidding:**
  - Start with **Maximize clicks** and set a **Maximum CPC bid limit** of **$1.50** (your old CPC was $0.69, so this leaves headroom without overpaying).
  - After you've collected ~15–30 conversions, switch to **Maximize conversions** or **Target CPA**.
- **Budget:** start at **$10/day** for a real test (your old spend was ~$1.25/day, which is too thin to learn anything). Adjust later.
- Campaign name: `Search – Debt Payoff – US`.

### Step 2.3 — Ad groups, keywords & match types
Create **5 tightly themed ad groups** (tight themes = higher Quality Score = lower CPC). Paste each keyword block into the matching ad group. The brackets/quotes set the match type — paste them exactly:

- `[exact match]` — shows only for that exact search. Most control.
- `"phrase match"` — shows for searches that include that phrase. Good balance.

#### Ad Group 1 — Debt Payoff Calculator / Planner
```
[debt payoff planner]
[debt payoff calculator]
[when will i be debt free calculator]
"debt payoff planner"
"debt payoff app"
"debt reduction software"
"debt spreadsheet alternative"
"best app to track debt payoff"
"when will i be debt free"
```

#### Ad Group 2 — Debt Snowball Method
```
[debt snowball calculator]
[dave ramsey snowball calculator]
"debt snowball calculator"
"debt snowball tracker"
"how to do the debt snowball method"
"debt snowball method"
```

#### Ad Group 3 — Snowball vs Avalanche (strategy comparison)
```
[debt snowball vs avalanche]
[debt avalanche calculator]
"debt snowball vs avalanche"
"avalanche method payoff plan"
"compare debt payoff strategies"
```

#### Ad Group 4 — Credit Card Payoff
```
[which credit card to pay off first]
[credit card payoff tracker]
"how to pay off credit card debt"
"best way to pay off multiple credit cards"
"which credit card to pay off first"
"credit card payoff tracker"
```

#### Ad Group 5 — Get Out of Debt (broad intent)
```
"how to get out of debt fast"
"how to pay off debt with low income"
"strategies to eliminate debt"
"best way to get out of debt"
```

### Step 2.4 — Negative keywords (add at campaign level)
These block irrelevant or expensive searches that would waste budget on a calculator/tool. **Tools → Shared library → Negative keyword lists → create list "Debt – Global Negatives" → attach to campaign.** Paste:
```
debt relief
debt consolidation loan
debt settlement
credit repair
bankruptcy
attorney
lawyer
loan application
personal loan
free money
government grant
student loan forgiveness
jobs
salary
free download
crack
```
(If you later decide consolidation traffic is worth it, you can remove those lines.)

---

## Phase 3 — Responsive Search Ad (RSA) copy

Create **one RSA per ad group**. Each RSA = up to **15 headlines (max 30 characters each)** + **4 descriptions (max 90 characters each)**. Google mixes and matches them. Paste the relevant set into each ad group. All copy below is within limits and matches your brand tone (calm, practical, no "guaranteed results").

### Shared descriptions (use in every ad group)
```
See your debt-free date, payoff order, and how much interest you save. Free to start.
Free plan includes your debt-free date and payoff order. No card needed to begin.
Snowball or avalanche — see which gets you debt-free sooner. Free to try.
A clear, prioritized plan to pay off debt month by month. Start free today.
```

### Ad Group 1 — Calculator / Planner — Headlines
```
Free Debt Payoff Calculator
Debt Payoff Plan in Minutes
See Your Debt-Free Date
When Will I Be Debt Free?
Debt Snowball Planner
Payoff Debt Faster
Month-by-Month Schedule
Start Free - No Card Needed
See Your Payoff Order
Save on Interest
Track Every Debt
14-Day Pro Trial
Built for Real Budgets
Your Debt-Free Date Today
Compare Payoff Strategies
```

### Ad Group 2 — Snowball Method — Headlines
```
Debt Snowball Calculator
Try the Debt Snowball
Debt Snowball Planner
See Your Debt-Free Date
Snowball Method, Made Simple
Payoff Debt Faster
Free to Start
Month-by-Month Schedule
Your Payoff Order, Step 1
Start Free - No Card Needed
Save on Interest
When Will I Be Debt Free?
14-Day Pro Trial
Pay Off Debt, Step by Step
See Your Debt-Free Date
```

### Ad Group 3 — Snowball vs Avalanche — Headlines
```
Snowball vs Avalanche
Compare Both Strategies
Find Your Fastest Payoff
Avalanche or Snowball?
See Which Gets You There
Debt Payoff Plan in Minutes
Compare Payoff Strategies
Save the Most on Interest
Free to Start
See Your Debt-Free Date
Run Both, Pick the Winner
Start Free - No Card Needed
Payoff Debt Faster
Your Fastest Path to Zero
14-Day Pro Trial
```

### Ad Group 4 — Credit Card Payoff — Headlines
```
Which Card to Pay First?
Tackle Credit Card Debt
Credit Card & Loan Tracker
Pay Off Cards in Order
See Your Debt-Free Date
Free Debt Payoff Calculator
Payoff Debt Faster
Stop Juggling Payments
Your Next Safe Payment
Start Free - No Card Needed
Save on Interest
Month-by-Month Schedule
Multiple Cards? One Plan.
When Will I Be Debt Free?
14-Day Pro Trial
```

### Ad Group 5 — Get Out of Debt — Headlines
```
Get Out of Debt Faster
A Clear Path Out of Debt
See Your Debt-Free Date
Debt Payoff Plan in Minutes
Stop Guessing, Start Paying
Payoff Debt Faster
Your Payoff Order, Free
Built for Real Budgets
Start Free - No Card Needed
Save on Interest
A Realistic Payoff Plan
When Will I Be Debt Free?
Month-by-Month Schedule
Take Control of Your Debt
14-Day Pro Trial
```

> **Pinning tip:** mostly let Google rotate. Optionally pin **"Free Debt Payoff Calculator"** (or the ad group's lead headline) to **Position 1** so the offer always shows. Don't pin more than 1–2, or you lose the testing benefit.

### Optional but recommended — Assets (extensions)
At campaign level, add:
- **Sitelinks (4):** `See Your Debt-Free Date`, `Snowball vs Avalanche`, `Free Calculator`, `Pricing`
- **Callouts (4–6):** `Free to start`, `No card needed`, `Snowball & avalanche`, `Interest saved`, `Month-by-month plan`, `14-day Pro trial`
- **Structured snippet:** Type = "Features" → `Debt-free date, Payoff order, Interest saved, Progress tracking`

---

## Phase 4 — Launch & handle the old campaign
1. Click **Publish** on the new Search campaign. It goes to "Under review" — usually approved within a day.
2. Once the Search campaign is **approved and serving**, **pause the Performance Max campaign** (don't delete it — keep the history): select it → **Edit → Pause**. You can pause it now if you want to stop wasted spend immediately, since it's converting nothing.
3. After ~1 week, check **search terms** (ad group → **Insights/Search terms**) and add any junk terms to your negative list.

---

## Quick checklist
- [ ] Conversion action `Sign Up – Start Plan` created in Google Ads
- [ ] Google tag (`AW-…`) installed sitewide in `layout.tsx`
- [ ] Event snippet fires on signup success
- [ ] Tag Assistant confirms tag is firing / status = "Recording"
- [ ] New Search campaign created, Display + Search partners **unchecked**, no audiences attached
- [ ] Bidding = Maximize clicks, $1.50 CPC cap; budget $10/day
- [ ] 5 ad groups + keywords pasted with match types
- [ ] Negative keyword list created & attached
- [ ] 1 RSA per ad group (15 headlines + 4 descriptions)
- [ ] Sitelinks / callouts / structured snippets added
- [ ] Campaign published & approved
- [ ] PMax campaign paused
- [ ] After ~15–30 conversions: switch bidding to Maximize Conversions / Target CPA

---

## Next step
Get conversion tracking confirmed firing (Phase 1) before spending a dollar. Once it shows "Recording," build the Search campaign from this sheet — it's all copy-paste. If you want, I can also draft the exact `layout.tsx` change as a PR against the repo so the tag is wired correctly in Next.js.
