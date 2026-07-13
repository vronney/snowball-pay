"use client";

import { track, Events } from "@/lib/analytics";

const debtRows = [
  {
    label: "Credit card",
    remaining: "$3,200",
    paid: "$6,800",
    pct: 68,
    color: "#2563eb",
    track: "rgba(37,99,235,0.12)",
  },
  {
    label: "Auto loan",
    remaining: "$8,100",
    paid: "$5,900",
    pct: 42,
    color: "#0891b2",
    track: "rgba(8,145,178,0.12)",
  },
  {
    label: "Student loan",
    remaining: "$7,120",
    paid: "$2,080",
    pct: 22,
    color: "#0f9f6e",
    track: "rgba(15,159,110,0.12)",
  },
];

function ArrowIsland() {
  return (
    <span className="lp-btn-arrow" aria-hidden="true">
      <span>{">"}</span>
    </span>
  );
}

export default function LandingHero({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section
      className="lp-hero-bg"
      style={{
        position: "relative",
        overflow: "hidden",
        paddingTop: "150px",
        paddingBottom: "120px",
        paddingLeft: "24px",
        paddingRight: "24px",
      }}
    >
      <div
        style={{
          maxWidth: "1180px",
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          className="lp-hero-cols"
          style={{ display: "flex", alignItems: "center", gap: "58px" }}
        >
          <div style={{ flex: "1 1 510px", maxWidth: "590px" }}>
            <div
              className="lp-f1"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "9px",
                padding: "7px 16px",
                borderRadius: "999px",
                fontSize: "11px",
                fontWeight: 800,
                color: "#344054",
                background: "rgba(255,255,255,0.82)",
                border: "1px solid rgba(15,23,42,0.10)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.86)",
                marginBottom: "28px",
                letterSpacing: "0.13em",
                textTransform: "uppercase",
              }}
            >
              <span className="lp-live-dot" style={{ background: "#0f9f6e" }} />
              Debt-free progress coach
            </div>

            <h1
              className="lp-f2"
              style={{
                fontSize: "clamp(2.9rem, 7vw, 5.25rem)",
                fontWeight: 900,
                lineHeight: 0.98,
                letterSpacing: "-0.04em",
                marginBottom: "28px",
                color: "#0b1220",
              }}
            >
              <a
                href="/calculator"
                className="lp-hero-headline-link"
                onClick={() =>
                  track(Events.CALCULATOR_CTA_CLICKED, {
                    source: "hero_headline",
                  })
                }
              >
                See your debt-free date in 2 minutes.
              </a>
            </h1>

            <p
              className="lp-f3"
              style={{
                fontSize: "18px",
                lineHeight: 1.75,
                color: "#536078",
                maxWidth: "535px",
                marginBottom: "38px",
              }}
            >
              Enter your balances and what you can pay. SnowballPay calculates
              your payoff order, exact debt-free date, and how much interest
              you&apos;ll save — no bank connection, no signup required to start.
            </p>

            <div
              className="lp-f4 lp-cta-btns"
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              {isLoggedIn ? (
                <a
                  href="/dashboard"
                  className="lp-btn lp-btn-primary lp-btn-with-icon"
                  style={{ fontSize: "16px", padding: "16px 12px 16px 28px" }}
                >
                  Open Dashboard
                  <ArrowIsland />
                </a>
              ) : (
                <>
                  <a
                    href="/calculator"
                    className="lp-btn lp-btn-primary lp-btn-with-icon"
                    style={{ fontSize: "16px", padding: "16px 12px 16px 28px" }}
                    onClick={() =>
                      track(Events.CALCULATOR_CTA_CLICKED, {
                        source: "hero_primary",
                      })
                    }
                  >
                    See my debt-free date
                    <ArrowIsland />
                  </a>
                  <a
                    href="/auth/login?returnTo=/onboarding&screen_hint=signup"
                    className="lp-btn lp-btn-ghost"
                    style={{ fontSize: "15px" }}
                    onClick={() =>
                      track(Events.SIGNUP_STARTED, { source: "hero_secondary" })
                    }
                  >
                    Build My Plan
                  </a>
                </>
              )}
            </div>

            <div
              className="lp-f5"
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
                color: "#667085",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              {["No bank connection required", "Free calculator", "Cancel Pro anytime"].map(
                (item, i) => (
                  <span
                    key={item}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    {i > 0 && (
                      <span
                        aria-hidden="true"
                        style={{ color: "#cbd5e1", fontWeight: 400 }}
                      >
                        &bull;
                      </span>
                    )}
                    {item}
                  </span>
                ),
              )}
            </div>
          </div>

          <div
            className="lp-hero-right lp-f6"
            style={{
              flex: "1 1 470px",
              maxWidth: "520px",
              position: "relative",
            }}
          >
            <a
              href="/calculator"
              className="lp-hero-preview-link"
              aria-label="Try the free debt calculator"
              onClick={() =>
                track(Events.CALCULATOR_CTA_CLICKED, {
                  source: "hero_preview",
                })
              }
            >
            <div className="lp-bezel lp-shimmer">
              <div
                className="lp-core"
                style={{
                  padding: "26px",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "24px",
                    gap: "18px",
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontSize: "10px",
                        fontWeight: 800,
                        letterSpacing: "0.16em",
                        color: "#667085",
                        textTransform: "uppercase",
                        marginBottom: "8px",
                      }}
                    >
                      Focus this month
                    </p>
                    <p
                      style={{
                        fontSize: "34px",
                        fontWeight: 900,
                        color: "#0b1220",
                        letterSpacing: "-0.04em",
                        lineHeight: 1,
                      }}
                    >
                      $18,420
                    </p>
                    <p
                      style={{
                        marginTop: "8px",
                        fontSize: "12px",
                        color: "#667085",
                        fontWeight: 600,
                      }}
                    >
                      total remaining across 3 debts
                    </p>
                  </div>

                  <div
                    style={{
                      textAlign: "right",
                      padding: "10px 12px",
                      borderRadius: "16px",
                      background: "#f4f7fb",
                      border: "1px solid rgba(15,23,42,0.08)",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "10px",
                        color: "#667085",
                        fontWeight: 800,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        marginBottom: "4px",
                      }}
                    >
                      Debt-free
                    </p>
                    <p
                      style={{
                        fontSize: "17px",
                        fontWeight: 900,
                        color: "#0f766e",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      Mar 2027
                    </p>
                    <p
                      className="mono"
                      style={{
                        marginTop: "6px",
                        fontSize: "11px",
                        fontWeight: 800,
                        color: "#0f9f6e",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      Saves $2,140 interest
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    borderRadius: "20px",
                    padding: "16px",
                    background: "#f8fafc",
                    border: "1px solid rgba(15,23,42,0.07)",
                    marginBottom: "22px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "10px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "10px",
                        color: "#667085",
                        fontWeight: 800,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                      }}
                    >
                      Debt chart
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        color: "#0f9f6e",
                        fontWeight: 800,
                      }}
                    >
                      On track
                    </span>
                  </div>
                  <svg
                    viewBox="0 0 320 76"
                    style={{
                      width: "100%",
                      height: "76px",
                      display: "block",
                      overflow: "visible",
                    }}
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient id="heroBalanceFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity="0.17" />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity="0.01" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,12 C48,13 88,23 134,34 C188,47 232,62 320,69 L320,76 L0,76 Z"
                      fill="url(#heroBalanceFill)"
                    />
                    <path
                      d="M0,12 C48,13 88,23 134,34 C188,47 232,62 320,69"
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="2"
                      strokeLinecap="round"
                      className="lp-chart-line"
                    />
                    <circle cx="134" cy="34" r="4" fill="#2563eb" />
                    <circle cx="134" cy="34" r="10" fill="#2563eb" opacity="0.13" />
                    <circle cx="320" cy="69" r="4" fill="#0f9f6e" />
                  </svg>
                </div>

                <div
                  style={{
                    borderRadius: "18px",
                    padding: "14px",
                    background: "rgba(37,99,235,0.06)",
                    border: "1px solid rgba(37,99,235,0.14)",
                    marginBottom: "20px",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 5px",
                      fontSize: "10px",
                      color: "#1d4ed8",
                      fontWeight: 900,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                    }}
                  >
                    Coach read
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "12px",
                      lineHeight: 1.55,
                      color: "#344054",
                      fontWeight: 650,
                    }}
                  >
                    Your March 2027 forecast holds if the extra $200 stays on the
                    credit card and the cash buffer stays healthy.
                  </p>
                </div>

                <div style={{ display: "grid", gap: "15px" }}>
                  {debtRows.map((debt) => (
                    <div key={debt.label}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "7px",
                          gap: "14px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "13px",
                            fontWeight: 800,
                            color: "#172033",
                          }}
                        >
                          {debt.label}
                        </span>
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: 900,
                            color: "#0b1220",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {debt.remaining}
                        </span>
                      </div>
                      <div
                        style={{
                          height: "7px",
                          borderRadius: "999px",
                          background: debt.track,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          className="lp-bar"
                          style={{
                            width: `${debt.pct}%`,
                            background: debt.color,
                            ["--bar-w" as string]: `${debt.pct}%`,
                          }}
                        />
                      </div>
                      <p
                        style={{
                          marginTop: "5px",
                          marginBottom: 0,
                          fontSize: "10px",
                          color: "#98a2b3",
                        }}
                      >
                        Paid {debt.paid}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div
              className="lp-float"
              style={{
                position: "absolute",
                top: "-24px",
                right: "-16px",
                borderRadius: "22px",
                padding: "8px",
                background: "rgba(15,23,42,0.04)",
                border: "1px solid rgba(15,23,42,0.08)",
                boxShadow: "0 18px 48px rgba(15,23,42,0.12)",
              }}
            >
              <div
                style={{
                  borderRadius: "16px",
                  padding: "14px 16px",
                  background: "#ffffff",
                  border: "1px solid rgba(15,23,42,0.08)",
                }}
              >
                <p
                  style={{
                    fontSize: "9px",
                    fontWeight: 900,
                    letterSpacing: "0.14em",
                    color: "#667085",
                    textTransform: "uppercase",
                    marginBottom: "4px",
                  }}
                >
                  Coach action
                </p>
                <p
                  style={{
                    fontSize: "18px",
                    fontWeight: 900,
                    color: "#0b1220",
                    letterSpacing: "-0.03em",
                  }}
                >
                  Pay card first
                </p>
              </div>
            </div>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
