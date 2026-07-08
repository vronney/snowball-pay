/**
 * apr-negotiation.ts
 * -------------------------------------------------------------------------
 * Structured, typed content for Snowball Pay's "Negotiate a Lower APR" module.
 *
 * Drop this file into your content/data layer (e.g. `src/content/` or
 * `src/lib/content/`) and render the pieces however you like in your
 * Next.js / React UI. Everything is plain data — no framework coupling.
 *
 * Sections:
 *   1. preCallChecklist        — what to gather before the call
 *   2. callScripts             — word-for-word phone scripts (5 scenarios)
 *   3. rebuttals               — "if they say no" escalation lines
 *   4. writtenTemplates        — secure-message + mailed-letter templates
 *   5. postCallChecklist       — confirm / document / retry after the call
 *   6. quickFacts              — stats & tips for UI callouts
 *   7. guardrails              — "unknown unknowns": rights, traps, escalation
 *   8. sources                 — citation list (name + URL)
 *
 * All guidance is sourced from consumer-finance publishers (Bankrate,
 * Experian, Investopedia, CNET, Credit Karma, SaverLife, GreenPath, SoFi,
 * CBS News, and others). See `sources` at the bottom for URLs.
 *
 * Content is educational and not financial advice.
 * -------------------------------------------------------------------------
 */

/* =========================================================================
 * Types
 * ========================================================================= */

export interface ChecklistItem {
  /** Stable id for keys, progress tracking, and persistence. */
  id: string;
  /** Short label shown to the user. */
  label: string;
  /** Optional helper text explaining why it matters or where to find it. */
  detail?: string;
  /** Optional: this item maps to a field the app can prefill from user data. */
  appField?: keyof NegotiationInputs;
}

export interface ScriptLine {
  /** Who is speaking: the user or a coaching note for the user. */
  role: "you" | "note";
  /**
   * The line to say. Placeholders in {{curlyBraces}} should be interpolated
   * with `fillTemplate()` using NegotiationInputs (or left for the user to
   * read and fill verbally).
   */
  text: string;
}

export interface CallScript {
  id: string;
  title: string;
  /** When to use this particular script. */
  useWhen: string;
  lines: ScriptLine[];
}

export interface Rebuttal {
  id: string;
  /** The situation / objection from the representative. */
  situation: string;
  /** What you say back. */
  response: string;
}

export interface WrittenTemplate {
  id: string;
  title: string;
  channel: "secure-message" | "letter";
  /** Optional subject line (for secure messages / letter reference line). */
  subject?: string;
  /** Body with {{placeholders}} to interpolate. */
  body: string;
}

export interface QuickFact {
  id: string;
  stat: string;
  context: string;
  sourceId: string;
}

export interface Source {
  id: string;
  name: string;
  url: string;
}

/**
 * A "guardrail" is a rights/risk/escalation item most people don't know to
 * ask about — the "unknown unknowns" of APR negotiation. `tone` lets the UI
 * style it (e.g. blue info, amber caution, green opportunity).
 */
export interface Guardrail {
  id: string;
  title: string;
  body: string;
  tone: "opportunity" | "caution" | "info";
  /** Optional CTA the app can render (e.g. link out to CFPB). */
  action?: { label: string; url: string };
  sourceId: string;
}

/**
 * The variable inputs a user can supply (or the app can prefill from their
 * Snowball Pay debt data) to personalize every script and template.
 */
export interface NegotiationInputs {
  fullName: string;
  issuerName: string;
  /** Last 4 digits of the card. */
  cardLast4: string;
  cardProductName: string;
  /** e.g. "24.99" (percent, no % sign). */
  currentApr: string;
  /** e.g. "12.99" — the rate you'll ask for. */
  targetApr: string;
  /** Minimum acceptable rate before you walk. */
  walkAwayApr: string;
  /** e.g. "6" or "4.5" */
  yearsAsCustomer: string;
  /** e.g. "740" */
  creditScore: string;
  /** e.g. "5,420.00" */
  currentBalance: string;
  /** Named competing offer, e.g. "a credit union at 14.99%" or "a 0% balance-transfer card for 18 months". */
  competingOffer: string;
  /** ISO date string for the letter, e.g. "July 8, 2026". */
  date: string;
}

