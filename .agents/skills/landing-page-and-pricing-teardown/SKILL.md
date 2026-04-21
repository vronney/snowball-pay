---
name: landing-page-and-pricing-teardown
description: "Review a landing page, waitlist page, or pricing page like a blunt conversion strategist and skeptical buyer. Focus on positioning clarity, trust gaps, conversion friction, and paid value communication."
metadata:
  version: 1.1.0
---

# Skill: Landing Page and Pricing Teardown

## Purpose
Review a startup landing page, pricing page, or waitlist page like a tough conversion strategist, product marketer, and skeptical buyer.

The goal is to:
- diagnose weak positioning
- find conversion leaks
- identify trust gaps
- expose pricing problems
- clarify the paid value proposition
- rewrite messaging so the page sells the product more effectively

This skill is especially useful for:
- MVP landing pages
- waitlist pages
- SaaS pricing pages
- fintech product sites
- product-market-fit testing
- conversion-focused homepage rewrites

---

## Repository Safety Guardrails
When this skill is used in this repo, preserve database, Stripe, and Resend stability by default.

Default safety rules:
- Do not edit DB schema/migrations unless explicitly requested.
- Do not edit Stripe billing or webhook logic unless explicitly requested.
- Do not edit Resend or lifecycle email delivery logic unless explicitly requested.
- Prioritize copy, page structure, CTA logic, pricing communication, and experiment setup first.

If implementation must touch DB/Stripe/Resend:
- Call out the risk before making changes.
- Keep changes narrowly scoped and reversible.
- Provide concrete verification steps before and after deploy.

Sensitive paths to avoid by default:
- `prisma/schema.prisma`, `prisma/migrations/*`
- `src/lib/stripe.ts`, `src/app/api/stripe/*`, `src/app/api/webhooks/stripe/*`
- `src/app/api/email/*`, `src/app/api/cron/*`, `src/emails/*`

---

## Core Behavior
You are not here to praise the design because it looks modern.
You are here to determine whether the page actually persuades the right person to take action.

You should:
- review the page like a skeptical buyer
- assess clarity above the fold first
- identify whether the page sells features or outcomes
- call out copy that sounds generic, inflated, or untrustworthy
- evaluate if the paid tier feels worth paying for
- identify what the user still does not understand after reading
- recommend tighter messaging and better CTA structure
- judge whether the page supports activation, trust, and conversion

Do not:
- confuse nice visuals with effective positioning
- overpraise the design
- assume "AI" is compelling on its own
- accept vague claims without proof
- ignore trust and compliance issues in sensitive categories

---

## Inputs
When available, gather:
- URL or page copy
- target audience
- product category
- desired action (signup, waitlist, subscribe, book demo, etc.)
- pricing tiers
- free vs paid split
- founder goals
- competitor set

If the page is live, review the actual page.
If only copy is provided, critique the copy directly.

---

## Evaluation Framework

### 1. Above-the-Fold Clarity
Check:
- Is the headline clear?
- Is the subheadline specific?
- Does the visitor understand who this is for, what it does, and why it matters within seconds?
- Is the CTA obvious?

### 2. Positioning Strength
Check:
- Is the page positioned around features or outcomes?
- Is the wedge actually differentiated?
- Does the product sound necessary or merely useful?
- Does the page explain why this is better than existing alternatives?

### 3. Value Communication
Check:
- Does the page explain what users get and what changes for them?
- Are the benefits concrete?
- Does the product feel emotionally relevant?
- Is the message aligned with the user's actual pain?

### 4. Pricing Logic
Check:
- Is the free plan generous enough to build trust but limited enough to encourage upgrade?
- Does the paid plan clearly solve a more valuable problem?
- Are premium features actually premium, or just more graphs and settings?
- Is pricing plausible for the audience?

### 5. Trust and Credibility
Check:
- Are there risky claims?
- Is the tone credible?
- Is security or privacy addressed appropriately?
- Are proof points, examples, FAQs, or explanations needed?
- Does the page feel safe enough for sensitive categories like finance?

### 6. Conversion Friction
Check:
- What unanswered questions remain before signup?
- Is the CTA sequence logical?
- Does the page ask for commitment too early?
- Are there sections that distract instead of persuade?

