"use client";

import { track, Events } from "@/lib/analytics";

const trustRows = [
  [
    { label: "Setup in minutes" },
    { label: "No bank connection required" },
    { label: "Snowball and Avalanche support" },
  ],
  [
    { label: "Cancel anytime" },
    { label: "Free plan available" },
    { label: "Export your plan anytime" },
  ],
];

export default function FinalCTA({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section
      style={{
        padding: "100px 24px",
        position: "relative",
        overflow: "hidden",
        background: "#f8fafc",
      }}
    >
      <div
        style={{
          maxWidth: "680px",
          margin: "0 auto",
          textAlign: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            borderRadius: "32px",
            padding: "72px 48px 60px",
            background: "#ffffff",
            border: "1px solid rgba(37,99,235,0.12)",
            boxShadow:
              "0 4px 32px rgba(37,99,235,0.08), 0 1px 4px rgba(15,23,42,0.06)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "15%",
              right: "15%",
              height: "2px",
              background:
                "linear-gradient(to right, transparent, #2563eb, transparent)",
            }}
          />

          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "22px",
              background:
                "linear-gradient(135deg, rgba(37,99,235,0.1), rgba(124,58,237,0.08))",
              border: "1px solid rgba(37,99,235,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              color: "#1d4ed8",
              margin: "0 auto 30px",
            }}
          >
            PLAN
          </div>

          <h2
            style={{
              fontSize: "clamp(2rem, 5.5vw, 2.8rem)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              color: "#0f172a",
              margin: "0 0 16px",
              lineHeight: 1.1,
            }}
          >
            Your debt-free life <span className="lp-text-blue">starts today.</span>
          </h2>

          <p
            style={{
              fontSize: "17px",
              color: "#64748b",
              lineHeight: 1.7,
              maxWidth: "420px",
              margin: "0 auto 40px",
            }}
          >
            Build a clear debt payoff plan in minutes and keep momentum with every
            payment.
          </p>

          <div
            className="lp-cta-btns"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "14px",
              justifyContent: "center",
              marginBottom: "36px",
            }}
          >
            {isLoggedIn ? (
              <a
                href="/dashboard"
                className="lp-btn lp-btn-primary"
                style={{ fontSize: "17px", padding: "17px 40px" }}
                onClick={() =>
                  track(Events.RETURN_SESSION, { source: "final_cta_primary" })
                }
              >
                Open Dashboard
              </a>
            ) : (
              <>
                <a
                  href="/auth/login?returnTo=/dashboard"
                  className="lp-btn lp-btn-primary"
                  style={{ fontSize: "17px", padding: "17px 40px" }}
                  onClick={() =>
                    track(Events.SIGNUP_STARTED, { source: "final_cta_primary" })
                  }
                >
                  Create Free Account
                </a>
                <a
                  href="#how-it-works"
                  className="lp-btn lp-btn-ghost"
                  style={{ fontSize: "15px" }}
                  onClick={() =>
                    track(Events.SIGNUP_STARTED, {
                      source: "final_cta_secondary",
                    })
                  }
                >
                  See How It Works
                </a>
              </>
            )}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              alignItems: "center",
            }}
          >
            {trustRows.map((row, ri) => (
              <div
                key={ri}
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                {row.map((b, bi) => (
                  <div key={bi} className="lp-trust-badge">
                    {b.label}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
