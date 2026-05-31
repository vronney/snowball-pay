import type { Metadata } from "next";
import { auth0 } from "@/lib/auth0";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import LearnInlineCTA from "@/components/learn/LearnInlineCTA";

const BASE_URL = "https://getsnowballpay.com";

export const metadata: Metadata = {
  title: "The Fastest Way to Become Debt Free Without Earning More",
  description:
    "You don't need a bigger income to become debt free faster. These five strategies can cut months or years off your payoff timeline starting this month.",
  alternates: {
    canonical: `${BASE_URL}/learn/fastest-way-to-become-debt-free`,
  },
  openGraph: {
    title: "The Fastest Way to Become Debt Free Without Earning More",
    description:
      "Five practical strategies that reduce interest, increase principal payments, and help you protect your debt-free date.",
    url: `${BASE_URL}/learn/fastest-way-to-become-debt-free`,
  },
  twitter: {
    card: "summary_large_image",
    title: "The Fastest Way to Become Debt Free Without Earning More",
    description:
      "Cut months or years off your payoff timeline with five focused tactics.",
  },
};

const tactics = [
  {
    tactic: "Pick a structured payoff method",
    lever: "Focus every extra dollar",
    result:
      "Snowball and avalanche both keep extra payments aimed at one target instead of spreading them randomly.",
    highlight: true,
  },
  {
    tactic: "Make one extra payment per year",
    lever: "Increase principal",
    result:
      "A tax refund, bonus, or three-paycheck month can knock down your focus debt immediately.",
    highlight: false,
  },
  {
    tactic: "Negotiate a lower APR",
    lever: "Reduce interest",
    result:
      "A 3 to 5 point APR reduction on a $5,000 balance can save hundreds over the payoff period.",
    highlight: false,
  },
  {
    tactic: "Stop adding to the balances",
    lever: "Protect progress",
    result:
      "Every new charge extends the timeline, so active payoff mode needs a temporary spending firewall.",
    highlight: false,
  },
  {
    tactic: "Use a planner with a debt-free date",
    lever: "Create a deadline",
    result:
      "A specific date turns a vague goal into a monthly target you can protect and measure.",
    highlight: false,
  },
];

const insights = [
  {
    icon: "01",
    title: "Speed comes from two levers",
    body: "Getting debt-free faster means reducing the interest that accrues and increasing the amount that reaches principal. Everything else is secondary.",
  },
  {
    icon: "02",
    title: "Freed minimums create acceleration",
    body: "The payoff gets faster in the back half because every paid-off account sends its old minimum payment to the next target.",
  },
  {
    icon: "03",
    title: "A real date changes behavior",
    body: "Seeing October 2027 or March 2028 makes the goal concrete, which makes it easier to protect your extra payment budget.",
  },
];

const actionPlan = [
  {
    step: "Choose",
    desc: "Pick snowball, avalanche, or custom order and commit to one focus debt.",
  },
  {
    step: "Call",
    desc: "Ask each credit card issuer whether they can lower your APR.",
  },
  {
    step: "Freeze",
    desc: "Remove payoff cards from your wallet and digital wallets during active payoff mode.",
  },
  {
    step: "Apply",
    desc: "Send any refund, bonus, or extra paycheck directly to your focus debt.",
  },
  {
    step: "Track",
    desc: "Use a planner to see your debt-free date and update your balances monthly.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${BASE_URL}/learn/fastest-way-to-become-debt-free#webpage`,
      url: `${BASE_URL}/learn/fastest-way-to-become-debt-free`,
      name: "The Fastest Way to Become Debt Free Without Earning More",
      inLanguage: "en-US",
      dateModified: "2026-05-25",
      isPartOf: { "@id": `${BASE_URL}#website` },
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          {
            "@type": "ListItem",
            position: 2,
            name: "Learn",
            item: `${BASE_URL}/learn`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "Fastest Way to Become Debt Free",
            item: `${BASE_URL}/learn/fastest-way-to-become-debt-free`,
          },
        ],
      },
    },
    {
      "@type": "Article",
      "@id": `${BASE_URL}/learn/fastest-way-to-become-debt-free#article`,
      headline: "The Fastest Way to Become Debt Free Without Earning More",
      description:
        "Five strategies that can cut months or years off your payoff timeline without requiring a bigger income.",
      url: `${BASE_URL}/learn/fastest-way-to-become-debt-free`,
      datePublished: "2026-05-25",
      dateModified: "2026-05-25",
      author: {
        "@type": "Organization",
        name: "SnowballPay Editorial Team",
        url: BASE_URL,
      },
      publisher: {
        "@type": "Organization",
        name: "SnowballPay",
        url: BASE_URL,
        logo: { "@type": "ImageObject", url: `${BASE_URL}/logo-dark.svg` },
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": `${BASE_URL}/learn/fastest-way-to-become-debt-free#webpage`,
      },
    },
    {
      "@type": "HowTo",
      "@id": `${BASE_URL}/learn/fastest-way-to-become-debt-free#howto`,
      name: "How to Become Debt Free Faster",
      description:
        "A five-step approach to speed up debt payoff by choosing a method, making extra payments, lowering APR, stopping new balances, and tracking a debt-free date.",
      step: tactics.map((item) => ({
        "@type": "HowToStep",
        name: item.tactic,
        text: item.result,
      })),
    },
  ],
};

