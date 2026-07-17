import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";
import { auth0 } from "@/lib/auth0";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";

const BASE_URL = "https://getsnowballpay.com";
const PAGE_URL = BASE_URL + "/learn/which-debt-should-i-pay-first";

export const metadata: Metadata = {
  title: "Which Debt Should I Pay Off First? Snowball vs. Avalanche",
  description:
    "Learn how to choose which debt to pay first by comparing the Snowball and Avalanche methods with your balances, APRs, budget, and motivation.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "Which Debt Should I Pay Off First? Snowball vs. Avalanche",
    description:
      "Use your balances, APRs, budget, and motivation to choose a practical debt payoff order.",
    url: PAGE_URL,
    type: "article",
    publishedTime: "2026-07-15",
    modifiedTime: "2026-07-15",
  },
  twitter: {
    card: "summary_large_image",
    title: "Which Debt Should I Pay Off First?",
    description:
      "Compare Snowball and Avalanche, then choose the debt that should get your next extra dollar.",
  },
};

const faqs = [
  {
    question: "Should I pay the highest balance first?",
    answer:
      "Usually, balance size alone is not the decision rule. Snowball uses the smallest balance, while Avalanche uses the highest APR. A high balance may come later under either method unless another constraint makes it a custom priority.",
  },
  {
    question: "Should I pay off a credit card before a loan?",
    answer:
      "It depends on the balances, APRs, minimum payments, and any special loan terms. Credit cards often have higher rates, but compare the actual accounts rather than relying only on debt type.",
  },
  {
    question: "Is Snowball or Avalanche faster?",
    answer:
      "With the same monthly payment, the answer depends on your debt mix. Avalanche generally prioritizes interest efficiency; Snowball prioritizes earlier balance closures. Calculate both schedules for your numbers.",
  },
  {
    question: "Can I combine the two methods?",
    answer:
      "Yes. You might pay off one very small balance for momentum and then switch to the highest APR. Treat that as a deliberate custom plan and calculate the resulting schedule so the tradeoff is visible.",
  },
  {
    question: "How often should I update my plan?",
    answer:
      "Update it when balances, rates, minimum payments, or your available extra amount change. A monthly check-in is a practical rhythm for many households.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": PAGE_URL + "#article",
      headline: "Which Debt Should I Pay Off First? Snowball vs. Avalanche",
      description:
        "A practical guide to choosing a debt payoff order using the Snowball, Avalanche, or a deliberate custom method.",
      url: PAGE_URL,
      datePublished: "2026-07-15",
      dateModified: "2026-07-15",
      inLanguage: "en-US",
      author: {
        "@type": "Organization",
        name: "SnowballPay Editorial Team",
        url: BASE_URL,
      },
      publisher: {
        "@type": "Organization",
        name: "SnowballPay",
        url: BASE_URL,
        logo: { "@type": "ImageObject", url: BASE_URL + "/logo-dark.svg" },
      },
      mainEntityOfPage: { "@type": "WebPage", "@id": PAGE_URL },
    },
    {
      "@type": "BreadcrumbList",
      "@id": PAGE_URL + "#breadcrumb",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
        {
          "@type": "ListItem",
          position: 2,
          name: "Learn",
          item: BASE_URL + "/learn",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Which Debt Should I Pay Off First?",
          item: PAGE_URL,
        },
      ],
    },
    {
      "@type": "FAQPage",
      "@id": PAGE_URL + "#faq",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
  ],
};

const articleText: CSSProperties = {
  color: "#475569",
  fontSize: "16px",
  lineHeight: 1.8,
  marginBottom: "18px",
};

function ArticleSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} style={{ marginBottom: "52px", scrollMarginTop: "96px" }}>
      <h2
        style={{
          color: "#0f172a",
          fontSize: "clamp(1.45rem, 3vw, 2rem)",
          fontWeight: 800,
          letterSpacing: "-0.025em",
          lineHeight: 1.2,
          marginBottom: "18px",
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function BulletList({ children }: { children: ReactNode }) {
  return (
    <ul
      style={{
        ...articleText,
        paddingLeft: "22px",
        display: "grid",
        gap: "8px",
      }}
    >
      {children}
    </ul>
  );
}

export default async function WhichDebtShouldIPayFirstPage() {
  const session = await auth0.getSession();
  const isLoggedIn = !!session;
  const planHref = isLoggedIn
    ? "/dashboard"
    : "/auth/login?returnTo=%2Fonboarding";

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="lp" style={{ backgroundColor: "#f8fafc", color: "#0f172a" }}>
        <LandingNav isLoggedIn={isLoggedIn} />

        <header
          className="lp-hero-bg"
          style={{
            position: "relative",
            overflow: "hidden",
            padding: "104px 24px 72px",
            textAlign: "center",
          }}
        >
          <div className="lp-grid-overlay" />
          <div
            style={{
              maxWidth: "820px",
              margin: "0 auto",
              position: "relative",
              zIndex: 1,
            }}
          >
            <nav
              aria-label="Breadcrumb"
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "6px",
                alignItems: "center",
                marginBottom: "24px",
                fontSize: "13px",
                color: "#64748b",
              }}
            >
              <a href="/learn" style={{ color: "#2563eb", textDecoration: "none" }}>
                Learn
              </a>
              <span aria-hidden="true">&rsaquo;</span>
              <span>Choosing Your First Debt</span>
            </nav>

            <div
              className="lp-f1 lp-glass-blue"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "9px",
                padding: "6px 16px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 700,
                color: "#1e3a8a",
                background: "#dbeafe",
                border: "1px solid #93c5fd",
                marginBottom: "28px",
              }}
            >
              Debt Payoff Order
            </div>

            <h1
              className="lp-f2"
              style={{
                fontSize: "clamp(2.2rem, 6vw, 4rem)",
                fontWeight: 900,
                lineHeight: 1.08,
                letterSpacing: "-0.04em",
                marginBottom: "22px",
              }}
            >
              Which Debt Should I{" "}
              <span style={{ color: "#1d4ed8" }}>Pay Off First?</span>
            </h1>
            <p
              className="lp-f3"
              style={{
                fontSize: "18px",
                lineHeight: 1.72,
                color: "#64748b",
                maxWidth: "660px",
                margin: "0 auto 24px",
              }}
            >
              Compare the Snowball and Avalanche methods using your balances,
              APRs, budget, and the kind of progress that keeps you consistent.
            </p>
            <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>
              Published July 15, 2026 · 9 minute read
            </p>
          </div>
        </header>

        <main style={{ backgroundColor: "#ffffff", padding: "72px 24px 96px" }}>
          <article style={{ maxWidth: "760px", margin: "0 auto" }}>
            <p style={{ ...articleText, fontSize: "18px", color: "#334155" }}>
              When you have several debts, deciding to pay extra is only half
              the decision. You still need to answer a practical question:
              which balance should get the next extra dollar?
            </p>
            <p style={articleText}>
              The <strong>Debt Snowball</strong> starts with your smallest
              balance. The <strong>Debt Avalanche</strong> starts with your
              highest interest rate. A custom order can also make sense when a
              deadline or real-life constraint matters more than either default.
            </p>

            <aside
              style={{
                borderRadius: "12px",
                border: "1px solid rgba(37,99,235,0.2)",
                background: "rgba(37,99,235,0.05)",
                padding: "24px",
                margin: "32px 0 52px",
              }}
            >
              <h2
                style={{
                  fontSize: "17px",
                  fontWeight: 800,
                  color: "#0f172a",
                  marginBottom: "12px",
                }}
              >
                The short answer
              </h2>
              <p style={{ ...articleText, marginBottom: "10px" }}>
                Choose the <strong>smallest balance first</strong> if quick wins
                help you stay motivated. Choose the <strong>highest APR first</strong>{" "}
                if minimizing interest is your top priority.
              </p>
              <p style={{ ...articleText, marginBottom: 0 }}>
                Keep every required payment current, send the extra amount to one
                focus debt, and recheck the plan when your numbers change.
              </p>
            </aside>

            <ArticleSection title="Start with a safe monthly amount">
              <p style={articleText}>
                Before choosing the first debt, decide how much you can
                consistently put toward debt each month. Start with take-home
                income, essential expenses, minimum debt payments, a reasonable
                cash buffer, and the extra amount left after those obligations.
              </p>
              <p style={articleText}>
                A plan that leaves no room for groceries, transportation,
                medical needs, or an unexpected bill is fragile. If the extra
                amount changes each month, use a conservative baseline and add
                more only when the cash is actually available.
              </p>
              <p style={articleText}>
                If you cannot pay more than the minimums right now, that is not a
                failure. Staying current while stabilizing your budget can be the
                right next step.
              </p>
            </ArticleSection>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))",
                gap: "20px",
                marginBottom: "52px",
              }}
            >
              <section
                id="snowball"
                style={{
                  borderRadius: "12px",
                  border: "1px solid rgba(15,23,42,0.1)",
                  padding: "28px",
                  scrollMarginTop: "96px",
                }}
              >
                <div className="lp-section-tag" style={{ marginBottom: "14px" }}>
                  Option 1
                </div>
                <h2 style={{ fontSize: "1.35rem", fontWeight: 800, marginBottom: "14px" }}>
                  Smallest balance first
                </h2>
                <p style={articleText}>
                  Snowball orders debts from smallest balance to largest. Pay the
                  minimum on every debt, then direct the extra amount to the
                  smallest one. When it reaches zero, roll that payment forward.
                </p>
                <h3 style={{ fontSize: "15px", fontWeight: 800, marginBottom: "10px" }}>
                  Consider Snowball when:
                </h3>
                <BulletList>
                  <li>You feel overwhelmed by the number of accounts.</li>
                  <li>Earlier visible progress helps you stay consistent.</li>
                  <li>Removing one payment would simplify your month.</li>
                </BulletList>
                <p style={{ ...articleText, marginBottom: 0 }}>
                  <strong>Tradeoff:</strong> a larger, higher-rate balance may
                  keep accruing more interest while you finish the smaller debt.
                </p>
              </section>

              <section
                id="avalanche"
                style={{
                  borderRadius: "12px",
                  border: "1px solid rgba(15,23,42,0.1)",
                  padding: "28px",
                  scrollMarginTop: "96px",
                }}
              >
                <div className="lp-section-tag" style={{ marginBottom: "14px" }}>
                  Option 2
                </div>
                <h2 style={{ fontSize: "1.35rem", fontWeight: 800, marginBottom: "14px" }}>
                  Highest APR first
                </h2>
                <p style={articleText}>
                  Avalanche orders debts from highest interest rate to lowest.
                  Pay the minimum on every debt, then direct the extra amount to
                  the highest-APR balance and roll that payment forward.
                </p>
                <h3 style={{ fontSize: "15px", fontWeight: 800, marginBottom: "10px" }}>
                  Consider Avalanche when:
                </h3>
                <BulletList>
                  <li>Reducing total interest is your main objective.</li>
                  <li>A math-first rule helps you stay confident.</li>
                  <li>One balance has a materially higher rate.</li>
                </BulletList>
                <p style={{ ...articleText, marginBottom: 0 }}>
                  <strong>Tradeoff:</strong> a large high-APR balance can make the
                  first account closure feel distant even when the plan is working.
                </p>
              </section>
            </div>

            <ArticleSection title="A simple example">
              <p style={articleText}>Imagine you have these three debts:</p>
              <div
                style={{
                  overflowX: "auto",
                  border: "1px solid rgba(15,23,42,0.1)",
                  borderRadius: "12px",
                  marginBottom: "22px",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      {["Debt", "Balance", "APR", "Minimum"].map((heading) => (
                        <th
                          key={heading}
                          style={{
                            padding: "13px 16px",
                            textAlign: "left",
                            fontWeight: 700,
                            color: "#334155",
                            borderBottom: "1px solid rgba(15,23,42,0.1)",
                          }}
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Store Card", "$650", "24%", "$35"],
                      ["Credit Card", "$3,200", "29%", "$110"],
                      ["Auto Loan", "$7,800", "7%", "$245"],
                    ].map((row) => (
                      <tr key={row[0]} style={{ borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
                        {row.map((cell, index) => (
                          <td
                            key={cell}
                            className={index > 0 ? "mono" : undefined}
                            style={{ padding: "13px 16px", color: "#334155" }}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={articleText}>
                Snowball starts with the <strong>$650 Store Card</strong> because
                it has the smallest balance. Avalanche starts with the{" "}
                <strong>29% Credit Card</strong> because it has the highest APR.
                A payoff calculation shows the first-payoff date, total interest,
                and final date for each path.
              </p>
            </ArticleSection>

            <ArticleSection title="When a custom payoff order makes sense">
              <p style={articleText}>
                Real life does not always fit a two-method comparison. A deliberate
                custom order may be more useful when:
              </p>
              <BulletList>
                <li>A promotional APR will expire soon.</li>
                <li>A family loan carries an important relationship commitment.</li>
                <li>A small balance creates disproportionate administrative stress.</li>
                <li>A secured debt has a specific risk or deadline.</li>
                <li>A household partner needs a shared priority to stay aligned.</li>
              </BulletList>
              <p style={articleText}>
                Custom does not mean random. Write down the reason for the
                exception, decide how long it applies, and review the plan after
                that condition changes.
              </p>
            </ArticleSection>

            <ArticleSection title="Four questions to choose your method">
              {[
                {
                  title: "1. What keeps you following a plan?",
                  body: "If distant results make you lose momentum, an earlier payoff win may be valuable. If a clear mathematical rule reduces decision fatigue, Avalanche may feel steadier.",
                },
                {
                  title: "2. How different are the APRs?",
                  body: "If rates are close, the interest difference may be modest. If one rate is far higher, the Avalanche case becomes stronger. Run the full schedule rather than guessing.",
                },
                {
                  title: "3. How long until the first payoff?",
                  body: "Compare the projected month of the first paid-off account under each method. That date makes the motivational tradeoff concrete.",
                },
                {
                  title: "4. Can your budget support the plan?",
                  body: "A payoff strategy cannot fix a monthly shortfall. If essentials and required payments use all available income, focus first on stability and avoiding new balances.",
                },
              ].map((item) => (
                <div key={item.title} style={{ marginBottom: "24px" }}>
                  <h3 style={{ fontSize: "17px", fontWeight: 800, marginBottom: "8px" }}>
                    {item.title}
                  </h3>
                  <p style={{ ...articleText, marginBottom: 0 }}>{item.body}</p>
                </div>
              ))}
            </ArticleSection>

            <aside
              style={{
                background: "#0f172a",
                borderRadius: "12px",
                padding: "34px",
                margin: "0 0 52px",
              }}
            >
              <h2
                style={{
                  color: "#ffffff",
                  fontSize: "1.55rem",
                  fontWeight: 850,
                  letterSpacing: "-0.025em",
                  marginBottom: "12px",
                }}
              >
                Compare both methods with your real numbers
              </h2>
              <p
                style={{
                  color: "#cbd5e1",
                  fontSize: "15px",
                  lineHeight: 1.7,
                  marginBottom: "22px",
                }}
              >
                Enter balances, APRs, and minimums to compare payoff order,
                projected debt-free date, and the effect of an extra monthly payment.
              </p>
              <a
                href="/calculator"
                className="lp-btn lp-btn-primary"
                style={{ display: "inline-flex", fontSize: "15px", padding: "13px 24px" }}
              >
                Try the Free Calculator
              </a>
              <p style={{ color: "#94a3b8", fontSize: "12px", margin: "14px 0 0" }}>
                No bank connection required to run the numbers.
              </p>
            </aside>

            <ArticleSection title="Common mistakes to avoid">
              {[
                [
                  "Switching methods every month",
                  "Changing direction after every statement can scatter extra payments. Choose a method, document the reason, and change it only when your numbers or priorities materially change.",
                ],
                [
                  "Ignoring minimum payments",
                  "The focus debt receives the extra payment. Every other debt still needs its required payment to avoid fees or other consequences.",
                ],
                [
                  "Using an unrealistic extra amount",
                  "Use an amount that works in ordinary months, then treat additional money as optional acceleration.",
                ],
                [
                  "Looking only at the final date",
                  "Review the payoff order, monthly payment demand, first payoff, and interest estimate together.",
                ],
              ].map(([title, body]) => (
                <div
                  key={title}
                  style={{
                    borderBottom: "1px solid rgba(15,23,42,0.08)",
                    paddingBottom: "20px",
                    marginBottom: "20px",
                  }}
                >
                  <h3 style={{ fontSize: "16px", fontWeight: 800, marginBottom: "8px" }}>
                    {title}
                  </h3>
                  <p style={{ ...articleText, marginBottom: 0 }}>{body}</p>
                </div>
              ))}
            </ArticleSection>

            <ArticleSection title="How to build your payoff order">
              <ol
                style={{
                  ...articleText,
                  paddingLeft: "22px",
                  display: "grid",
                  gap: "9px",
                }}
              >
                <li>Gather each balance, APR, minimum payment, and due date.</li>
                <li>Choose a realistic monthly extra payment.</li>
                <li>Run the Snowball method.</li>
                <li>Run the Avalanche method.</li>
                <li>Compare order, first payoff, debt-free date, and interest.</li>
                <li>Choose one method for the next review period.</li>
                <li>Update balances regularly so the projection stays useful.</li>
              </ol>
              <p style={articleText}>
                The goal is not a perfect plan that never changes. It is a clear
                plan that can adapt without forcing you to start over.
              </p>
            </ArticleSection>

            <ArticleSection id="frequently-asked-questions" title="Frequently asked questions">
              {faqs.map((faq) => (
                <div
                  key={faq.question}
                  style={{
                    borderBottom: "1px solid rgba(15,23,42,0.08)",
                    paddingBottom: "22px",
                    marginBottom: "22px",
                  }}
                >
                  <h3 style={{ fontSize: "17px", fontWeight: 800, marginBottom: "8px" }}>
                    {faq.question}
                  </h3>
                  <p style={{ ...articleText, marginBottom: 0 }}>{faq.answer}</p>
                </div>
              ))}
            </ArticleSection>

            <p
              style={{
                color: "#64748b",
                fontSize: "13px",
                lineHeight: 1.65,
                paddingTop: "4px",
              }}
            >
              SnowballPay provides educational planning tools, not individualized
              financial, legal, credit, or tax advice. Review account terms and
              consider a qualified professional for guidance specific to your situation.
            </p>
          </article>
        </main>

        <section
          style={{
            padding: "80px 24px 96px",
            textAlign: "center",
            backgroundColor: "#f8fafc",
          }}
        >
          <div style={{ maxWidth: "620px", margin: "0 auto" }}>
            <h2
              style={{
                fontSize: "clamp(1.7rem, 4vw, 2.5rem)",
                fontWeight: 900,
                letterSpacing: "-0.04em",
                lineHeight: 1.1,
                marginBottom: "16px",
              }}
            >
              Turn the Decision Into a{" "}
              <span className="lp-text-blue">Clear Payoff Plan</span>
            </h2>
            <p style={{ fontSize: "17px", color: "#64748b", lineHeight: 1.72, marginBottom: "30px" }}>
              Add your debts once, choose a method, and keep your payoff order
              and projected debt-free date in one place.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
              <a href={planHref} className="lp-btn lp-btn-primary">
                {isLoggedIn ? "Open Dashboard" : "Build My Free Plan"}
              </a>
              <a href="/learn" className="lp-btn lp-btn-ghost">
                Compare Both Methods
              </a>
            </div>
          </div>
        </section>

        <LandingFooter />
      </div>
    </>
  );
}
