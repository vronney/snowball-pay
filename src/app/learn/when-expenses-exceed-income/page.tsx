import type { Metadata } from "next";
import { auth0 } from "@/lib/auth0";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import LearnInlineCTA from "@/components/learn/LearnInlineCTA";

const BASE_URL = "https://getsnowballpay.com";

export const metadata: Metadata = {
  title: "When Your Expenses Are More Than Your Income: What to Do",
  description:
    "If your essential expenses exceed your take-home pay, you're not alone and it's not a math mistake to fix. Here's the real order to pay bills in, and the free help available right now.",
  alternates: {
    canonical: `${BASE_URL}/learn/when-expenses-exceed-income`,
  },
  openGraph: {
    title: "When Your Expenses Are More Than Your Income: What to Do",
    description:
      "A practical, judgment-free guide: which bills to protect first, and the free nonprofit and government programs that can create real breathing room.",
    url: `${BASE_URL}/learn/when-expenses-exceed-income`,
  },
  twitter: {
    card: "summary_large_image",
    title: "When Your Expenses Are More Than Your Income: What to Do",
    description:
      "Which bills to pay first, and the free help available when the math doesn't work yet.",
  },
};

const priorityBills = [
  {
    rank: "1",
    category: "Housing",
    examples: "Rent or mortgage",
    why: "Missing this risks eviction or foreclosure — the highest-stakes bill you have.",
  },
  {
    rank: "2",
    category: "Utilities",
    examples: "Electricity, gas, water",
    why: "Losing power or water affects safety and health, and reconnection often costs more than the original bill.",
  },
  {
    rank: "3",
    category: "Food & essential medicine",
    examples: "Groceries, prescriptions",
    why: "Non-negotiable for day-to-day health — and often where assistance programs can free up cash fastest.",
  },
  {
    rank: "4",
    category: "Court-ordered payments",
    examples: "Child support",
    why: "Can carry legal consequences, including wage garnishment, that other missed bills don't.",
  },
  {
    rank: "5",
    category: "Insurance",
    examples: "Health, auto, renters",
    why: "Protects you from a much larger loss later — a lapse now can cost far more than the premium.",
  },
  {
    rank: "6",
    category: "Transportation for work",
    examples: "Car payment, gas, transit",
    why: "Losing your way to work turns a cash-flow problem into an income problem.",
  },
  {
    rank: "7",
    category: "Unsecured debt",
    examples: "Credit cards, personal loans, medical bills",
    why: "Missing a payment here costs fees and credit score — real, but rarely as urgent as losing your home or utilities.",
    highlight: true,
  },
];

const helpOptions = [
  {
    icon: "🧭",
    tag: "Free budget review",
    title: "Nonprofit credit counseling",
    body: "NFCC-member agencies review your full budget for free and can set up a Debt Management Plan — one consolidated payment, often at a reduced interest rate, with collector calls stopped. NFCC's own data shows counseled clients cut revolving debt by about $3,600 more over 18 months than people who didn't get counseling.",
    linkLabel: "nfcc.org →",
    linkHref: "https://www.nfcc.org/",
  },
  {
    icon: "☎️",
    tag: "Ask your issuer directly",
    title: "Creditor hardship programs",
    body: "Most major card issuers (Amex, Chase, Citi, Discover, and others) have a hardship or forbearance program — a reduced APR, lower minimum payment, paused payments, or waived fees for a period, sometimes up to a few years. Nobody offers this automatically; you have to call and ask, and be ready to describe what changed.",
    linkLabel: "Call the number on the back of your card and ask.",
    linkHref: null,
  },
  {
    icon: "🏠",
    tag: "Frees up the bills themselves",
    title: "Rent, utility & food assistance",
    body: "211 is the free, nationwide front door to rent, utility, and food assistance — a live person matches you to local programs in about 10 minutes, no cost, no commitment. LIHEAP covers home energy bills specifically. Hospitals are required to have financial-assistance policies for medical bills, and the nonprofit Dollar For will do that paperwork for you at no cost.",
    linkLabel: "211.org →",
    linkHref: "https://www.211.org/get-help/i-need-help-paying-my-bills",
  },
  {
    icon: "🎓",
    tag: "If a student loan is on your list",
    title: "Income-driven repayment & deferment",
    body: "Federal student loan servicers offer income-driven repayment plans that recalculate your payment against what you actually earn, plus deferment or forbearance options for short-term hardship. Log into your servicer's account or call them directly — this is a phone call, not a formal application process, for most options.",
    linkLabel: null,
    linkHref: null,
  },
];

