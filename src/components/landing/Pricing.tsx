const plans = [
  {
    name: "Free",
    tagline: "Start your journey",
    price: 0,
    period: "forever",
    desc: "Build your payoff plan and track progress at no cost.",
    badge: null,
    featured: false,
    accent: "#2563eb",
    cta: "Get Started Free",
    ghost: true,
    href: "/auth/login?returnTo=/dashboard",
    features: [
      "Track up to 5 debts",
      "Snowball and Avalanche strategies",
      "Monthly payoff calendar",
      "Progress visualization",
      "Mobile-friendly interface",
    ],
  },
  {
    name: "Pro",
    tagline: "Serious about debt-free",
    price: 9,
    period: "per month",
    desc: "Stay consistent with guidance and deeper planning to reach $0 faster.",
    badge: "Most Popular",
    featured: true,
    accent: "#2563eb",
    cta: "Try Pro Free for 7 Days",
    ghost: false,
    href: "/auth/login?returnTo=%2Fdashboard%3Fcheckout%3Dpro",
    features: [
      "Unlimited debts",
      "Personalized payoff advice",
      "Spending insights and monthly change summaries",
      "Behavior nudges and debt-risk alerts",
      "Negotiation suggestions for selected debts",
      "Custom debt priority order",
      "Priority support",
    ],
  },
];

const trustItems = [
  { text: "Setup in minutes" },
  { text: "No bank connection required" },
  { text: "Cancel anytime" },
  { text: "Snowball and Avalanche support" },
  { text: "Exportable plan data" },
];

function CheckIcon({ color }: { color: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      style={{ flexShrink: 0, marginTop: "1px" }}
    >
      <circle cx="8" cy="8" r="7" fill={color} fillOpacity="0.12" />
      <path
        d="M5 8l2.5 2.5L11 5.5"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Pricing() {
  return (
    <section
      id="pricing"
      style={{
        padding: "112px 24px",
        position: "relative",
        overflow: "hidden",
        background: "#ffffff",
      }}
    >
      <div
        style={{
          maxWidth: "1120px",
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "72px" }}>
          <div className="lp-section-tag">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <circle cx="5" cy="5" r="5" />
            </svg>
            Simple Pricing
          </div>
          <h2
            style={{
              fontSize: "clamp(2rem, 5vw, 3rem)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              color: "#0f172a",
              margin: "0 0 18px",
              lineHeight: 1.1,
            }}
          >
            Transparent pricing.{" "}
            <span className="lp-text-blue">No surprises.</span>
          </h2>
          <p
            style={{
              fontSize: "17px",
              color: "#64748b",
              maxWidth: "440px",
              margin: "0 auto",
              lineHeight: 1.7,
            }}
          >
            Start on Free with no card required. Upgrade when you are ready.
            Pro includes a 7-day trial at checkout.
          </p>
        </div>

        <div
          className="lp-pricing-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "20px",
            alignItems: "start",
          }}
        >
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`lp-pricing-card ${plan.featured ? "lp-pricing-featured" : ""}`}
              style={{ marginTop: plan.featured ? "0" : "16px" }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "3px",
                  borderRadius: "20px 20px 0 0",
                  background: plan.featured
                    ? "linear-gradient(to right, #3b82f6, #7c3aed)"
                    : `linear-gradient(to right, ${plan.accent}66, transparent)`,
                }}
              />

              <div
                style={{
                  height: "32px",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {plan.badge && (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "4px 12px",
                      borderRadius: "999px",
                      fontSize: "10px",
                      fontWeight: 800,
                      letterSpacing: "0.07em",
                      background: plan.featured
                        ? "rgba(37,99,235,0.08)"
                        : `${plan.accent}0f`,
                      border: `1px solid ${
                        plan.featured
                          ? "rgba(37,99,235,0.2)"
                          : plan.accent + "28"
                      }`,
                      color: plan.featured ? "#2563eb" : plan.accent,
                    }}
                  >
                    {plan.badge}
                  </div>
                )}
              </div>

              <p
                style={{
                  fontSize: "20px",
                  fontWeight: 800,
                  color: "#0f172a",
                  letterSpacing: "-0.02em",
                  marginBottom: "4px",
                }}
              >
                {plan.name}
              </p>
              <p
                style={{
                  fontSize: "12px",
                  color: "#94a3b8",
                  fontWeight: 500,
                  marginBottom: "22px",
                }}
              >
                {plan.tagline}
              </p>

              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "4px",
                  marginBottom: "6px",
                }}
              >
                {plan.price === 0 ? (
                  <span
                    style={{
                      fontSize: "38px",
                      fontWeight: 900,
                      color: "#0f172a",
                      letterSpacing: "-0.04em",
                      lineHeight: 1,
                    }}
                  >
                    Free
                  </span>
                ) : (
                  <>
                    <span
                      style={{
                        fontSize: "15px",
                        fontWeight: 700,
                        color: "#94a3b8",
                        alignSelf: "flex-start",
                        marginTop: "8px",
                      }}
                    >
                      $
                    </span>
                    <span
                      style={{
                        fontSize: "42px",
                        fontWeight: 900,
                        color: "#0f172a",
                        letterSpacing: "-0.04em",
                        lineHeight: 1,
                      }}
                    >
                      {plan.price}
                    </span>
                  </>
                )}
              </div>
              <p
                style={{
                  fontSize: "12px",
                  color: "#94a3b8",
                  fontWeight: 500,
                  marginBottom: "18px",
                }}
              >
                {plan.period}
              </p>

              <p
                style={{
                  fontSize: "13.5px",
                  lineHeight: 1.65,
                  color: "#64748b",
                  marginBottom: "26px",
                  minHeight: "44px",
                }}
              >
                {plan.desc}
              </p>

              <a
                href={plan.href}
                className={`lp-btn ${plan.ghost ? "lp-btn-ghost" : "lp-btn-primary"}`}
                style={{
                  width: "100%",
                  justifyContent: "center",
                  fontSize: "14px",
                  padding: "13px 20px",
                  marginBottom: "24px",
                }}
              >
                {plan.cta}
              </a>

              <div
                style={{
                  height: "1px",
                  background: "rgba(15,23,42,0.07)",
                  marginBottom: "22px",
                }}
              />

              <div
                style={{ display: "flex", flexDirection: "column", gap: "2px" }}
              >
                {plan.features.map((feat, fi) => (
                  <div key={fi} className="lp-check-item">
                    <CheckIcon color={plan.accent} />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: "52px",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "10px",
          }}
        >
          {trustItems.map((item, i) => (
            <div key={i} className="lp-trust-badge">
              {item.text}
            </div>
          ))}
        </div>
        <p
          style={{
            textAlign: "center",
            fontSize: "13px",
            color: "#94a3b8",
            marginTop: "20px",
          }}
        >
          Free plan requires no card. Pro trial lasts 7 days and can be canceled before billing.
        </p>
      </div>
    </section>
  );
}
