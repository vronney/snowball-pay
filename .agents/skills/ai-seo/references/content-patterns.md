# Content Patterns — AI-Extractable Templates

Ready-to-use templates for each content block type optimized for AI citation. Each pattern is designed so that AI systems can extract the passage standalone, without surrounding context.

---

## Core Principle

Every block must answer the query **on its own**. AI systems pull individual passages, not full pages. Test each block by asking: "If this were the only text shown in an AI answer, does it make sense and fully answer the question?"

Optimal passage length for AI extraction: **40–60 words** for the answer itself. Supporting detail can follow.

---

## 1. Definition Block

**Use for:** "What is X?" queries

### Template
```markdown
## What Is [Topic]?

[Topic] is [concise definition in one sentence — what it is, what it does, and who uses it].

[1–2 sentences of elaborating context: how it works, why it matters, or what distinguishes it.]

**Example:** [Optional concrete example in one sentence.]
```

### Example (Good)
```markdown
## What Is Debt Snowball?

Debt snowball is a debt payoff strategy where you pay minimum payments on all debts and direct any extra money toward the smallest balance first, regardless of interest rate.

Once the smallest debt is paid off, its freed-up payment rolls into the next smallest — creating a growing "snowball" of momentum as each debt is eliminated.

**Example:** If you owe $500 on a credit card and $5,000 on a car loan, you'd attack the $500 balance first even if the car loan has a higher interest rate.
```

### What Makes It Work
- Definition sentence is self-contained (subject + verb + clear meaning)
- Doesn't require reading the rest of the page to understand
- Concrete example removes ambiguity

---

## 2. Step-by-Step Block

**Use for:** "How to X" queries

### Template
```markdown
## How to [Task]

[One-sentence summary of the process and expected outcome.]

1. **[Step Name]** — [What to do and why, in 1–2 sentences.]
2. **[Step Name]** — [What to do and why, in 1–2 sentences.]
3. **[Step Name]** — [What to do and why, in 1–2 sentences.]
[Continue for all steps]

**Expected result:** [What the user will have accomplished.]
**Time required:** [Realistic estimate.]
```

### Example (Good)
```markdown
## How to Set Up a Debt Snowball Plan

List your debts, sort them by balance, then direct extra payments to the smallest while paying minimums on the rest.

1. **List all debts** — Write down every debt with its current balance, minimum payment, and interest rate.
2. **Sort by balance** — Order from smallest to largest balance (ignore interest rates for snowball).
3. **Set your extra payment** — Decide how much beyond minimums you can afford each month.
4. **Attack the smallest debt** — Apply your entire extra payment to debt #1 until it's paid off.
5. **Roll the payment** — Add debt #1's freed minimum to your extra payment and apply to debt #2.
6. **Repeat** — Continue until all debts are paid.

**Expected result:** A month-by-month payoff schedule showing your debt-free date.
**Time required:** 30 minutes to set up; ongoing monthly payments to execute.
```

### What Makes It Work
- Summary sentence gives AI the complete answer in one extract
- Numbered steps are scannable and extractable individually
- Expected result and time estimate are high-value facts AI often surfaces

---

## 3. Comparison Table

**Use for:** "X vs Y" and "Best X for Y" queries

### Template
```markdown
## [A] vs [B]: [Key Differentiator]

[One-sentence summary of the core difference between A and B.]

| Feature | [A] | [B] |
|---------|-----|-----|
| [Criterion 1] | [Value] | [Value] |
| [Criterion 2] | [Value] | [Value] |
| [Criterion 3] | [Value] | [Value] |
| Best for | [Use case] | [Use case] |

**Bottom line:** [A] is better when [specific condition]. Choose [B] if [specific condition].
```