/* =========================================================================
 * 1. Pre-call preparation checklist
 * ========================================================================= */

export const preCallChecklist: ChecklistItem[] = [
  {
    id: "current-apr",
    label: "Know your current APR (and by balance type)",
    detail:
      "Purchases, balance transfers, and cash advances often carry different rates. Pull the exact number from your latest statement.",
    appField: "currentApr",
  },
  {
    id: "balance",
    label: "Record your current balance",
    detail: "From your latest statement or online portal.",
    appField: "currentBalance",
  },
  {
    id: "tenure",
    label: "Confirm how long you've been a customer",
    detail:
      "Longer relationships (12+ months, ideally 3–5 years) give you real negotiating weight.",
    appField: "yearsAsCustomer",
  },
  {
    id: "payment-history",
    label: "Verify 12–24 months of on-time payments",
    detail:
      "A clean on-time streak is your strongest lever. Late payments or maxed-out limits weaken your case.",
  },
  {
    id: "credit-score",
    label: "Check your current credit score",
    detail:
      "A score above ~670–700 gives you leverage. If it has improved since you opened the card, say so. Get a free report weekly at AnnualCreditReport.com.",
    appField: "creditScore",
  },
  {
    id: "utilization",
    label: "Check your credit utilization",
    detail: "Under 30% helps; under 10% is ideal.",
  },
  {
    id: "competing-offers",
    label: "Gather real competing offers",
    detail:
      "Save preapproval emails/mailers or check current low-rate and 0% balance-transfer cards. A specific named offer (e.g. 'a credit union at 14.99%') is far stronger than a vague 'better offers.' Don't apply yet — a hard inquiry can ding your score.",
    appField: "competingOffer",
  },
  {
    id: "targets",
    label: "Set a target rate and a walk-away rate",
    detail:
      "Pick the specific number you'll ask for (e.g. 12.99%) and the minimum you'll accept before ending the call.",
    appField: "targetApr",
  },
  {
    id: "update-profile",
    label: "Update your income & housing info in the portal",
    detail:
      "Accurate income/housing data lets the issuer reassess your risk. Don't exaggerate — accuracy helps.",
  },
  {
    id: "timing",
    label: "Call at a good time",
    detail:
      "Mid-morning, early in the week (Mon–Thu, ~9am–5pm). Reps tend to have more flexibility and are less rushed.",
  },
  {
    id: "reason",
    label: "Have a clear one-line reason ready",
    detail:
      "e.g. 'I'm focused on paying down this balance' or 'my score has improved and I've seen lower rates.' A concrete reason strengthens the ask.",
  },
];

/* =========================================================================
 * 2. Phone call scripts
 * ========================================================================= */