const actionPlan = [
  {
    step: "List",
    desc: "Write your bills in the priority order above — not in the order the loudest collector is calling.",
  },
  {
    step: "Call 211",
    desc: "Ten minutes, free, no commitment. Ask what rent, utility, or food assistance you qualify for right now.",
  },
  {
    step: "Book counseling",
    desc: "Contact an NFCC member agency for a free budget review — they've seen this exact situation many times.",
  },
  {
    step: "Ask issuers",
    desc: "Call each card company and literally ask: “Do you have a hardship program?” Document whatever they offer.",
  },
  {
    step: "Recheck loans",
    desc: "If a federal student loan is in the mix, ask your servicer about income-driven repayment before anything else.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${BASE_URL}/learn/when-expenses-exceed-income#webpage`,
      url: `${BASE_URL}/learn/when-expenses-exceed-income`,
      name: "When Your Expenses Are More Than Your Income: What to Do",
      inLanguage: "en-US",
      dateModified: "2026-07-08",
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
            name: "When Expenses Exceed Income",
            item: `${BASE_URL}/learn/when-expenses-exceed-income`,
          },
        ],
      },
    },
    {
      "@type": "Article",
      "@id": `${BASE_URL}/learn/when-expenses-exceed-income#article`,
      headline: "When Your Expenses Are More Than Your Income: What to Do",
      description:
        "A practical, judgment-free guide to prioritizing bills and finding free help when essential expenses exceed take-home pay.",
      url: `${BASE_URL}/learn/when-expenses-exceed-income`,
      datePublished: "2026-07-08",
      dateModified: "2026-07-08",
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
        "@id": `${BASE_URL}/learn/when-expenses-exceed-income#webpage`,
      },
    },
    {
      "@type": "HowTo",
      "@id": `${BASE_URL}/learn/when-expenses-exceed-income#howto`,
      name: "What to Do When Expenses Exceed Income",
      description:
        "A five-step approach: prioritize bills correctly, call 211, get free nonprofit counseling, ask creditors for hardship programs, and check student loan repayment options.",
      step: actionPlan.map((item) => ({
        "@type": "HowToStep",
        name: item.step,
        text: item.desc,
      })),
    },
  ],
};