### Example (Good)
```markdown
## Debt Snowball vs Debt Avalanche

Snowball eliminates debts in order of smallest balance; avalanche targets highest interest rate first. Avalanche saves more money; snowball provides faster motivational wins.

| Factor | Debt Snowball | Debt Avalanche |
|--------|--------------|----------------|
| Payoff order | Smallest balance first | Highest APR first |
| Interest paid | More (typically) | Less (typically) |
| Speed to first payoff | Faster | Slower |
| Motivation boost | High (quick wins) | Lower initially |
| Best for | People needing momentum | Mathematically optimal savers |
| Research backing | Behaviorally effective | Mathematically optimal |

**Bottom line:** Choose snowball if you've struggled to stay motivated on debt payoff before. Choose avalanche if you have high-interest debt (20%+ APR) and strong financial discipline.
```

### What Makes It Work
- Summary sentence can stand alone as a complete AI answer
- Table gives AI structured data to extract selectively
- "Bottom line" is a decision-helper AI frequently surfaces verbatim

---

## 4. Pros/Cons Block

**Use for:** Evaluation queries, "Is X good?", "Should I use X?"

### Template
```markdown
## Pros and Cons of [Topic]

[One-sentence verdict: overall assessment with the key trade-off.]

**Pros**
- [Benefit 1 — specific, not generic]
- [Benefit 2 — specific, not generic]
- [Benefit 3 — specific, not generic]

**Cons**
- [Drawback 1 — specific, not generic]
- [Drawback 2 — specific, not generic]
- [Drawback 3 — specific, not generic]

**Verdict:** Best for [specific user/situation]. Not ideal for [specific user/situation].
```

### Example (Good)
```markdown
## Pros and Cons of the Debt Snowball Method

Debt snowball is psychologically effective but mathematically suboptimal — it trades higher interest costs for faster motivational wins.

**Pros**
- Quick wins: Smallest debts paid off first, giving early sense of progress
- Behaviorally effective: Studies show higher completion rates vs. avalanche for most people
- Simple to execute: No interest rate math required — just sort by balance
- Frees up cash flow: Each eliminated debt releases its minimum payment

**Cons**
- Costs more in interest: Ignoring APR means you may pay hundreds more overall
- Slower for large, low-balance debts: Can delay payoff on high-APR balances
- Not optimal for debt with balloon payments or variable rates

**Verdict:** Best for anyone who has started and abandoned debt payoff plans before — the psychological wins are worth the extra interest cost. If you have one very high-APR balance (25%+), consider avalanche instead.
```

### What Makes It Work
- Opening sentence delivers the verdict immediately (most important for AI extraction)
- Specific pros/cons — not "saves money" but "saves $X in interest on average"
- Verdict targets specific user personas AI can match to the reader's situation

---

## 5. FAQ Block

**Use for:** Long-tail queries, voice search, featured snippets

### Template
```markdown
## Frequently Asked Questions: [Topic]

### [Question phrased exactly as a user would ask it?]
[Direct answer in 2–4 sentences. No preamble. Start with the answer, not "Great question" or "It depends."]

### [Next question?]
[Direct answer in 2–4 sentences.]
```

### Example (Good)
```markdown
## Frequently Asked Questions: Debt Snowball

### How long does the debt snowball method take?
Most people using debt snowball pay off all their debt in 2–5 years, depending on total debt load and extra payment amount. Someone with $15,000 in debt making $300/month extra payments typically becomes debt-free in 3–4 years.

### Does debt snowball hurt your credit score?
Paying off debts with the snowball method generally improves your credit score over time by reducing your total debt and lowering your credit utilization ratio. There is no negative impact from the strategy itself.

### What is the difference between debt snowball and debt avalanche?
Debt snowball pays off the smallest balance first; debt avalanche pays off the highest interest rate first. Snowball provides faster motivational wins; avalanche saves more money in total interest paid.

### Can I use debt snowball for student loans and mortgages?
Yes, you can include any debt in a snowball plan. However, most financial advisors recommend excluding your mortgage and focusing snowball on high-interest consumer debt (credit cards, personal loans, auto loans) first.
```