export const callScripts: CallScript[] = [
  {
    id: "reach-retention",
    title: "Get to the right person",
    useWhen:
      "The very start of every call — front-line reps often can't adjust rates.",
    lines: [
      {
        role: "note",
        text: "Call the number on the back of your card. At the automated menu, say 'representative' or 'account specialist' (or press 0) until you reach a human.",
      },
      {
        role: "you",
        text: "Hi, I'd like to speak with someone in your retention or account-loyalty department about lowering my interest rate.",
      },
      {
        role: "note",
        text: "The retention/loyalty team has more authority to adjust your rate than a general rep.",
      },
    ],
  },
  {
    id: "simple-ask",
    title: "The simple ask (loyalty + payment history)",
    useWhen:
      "Your strongest asset is a long relationship and a clean on-time record.",
    lines: [
      {
        role: "you",
        text: "Hi, my name is {{fullName}}, and I've been a cardholder with {{issuerName}} for {{yearsAsCustomer}} years on the card ending in {{cardLast4}}. I've always paid on time.",
      },
      {
        role: "you",
        text: "My current APR is {{currentApr}}%, and I'd like to request a permanent reduction to {{targetApr}}%. Given my history, is there anything you can do?",
      },
      {
        role: "note",
        text: "Then PAUSE. Stop talking and let them respond first. Silence works in your favor.",
      },
    ],
  },
  {
    id: "competing-offer",
    title: "The competing-offer ask (most effective)",
    useWhen:
      "You have a real, specific lower offer from another issuer. This is the tactic retention agents find hardest to dismiss.",
    lines: [
      {
        role: "you",
        text: "Hi, my name is {{fullName}} and I'm a customer on the card ending in {{cardLast4}}. I've been reviewing other offers and I'm seeing {{competingOffer}}.",
      },
      {
        role: "you",
        text: "I'd genuinely prefer to stay with {{issuerName}} — I've been here {{yearsAsCustomer}} years with a strong on-time record — but my current {{currentApr}}% APR is well above what I'm being offered elsewhere. Can you match or beat that with a permanent rate?",
      },
      {
        role: "note",
        text: "Frame it as a business proposal, not a threat. You're offering to stay if they compete. Do NOT threaten to cancel unless you're truly prepared to.",
      },
      {
        role: "you",
        text: "Also — would this require a hard or soft credit inquiry?",
      },
    ],
  },
  {
    id: "score-improved",
    title: "The improved-credit ask",
    useWhen:
      "Your credit score has risen (especially 50+ points) since you opened the card.",
    lines: [
      {
        role: "you",
        text: "Hi, I'm {{fullName}}, on the card ending in {{cardLast4}}. Since I opened this account my credit score has improved to {{creditScore}}, and I've maintained an on-time payment record.",
      },
      {
        role: "you",
        text: "My rate is still {{currentApr}}%, which reflects my older credit profile. I'd like to bring it in line with my current profile — closer to {{targetApr}}%. What can you do?",
      },
    ],
  },
  {
    id: "hardship",
    title: "The hardship ask",
    useWhen:
      "You're facing genuine financial strain (job loss, medical bills, reduced income). Ask for the hardship team by name.",
    lines: [
      {
        role: "note",
        text: "Ask specifically for the 'hardship' or 'financial hardship' team — not the general line. Many issuers have formal hardship programs they won't mention unless you ask.",
      },
      {
        role: "you",
        text: "I've been a customer for {{yearsAsCustomer}} years with a solid payment history, but I'm dealing with a temporary financial hardship. Can you reduce my APR on the card ending in {{cardLast4}} for the next 12 months, waive any recent late or penalty fees, and set up a fixed payment plan?",
      },
      {
        role: "note",
        text: "Be ready to provide documentation (termination letter, medical bills). Offering to enroll in autopay can also help.",
      },
    ],
  },
  {
    id: "confirm-terms",
    title: "Lock in the terms (before you hang up)",
    useWhen:
      "They've offered a reduction. Confirm every detail before accepting.",
    lines: [
      {
        role: "you",
        text: "Great — to confirm: my new APR will be ___%, and this is a permanent rate, not a temporary promotional one? When does it take effect?",
      },
      {
        role: "you",
        text: "Does it apply to my existing balance, new purchases, or both? And can you send me this confirmation in writing through the secure message center or by email?",
      },
      {
        role: "note",
        text: "Write down the rep's name, the date/time, and any reference or confirmation number before ending the call.",
      },
    ],
  },
];

/* =========================================================================
 * 3. "If they say no" rebuttals / escalation ladder
 * ========================================================================= */

