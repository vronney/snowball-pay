# Which Debt Next? Campaign

This is the first production-ready campaign in SnowballPay's content engine. It turns one high-intent question into an Instagram carousel, a short animated Reel, a Google Search ad group, and an SEO article.

## Campaign outcome

- Attract people actively asking which debt to pay first.
- Demonstrate value before signup with the free calculator.
- Convert calculator visitors into activated planners.
- Learn which message wins: emotional clarity or strategy comparison.

Primary CTA: **Run your real numbers with the free SnowballPay calculator.**

Landing page: `/calculator`

Core ideas from the marketing plan: **#1, #2, #7, #14, and #33**.

## Audience and message

Primary audience: adults with two or more credit cards or loans who are paying every month but are unsure where the next extra payment should go.

Core message:

> Snowball builds momentum. Avalanche minimizes interest. SnowballPay lets you compare both with your real numbers before you choose.

Tone: calm, practical, encouraging, and free of shame. Do not promise a faster payoff without qualifying it through the user's inputs.

## Deliverables

| Asset | File | Purpose |
| --- | --- | --- |
| Instagram carousel, caption, and Reel shot list | `instagram-carousel-and-reel.md` | Organic reach, saves, shares, and retargeting seed audience |
| Google Search RSA working sheet | `google-search-rsa.csv` | High-intent paid demand capture after the release gate |
| SEO article page and source | `which-debt-should-i-pay-first.md` | Published at `/learn/which-debt-should-i-pay-first` for evergreen search traffic and social/email repurposing |

Canva generation:

- Brand kit: `Azeneth_Edit`
- Carousel candidate: [preview the generated Canva carousel](https://www.canva.com/d/0Bx7ylJbFGT2pv2)
  - Candidate ID: `dg-4feece3a-8d04-458b-88e5-790fdd45cdae`
  - Generation job: `05c74036-480f-4785-9dd7-ca5e1a24007e`
- Story candidate: [preview the generated Canva Story](https://www.canva.com/d/HKMyGTU_63ZR9u8)
  - Candidate ID: `dg-f8ac92e1-583f-45c1-adbe-76dcf5c067bd`
  - Generation job: `9c6da207-17b2-4498-b385-12bee4f92cf3`

The candidate is a review link. Convert it to an editable Canva design only after creative approval.

## Seven-day distribution sequence

| Day | Channel | Asset | CTA |
| --- | --- | --- | --- |
| 1 | Learn/SEO | Publish `/learn/which-debt-should-i-pay-first` | Try the calculator |
| 2 | Instagram | Five-page carousel | Save this, then run your numbers |
| 3 | Instagram Stories | Poll: Snowball or Avalanche? | Link sticker to calculator |
| 4 | Email | Article summary plus one example | Compare both methods |
| 5 | Instagram Reel | 15-second animated comparison | See your debt-free date |
| 6 | Community | Answer one relevant debt-priority question | Link only when directly useful |
| 7 | Analytics | Review reach, saves, clicks, and activation | Choose the next creative angle |

## Tracking

Use a different `utm_content` value for each execution:

- Carousel: `/calculator?utm_source=instagram&utm_medium=organic_social&utm_campaign=which_debt_next&utm_content=carousel_v1`
- Reel: `/calculator?utm_source=instagram&utm_medium=organic_social&utm_campaign=which_debt_next&utm_content=reel_v1`
- Story: `/calculator?utm_source=instagram&utm_medium=organic_social&utm_campaign=which_debt_next&utm_content=story_poll_v1`
- Google Search: `/calculator?utm_source=google&utm_medium=cpc&utm_campaign=debt_calculator_search&utm_content=rsa_clarity_v1`
- Learn article: use the clean internal route `/calculator` so acquisition attribution is not overwritten

Evaluate the whole path:

1. Landing session
2. `calculator_started`
3. `calculator_result_viewed`
4. `calculator_save_clicked`
5. `signup_completed`
6. `plan_generated`

Do not judge social only by likes or Google Ads only by clicks. The business outcome is an activated planner.

## Paid-media release gate

Keep Google Search assets in draft until all of these are true:

- The consented funnel and attribution checks in `docs/marketing/ANALYTICS_TRACKING_PLAN.md` pass in production.
- Signup-to-`plan_generated` activation is at least 45%.
- The Google Ads conversion fires on the successful first-plan state and deduplicates correctly.
- Calculator and onboarding UTMs persist into conversion reporting.
- The calculator landing page is mobile-ready and its CTA is unambiguous.

If the gate is closed, keep publishing the organic and SEO assets. They generate learning without paying for a leaky funnel.

## Weekly decision rules

- High reach, low saves: make the post more concrete; add a worked example.
- High saves, low clicks: strengthen the final-slide CTA and caption link instruction.
- High calculator starts, low results: simplify calculator inputs or clarify required fields.
- High results, low saves/signups: show what users gain by saving the plan.
- Paid clicks, low activation: pause the ad group and fix message-to-landing-page continuity.

## Next campaigns to clone from this structure

1. **What changes when you add $100 per month?** — extra-payment scenario.
2. **Minimum payments keep you current, not focused.** — education without shame.
3. **Your debt-free date moved closer.** — milestone and share-card campaign.
4. **Snowball vs. Avalanche on the same three debts.** — worked comparison series.