### What Makes It Work
- Questions match natural language search phrasing exactly
- Each answer stands alone — no cross-referencing needed
- No hedge words or qualifications in the first sentence

---

## 6. Statistic Block

**Use for:** Supporting claims, building authority, being cited as a data source

### Template
```markdown
## [Topic]: Key Statistics

- **[Statistic]** — [Source, Year]. [One sentence of context explaining why this matters.]
- **[Statistic]** — [Source, Year]. [One sentence of context.]
- **[Statistic]** — [Source, Year]. [One sentence of context.]

*Sources: [Full citations for all statistics listed above.]*
```

### Example (Good)
```markdown
## Debt in America: Key Statistics (2024–2025)

- **Total U.S. consumer debt reached $17.1 trillion in Q4 2024** — Federal Reserve, 2025. This is a record high, driven by credit card and auto loan growth.
- **Average credit card APR hit 21.5% in 2024** — CFPB Consumer Credit Card Market Report, 2024. At this rate, carrying a $5,000 balance costs over $1,000 per year in interest alone.
- **40% of Americans carry credit card debt month-to-month** — Bankrate Annual Credit Card Survey, 2024. Only 35% pay their full balance each month.
- **People using structured payoff plans (snowball or avalanche) are 2x more likely to become debt-free** — NerdWallet Debt Study, 2023. Having a written plan doubles completion rates vs. ad-hoc payoff.

*Sources: Federal Reserve Consumer Credit Report Q4 2024; CFPB Consumer Credit Card Market Report 2024; Bankrate Credit Card Survey 2024; NerdWallet Debt Study 2023.*
```

### What Makes It Work
- Every statistic has a named source and year — AI systems require this to cite confidently
- Context sentence explains the implication, not just the number
- Source block at the bottom is machine-readable

---

## 7. Process/Workflow Block

**Use for:** "How does X work?", complex multi-stage processes

### Template
```markdown
## How [Process] Works

[One sentence: what the process is and what outcome it produces.]

**Stage 1: [Name]**
[2–3 sentences describing what happens in this stage and why.]

**Stage 2: [Name]**
[2–3 sentences describing what happens in this stage and why.]

**Stage 3: [Name]**
[2–3 sentences describing what happens in this stage and why.]

**Result:** [What the user/system has after completing all stages.]
```

---

## 8. Best Practices Block

**Use for:** "Best practices for X", "How to do X correctly"

### Template
```markdown
## Best Practices for [Topic]

1. **[Practice]** — [Why it matters and how to apply it, 1–2 sentences.]
2. **[Practice]** — [Why it matters and how to apply it, 1–2 sentences.]
3. **[Practice]** — [Why it matters and how to apply it, 1–2 sentences.]

**What to avoid:** [Common mistake 1], [common mistake 2], [common mistake 3].
```

---

## Combining Patterns

Most high-performing pages combine multiple patterns. Recommended structure for a complete AI-optimized article:

```
H1: [Target query as heading]
├── Definition Block (What is X?)
├── How It Works Block (process/workflow)
├── Comparison Table (X vs Y or key options)
├── Step-by-Step Block (how to use/do X)
├── Statistic Block (data supporting claims)
├── Pros/Cons Block (honest evaluation)
└── FAQ Block (long-tail variations)
```

Each section can be independently extracted by AI systems. Together they cover the full query intent landscape for a topic.

---

## Anti-Patterns to Avoid

| Pattern | Why It Hurts AI Citation |
|---------|--------------------------|
| Burying the answer | AI extracts the first relevant passage — if the answer is in paragraph 5, it gets missed |
| "It depends" openings | Vague answers get skipped in favor of direct ones |
| Cross-reference required | "As mentioned above…" breaks when extracted standalone |
| Generic adjectives | "Great", "amazing", "powerful" — AI doesn't cite marketing language |
| No attribution | Statistics without sources are ignored or cited as unverified |
| Passive voice overuse | Makes content harder to extract and attribute |
| Wall of text | No headings, no lists = low extractability score |