export const rebuttals: Rebuttal[] = [
  {
    id: "small-offer",
    situation: "They immediately offer a small cut (1–2 points).",
    response:
      "Thank you — I appreciate that. I was really hoping for something closer to {{targetApr}}%. Is that the best you can do, or can you check for a better permanent rate?",
  },
  {
    id: "ask-supervisor",
    situation: "The rep says they can't help at all.",
    response:
      "I understand. Before we finish, could you connect me with a supervisor or your retention department? I'd like to explore every option before I decide.",
  },
  {
    id: "meet-in-middle",
    situation: "The supervisor also hesitates.",
    response:
      "I still feel my {{currentApr}}% is high compared to what I'm being offered elsewhere. Could we meet somewhere in the middle so this works for both of us?",
  },
  {
    id: "temporary-relief",
    situation: "A permanent reduction isn't possible.",
    response:
      "If a permanent rate isn't on the table, could you offer a temporary reduction — even 1–3 points off for 6 to 12 months — while I pay this balance down?",
  },
  {
    id: "fee-pivot",
    situation: "They won't budge on APR at all.",
    response:
      "I understand. As a gesture of goodwill for a long-time customer, could you waive my most recent interest charge or my annual fee instead?",
  },
  {
    id: "check-back",
    situation: "Firm no, no offers available.",
    response:
      "Okay. Please note on my account that I called to request a rate review. When is the next date my account is eligible for an automated APR review, and what would I need to qualify for a lower rate then?",
  },
  {
    id: "call-back",
    situation: "Still no after escalation.",
    response:
      "NOTE: Be polite, thank them, and hang up. Call back in a few months — a different rep, a longer on-time streak, or an improved score can change the answer. Many people succeed by asking every ~6 months until they get a 'no' they can't move.",
  },
];

/* =========================================================================
 * 4. Written templates (secure message + mailed letter)
 * ========================================================================= */

export const writtenTemplates: WrittenTemplate[] = [
  {
    id: "secure-message",
    title: "Secure message / email request",
    channel: "secure-message",
    subject: "APR reduction request — {{cardProductName}} acct ending {{cardLast4}}",
    body: `Hello,

I'm writing to request a permanent reduction in the purchase APR on my {{cardProductName}} account ending in {{cardLast4}}.

I've been a {{issuerName}} customer for {{yearsAsCustomer}} years with a consistent on-time payment history, and my credit score is currently {{creditScore}}. My current APR is {{currentApr}}%.

I've recently seen {{competingOffer}}. I'd prefer to stay with {{issuerName}}, so I'm asking whether you can match or beat that with a permanent rate of {{targetApr}}% on my account.

If a full match isn't possible, I'd appreciate your lowest available retention APR. Please also confirm in writing whether this requires a hard or soft credit inquiry, the effective date, and whether the new rate applies to my existing balance, new purchases, or both.

Thank you for your time.

{{fullName}}`,
  },
  {
    id: "mailed-letter",
    title: "Formal mailed letter (certified mail for a paper record)",
    channel: "letter",
    subject: "Re: {{cardProductName}} — Acct ending {{cardLast4}} — Request for APR reduction",
    body: `{{fullName}}
[Your Street Address]
[City, State ZIP]

{{date}}

{{issuerName}}
Attn: Account Retention / Customer Loyalty
[Issuer Mailing Address — see the back of your statement]

Re: {{cardProductName}}, account ending in {{cardLast4}} — Request for interest rate reduction

Dear {{issuerName}} Account Services,

I am writing to formally request a reduction of the Annual Percentage Rate on my account referenced above. I have been a customer for {{yearsAsCustomer}} years and have maintained an on-time payment history throughout that time.

My current APR is {{currentApr}}% on a balance of approximately \${{currentBalance}}. Since opening this account, my credit profile has strengthened; my credit score is currently {{creditScore}}. I have also received {{competingOffer}}.

I would prefer to remain a {{issuerName}} customer. Accordingly, I request that you reduce my APR to {{targetApr}}%, or provide your lowest available retention rate. I have enclosed a copy of my credit score confirmation and the competing offer(s) for your reference.

Please confirm in writing the new rate, its effective date, whether it is permanent, and whether it applies to my existing balance, new purchases, or both.

Thank you for your consideration.

Sincerely,

{{fullName}}

Enclosures: Credit score confirmation; competing offer documentation`,
  },
];

/* =========================================================================
 * 5. Post-call follow-up checklist
 * ========================================================================= */

