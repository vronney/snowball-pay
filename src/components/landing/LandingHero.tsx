"use client";

import { track, Events } from "@/lib/analytics";

const debtRows = [
  {
    label: "Credit Card",
    remaining: "$3,200",
    paid: "$6,800",
    pct: 68,
    color: "#2563eb",
    track: "rgba(37,99,235,0.1)",
  },
  {
    label: "Car Loan",
    remaining: "$8,100",
    paid: "$5,900",
    pct: 42,
    color: "#7c3aed",
    track: "rgba(124,58,237,0.1)",
  },
  {
    label: "Student Loan",
    remaining: "$7,120",
    paid: "$2,080",
    pct: 22,
    color: "#0891b2",
    track: "rgba(8,145,178,0.1)",
  },
];

export default function LandingHero({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section
      className="lp-hero-bg"
      style={{
        position: "relative",
        overflow: "hidden",
        paddingTop: "148px",
        paddingBottom: "120px",
        paddingLeft: "24px",
        paddingRight: "24px",
      }}
    >
      {/* Very subtle orbs */}
      <div
        className="lp-orb"
        style={{
          width: "800px",
          height: "800px",
          background: "rgba(37,99,235,0.06)",
          top: "-380px",
          right: "-180px",
          animationDelay: "0s",
        }}
      />
      <div
        className="lp-orb"
        style={{
          width: "500px",
          height: "500px",
          background: "rgba(124,58,237,0.05)",
          bottom: "-220px",
          left: "-160px",
          animationDelay: "4s",
        }}
      />

      {/* Dot grid overlay */}
      <div className="lp-grid-overlay" />

      <div
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          className="lp-hero-cols"
          style={{ display: "flex", alignItems: "center", gap: "64px" }}
        >
          {/* Left: Copy */}
          <div style={{ flex: "1 1 500px", maxWidth: "560px" }}>
            {/* Eyebrow pill */}
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
                color: "#2563eb",
                marginBottom: "28px",
              }}
            >
              <span className="lp-live-dot" style={{ background: "#10b981" }} />
              Your debt-free date is closer than you think
            </div>

            {/* Headline */}
            <h1
              className="lp-f2"
              style={{
                fontSize: "clamp(2.6rem, 7vw, 4.6rem)",
                fontWeight: 900,
                lineHeight: 1.06,
                letterSpacing: "-0.045em",
                marginBottom: "24px",
                color: "#0f172a",
              }}
            >
              <span className="lp-text-blue">Know exactly</span>
              <br />
              <span>when you&apos;ll be</span>
              <br />
              <span>debt-free.</span>
            </h1>

            {/* Subheading */}
            <p
              className="lp-f3"
              style={{
                fontSize: "18px",
                lineHeight: 1.72,
                color: "#64748b",
                maxWidth: "500px",
                marginBottom: "40px",
              }}
            >
              Add your debts. Pick your strategy. Get a clear, month-by-month
              payoff plan - and the confidence to follow through.
            </p>

            {/* CTA row */}
            <div
              className="lp-f4 lp-cta-btns"
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "12px",
                marginBottom: "48px",
              }}
            >
              {isLoggedIn ? (
                <a
                  href="/dashboard"
                  className="lp-btn lp-btn-primary"
                  style={{ fontSize: "16px", padding: "15px 34px" }}
                >
                  Open Dashboard
                </a>
              ) : (
                <>
                  <a
                    href="/auth/login?returnTo=/dashboard"
                    className="lp-btn lp-btn-primary"
                    style={{ fontSize: "16px", padding: "15px 34px" }}
                    onClick={() => track(Events.SIGNUP_STARTED, { source: 'hero_primary' })}
                  >
                    Start Free - No Card Needed
                  </a>
                  <a
                    href="#how-it-works"
                    className="lp-btn lp-btn-ghost"
                    style={{ fontSize: "15px" }}
                  >
                    See How It Works
                  </a>
                </>
              )}
            </div>

            {/* Animated stats */}
            <div
              className="lp-f5"
              style={{ display: "flex", alignItems: "center" }}
            >
              {[
                { val: "Clear Plan", label: "Prioritized payoff order" },
                { val: "Track Progress", label: "See every payment move the plan" },
                { val: "Adjust Anytime", label: "Update your plan as life changes" },
              ].map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center" }}>
                  {i > 0 && (
                    <div
                      style={{
                        width: "1px",
                        height: "36px",
                        background: "rgba(15,23,42,0.1)",
                        margin: "0 24px",
                      }}
                    />
                  )}
                  <div>
                    <div
                      className="lp-stat-num"
                      style={{
                        fontSize: "20px",
                        fontWeight: 900,
                        color: "#0f172a",
                        letterSpacing: "-0.03em",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {s.val}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#94a3b8",
                        fontWeight: 500,
                        marginTop: "2px",
                      }}
                    >
                      {s.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Dashboard visual */}
          <div
            className="lp-hero-right lp-f6"
            style={{
              flex: "1 1 440px",
              maxWidth: "500px",
              position: "relative",
              paddingBottom: "36px",
              paddingRight: "32px",
            }}
          >
            {/* Main dashboard card */}
            <div
              className="lp-glass lp-shimmer"
              style={{
                borderRadius: "20px",
                padding: "26px 28px 22px",
                boxShadow:
                  "0 24px 64px rgba(15,23,42,0.12), 0 0 0 1px rgba(15,23,42,0.06)",
              }}
            >
              {/* Card header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "18px",
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      color: "#94a3b8",
                      textTransform: "uppercase",
                      marginBottom: "5px",
                    }}
                  >
                    Total Remaining
                  </p>
                  <p
                    style={{
                      fontSize: "32px",
                      fontWeight: 900,
                      color: "#0f172a",
                      letterSpacing: "-0.04em",
                      lineHeight: 1,
                    }}
                  >
                    $18,420
                  </p>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: "6px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "4px 10px",
                      borderRadius: "999px",
                      background: "rgba(16,185,129,0.08)",
                      border: "1px solid rgba(16,185,129,0.2)",
                    }}
                  >
                    <span
                      className="lp-live-dot"
                      style={{ width: "5px", height: "5px" }}
                    />
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        color: "#059669",
                        letterSpacing: "0.08em",
                      }}
                    >
                      SAMPLE
                    </span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p
                      style={{
                        fontSize: "10px",
                        fontWeight: 600,
                        color: "#94a3b8",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        marginBottom: "2px",
                      }}
                    >
                      Est. Payoff
                    </p>
                    <p
                      style={{
                        fontSize: "15px",
                        fontWeight: 800,
                        color: "#0891b2",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      Mar 2027
                    </p>
                  </div>
                </div>
              </div>

              {/* Sparkline chart */}
              <div
                style={{
                  marginBottom: "18px",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  background: "#f8fafc",
                  border: "1px solid rgba(15,23,42,0.06)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "8px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "10px",
                      color: "#94a3b8",
                      fontWeight: 600,
                      letterSpacing: "0.04em",
                    }}
                  >
                    BALANCE OVER 24 MONTHS
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      color: "#059669",
                      fontWeight: 700,
                    }}
                  >