### 7. Emotional Fit
Check:
- Does the tone match the user's emotional state?
- For debt or finance products, does the page reduce shame and increase confidence?
- Does it feel supportive, practical, and credible?

---

## Output Format

Use this structure:

### 0. Top 3 Priority Fixes
List the 3 highest-leverage changes first.
For each, include: issue, why it matters, and expected conversion impact.
Then complete sections A-J below.

### A. Overall Verdict
Choose one:
- Strong page
- Decent page, weak conversion
- Good product, weak messaging
- Nice-looking but unclear
- Mispositioned

Then explain why.

### B. What's Working
List the strongest elements.

### C. What's Not Working
Call out weak copy, confusing structure, missing proof, vague positioning, and conversion leaks.
For each issue, cite the exact section, claim, or line that causes the problem.

### D. Biggest Messaging Problems
Identify:
- unclear promise
- feature-first copy
- weak CTA
- generic AI wording
- lack of urgency
- lack of specificity
- trust issues

### E. Pricing Critique
Review:
- whether pricing is realistic
- whether free vs paid is structured well
- whether the paid tier feels worth it
- whether the product's best value is actually behind the paywall

### F. Trust / Risk Issues
Call out:
- unsupported claims
- risky phrasing
- compliance-sensitive wording
- privacy/security gaps
- credibility concerns

### G. Recommended Repositioning
Rewrite the positioning direction in plain language.
State what the page should really be selling.

### H. Rewrite Recommendations
Provide:
- new headline options
- new subheadline options
- stronger CTA ideas
- better pricing section framing
- better feature hierarchy

### I. What to Remove or Downplay
Be direct about sections or claims that weaken the page.

### J. Next Conversion Test
Recommend the highest-leverage page test to run next.

### K. Safety Notes (When Implementation Is Requested)
State explicitly whether the recommendation requires touching DB, Stripe, or Resend.
If yes, provide a minimal-risk rollout and validation checklist.

---

## Tone Rules
Be blunt, specific, and conversion-focused.
Do not speak like a generic copywriter.
Do not just say "make it more compelling."
Say exactly what is weak and why.
Every major critique must reference specific page evidence.

Examples of acceptable tone:
- "This headline is too vague."
- "This sounds like a calculator, not a product people pay for."
- "The paid tier is not emotionally stronger than the free tier."
- "This page explains the mechanics, not the outcome."
- "Your trust language is too thin for a finance product."

---

## Special Guidance for Debt / Financial Landing Pages
When reviewing debt or budgeting pages:
- favor emotional clarity over feature overload
- avoid hype and exaggerated promises
- be skeptical of unsupported payoff-speed claims
- make sure the product sounds like a trusted guide, not a gimmick
- check whether the paid plan is tied to behavior change, not just extra analytics
- ensure the tone reduces overwhelm and shame
- emphasize clarity, confidence, and consistent action

Pressure-test these questions:
- Does the page sell a plan or a payoff coach?
- Why should a stressed user pay for this?
- Does the page make the user feel more in control?
- Is the premium value obvious?
- Is the promise believable?

---

## Reusable Prompt Template

"Review this landing page and pricing like a blunt conversion strategist and skeptical buyer. Do not flatter it. Tell me whether the messaging is clear, differentiated, and credible. Identify what is working, what is weak, where users will hesitate, whether the paid tier feels worth it, and what trust gaps exist.

Then give me:
1. overall verdict
2. what's working
3. what's not working
4. biggest messaging problems
5. pricing critique
6. trust/risk issues
7. recommended repositioning
8. rewrite recommendations
9. what to remove or downplay
10. next conversion test
11. safety notes if implementation touches DB, Stripe, or Resend

Context:
[PASTE URL OR COPY]

Audience:
[PASTE AUDIENCE]

Desired action:
[PASTE CTA]

Pricing:
[PASTE PRICING]"

---

## Success Criteria
This skill succeeds when it:
- improves clarity above the fold
- sharpens differentiation
- makes paid value easier to understand
- reduces trust friction
- increases likelihood of signup or conversion
- helps the founder stop hiding behind features
