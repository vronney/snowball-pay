import type { Metadata } from "next";
import { auth0 } from "@/lib/auth0";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";

const BASE_URL = "https://getsnowballpay.com";

export const metadata: Metadata = {
  title: "Debt Payoff Plan Template: Build Your Own in 5 Steps",
  description:
    "Use this simple 5-step debt payoff plan template to organize your debts, choose a strategy, and build a realistic timeline. Includes a free interactive planner.",
  alternates: {
    canonical: `${BASE_URL}/learn/debt-payoff-plan-template`,
  },
  openGraph: {
    title: "Debt Payoff Plan Template: Build Your Own in 5 Steps",
    description:
      "Organize your debts, choose a payoff order, and turn vague intentions into a realistic debt-free date.",
    url: `${BASE_URL}/learn/debt-payoff-plan-template`,
  },
  twitter: {
    card: "summary_large_image",
    title: "Debt Payoff Plan Template: Build Your Own in 5 Steps",
    description:
      "A simple 5-step debt payoff plan template you can use today.",
  },
};

const planFields = [
  {
    field: "Creditor name",
    source: "Your statement or online account",
  },
  {
    field: "Current balance",
    source: "Latest statement or app",
  },
  {
    field: "APR (interest rate)",
    source: "Statement, app, or account settings",
  },
  {
    field: "Minimum payment",
    source: "Statement or autopay setup page",
  },
];

const planSteps = [
  {
    step: "Step 1",
    title: "List every debt",
    body: "Write down every debt you owe, including the creditor name, current balance, APR, and minimum monthly payment. Do not skip the small ones.",
  },
  {
    step: "Step 2",
    title: "Choose your payoff order",
    body: "Pick snowball, avalanche, or a custom order, then commit to the ranked list you will follow.",
  },
  {
    step: "Step 3",
    title: "Find your extra payment amount",
    body: "Review your budget and choose a sustainable amount you can add beyond your minimum payments each month.",
  },
  {
    step: "Step 4",
    title: "Set your debt-free target date",
    body: "Run the numbers, find your projected debt-free date, and write that date somewhere you will see it regularly.",
  },
  {
    step: "Step 5",
    title: "Schedule monthly check-ins",
    body: "Update balances, log payments, and apply windfalls directly to your focus debt as snowflake payments.",
  },
];

const insights = [
  {
    icon: "01",
    title: "Specific plans beat vague intentions",
    body: "A written plan turns a general goal into a clear sequence: which debt comes first, how much you will pay, and when you expect to be debt-free.",
  },
  {
    icon: "02",
    title: "Sustainable beats aggressive",
    body: "The extra payment amount needs to survive real life. Even $50 to $100 per month compounds when you keep applying it consistently.",
  },
  {
    icon: "03",
    title: "Progress needs a monthly rhythm",
    body: "A short monthly check-in keeps balances accurate, makes wins visible, and gives every windfall a job before it disappears into spending.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${BASE_URL}/learn/debt-payoff-plan-template#webpage`,
      url: `${BASE_URL}/learn/debt-payoff-plan-template`,
      name: "Debt Payoff Plan Template: Build Your Own in 5 Steps",
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
            name: "Debt Payoff Plan Template",
            item: `${BASE_URL}/learn/debt-payoff-plan-template`,
          },
        ],
      },
    },
    {
      "@type": "Article",
      "@id": `${BASE_URL}/learn/debt-payoff-plan-template#article`,
      headline: "Debt Payoff Plan Template: Build Your Own in 5 Steps",
      description:
        "Use this simple 5-step debt payoff plan template to organize your debts, choose a strategy, and build a realistic timeline.",
      url: `${BASE_URL}/learn/debt-payoff-plan-template`,
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
        "@id": `${BASE_URL}/learn/debt-payoff-plan-template#webpage`,
      },
    },
    {
      "@type": "HowTo",
      "@id": `${BASE_URL}/learn/debt-payoff-plan-template#howto`,
      name: "How to Build a Debt Payoff Plan",
      description:
        "A five-step process for listing debts, choosing a payoff order, setting an extra payment, finding a target date, and checking progress monthly.",
      step: planSteps.map((item) => ({
        "@type": "HowToStep",
        name: item.title,
        text: item.body,
      })),
    },
  ],
};