export default async function WhenExpensesExceedIncomePage() {
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
              <span>When Expenses Exceed Income</span>
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
              A Judgment-Free Guide
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
              When Your Expenses Are{" "}
              <span style={{ color: "#1d4ed8" }}>More Than Your Income</span>
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
              If your essential expenses use up your whole paycheck, that
              &apos;s a real financial situation, not a mistake you made. Here
              &apos;s the order to protect your bills in, and the free help
              that actually exists.
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
              <span>Start here:</span>
              Protect housing and utilities before anything else
            </div>
          </div>
        </section>

        {/* Priority order table */}
        <section style={{ padding: "80px 24px", backgroundColor: "#ffffff" }}>
          <div style={{ maxWidth: "920px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "48px" }}>
              <div
                className="lp-section-tag"
                style={{ display: "inline-flex", marginBottom: "16px" }}
              >
                If You Can&apos;t Pay Everything
              </div>
              <h2
                style={{
                  fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)",
                  fontWeight: 900,
                  letterSpacing: "-0.035em",
                  lineHeight: 1.1,
                }}
              >
                The Order That Actually Protects You
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
              This is the order consumer-finance counselors recommend when
              every bill can&apos;t be paid on time. It has nothing to do with
              who calls the most — it&apos;s about which risk is worse.
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
                    gridTemplateColumns: "0.5fr 1fr 1fr 1.8fr",
                    background: "#0f172a",
                    padding: "16px 24px",
                    gap: "8px",
                  }}
                >
                  {["#", "Category", "Examples", "Why This Order"].map((h) => (
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

                {priorityBills.map((item, i) => (
                  <div
                    key={item.category}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "0.5fr 1fr 1fr 1.8fr",
                      padding: "18px 24px",
                      gap: "8px",
                      alignItems: "center",
                      backgroundColor: item.highlight
                        ? "rgba(100,116,139,0.06)"
                        : i % 2 === 0
                        ? "#ffffff"
                        : "#f8fafc",
                      borderTop: "1px solid rgba(15,23,42,0.07)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: 800,
                        color: item.highlight ? "#64748b" : "#2563eb",
                      }}
                    >
                      {item.rank}
                    </span>
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: 700,
                        color: "#0f172a",
                      }}
                    >
                      {item.category}
                    </span>
                    <span style={{ fontSize: "13px", color: "#334155" }}>
                      {item.examples}
                    </span>
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#475569",
                        lineHeight: 1.5,
                      }}
                    >
                      {item.why}
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
              Credit card and personal loan minimums are last on purpose —
              missing one costs money and credit score, but it&apos;s rarely
              as urgent as losing your home or utilities.
            </p>
          </div>
        </section>

        <LearnInlineCTA
          headline="See what a plan looks like at your real numbers"
          body="Even with $0 extra some months, SnowballPay builds a minimum-payments plan and shows your debt-free date — free, no account required."
          isLoggedIn={isLoggedIn}
        />

        {/* Help options */}
        <section style={{ padding: "80px 24px", backgroundColor: "#f8fafc" }}>
          <div style={{ maxWidth: "960px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "48px" }}>
              <div
                className="lp-section-tag"
                style={{ display: "inline-flex", marginBottom: "16px" }}
              >
                Real, Free Help
              </div>
              <h2
                style={{
                  fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)",
                  fontWeight: 900,
                  letterSpacing: "-0.035em",
                  lineHeight: 1.1,
                }}
              >
                Programs That Exist for Exactly This
              </h2>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "20px",
              }}
            >
              {helpOptions.map((opt) => (
                <div
                  key={opt.title}
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
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "18px",
                      marginBottom: "16px",
                    }}
                  >
                    {opt.icon}
                  </div>
                  <p
                    style={{
                      fontSize: "11px",
                      fontWeight: 800,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#2563eb",
                      marginBottom: "8px",
                    }}
                  >
                    {opt.tag}
                  </p>
                  <h3
                    style={{
                      fontSize: "16px",
                      fontWeight: 800,
                      color: "#0f172a",
                      marginBottom: "10px",
                      lineHeight: 1.4,
                    }}
                  >
                    {opt.title}
                  </h3>
                  <p
                    style={{
                      fontSize: "14px",
                      color: "#64748b",
                      lineHeight: 1.7,
                      marginBottom: opt.linkHref || opt.linkLabel ? "16px" : 0,
                    }}
                  >
                    {opt.body}
                  </p>
                  {opt.linkHref ? (
                    <a
                      href={opt.linkHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "#1d4ed8",
                        textDecoration: "none",
                      }}
                    >
                      {opt.linkLabel}
                    </a>
                  ) : opt.linkLabel ? (
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "#94a3b8",
                      }}
                    >
                      {opt.linkLabel}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>

            <p
              style={{
                textAlign: "center",
                fontSize: "12px",
                color: "#94a3b8",
                maxWidth: "640px",
                margin: "32px auto 0",
                lineHeight: 1.6,
              }}
            >
              SnowballPay isn&apos;t affiliated with NFCC, 211, LIHEAP, or any
              card issuer, and doesn&apos;t provide credit counseling itself.
              Eligibility and offerings vary and change — confirm details
              directly with each organization.
            </p>
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
                  Start this week
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
                  Five Calls That Create Real Breathing Room
                </h2>
                <p
                  style={{
                    fontSize: "16px",
                    color: "#64748b",
                    lineHeight: 1.72,
                    marginBottom: "20px",
                  }}
                >
                  None of these require a perfect credit score or a lawyer.
                  Most take one phone call and cost nothing to try — the
                  worst outcome is being told no.
                </p>
                <p
                  style={{
                    fontSize: "16px",
                    color: "#64748b",
                    lineHeight: 1.72,
                  }}
                >
                  Do them in this order, and revisit your SnowballPay plan
                  once anything changes — a lower minimum payment or a freed-
                  up utility bill both mean more room to pay down debt.
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
                  This Week&apos;s Plan
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
                  href: "/learn/fastest-way-to-become-debt-free",
                  label: "Fastest Way to Become Debt Free →",
                  desc: "5 tactics that actually work",
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
            <div style={{ fontSize: "48px", marginBottom: "20px" }}>🌱</div>
            <h2
              style={{
                fontSize: "clamp(1.7rem, 4vw, 2.5rem)",
                fontWeight: 900,
                letterSpacing: "-0.04em",
                lineHeight: 1.1,
                marginBottom: "18px",
              }}
            >
              Whatever Your Numbers Look Like{" "}
              <span className="lp-text-blue">Today</span>
            </h2>
            <p
              style={{
                fontSize: "17px",
                color: "#64748b",
                lineHeight: 1.72,
                marginBottom: "36px",
              }}
            >
              SnowballPay builds a real plan even when there&apos;s $0 extra
              some months — add your debts and see your minimum-payments
              timeline, then watch it improve as things change.
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