export const postCallChecklist: ChecklistItem[] = [
  {
    id: "log-call",
    label: "Log the call details",
    detail:
      "Rep's name, date/time, department, and any reference/confirmation number.",
  },
  {
    id: "record-outcome",
    label: "Record the new terms (or the 'no')",
    detail:
      "New APR, effective date, permanent vs. promotional, and which balances are covered.",
  },
  {
    id: "get-in-writing",
    label: "Get confirmation in writing",
    detail:
      "Ask them to send terms via secure message or email. File it somewhere safe.",
  },
  {
    id: "follow-up",
    label: "Follow up if promised documentation doesn't arrive",
    detail: "Chase it within a couple of weeks if it hasn't shown up.",
  },
  {
    id: "verify-statement",
    label: "Verify the rate on your next statement",
    detail: "Confirm the new APR actually appears and is applied correctly.",
  },
  {
    id: "set-retry",
    label: "If they said no, schedule a retry",
    detail:
      "Put a reminder on your calendar for 3–6 months out. A different rep, a longer on-time streak, or a higher score can change the answer.",
  },
  {
    id: "consider-alternatives",
    label: "If still stuck, weigh alternatives",
    detail:
      "A 0% intro-APR balance transfer (with a payoff-before-expiry plan) or a fixed-rate consolidation loan can beat a high APR. Pair with your Snowball Pay payoff plan.",
  },
];

/* =========================================================================
 * 6. Quick facts / UI callouts
 * ========================================================================= */

export const quickFacts: QuickFact[] = [
  {
    id: "success-rate",
    stat: "~84% success rate",
    context:
      "Of cardholders who asked for a lower rate this year, about 84% got one — trimming their APR by roughly 6 points on average.",
    sourceId: "money-overview",
  },
  {
    id: "just-ask",
    stat: "Most rates are negotiable",
    context:
      "Issuers would rather cut your rate than lose your balance. The single biggest predictor of success is simply asking — and asking again.",
    sourceId: "bankrate",
  },
  {
    id: "specific-offer",
    stat: "Name a specific offer",
    context:
      "'A credit union at 14.99%' is far harder for a retention agent to dismiss than a vague 'better offers elsewhere.'",
    sourceId: "money-overview",
  },
];

/* =========================================================================
 * 7. Guardrails — the "unknown unknowns"
 * -------------------------------------------------------------------------
 * Rights, risks, and escalation paths most cardholders never think to use.
 * Surface these alongside the scripts so users negotiate from a position of
 * knowledge — and don't accidentally hurt themselves.
 * ========================================================================= */