export default async function DebtPayoffPlanTemplatePage() {
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
              <span>Debt Payoff Plan Template</span>
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
              Debt Payoff Template
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
              Debt Payoff Plan Template: Build Your Own in{" "}
              <span style={{ color: "#1d4ed8" }}>5 Steps</span>
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
              Debt doesn&apos;t disappear by accident. A payoff plan gives every
              balance, payment, and target date a specific place so you can
              follow the plan instead of relying on vague intentions.
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
              <span>Template:</span>
              List debts, choose order, set extra payment, find your date
            </div>
          </div>
        </section>

        {/* Debt list table */}
        <section style={{ padding: "80px 24px", backgroundColor: "#ffffff" }}>
          <div style={{ maxWidth: "860px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "48px" }}>
              <div
                className="lp-section-tag"
                style={{ display: "inline-flex", marginBottom: "16px" }}
              >
                Step 1
              </div>
              <h2
                style={{
                  fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)",
                  fontWeight: 900,
                  letterSpacing: "-0.035em",
                  lineHeight: 1.1,
                }}
              >
                List Every Debt in One Place
              </h2>
            </div>

            <p
              style={{
                fontSize: "16px",
                color: "#64748b",
                lineHeight: 1.72,
                maxWidth: "680px",
                margin: "0 auto 32px",
                textAlign: "center",
              }}
            >
              Write down every debt you owe. Include the creditor name, current
              balance, APR, and minimum monthly payment. Do not skip any, even
              the small ones.
            </p>

            <div
              style={{
                borderRadius: "20px",
                overflow: "hidden",
                border: "1px solid rgba(15,23,42,0.09)",
                boxShadow: "0 4px 24px rgba(15,23,42,0.06)",
                marginBottom: "28px",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1.4fr",
                  background: "#0f172a",
                  padding: "16px 24px",
                  gap: "8px",
                }}
              >
                {["Field", "Where to Find It"].map((h) => (
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

              {planFields.map((item, i) => (
                <div
                  key={item.field}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1.4fr",
                    padding: "18px 24px",
                    gap: "8px",
                    alignItems: "center",
                    backgroundColor: i % 2 === 0 ? "#ffffff" : "#f8fafc",
                    borderTop: "1px solid rgba(15,23,42,0.07)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "#0f172a",
                    }}
                  >
                    {item.field}
                  </span>
                  <span style={{ fontSize: "14px", color: "#334155" }}>
                    {item.source}
                  </span>
                </div>
              ))}
            </div>

            <p
              style={{
                textAlign: "center",
                fontSize: "13px",
                color: "#94a3b8",
              }}
            >
              Use your most recent statement or online account balance before
              calculating a target payoff date.
            </p>
          </div>
        </section>

        {/* Key insights */}
        <section style={{ padding: "80px 24px", backgroundColor: "#f8fafc" }}>
          <div style={{ maxWidth: "960px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "48px" }}>
              <div
                className="lp-section-tag"
                style={{ display: "inline-flex", marginBottom: "16px" }}
              >
                Why It Works
              </div>
              <h2
                style={{
                  fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)",
                  fontWeight: 900,
                  letterSpacing: "-0.035em",
                  lineHeight: 1.1,
                }}
              >
                Three Rules That Make the Plan Stick
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

        {/* Five step template */}
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
                  The 5-step template
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
                  Build a Plan That Is Specific, Visible, and Realistic
                </h2>
                <p
                  style={{
                    fontSize: "16px",
                    color: "#64748b",
                    lineHeight: 1.72,
                    marginBottom: "20px",
                  }}
                >
                  Decide whether you will use the snowball method, avalanche
                  method, or a custom order. Then identify how much you can add
                  beyond minimums and run the numbers to find your debt-free
                  target date.
                </p>
                <p
                  style={{
                    fontSize: "16px",
                    color: "#64748b",
                    lineHeight: 1.72,
                  }}
                >
                  Once a month, update your balances and log payments. If you
                  get a bonus, refund, or side income payment, apply it directly
                  to your focus debt as a snowflake payment.
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
                  Your Payoff Plan
                </h3>
                {planSteps.map((item) => (
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
                      <strong>{item.title}:</strong> {item.body}
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
                  label: "Debt Snowball vs. Avalanche \u2192",
                  desc: "Compare both methods side-by-side",
                },
                {
                  href: "/learn/pay-off-10k-credit-card-debt",
                  label: "Pay Off $10k Credit Card Debt \u2192",
                  desc: "See payoff timelines by payment amount",
                },
                {
                  href: "/learn/fastest-way-to-become-debt-free",
                  label: "Fastest Way to Become Debt Free \u2192",
                  desc: "5 tactics that actually work",
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
            <div style={{ fontSize: "48px", marginBottom: "20px" }}>5</div>
            <h2
              style={{
                fontSize: "clamp(1.7rem, 4vw, 2.5rem)",
                fontWeight: 900,
                letterSpacing: "-0.04em",
                lineHeight: 1.1,
                marginBottom: "18px",
              }}
            >
              Build Your{" "}
              <span className="lp-text-blue">Debt Payoff Plan</span>
            </h2>
            <p
              style={{
                fontSize: "17px",
                color: "#64748b",
                lineHeight: 1.72,
                marginBottom: "36px",
              }}
            >
              SnowballPay automates the first four steps in under 2 minutes.
              Add your debts, choose a strategy, and get the full month-by-month
              schedule with your debt-free date.
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
                  ? "Open Dashboard \u2192"
                  : "Build My Free Plan \u2192"}
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