On track
                  </span>
                </div>
                <svg
                  viewBox="0 0 300 64"
                  style={{
                    width: "100%",
                    height: "64px",
                    display: "block",
                    overflow: "visible",
                  }}
                >
                  <defs>
                    <linearGradient
                      id="heroSparkGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#2563eb"
                        stopOpacity="0.18"
                      />
                      <stop
                        offset="100%"
                        stopColor="#2563eb"
                        stopOpacity="0.01"
                      />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,8 C50,9 90,18 150,38 C200,53 255,61 300,63 L300,64 L0,64 Z"
                    fill="url(#heroSparkGrad)"
                  />
                  <path
                    d="M0,8 C50,9 90,18 150,38 C200,53 255,61 300,63"
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="lp-chart-line"
                  />
                  <circle cx="150" cy="38" r="4" fill="#2563eb" />
                  <circle
                    cx="150"
                    cy="38"
                    r="9"
                    fill="#2563eb"
                    opacity="0.15"
                  />
                  <circle cx="0" cy="8" r="3" fill="rgba(37,99,235,0.4)" />
                  <circle cx="300" cy="63" r="3" fill="rgba(16,185,129,0.6)" />
                </svg>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: "4px",
                  }}
                >
                  <span style={{ fontSize: "9px", color: "#cbd5e1" }}>
                    Today
                  </span>
                  <span style={{ fontSize: "9px", color: "#cbd5e1" }}>
                    Mar 2027
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "9px",
                    color: "#94a3b8",
                    marginTop: "6px",
                    marginBottom: 0,
                  }}
                >
                  Illustrative dashboard example
                </p>
              </div>

              {/* Debt rows */}
              {debtRows.map((d, i) => (
                <div
                  key={i}
                  style={{
                    marginBottom: i < debtRows.length - 1 ? "14px" : "0",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "6px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#334155",
                      }}
                    >
                      {d.label}
                    </span>
                    <div
                      style={{
                        display: "flex",
                        gap: "12px",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                        Paid {d.paid}
                      </span>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 800,
                          color: "#0f172a",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {d.remaining}
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      height: "5px",
                      borderRadius: "999px",
                      background: d.track,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      className="lp-bar"
                      style={{
                        width: `${d.pct}%`,
                        background: d.color,
                        ["--bar-w" as string]: `${d.pct}%`,
                      }}
                    />
                  </div>
                  <p
                    style={{
                      fontSize: "10px",
                      color: "#cbd5e1",
                      marginTop: "3px",
                    }}
                  >
                    {d.pct}% paid off
                  </p>
                </div>
              ))}

              {/* Footer */}
              <div
                style={{
                  marginTop: "16px",
                  paddingTop: "14px",
                  borderTop: "1px solid rgba(15,23,42,0.07)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                  Next payment due
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "4px 12px",
                    borderRadius: "999px",
                    color: "#2563eb",
                    background: "rgba(37,99,235,0.08)",
                    border: "1px solid rgba(37,99,235,0.15)",
                  }}
                >
                  $340 monthly target
                </span>
              </div>
            </div>

            {/* Floating badge - interest impact */}
            <div
              className="lp-float"
              style={{
                position: "absolute",
                top: "-22px",
                right: "-22px",
                borderRadius: "16px",
                padding: "14px 18px",
                background: "#ffffff",
                border: "1px solid rgba(16,185,129,0.2)",
                boxShadow: "0 12px 36px rgba(15,23,42,0.1)",
                animationDelay: "0.8s",
              }}
            >
              <p
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  color: "#059669",
                  textTransform: "uppercase",
                  marginBottom: "4px",
                }}
              >
                Interest Impact
              </p>
              <p
                style={{
                  fontSize: "20px",
                  fontWeight: 900,
                  color: "#065f46",
                  letterSpacing: "-0.03em",
                }}
              >
                Trending Down
              </p>
              <p
                style={{ fontSize: "10px", color: "#6ee7b7", marginTop: "2px" }}
              >
                as balances decrease
              </p>
            </div>

            {/* Floating badge - payment streak */}
            <div
              className="lp-float2"
              style={{
                position: "absolute",
                bottom: "-4px",
                left: "-28px",
                borderRadius: "16px",
                padding: "14px 18px",
                background: "#ffffff",
                border: "1px solid rgba(124,58,237,0.18)",
                boxShadow: "0 12px 36px rgba(15,23,42,0.1)",
                animationDelay: "2.2s",
              }}
            >
              <p
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  color: "#7c3aed",
                  textTransform: "uppercase",
                  marginBottom: "4px",
                }}
              >
                Payment Streak
              </p>
              <p
                style={{
                  fontSize: "20px",
                  fontWeight: 900,
                  color: "#4c1d95",
                  letterSpacing: "-0.03em",
                }}
              >
                8 months
              </p>
              <p
                style={{ fontSize: "10px", color: "#a78bfa", marginTop: "2px" }}
              >
                on-time payments
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

