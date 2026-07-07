"use client";

import { track, Events } from "@/lib/analytics";
import { PRO_TRIAL_DAYS } from "@/lib/billing";

const plans = [
  {
    name: "Free",
    tagline: "Build the first plan",
    price: 0,
    period: "forever",
    desc: "Run the payoff math, compare strategies, and save a starter plan without putting the calculator behind a signup wall.",
    badge: "No card required",
    featured: false,
    cta: "Start Free",
    href: "/auth/login?returnTo=/dashboard&screen_hint=signup",
    analyticsSource: "pricing_free",
    features: [
      "Free calculators before signup",
      "Track up to 5 debts",
      "Snowball and Avalanche strategies",
      "Debt-free date and payoff order",
      "Basic debt-free progress view",
    ],
  },
  {
    name: "Pro",
    tagline: "Monthly payoff coach",
    price: 12,
    period: "per month after trial",
    desc: "Use debt-free progress charts plus coach notes to see what changed, what it means, and which safe payment move to make next.",
    badge: `${PRO_TRIAL_DAYS}-day trial`,
    featured: true,
    cta: "Start Pro Trial",
    href: "/auth/login?returnTo=%2Fdashboard%3Fcheckout%3Dpro&screen_hint=signup",
    analyticsSource: "pricing_pro",
    features: [
      "Unlimited debts",
      "Monthly payoff audit",
      "Chart coach notes with Signal, Evidence, Action",
      "Debt-free lever chart for +$25, +$50, +$100 moves",
      "Payment calendar risk and buffer guardrails",
      "Custom debt priority order",
      "APR negotiation scripts with dollar context",
      "Exportable payoff plan data",
    ],
  },
];

const trustItems = [
  "Setup in minutes",
  "Bank connection optional",
  "Cancel anytime",
  "Snowball and Avalanche support",
  "Debt-free progress coach",
  "Exportable plan data",
];

const coachPreview = [
  {
    label: "Signal",
    text: "Your highest-rate credit card is still the costly focus.",
  },
  {
    label: "Evidence",
    text: "At 24.99% APR, spreading the extra payment delays the forecast by about 2 months.",
  },
  {
    label: "Action",
    text: "Keep this month's extra payment on that card, then rerun the plan after the payment posts.",
  },
];