export const guardrails: Guardrail[] = [
  {
    id: "scra-6-percent",
    title: "Active-duty military? You may have a legal right to 6% APR",
    body:
      "Under the Servicemembers Civil Relief Act (SCRA), active-duty servicemembers can have the rate on debt incurred BEFORE active duty capped at 6% — and interest above 6% must be forgiven, not just deferred. You must notify the lender in writing and include a copy of your active-duty orders. This is a legal right, not a favor, yet the CFPB found only a small fraction of eligible servicemembers ever claim it. (The Military Lending Act separately caps most new active-duty credit at 36% MAPR.)",
    tone: "opportunity",
    action: {
      label: "CFPB: SCRA rate reduction + example letter",
      url: "https://www.consumerfinance.gov/consumer-tools/military-financial-lifecycle/the-servicemembers-civil-relief-act-scra/",
    },
    sourceId: "cfpb-scra",
  },
  {
    id: "ask-about-inquiry",
    title: "Ask whether a rate cut triggers a hard credit pull",
    body:
      "Simply asking for a lower rate does not affect your credit score, and your APR is not a factor credit-scoring models use. But an issuer occasionally re-checks your credit before granting a reduction. Always ask up front: 'Would this require a hard or soft inquiry?' A hard inquiry stays on your report for 2 years and can affect your score for up to 1 year — worth knowing before you agree.",
    tone: "info",
    action: {
      label: "CFPB: what a credit inquiry is",
      url: "https://www.consumerfinance.gov/ask-cfpb/what-is-a-credit-inquiry-en-1317/",
    },
    sourceId: "cfpb-inquiry",
  },
  {
    id: "hardship-program",
    title: "Formal hardship programs are usually unadvertised — ask by name",
    body:
      "If you're struggling, many issuers have formal hardship programs (temporary rate cuts, waived fees, fixed payment plans) they won't mention unless you specifically ask for the 'hardship' team. Critical question: 'How will this accommodation be reported to the credit bureaus?' Get the terms — and the credit-reporting treatment — in writing before you accept, then verify your credit report a month later.",
    tone: "info",
    action: {
      label: "CFPB: contacting your lender for relief",
      url: "https://www.consumerfinance.gov/consumer-tools/disasters-and-emergencies/start-recovering-and-rebuilding-your-financial-life/",
    },
    sourceId: "cfpb-relief",
  },
  {
    id: "balance-transfer-trap",
    title: "Balance-transfer 0% offers have a catch — plan the payoff",
    body:
      "A 0% intro-APR balance transfer can beat a high rate, but only if you pay the balance off BEFORE the promo ends — otherwise the regular (often higher) APR kicks in on the remaining balance, and some deferred-interest offers can back-charge interest from day one. Also factor the transfer fee (typically 3–5%). Use it as a tool alongside your Snowball Pay payoff plan, not a way to avoid the debt.",
    tone: "caution",
    sourceId: "experian-aprcap",
  },
  {
    id: "counseling-not-settlement",
    title: "Nonprofit credit counseling ≠ for-profit debt settlement",
    body:
      "If direct negotiation isn't enough, a nonprofit credit counselor (find one via the NFCC) can set up a debt-management plan that often lowers rates across all your cards — the initial consult is typically free. Be cautious with for-profit 'debt settlement' firms: the CFPB warns they often can't get better terms than you'd get negotiating yourself, charge steep fees, and can damage your credit.",
    tone: "caution",
    action: {
      label: "NFCC: find a nonprofit credit counselor",
      url: "https://www.nfcc.org/",
    },
    sourceId: "nfcc",
  },
  {
    id: "no-federal-cap",
    title: "There's no general federal cap — which is exactly why you negotiate",
    body:
      "Outside the military protections above, no federal law caps credit-card interest; your rate is set by the issuer and the law of its home state. That's the point: because the rate is discretionary, it's negotiable. Don't assume the number in your agreement is fixed.",
    tone: "info",
    sourceId: "experian-aprcap",
  },
  {
    id: "cfpb-complaint",
    title: "If they won't honor your rights, escalate to the CFPB",
    body:
      "If an issuer refuses to apply a protection you're legally entitled to (e.g. the SCRA 6% cap) or mishandles a written agreement, you can file a free complaint with the Consumer Financial Protection Bureau. Keep your call log and any written confirmations — documentation is what makes an escalation stick.",
    tone: "info",
    action: {
      label: "Submit a complaint to the CFPB",
      url: "https://www.consumerfinance.gov/complaint/",
    },
    sourceId: "cfpb-complaint",
  },
  {
    id: "per-balance-apr",
    title: "You have more than one APR — negotiate the right one",
    body:
      "Purchases, balance transfers, and cash advances usually carry different APRs, and a penalty APR may apply if you were ever late. Confirm which rate you're actually paying on your balance before you call, and be specific about which APR you want reduced.",
    tone: "info",
    sourceId: "experian-aprcap",
  },
  {
    id: "get-it-in-writing",
    title: "Verbal wins evaporate — always get it in writing",
    body:
      "Before you hang up, get the rep's name, a reference number, and a written confirmation via the secure message center or email. Then verify the new APR actually appears on your next statement. A promised rate that never shows up is common — documentation is your recourse.",
    tone: "caution",
    sourceId: "saverlife",
  },
];

/* =========================================================================
 * 8. Sources (cite these in-app for credibility)
 * ========================================================================= */

