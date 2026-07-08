import type { Metadata } from "next";
import { auth0 } from "@/lib/auth0";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import LearnInlineCTA from "@/components/learn/LearnInlineCTA";

const BASE_URL = "https://getsnowballpay.com";

export const metadata: Metadata = {
  title: "How Long to Pay Off $10,000 in Credit Card Debt?",
  description:
    "See exactly how long it takes to pay off $10,000 in credit card debt across four payment scenarios — and how much interest you'll save by adding $100 extra per month.",
  alternates: {
    canonical: `${BASE_URL}/learn/pay-off-10k-credit-card-debt`,
  },
  openGraph: {
    title: "How Long to Pay Off $10,000 in Credit Card Debt?",
    description:
      "Real numbers across four payment scenarios. See how much faster you become debt-free with just $100 extra per month.",
    url: `${BASE_URL}/learn/pay-off-10k-credit-card-debt`,
  },
  twitter: {
    card: "summary_large_image",
    title: "How Long to Pay Off $10,000 in Credit Card Debt?",
    description:
      "Real numbers across four payment scenarios — minimum payments vs. extra payments.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${BASE_URL}/learn/pay-off-10k-credit-card-debt#webpage`,
      url: `${BASE_URL}/learn/pay-off-10k-credit-card-debt`,
      name: "How Long to Pay Off $10,000 in Credit Card Debt?",
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
            name: "Pay Off $10k Credit Card Debt",
            item: `${BASE_URL}/learn/pay-off-10k-credit-card-debt`,
          },
        ],
      },
    },
    {
      "@type": "Article",
      "@id": `${BASE_URL}/learn/pay-off-10k-credit-card-debt#article`,
      headline: "How Long to Pay Off $10,000 in Credit Card Debt?",
      description:
        "See exactly how long it takes to pay off $10,000 in credit card debt across four payment scenarios.",
      url: `${BASE_URL}/learn/pay-off-10k-credit-card-debt`,
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
        "@id": `${BASE_URL}/learn/pay-off-10k-credit-card-debt#webpage`,
      },
    },
  ],
};

const scenarios = [
  {
    payment: "Minimum only (~$250)",
    months: "338 months",
    years: "28+ years",
    interest: "$14,400+",
    highlight: false,
  },
  {
    payment: "$300 / month",
    months: "52 months",
    years: "4.3 years",
    interest: "$5,600",
    highlight: false,
  },
  {
    payment: "$400 / month",
    months: "31 months",
    years: "2.6 years",
    interest: "$3,100",
    highlight: true,
  },
  {
    payment: "$600 / month",
    months: "19 months",
    years: "1.6 years",
    interest: "$1,800",
    highlight: false,
  },
];

const insights = [
  {
    icon: "⚡",
    title: "One extra $100/month changes everything",
    body: "Going from $300 to $400/month cuts 21 months off your timeline and saves over $2,500 in interest. That's $100/month buying nearly two years of freedom.",
  },
  {
    icon: "🔄",
    title: "Minimums are a trap",
    body: "The minimum payment shrinks as your balance drops, so your payoff timeline barely moves. You're paying interest faster than you're paying down principal.",
  },
  {
    icon: "🎯",
    title: "The extra payment matters more than the method",
    body: "Whether you use snowball or avalanche, the biggest lever is your extra payment amount. Method is second — amount is first.",
  },
];