function CheckIcon({ active }: { active: boolean }) {
  const color = active ? "#2563eb" : "#536078";
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      style={{ flexShrink: 0, marginTop: "1px" }}
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="7" fill={color} fillOpacity="0.09" />
      <path
        d="M5 8.1 7.2 10.3 11.2 5.9"
        stroke={color}
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowIsland() {
  return (
    <span className="lp-btn-arrow" aria-hidden="true">
      <span>{">"}</span>
    </span>
  );
}

export default function Pricing() {
  return (
    <section
      id="pricing"
      style={{
        padding: "128px 24px",
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
        <div style={{ display: "grid", gridTemplateColumns: "0.82fr 1.18fr", gap: "48px", alignItems: "start" }} className="lp-grid-sm1">
          <div>
            <div className="lp-section-tag">
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#0f9f6e" }} />
              Pricing
            </div>
            <h2
              style={{
                fontSize: "clamp(2.15rem, 5vw, 3.35rem)",
                fontWeight: 900,
                letterSpacing: "-0.04em",
                color: "#0b1220",
                margin: "0 0 18px",
                lineHeight: 1.04,
              }}
            >
              Start free. Upgrade when you need the coach to keep the plan moving.
            </h2>
            <p
              style={{
                fontSize: "16.5px",
                color: "#536078",
                maxWidth: "430px",
                lineHeight: 1.74,
                margin: "0 0 26px",
              }}
            >
              Free is enough to see the first path. Pro is for the months after that, when balances change, motivation dips, and the next safe payment move needs to stay obvious.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              {trustItems.map((item) => (
                <div key={item} className="lp-trust-badge">
                  {item}
                </div>
              ))}
            </div>

            <div
              className="lp-bezel"
              style={{
                marginTop: "28px",
                maxWidth: "455px",
              }}
            >
              <div
                className="lp-core"
                style={{
                  padding: "20px",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,251,255,0.94))",
                }}
              >
                <p
                  style={{
                    margin: "0 0 12px",
                    fontSize: "11px",
                    fontWeight: 900,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "#1d4ed8",
                  }}
                >
                  Sample Pro coach output
                </p>
                <div style={{ display: "grid", gap: "10px" }}>
                  {coachPreview.map((item) => (
                    <div
                      key={item.label}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "74px 1fr",
                        gap: "10px",
                        alignItems: "start",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 900,
                          color: "#0b1220",
                        }}
                      >
                        {item.label}
                      </span>
                      <span
                        style={{
                          fontSize: "12.5px",
                          lineHeight: 1.55,
                          color: "#536078",
                        }}
                      >
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div
            className="lp-pricing-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "18px",
              alignItems: "stretch",
            }}
          >
            {plans.map((plan) => (
              <div key={plan.name} className="lp-bezel">
                <div
                  className={`lp-pricing-card ${plan.featured ? "lp-pricing-featured" : ""}`}
                  style={{
                    height: "100%",
                    background: plan.featured ? "#ffffff" : "#fbfdff",
                  }}
                >
                  <div
                    style={{
                      height: "32px",
                      marginBottom: "18px",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "5px 12px",
                        borderRadius: "999px",
                        fontSize: "10px",
                        fontWeight: 900,
                        letterSpacing: "0.11em",
                        textTransform: "uppercase",
                        background: plan.featured
                          ? "rgba(37,99,235,0.08)"
                          : "rgba(15,23,42,0.04)",
                        border: `1px solid ${
                          plan.featured
                            ? "rgba(37,99,235,0.22)"
                            : "rgba(15,23,42,0.10)"
                        }`,
                        color: plan.featured ? "#1d4ed8" : "#536078",
                      }}
                    >
                      {plan.badge}
                    </div>
                  </div>

                  <p
                    style={{
                      fontSize: "21px",
                      fontWeight: 900,
                      color: "#0b1220",
                      letterSpacing: "-0.03em",
                      marginBottom: "4px",
                    }}
                  >
                    {plan.name}
                  </p>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#667085",
                      fontWeight: 700,
                      marginBottom: "24px",
                    }}
                  >
                    {plan.tagline}
                  </p>

                  <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "8px" }}>
                    {plan.price === 0 ? (
                      <span
                        style={{
                          fontSize: "38px",
                          fontWeight: 900,
                          color: "#0b1220",
                          letterSpacing: "-0.045em",
                          lineHeight: 1,
                        }}
                      >
                        Free
                      </span>
                    ) : (
                      <>
                        <span style={{ fontSize: "15px", fontWeight: 800, color: "#667085", alignSelf: "flex-start", marginTop: "8px" }}>
                          $
                        </span>
                        <span
                          style={{
                            fontSize: "44px",
                            fontWeight: 900,
                            color: "#0b1220",
                            letterSpacing: "-0.045em",
                            lineHeight: 1,
                          }}
                        >
                          {plan.price}
                        </span>
                      </>
                    )}
                  </div>
                  <p style={{ fontSize: "12px", color: "#667085", fontWeight: 700, marginBottom: "18px" }}>
                    {plan.period}
                  </p>

                  <p
                    style={{
                      fontSize: "13.5px",
                      lineHeight: 1.68,
                      color: "#536078",
                      marginBottom: "28px",
                      minHeight: "68px",
                    }}
                  >
                    {plan.desc}
                  </p>

                  <a
                    href={plan.href}
                    className={`lp-btn ${plan.featured ? "lp-btn-primary lp-btn-with-icon" : "lp-btn-ghost"}`}
                    onClick={() => {
                      if (plan.featured) {
                        track(Events.PRICING_PRO_CLICKED, {
                          source: plan.analyticsSource,
                        });
                      } else {
                        track(Events.SIGNUP_STARTED, {
                          source: plan.analyticsSource,
                        });
                      }
                    }}
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      fontSize: "14px",
                      padding: plan.featured ? "12px 8px 12px 22px" : "14px 20px",
                      marginBottom: "26px",
                    }}
                  >
                    {plan.cta}
                    {plan.featured && <ArrowIsland />}
                  </a>

                  <div
                    style={{
                      height: "1px",
                      background: "rgba(15,23,42,0.08)",
                      marginBottom: "22px",
                    }}
                  />

                  <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                    {plan.features.map((feat) => (
                      <div key={feat} className="lp-check-item">
                        <CheckIcon active={plan.featured} />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                  {plan.featured && (
                    <p
                      style={{
                        fontSize: "11px",
                        color: "#667085",
                        lineHeight: 1.55,
                        margin: "16px 0 0",
                      }}
                    >
                      Best fit when you want the plan reviewed every month, not
                      just calculated once.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <p
          style={{
            textAlign: "center",
            fontSize: "13px",
            color: "#98a2b3",
            marginTop: "34px",
          }}
        >
          Free plan requires no card. Pro trial lasts {PRO_TRIAL_DAYS} days and can be canceled before billing.
        </p>
      </div>
    </section>
  );
}