export default async function FastestWayToBecomeDebtFreePage() {
  const session = await auth0.getSession();
  const isLoggedIn = !!session;
  const ctaHref = isLoggedIn
    ? "/dashboard"
    : "/auth/login?returnTo=%2Fonboarding";

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div
        className="lp"
        style={{ backgroundColor: "#f8fafc", color: "#0f172a" }}
      >
        <LandingNav isLoggedIn={isLoggedIn} />

        {/* Hero */}
        <section
          className="lp-hero-bg"
          style={{
            position: "relative",
            overflow: "hidden",
            paddingTop: "112px",
            paddingBottom: "84px",
            paddingLeft: "24px",
            paddingRight: "24px",
            textAlign: "center",
          }}
        >
          <div className="lp-grid-overlay" />
          <div
            style={{
              maxWidth: "760px",
              margin: "0 auto",
              position: "relative",
              zIndex: 1,
            }}
          >
            <div
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
              <a
                href="/learn"
                style={{ color: "#2563eb", textDecoration: "none" }}
              >
                Learn
              </a>
              <span>&rsaquo;</span>
              <span>Fastest Way to Become Debt Free</span>
            </div>

            <div
              className="lp-f1 lp-glass-blue"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "9px",
                padding: "6px 16px",
                borderRadius: "999px",
                fontSize: "12px",
                fontWeight: 700,
                color: "#1e3a8a",
                background: "#dbeafe",
                border: "1px solid #93c5fd",
                marginBottom: "28px",
              }}
            >
              <span
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: "#2563eb",
                  display: "inline-block",
                }}
              />
              Debt Payoff Acceleration
            </div>

            <h1
              className="lp-f2"
              style={{
                fontSize: "clamp(2rem, 5.5vw, 3.6rem)",
                fontWeight: 900,
                lineHeight: 1.08,
                letterSpacing: "-0.04em",
                marginBottom: "22px",
              }}
            >
              The Fastest Way to Become{" "}
              <span style={{ color: "#1d4ed8" }}>Debt Free</span> Without
              Earning More
            </h1>

            <p
              className="lp-f3"
              style={{
                fontSize: "18px",
                lineHeight: 1.72,
                color: "#64748b",
                maxWidth: "600px",
                margin: "0 auto 40px",
              }}
            >
              You don&apos;t need a bigger income to become debt free faster.
              These five strategies can cut months or years off your payoff
              timeline starting this month.
            </p>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                borderRadius: "12px",
                background: "rgba(37,99,235,0.06)",
                border: "1px solid rgba(37,99,235,0.15)",
                fontSize: "13px",
                color: "#1d4ed8",
                fontWeight: 600,
              }}
            >
              <span>Two levers:</span>
              Lower interest plus more money toward principal
            </div>
          </div>
        </section>

        {/* Tactics table */}
        <section style={{ padding: "80px 24px", backgroundColor: "#ffffff" }}>
          <div style={{ maxWidth: "920px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "48px" }}>
              <div
                className="lp-section-tag"
                style={{ display: "inline-flex", marginBottom: "16px" }}
              >
                Five Tactics
              </div>
              <h2
                style={{
                  fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)",
                  fontWeight: 900,
                  letterSpacing: "-0.035em",
                  lineHeight: 1.1,
                }}
              >
                What Actually Shortens Your Payoff Timeline
              </h2>
            </div>

            <p
              style={{
                fontSize: "16px",
                color: "#64748b",
                lineHeight: 1.72,
                maxWidth: "720px",
                margin: "0 auto 32px",
                textAlign: "center",
              }}
            >
              Getting out of debt faster comes down to reducing the interest
              accruing on your balances and increasing the amount you pay toward
              principal each month. Everything below moves one of those levers.
            </p>

            <div
              style={{
                borderRadius: "20px",
                overflowX: "auto",
                overflowY: "hidden",
                border: "1px solid rgba(15,23,42,0.09)",
                boxShadow: "0 4px 24px rgba(15,23,42,0.06)",
                marginBottom: "28px",
              }}
            >
              <div style={{ minWidth: "720px" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.2fr 0.8fr 1.5fr",
                    background: "#0f172a",
                    padding: "16px 24px",
                    gap: "8px",
                  }}
                >
                  {["Tactic", "Primary Lever", "Why It Works"].map((h) => (
                    <div
                      key={h}
                      style={{
                        fontSize: "11px",
                        fontWeight: 800,
                        letterSpacing: "0.1em",
                        color: "#94a3b8",
                        textTransform: "uppercase",
                      }}
                    >
                      {h}
                    </div>
                  ))}
                </div>

                {tactics.map((item, i) => (
                  <div
                    key={item.tactic}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.2fr 0.8fr 1.5fr",
                      padding: "18px 24px",
                      gap: "8px",
                      alignItems: "center",
                      backgroundColor: item.highlight
                        ? "rgba(37,99,235,0.04)"
                        : i % 2 === 0
                        ? "#ffffff"
                        : "#f8fafc",
                      borderTop: "1px solid rgba(15,23,42,0.07)",
                      borderLeft: item.highlight ? "3px solid #2563eb" : undefined,
                    }}
                  >
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: item.highlight ? 700 : 500,
                        color: item.highlight ? "#1d4ed8" : "#0f172a",
                      }}
                    >
                      {item.tactic}
                    </span>
                    <span
                      style={{
                        fontSize: "13px",
                        color: item.highlight ? "#1d4ed8" : "#334155",
                        fontWeight: item.highlight ? 700 : 500,
                      }}
                    >
                      {item.lever}
                    </span>
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#475569",
                        lineHeight: 1.5,
                      }}
                    >
                      {item.result}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <p
              style={{
                textAlign: "center",
                fontSize: "13px",
                color: "#94a3b8",
              }}
            >
              Start with the tactic you can act on this week, then layer in the
              rest as your plan gets steadier.
            </p>
          </div>
        </section>

        <LearnInlineCTA
          headline="Want to see your fastest path to debt-free?"
          body="Enter your balances, pick a strategy, and get your exact payoff order and debt-free date — free, no account required."
          isLoggedIn={isLoggedIn}
        />

        {/* Key insights */}
        <section style={{ padding: "80px 24px", backgroundColor: "#f8fafc" }}>
          <div style={{ maxWidth: "960px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "48px" }}>
              <div
                className="lp-section-tag"
                style={{ display: "inline-flex", marginBottom: "16px" }}
              >
                Why This Works
              </div>
              <h2
                style={{
                  fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)",
                  fontWeight: 900,
                  letterSpacing: "-0.035em",
                  lineHeight: 1.1,
                }}
              >
                Three Things That Speed Up Payoff
              </h2>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "20px",
              }}
            >
              {insights.map((insight) => (
                <div
                  key={insight.title}
                  className="lp-glass lp-card-hover"
                  style={{ borderRadius: "20px", padding: "32px" }}
                >
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "12px",
                      background: "rgba(37,99,235,0.08)",
                      border: "1px solid rgba(37,99,235,0.18)",
                      color: "#1d4ed8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "13px",
                      fontWeight: 900,
                      marginBottom: "16px",
                    }}
                  >
                    {insight.icon}
                  </div>
                  <h3
                    style={{
                      fontSize: "15px",
                      fontWeight: 800,
                      color: "#0f172a",
                      marginBottom: "10px",
                      lineHeight: 1.4,
                    }}
                  >
                    {insight.title}
                  </h3>
                  <p
                    style={{
                      fontSize: "14px",
                      color: "#64748b",
                      lineHeight: 1.7,
                    }}
                  >
                    {insight.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Action plan */}
        <section style={{ padding: "80px 24px", backgroundColor: "#ffffff" }}>
          <div style={{ maxWidth: "860px", margin: "0 auto" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(340px, 100%), 1fr))",
                gap: "32px",
                alignItems: "center",
              }}
            >
              <div>
                <div className="lp-section-tag" style={{ marginBottom: "16px" }}>
                  Start this month
                </div>
                <h2
                  style={{
                    fontSize: "clamp(1.5rem, 3vw, 2.1rem)",
                    fontWeight: 900,
                    letterSpacing: "-0.035em",
                    lineHeight: 1.15,
                    marginBottom: "18px",
                  }}
                >
                  Turn the Five Tactics Into a Real Payoff System
                </h2>
                <p
                  style={{
                    fontSize: "16px",
                    color: "#64748b",
                    lineHeight: 1.72,
                    marginBottom: "20px",
                  }}
                >
                  Random extra payments are better than nothing, but they are
                  less efficient than a deliberate strategy. Pick one payoff
                  method and stay with it so freed minimums roll forward as each
                  balance disappears.
                </p>
                <p
                  style={{
                    fontSize: "16px",
                    color: "#64748b",
                    lineHeight: 1.72,
                  }}
                >
                  Then protect the plan. Lower APRs where you can, stop adding
                  new charges to cards you are paying off, and give every
                  windfall a job before it turns into ordinary spending.
                </p>
              </div>

              <div
                className="lp-glass-blue"
                style={{ borderRadius: "20px", padding: "32px" }}
              >
                <h3
                  style={{
                    fontSize: "14px",
                    fontWeight: 800,
                    color: "#1d4ed8",
                    marginBottom: "20px",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  This Month&apos;s Acceleration Plan
                </h3>
                {actionPlan.map((item) => (
                  <div
                    key={item.step}
                    style={{
                      display: "flex",
                      gap: "14px",
                      marginBottom: "14px",
                      alignItems: "flex-start",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 800,
                        color: "#2563eb",
                        background: "rgba(37,99,235,0.12)",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        whiteSpace: "nowrap",
                        marginTop: "1px",
                        flexShrink: 0,
                      }}
                    >
                      {item.step}
                    </span>
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#334155",
                        lineHeight: 1.5,
                      }}
                    >
                      {item.desc}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Related Articles */}
        <section style={{ padding: "64px 24px", backgroundColor: "#f8fafc" }}>
          <div style={{ maxWidth: "860px", margin: "0 auto" }}>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: 800,
                color: "#0f172a",
                marginBottom: "20px",
              }}
            >
              Related Guides
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "14px",
              }}
            >
              {[
                {
                  href: "/learn",
                  label: "Debt Snowball vs. Avalanche →",
                  desc: "Compare both methods side-by-side",
                },
                {
                  href: "/learn/pay-off-10k-credit-card-debt",
                  label: "Pay Off $10k Credit Card Debt →",
                  desc: "See payoff timelines by payment amount",
                },
                {
                  href: "/learn/debt-payoff-plan-template",
                  label: "Debt Payoff Plan Template →",
                  desc: "Build your plan in 5 steps",
                },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  style={{
                    display: "block",
                    padding: "20px 24px",
                    borderRadius: "14px",
                    background: "#ffffff",
                    border: "1px solid rgba(15,23,42,0.08)",
                    textDecoration: "none",
                    transition: "box-shadow 0.15s",
                  }}
                >
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "#1d4ed8",
                      marginBottom: "4px",
                    }}
                  >
                    {link.label}
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>
                    {link.desc}
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section
          style={{
            padding: "96px 24px 112px",
            backgroundColor: "#ffffff",
            textAlign: "center",
          }}
        >
          <div style={{ maxWidth: "600px", margin: "0 auto" }}>
            <div style={{ fontSize: "48px", marginBottom: "20px" }}>2</div>
            <h2
              style={{
                fontSize: "clamp(1.7rem, 4vw, 2.5rem)",
                fontWeight: 900,
                letterSpacing: "-0.04em",
                lineHeight: 1.1,
                marginBottom: "18px",
              }}
            >
              Find Your{" "}
              <span className="lp-text-blue">Debt-Free Date</span>
            </h2>
            <p
              style={{
                fontSize: "17px",
                color: "#64748b",
                lineHeight: 1.72,
                marginBottom: "36px",
              }}
            >
              Add your debts, pick a strategy, and see the exact payoff schedule
              SnowballPay calculates for your balances, APRs, and extra payment
              amount.
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <a
                href={ctaHref}
                className="lp-btn lp-btn-primary"
                style={{ fontSize: "16px", padding: "15px 34px" }}
              >
                {isLoggedIn
                  ? "Open Dashboard →"
                  : "Build My Free Plan →"}
              </a>
              <a
                href="/calculator"
                className="lp-btn lp-btn-ghost"
                style={{ fontSize: "15px" }}
              >
                Try the Calculator
              </a>
            </div>
            <p
              style={{ fontSize: "13px", color: "#94a3b8", marginTop: "20px" }}
            >
              Free forever plan available. No credit card required.
            </p>
          </div>
        </section>

        <LandingFooter />
      </div>
    </>
  );
}