export default async function PayOff10kPage() {
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
      <div className="lp" style={{ backgroundColor: "#f8fafc", color: "#0f172a" }}>
        <LandingNav isLoggedIn={isLoggedIn} />

        {/* ── Hero ─────────────────────────────────────────────────── */}
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
            {/* Breadcrumb */}
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
              <a href="/learn" style={{ color: "#2563eb", textDecoration: "none" }}>
                Learn
              </a>
              <span>›</span>
              <span>Pay Off $10k Credit Card Debt</span>
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
              Debt Math Explained
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
              How Long to Pay Off{" "}
              <span style={{ color: "#1d4ed8" }}>$10,000</span> in Credit Card
              Debt?
            </h1>

            <p
              className="lp-f3"
              style={{
                fontSize: "18px",
                lineHeight: 1.72,
                color: "#64748b",
                maxWidth: "580px",
                margin: "0 auto 40px",
              }}
            >
              We ran the numbers across four payment scenarios so you can see
              exactly where extra payments make the biggest difference — and how
              far minimum payments fall short.
            </p>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                borderRadius: "12px",
                background: "rgba(220,38,38,0.06)",
                border: "1px solid rgba(220,38,38,0.15)",
                fontSize: "13px",
                color: "#b91c1c",
                fontWeight: 600,
              }}
            >
              <span>⚠️</span>
              Assumptions: $10,000 balance · 20% APR · minimum = 2.5% of balance
            </div>
          </div>
        </section>

        {/* ── Payment Scenarios Table ───────────────────────────────── */}
        <section style={{ padding: "80px 24px", backgroundColor: "#ffffff" }}>
          <div style={{ maxWidth: "860px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "48px" }}>
              <div
                className="lp-section-tag"
                style={{ display: "inline-flex", marginBottom: "16px" }}
              >
                Payment Scenarios
              </div>
              <h2
                style={{
                  fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)",
                  fontWeight: 900,
                  letterSpacing: "-0.035em",
                  lineHeight: 1.1,
                }}
              >
                Four Ways to Pay Off $10,000
              </h2>
            </div>

            {/* Table */}
            <div
              style={{
                borderRadius: "20px",
                overflow: "hidden",
                border: "1px solid rgba(15,23,42,0.09)",
                boxShadow: "0 4px 24px rgba(15,23,42,0.06)",
                marginBottom: "28px",
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
                  background: "#0f172a",
                  padding: "16px 24px",
                  gap: "8px",
                }}
              >
                {["Monthly Payment", "Payoff Time", "In Years", "Total Interest"].map(
                  (h) => (
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
                  )
                )}
              </div>

              {scenarios.map((s, i) => (
                <div
                  key={s.payment}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
                    padding: "18px 24px",
                    gap: "8px",
                    alignItems: "center",
                    backgroundColor: s.highlight
                      ? "rgba(37,99,235,0.04)"
                      : i % 2 === 0
                      ? "#ffffff"
                      : "#f8fafc",
                    borderTop: "1px solid rgba(15,23,42,0.07)",
                    borderLeft: s.highlight ? "3px solid #2563eb" : undefined,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: s.highlight ? 700 : 500,
                        color: s.highlight ? "#1d4ed8" : "#0f172a",
                      }}
                    >
                      {s.payment}
                    </span>
                    {s.highlight && (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 800,
                          color: "#2563eb",
                          background: "rgba(37,99,235,0.1)",
                          border: "1px solid rgba(37,99,235,0.2)",
                          padding: "2px 8px",
                          borderRadius: "999px",
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                        }}
                      >
                        Sweet spot
                      </span>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: "14px",
                      color: "#334155",
                      fontWeight: s.highlight ? 600 : 400,
                    }}
                  >
                    {s.months}
                  </span>
                  <span
                    style={{
                      fontSize: "14px",
                      color: "#334155",
                      fontWeight: s.highlight ? 600 : 400,
                    }}
                  >
                    {s.years}
                  </span>
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      color:
                        i === 0
                          ? "#dc2626"
                          : s.highlight
                          ? "#16a34a"
                          : "#334155",
                    }}
                  >
                    {s.interest}
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
              Minimum payment assumes 2.5% of remaining balance, decreasing
              over time. All figures approximate.
            </p>
          </div>
        </section>

        <LearnInlineCTA
          headline="See how long it takes to pay off your balance"
          body="Enter your actual balance, APR, and what you can pay each month — get your payoff date and interest cost in under 2 minutes."
          isLoggedIn={isLoggedIn}
        />

        {/* ── Key Insights ─────────────────────────────────────────── */}
        <section style={{ padding: "80px 24px", backgroundColor: "#f8fafc" }}>
          <div style={{ maxWidth: "960px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "48px" }}>
              <div
                className="lp-section-tag"
                style={{ display: "inline-flex", marginBottom: "16px" }}
              >
                What the Data Shows
              </div>
              <h2
                style={{
                  fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)",
                  fontWeight: 900,
                  letterSpacing: "-0.035em",
                  lineHeight: 1.1,
                }}
              >
                Three Things These Numbers Prove
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
                  <div style={{ fontSize: "32px", marginBottom: "16px" }}>
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

        {/* ── Snowball on Multiple Cards ────────────────────────────── */}
        <section style={{ padding: "80px 24px", backgroundColor: "#ffffff" }}>
          <div style={{ maxWidth: "860px", margin: "0 auto" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
                gap: "32px",
                alignItems: "center",
              }}
            >
              <div>
                <div className="lp-section-tag" style={{ marginBottom: "16px" }}>
                  If the $10k is spread across cards
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
                  A Structured Method Accelerates Your Payoff Even Further
                </h2>
                <p
                  style={{
                    fontSize: "16px",
                    color: "#64748b",
                    lineHeight: 1.72,
                    marginBottom: "20px",
                  }}
                >
                  When $10,000 is split across two or three credit cards, using
                  the snowball or avalanche method keeps you organized and
                  accelerating. Each time you pay off a card, that freed minimum
                  rolls into the next — shortening your total timeline beyond
                  what any flat extra payment can do alone.
                </p>
                <p
                  style={{
                    fontSize: "16px",
                    color: "#64748b",
                    lineHeight: 1.72,
                  }}
                >
                  The freed minimum is the compounding engine. It&apos;s not
                  just your $100 extra — it&apos;s $100 plus $35 plus $80 by
                  the time you reach the last card.
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
                  How the Snowball Compounds
                </h3>
                {[
                  {
                    step: "Month 1",
                    desc: "Pay minimums on all cards + $100 extra on Card B",
                  },
                  { step: "Month 6", desc: "Card B gone — roll $35 freed minimum to Card A" },
                  {
                    step: "Now paying",
                    desc: "$100 extra + $35 freed = $135 attacking Card A",
                  },
                  { step: "Month 18", desc: "Card A gone — roll $80 freed minimum to Loan" },
                  {
                    step: "Now paying",
                    desc: "$100 + $35 + $80 = $215 crushing the final balance",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
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
                    <span style={{ fontSize: "13px", color: "#334155", lineHeight: 1.5 }}>
                      {item.desc}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Related Articles ─────────────────────────────────────── */}
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
                  href: "/learn/debt-payoff-plan-template",
                  label: "Debt Payoff Plan Template →",
                  desc: "Build your plan in 5 steps",
                },
                {
                  href: "/learn/fastest-way-to-become-debt-free",
                  label: "Fastest Way to Become Debt Free →",
                  desc: "5 tactics that actually work",
                },
                {
                  href: "/learn/when-expenses-exceed-income",
                  label: "When Expenses Exceed Income →",
                  desc: "The right bill order, and free help that exists",
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

        {/* ── CTA ──────────────────────────────────────────────────── */}
        <section
          style={{
            padding: "96px 24px 112px",
            backgroundColor: "#ffffff",
            textAlign: "center",
          }}
        >
          <div style={{ maxWidth: "600px", margin: "0 auto" }}>
            <div style={{ fontSize: "48px", marginBottom: "20px" }}>📅</div>
            <h2
              style={{
                fontSize: "clamp(1.7rem, 4vw, 2.5rem)",
                fontWeight: 900,
                letterSpacing: "-0.04em",
                lineHeight: 1.1,
                marginBottom: "18px",
              }}
            >
              See Your Personal{" "}
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
              Add your real balances, rates, and extra payment — the planner
              shows your exact month-by-month schedule and the date you become
              debt-free.
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
                {isLoggedIn ? "Open Dashboard →" : "Build My Free Plan →"}
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