export const sources: Source[] = [
  {
    id: "bankrate",
    name: "Bankrate — Want a Lower Credit Card Interest Rate? Just Ask",
    url: "https://www.bankrate.com/credit-cards/zero-interest/how-to-lower-credit-card-interest-rate/",
  },
  {
    id: "experian",
    name: "Experian — How to Negotiate a Lower Interest Rate on Your Credit Card",
    url: "https://www.experian.com/blogs/ask-experian/can-i-negotiate-a-lower-interest-rate-on-my-credit-card/",
  },
  {
    id: "investopedia",
    name: "Investopedia — Negotiate a Lower Credit Card Interest Rate",
    url: "https://www.investopedia.com/articles/pf/08/negotiate-credit-card-apr.asp",
  },
  {
    id: "cnet",
    name: "CNET — You Can Lower Your Credit Card's Interest Rate. Here's How",
    url: "https://www.cnet.com/personal-finance/you-can-lower-your-credit-cards-interest-rate-heres-how/",
  },
  {
    id: "credit-karma",
    name: "Intuit Credit Karma — How To Lower Your Credit Card Interest Rate",
    url: "https://www.creditkarma.com/credit-cards/i/how-to-lower-credit-card-interest-rate",
  },
  {
    id: "saverlife",
    name: "SaverLife — Say This, Save Money: Negotiating Credit Card Interest Rates",
    url: "https://saverlife.org/saverhub/say-this-save-money-negotiating-credit-card-interest-rates",
  },
  {
    id: "greenpath",
    name: "GreenPath — How to Negotiate a Lower Credit Card Interest Rate",
    url: "https://www.greenpath.com/blog/credit/how-to-negotiate-a-lower-credit-card-interest-rate/",
  },
  {
    id: "sofi",
    name: "SoFi — Will Credit Card Companies Lower Your Interest Rate if You Ask?",
    url: "https://www.sofi.com/learn/content/will-credit-card-companies-lower-your-interest-rate-if-you-as/",
  },
  {
    id: "cbs",
    name: "CBS News — 5 Ways to Get Lower Credit Card Rates Without Switching Cards",
    url: "https://www.cbsnews.com/news/get-lower-credit-card-rates-without-switching-cards/",
  },
  {
    id: "requestletters",
    name: "RequestLetters — Credit Card Interest Rate Reduction Letter Templates",
    url: "https://requestletters.com/home/letter-to-reduce-credit-card-interest-rates-templates",
  },
  {
    id: "money-overview",
    name: "The Money Overview — 84% of cardholders who asked got a lower rate",
    url: "https://themoneyoverview.com/84-of-cardholders-who-asked-for-a-lower-interest-rate-got-one-this-year-trimming-their-apr-about-6-points/",
  },
  {
    id: "cfpb-scra",
    name: "CFPB — Servicemembers Civil Relief Act (SCRA): reduce your rate to 6%",
    url: "https://www.consumerfinance.gov/consumer-tools/military-financial-lifecycle/the-servicemembers-civil-relief-act-scra/",
  },
  {
    id: "cfpb-inquiry",
    name: "CFPB — What is a credit inquiry?",
    url: "https://www.consumerfinance.gov/ask-cfpb/what-is-a-credit-inquiry-en-1317/",
  },
  {
    id: "cfpb-relief",
    name: "CFPB — Contacting lenders for hardship relief",
    url: "https://www.consumerfinance.gov/consumer-tools/disasters-and-emergencies/start-recovering-and-rebuilding-your-financial-life/",
  },
  {
    id: "cfpb-complaint",
    name: "CFPB — Submit a complaint",
    url: "https://www.consumerfinance.gov/complaint/",
  },
  {
    id: "experian-aprcap",
    name: "Experian — Is There a Limit on Credit Card Interest Rates?",
    url: "https://www.experian.com/blogs/ask-experian/is-there-a-limit-on-credit-card-interest-rates/",
  },
  {
    id: "nfcc",
    name: "National Foundation for Credit Counseling (NFCC)",
    url: "https://www.nfcc.org/",
  },
];

/* =========================================================================
 * Helper: interpolate {{placeholders}} in any script/template string.
 * =========================================================================
 *
 * Example:
 *   fillTemplate(callScripts[1].lines[0].text, userInputs)
 */
export function fillTemplate(
  template: string,
  inputs: Partial<NegotiationInputs>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = inputs[key as keyof NegotiationInputs];
    return value != null && value !== "" ? String(value) : match;
  });
}

/** Convenience: everything bundled for a single import. */
export const aprNegotiationContent = {
  preCallChecklist,
  callScripts,
  rebuttals,
  writtenTemplates,
  postCallChecklist,
  quickFacts,
  guardrails,
  sources,
} as const;

export default aprNegotiationContent;
